import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty">
      <span class="icon" aria-hidden="true">{{ icon() }}</span>
      <p class="message">{{ message() }}</p>
      <ng-content />
    </div>
  `,
  styleUrl: './empty-state.scss',
})
export class EmptyState {
  readonly message = input.required<string>();
  readonly icon = input('📚');
}
