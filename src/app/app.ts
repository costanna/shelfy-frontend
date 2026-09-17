import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from './core/services/auth.service';
import { LanguageService } from './core/services/language.service';
import { ThemeService } from './core/services/theme.service';
import { Footer } from './layout/footer/footer';
import { Header } from './layout/header/header';
import { SlowLoadingBanner } from './shared/components/slow-loading-banner/slow-loading-banner';
import { ToastHost } from './shared/components/toast-host/toast-host';

const SYNCED_USER_KEY = 'shelfy.synced-preferences-user-id';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, ToastHost, SlowLoadingBanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);
  private readonly language = inject(LanguageService);

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (!user) {
        localStorage.removeItem(SYNCED_USER_KEY);
        return;
      }
      if (localStorage.getItem(SYNCED_USER_KEY) === String(user.id)) {
        return;
      }

      localStorage.setItem(SYNCED_USER_KEY, String(user.id));
      this.theme.set(user.themePreference);
      this.language.use(user.languagePreference);
    });
  }
}
