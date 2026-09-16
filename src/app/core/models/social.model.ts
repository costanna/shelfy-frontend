import { BookStatus } from './book.model';
import { Category } from './category.model';

export interface UserSummary {
  id: number;
  alias: string | null;
  name: string;
  avatarUpdatedAt: string | null;
  followersCount: number;
  followedByMe: boolean;
}

export interface PublicReview {
  id: number;
  rating: number;
  text: string | null;
  createdAt: string;
}

export interface PublicBook {
  id: number;
  title: string;
  author: string | null;
  coverUrl: string | null;
  synopsis: string | null;
  pageCount: number | null;
  status: BookStatus;
  categories: Category[];
  reviews: PublicReview[];
}

export interface UserProfile {
  id: number;
  alias: string | null;
  name: string;
  avatarUpdatedAt: string | null;
  followersCount: number;
  followingCount: number;
  followedByMe: boolean;
  own: boolean;
  visible: boolean;
  books: PublicBook[];
}
