import { Injectable, inject, signal } from '@angular/core';

import type { BookRequest } from '../models/book.model';
import { BookService } from './book.service';
import { ToastService } from './toast.service';
import { tryGetLocalStorage, trySetLocalStorage } from '../util/local-storage';
import { firstValueFrom } from 'rxjs';

export type QueuedOp =
  | { id: string; op: 'create-book'; payload: BookRequest; createdAt: number }
  | { id: string; op: 'update-progress'; payload: { bookId: number; currentPage: number }; createdAt: number };

const STORAGE_KEY = 'shelfy.offline-queue';

/**
 * Cua d'escriptures offline: crear llibres i avançar pàgines sense xarxa.
 * Es desa a localStorage i es buida (en ordre) quan torna la connexió.
 */
@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  private readonly bookService = inject(BookService);
  private readonly toast = inject(ToastService);

  private readonly items = signal<QueuedOp[]>(readStored());
  readonly pending = this.items.asReadonly();

  private flushing = false;

  enqueue(op: Omit<QueuedOp, 'id' | 'createdAt'>): void {
    const entry = { ...op, id: crypto.randomUUID(), createdAt: Date.now() } as QueuedOp;
    this.items.update((list) => [...list, entry]);
    this.persist();
  }

  async flush(): Promise<void> {
    if (this.flushing || !navigator.onLine || this.items().length === 0) {
      return;
    }
    this.flushing = true;
    try {
      for (const entry of [...this.items()]) {
        try {
          if (entry.op === 'create-book') {
            await firstValueFrom(this.bookService.create(entry.payload));
          } else {
            await firstValueFrom(
              this.bookService.updateProgress(entry.payload.bookId, {
                currentPage: entry.payload.currentPage,
              }),
            );
          }
          this.items.update((list) => list.filter((item) => item.id !== entry.id));
          this.persist();
        } catch {
          // Atura la cua al primer error: la resta s'intenta més tard.
          break;
        }
      }
      if (this.items().length === 0) {
        this.toast.success('offline.synced');
      }
    } finally {
      this.flushing = false;
    }
  }

  private persist(): void {
    trySetLocalStorage(STORAGE_KEY, JSON.stringify(this.items()));
  }
}

function readStored(): QueuedOp[] {
  const raw = tryGetLocalStorage(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as QueuedOp[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
