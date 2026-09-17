import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { FeedItem } from '../models/feed.model';

@Injectable({ providedIn: 'root' })
export class FeedService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/feed`;

  list(limit = 30): Observable<FeedItem[]> {
    return this.http.get<FeedItem[]>(this.baseUrl, {
      params: new HttpParams().set('limit', limit),
    });
  }
}
