import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { catchError, forkJoin, of, switchMap } from 'rxjs';

import { BookSearchResult } from '../../../core/models/book-lookup.model';
import { Book, BookStatus } from '../../../core/models/book.model';
import { BookLookupService } from '../../../core/services/book-lookup.service';
import { BookService } from '../../../core/services/book.service';
import { ToastService } from '../../../core/services/toast.service';

const LIBRARY_SCAN_SIZE = 200;
const MAX_RECOMMENDATIONS = 5;
const READ_STATUS: BookStatus = 'READ';

@Component({
  selector: 'app-recommendations',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recommendations.html',
  styleUrl: './recommendations.scss',
})
export class Recommendations {
  private readonly bookService = inject(BookService);
  private readonly bookLookup = inject(BookLookupService);
  private readonly toast = inject(ToastService);

  protected readonly basedOnAuthor = signal<string | null>(null);
  protected readonly results = signal<BookSearchResult[]>([]);
  protected readonly loading = signal(true);
  protected readonly addingKey = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected add(result: BookSearchResult): void {
    if (this.addingKey() !== null) {
      return;
    }
    this.addingKey.set(result.key);

    this.bookService
      .create({
        title: result.title,
        author: result.author,
        coverUrl: result.coverUrl,
        isbn: result.isbn,
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
        next: () => {
          this.addingKey.set(null);
          this.results.update((list) => list.filter((item) => item.key !== result.key));
          this.toast.success('recommendations.added');
        },
        error: () => this.addingKey.set(null),
      });
  }

  private load(): void {
    this.loading.set(true);

    forkJoin({
      readBooks: this.bookService.list({ status: READ_STATUS, size: LIBRARY_SCAN_SIZE }).pipe(
        catchError(() => of(null)),
      ),
      allBooks: this.bookService.list({ size: LIBRARY_SCAN_SIZE }).pipe(catchError(() => of(null))),
    })
      .pipe(
        switchMap(({ readBooks, allBooks }) => {
          const topAuthor = pickTopAuthor(readBooks?.content ?? []);
          this.basedOnAuthor.set(topAuthor);

          if (!topAuthor) {
            return of({ owned: new Set<string>(), results: [] as BookSearchResult[] });
          }

          const owned = new Set((allBooks?.content ?? []).map((book) => normalize(book.title)));
          return this.bookLookup.search(topAuthor).pipe(
            catchError(() => of([])),
            switchMap((results) => of({ owned, results })),
          );
        }),
      )
      .subscribe(({ owned, results }) => {
        const filtered = results
          .filter((result) => result.title && !owned.has(normalize(result.title)))
          .slice(0, MAX_RECOMMENDATIONS);
        this.results.set(filtered);
        this.loading.set(false);
      });
  }
}

function pickTopAuthor(readBooks: Book[]): string | null {
  const counts = new Map<string, number>();
  for (const book of readBooks) {
    const author = book.author?.trim();
    if (author) {
      counts.set(author, (counts.get(author) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [author, count] of counts) {
    if (count > bestCount) {
      best = author;
      bestCount = count;
    }
  }
  return best;
}

function normalize(title: string): string {
  return title.trim().toLowerCase();
}
