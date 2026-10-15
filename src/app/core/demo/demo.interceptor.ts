import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, delay, from, mergeMap, of, throwError, timer } from 'rxjs';

import { environment } from '../../../environments/environment';
import { isDemoChosen } from './demo';
import { DemoApiError, handleDemoRequest } from './demo-server';

/** Prou latència perquè es vegin els estats de càrrega de l'app, com amb un servidor de veritat. */
const DEMO_LATENCY_MS = 150;
const AVATAR_SIZE = 256;

function toHttpError(error: DemoApiError, req: HttpRequest<unknown>): HttpErrorResponse {
  return new HttpErrorResponse({
    status: error.status,
    url: req.url,
    // La mateixa forma que ApiError del backend: la UI llegeix error.error.message.
    error: {
      timestamp: new Date().toISOString(),
      status: error.status,
      error: 'Error',
      message: error.message,
      fieldErrors: null,
    },
  });
}

/** Redueix la foto a 256 px abans de desar-la: el localStorage té poc espai. */
async function avatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, AVATAR_SIZE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

/** Els formularis multipart (avatar, importació CSV) es converteixen en dades que la demo pot desar. */
async function readBody(path: string, body: unknown): Promise<unknown> {
  if (!(body instanceof FormData)) return body;
  const file = body.get('file');
  if (!(file instanceof File)) return {};
  if (path === '/users/me/avatar') return { dataUrl: await avatarDataUrl(file) };
  if (path === '/books/import') return { csv: await file.text() };
  return {};
}

function answer(
  req: HttpRequest<unknown>,
  path: string,
  params: URLSearchParams,
  body: unknown,
  token: string | null,
): Observable<HttpResponse<unknown>> {
  try {
    const { status, body: responseBody } = handleDemoRequest({
      method: req.method,
      path,
      params,
      body,
      token,
    });
    return of(new HttpResponse({ status, body: responseBody, url: req.url })).pipe(
      delay(DEMO_LATENCY_MS),
    );
  } catch (error) {
    if (!(error instanceof DemoApiError)) return throwError(() => error);
    return timer(DEMO_LATENCY_MS).pipe(mergeMap(() => throwError(() => toHttpError(error, req))));
  }
}

/**
 * A la demo al navegador, respon les crides a l'API dins del navegador (vegeu demo-server.ts) en
 * comptes d'enviar-les: el backend no rep res, ni es desperta. Va l'últim de la cadena perquè la
 * resta d'interceptors (càrrega, sessió, errors) tractin aquestes respostes com les del servidor.
 */
export const demoInterceptor: HttpInterceptorFn = (req, next) => {
  const base = environment.apiUrl;
  if (!isDemoChosen() || !req.url.startsWith(base)) {
    return next(req);
  }
  const [path, query = ''] = req.url.slice(base.length).split('?');
  const params = new URLSearchParams(query);
  for (const key of req.params.keys()) {
    params.set(key, req.params.get(key) ?? '');
  }
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? null;

  if (req.body instanceof FormData) {
    return from(readBody(path, req.body)).pipe(
      mergeMap((body) => answer(req, path, params, body, token)),
    );
  }
  return answer(req, path, params, req.body, token);
};
