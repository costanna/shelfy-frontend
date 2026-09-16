import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-password-toggle',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './password-toggle.html',
  styleUrl: './password-toggle.scss',
})
export class PasswordToggle {
  readonly visible = input(false);

  readonly toggled = output<void>();
}
