import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Book } from '../../../core/models/book.model';
import { BookService } from '../../../core/services/book.service';
import { ToastService } from '../../../core/services/toast.service';
import { Spinner } from '../../../shared/components/spinner/spinner';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { ReviewSection } from '../reviews/review-section/review-section';

@Component({
  selector: 'app-book-detail-page',
  imports: [RouterLink, TranslatePipe, StatusBadge, Spinner, ReviewSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-detail.page.html',
  styleUrl: './book-detail.page.scss',
})
export class BookDetailPage {
  private readonly bookService = inject(BookService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  /** Llega de la ruta :id gracias a withComponentInputBinding(). */
  readonly id = input.required<string>();

  protected readonly book = signal<Book | null>(null);
  protected readonly loading = signal(true);

  constructor() {
    // Recarga si se navega de un libro a otro sin salir de la pantalla.
    effect(() => this.load(Number(this.id())));
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
