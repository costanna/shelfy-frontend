export interface Review {
  id: number;
  rating: number;
  text: string | null;
  createdAt: string;
  bookId: number;
  authorName: string;
}

export interface ReviewRequest {
  rating: number;
  text: string | null;
}
