import { NgStyle } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  input,
  inputBinding,
  outputBinding,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { descript } from '../../../services/descriptor';

const defaultStyleClass = 'container-base';

@Component({
  selector: 'app-container',
  imports: [NgStyle],
  template: `
    <div [classList]="_styleClass()" [ngStyle]="styles()">
      <a>container</a>
      <ng-container #vcr />
      <a>container end</a>
    </div>
  `,
  styleUrl: './container.scss',
})
export class Container implements AfterViewInit {
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

      const inputs = props.inputs?.map(([key, value]) =>
        inputBinding(key, value)
      );
      const outputs = props.outputs?.map(([key, value]) =>
        outputBinding(key, value)
      );

      let bindings = [];

      if (inputs) bindings.push(inputs);
      if (outputs) bindings.push(outputs);

      bindings = bindings.flat();

      const ref = this.vcr().createComponent(component, {
        bindings,
      });
      ref.changeDetectorRef.detectChanges();
    });
  }
}
