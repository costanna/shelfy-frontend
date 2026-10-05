import { Injectable, signal } from '@angular/core';

import { tryGetLocalStorage, trySetLocalStorage } from '../util/local-storage';

const STORAGE_KEY = 'shelfy.recommendations-hidden';

@Injectable({ providedIn: 'root' })
export class RecommendationsVisibilityService {
  readonly hidden = signal(tryGetLocalStorage(STORAGE_KEY) === '1');

  hide(): void {
    this.hidden.set(true);
    trySetLocalStorage(STORAGE_KEY, '1');
  }

  show(): void {
    this.hidden.set(false);
    trySetLocalStorage(STORAGE_KEY, '0');
  }
}
