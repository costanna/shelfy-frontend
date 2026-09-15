import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { UserProfile, UserSummary } from '../models/social.model';

@Injectable({ providedIn: 'root' })
export class FollowService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  search(query: string): Observable<UserSummary[]> {
    return this.http.get<UserSummary[]>(`${this.baseUrl}/search`, { params: { q: query } });
  }

  profile(userId: number): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/${userId}/profile`);
  }

  follow(userId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${userId}/follow`, {});
  }

  unfollow(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${userId}/follow`);
  }
}
