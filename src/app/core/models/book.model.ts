import { Category } from './category.model';

export const BOOK_STATUSES = ['WANT_TO_READ', 'READING', 'READ', 'WANT_TO_BUY'] as const;

export type BookStatus = (typeof BOOK_STATUSES)[number];

export const BOOK_FORMATS = ['PHYSICAL', 'EBOOK', 'AUDIOBOOK'] as const;

export type BookFormat = (typeof BOOK_FORMATS)[number];

export interface Book {
  id: number;
  title: string;
  author: string | null;
  coverUrl: string | null;
  isbn: string | null;
  synopsis: string | null;
  pageCount: number | null;
  currentPage: number | null;
  series: string | null;
  seriesPosition: number | null;
  format: BookFormat | null;
  status: BookStatus;
  startedAt: string | null;
  finishedAt: string | null;
  categories: Category[];
  createdAt: string;
  updatedAt: string;
}

export interface BookRequest {
  title: string;
  author: string | null;
  coverUrl: string | null;
  isbn: string | null;
  synopsis: string | null;
  pageCount: number | null;
  currentPage: number | null;
  series: string | null;
  seriesPosition: number | null;
  format: BookFormat | null;
  status: BookStatus;
  startedAt: string | null;
  finishedAt: string | null;
  categoryIds: number[];
}

export interface UpdateReadingDatesRequest {
  startedAt: string | null;
  finishedAt: string | null;
}

export interface UpdateProgressRequest {
  currentPage: number;
}

export const BOOK_SORT_OPTIONS = [
  'createdAt,desc',
  'title,asc',
  'author,asc',
  'pageCount,desc',
] as const;

export type BookSort = (typeof BOOK_SORT_OPTIONS)[number];

export interface BookFilters {
  status?: BookStatus | null;
  categoryId?: number | null;
  q?: string | null;
  sort?: BookSort | null;
  page?: number;
  size?: number;
}

export interface BookImportResult {
  imported: number;
  skipped: number;
  messages: string[];
}
