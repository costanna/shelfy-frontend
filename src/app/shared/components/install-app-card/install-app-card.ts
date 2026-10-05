import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { InstallPromptService } from '../../../core/services/install-prompt.service';
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
  private readonly installPrompt = inject(InstallPromptService);

  protected readonly dismissed = signal(isDismissed());
  protected readonly installed = this.installPrompt.installed;
  // En Chrome/Edge de escritorio también puede dispararse: si es así, un
  // botón para instalar directamente ahí es mejor que obligar a sacar el
  // móvil para escanear el QR.
  protected readonly canInstallDirectly = this.installPrompt.available;

  protected dismiss(): void {
    this.dismissed.set(true);
    trySetLocalStorage(DISMISSED_KEY, '1');
  }

  protected install(): void {
    void this.installPrompt.promptInstall();
  }
}

function isDismissed(): boolean {
  return tryGetLocalStorage(DISMISSED_KEY) === '1';
}
