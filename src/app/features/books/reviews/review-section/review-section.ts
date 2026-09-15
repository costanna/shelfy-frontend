import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Review, ReviewRequest } from '../../../../core/models/review.model';
import { ReviewService } from '../../../../core/services/review.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StarRating } from '../../../../shared/components/star-rating/star-rating';
import { ReviewForm } from '../review-form/review-form';

@Component({
  selector: 'app-review-section',
  imports: [DatePipe, TranslatePipe, StarRating, ReviewForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './review-section.html',
  styleUrl: './review-section.scss',
})
export class ReviewSection {
  private readonly reviewService = inject(ReviewService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly bookId = input.required<number>();

  protected readonly reviews = signal<Review[]>([]);
  protected readonly saving = signal(false);

  protected readonly editing = signal<Review | null | undefined>(null);

  constructor() {
    effect(() => this.load(this.bookId()));
  }

  protected startCreate(): void {
    this.editing.set(undefined);
  }

  protected startEdit(review: Review): void {
    this.editing.set(review);
  }

  protected closeForm(): void {
    this.editing.set(null);
  }

  protected onSave(request: ReviewRequest): void {
    const current = this.editing();
    this.saving.set(true);

    const done = (messageKey: string) => {
      this.saving.set(false);
      this.editing.set(null);
      this.toast.success(messageKey);
      this.load(this.bookId());
    };

    if (current) {
      this.reviewService.update(this.bookId(), current.id, request).subscribe({
        next: () => done('reviews.updated'),
        error: () => this.saving.set(false),
      });
    } else {
      this.reviewService.create(this.bookId(), request).subscribe({
        next: () => done('reviews.created'),
        error: () => this.saving.set(false),
      });
    }
  }

  protected remove(review: Review): void {
    if (!confirm(this.translate.instant('reviews.deleteConfirm'))) {
      return;
    }
    this.reviewService.delete(this.bookId(), review.id).subscribe({
      next: () => {
        this.toast.success('reviews.deleted');
        this.load(this.bookId());
      },
    });
  }

  private load(bookId: number): void {
    this.reviewService.list(bookId).subscribe({
      next: (reviews) => this.reviews.set(reviews),
    });
  }
}
