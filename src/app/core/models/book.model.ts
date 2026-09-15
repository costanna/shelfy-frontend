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
  categoryIds: number[];
}

/** Filtros de GET /api/books. */
export interface BookFilters {
  status?: BookStatus | null;
  categoryId?: number | null;
  q?: string | null;
  page?: number;
  size?: number;
}
