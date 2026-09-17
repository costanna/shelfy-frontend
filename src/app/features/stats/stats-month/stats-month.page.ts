import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { BookReadingDuration } from '../../../core/models/stats.model';
import { BookService } from '../../../core/services/book.service';
import { LanguageService } from '../../../core/services/language.service';
import { StatsService } from '../../../core/services/stats.service';
import { ToastService } from '../../../core/services/toast.service';
import { dateRangeValidator } from '../../../core/util/date-range.validator';
import { formatMonthLabel } from '../../../core/util/month-label';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { FieldError } from '../../../shared/components/field-error/field-error';
import { Spinner } from '../../../shared/components/spinner/spinner';

@Component({
  selector: 'app-stats-month-page',
  imports: [RouterLink, TranslatePipe, DatePipe, ReactiveFormsModule, Spinner, EmptyState, FieldError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stats-month.page.html',
  styleUrl: './stats-month.page.scss',
})
export class StatsMonthPage {
  private readonly statsService = inject(StatsService);
  private readonly bookService = inject(BookService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly language = inject(LanguageService).language;

  readonly year = input.required<string>();
  readonly month = input.required<string>();

  private readonly allDurations = signal<BookReadingDuration[] | null>(null);
  protected readonly loading = signal(true);

  protected readonly editingBookId = signal<number | null>(null);
  protected readonly savingDates = signal(false);
  protected readonly editSubmitted = signal(false);

  protected readonly monthLabel = computed(() =>
    formatMonthLabel(Number(this.year()), Number(this.month()), this.language()),
  );

  protected readonly durations = computed(() => {
    const year = Number(this.year());
    const month = Number(this.month());
    return (this.allDurations() ?? []).filter((entry) => {
      const finished = new Date(entry.finishedAt);
      return finished.getFullYear() === year && finished.getMonth() + 1 === month;
    });
  });

  protected readonly datesForm = this.formBuilder.nonNullable.group(
    {
      startedAt: [''],
      finishedAt: [''],
    },
    { validators: [dateRangeValidator] },
  );

  constructor() {
    effect(() => {
      // Re-run whenever the route params change (e.g. navigating between months).
      this.year();
      this.month();
      this.loadStats();
    });
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
        this.allDurations.set(stats.readingDurations);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
