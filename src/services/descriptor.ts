import { Type } from '@angular/core';
import { ComponentProps } from '../shared/lib/interfaces/components.interface';
import { ButtonUI } from '../shared/ui/button/button';
import { Container } from '../shared/ui/container/container';
import { FormUI } from '../shared/ui/form/form';
import { InputUI } from '../shared/ui/input/input';

const buttonFns: Record<string, (event: unknown) => unknown> = {
  logHello() {
    console.log('hello world');
  },
};

interface mockI {
  component: string;
  inputs?: Record<string, any>;
  outputs?: Record<string, string>;
}

const mockData: mockI[] = [
  {
    component: 'ButtonUI',
    inputs: {
      label: 'aboba',
      disabled: 'false',
      rounded: 'true',
    },
    outputs: {
      click: '{logHello}',
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
            click: '{logHello}',
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
                  click: '{logHello}',
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
    inputs: {
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
          component: 'InputUI',
          inputs: {
            formControlName: 'age',
            type: 'number',
            label: 'Age',
          },
        },
        {
          component: 'InputUI',
          inputs: {
            formControlName: 'minAge',
            type: 'number',
            label: 'Min Age',
          },
        },
        {
          component: 'InputUI',
          inputs: {
            formControlName: 'maxAge',
            type: 'number',
            label: 'Max Age',
          },
        },
        {
          component: 'ButtonUI',
          inputs: {
            label: 'Submit',
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
    ({ component: _component, inputs: _inputs, outputs: _outputs }) => {
      const component = componentsMap[_component];
      const inputs: ComponentProps['inputs'] =
        _inputs &&
        Object.entries(_inputs).map(([key, value]) => [key, () => value]);

      const outputs: ComponentProps['outputs'] =
        _outputs &&
        Object.entries(_outputs).map(([key, value]) => {
          const fnName = value.slice(1, -1);

          const fn = buttonFns[fnName];
          return [key, fn];
        });

      return {
        component,
        inputs,
        outputs,
      };
    }
  );
}
