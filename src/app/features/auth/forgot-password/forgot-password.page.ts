import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthService } from '../../../core/services/auth.service';
import { FieldError } from '../../../shared/components/field-error/field-error';

@Component({
  selector: 'app-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, FieldError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forgot-password.page.html',
  styleUrl: '../auth-card.scss',
})
export class ForgotPasswordPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly sent = signal(false);

  protected submit(): void {
    this.submitted.set(true);
    this.serverError.set(null);

    if (this.form.invalid || this.submitting()) {
      return;
    }
    this.submitting.set(true);

    this.auth.forgotPassword(this.form.controls.email.value).subscribe({
      next: () => {
        this.submitting.set(false);
        this.sent.set(true);
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.serverError.set(errorMessage(error));
      },
    });
  }
}

function errorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'errors.network';
  }
  const apiMessage: unknown = error.error?.message;
  return typeof apiMessage === 'string' ? apiMessage : 'errors.unexpected';
}
