import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, forkJoin, of } from 'rxjs';

import { ReadingGoalService } from '../../../core/services/reading-goal.service';
import { ReadingLogService } from '../../../core/services/reading-log.service';

@Component({
  selector: 'app-goal-streak-card',
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './goal-streak-card.html',
  styleUrl: './goal-streak-card.scss',
})
export class GoalStreakCard {
  private readonly data = toSignal(
    forkJoin({
      goal: inject(ReadingGoalService).getCurrent().pipe(catchError(() => of(null))),
      streak: inject(ReadingLogService).streak().pipe(catchError(() => of(null))),
    }),
    { initialValue: { goal: null, streak: null } },
  );

  protected readonly goal = computed(() => this.data().goal);
  protected readonly streak = computed(() => this.data().streak);

  protected readonly goalPercent = computed(() => {
    const goal = this.goal();
    if (!goal?.targetBooks) {
      return 0;
    }
    return Math.min(100, Math.round((goal.booksRead / goal.targetBooks) * 100));
  });
}
