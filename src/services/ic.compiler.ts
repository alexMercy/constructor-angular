import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FORM_CONTROL_NAME_TOKEN } from '../shared/lib/injectionTokens/injectionTokens';
import { isNil } from '../shared/lib/isNil/isNil';
import { RefItem } from './refsStorage.service';

export enum Commands {
  jrgt = 'jrgt',
  s = 's',
  sp = 'sp',
  setres = 'setres',
}

export enum Contexts {
  dependencies = 'dependencies',
  validators = 'validators',
}

interface Context {
  rowIdx: number;
  result: any;
}

@Injectable({
  providedIn: 'root',
})
export class IcCompilerService {
  //#region STATES
  private valueChangesDepsSources = new Set<string>();
  //#endregion

  private commands = {
    jrgt: (
      op1: number,
      op2: number,
      relativeJump: number,
      context: Context
    ) => {
      const isGreater = op1 > op2;

      const ctx = {
        ...context,
        rowIdx: isGreater ? context.rowIdx + relativeJump : context.rowIdx + 1,
      };

      return ctx;
    },
    s: (
      setter: (newValue: unknown) => void,
      value: unknown,
      context: Context
    ) => {
      setter(value);
      return { ...context, rowIdx: context.rowIdx + 1 };
    },
    sp: (
      setter: (newValue: unknown) => void,
      value: unknown,
      context: Context
    ) => {
      setter(value);
      return { ...context, rowIdx: context.rowIdx + 1 };
    },
    setres: (value: unknown, context: Context) => {
      return {
        rowIdx: context.rowIdx + 1,
        result: value,
      };
    },
  };

  private allowedContextCommands = {
    [Contexts.dependencies]: [Commands.jrgt, Commands.s, Commands.sp],
    [Contexts.validators]: [Commands.jrgt, Commands.setres],
  };

  public isAllowedCommand(command: Commands, contextPack: Contexts) {
    const commandsList = this.allowedContextCommands[contextPack];
    return commandsList.includes(command);
  }

  public commandContext = {
    [Contexts.validators]: (
      form: FormGroup
    ): Record<string, (...args: any[]) => Context> => ({
      [Commands.jrgt]: (
        op1: string,
        op2: string,
        relativeJump: string,
        context: Context
      ) => {
        const control1 = form.get(op1);
        const control2 = form.get(op2);
        if (isNil(control1) || isNil(control2)) {
          throw new Error('formcontrols not found');
        } else {
          const result = this.commands[Commands.jrgt](
            control1.value,
            control2.value,
            +relativeJump,
            context
          );
          return result;
        }
      },
      [Commands.setres]: (value: string, context: Context) => {
        const result = this.commands[Commands.setres](value, context);
        return result;
      },
    }),
    [Contexts.dependencies]: (
      form: FormGroup,
      refsList: RefItem[]
    ): Record<string, (...args: any[]) => Context> => ({
      [Commands.jrgt]: (
        op1: string,
        op2: string,
        relativeJump: string,
        context: Context
      ) => {
        const control1 = form.get(op1);
        const control2 = form.get(op2);
        if (isNil(control1) || isNil(control2)) {
          throw new Error('formcontrols not found');
        } else {
          const result = this.commands[Commands.jrgt](
            control1.value,
            control2.value,
            +relativeJump,
            context
          );
          return result;
        }
      },
      ///
      [Commands.s]: (
        controlName: string,
        valueControlName: string,
        context: Context
      ) => {
        if (this.valueChangesDepsSources.has(controlName)) {
          return { ...context, rowIdx: -1 };
        }
        const value = form.get(valueControlName)?.value;
        const setter = (value: unknown) =>
          this.setValueFormDeps(form, controlName, value);
        const result = this.commands[Commands.s](setter, value, context);

        return result;
      },
      [Commands.sp]: (
        controlName: string,
        propName: string,
        valueControlName: string,
        context: Context
      ) => {
        const ref = refsList.find(({ ref }) => {
          return (
            ref.injector.get(FORM_CONTROL_NAME_TOKEN, null) === controlName
          );
        });
        const setter = (value: any) => {
          ref?.ref.setInput(propName, value);
        };
        const value = form.get(valueControlName)?.value;
        const result = this.commands[Commands.sp](setter, value, context);
        return result;
      },
    }),
  };

  private setValueFormDeps(form: FormGroup, controlName: string, value: any) {
    this.valueChangesDepsSources.add(controlName);
    form.controls[controlName].setValue(value);
    this.valueChangesDepsSources.delete(controlName);
  }

  public getRawCommands(code: string) {
    const rowSplitter = ';';
    const blockSplitter = ' ';
    return code.split(rowSplitter).map((row) => row.split(blockSplitter));
  }
}

//back code -> choose context -> add contextInputs -> exec ic
