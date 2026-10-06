import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, forkJoin, of } from 'rxjs';

import { MonthlyReadCount, ReadingStats } from '../../core/models/stats.model';
import { BookService } from '../../core/services/book.service';
import { LanguageService } from '../../core/services/language.service';
import { StatsService } from '../../core/services/stats.service';
import { formatMonthLabel } from '../../core/util/month-label';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { Spinner } from '../../shared/components/spinner/spinner';
import { ReadingCalendar } from './reading-calendar/reading-calendar';
import { ReadingGoalCard } from './reading-goal-card/reading-goal-card';

@Component({
  selector: 'app-stats-page',
  imports: [RouterLink, TranslatePipe, Spinner, EmptyState, ReadingCalendar, ReadingGoalCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stats.page.html',
  styleUrl: './stats.page.scss',
})
export class StatsPage {
  private readonly statsService = inject(StatsService);
  private readonly bookService = inject(BookService);
  private readonly language = inject(LanguageService).language;

  protected readonly stats = signal<ReadingStats | null>(null);
  protected readonly loading = signal(true);

  private readonly paceInput = toSignal(
    forkJoin({
      reading: this.bookService.list({ status: 'READING', size: 100 }).pipe(catchError(() => of(null))),
      read: this.bookService.list({ status: 'READ', size: 500 }).pipe(catchError(() => of(null))),
    }),
    { initialValue: { reading: null, read: null } },
  );

  /** Pàgines/dia globals: pàgines totals de llibres acabats amb dates / dies totals. */
  protected readonly pagesPerDay = computed(() => {
    const stats = this.stats();
    const readPage = this.paceInput().read;
    if (!stats || !readPage) {
      return null;
    }
    const pageCountById = new Map<number, number>();
    for (const book of readPage.content) {
      if (book.pageCount && book.pageCount > 0) {
        pageCountById.set(book.id, book.pageCount);
      }
    }
    let pages = 0;
    let days = 0;
    for (const duration of stats.readingDurations) {
      const pageCount = pageCountById.get(duration.bookId);
      if (pageCount !== undefined && duration.daysReading > 0) {
        pages += pageCount;
        days += duration.daysReading;
      }
    }
    if (days === 0) {
      return null;
    }
    return Math.max(1, Math.round(pages / days));
  });

  protected readonly etas = computed(() => {
    const pace = this.pagesPerDay();
    const reading = this.paceInput().reading;
    if (!pace || !reading) {
      return [];
    }
    return reading.content
      .filter((book) => book.pageCount && book.pageCount > 0 && (book.currentPage ?? 0) < book.pageCount)
      .map((book) => ({
        id: book.id,
        title: book.title,
        days: Math.max(1, Math.ceil((book.pageCount! - (book.currentPage ?? 0)) / pace)),
      }))
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);
  });

  constructor() {
    this.loadStats();
  }

  protected monthLabel(entry: MonthlyReadCount): string {
    return formatMonthLabel(entry.year, entry.month, this.language());
  }

  protected barWidth(entry: MonthlyReadCount, months: MonthlyReadCount[]): number {
    const max = Math.max(...months.map((month) => month.count));
    return Math.max(8, Math.round((entry.count / max) * 100));
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
