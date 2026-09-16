import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, of } from 'rxjs';

import { ReadingGoal } from '../../../core/models/reading-goal.model';
import { ReadingGoalService } from '../../../core/services/reading-goal.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-reading-goal-card',
  imports: [TranslatePipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reading-goal-card.html',
  styleUrl: './reading-goal-card.scss',
})
export class ReadingGoalCard {
  private readonly goalService = inject(ReadingGoalService);
  private readonly toast = inject(ToastService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly goal = signal<ReadingGoal | null>(null);
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    targetBooks: [1, [Validators.required, Validators.min(1), Validators.max(1000)]],
  });

  protected readonly progressPercent = computed(() => {
    const current = this.goal();
    if (!current || !current.targetBooks) {
      return 0;
    }
    return Math.min(100, Math.round((current.booksRead / current.targetBooks) * 100));
  });

  constructor() {
    this.load();
  }

  protected startEdit(): void {
    const current = this.goal();
    this.form.setValue({ targetBooks: current?.targetBooks ?? 12 });
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      return;
    }
    this.saving.set(true);

    this.goalService.setCurrent({ targetBooks: this.form.getRawValue().targetBooks }).subscribe({
      next: (goal) => {
        this.goal.set(goal);
        this.saving.set(false);
        this.editing.set(false);
        this.toast.success('readingGoal.saved');
      },
      error: () => this.saving.set(false),
    });
  }

  private load(): void {
    this.goalService
      .getCurrent()
      .pipe(catchError(() => of(null)))
      .subscribe((goal) => this.goal.set(goal));
  }
}
