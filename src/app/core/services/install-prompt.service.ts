import { Injectable, signal } from '@angular/core';

/**
 * Captura el evento nativo "beforeinstallprompt" (Chrome/Edge en Android y
 * escritorio; Safari/iOS y Firefox no lo implementan, ahí no hay forma
 * programática de instalar — solo el paso manual de "Compartir → Añadir a
 * pantalla de inicio"). Sin esto, la única forma de instalar la PWA era
 * encontrar la opción escondida en el menú del navegador: abrir el enlace
 * (o escanear el QR) por sí solo nunca "instala" nada, es solo el primer
 * paso — el navegador decide si ofrece instalar, y cuándo.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

@Injectable({ providedIn: 'root' })
export class InstallPromptService {
  private deferredEvent: BeforeInstallPromptEvent | null = null;

  readonly available = signal(false);
  readonly installed = signal(isRunningStandalone());

  constructor() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredEvent = event as BeforeInstallPromptEvent;
      this.available.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.installed.set(true);
      this.available.set(false);
      this.deferredEvent = null;
    });
  }

  /** El evento capturado solo se puede usar una vez (lo diga o no el
   *  usuario que sí): tanto si acepta como si descarta, después hay que
   *  esperar a que el navegador ofrezca uno nuevo. */
  async promptInstall(): Promise<void> {
    const event = this.deferredEvent;
    if (!event) {
      return;
    }
    this.deferredEvent = null;
    this.available.set(false);
    await event.prompt();
    await event.userChoice;
  }
}

function isRunningStandalone(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}
