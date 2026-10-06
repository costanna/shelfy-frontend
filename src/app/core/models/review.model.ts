export interface Review {
  id: number;
  rating: number;
  text: string | null;
  createdAt: string;
  bookId: number;
  authorName: string;
  likesCount: number;
  likedByMe: boolean;
}

export interface ReviewRequest {
  rating: number;
  text: string | null;
}

export interface ReviewComment {
  id: number;
  text: string;
  createdAt: string;
  authorId: number;
  authorName: string;
}

export interface ReviewCommentRequest {
  text: string;
}
