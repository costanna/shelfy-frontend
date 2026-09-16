import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, catchError, of, switchMap } from 'rxjs';

import { Book } from '../../../core/models/book.model';
import {
  ReadingCalendar as ReadingCalendarData,
  ReadingLogBook,
  ReadingLogBookSummary,
  ReadingStreak,
} from '../../../core/models/reading-log.model';
import { BookService } from '../../../core/services/book.service';
import { LanguageService } from '../../../core/services/language.service';
import { ReadingLogService } from '../../../core/services/reading-log.service';
import { Spinner } from '../../../shared/components/spinner/spinner';

const PICKER_PAGE_SIZE = 200;

interface CalendarCell {
  dateKey: string;
  day: number;
  inMonth: boolean;
  isFuture: boolean;
  isToday: boolean;
}

interface DayBookState {
  book: Book;
  marked: boolean;
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function buildWeeks(year: number, month: number, todayKey: string): CalendarCell[][] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const start = new Date(year, month - 1, 1 - firstWeekday);

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const dateKey = toDateKey(date);
    cells.push({
      dateKey,
      day: date.getDate(),
      inMonth: date.getMonth() === month - 1,
      isFuture: dateKey > todayKey,
      isToday: dateKey === todayKey,
    });
  }

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  while (weeks.length > 0 && weeks[weeks.length - 1].every((cell) => !cell.inMonth)) {
    weeks.pop();
  }
  return weeks;
}

@Component({
  selector: 'app-reading-calendar',
  imports: [TranslatePipe, Spinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reading-calendar.html',
  styleUrl: './reading-calendar.scss',
})
export class ReadingCalendar {
  private readonly readingLogService = inject(ReadingLogService);
  private readonly bookService = inject(BookService);
  private readonly language = inject(LanguageService).language;

  private readonly todayKey = toDateKey(new Date());

  protected readonly viewYear = signal(new Date().getFullYear());
  protected readonly viewMonth = signal(new Date().getMonth() + 1);

  protected readonly calendar = signal<ReadingCalendarData | null>(null);
  protected readonly loading = signal(true);
  protected readonly streak = signal<ReadingStreak | null>(null);
  protected readonly books = signal<Book[]>([]);

  protected readonly activeDay = signal<string | null>(null);
  protected readonly togglingBookId = signal<number | null>(null);

  protected readonly summary = signal<ReadingLogBookSummary[]>([]);
  protected readonly expandedBookId = signal<number | null>(null);
  protected readonly removingKey = signal<string | null>(null);

  private readonly calendarRequest$ = new Subject<{ year: number; month: number }>();

  protected readonly weeks = computed(() => buildWeeks(this.viewYear(), this.viewMonth(), this.todayKey));

  protected readonly daysByDate = computed(() => {
    const map = new Map<string, ReadingLogBook[]>();
    for (const day of this.calendar()?.days ?? []) {
      map.set(day.date, day.books);
    }
    return map;
  });

  protected readonly monthLabel = computed(() => {
    const date = new Date(this.viewYear(), this.viewMonth() - 1, 1);
    const label = new Intl.DateTimeFormat(this.language(), { month: 'long', year: 'numeric' }).format(date);
    return label.charAt(0).toUpperCase() + label.slice(1);
  });

  protected readonly weekdayLabels = computed(() => {
    const formatter = new Intl.DateTimeFormat(this.language(), { weekday: 'short' });
    const labels: string[] = [];
    for (let i = 0; i < 7; i++) {
      labels.push(formatter.format(new Date(2024, 0, 1 + i)));
    }
    return labels;
  });

  protected readonly formattedActiveDay = computed(() => {
    const date = this.activeDay();
    if (!date) {
      return '';
    }
    const label = new Intl.DateTimeFormat(this.language(), { dateStyle: 'long' }).format(parseDateKey(date));
    return label.charAt(0).toUpperCase() + label.slice(1);
  });

  protected readonly activeDayBooks = computed<DayBookState[]>(() => {
    const date = this.activeDay();
    if (!date) {
      return [];
    }
    const marked = new Set((this.daysByDate().get(date) ?? []).map((book) => book.id));
    return this.books().map((book) => ({ book, marked: marked.has(book.id) }));
  });

  constructor() {
    this.bookService.list({ size: PICKER_PAGE_SIZE }).subscribe({
      next: (page) => this.books.set(page.content),
    });
    this.loadStreak();
    this.loadSummary();

    this.calendarRequest$
      .pipe(
        switchMap(({ year, month }) => {
          this.loading.set(true);
          return this.readingLogService.calendar(year, month).pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((calendar) => {
        this.loading.set(false);
        if (calendar) {
          this.calendar.set(calendar);
        }
      });

    effect(() => {
      this.calendarRequest$.next({ year: this.viewYear(), month: this.viewMonth() });
    });
  }

  protected dayBooks(dateKey: string): ReadingLogBook[] {
    return this.daysByDate().get(dateKey) ?? [];
  }

  protected previousMonth(): void {
    this.shiftMonth(-1);
  }

  protected nextMonth(): void {
    this.shiftMonth(1);
  }

  protected openDay(cell: CalendarCell): void {
    if (cell.isFuture) {
      return;
    }
    this.activeDay.set(cell.dateKey);
  }

  protected closeDay(): void {
    this.activeDay.set(null);
  }

  protected toggleBook(book: Book): void {
    const date = this.activeDay();
    if (!date || this.togglingBookId() !== null) {
      return;
    }
    const marked = (this.daysByDate().get(date) ?? []).some((entry) => entry.id === book.id);
    this.togglingBookId.set(book.id);

    const request = marked
      ? this.readingLogService.unmark(book.id, date)
      : this.readingLogService.mark({ bookId: book.id, date });

    request.subscribe({
      next: () => {
        this.togglingBookId.set(null);
        this.refreshAfterChange();
      },
      error: () => this.togglingBookId.set(null),
    });
  }

  protected toggleExpanded(bookId: number): void {
    this.expandedBookId.set(this.expandedBookId() === bookId ? null : bookId);
  }

  protected formatDate(dateKey: string): string {
    return new Intl.DateTimeFormat(this.language(), { dateStyle: 'medium' }).format(parseDateKey(dateKey));
  }

  protected removeMarkedDay(bookId: number, date: string): void {
    const key = `${bookId}-${date}`;
    if (this.removingKey() !== null) {
      return;
    }
    this.removingKey.set(key);

    this.readingLogService.unmark(bookId, date).subscribe({
      next: () => {
        this.removingKey.set(null);
        this.refreshAfterChange();
      },
      error: () => this.removingKey.set(null),
    });
  }

  private refreshAfterChange(): void {
    this.calendarRequest$.next({ year: this.viewYear(), month: this.viewMonth() });
    this.loadStreak();
    this.loadSummary();
  }

  private shiftMonth(delta: number): void {
    let year = this.viewYear();
    let month = this.viewMonth() + delta;
    if (month < 1) {
      month = 12;
      year -= 1;
    } else if (month > 12) {
      month = 1;
      year += 1;
    }
    this.viewYear.set(year);
    this.viewMonth.set(month);
  }

  private loadStreak(): void {
    this.readingLogService.streak().subscribe({
      next: (streak) => this.streak.set(streak),
    });
  }

  private loadSummary(): void {
    this.readingLogService.summary().subscribe({
      next: (summary) => this.summary.set(summary),
    });
  }
}
