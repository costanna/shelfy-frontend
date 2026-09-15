import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from './core/services/auth.service';
import { LanguageService } from './core/services/language.service';
import { ThemeService } from './core/services/theme.service';
import { Header } from './layout/header/header';
import { ToastHost } from './shared/components/toast-host/toast-host';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, ToastHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);
  private readonly language = inject(LanguageService);

  /**
   * Solo se aplican tema/idioma del usuario UNA VEZ por sesión (cuando
   * cambia el id, es decir login/logout), no cada vez que el objeto user
   * cambia de referencia. Si no, un guardado de preferencias lento (backend
   * despertando en Render) podía volver a través de este efecto DESPUÉS de
   * que el usuario ya hubiera elegido otra cosa distinta en Ajustes,
   * pisando el cambio más reciente con la respuesta más antigua.
   */
  private syncedUserId: number | null = null;

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (!user) {
        this.syncedUserId = null;
        return;
      }
      if (user.id === this.syncedUserId) {
        return;
      }

      this.syncedUserId = user.id;
      this.theme.set(user.themePreference);
      this.language.use(user.languagePreference);
    });
  }
}
