import { Type } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ComponentProps } from '../shared/lib/interfaces/components.interface';
import { ButtonUI } from '../shared/ui/button/button';
import { Container } from '../shared/ui/container/container';
import { FormUI } from '../shared/ui/form/form';
import { InputUI } from '../shared/ui/input/input';

const buttonFns: Record<string, any> = {
  logHello: {
    fn: () => () => {
      console.log('hello world');
    },
  },
  toggleField: {
    deps: ['form'],
    fn: (controlName: string) => (form: FormGroup) => (event: Event) => {
      const control = form.get(controlName);
      if (!control) {
        throw new Error(`control with name ${controlName} was not found`);
      }

      const status = control.status;
      if (status === 'DISABLED') {
        control.enable();
      } else {
        control.reset();
        control.disable();
      }
    },
  },
};

interface mockI {
  component: string;
  title: string;
  inputs?: Record<string, any>;
  outputs?: Record<string, string>;
}

const mockData: any[] = [
  {
    component: 'ButtonUI',
    inputs: {
      label: 'aboba',
      disabled: 'false',
      rounded: 'true',
    },
    outputs: {
      click: 'logHello',
    },
  },
  {
    component: 'Container',
    inputs: {
      styles: { border: '1px solid red' },
      styleClass: 'aboba',
      components: [
        {
          component: 'ButtonUI',
          inputs: {
            label: 'inner aboba',
            disabled: 'false',
          },
          outputs: {
            click: 'logHello',
          },
        },
        {
          component: 'Container',
          inputs: {
            styles: { border: '1px solid aqua' },
            styleClass: 'aboba',
            components: [
              {
                component: 'ButtonUI',
                inputs: {
                  label: 'inner aboba',
                  disabled: 'false',
                },
                outputs: {
                  click: 'logHello',
                },
              },
            ],
          },
        },
      ],
    },
  },
];

const mockData2: mockI[] = [
  {
    component: 'FormUI',
    title: 'form',
    inputs: {
      style: {
        display: 'flex',
        'flex-direction': 'column',
        gap: '12px',
        'background-color': 'color(srgb 0.972549 0.980392 0.988235)',
        'border-radius': '14px',
        padding: '17.5px',
      },
      fields: [
        {
          name: 'age',
          dependsOn: ['minAge', 'maxAge'],
          depsLogic: [
            'jrgt age minAge 2;' +
              's age minAge;' +
              'sp age min minAge;' +
              'jrgt maxAge age 2;' +
              's age maxAge;' +
              'sp age max maxAge',
          ],
          formValidators: [
            {
              name: 'inRange',
              errorMessage: 'value age not in a range',
              code:
                'jrgt age minAge 2;' +
                'setres error;' +
                'jrgt maxAge age 2;' +
                'setres error',
            },
          ],
        },
        {
          name: 'minAge',
          dependsOn: ['maxAge'],
          depsLogic: [
            //prettier-ignore
            'jrgt maxAge minAge 2;'
            + 's minAge maxAge;'
            + 'sp minAge max maxAge',
          ],
        },
        {
          name: 'maxAge',
          dependsOn: ['minAge'],
          depsLogic: [
            //prettier-ignore
            'jrgt maxAge minAge 2;'
            + 's maxAge minAge;'
            + 'sp maxAge min minAge',
          ],
        },
      ],
      components: [
        {
          component: 'Container',
          title: 'minAgeContainer',
          inputs: {
            styles: {
              gap: '12px',
              'background-color': 'color(srgb 0.9 0.9 0.9)',
              'border-radius': '14px',
              padding: '17.5px',
            },
            styleClass: 'aboba',
            components: [
              {
                component: 'InputUI',
                title: 'minAge',
                inputs: {
                  formControlName: 'minAge',
                  type: 'number',
                  label: 'Min Age',
                },
              },
            ],
          },
        },
        {
          component: 'InputUI',
          title: 'age',
          inputs: {
            formControlName: 'age',
            type: 'number',
            label: 'Age',
          },
        },

        {
          component: 'InputUI',
          title: 'maxAge',
          inputs: {
            formControlName: 'maxAge',
            type: 'number',
            label: 'Max Age',
          },
        },
        {
          component: 'Container',
          title: 'buttonsContainer',
          inputs: {
            styles: {
              display: 'flex',
              gap: '12px',
              'background-color': 'color(srgb 0.95 0.95 0.95)',
              'border-radius': '14px',
              padding: '17.5px',
            },
            components: [
              {
                component: 'ButtonUI',
                title: 'submitButton',
                inputs: {
                  label: 'Submit',
                  type: 'submit',
                },
              },
              {
                component: 'ButtonUI',
                title: 'DisableEnableMinAge',
                inputs: {
                  label: 'Disable/Enable minAge',
                  type: 'button',
                },
                outputs: {
                  click: 'toggleField minAge',
                },
              },
              {
                component: 'ButtonUI',
                title: 'DisableEnableMaxAge',
                inputs: {
                  label: 'Disable/Enable maxAge',
                  type: 'button',
                },
                outputs: {
                  click: 'toggleField maxAge',
                },
              },
            ],
          },
        },
      ],
    },
  },
];

export const exampleData = JSON.parse(JSON.stringify(mockData2));

const componentsMap: Record<string, Type<any>> = {
  ButtonUI,
  Container,
  FormUI,
  InputUI,
};

export function descript(data: mockI[]): ComponentProps[] {
  return data.map(
    ({ component: _component, inputs: _inputs, outputs: _outputs, title }) => {
      const component = componentsMap[_component];
      const inputs: ComponentProps['inputs'] =
        _inputs &&
        Object.entries(_inputs).map(([key, value]) => [key, () => value]);

      const outputs: ComponentProps['outputs'] =
        _outputs &&
        Object.entries(_outputs).map(([key, value]) => {
          const [fnName, ...args] = value.split(' ');

          const fnCfg = buttonFns[fnName];
          const newFnCfg = { ...fnCfg, fn: fnCfg.fn(...args) };
          return [key, newFnCfg];
        });

      return {
        component,
        title,
        inputs,
        outputs,
      };
    }
  );
}
