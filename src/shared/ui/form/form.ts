import {
  AfterViewInit,
  Binding,
  Component,
  ComponentRef,
  computed,
  effect,
  inject,
  input,
  outputBinding,
  signal,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { combineLatest, skip, startWith } from 'rxjs';
import { descript } from '../../../services/descriptor';

interface Field {
  name: string;
  validators?: string;
  dependsOn?: string[];
  depsLogic?: string[];
}

@Component({
  selector: 'app-form',
  imports: [ReactiveFormsModule],
  template: `
    @let _form = formGroup(); @if(_form) {
    <form (ngSubmit)="onSubmit()" [formGroup]="_form">
      <ng-template #vcr />
    </form>
    }
  `,
})
export class FormUI implements AfterViewInit {
  private fb = inject(FormBuilder);

  private vcr = viewChild.required('vcr', { read: ViewContainerRef });

  //#region INPUTS
  public fields = input<Field[]>();
  public components = input<any[]>();
  //#endregion

  //#region STATES
  private formComponentRefs = signal<
    { ref: ComponentRef<any>; formControlName: string | undefined }[]
  >([]);

  private valueChangesDepsSources = new Set<string>();
  //#endregion

  //#region OUTPUTS
  //#endregion

  //#region FIELDS
  protected formGroup = computed(() => {
    const fields = this.fields();
    if (!fields) return;
    const fg = this.toFormGroup(fields);
    this.addDependcies(fields, fg);
    return fg;
  });
  //#endregion

  //#region HOOKS
  ngAfterViewInit(): void {
    this.initComponents();
  }
  //#endregion

  //#region METHODS
  private toFormGroup(fields: Field[]): FormGroup {
    const group: Record<string, FormControl> = {};

    fields.forEach((field) => {
      const validators = this.descriptValidators(field.validators);
      group[field.name] = new FormControl(null, {
        validators,
      });
    });
    const fg = this.fb.group(group);
    return this.fb.group(group);
  }

  private addDependcies(fields: Field[], form: FormGroup) {
    if (!form) return;
    fields
      .filter((field) => field.dependsOn && field.depsLogic)
      .forEach((field) => {
        const control = form.controls[field.name];

        const dependsOn = field.dependsOn!;
        const depsLogic = field.depsLogic!;
        const dependsObserverList = dependsOn.map((controlName) =>
          form.controls[controlName].valueChanges.pipe(startWith(null))
        );
        combineLatest(dependsObserverList)
          .pipe(skip(1))
          .subscribe((formValues) => {
            const object: Record<string, any> = {
              [field.name]: control.value,
            };
            formValues.forEach((value, idx) => {
              object[dependsOn[idx]] = value;
            });
            this.descriptDepsLogic(depsLogic, object, form);
          });
      });
  }

  private setValueFormDeps(form: FormGroup, controlName: string, value: any) {
    this.valueChangesDepsSources.add(controlName);
    form.controls[controlName].setValue(value);
    this.valueChangesDepsSources.delete(controlName);
  }

  private descriptDepsLogic(
    depsLogic: string[],
    values: Record<string, any>,
    form: FormGroup
  ) {
    depsLogic.forEach((ic) => {
      const commands: string[][] = ic.split(';').map((row) => row.split(' '));

      let i = 0;
      while (commands[i]) {
        const [command, ...args] = commands[i];
        switch (command) {
          case 'jrgt':
            const isGreate = +values[args[0]] >= +values[args[1]];
            if (isGreate) {
              i += +args[2];
            } else {
              i += 1;
            }
            break;

          case 's':
            if (!this.valueChangesDepsSources.has(args[0])) {
              this.setValueFormDeps(form, args[0], values[args[1]]);
            }
            i += 1;
            break;

          case 'sp':
            const spRef = this.formComponentRefs().find(
              ({ formControlName }) => formControlName === args[0]
            );
            if (spRef) {
              spRef.ref.setInput(args[1], values[args[2]]);
            }
            i += 1;
            break;

          default:
            throw new Error('wrong command');
        }
      }
    });
  }

  private descriptValidators(validators?: string): ValidatorFn[] | undefined {
    if (!validators) return;

    //#region transform to commands
    const regexp = /\[([^\]]+)\]/g;
    const parsedStr = [...validators.matchAll(regexp)].map((v) => v[1]);

    const commands = [];
    let command = [];

    for (const item of parsedStr) {
      if (item !== '_0_') {
        command.push(item);
      } else {
        commands.push(command);
        command = [];
      }
    }
    commands.push(command);
    //#endregion

    const validatorsMap: Record<
      string,
      { validator: any; argTypes: string[] }
    > = {
      minlen: { validator: Validators.minLength, argTypes: ['number'] },
      maxlen: { validator: Validators.maxLength, argTypes: ['number'] },
    };

    const validatorsArray: ValidatorFn[] = commands.map(([key, ...args]) => {
      const validatorCfg = validatorsMap[key];
      const typedArgs = validatorCfg.argTypes.map((type, idx) => {
        switch (type) {
          case 'number':
            return Number(args[idx]);
          default:
            return args[idx];
        }
      });
      return validatorCfg.validator.call(this, typedArgs);
    });

    return validatorsArray;
  }

  private initComponents() {
    const components = this.components();
    if (!components) {
      console.warn('No components');
      return;
    }
    const descriptedComponents = descript(components);
    descriptedComponents.forEach((props) => {
      const bindings: Binding[] = [];

      if (props.outputs) {
        for (const [key, value] of props.outputs) {
          bindings.push(outputBinding(key, value));
        }
      }

      const ref = this.vcr().createComponent(props.component, {
        bindings,
      });

      if (props.inputs) {
        for (const [key, value] of props.inputs) {
          ref.setInput(key, value());
          switch (key) {
            case 'formControlName':
              ref.setInput('form', this.formGroup());
          }
        }
      }

      ref.changeDetectorRef.detectChanges();

      this.formComponentRefs.update((prev) => [
        ...prev,
        { ref, formControlName: ref.instance.formControlName?.() },
      ]);
    });
  }

  //#region EFFECTS
  private refsEffect = effect(() => {
    console.log(this.formComponentRefs());
  });
  //#endregion

  protected onSubmit() {
    const formGroup = this.formGroup()!;
    const errors: any = {};
    Object.keys(formGroup.controls).forEach((key) => {
      const controlErrors = formGroup.get(key)?.errors;
      if (controlErrors) {
        errors[key] = controlErrors;
      }
    });
    console.log(this.formGroup());
    console.log(
      this.formGroup()?.valid,
      errors,
      this.formGroup()?.getRawValue()
    );
  }
  //#endregion
}
