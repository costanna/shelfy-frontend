import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { FeedItem } from '../models/feed.model';

@Injectable({ providedIn: 'root' })
export class FeedService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/feed`;

  list(limit = 30, before?: string): Observable<FeedItem[]> {
    let params = new HttpParams().set('limit', limit);
    if (before) {
      params = params.set('before', before);
    }
    return this.http.get<FeedItem[]>(this.baseUrl, { params });
  }
}
