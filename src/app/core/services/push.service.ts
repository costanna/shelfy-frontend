import { HttpClient, HttpParams } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { SwPush } from '@angular/service-worker';
import { Observable, from, map, of, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ToastService } from './toast.service';

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
}

@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly http = inject(HttpClient);
  private readonly swPush = inject(SwPush, { optional: true });
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly enabled = signal(false);

  private readonly baseUrl = `${environment.apiUrl}/push`;

  get available(): boolean {
    return !!this.swPush?.isEnabled && !!environment.pushVapidPublicKey;
  }

  /** Escolta push entrants amb l'app oberta: toast + navegació a la URL. */
  startListening(): void {
    if (!this.swPush) {
      return;
    }
    this.swPush.messages.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((message) => {
      const payload = message as PushPayload;
      if (payload?.body) {
        this.toast.success(payload.body);
      }
      if (payload?.url) {
        this.router.navigateByUrl(payload.url).catch(() => undefined);
      }
    });
  }

  check(): Observable<boolean> {
    if (!this.available || !this.swPush) {
      return of(false);
    }
    return this.swPush.subscription.pipe(map((sub) => !!sub));
  }

  subscribe(): Observable<unknown> {
    if (!this.swPush) {
      return of(null);
    }
    return from(
      this.swPush.requestSubscription({
        serverPublicKey: environment.pushVapidPublicKey,
      }),
    ).pipe(
      switchMap((sub) =>
        this.http.post(`${this.baseUrl}/subscriptions`, {
          endpoint: sub.endpoint,
          p256dh: arrayBufferToBase64(sub.getKey('p256dh')),
          auth: arrayBufferToBase64(sub.getKey('auth')),
        }),
      ),
    );
  }

  unsubscribe(): Observable<unknown> {
    if (!this.swPush) {
      return of(null);
    }
    return from(this.swPush.subscription).pipe(
      switchMap((sub) => {
        if (!sub) {
          return of(null);
        }
        const endpoint = sub.endpoint;
        return from(sub.unsubscribe()).pipe(
          switchMap(() =>
            this.http.delete(`${this.baseUrl}/subscriptions`, {
              params: new HttpParams().set('endpoint', endpoint),
            }),
          ),
        );
      }),
    );
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) {
    return '';
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
