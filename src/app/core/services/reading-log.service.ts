import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  MarkReadingDayRequest,
  ReadingCalendar,
  ReadingStreak,
} from '../models/reading-log.model';

@Injectable({ providedIn: 'root' })
export class ReadingLogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reading-log`;

  calendar(year: number, month: number): Observable<ReadingCalendar> {
    return this.http.get<ReadingCalendar>(this.baseUrl, { params: { year, month } });
  }

  streak(): Observable<ReadingStreak> {
    return this.http.get<ReadingStreak>(`${this.baseUrl}/streak`);
  }

  mark(request: MarkReadingDayRequest): Observable<void> {
    return this.http.post<void>(this.baseUrl, request);
  }

  unmark(bookId: number, date: string): Observable<void> {
    return this.http.delete<void>(this.baseUrl, { params: { bookId, date } });
  }
}
