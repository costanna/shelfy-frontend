import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { Language, ThemePreference } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import {
  LANGUAGE_LABELS,
  LanguageService,
  SUPPORTED_LANGUAGES,
} from '../../core/services/language.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';

const THEME_OPTIONS: readonly ThemePreference[] = ['LIGHT', 'DARK', 'SYSTEM'];

/** Pantalla de "Ajustes de usuario": cuenta, tema e idioma, guardados en la cuenta. */
@Component({
  selector: 'app-settings-page',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
})
export class SettingsPage {
  private readonly auth = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly languageService = inject(LanguageService);
  private readonly toast = inject(ToastService);

  protected readonly user = this.auth.user;
  protected readonly theme = this.themeService.theme;
  protected readonly language = this.languageService.language;

  protected readonly themeOptions = THEME_OPTIONS;
  protected readonly languageOptions = SUPPORTED_LANGUAGES;
  protected readonly languageLabels = LANGUAGE_LABELS;

  protected onThemeChange(event: Event): void {
    const theme = (event.target as HTMLSelectElement).value as ThemePreference;
    this.themeService.set(theme);
    this.savePreferences({ themePreference: theme });
  }

  protected onLanguageChange(event: Event): void {
    const language = (event.target as HTMLSelectElement).value as Language;
    this.languageService.use(language);
    this.savePreferences({ languagePreference: language });
  }

  private savePreferences(preferences: {
    themePreference?: ThemePreference;
    languagePreference?: Language;
  }): void {
    this.auth.savePreferences(preferences).subscribe({
      next: () => this.toast.success('settings.saved'),
      // Si falla, el cambio sigue aplicado en local: no merece interrumpir a nadie.
      error: () => undefined,
    });
  }
}
