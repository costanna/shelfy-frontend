import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Book, BookFilters, BookRequest } from '../models/book.model';
import { Page } from '../models/page.model';

@Injectable({ providedIn: 'root' })
export class BookService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/books`;

  list(filters: BookFilters = {}): Observable<Page<Book>> {
    return this.http.get<Page<Book>>(this.baseUrl, { params: buildParams(filters) });
  }

  get(id: number): Observable<Book> {
    return this.http.get<Book>(`${this.baseUrl}/${id}`);
  }

  create(request: BookRequest): Observable<Book> {
    return this.http.post<Book>(this.baseUrl, request);
  }

  update(id: number, request: BookRequest): Observable<Book> {
    return this.http.put<Book>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

/** Omite los filtros vacíos para no mandar parámetros en blanco al backend. */
function buildParams(filters: BookFilters): HttpParams {
  let params = new HttpParams();

  if (filters.status) {
    params = params.set('status', filters.status);
  }
  if (filters.categoryId) {
    params = params.set('categoryId', filters.categoryId);
  }
  if (filters.q?.trim()) {
    params = params.set('q', filters.q.trim());
  }
  if (filters.page !== undefined) {
    params = params.set('page', filters.page);
  }
  if (filters.size !== undefined) {
    params = params.set('size', filters.size);
  }
  return params;
}
