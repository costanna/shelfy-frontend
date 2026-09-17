import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LoadingService } from '../services/loading.service';

/**
 * Tracks in-flight requests to our own API so LoadingService can warn the user
 * when the free-tier backend is slow to respond (e.g. waking up from sleep).
 * Third-party calls (Google Books, i18n assets, ...) are ignored.
 */
export const loadingInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(environment.apiUrl)) {
    return next(request);
  }

  const loading = inject(LoadingService);
  loading.start();

  return next(request).pipe(finalize(() => loading.stop()));
};
