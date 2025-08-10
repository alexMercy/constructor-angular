import {
  AfterViewInit,
  Component,
  signal,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { exampleData } from '../services/descriptor';
import { Container } from '../shared/ui/container/container';

@Component({
  selector: 'app-root',
  template: `
    <div
      style="display: flex; flex-direction: column; gap: 30px; border: 1px solid black"
    >
      <a>app</a>
      <ng-container #vcr />
      <a>app end</a>
    </div>
  `,
  styleUrl: './app.scss',
})
export class App implements AfterViewInit {
  private vcr = viewChild.required('vcr', { read: ViewContainerRef });
  protected readonly title = signal('constructor-app');

  ngAfterViewInit(): void {
    const ref = this.vcr().createComponent(Container);
    ref.setInput('components', exampleData);
    ref.setInput('styles', { border: '1px solid yellow' });
    ref.changeDetectorRef.detectChanges();
  }
}
