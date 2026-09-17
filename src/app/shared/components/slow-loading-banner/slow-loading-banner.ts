import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-slow-loading-banner',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './slow-loading-banner.html',
  styleUrl: './slow-loading-banner.scss',
})
export class SlowLoadingBanner {
  private readonly loading = inject(LoadingService);

  protected readonly slow = this.loading.slow;
}
