import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, map, of, switchMap } from 'rxjs';

import { BOOK_FORMATS, BOOK_STATUSES, BookRequest } from '../../../core/models/book.model';
import { BookLookupResult } from '../../../core/models/book-lookup.model';
import { BookLookupService } from '../../../core/services/book-lookup.service';
import { BookService } from '../../../core/services/book.service';
import { CategoryService } from '../../../core/services/category.service';
import { OfflineQueueService } from '../../../core/services/offline-queue.service';
import { ToastService } from '../../../core/services/toast.service';
import { findLikelyDuplicate } from '../../../core/util/book-duplicate.util';
import { dateRangeValidator } from '../../../core/util/date-range.validator';
import { BookSearch } from '../../../shared/components/book-search/book-search';
import { FieldError } from '../../../shared/components/field-error/field-error';
import { IsbnScanner } from '../../../shared/components/isbn-scanner/isbn-scanner';
import { Spinner } from '../../../shared/components/spinner/spinner';

@Component({
  selector: 'app-book-form-page',
  imports: [ReactiveFormsModule, TranslatePipe, FieldError, Spinner, IsbnScanner, BookSearch],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-form.page.html',
  styleUrl: './book-form.page.scss',
})
export class BookFormPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly bookService = inject(BookService);
  private readonly offlineQueue = inject(OfflineQueueService);
  private readonly categoryService = inject(CategoryService);
  private readonly bookLookup = inject(BookLookupService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly id = input<string | undefined>(undefined);

  protected readonly statuses = BOOK_STATUSES;
  protected readonly formats = BOOK_FORMATS;
  protected readonly isEdit = computed(() => this.id() !== undefined);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly scannerOpen = signal(false);
  protected readonly searchOpen = signal(false);
  protected readonly lookingUp = signal(false);

  protected readonly selectedCategories = signal<ReadonlySet<number>>(new Set());
  protected readonly quickAdd = signal(false);

  protected readonly categories = toSignal(
    this.categoryService.seedDefaults().pipe(catchError(() => of([]))),
    { initialValue: [] },
  );

  // Claus lleugeres (id/title/author) per avisar de duplicats sense
  // carregar tota la biblioteca paginada.
  private readonly allOwnedBooks = toSignal(
    this.bookService.keys().pipe(catchError(() => of([]))),
    { initialValue: [] as { id: number; title: string; author: string | null }[] },
  );

  // Al editar, el propio libro no cuenta como "ya lo tienes" si se vuelve a
  // buscar para refrescar sus datos.
  protected readonly ownedBooks = computed(() => {
    const editingId = this.id();
    return editingId
      ? this.allOwnedBooks().filter((book) => book.id !== Number(editingId))
      : this.allOwnedBooks();
  });

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      title: ['', [Validators.required, Validators.maxLength(255)]],
      author: ['', [Validators.maxLength(255)]],
      coverUrl: ['', [Validators.maxLength(1000)]],
      isbn: ['', [Validators.maxLength(20)]],
      synopsis: ['', [Validators.maxLength(5000)]],
      pageCount: [null as number | null, [Validators.min(1)]],
      currentPage: [null as number | null, [Validators.min(0)]],
      series: ['', [Validators.maxLength(255)]],
      seriesPosition: [null as number | null, [Validators.min(1)]],
      format: [null as (typeof BOOK_FORMATS)[number] | null],
      status: [BOOK_STATUSES[0] as (typeof BOOK_STATUSES)[number], [Validators.required]],
      startedAt: [''],
      finishedAt: [''],
    },
    { validators: [dateRangeValidator] },
  );

  protected readonly coverPreview = toSignal(this.form.controls.coverUrl.valueChanges, {
    initialValue: '',
  });
  protected readonly coverPreviewFailed = signal(false);

  constructor() {
    // switchMap cancel·la la càrrega anterior si l'usuari navega ràpid
    // entre llibres (el router reutilitza el component).
    toObservable(this.id)
      .pipe(
        switchMap((id) => {
          if (id === undefined) {
            return of(null);
          }
          this.loading.set(true);
          return this.bookService.get(Number(id)).pipe(
            map((book) => ({ ok: true as const, book })),
            catchError(() => of({ ok: false as const, book: null })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (result === null) {
          return;
        }
        if (!result.ok || !result.book) {
          this.loading.set(false);
          void this.router.navigate(['/books']);
          return;
        }
        const book = result.book;
        this.form.setValue({
          title: book.title,
          author: book.author ?? '',
          coverUrl: book.coverUrl ?? '',
          isbn: book.isbn ?? '',
          synopsis: book.synopsis ?? '',
          pageCount: book.pageCount,
          currentPage: book.currentPage,
          series: book.series ?? '',
          seriesPosition: book.seriesPosition,
          format: book.format,
          status: book.status,
          startedAt: book.startedAt ?? '',
          finishedAt: book.finishedAt ?? '',
        });
        this.selectedCategories.set(new Set(book.categories.map((category) => category.id)));
        this.loading.set(false);
      });
  }

  protected toggleCategory(id: number): void {
    this.selectedCategories.update((selected) => {
      const next = new Set(selected);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  protected isSelected(id: number): boolean {
    return this.selectedCategories().has(id);
  }

  protected openScanner(): void {
    this.scannerOpen.set(true);
  }

  protected closeScanner(): void {
    this.scannerOpen.set(false);
  }

  protected onScanned(isbn: string): void {
    if (this.quickAdd()) {
      this.quickAddFromIsbn(isbn);
      return;
    }
    this.scannerOpen.set(false);
    this.form.controls.isbn.setValue(isbn);
    this.lookupIsbn();
  }

  /** Lot: busca l'ISBN i desa el llibre directament sense tancar l'escàner. */
  private quickAddFromIsbn(isbn: string): void {
    if (this.lookingUp()) {
      return;
    }
    this.lookingUp.set(true);
    this.bookLookup.lookupByIsbn(isbn).subscribe((result) => {
      this.lookingUp.set(false);
      if (!result?.title) {
        this.toast.error('bookForm.lookupNotFound');
        return;
      }
      this.bookService
        .create({
          title: result.title,
          author: result.author,
          coverUrl: result.coverUrl,
          isbn: result.isbn ?? isbn,
          synopsis: result.synopsis ?? null,
          pageCount: result.pageCount,
          currentPage: null,
          series: null,
          seriesPosition: null,
          format: null,
          status: 'WANT_TO_READ',
          startedAt: null,
          finishedAt: null,
          categoryIds: [],
        })
        .subscribe({
          next: () => this.toast.success('books.created'),
        });
    });
  }

  protected lookupIsbn(): void {
    const isbn = this.form.controls.isbn.value.trim();
    if (!isbn || this.lookingUp()) {
      return;
    }
    this.lookingUp.set(true);

    this.bookLookup.lookupByIsbn(isbn).subscribe((result) => {
      this.lookingUp.set(false);

      if (!result) {
        this.toast.error('bookForm.lookupNotFound');
        return;
      }

      if (!this.applyLookupResult(result)) {
        this.toast.success('bookForm.lookupSuccess');
      }
    });
  }

  protected openSearch(): void {
    this.searchOpen.set(true);
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
  }

  protected onBookSelected(result: BookLookupResult): void {
    this.searchOpen.set(false);
    if (!this.applyLookupResult(result)) {
      this.toast.success('bookForm.lookupSuccess');
    }
  }

  /** Devuelve true si se ha avisado de un posible duplicado (y por tanto no
   *  hace falta además mostrar el toast de éxito de la búsqueda). */
  private applyLookupResult(result: BookLookupResult): boolean {
    this.form.patchValue({
      title: result.title ?? this.form.controls.title.value,
      author: result.author ?? this.form.controls.author.value,
      pageCount: result.pageCount ?? this.form.controls.pageCount.value,
      coverUrl: result.coverUrl ?? this.form.controls.coverUrl.value,
      synopsis: result.synopsis ?? this.form.controls.synopsis.value,
      isbn: result.isbn ?? this.form.controls.isbn.value,
    });

    const title = result.title ?? this.form.controls.title.value;
    if (findLikelyDuplicate(title, result.author, this.ownedBooks())) {
      this.toast.error('bookForm.possibleDuplicate');
      return true;
    }
    return false;
  }

  protected submit(): void {
    this.submitted.set(true);

    if (this.form.invalid || this.saving()) {
      return;
    }

    const request = this.toRequest();
    const id = this.id();

    if (!id && !navigator.onLine) {
      this.offlineQueue.enqueue({ op: 'create-book', payload: request });
      this.toast.success('offline.queued');
      void this.router.navigate(['/books']);
      return;
    }

    this.saving.set(true);

    const request$ = id
      ? this.bookService.update(Number(id), request)
      : this.bookService.create(request);

    request$.subscribe({
      next: (book) => {
        this.toast.success(id ? 'books.updated' : 'books.created');
        void this.router.navigate(['/books', book.id]);
      },
      error: () => this.saving.set(false),
    });
  }

  protected cancel(): void {
    const id = this.id();
    void this.router.navigate(id ? ['/books', id] : ['/books']);
  }

  private toRequest(): BookRequest {
    const value = this.form.getRawValue();

    return {
      title: value.title.trim(),
      author: value.author.trim() || null,
      coverUrl: value.coverUrl.trim() || null,
      isbn: value.isbn.trim() || null,
      synopsis: value.synopsis.trim() || null,
      pageCount: value.pageCount,
      currentPage: value.currentPage,
      series: value.series.trim() || null,
      seriesPosition: value.seriesPosition,
      format: value.format,
      status: value.status,
      startedAt: value.startedAt || null,
      finishedAt: value.finishedAt || null,
      categoryIds: [...this.selectedCategories()],
    };
  }
}
