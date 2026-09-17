import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { FeedItem } from '../../core/models/feed.model';
import { FeedService } from '../../core/services/feed.service';
import { initials } from '../../core/util/avatar-url';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { Spinner } from '../../shared/components/spinner/spinner';
import { StarRating } from '../../shared/components/star-rating/star-rating';

@Component({
  selector: 'app-feed-page',
  imports: [RouterLink, TranslatePipe, DatePipe, Spinner, EmptyState, StarRating],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feed.page.html',
  styleUrl: './feed.page.scss',
})
export class FeedPage {
  private readonly feedService = inject(FeedService);

  protected readonly items = signal<FeedItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly initials = initials;

  constructor() {
    this.feedService.list().subscribe({
      next: (items) => {
        this.items.set(items);
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
