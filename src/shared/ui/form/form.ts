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
import {
  Commands,
  Contexts,
  IcCompilerService,
} from '../../../services/ic.compiler';
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
  private icCompiler = inject(IcCompilerService);
  private fb = inject(FormBuilder);
  private vcr = viewChild.required('vcr', { read: ViewContainerRef });

  private refsStorage = inject(RefsStorageService);

  //#region INPUTS
  public fields = input<Field[]>();
  public components = input<any[]>();
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
        const dependsOn = field.dependsOn!;
        const depsLogic = field.depsLogic!;
        const dependsObserverList = dependsOn.map((controlName) =>
          form.controls[controlName].valueChanges.pipe(startWith(null))
        );
        combineLatest(dependsObserverList)
          .pipe(skip(1))
          .subscribe(() => {
            this.descriptDepsLogic(depsLogic, form);
          });
      });
  }

  private descriptDepsLogic(depsLogic: string[], form: FormGroup) {
    depsLogic.forEach((ic) => {
      const contextPack = Contexts.dependencies;
      const commands: string[][] = this.icCompiler.getRawCommands(ic);

      const commandsPack = this.icCompiler.commandContext[contextPack](
        form,
        this.refsStorage.refsList()
      );

      let i = 0;
      while (commands[i]) {
        const [command, ...args] = commands[i] as [Commands, ...args: any[]];
        const isAllowedCommand = this.icCompiler.isAllowedCommand(
          command,
          contextPack
        );
        if (!isAllowedCommand) {
          throw new Error('wrong command');
        }
        const result = commandsPack[command](...args, { rowIdx: i });
        i = result.rowIdx;
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
          const contextPack = Contexts.validators;
          const commands: string[][] = this.icCompiler.getRawCommands(code);

          const commandsPack = this.icCompiler.commandContext[contextPack](
            form as FormGroup
          );
          let result: any;
          let i = 0;
          while (commands[i]) {
            const [command, ...args] = commands[i] as [
              Commands,
              ...args: any[]
            ];
            const isAllowedCommand = this.icCompiler.isAllowedCommand(
              command,
              contextPack
            );
            if (!isAllowedCommand) {
              throw new Error('wrong command');
            }
            const iterationResult = commandsPack[command](...args, {
              rowIdx: i,
            });
            i = iterationResult.rowIdx;
            result = iterationResult.result;
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
