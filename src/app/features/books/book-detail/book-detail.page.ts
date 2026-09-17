import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Book } from '../../../core/models/book.model';
import { BookService } from '../../../core/services/book.service';
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

  constructor() {
    effect(() => this.load(Number(this.id())));
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

  private load(id: number): void {
    this.loading.set(true);
    this.coverFailed.set(false);

    this.bookService.get(id).subscribe({
      next: (book) => {
        this.book.set(book);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        void this.router.navigate(['/books']);
      },
    });
  }
}
