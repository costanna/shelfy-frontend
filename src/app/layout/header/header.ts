import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { avatarUrl, initials } from '../../core/util/avatar-url';
import { LanguageSwitcher } from '../../shared/components/language-switcher/language-switcher';
import { NotificationBell } from '../../shared/components/notification-bell/notification-bell';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, TranslatePipe, ThemeToggle, LanguageSwitcher, NotificationBell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly isLoggedIn = this.auth.isLoggedIn;
  protected readonly user = this.auth.user;

  protected readonly avatarSrc = computed(() => {
    const account = this.user();
    return account ? avatarUrl(account.id, account.avatarUpdatedAt) : null;
  });

  protected readonly avatarInitials = computed(() => initials(this.user()?.name ?? ''));

  protected readonly menuOpen = signal(false);

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected logout(): void {
    this.closeMenu();
    this.auth.logout();
    this.toast.success('auth.loggedOut');
  }
}
