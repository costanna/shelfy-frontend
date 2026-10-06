import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { catchError, map, of, switchMap } from 'rxjs';

import { Book } from '../../../core/models/book.model';
import { BookService } from '../../../core/services/book.service';
import { OfflineQueueService } from '../../../core/services/offline-queue.service';
import { ToastService } from '../../../core/services/toast.service';
import { readingProgressPercent } from '../../../core/util/reading-progress';
import { Spinner } from '../../../shared/components/spinner/spinner';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { NoteSection } from '../notes/note-section/note-section';
import { ReviewSection } from '../reviews/review-section/review-section';

@Component({
  selector: 'app-book-detail-page',
  imports: [RouterLink, TranslatePipe, DatePipe, FormsModule, StatusBadge, Spinner, ReviewSection, NoteSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-detail.page.html',
  styleUrl: './book-detail.page.scss',
})
export class BookDetailPage {
  private readonly bookService = inject(BookService);
  private readonly offlineQueue = inject(OfflineQueueService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly id = input.required<string>();

  protected readonly book = signal<Book | null>(null);
  protected readonly loading = signal(true);
  protected readonly coverFailed = signal(false);

  protected readonly editingProgress = signal(false);
  protected readonly savingProgress = signal(false);
  protected readonly progressInput = signal<number | null>(null);
  protected readonly rereading = signal(false);

  protected readonly progressPercent = computed(() => {
    const current = this.book();
    return readingProgressPercent(current?.currentPage ?? null, current?.pageCount ?? null);
  });

  protected readonly buyLink = computed(() => {
    const current = this.book();
    if (!current) {
      return null;
    }
    const query = [current.title, current.author].filter(Boolean).join(' ');
    return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
  });

  constructor() {
    // switchMap evita la cursa si es navega ràpid entre detalls:
    // la petició anterior es cancel·la i no pinta el llibre vell.
    toObservable(this.id)
      .pipe(
        switchMap((id) => {
          this.loading.set(true);
          this.coverFailed.set(false);
          return this.bookService.get(Number(id)).pipe(
            map((book) => ({ ok: true as const, book, id: Number(id) })),
            catchError(() => of({ ok: false as const, book: null, id: Number(id) })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (!result.ok || !result.book) {
          this.loading.set(false);
          void this.router.navigate(['/books']);
          return;
        }
        if (Number(this.id()) === result.id) {
          this.book.set(result.book);
        }
        this.loading.set(false);
      });
  }

  protected startProgressEdit(): void {
    this.progressInput.set(this.book()?.currentPage ?? 0);
    this.editingProgress.set(true);
  }

  protected cancelProgressEdit(): void {
    this.editingProgress.set(false);
  }

  protected saveProgress(): void {
    const current = this.book();
    const value = this.progressInput();
    if (!current || value === null || value < 0 || this.savingProgress()) {
      return;
    }
    const bookId = current.id;
    const value$ = current.pageCount ? Math.min(value, current.pageCount) : value;

    if (!navigator.onLine) {
      this.offlineQueue.enqueue({ op: 'update-progress', payload: { bookId, currentPage: value$ } });
      this.book.set({ ...current, currentPage: value$ });
      this.editingProgress.set(false);
      this.toast.success('offline.queued');
      return;
    }
    this.savingProgress.set(true);

    this.bookService.updateProgress(bookId, { currentPage: value$ }).subscribe({
      next: (book) => {
        this.savingProgress.set(false);
        this.editingProgress.set(false);
        this.toast.success('books.progressSaved');
        if (Number(this.id()) === bookId) {
          this.book.set(book);
        }
      },
      error: () => this.savingProgress.set(false),
    });
  }

  protected reread(): void {
    const current = this.book();
    if (!current || this.rereading()) {
      return;
    }
    const bookId = current.id;
    this.rereading.set(true);

    this.bookService.reread(bookId).subscribe({
      next: (book) => {
        this.rereading.set(false);
        this.toast.success('books.rereadStarted');
        if (Number(this.id()) === bookId) {
          this.book.set(book);
        }
      },
      error: () => this.rereading.set(false),
    });
  }

  protected remove(): void {
    const current = this.book();
    if (!current) {
      return;
    }

    const message = this.translate.instant('books.deleteConfirm', { title: current.title });
    if (!confirm(message)) {
      return;
    }

    this.bookService.delete(current.id).subscribe({
      next: () => {
        this.toast.success('books.deleted');
        void this.router.navigate(['/books']);
      },
    });
  }
}
