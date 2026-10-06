import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { FeedItem } from '../../core/models/feed.model';
import { FeedService } from '../../core/services/feed.service';
import { AvatarInitials } from '../../shared/components/avatar-initials/avatar-initials';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { Spinner } from '../../shared/components/spinner/spinner';
import { StarRating } from '../../shared/components/star-rating/star-rating';

@Component({
  selector: 'app-feed-page',
  imports: [RouterLink, TranslatePipe, DatePipe, Spinner, EmptyState, StarRating, AvatarInitials],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feed.page.html',
  styleUrl: './feed.page.scss',
})
export class FeedPage {
  private readonly feedService = inject(FeedService);

  private static readonly PAGE_SIZE = 20;

  protected readonly items = signal<FeedItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly reachedEnd = signal(false);

  constructor() {
    this.loadFirst();
  }

  protected loadMore(): void {
    if (this.loadingMore() || this.reachedEnd()) {
      return;
    }
    const current = this.items();
    const last = current[current.length - 1];
    if (!last) {
      return;
    }
    this.loadingMore.set(true);
    this.feedService.list(FeedPage.PAGE_SIZE, last.occurredAt).subscribe({
      next: (next) => {
        this.items.update((list) => [...list, ...next]);
        this.reachedEnd.set(next.length < FeedPage.PAGE_SIZE);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }

  private loadFirst(): void {
    this.feedService.list(FeedPage.PAGE_SIZE).subscribe({
      next: (items) => {
        this.items.set(items);
        this.reachedEnd.set(items.length < FeedPage.PAGE_SIZE);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected actionKey(item: FeedItem): string {
    switch (item.type) {
      case 'STARTED_READING':
        return 'feed.startedReading';
      case 'FINISHED_READING':
        return 'feed.finishedReading';
      case 'REVIEWED':
        return 'feed.reviewed';
    }
  }
}
