import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';

import { Book } from '../../../core/models/book.model';
import { emptyPage } from '../../../core/models/page.model';
import { BookService } from '../../../core/services/book.service';
import { CategoryService } from '../../../core/services/category.service';
import { BookCard } from '../../../shared/components/book-card/book-card';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { Spinner } from '../../../shared/components/spinner/spinner';
import { BookFilterValue, BookFilters } from '../book-filters/book-filters';

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;

interface Query extends BookFilterValue {
  page: number;
}

@Component({
  selector: 'app-book-list-page',
  imports: [RouterLink, TranslatePipe, BookFilters, BookCard, EmptyState, Pagination, Spinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-list.page.html',
  styleUrl: './book-list.page.scss',
})
export class BookListPage {
  private readonly bookService = inject(BookService);
  private readonly categoryService = inject(CategoryService);
  private readonly router = inject(Router);

  private readonly queries = new Subject<Query>();

  protected readonly query = signal<Query>(readQueryFromUrl(this.router.url));
  protected readonly loading = signal(true);

  protected readonly categories = toSignal(
    this.categoryService.list().pipe(catchError(() => of([]))),
    { initialValue: [] },
  );

  /**
   * Cada cambio de filtros dispara una búsqueda. switchMap cancela la anterior,
   * así que al escribir deprisa solo cuenta la última respuesta.
   */
  protected readonly result = toSignal(
    this.queries.pipe(
      debounceTime(SEARCH_DEBOUNCE_MS),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      switchMap((query) =>
        this.bookService.list({ ...query, size: PAGE_SIZE }).pipe(
          catchError(() => of(emptyPage<Book>())),
          tap(() => this.loading.set(false)),
        ),
      ),
    ),
    { initialValue: emptyPage<Book>() },
  );

  protected readonly hasFilters = computed(() => {
    const current = this.query();
    return current.status !== null || current.categoryId !== null || current.q.trim() !== '';
  });

  protected readonly countLabel = computed(() => ({ count: this.result().totalElements }));

  constructor() {
    this.search(this.query());
  }

  protected onFiltersChange(value: BookFilterValue): void {
    this.search({ ...value, page: 0 });
  }

  protected onPageChange(page: number): void {
    this.search({ ...this.query(), page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private search(query: Query): void {
    this.query.set(query);
    this.loading.set(true);
    this.syncUrl(query);
    this.queries.next(query);
  }

  /** Mantiene los filtros en la URL para poder compartirla o recargar sin perderlos. */
  private syncUrl(query: Query): void {
    void this.router.navigate([], {
      queryParams: {
        status: query.status ?? null,
        categoryId: query.categoryId ?? null,
        q: query.q.trim() || null,
        page: query.page || null,
      },
      replaceUrl: true,
    });
  }
}

function readQueryFromUrl(url: string): Query {
  const params = new URLSearchParams(url.split('?')[1] ?? '');
  const categoryId = params.get('categoryId');
  const page = params.get('page');

  return {
    status: (params.get('status') as Query['status']) ?? null,
    categoryId: categoryId ? Number(categoryId) : null,
    q: params.get('q') ?? '',
    page: page ? Number(page) : 0,
  };
}
