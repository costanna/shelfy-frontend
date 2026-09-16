import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
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

interface GoogleBooksVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    pageCount?: number;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    description?: string;
    industryIdentifiers?: { type: string; identifier: string }[];
  };
}

interface GoogleBooksResponse {
  items?: GoogleBooksVolume[];
}

const OPEN_LIBRARY_API = 'https://openlibrary.org';
const OPEN_LIBRARY_COVERS = 'https://covers.openlibrary.org';
const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1';
const SEARCH_LIMIT = 20;

@Injectable({ providedIn: 'root' })
export class BookLookupService {
  readonly googleBooksAvailable = !!environment.googleBooksApiKey;

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

  searchGoogleBooks(query: string): Observable<BookSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed || !this.googleBooksAvailable) {
      return of([]);
    }

    const params = new URLSearchParams({
      q: trimmed,
      country: 'ES',
      maxResults: String(SEARCH_LIMIT),
      key: environment.googleBooksApiKey,
    });
    const url = `${GOOGLE_BOOKS_API}/volumes?${params.toString()}`;

    return this.fetchJson<GoogleBooksResponse>(url).pipe(
      map((data) => (data?.items ?? []).map(toGoogleBooksResult)),
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
          isbn: clean,
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

function toGoogleBooksResult(volume: GoogleBooksVolume): BookSearchResult {
  const info = volume.volumeInfo ?? {};
  const year = info.publishedDate ? Number(info.publishedDate.slice(0, 4)) : NaN;
  const isbn13 = info.industryIdentifiers?.find((id) => id.type === 'ISBN_13')?.identifier;
  const isbn10 = info.industryIdentifiers?.find((id) => id.type === 'ISBN_10')?.identifier;
  const thumbnail = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null;

  return {
    key: `gb-${volume.id}`,
    title: info.title?.trim() || '',
    author: info.authors?.[0]?.trim() || null,
    firstPublishYear: Number.isFinite(year) ? year : null,
    coverUrl: thumbnail ? thumbnail.replace(/^http:/, 'https:') : null,
    isbn: isbn13 ?? isbn10 ?? null,
    pageCount: info.pageCount ?? null,
    synopsis: info.description?.trim() || null,
  };
}
