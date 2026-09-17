import { Injectable, signal } from '@angular/core';

const SLOW_THRESHOLD_MS = 4000;

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private pending = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly slow = signal(false);

  start(): void {
    this.pending++;
    if (this.pending === 1) {
      this.timer = setTimeout(() => this.slow.set(true), SLOW_THRESHOLD_MS);
    }
  }

  stop(): void {
    this.pending = Math.max(0, this.pending - 1);
    if (this.pending === 0) {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      this.slow.set(false);
    }
  }
}
