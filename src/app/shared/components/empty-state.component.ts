import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="empty-state">
      <i [class]="icon()" aria-hidden="true"></i>
      <h3>{{ title() }}</h3>
      @if (message()) {
        <p>{{ message() }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: `
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1.5rem;
      text-align: center;
      color: var(--p-text-muted-color);
    }

    .empty-state i {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      opacity: 0.6;
    }

    .empty-state h3 {
      margin: 0 0 0.5rem;
      color: var(--p-text-color);
      font-size: 1.125rem;
    }

    .empty-state p {
      margin: 0 0 1rem;
      max-width: 24rem;
    }
  `,
})
export class EmptyStateComponent {
  icon = input('pi pi-inbox');
  title = input('Nothing here yet');
  message = input<string | undefined>(undefined);
}
