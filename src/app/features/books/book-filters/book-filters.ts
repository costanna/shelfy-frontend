import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { BOOK_SORT_OPTIONS, BOOK_STATUSES, BookSort, BookStatus } from '../../../core/models/book.model';
import { Category } from '../../../core/models/category.model';

export interface BookFilterValue {
  status: BookStatus | null;
  categoryId: number | null;
  q: string;
  sort: BookSort | null;
}

@Component({
  selector: 'app-book-filters',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-filters.html',
  styleUrl: './book-filters.scss',
})
export class BookFilters {
  readonly value = input.required<BookFilterValue>();
  readonly categories = input.required<Category[]>();

  readonly valueChange = output<BookFilterValue>();

  protected readonly statuses = BOOK_STATUSES;
  protected readonly sortOptions = BOOK_SORT_OPTIONS;
  protected readonly defaultSort: BookSort = BOOK_SORT_OPTIONS[0];

  protected readonly hasActiveFilters = computed(() => {
    const current = this.value();
    return current.status !== null || current.categoryId !== null || current.q.trim() !== '';
  });

  protected onSearch(event: Event): void {
    const q = (event.target as HTMLInputElement).value;
    this.valueChange.emit({ ...this.value(), q });
  }

  protected onStatus(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    this.valueChange.emit({ ...this.value(), status: raw ? (raw as BookStatus) : null });
  }

  protected onCategory(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    this.valueChange.emit({ ...this.value(), categoryId: raw ? Number(raw) : null });
  }

  protected onSort(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value as BookSort;
    this.valueChange.emit({ ...this.value(), sort: raw });
  }

  protected clear(): void {
    this.valueChange.emit({ status: null, categoryId: null, q: '', sort: this.value().sort });
  }
}
