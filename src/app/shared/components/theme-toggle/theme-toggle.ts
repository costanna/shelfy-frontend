import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="btn btn-ghost btn-icon"
      [attr.aria-label]="'nav.theme' | translate"
      [attr.aria-pressed]="isDark()"
      [title]="'nav.theme' | translate"
      (click)="toggle()"
    >
      <span aria-hidden="true">{{ isDark() ? '☀️' : '🌙' }}</span>
    </button>
  `,
})
export class ThemeToggle {
  private readonly themeService = inject(ThemeService);
  private readonly auth = inject(AuthService);

  protected readonly isDark = computed(() => this.themeService.theme() === 'DARK');

  protected toggle(): void {
    const next = this.themeService.toggle();

    if (this.auth.isLoggedIn()) {
      this.auth.savePreferences({ themePreference: next }).subscribe({
        error: () => undefined,
      });
    }
  }
}
