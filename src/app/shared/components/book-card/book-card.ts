import { ChangeDetectionStrategy, Component, input } from '@angular/core';
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

  protected initials(title: string): string {
    return title
      .split(/\s+/)
      .filter((word) => word.length > 2)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('');
  }
}
