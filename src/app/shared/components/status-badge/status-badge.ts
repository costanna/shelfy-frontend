import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { BookStatus } from '../../../core/models/book.model';

/** Distintivo de color según el estado de lectura del libro. */
@Component({
  selector: 'app-status-badge',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge {{ cssClass() }}">{{ 'status.' + status() | translate }}</span>`,
})
export class StatusBadge {
  readonly status = input.required<BookStatus>();

  protected readonly cssClass = computed(() => `badge-${this.status().toLowerCase()}`);
}
