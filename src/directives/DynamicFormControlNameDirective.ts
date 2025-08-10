import { Directive, Host, Input, OnInit, Optional } from '@angular/core';
import { ControlContainer, NgControl } from '@angular/forms';

@Directive({
  selector: '[dynamicFormControlName]',
  providers: [],
  standalone: true,
})
export class DynamicFormControlNameDirective implements OnInit {
  @Input('dynamicFormControlName') controlName!: string;

  constructor(
    @Optional() @Host() private controlContainer: ControlContainer,
    @Optional() private ngControl: NgControl
  ) {}

  ngOnInit() {
    if (!this.controlContainer) {
      throw new Error(
        'DynamicFormControlNameDirective: Нет родительской формы!'
      );
    }
    const control = this.controlContainer.control?.get(this.controlName);
    if (!control) {
      throw new Error(`Контроля с именем "${this.controlName}" нет в форме`);
    }

    // Если твой компонент реализует ControlValueAccessor,
    // NgControl автоматически подключится, если директива будет наследником
    // AbstractControlDirective или FormControlName, но здесь можно напрямую связать:
    if (this.ngControl) {
      (this.ngControl as any).control = control;
    }
  }
}
