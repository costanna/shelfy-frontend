import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';

// Segunda red de seguridad para que Render no duerma el backend: el GitHub
// Action (.github/workflows/keep-alive.yml) es la vía principal, pero el
// "schedule" de GitHub Actions es best-effort, no un cron garantizado, y
// puede tardar en dispararse por su cuenta o saltarse algún ciclo. Mientras
// alguien tenga la app abierta, un ping ligero de vez en cuando complementa
// eso sin depender de GitHub en absoluto — eso sí, solo ayuda si hay alguien
// con la app abierta; de madrugada sin nadie usándola, sigue dependiendo del
// GitHub Action o de un pinger externo.
const PING_INTERVAL_MS = 10 * 60 * 1000;
const HEALTH_URL = `${environment.apiUrl.replace(/\/api\/?$/, '')}/actuator/health`;

@Injectable({ providedIn: 'root' })
export class BackendKeepAliveService {
  constructor() {
    if (!environment.production) {
      return;
    }
    this.ping();
    setInterval(() => {
      // Sense pestanya visible no cal gastar bateria ni dades.
      if (document.hidden) {
        return;
      }
      this.ping();
    }, PING_INTERVAL_MS);
  }

  private ping(): void {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
      return;
    }
    fetch(HEALTH_URL).catch(() => {});
  }
}
