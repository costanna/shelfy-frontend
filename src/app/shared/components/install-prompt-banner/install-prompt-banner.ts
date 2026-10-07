import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { InstallPromptService } from '../../../core/services/install-prompt.service';
import { tryGetLocalStorage, trySetLocalStorage } from '../../../core/util/local-storage';

const DISMISSED_KEY = 'shelfy.install-banner-dismissed';

@Component({
  selector: 'app-install-prompt-banner',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './install-prompt-banner.html',
  styleUrl: './install-prompt-banner.scss',
})
export class InstallPromptBanner {
  private readonly installPrompt = inject(InstallPromptService);

  protected readonly dismissed = signal(isDismissed());
  protected readonly visible = this.installPrompt.available;

  protected install(): void {
    void this.installPrompt.promptInstall();
  }

  protected dismiss(): void {
    this.dismissed.set(true);
    trySetLocalStorage(DISMISSED_KEY, '1');
  }
}

function isDismissed(): boolean {
  return tryGetLocalStorage(DISMISSED_KEY) === '1';
}
