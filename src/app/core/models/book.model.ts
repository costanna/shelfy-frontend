import { Category } from './category.model';

export const BOOK_STATUSES = ['WANT_TO_READ', 'READING', 'READ', 'WANT_TO_BUY'] as const;

export type BookStatus = (typeof BOOK_STATUSES)[number];

export interface Book {
  id: number;
  title: string;
  author: string | null;
  coverUrl: string | null;
  isbn: string | null;
  synopsis: string | null;
  pageCount: number | null;
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
  status: BookStatus;
  startedAt: string | null;
  finishedAt: string | null;
  categoryIds: number[];
}

export interface UpdateReadingDatesRequest {
  startedAt: string | null;
  finishedAt: string | null;
}

export interface BookFilters {
  status?: BookStatus | null;
  categoryId?: number | null;
  q?: string | null;
  page?: number;
  size?: number;
}

export interface BookImportResult {
  imported: number;
  skipped: number;
  messages: string[];
}
