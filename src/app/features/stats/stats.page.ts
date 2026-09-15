import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { ReadingStats } from '../../core/models/stats.model';
import { StatsService } from '../../core/services/stats.service';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { Spinner } from '../../shared/components/spinner/spinner';

@Component({
  selector: 'app-stats-page',
  imports: [RouterLink, TranslatePipe, DatePipe, Spinner, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stats.page.html',
  styleUrl: './stats.page.scss',
})
export class StatsPage {
  private readonly statsService = inject(StatsService);

  protected readonly stats = signal<ReadingStats | null>(null);
  protected readonly loading = signal(true);

  constructor() {
    this.statsService.get().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
