import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

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

  constructor() {
    effect(() => this.load(Number(this.id())));
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
        this.load(current.id);
      },
      error: () => this.toggling.set(false),
    });
  }

  private load(id: number): void {
    this.loading.set(true);

    this.followService.profile(id).subscribe({
      next: (profile) => {
        this.profile.set(profile);
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
