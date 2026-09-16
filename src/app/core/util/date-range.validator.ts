import { AbstractControl, ValidationErrors } from '@angular/forms';

export function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const startedAt = group.get('startedAt')?.value as string;
  const finishedAt = group.get('finishedAt')?.value as string;
  const finishedControl = group.get('finishedAt');

  if (startedAt && finishedAt && finishedAt < startedAt) {
    finishedControl?.setErrors({ ...finishedControl.errors, dateRange: true });
  } else if (finishedControl?.hasError('dateRange')) {
    const { dateRange, ...rest } = finishedControl.errors ?? {};
    finishedControl.setErrors(Object.keys(rest).length > 0 ? rest : null);
  }

  return null;
}
