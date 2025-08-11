import { Component, forwardRef, input, OnInit, signal } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';

@Component({
  selector: 'app-input',
  imports: [ReactiveFormsModule],
  template: `
    <div style="display: flex; flex-direction: column; gap: 4px;">
      <label>{{ label() }}</label>
      <input
        style="width: 200px;"
        [type]="type()"
        [min]="min()"
        [max]="max()"
        [disabled]="_disabled()"
        [value]="value"
        (input)="onInput($event)"
      />
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputUI),
      multi: true,
    },
  ],
})
export class InputUI implements OnInit, ControlValueAccessor {
  //#region INPUTS
  public label = input('');
  public loading = input(false);

  public type = input('text');
  public min = input<number | null>(null);
  public max = input<number | null>(null);
  //#endregion

  //#region CVA
  protected value: number | null = null;
  private onChange = (value: number | null) => {};
  private onTouched = () => {};
  //#endregion

  //#region OUTPUTS
  //#endregion

  //#region FIELDS
  protected _disabled = signal(false);

  //#endregion

  //#region HOOKS
  ngOnInit(): void {}
  //#endregion

  writeValue(val: number | null): void {
    this.value = val;
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabled.set(isDisabled);
  }

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.value = input.valueAsNumber;
    this.onChange(isNaN(this.value) ? null : this.value);
  }
}
