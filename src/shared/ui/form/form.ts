import {
  AfterViewInit,
  Binding,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  OnDestroy,
  outputBinding,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import {
  AbstractControl,
  ControlContainer,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { combineLatest, skip, startWith } from 'rxjs';
import { descript } from '../../../services/descriptor';
import { RefsStorageService } from '../../../services/refsStorage.service';
import { FORM_CONTROL_NAME_TOKEN } from '../../lib/injectionTokens/injectionTokens';

interface Field {
  name: string;
  validators?: string;
  formValidators?: { name: string; errorMessage: string; code: string }[];
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
export class FormUI implements AfterViewInit, OnDestroy {
  private componentId = Symbol();

  private fb = inject(FormBuilder);
  private vcr = viewChild.required('vcr', { read: ViewContainerRef });

  private refsStorage = inject(RefsStorageService);

  //#region INPUTS
  public fields = input<Field[]>();
  public components = input<any[]>();
  //#endregion

  //#region STATES
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

  ngOnDestroy(): void {
    this.refsStorage.removeRefsFromList(this.componentId);
  }
  //#endregion

  //#region METHODS
  private toFormGroup(fields: Field[]): FormGroup {
    const group: Record<string, FormControl> = {};
    const formCustomValudators: ValidatorFn[] = [];
    fields.forEach((field) => {
      const validators = this.descriptValidators(field.validators);
      group[field.name] = new FormControl(null, {
        validators,
      });

      const formValidator = this.descriptFormValidators(field.formValidators);
      if (formValidator) {
        formCustomValudators.push(...formValidator);
      }
    });
    const fg = this.fb.group(group);
    fg.setValidators(formCustomValudators);
    return fg;
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
            const spRef = this.refsStorage.refsList().find(({ ref }) => {
              return (
                ref.injector.get(FORM_CONTROL_NAME_TOKEN, null) === args[0]
              );
            });
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

  private descriptFormValidators(
    formValidators?: { name: string; errorMessage: string; code: string }[]
  ): ValidatorFn[] | undefined {
    if (!formValidators) return;
    const vfns: ValidatorFn[] = formValidators.map(
      ({ name, code }) =>
        (form: AbstractControl<any, any, any>) => {
          let result: any;
          const commands: string[][] = code
            .split(';')
            .map((row) => row.split(' '));

          let i = 0;
          while (commands[i]) {
            const [command, ...args] = commands[i];
            switch (command) {
              case 'jrgt':
                const isGreate =
                  +form.get(args[0])!.value > +form.get(args[1])!.value;
                if (isGreate) {
                  i += +args[2];
                } else {
                  i += 1;
                }
                break;

              case 'setres':
                result = args[0];
                i = Infinity;
                break;
              default:
                throw new Error('wrong command');
            }
          }
          return result ? { [name]: { value: form.value } } : null;
        }
    );

    return vfns;
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
        for (const [key, config] of props.outputs) {
          const { deps, fn: fnNoCtx } = config;
          let fn;
          if (!deps) {
            fn = fnNoCtx();
          } else {
            const args = deps.map((dep) => {
              switch (dep) {
                case 'form':
                  return this.formGroup();
                case 'refs':
                default:
                  return this.refsStorage.refsList();
              }
            });

            fn = fnNoCtx(...args);
          }
          bindings.push(outputBinding(key, fn));
        }
      }

      const controlContainer = this.vcr().injector.get(ControlContainer);

      const inputKeys = props.inputs?.map(([key]) => key);

      const controlNameIdx =
        inputKeys?.findIndex((key) => key === 'formControlName') ?? -1;

      const controlName =
        controlNameIdx > -1
          ? (props.inputs?.[controlNameIdx][1]() as string)
          : undefined;

      const ref = this.vcr().createComponent(props.component, {
        bindings,
        injector: Injector.create({
          providers: [
            { provide: ControlContainer, useValue: controlContainer },
            { provide: FORM_CONTROL_NAME_TOKEN, useValue: controlName },
          ],
        }),
      });

      if (props.inputs) {
        for (const [key, value] of props.inputs) {
          if (key === 'formControlName') {
            const control = this.formGroup()?.get(value() as string);
            const instance = ref.instance;
            if (!control) {
              throw new Error(
                `FormControl by name ${value() as string} not found in form`
              );
            }
            if (instance.registerOnChange) {
              control?.valueChanges.subscribe((v) => instance.writeValue(v));
              instance.registerOnChange((v: any) => control?.setValue(v));
              instance.registerOnTouched(() => control?.markAsTouched());
            }

            if (instance.setDisabledState) {
              control.statusChanges.subscribe(() => {
                instance.setDisabledState?.(control.disabled);
              });
            }
          } else {
            ref.setInput(key, value());
          }
        }
      }

      ref.changeDetectorRef.detectChanges();

      this.refsStorage.addRefsInList({
        ref,
        title: props.title,
        source: this.componentId,
      });
    });
  }

  //#region EFFECTS
  private refsEffect = effect(() => {
    const refsList = this.refsStorage.refsList();
    console.log(refsList);

    if (refsList.length) {
      const minAgeRef = refsList.find((item) => item.title === 'maxAge')!.ref;
      console.log(minAgeRef.injector.get(FORM_CONTROL_NAME_TOKEN, null));
    }
  });
  //#endregion

  protected onSubmit() {
    const formGroup = this.formGroup()!;
    const errors: any = { ...formGroup.errors };
    Object.keys(formGroup.controls).forEach((key) => {
      const controlErrors = formGroup.get(key)?.errors;
      if (controlErrors) {
        errors[key] = controlErrors;
      }
    });
    console.log(this.formGroup());
    console.log(
      'valid',
      this.formGroup()?.valid,
      'errors',
      errors,
      'value',
      this.formGroup()?.value,
      'getRawValue',
      this.formGroup()?.getRawValue()
    );
  }
  //#endregion
}
