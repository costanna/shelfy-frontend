import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { ChunkErrorHandler, RELOAD_GUARD_KEY } from './core/services/chunk-error-handler';
import { InstallPromptService } from './core/services/install-prompt.service';
import { LanguageService } from './core/services/language.service';
import { ThemeService } from './core/services/theme.service';
import { UpdateService } from './core/services/update.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: ChunkErrorHandler },

    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),

    provideHttpClient(withInterceptors([loadingInterceptor, authInterceptor, errorInterceptor])),

    provideTranslateService({
      fallbackLang: 'es',
      loader: provideTranslateHttpLoader({
        prefix: './assets/i18n/',
        suffix: '.json',
      }),
    }),

    provideAppInitializer(() => {
      // Reaching here means the current bundle loaded fine: let a later chunk
      // failure (a new deploy, not this one persisting) try to recover again.
      sessionStorage.removeItem(RELOAD_GUARD_KEY);
      inject(ThemeService);
      inject(LanguageService).init();
      inject(UpdateService);
      inject(InstallPromptService);
    }),

    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
