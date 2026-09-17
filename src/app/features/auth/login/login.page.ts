import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldError } from '../../../shared/components/field-error/field-error';
import { PasswordToggle } from '../../../shared/components/password-toggle/password-toggle';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, FieldError, PasswordToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.page.html',
  styleUrl: '../auth-card.scss',
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly slowStart = signal(false);
  protected readonly showPassword = signal(false);

  // ⚠️ VERIFICACIÓN POR EMAIL DESACTIVADA — NO BORRAR esta señal ni el botón
  // de "reenviar verificación" en login.page.html. El backend (AuthService.java)
  // tiene la verificación forzada a false mientras el envío de emails no
  // funcione, así que login nunca debería devolver 403 por esta causa y este
  // bloque queda inerte. Se deja tal cual para poder reactivarlo sin rehacer
  // la UI el día que se reactive la verificación en el backend.
  protected readonly unverifiedEmail = signal<string | null>(null);
  protected readonly resendingVerification = signal(false);

  protected submit(): void {
    this.submitted.set(true);
    this.serverError.set(null);
    this.unverifiedEmail.set(null);

    if (this.form.invalid || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.slowStart.set(false);

    const warmupTimer = setTimeout(() => this.slowStart.set(true), 4000);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        clearTimeout(warmupTimer);
        void this.router.navigate(['/books']);
      },
      error: (error: HttpErrorResponse) => {
        clearTimeout(warmupTimer);
        this.submitting.set(false);
        this.slowStart.set(false);
        this.serverError.set(errorMessage(error));

        if (error.status === 403) {
          this.unverifiedEmail.set(this.form.controls.email.value);
        }
      },
    });
  }

  protected resendVerification(): void {
    const email = this.unverifiedEmail();
    if (!email || this.resendingVerification()) {
      return;
    }
    this.resendingVerification.set(true);

    this.auth.resendVerification(email).subscribe({
      next: () => {
        this.resendingVerification.set(false);
        this.toast.success('auth.resendSent');
      },
      error: () => this.resendingVerification.set(false),
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
