import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { MonthlyReadCount, ReadingStats } from '../../core/models/stats.model';
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
  private readonly language = inject(LanguageService).language;

  protected readonly stats = signal<ReadingStats | null>(null);
  protected readonly loading = signal(true);

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
