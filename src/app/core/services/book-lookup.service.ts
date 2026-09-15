import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { BookLookupResult } from '../models/book-lookup.model';

interface OpenLibraryBookData {
  title?: string;
  authors?: { name: string }[];
  number_of_pages?: number;
  cover?: { small?: string; medium?: string; large?: string };
}

interface OpenLibraryEdition {
  works?: { key: string }[];
}

interface OpenLibraryWork {
  description?: string | { value?: string };
}

const OPEN_LIBRARY_API = 'https://openlibrary.org';

@Injectable({ providedIn: 'root' })
export class BookLookupService {
  lookupByIsbn(isbn: string): Observable<BookLookupResult | null> {
    const clean = isbn.replace(/[^0-9Xx]/g, '');
    if (!clean) {
      return of(null);
    }

    const url = `${OPEN_LIBRARY_API}/api/books?bibkeys=ISBN:${clean}&jscmd=data&format=json`;

    return this.fetchJson<Record<string, OpenLibraryBookData>>(url).pipe(
      switchMap((data) => {
        const entry = data?.[`ISBN:${clean}`];
        if (!entry) {
          return of(null);
        }

        const base: BookLookupResult = {
          title: entry.title?.trim() || null,
          author: entry.authors?.[0]?.name?.trim() || null,
          pageCount: entry.number_of_pages ?? null,
          coverUrl: entry.cover?.large ?? entry.cover?.medium ?? entry.cover?.small ?? null,
          synopsis: null,
        };

        return this.fetchSynopsis(clean).pipe(map((synopsis) => ({ ...base, synopsis })));
      }),
      catchError(() => of(null)),
    );
  }

  private fetchSynopsis(isbn: string): Observable<string | null> {
    return this.fetchJson<OpenLibraryEdition>(`${OPEN_LIBRARY_API}/isbn/${isbn}.json`).pipe(
      switchMap((edition) => {
        const workKey = edition?.works?.[0]?.key;
        if (!workKey) {
          return of(null);
        }
        return this.fetchJson<OpenLibraryWork>(`${OPEN_LIBRARY_API}${workKey}.json`).pipe(
          map((work) => {
            const description = work?.description;
            if (!description) {
              return null;
            }
            return typeof description === 'string' ? description : (description.value ?? null);
          }),
        );
      }),
      catchError(() => of(null)),
    );
  }

  private fetchJson<T>(url: string): Observable<T | null> {
    return from(
      fetch(url).then((response) => (response.ok ? (response.json() as Promise<T>) : null)),
    ).pipe(catchError(() => of(null)));
  }
}
