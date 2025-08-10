import { Injectable } from '@angular/core';

enum Commands {
  jrgt = 'jrgt',
  s = 's',
  sp = 'sp',
  setres = 'setres',
}

@Injectable({
  providedIn: 'root',
})
export class IcCompilerService {
  public compileCode(code: string, context: 'validator' | 'dependencies') {
    switch (context) {
      case 'validator':
        //load validator cases
        break;
      case 'dependencies':
        //load deps cases
        break;
    }
  }

  private commands() {}
}
