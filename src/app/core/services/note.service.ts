import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BookNote, NoteRequest } from '../models/note.model';

@Injectable({ providedIn: 'root' })
export class NoteService {
  private readonly http = inject(HttpClient);

  list(bookId: number): Observable<BookNote[]> {
    return this.http.get<BookNote[]>(this.urlFor(bookId));
  }

  create(bookId: number, request: NoteRequest): Observable<BookNote> {
    return this.http.post<BookNote>(this.urlFor(bookId), request);
  }

  delete(bookId: number, noteId: number): Observable<void> {
    return this.http.delete<void>(`${this.urlFor(bookId)}/${noteId}`);
  }

  private urlFor(bookId: number): string {
    return `${environment.apiUrl}/books/${bookId}/notes`;
  }
}
