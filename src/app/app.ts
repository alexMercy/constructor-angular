import {
  AfterViewInit,
  Component,
  inject,
  signal,
  ViewContainerRef,
} from '@angular/core';
import { exampleData } from '../services/descriptor';
import { Container } from '../shared/ui/container/container';

@Component({
  selector: 'app-root',
  template: ``,
  styleUrl: './app.scss',
})
export class App implements AfterViewInit {
  private vcr = inject(ViewContainerRef);
  protected readonly title = signal('constructor-app');

  ngAfterViewInit(): void {
    const ref = this.vcr.createComponent(Container);
    ref.setInput('components', exampleData);
    ref.setInput('styles', {
      border: '1px solid red',
      display: 'flex',
      gap: '12px',
      padding: '12px',
    });
    ref.changeDetectorRef.detectChanges();
  }
}
