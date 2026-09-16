import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, of } from 'rxjs';

import { BOOK_STATUSES, BookRequest } from '../../../core/models/book.model';
import { BookLookupService } from '../../../core/services/book-lookup.service';
import { BookService } from '../../../core/services/book.service';
import { CategoryService } from '../../../core/services/category.service';
import { ToastService } from '../../../core/services/toast.service';
import { dateRangeValidator } from '../../../core/util/date-range.validator';
import { FieldError } from '../../../shared/components/field-error/field-error';
import { IsbnScanner } from '../../../shared/components/isbn-scanner/isbn-scanner';
import { Spinner } from '../../../shared/components/spinner/spinner';

@Component({
  selector: 'app-book-form-page',
  imports: [ReactiveFormsModule, TranslatePipe, FieldError, Spinner, IsbnScanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-form.page.html',
  styleUrl: './book-form.page.scss',
})
export class BookFormPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly bookService = inject(BookService);
  private readonly categoryService = inject(CategoryService);
  private readonly bookLookup = inject(BookLookupService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly id = input<string | undefined>(undefined);

  protected readonly statuses = BOOK_STATUSES;
  protected readonly isEdit = computed(() => this.id() !== undefined);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly scannerOpen = signal(false);
  protected readonly lookingUp = signal(false);

  protected readonly selectedCategories = signal<ReadonlySet<number>>(new Set());

  protected readonly categories = toSignal(
    this.categoryService.list().pipe(catchError(() => of([]))),
    { initialValue: [] },
  );

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      title: ['', [Validators.required, Validators.maxLength(255)]],
      author: ['', [Validators.maxLength(255)]],
      coverUrl: ['', [Validators.maxLength(1000)]],
      isbn: ['', [Validators.maxLength(20)]],
      synopsis: [''],
      pageCount: [null as number | null, [Validators.min(1)]],
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
    effect(() => {
      const id = this.id();
      if (id !== undefined) {
        this.loadBook(Number(id));
      }
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
    this.scannerOpen.set(false);
    this.form.controls.isbn.setValue(isbn);
    this.lookupIsbn();
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

      this.form.patchValue({
        title: result.title ?? this.form.controls.title.value,
        author: result.author ?? this.form.controls.author.value,
        pageCount: result.pageCount ?? this.form.controls.pageCount.value,
        coverUrl: result.coverUrl ?? this.form.controls.coverUrl.value,
        synopsis: result.synopsis ?? this.form.controls.synopsis.value,
      });
      this.toast.success('bookForm.lookupSuccess');
    });
  }

  protected submit(): void {
    this.submitted.set(true);

    if (this.form.invalid || this.saving()) {
      return;
    }
    this.saving.set(true);

    const request = this.toRequest();
    const id = this.id();

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
      status: value.status,
      startedAt: value.startedAt || null,
      finishedAt: value.finishedAt || null,
      categoryIds: [...this.selectedCategories()],
    };
  }

  private loadBook(id: number): void {
    this.loading.set(true);

    this.bookService.get(id).subscribe({
      next: (book) => {
        this.form.setValue({
          title: book.title,
          author: book.author ?? '',
          coverUrl: book.coverUrl ?? '',
          isbn: book.isbn ?? '',
          synopsis: book.synopsis ?? '',
          pageCount: book.pageCount,
          status: book.status,
          startedAt: book.startedAt ?? '',
          finishedAt: book.finishedAt ?? '',
        });
        this.selectedCategories.set(new Set(book.categories.map((category) => category.id)));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        void this.router.navigate(['/books']);
      },
    });
  }
}
