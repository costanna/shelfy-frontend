import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

// Sin esto, el service worker instala en segundo plano la versión nueva de
// cada deploy pero sigue sirviendo la antigua hasta que el navegador decida
// por su cuenta recargarla (a veces hacen falta dos recargas) — cualquier
// función nueva podía quedar "invisible" para quien ya tenía la app abierta
// o instalada, sin ningún aviso de por qué.
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly swUpdate = inject(SwUpdate);

  readonly updateReady = signal(false);

  constructor() {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.swUpdate.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => this.updateReady.set(true));

    setInterval(() => void this.swUpdate.checkForUpdate(), CHECK_INTERVAL_MS);
  }

  reload(): void {
    document.location.reload();
  }
}
