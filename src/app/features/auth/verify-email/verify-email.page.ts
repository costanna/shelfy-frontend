import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthService } from '../../../core/services/auth.service';
import { Spinner } from '../../../shared/components/spinner/spinner';

type Status = 'loading' | 'success' | 'error';

@Component({
  selector: 'app-verify-email-page',
  imports: [RouterLink, TranslatePipe, Spinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './verify-email.page.html',
  styleUrl: '../auth-card.scss',
})
export class VerifyEmailPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly token = input<string>();

  protected readonly status = signal<Status>('loading');
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      const token = this.token();
      if (!token) {
        this.status.set('error');
        this.errorMessage.set('auth.verifyMissingToken');
        return;
      }
      this.verify(token);
    });
  }

  private verify(token: string): void {
    this.auth.verifyEmail(token).subscribe({
      next: () => {
        this.status.set('success');
        setTimeout(() => void this.router.navigate(['/books']), 2000);
      },
      error: (error: HttpErrorResponse) => {
        this.status.set('error');
        this.errorMessage.set(toMessage(error));
      },
    });
  }
}

function toMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'errors.network';
  }
  const apiMessage: unknown = error.error?.message;
  return typeof apiMessage === 'string' ? apiMessage : 'errors.unexpected';
}
