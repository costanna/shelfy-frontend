import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Review, ReviewComment, ReviewRequest } from '../../../../core/models/review.model';
import { ReviewService } from '../../../../core/services/review.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StarRating } from '../../../../shared/components/star-rating/star-rating';
import { ReviewForm } from '../review-form/review-form';

@Component({
  selector: 'app-review-section',
  imports: [DatePipe, TranslatePipe, FormsModule, StarRating, ReviewForm],
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
  protected readonly likingId = signal<number | null>(null);
  protected readonly openComments = signal<ReadonlySet<number>>(new Set());
  protected readonly comments = signal<ReadonlyMap<number, ReviewComment[]>>(new Map());
  protected readonly commentDrafts = signal<ReadonlyMap<number, string>>(new Map());
  protected readonly sendingCommentId = signal<number | null>(null);

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

  protected toggleLike(review: Review): void {
    if (this.likingId() !== null) {
      return;
    }
    this.likingId.set(review.id);
    const request = review.likedByMe
      ? this.reviewService.unlike(review.id)
      : this.reviewService.like(review.id);
    request.subscribe({
      next: (updated) => {
        this.likingId.set(null);
        this.reviews.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
      },
      error: () => this.likingId.set(null),
    });
  }

  protected toggleComments(review: Review): void {
    const open = new Set(this.openComments());
    if (open.has(review.id)) {
      open.delete(review.id);
      this.openComments.set(open);
      return;
    }
    open.add(review.id);
    this.openComments.set(open);
    if (!this.comments().has(review.id)) {
      this.reviewService.comments(review.id).subscribe({
        next: (list) =>
          this.comments.update((map) => new Map(map).set(review.id, list)),
      });
    }
  }

  protected isCommentsOpen(review: Review): boolean {
    return this.openComments().has(review.id);
  }

  protected commentsFor(review: Review): ReviewComment[] {
    return this.comments().get(review.id) ?? [];
  }

  protected draftFor(review: Review): string {
    return this.commentDrafts().get(review.id) ?? '';
  }

  protected onDraftInput(review: Review, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.commentDrafts.update((map) => new Map(map).set(review.id, value));
  }

  protected sendComment(review: Review): void {
    const text = this.draftFor(review).trim();
    if (!text || this.sendingCommentId() !== null) {
      return;
    }
    this.sendingCommentId.set(review.id);
    this.reviewService.addComment(review.id, { text }).subscribe({
      next: (comment) => {
        this.sendingCommentId.set(null);
        this.comments.update((map) => new Map(map).set(review.id, [...(map.get(review.id) ?? []), comment]));
        this.commentDrafts.update((map) => {
          const next = new Map(map);
          next.delete(review.id);
          return next;
        });
      },
      error: () => this.sendingCommentId.set(null),
    });
  }

  protected removeComment(review: Review, comment: ReviewComment): void {
    this.reviewService.deleteComment(review.id, comment.id).subscribe({
      next: () =>
        this.comments.update((map) =>
          new Map(map).set(
            review.id,
            (map.get(review.id) ?? []).filter((item) => item.id !== comment.id),
          ),
        ),
    });
  }

  private load(bookId: number): void {
    this.reviewService.list(bookId).subscribe({
      next: (reviews) => this.reviews.set(reviews),
    });
  }
}
