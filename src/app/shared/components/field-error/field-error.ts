import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { EMPTY, switchMap } from 'rxjs';

interface ErrorMessage {
  key: string;
  params: Record<string, unknown>;
}

@Component({
  selector: 'app-field-error',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (message(); as error) {
      <p class="field-error">{{ error.key | translate: error.params }}</p>
    }
  `,
})
export class FieldError {
  readonly control = input.required<AbstractControl | null>();

  readonly submitted = input(false);

  private readonly controlEvents = toSignal(
    toObservable(this.control).pipe(switchMap((control) => control?.events ?? EMPTY)),
    { initialValue: null },
  );

  protected readonly message = computed<ErrorMessage | null>(() => {
    this.controlEvents();
    const control = this.control();

    if (!control || !control.errors || (!control.touched && !this.submitted())) {
      return null;
    }
    return firstMessage(control.errors);
  });
}

function firstMessage(errors: Record<string, unknown>): ErrorMessage | null {
  if (errors['required']) {
    return { key: 'validation.required', params: {} };
  }
  if (errors['email']) {
    return { key: 'validation.email', params: {} };
  }
  if (errors['minlength']) {
    const detail = errors['minlength'] as { requiredLength: number };
    return { key: 'validation.minlength', params: { min: detail.requiredLength } };
  }
  if (errors['maxlength']) {
    const detail = errors['maxlength'] as { requiredLength: number };
    return { key: 'validation.maxlength', params: { max: detail.requiredLength } };
  }
  if (errors['min']) {
    const detail = errors['min'] as { min: number };
    return { key: 'validation.min', params: { min: detail.min } };
  }
  if (errors['pattern']) {
    return { key: 'validation.url', params: {} };
  }
  if (errors['dateRange']) {
    return { key: 'validation.dateRange', params: {} };
  }
  if (errors['mismatch']) {
    return { key: 'validation.mismatch', params: {} };
  }
  if (errors['aliasFormat']) {
    return { key: 'validation.aliasFormat', params: {} };
  }
  if (typeof errors['server'] === 'string') {
    return { key: errors['server'], params: {} };
  }
  return { key: 'errors.unexpected', params: {} };
}
