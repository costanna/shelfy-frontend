import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import { UserSummary } from '../../../core/models/social.model';
import { FollowService } from '../../../core/services/follow.service';
import { ToastService } from '../../../core/services/toast.service';
import { avatarUrl, initials } from '../../../core/util/avatar-url';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { Spinner } from '../../../shared/components/spinner/spinner';

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-people-search-page',
  imports: [RouterLink, TranslatePipe, EmptyState, Spinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './people-search.page.html',
  styleUrl: './people-search.page.scss',
})
export class PeopleSearchPage {
  private readonly followService = inject(FollowService);
  private readonly toast = inject(ToastService);

  private readonly queries = new Subject<string>();

  protected readonly query = signal('');
  protected readonly users = signal<UserSummary[]>([]);
  protected readonly loading = signal(false);
  protected readonly searched = signal(false);
  protected readonly togglingId = signal<number | null>(null);

  constructor() {
    this.queries
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((q) => {
          if (!q) {
            return of<UserSummary[]>([]);
          }
          this.loading.set(true);
          return this.followService.search(q).pipe(catchError(() => of<UserSummary[]>([])));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        this.users.set(results);
        this.loading.set(false);
        this.searched.set(this.query().trim() !== '');
      });
  }

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.queries.next(value.trim());
  }

  protected toggleFollow(user: UserSummary): void {
    if (this.togglingId() !== null) {
      return;
    }
    this.togglingId.set(user.id);

    const request = user.followedByMe
      ? this.followService.unfollow(user.id)
      : this.followService.follow(user.id);

    request.subscribe({
      next: () => {
        this.users.update((list) =>
          list.map((item) =>
            item.id === user.id
              ? {
                  ...item,
                  followedByMe: !item.followedByMe,
                  followersCount: item.followersCount + (item.followedByMe ? -1 : 1),
                }
              : item,
          ),
        );
        this.togglingId.set(null);
        this.toast.success(user.followedByMe ? 'people.unfollowed' : 'people.followed');
      },
      error: () => this.togglingId.set(null),
    });
  }

  protected readonly initials = initials;

  protected avatarSrc(user: UserSummary): string | null {
    return avatarUrl(user.id, user.avatarUpdatedAt);
  }
}
