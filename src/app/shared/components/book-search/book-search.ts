import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import { BookLookupResult, BookSearchResult, BookSearchSource } from '../../../core/models/book-lookup.model';
import { BookLookupService } from '../../../core/services/book-lookup.service';
import { Spinner } from '../spinner/spinner';

const SEARCH_DEBOUNCE_MS = 400;

interface SearchQuery {
  query: string;
  source: BookSearchSource;
}

@Component({
  selector: 'app-book-search',
  imports: [TranslatePipe, Spinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './book-search.html',
  styleUrl: './book-search.scss',
})
export class BookSearch {
  private readonly bookLookup = inject(BookLookupService);

  readonly selected = output<BookLookupResult>();
  readonly closed = output<void>();

  protected readonly googleBooksAvailable = this.bookLookup.googleBooksAvailable;

  protected readonly query = signal('');
  protected readonly source = signal<BookSearchSource>('openLibrary');
  protected readonly results = signal<BookSearchResult[]>([]);
  protected readonly loading = signal(false);
  protected readonly searched = signal(false);
  protected readonly addingKey = signal<string | null>(null);

  private readonly queries = new Subject<SearchQuery>();

  constructor() {
    this.queries
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged((a, b) => a.query === b.query && a.source === b.source),
        switchMap(({ query, source }) => {
          if (!query) {
            return of<BookSearchResult[]>([]);
          }
          this.loading.set(true);
          const search$ =
            source === 'googleBooks'
              ? this.bookLookup.searchGoogleBooks(query)
              : this.bookLookup.search(query);
          return search$.pipe(catchError(() => of<BookSearchResult[]>([])));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((results) => {
        this.results.set(results);
        this.loading.set(false);
        this.searched.set(this.query().trim() !== '');
      });
  }

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.queries.next({ query: value.trim(), source: this.source() });
  }

  protected setSource(source: BookSearchSource): void {
    if (this.source() === source) {
      return;
    }
    this.source.set(source);
    this.queries.next({ query: this.query().trim(), source });
  }

  protected close(): void {
    this.closed.emit();
  }

  protected pick(result: BookSearchResult): void {
    if (this.addingKey() !== null) {
      return;
    }
    this.addingKey.set(result.key);

    if (result.synopsis !== undefined) {
      this.addingKey.set(null);
      this.selected.emit({
        title: result.title || null,
        author: result.author,
        pageCount: result.pageCount,
        coverUrl: result.coverUrl,
        synopsis: result.synopsis,
        isbn: result.isbn,
      });
      return;
    }

    if (!result.isbn) {
      this.addingKey.set(null);
      this.selected.emit({
        title: result.title || null,
        author: result.author,
        pageCount: result.pageCount,
        coverUrl: result.coverUrl,
        synopsis: null,
        isbn: null,
      });
      return;
    }

    this.bookLookup.lookupByIsbn(result.isbn).subscribe((full) => {
      this.addingKey.set(null);
      this.selected.emit({
        title: result.title || full?.title || null,
        author: result.author || full?.author || null,
        pageCount: result.pageCount ?? full?.pageCount ?? null,
        coverUrl: result.coverUrl ?? full?.coverUrl ?? null,
        synopsis: full?.synopsis ?? null,
        isbn: result.isbn,
      });
    });
  }
}
