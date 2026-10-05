import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { tryGetLocalStorage, trySetLocalStorage } from '../../../core/util/local-storage';

const DISMISSED_KEY = 'shelfy.install-card-dismissed';

@Component({
  selector: 'app-install-app-card',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './install-app-card.html',
  styleUrl: './install-app-card.scss',
})
export class InstallAppCard {
  protected readonly dismissed = signal(isDismissed() || isRunningStandalone());

  protected dismiss(): void {
    this.dismissed.set(true);
    trySetLocalStorage(DISMISSED_KEY, '1');
  }
}

function isDismissed(): boolean {
  return tryGetLocalStorage(DISMISSED_KEY) === '1';
}

/** No tiene sentido ofrecer instalar la app a quien ya la abrió instalada. */
function isRunningStandalone(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}
