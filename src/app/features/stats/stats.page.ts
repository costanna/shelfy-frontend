import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { BookReadingDuration, MonthlyReadCount, ReadingStats } from '../../core/models/stats.model';
import { BookService } from '../../core/services/book.service';
import { LanguageService } from '../../core/services/language.service';
import { StatsService } from '../../core/services/stats.service';
import { ToastService } from '../../core/services/toast.service';
import { dateRangeValidator } from '../../core/util/date-range.validator';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { FieldError } from '../../shared/components/field-error/field-error';
import { Spinner } from '../../shared/components/spinner/spinner';
import { ReadingCalendar } from './reading-calendar/reading-calendar';

@Component({
  selector: 'app-stats-page',
  imports: [
    RouterLink,
    TranslatePipe,
    DatePipe,
    ReactiveFormsModule,
    Spinner,
    EmptyState,
    FieldError,
    ReadingCalendar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stats.page.html',
  styleUrl: './stats.page.scss',
})
export class StatsPage {
  private readonly statsService = inject(StatsService);
  private readonly bookService = inject(BookService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly language = inject(LanguageService).language;

  protected readonly stats = signal<ReadingStats | null>(null);
  protected readonly loading = signal(true);

  protected readonly editingBookId = signal<number | null>(null);
  protected readonly savingDates = signal(false);
  protected readonly editSubmitted = signal(false);

  protected readonly datesForm = this.formBuilder.nonNullable.group(
    {
      startedAt: [''],
      finishedAt: [''],
    },
    { validators: [dateRangeValidator] },
  );

  constructor() {
    this.loadStats();
  }

  protected monthLabel(entry: MonthlyReadCount): string {
    const date = new Date(entry.year, entry.month - 1, 1);
    const label = new Intl.DateTimeFormat(this.language(), {
      month: 'long',
      year: 'numeric',
    }).format(date);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  protected barWidth(entry: MonthlyReadCount, months: MonthlyReadCount[]): number {
    const max = Math.max(...months.map((month) => month.count));
    return Math.max(8, Math.round((entry.count / max) * 100));
  }

  protected startEdit(entry: BookReadingDuration): void {
    this.editingBookId.set(entry.bookId);
    this.editSubmitted.set(false);
    this.datesForm.setValue({ startedAt: entry.startedAt, finishedAt: entry.finishedAt });
  }

  protected cancelEdit(): void {
    this.editingBookId.set(null);
  }

  protected saveDates(bookId: number): void {
    this.editSubmitted.set(true);

    if (this.datesForm.invalid || this.savingDates()) {
      return;
    }
    this.savingDates.set(true);

    const { startedAt, finishedAt } = this.datesForm.getRawValue();
    this.bookService.updateReadingDates(bookId, { startedAt, finishedAt }).subscribe({
      next: () => {
        this.savingDates.set(false);
        this.editingBookId.set(null);
        this.toast.success('stats.datesSaved');
        this.loadStats();
      },
      error: () => this.savingDates.set(false),
    });
  }

  protected removeDates(entry: BookReadingDuration): void {
    const message = this.translate.instant('stats.removeDatesConfirm', { title: entry.title });
    if (!confirm(message)) {
      return;
    }

    this.bookService.updateReadingDates(entry.bookId, { startedAt: null, finishedAt: null }).subscribe({
      next: () => {
        this.toast.success('stats.datesRemoved');
        this.loadStats();
      },
    });
  }

  private loadStats(): void {
    this.loading.set(true);
    this.statsService.get().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
