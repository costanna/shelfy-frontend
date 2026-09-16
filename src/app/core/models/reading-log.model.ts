export interface ReadingLogBook {
  id: number;
  title: string;
  coverUrl: string | null;
}

export interface ReadingDay {
  date: string;
  books: ReadingLogBook[];
}

export interface ReadingCalendar {
  year: number;
  month: number;
  days: ReadingDay[];
}

export interface ReadingStreak {
  currentStreak: number;
  longestStreak: number;
}

export interface MarkReadingDayRequest {
  bookId: number;
  date: string;
}
