import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, startWith, switchMap, tap } from 'rxjs';

import { BOOK_SORT_OPTIONS, Book, BookSort, BookStatusCounts } from '../../../core/models/book.model';
import { emptyPage } from '../../../core/models/page.model';
import { AuthService } from '../../../core/services/auth.service';
import { BookService } from '../../../core/services/book.service';
import { CategoryService } from '../../../core/services/category.service';
import { OfflineQueueService } from '../../../core/services/offline-queue.service';
import { RecommendationsVisibilityService } from '../../../core/services/recommendations-visibility.service';
import { ToastService } from '../../../core/services/toast.service';
import { tryGetLocalStorage, trySetLocalStorage } from '../../../core/util/local-storage';
import { BookCard } from '../../../shared/components/book-card/book-card';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { GoalStreakCard } from '../../../shared/components/goal-streak-card/goal-streak-card';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { Spinner } from '../../../shared/components/spinner/spinner';
import { BookFilterValue, BookFilters } from '../book-filters/book-filters';
import { Recommendations } from '../recommendations/recommendations';

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;
const VIEW_MODE_KEY = 'shelfy.book-view-mode';

type ViewMode = 'grid' | 'shelf';

interface Query extends BookFilterValue {
  page: number;
}

@Component({
  selector: 'app-book-list-page',
  imports: [RouterLink, TranslatePipe, BookFilters, BookCard, EmptyState, Pagination, Spinner, Recommendations, GoalStreakCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-list.page.html',
  styleUrl: './book-list.page.scss',
})
export class BookListPage {
  private readonly bookService = inject(BookService);
  private readonly categoryService = inject(CategoryService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly offlineQueue = inject(OfflineQueueService);
  private readonly auth = inject(AuthService);
  // Idioma desat a l'usuari: canvia quan el servidor confirma el canvi, no abans.
  private readonly savedLanguage = computed(() => this.auth.user()?.languagePreference);

  protected readonly recommendationsHidden = inject(RecommendationsVisibilityService).hidden;

  private readonly queries = new Subject<Query>();
  private readonly refreshCounts = new Subject<void>();
  private readonly refreshCategories = new Subject<void>();

  protected readonly query = signal<Query>(readQueryFromUrl(this.router.url));
  protected readonly loading = signal(true);
  protected readonly viewMode = signal<ViewMode>(readStoredViewMode());
  protected readonly showingTrash = signal(false);
  protected readonly trashPage = signal(0);
  protected readonly trashResult = signal(emptyPage<Book>());
  protected readonly trashLoading = signal(false);
  protected readonly pendingCount = computed(() => this.offlineQueue.pending().length);

  protected readonly categories = toSignal(
    // seedDefaults() retorna la llista igual que list(), però a més crea les
    // categories de fàbrica que faltin i tradueix les originals a l'idioma
    // actual: així la migració s'aplica sola sense haver de tancar sessió.
    // Es recarrega també en canviar d'idioma, perquè els noms venen del backend.
    this.refreshCategories.pipe(
      switchMap(() => this.categoryService.seedDefaults().pipe(catchError(() => of([])))),
    ),
    { initialValue: [] },
  );

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

  protected readonly statusCounts = toSignal(
    this.refreshCounts.pipe(
      startWith(undefined),
      switchMap(() => this.bookService.statusCounts().pipe(catchError(() => of(null)))),
    ),
    { initialValue: null as BookStatusCounts | null },
  );

  protected readonly hasFilters = computed(() => {
    const current = this.query();
    return current.status !== null || current.categoryId !== null || current.q.trim() !== '';
  });

  protected readonly countLabel = computed(() => ({ count: this.result().totalElements }));

  constructor() {
    this.search(this.query());
    // Els noms de categories venen del backend, traduïts a l'idioma desat a
    // l'usuari: es tornen a demanar quan aquest idioma canvia (si es fes en
    // canviar el selector, la petició podria arribar abans i tornar-los en
    // l'idioma anterior).
    effect(() => {
      this.savedLanguage();
      this.refreshCategories.next();
    });
  }

  protected onFiltersChange(value: BookFilterValue): void {
    this.search({ ...value, page: 0 });
  }

  protected onPageChange(page: number): void {
    this.search({ ...this.query(), page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Las Recomendaciones añaden un libro sin navegar de página: sin esto, la
   *  lista y los contadores de estado se quedaban con los datos de antes. */
  protected onBookAddedElsewhere(): void {
    this.queries.next(this.query());
    this.refreshCounts.next();
  }

  protected toggleTrash(): void {
    const next = !this.showingTrash();
    this.showingTrash.set(next);
    if (next) {
      this.loadTrash(0);
    }
  }

  protected onTrashPageChange(page: number): void {
    this.loadTrash(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected restoreBook(id: number): void {
    this.bookService.restore(id).subscribe({
      next: () => {
        this.toast.success('books.restored');
        this.loadTrash(this.trashPage());
        this.queries.next(this.query());
        this.refreshCounts.next();
      },
    });
  }

  protected purgeBook(book: Book): void {
    const message = this.translate.instant('books.purgeConfirm', { title: book.title });
    if (!confirm(message)) {
      return;
    }
    this.bookService.purge(book.id).subscribe({
      next: () => {
        this.toast.success('books.purged');
        this.loadTrash(this.trashPage());
      },
    });
  }

  private loadTrash(page: number): void {
    this.trashPage.set(page);
    this.trashLoading.set(true);
    this.bookService.trash(page, PAGE_SIZE).subscribe({
      next: (result) => {
        this.trashResult.set(result);
        this.trashLoading.set(false);
      },
      error: () => this.trashLoading.set(false),
    });
  }

  protected setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
    trySetLocalStorage(VIEW_MODE_KEY, mode);
  }

  private search(query: Query): void {
    this.query.set(query);
    this.loading.set(true);
    this.syncUrl(query);
    this.queries.next(query);
  }

  private syncUrl(query: Query): void {
    void this.router.navigate([], {
      queryParams: {
        status: query.status ?? null,
        categoryId: query.categoryId ?? null,
        q: query.q.trim() || null,
        sort: query.sort ?? null,
        page: query.page || null,
      },
      replaceUrl: true,
    });
  }
}

function readStoredViewMode(): ViewMode {
  return tryGetLocalStorage(VIEW_MODE_KEY) === 'shelf' ? 'shelf' : 'grid';
}

function readQueryFromUrl(url: string): Query {
  const params = new URLSearchParams(url.split('?')[1] ?? '');
  const categoryId = params.get('categoryId');
  const page = params.get('page');

  return {
    status: (params.get('status') as Query['status']) ?? null,
    categoryId: categoryId ? Number(categoryId) : null,
    q: params.get('q') ?? '',
    sort: asValidSort(params.get('sort')),
    page: page ? Number(page) : 0,
  };
}

function asValidSort(value: string | null): BookSort | null {
  return (BOOK_SORT_OPTIONS as readonly string[]).includes(value ?? '') ? (value as BookSort) : null;
}
