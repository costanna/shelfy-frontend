import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
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
import { FieldError } from '../../shared/components/field-error/field-error';

const THEME_OPTIONS: readonly ThemePreference[] = ['LIGHT', 'DARK', 'SYSTEM'];
const ALIAS_PATTERN = /^[a-zA-Z0-9_]+$/;

@Component({
  selector: 'app-settings-page',
  imports: [ReactiveFormsModule, TranslatePipe, FieldError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
})
export class SettingsPage {
  private readonly formBuilder = inject(FormBuilder);
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

  protected readonly aliasForm = this.formBuilder.nonNullable.group({
    alias: [
      '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(24), aliasFormatValidator],
    ],
  });

  protected readonly savingAlias = signal(false);
  protected readonly aliasSubmitted = signal(false);

  constructor() {
    effect(() => {
      const alias = this.user()?.alias;
      if (alias && !this.aliasForm.controls.alias.dirty) {
        this.aliasForm.controls.alias.setValue(alias);
      }
    });
  }

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

  protected saveAlias(): void {
    this.aliasSubmitted.set(true);

    if (this.aliasForm.invalid || this.savingAlias()) {
      return;
    }
    this.savingAlias.set(true);

    this.auth.updateAlias(this.aliasForm.controls.alias.value).subscribe({
      next: () => {
        this.savingAlias.set(false);
        this.aliasForm.controls.alias.markAsPristine();
        this.toast.success('settings.aliasSaved');
      },
      error: (error: HttpErrorResponse) => {
        this.savingAlias.set(false);
        this.aliasForm.controls.alias.setErrors({ server: aliasErrorMessage(error) });
      },
    });
  }

  private savePreferences(preferences: {
    themePreference?: ThemePreference;
    languagePreference?: Language;
  }): void {
    this.auth.savePreferences(preferences).subscribe({
      next: () => this.toast.success('settings.saved'),
      error: () => undefined,
    });
  }
}

function aliasFormatValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  return !value || ALIAS_PATTERN.test(value) ? null : { aliasFormat: true };
}

function aliasErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'errors.network';
  }
  const fieldErrors: unknown = error.error?.fieldErrors;
  if (fieldErrors && typeof fieldErrors === 'object' && 'alias' in fieldErrors) {
    const message = (fieldErrors as Record<string, unknown>)['alias'];
    if (typeof message === 'string') {
      return message;
    }
  }
  const apiMessage: unknown = error.error?.message;
  return typeof apiMessage === 'string' ? apiMessage : 'errors.unexpected';
}
