import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { MonthlyReadCount, ReadingStats } from '../../core/models/stats.model';
import { LanguageService } from '../../core/services/language.service';
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
  private readonly language = inject(LanguageService).language;

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

  /** "septiembre de 2026", en el idioma activo de la app, sin necesitar datos de locale de Angular. */
  protected monthLabel(entry: MonthlyReadCount): string {
    const date = new Date(entry.year, entry.month - 1, 1);
    const label = new Intl.DateTimeFormat(this.language(), {
      month: 'long',
      year: 'numeric',
    }).format(date);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  /** Ancho de la barra relativo al mes con más libros, con un mínimo visible. */
  protected barWidth(entry: MonthlyReadCount, months: MonthlyReadCount[]): number {
    const max = Math.max(...months.map((month) => month.count));
    return Math.max(8, Math.round((entry.count / max) * 100));
  }
}
