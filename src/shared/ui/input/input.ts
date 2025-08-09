import { Component, input, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  imports: [ReactiveFormsModule],
  template: `
    @let _form = form(); @if (_form) {
    <div [formGroup]="_form">
      <label>{{ label() }}</label>
      <input
        style="width: 100px;"
        [formControlName]="formControlName()"
        [type]="type()"
        [min]="min()"
        [max]="max()"
      />
    </div>
    }
  `,
})
export class InputUI implements OnInit {
  //#region INPUTS
  public label = input('');
  public disabled = input(false);
  public loading = input(false);
  public formControlName = input('');
  public form = input<FormGroup>();

  public type = input('');
  public min = input<number | null>(null);
  public max = input<number | null>(null);
  //#endregion

  //#region OUTPUTS
  //#endregion

  //#region FIELDS

  //#endregion

  //#region HOOKS
  ngOnInit(): void {}
  //#endregion

  // onInput(event: Event) {
  //   const input = event.target as HTMLInputElement;
  //   const value = parseInt(input.value, 10);
  //   const max = this.max();
  //   const min = this.min();

  //   if (max && value > max) {
  //     input.value = max.toString();
  //   }
  //   if (min && value < min) {
  //     input.value = min.toString();
  //   }
  // }
}
