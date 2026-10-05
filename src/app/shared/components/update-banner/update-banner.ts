import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { UpdateService } from '../../../core/services/update.service';

@Component({
  selector: 'app-update-banner',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './update-banner.html',
  styleUrl: './update-banner.scss',
})
export class UpdateBanner {
  private readonly update = inject(UpdateService);

  protected readonly ready = this.update.updateReady;

  protected reload(): void {
    this.update.reload();
  }
}
