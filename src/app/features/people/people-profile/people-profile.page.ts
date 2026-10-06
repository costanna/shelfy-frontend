import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, map, of, switchMap } from 'rxjs';

import { UserProfile } from '../../../core/models/social.model';
import { FollowService } from '../../../core/services/follow.service';
import { ToastService } from '../../../core/services/toast.service';
import { avatarUrl, initials } from '../../../core/util/avatar-url';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { Spinner } from '../../../shared/components/spinner/spinner';
import { StarRating } from '../../../shared/components/star-rating/star-rating';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-people-profile-page',
  imports: [RouterLink, TranslatePipe, DatePipe, EmptyState, Spinner, StatusBadge, StarRating],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './people-profile.page.html',
  styleUrl: './people-profile.page.scss',
})
export class PeopleProfilePage {
  private readonly followService = inject(FollowService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly toggling = signal(false);
  protected readonly loadingMoreBooks = signal(false);
  protected readonly booksExtraPage = signal(5);
  protected readonly booksLast = signal(false);

  constructor() {
    toObservable(this.id)
      .pipe(
        switchMap((id) => {
          this.loading.set(true);
          return this.followService.profile(Number(id)).pipe(
            map((profile) => ({ ok: true as const, profile })),
            catchError(() => of({ ok: false as const, profile: null })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (!result.ok || !result.profile) {
          this.loading.set(false);
          this.toggling.set(false);
          void this.router.navigate(['/people']);
          return;
        }
        this.profile.set(result.profile);
        this.booksExtraPage.set(5);
        this.booksLast.set(result.profile.books.length < 100);
        this.loading.set(false);
        this.toggling.set(false);
      });
  }

  protected loadMoreBooks(): void {
    const current = this.profile();
    if (!current || this.loadingMoreBooks() || this.booksLast()) {
      return;
    }
    this.loadingMoreBooks.set(true);
    const page = this.booksExtraPage();
    this.followService.profileBooks(current.id, page, 20).subscribe({
      next: (result) => {
        this.profile.update((prev) =>
          prev ? { ...prev, books: [...prev.books, ...result.content] } : prev,
        );
        this.booksExtraPage.set(page + 1);
        this.booksLast.set(result.last || result.content.length === 0);
        this.loadingMoreBooks.set(false);
      },
      error: () => this.loadingMoreBooks.set(false),
    });
  }

  protected readonly initials = initials;

  protected readonly avatarSrc = computed(() => {
    const account = this.profile();
    return account ? avatarUrl(account.id, account.avatarUpdatedAt) : null;
  });

  protected toggleFollow(): void {
    const current = this.profile();
    if (!current || this.toggling()) {
      return;
    }
    this.toggling.set(true);

    const request = current.followedByMe
      ? this.followService.unfollow(current.id)
      : this.followService.follow(current.id);

    request.subscribe({
      next: () => {
        this.toast.success(current.followedByMe ? 'people.unfollowed' : 'people.followed');
        this.reload(current.id);
      },
      error: () => this.toggling.set(false),
    });
  }

  private reload(id: number): void {
    this.loading.set(true);

    this.followService.profile(id).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.booksExtraPage.set(5);
        this.booksLast.set(profile.books.length < 100);
        this.loading.set(false);
        this.toggling.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toggling.set(false);
        void this.router.navigate(['/people']);
      },
    });
  }
}
