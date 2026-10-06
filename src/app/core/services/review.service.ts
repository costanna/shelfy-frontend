import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Review, ReviewComment, ReviewCommentRequest, ReviewRequest } from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);

  list(bookId: number): Observable<Review[]> {
    return this.http.get<Review[]>(this.urlFor(bookId));
  }

  create(bookId: number, request: ReviewRequest): Observable<Review> {
    return this.http.post<Review>(this.urlFor(bookId), request);
  }

  update(bookId: number, reviewId: number, request: ReviewRequest): Observable<Review> {
    return this.http.put<Review>(`${this.urlFor(bookId)}/${reviewId}`, request);
  }

  delete(bookId: number, reviewId: number): Observable<void> {
    return this.http.delete<void>(`${this.urlFor(bookId)}/${reviewId}`);
  }

  like(reviewId: number): Observable<Review> {
    return this.http.post<Review>(`${environment.apiUrl}/reviews/${reviewId}/like`, {});
  }

  unlike(reviewId: number): Observable<Review> {
    return this.http.delete<Review>(`${environment.apiUrl}/reviews/${reviewId}/like`);
  }

  comments(reviewId: number): Observable<ReviewComment[]> {
    return this.http.get<ReviewComment[]>(`${environment.apiUrl}/reviews/${reviewId}/comments`);
  }

  addComment(reviewId: number, request: ReviewCommentRequest): Observable<ReviewComment> {
    return this.http.post<ReviewComment>(`${environment.apiUrl}/reviews/${reviewId}/comments`, request);
  }

  deleteComment(reviewId: number, commentId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/reviews/${reviewId}/comments/${commentId}`);
  }

  private urlFor(bookId: number): string {
    return `${environment.apiUrl}/books/${bookId}/reviews`;
  }
}
