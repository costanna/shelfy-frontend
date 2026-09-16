import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthService } from '../../../core/services/auth.service';
import { FieldError } from '../../../shared/components/field-error/field-error';
import { PasswordToggle } from '../../../shared/components/password-toggle/password-toggle';

@Component({
  selector: 'app-reset-password-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, FieldError, PasswordToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reset-password.page.html',
  styleUrl: '../auth-card.scss',
})
export class ResetPasswordPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly token = input<string>();

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [passwordsMatchValidator] },
  );

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly done = signal(false);
  protected readonly showNewPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);

  protected submit(): void {
    this.submitted.set(true);
    this.serverError.set(null);

    const token = this.token();
    if (this.form.invalid || this.submitting() || !token) {
      return;
    }
    this.submitting.set(true);

    this.auth.resetPassword(token, this.form.controls.newPassword.value).subscribe({
      next: () => {
        this.submitting.set(false);
        this.done.set(true);
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.serverError.set(errorMessage(error));
      },
    });
  }
}

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('newPassword')?.value as string;
  const confirmPassword = group.get('confirmPassword')?.value as string;
  const confirmControl = group.get('confirmPassword');

  if (confirmPassword && newPassword !== confirmPassword) {
    confirmControl?.setErrors({ ...confirmControl.errors, mismatch: true });
  } else if (confirmControl?.hasError('mismatch')) {
    const { mismatch, ...rest } = confirmControl.errors ?? {};
    confirmControl.setErrors(Object.keys(rest).length > 0 ? rest : null);
  }

  return null;
}

function errorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'errors.network';
  }
  const apiMessage: unknown = error.error?.message;
  return typeof apiMessage === 'string' ? apiMessage : 'errors.unexpected';
}
