import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { initials } from '../../../core/util/avatar-url';

@Component({
  selector: 'app-avatar-initials',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="avatar-initials"
      [style.width.rem]="size()"
      [style.height.rem]="size()"
      [style.fontSize.rem]="size() * 0.3"
      aria-hidden="true"
    >
      {{ initials(name()) }}
    </span>
  `,
  styles: `
    .avatar-initials {
      flex: none;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: var(--primary-soft);
      color: var(--primary);
      font-weight: 700;
    }
  `,
})
export class AvatarInitials {
  readonly name = input.required<string>();
  readonly size = input(2);

  protected readonly initials = initials;
}
