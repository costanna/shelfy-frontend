import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { BOOK_SORT_OPTIONS, BOOK_STATUSES, BookSort, BookStatus, BookStatusCounts } from '../../../core/models/book.model';
import { Category } from '../../../core/models/category.model';
import { FilterPresets } from '../../../shared/components/filter-presets/filter-presets';

const COUNT_KEY_BY_STATUS: Record<BookStatus, keyof BookStatusCounts> = {
  WANT_TO_READ: 'wantToRead',
  READING: 'reading',
  READ: 'read',
  WANT_TO_BUY: 'wantToBuy',
};

export interface BookFilterValue {
  status: BookStatus | null;
  categoryId: number | null;
  q: string;
  sort: BookSort | null;
}

@Component({
  selector: 'app-book-filters',
  imports: [TranslatePipe, FilterPresets],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-filters.html',
  styleUrl: './book-filters.scss',
})
export class BookFilters {
  readonly value = input.required<BookFilterValue>();
  readonly categories = input.required<Category[]>();
  readonly statusCounts = input<BookStatusCounts | null>(null);

  readonly valueChange = output<BookFilterValue>();

  protected readonly statuses = BOOK_STATUSES;
  protected readonly sortOptions = BOOK_SORT_OPTIONS;
  protected readonly defaultSort: BookSort = BOOK_SORT_OPTIONS[0];

  protected readonly hasActiveFilters = computed(() => {
    const current = this.value();
    return current.status !== null || current.categoryId !== null || current.q.trim() !== '';
  });

  protected countFor(status: BookStatus): number | null {
    const counts = this.statusCounts();
    return counts ? counts[COUNT_KEY_BY_STATUS[status]] : null;
  }

  protected onSearch(event: Event): void {
    const q = (event.target as HTMLInputElement).value;
    this.valueChange.emit({ ...this.value(), q });
  }

  protected selectStatus(status: BookStatus | null): void {
    this.valueChange.emit({ ...this.value(), status });
  }

  protected selectCategory(categoryId: number | null): void {
    this.valueChange.emit({ ...this.value(), categoryId });
  }

  protected onSort(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value as BookSort;
    this.valueChange.emit({ ...this.value(), sort: raw });
  }

  protected clear(): void {
    this.valueChange.emit({ status: null, categoryId: null, q: '', sort: this.value().sort });
  }
}
