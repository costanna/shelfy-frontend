import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { Language } from '../models/user.model';

const STORAGE_KEY = 'shelfy.lang';

export const SUPPORTED_LANGUAGES: readonly Language[] = ['es', 'ca', 'en'] as const;

export const LANGUAGE_LABELS: Record<Language, string> = {
  es: 'Español',
  ca: 'Català',
  en: 'English',
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly current = signal<Language>(readStoredLanguage());

  readonly language = this.current.asReadonly();

  /** Se llama una vez al arrancar la app, desde app.config.ts. */
  init(): void {
    this.translate.addLangs([...SUPPORTED_LANGUAGES]);
    this.translate.setFallbackLang('es');
    this.use(this.current());
  }

  use(language: Language): void {
    this.current.set(language);
    localStorage.setItem(STORAGE_KEY, language);
    this.translate.use(language);
    document.documentElement.lang = language;
  }
}

function readStoredLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
    return stored;
  }
  const browser = navigator.language.slice(0, 2) as Language;
  return SUPPORTED_LANGUAGES.includes(browser) ? browser : 'es';
}
