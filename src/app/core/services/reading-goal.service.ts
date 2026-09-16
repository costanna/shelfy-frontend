import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ReadingGoal, ReadingGoalRequest } from '../models/reading-goal.model';

@Injectable({ providedIn: 'root' })
export class ReadingGoalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reading-goals`;

  getCurrent(): Observable<ReadingGoal> {
    return this.http.get<ReadingGoal>(`${this.baseUrl}/current`);
  }

  setCurrent(request: ReadingGoalRequest): Observable<ReadingGoal> {
    return this.http.put<ReadingGoal>(`${this.baseUrl}/current`, request);
  }
}
