import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-spinner',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="spinner-wrap" role="status">
      <span class="spinner" aria-hidden="true"></span>
      <span class="visually-hidden">{{ 'common.loading' | translate }}</span>
    </div>
  `,
  styleUrl: './spinner.scss',
})
export class Spinner {}
