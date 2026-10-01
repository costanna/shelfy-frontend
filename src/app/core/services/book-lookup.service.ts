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
// Catálogo SRU de la Biblioteca Nacional de España: cubre (casi) todo lo publicado
// en España con ISBN (depósito legal), incluidas editoriales pequeñas que no suelen
// estar en Google Books/Open Library. Es de acceso abierto (CC0), sin clave de API,
// y responde con cabeceras CORS que permiten llamarlo directamente desde el navegador.
const BNE_SRU_API = 'https://catalogo.bne.es/view/sru/34BNE_INST';
const SEARCH_LIMIT = 20;
const BNE_MAX_QUERY_WORDS = 6;

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

    // Open Library trae portada y sinopsis, así que se intenta primero; si no tiene
    // el ISBN (habitual en ediciones de editoriales españolas pequeñas), se cae a la
    // BNE, que no tiene portada/sinopsis pero cubre casi todo lo publicado en España.
    return this.lookupByIsbnOpenLibrary(clean).pipe(
      switchMap((result) => (result ? of(result) : this.lookupByIsbnBne(clean))),
    );
  }

  searchBne(query: string): Observable<BookSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return of([]);
    }

    const cql = buildBneTitleQuery(trimmed);
    if (!cql) {
      return of([]);
    }

    return this.fetchBneRecords(cql, SEARCH_LIMIT).pipe(
      map((records) => records.map(toBneSearchResult).filter((r): r is BookSearchResult => r !== null)),
      catchError(() => of([])),
    );
  }

  private lookupByIsbnOpenLibrary(isbn: string): Observable<BookLookupResult | null> {
    const url = `${OPEN_LIBRARY_API}/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`;

    return this.fetchJson<Record<string, OpenLibraryBookData>>(url).pipe(
      switchMap((data) => {
        const entry = data?.[`ISBN:${isbn}`];
        if (!entry) {
          return of(null);
        }

        const base: BookLookupResult = {
          title: entry.title?.trim() || null,
          author: entry.authors?.[0]?.name?.trim() || null,
          pageCount: entry.number_of_pages ?? null,
          coverUrl: entry.cover?.large ?? entry.cover?.medium ?? entry.cover?.small ?? null,
          synopsis: null,
          isbn,
        };

        return this.fetchSynopsis(isbn).pipe(map((synopsis) => ({ ...base, synopsis })));
      }),
      catchError(() => of(null)),
    );
  }

  private lookupByIsbnBne(isbn: string): Observable<BookLookupResult | null> {
    return this.fetchBneRecords(`alma.isbn=${isbn}`, 1).pipe(
      map((records) => {
        const result = records.length > 0 ? toBneSearchResult(records[0]) : null;
        if (!result) {
          return null;
        }
        return {
          title: result.title || null,
          author: result.author,
          pageCount: result.pageCount,
          coverUrl: null,
          synopsis: null,
          isbn,
        } satisfies BookLookupResult;
      }),
      catchError(() => of(null)),
    );
  }

  private fetchBneRecords(cqlQuery: string, maximumRecords: number): Observable<Element[]> {
    const params = new URLSearchParams({
      version: '1.2',
      operation: 'searchRetrieve',
      query: cqlQuery,
      maximumRecords: String(maximumRecords),
      recordSchema: 'marcxml',
    });
    const url = `${BNE_SRU_API}?${params.toString()}`;

    return from(fetch(url).then((response) => (response.ok ? response.text() : null))).pipe(
      map((xml) => (xml ? parseBneRecords(xml) : [])),
      catchError(() => of([])),
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

// --- BNE (catálogo SRU, formato MARCXML) ---

function buildBneTitleQuery(query: string): string {
  const words = query
    .split(/\s+/)
    .map((word) => word.replace(/["=()]/g, ''))
    .filter(Boolean)
    .slice(0, BNE_MAX_QUERY_WORDS);

  return words.map((word) => `alma.title=${word}`).join(' and ');
}

function parseBneRecords(xml: string): Element[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    return [];
  }

  return Array.from(doc.getElementsByTagName('recordData'))
    .map((recordData) => recordData.getElementsByTagName('record')[0])
    .filter((record): record is Element => !!record);
}

function getMarcDatafields(record: Element, tag: string): Element[] {
  return Array.from(record.getElementsByTagName('datafield')).filter(
    (datafield) => datafield.getAttribute('tag') === tag,
  );
}

function getMarcSubfield(datafield: Element, code: string): string | null {
  const subfield = Array.from(datafield.getElementsByTagName('subfield')).find(
    (sf) => sf.getAttribute('code') === code,
  );
  const text = subfield?.textContent?.trim();
  return text ? text.replace(/[\s/:,.]+$/, '') : null;
}

function toBneSearchResult(record: Element): BookSearchResult | null {
  const titleField = getMarcDatafields(record, '245')[0];
  if (!titleField) {
    return null;
  }

  const titleMain = getMarcSubfield(titleField, 'a');
  if (!titleMain) {
    return null;
  }
  const subtitle = getMarcSubfield(titleField, 'b');
  const title = subtitle ? `${titleMain}: ${subtitle}` : titleMain;

  const authorField = getMarcDatafields(record, '100')[0] ?? getMarcDatafields(record, '700')[0];
  const author = authorField ? getMarcSubfield(authorField, 'a') : null;

  const isbnField = getMarcDatafields(record, '020')[0];
  const isbnRaw = isbnField ? getMarcSubfield(isbnField, 'a') : null;
  const isbn = isbnRaw ? (isbnRaw.match(/[0-9Xx-]{10,17}/)?.[0]?.replace(/-/g, '') ?? null) : null;

  const extentField = getMarcDatafields(record, '300')[0];
  const extent = extentField ? getMarcSubfield(extentField, 'a') : null;
  const pageCountMatch = extent?.match(/\d+/)?.[0];
  const pageCount = pageCountMatch ? Number(pageCountMatch) : null;

  const controlField008 = Array.from(record.getElementsByTagName('controlfield')).find(
    (cf) => cf.getAttribute('tag') === '008',
  );
  const yearText = controlField008?.textContent?.slice(7, 11);
  const year = yearText ? Number(yearText) : NaN;

  return {
    key: `bne-${isbn ?? title}`,
    title,
    author,
    firstPublishYear: Number.isFinite(year) ? year : null,
    coverUrl: null,
    isbn,
    pageCount,
  };
}
