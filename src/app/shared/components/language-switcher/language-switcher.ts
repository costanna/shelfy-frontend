import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { Language } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import {
  LANGUAGE_LABELS,
  LanguageService,
  SUPPORTED_LANGUAGES,
} from '../../../core/services/language.service';

@Component({
  selector: 'app-language-switcher',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="visually-hidden" for="language-select">{{ 'nav.language' | translate }}</label>
    <select
      id="language-select"
      class="select language-select"
      [value]="current()"
      (change)="onChange($event)"
    >
      @for (language of languages; track language) {
        <option [value]="language">{{ labels[language] }}</option>
      }
    </select>
  `,
  styles: `
    .language-select {
      width: auto;
      min-height: 44px;
      padding-block: 0.375rem;
      font-size: 0.875rem;
    }
  `,
})
export class LanguageSwitcher {
  private readonly languageService = inject(LanguageService);
  private readonly auth = inject(AuthService);

  protected readonly languages = SUPPORTED_LANGUAGES;
  protected readonly labels = LANGUAGE_LABELS;
  protected readonly current = this.languageService.language;

  protected onChange(event: Event): void {
    const language = (event.target as HTMLSelectElement).value as Language;
    this.languageService.use(language);

    if (this.auth.isLoggedIn()) {
      this.auth.savePreferences({ languagePreference: language }).subscribe({
        error: () => undefined,
      });
    }
  }
}
