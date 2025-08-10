import { NgStyle } from '@angular/common';
import { Component, computed, input, OnInit, output } from '@angular/core';

enum Sizes {
  sm = 'sm',
  md = 'md',
  lg = 'lg',
}

enum Severity {
  primary = 'primary',
  secondary = 'secondary',
  success = 'success',
  info = 'info',
  warn = 'warn',
  help = 'help',
  danger = 'danger',
}

const defaultStyleClass = 'button-base';

@Component({
  selector: 'app-button',
  imports: [NgStyle],
  template: ` <button
    [classList]="_styleClass()"
    [ariaLabel]="label()"
    [disabled]="disabled()"
    [ngStyle]="style()"
    [type]="type()"
    (click)="click.emit()"
  >
    {{ label() }}
  </button>`,
  styleUrl: './button.scss',
})
export class ButtonUI implements OnInit {
  //#region INPUTS
  public label = input('');
  public disabled = input(false);
  public loading = input(false);
  public rounded = input(false);
  public type = input('');
  public styleClass = input('');
  public size = input<Sizes>(Sizes.md);
  public severity = input<Severity>(Severity.primary);
  //#endregion

  //#region OUTPUTS
  public click = output();
  //#endregion

  //#region FIELDS
  protected _styleClass = computed(() => {
    const styleClass = this.styleClass();
    return `${defaultStyleClass} ${styleClass}`;
  });
  protected style = computed(() => {
    const _rounded = this.rounded();
    const _size = this.size();
    const _severity = this.severity();

    const sizes = {
      [Sizes.sm]: [123, 321],
      [Sizes.md]: [234, 432],
      [Sizes.lg]: [345, 543],
    };

    const severities = {
      [Severity.primary]: ['black', 'white'],
      [Severity.secondary]: ['black', 'white'],
      [Severity.warn]: ['yellow', 'black'],
      [Severity.danger]: ['red', 'white'],
      [Severity.success]: ['green', 'white'],
      [Severity.help]: ['black', 'white'],
      [Severity.info]: ['black', 'white'],
    };

    const rounded = _rounded ? '28px' : '10px';
    const severity = severities[_severity];
    const size = sizes[_size];

    const styles = {
      'border-radius': rounded,
      'background-color': severity[0],
      display: 'block',
      color: severity[1],
      height: size[0],
      width: size[1],
    };

    return styles;
  });
  //#endregion

  //#region HOOKS
  ngOnInit(): void {}
  //#endregion
}
