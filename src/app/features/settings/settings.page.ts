import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { BookImportResult } from '../../core/models/book.model';
import { Language, ThemePreference } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { BookService } from '../../core/services/book.service';
import {
  LANGUAGE_LABELS,
  LanguageService,
  SUPPORTED_LANGUAGES,
} from '../../core/services/language.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { avatarUrl, initials } from '../../core/util/avatar-url';
import { FieldError } from '../../shared/components/field-error/field-error';

const THEME_OPTIONS: readonly ThemePreference[] = ['LIGHT', 'DARK', 'SYSTEM'];
const ALIAS_PATTERN = /^[a-zA-Z0-9_]+$/;
const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

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
  private readonly bookService = inject(BookService);

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
  protected readonly uploadingAvatar = signal(false);
  protected readonly exportingLibrary = signal(false);
  protected readonly importingLibrary = signal(false);
  protected readonly importResult = signal<BookImportResult | null>(null);

  protected readonly deleteAccountOpen = signal(false);
  protected readonly deletingAccount = signal(false);
  protected readonly deleteAccountSubmitted = signal(false);

  protected readonly deleteAccountForm = this.formBuilder.nonNullable.group({
    password: ['', [Validators.required]],
  });

  protected readonly avatarSrc = computed(() => {
    const account = this.user();
    return account ? avatarUrl(account.id, account.avatarUpdatedAt) : null;
  });

  protected readonly avatarInitials = computed(() => initials(this.user()?.name ?? ''));

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

  protected onRemindersToggle(event: Event): void {
    const remindersEnabled = (event.target as HTMLInputElement).checked;
    this.savePreferences({ remindersEnabled });
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
        this.aliasForm.controls.alias.setErrors({ server: apiErrorMessage(error, 'alias') });
      },
    });
  }

  protected onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';

    if (!file || this.uploadingAvatar()) {
      return;
    }
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      this.toast.error('settings.avatarBadType');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      this.toast.error('settings.avatarTooLarge');
      return;
    }

    this.uploadingAvatar.set(true);
    this.auth.uploadAvatar(file).subscribe({
      next: () => {
        this.uploadingAvatar.set(false);
        this.toast.success('settings.avatarSaved');
      },
      error: () => this.uploadingAvatar.set(false),
    });
  }

  protected removeAvatar(): void {
    if (this.uploadingAvatar()) {
      return;
    }
    this.uploadingAvatar.set(true);

    this.auth.removeAvatar().subscribe({
      next: () => {
        this.uploadingAvatar.set(false);
        this.toast.success('settings.avatarRemoved');
      },
      error: () => this.uploadingAvatar.set(false),
    });
  }

  protected exportLibrary(): void {
    if (this.exportingLibrary()) {
      return;
    }
    this.exportingLibrary.set(true);

    this.bookService.exportCsv().subscribe({
      next: (blob) => {
        this.exportingLibrary.set(false);
        downloadBlob(blob, 'shelfy-biblioteca.csv');
      },
      error: () => this.exportingLibrary.set(false),
    });
  }

  protected onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';

    if (!file || this.importingLibrary()) {
      return;
    }
    this.importingLibrary.set(true);
    this.importResult.set(null);

    this.bookService.importCsv(file).subscribe({
      next: (result) => {
        this.importingLibrary.set(false);
        this.importResult.set(result);
        if (result.imported > 0) {
          this.toast.success('settings.importSuccess');
        }
      },
      error: () => this.importingLibrary.set(false),
    });
  }

  protected openDeleteAccount(): void {
    this.deleteAccountForm.reset({ password: '' });
    this.deleteAccountSubmitted.set(false);
    this.deleteAccountOpen.set(true);
  }

  protected cancelDeleteAccount(): void {
    this.deleteAccountOpen.set(false);
  }

  protected confirmDeleteAccount(): void {
    this.deleteAccountSubmitted.set(true);

    if (this.deleteAccountForm.invalid || this.deletingAccount()) {
      return;
    }
    this.deletingAccount.set(true);

    this.auth.deleteAccount(this.deleteAccountForm.controls.password.value).subscribe({
      next: () => this.toast.success('settings.accountDeleted'),
      error: (error: HttpErrorResponse) => {
        this.deletingAccount.set(false);
        this.deleteAccountForm.controls.password.setErrors({ server: apiErrorMessage(error, 'password') });
      },
    });
  }

  private savePreferences(preferences: {
    themePreference?: ThemePreference;
    languagePreference?: Language;
    remindersEnabled?: boolean;
  }): void {
    this.auth.savePreferences(preferences).subscribe({
      next: () => this.toast.success('settings.saved'),
      error: () => undefined,
    });
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function aliasFormatValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  return !value || ALIAS_PATTERN.test(value) ? null : { aliasFormat: true };
}

function apiErrorMessage(error: HttpErrorResponse, fieldName: string): string {
  if (error.status === 0) {
    return 'errors.network';
  }
  const fieldErrors: unknown = error.error?.fieldErrors;
  if (fieldErrors && typeof fieldErrors === 'object' && fieldName in fieldErrors) {
    const message = (fieldErrors as Record<string, unknown>)[fieldName];
    if (typeof message === 'string') {
      return message;
    }
  }
  const apiMessage: unknown = error.error?.message;
  return typeof apiMessage === 'string' ? apiMessage : 'errors.unexpected';
}
