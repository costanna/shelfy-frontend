import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { Book } from '../../../core/models/book.model';
import { StatusBadge } from '../status-badge/status-badge';

@Component({
  selector: 'app-book-card',
  imports: [RouterLink, TranslatePipe, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-card.html',
  styleUrl: './book-card.scss',
})
export class BookCard {
  readonly book = input.required<Book>();
  readonly compact = input(false);

  protected readonly coverFailed = signal(false);

  protected readonly progressPercent = computed(() => {
    const item = this.book();
    if (item.status !== 'READING' || !item.pageCount || !item.currentPage) {
      return null;
    }
    return Math.min(100, Math.round((item.currentPage / item.pageCount) * 100));
  });

  protected initials(title: string): string {
    return title
      .split(/\s+/)
      .filter((word) => word.length > 2)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('');
  }
}
