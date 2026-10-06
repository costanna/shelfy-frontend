import { Injectable, signal } from '@angular/core';

import type { BookFilterValue } from '../../features/books/book-filters/book-filters';
import { tryGetLocalStorage, trySetLocalStorage } from '../util/local-storage';

export interface FilterPreset {
  name: string;
  value: BookFilterValue;
}

const STORAGE_KEY = 'shelfy.filter-presets';
const MAX_PRESETS = 10;

@Injectable({ providedIn: 'root' })
export class FilterPresetsService {
  private readonly items = signal<FilterPreset[]>(readStored());

  readonly presets = this.items.asReadonly();

  save(name: string, value: BookFilterValue): void {
    const trimmed = name.trim().slice(0, 40);
    if (!trimmed) {
      return;
    }
    this.items.update((list) => {
      const next = [...list.filter((preset) => preset.name !== trimmed), { name: trimmed, value }];
      return next.slice(-MAX_PRESETS);
    });
    this.persist();
  }

  remove(name: string): void {
    this.items.update((list) => list.filter((preset) => preset.name !== name));
    this.persist();
  }

  private persist(): void {
    trySetLocalStorage(STORAGE_KEY, JSON.stringify(this.items()));
  }
}

function readStored(): FilterPreset[] {
  const raw = tryGetLocalStorage(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as FilterPreset[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_PRESETS) : [];
  } catch {
    return [];
  }
}
