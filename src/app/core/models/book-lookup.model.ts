export interface BookLookupResult {
  title: string | null;
  author: string | null;
  pageCount: number | null;
  coverUrl: string | null;
  synopsis: string | null;
  isbn: string | null;
}

export type BookSearchSource = 'openLibrary' | 'googleBooks';

export interface BookSearchResult {
  key: string;
  title: string;
  author: string | null;
  firstPublishYear: number | null;
  coverUrl: string | null;
  isbn: string | null;
  pageCount: number | null;
  synopsis?: string | null;
}
