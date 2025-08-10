import { Type } from '@angular/core';

export interface ComponentProps {
  component: Type<any>;
  inputs?: [string, () => unknown][];
  outputs?: [
    string,
    {
      deps?: string[];
      fn: (...args: unknown[]) => (event: unknown) => unknown;
    }
  ][];
}
