import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { BookLookupResult, BookSearchResult } from '../models/book-lookup.model';

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

interface OpenLibrarySearchDoc {
  key: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  isbn?: string[];
  number_of_pages_median?: number;
}

interface OpenLibrarySearchResponse {
  docs?: OpenLibrarySearchDoc[];
}

const OPEN_LIBRARY_API = 'https://openlibrary.org';
const OPEN_LIBRARY_COVERS = 'https://covers.openlibrary.org';
const SEARCH_LIMIT = 20;

@Injectable({ providedIn: 'root' })
export class BookLookupService {
  search(query: string): Observable<BookSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return of([]);
    }

    const params = new URLSearchParams({
      q: trimmed,
      limit: String(SEARCH_LIMIT),
      fields: 'key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median',
    });
    const url = `${OPEN_LIBRARY_API}/search.json?${params.toString()}`;

    return this.fetchJson<OpenLibrarySearchResponse>(url).pipe(
      map((data) => (data?.docs ?? []).map(toSearchResult)),
      catchError(() => of([])),
    );
  }

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

function toSearchResult(doc: OpenLibrarySearchDoc): BookSearchResult {
  return {
    key: doc.key,
    title: doc.title?.trim() || '',
    author: doc.author_name?.[0]?.trim() || null,
    firstPublishYear: doc.first_publish_year ?? null,
    coverUrl: doc.cover_i ? `${OPEN_LIBRARY_COVERS}/b/id/${doc.cover_i}-M.jpg` : null,
    isbn: doc.isbn?.[0] ?? null,
    pageCount: doc.number_of_pages_median ?? null,
  };
}
