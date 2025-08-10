import { NgStyle } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  inject,
  Injector,
  input,
  Optional,
  outputBinding,
  SkipSelf,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { ControlContainer, ReactiveFormsModule } from '@angular/forms';
import { descript } from '../../../services/descriptor';
import { RefsStorageService } from '../../../services/refsStorage.service';
import { FORM_CONTROL_NAME_TOKEN } from '../../lib/injectionTokens/injectionTokens';

const defaultStyleClass = 'container-base';

@Component({
  selector: 'app-container',
  imports: [NgStyle, ReactiveFormsModule],
  template: `
    <div [classList]="_styleClass()" [ngStyle]="styles()">
      <a>container</a>
      <ng-container #vcr />
      <a>container end</a>
    </div>
  `,
  styleUrl: './container.scss',
  viewProviders: [
    {
      provide: ControlContainer,
      deps: [[new Optional(), new SkipSelf(), ControlContainer]],
      useFactory: (parent?: ControlContainer) => parent || null,
    },
  ],
})
export class Container implements AfterViewInit {
  private componentId = Symbol();

  private refsStorage = inject(RefsStorageService);
  private cc = inject(ControlContainer, { optional: true, skipSelf: true });
  private vcr = viewChild.required('vcr', { read: ViewContainerRef });

  //#region INPUTS
  public components = input<any[]>();
  public styleClass = input('');
  public styles = input<Record<string, any>>();
  //#endregion

  //#region FIELDS
  protected _styleClass = computed(() => {
    const styleClass = this.styleClass();
    return `${defaultStyleClass} ${styleClass}`;
  });
  //#endregion

  //#region HOOKS
  ngAfterViewInit(): void {
    this.initComponents();
  }
  //#endregion

  private initComponents() {
    const components = this.components();
    if (!components) {
      console.warn('No components');
      return;
    }
    const descriptedComponents = descript(components);
    descriptedComponents.forEach((props) => {
      const component = props.component;

      let bindings = [];

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
                  return this.cc?.control;
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

      const ref = this.vcr().createComponent(component, {
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
            const control = this.cc?.control?.get(value() as string);
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
}
