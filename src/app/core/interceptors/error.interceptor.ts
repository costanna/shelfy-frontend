import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/**
 * Traduce los errores de la API a un aviso legible y cierra la sesión
 * cuando el token deja de ser válido.
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const toast = inject(ToastService);
  const auth = inject(AuthService);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      // En login y registro el propio formulario muestra el error.
      const handledByForm = request.url.includes('/auth/');

      if (error.status === 401 && !handledByForm) {
        auth.logout();
        toast.error('errors.sessionExpired');
      } else if (!handledByForm) {
        toast.error(messageFor(error));
      }

      return throwError(() => error);
    }),
  );
};

function messageFor(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'errors.network';
  }
  const apiMessage: unknown = error.error?.message;
  return typeof apiMessage === 'string' && apiMessage.length > 0 ? apiMessage : 'errors.unexpected';
}
