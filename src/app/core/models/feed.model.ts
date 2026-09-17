export type FeedItemType = 'STARTED_READING' | 'FINISHED_READING' | 'REVIEWED';

export interface FeedItem {
  type: FeedItemType;
  actorId: number;
  actorAlias: string | null;
  actorName: string;
  bookId: number;
  bookTitle: string;
  bookCoverUrl: string | null;
  rating: number | null;
  occurredAt: string;
}
