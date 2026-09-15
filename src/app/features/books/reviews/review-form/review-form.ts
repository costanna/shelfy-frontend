import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { Review, ReviewRequest } from '../../../../core/models/review.model';
import { FieldError } from '../../../../shared/components/field-error/field-error';
import { StarRating } from '../../../../shared/components/star-rating/star-rating';

@Component({
  selector: 'app-review-form',
  imports: [ReactiveFormsModule, TranslatePipe, StarRating, FieldError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './review-form.html',
  styleUrl: './review-form.scss',
})
export class ReviewForm {
  private readonly formBuilder = inject(FormBuilder);

  readonly review = input<Review | null>(null);
  readonly saving = input(false);

  readonly save = output<ReviewRequest>();
  readonly cancel = output<void>();

  protected readonly form = this.formBuilder.nonNullable.group({
    rating: [5, [Validators.required, Validators.min(0.5)]],
    text: ['', [Validators.maxLength(5000)]],
  });

  constructor() {
    effect(() => {
      const current = this.review();
      this.form.reset({
        rating: current?.rating ?? 5,
        text: current?.text ?? '',
      });
    });
  }

  protected setRating(rating: number): void {
    this.form.controls.rating.setValue(rating);
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      return;
    }
    const value = this.form.getRawValue();
    this.save.emit({ rating: value.rating, text: value.text.trim() || null });
  }
}
