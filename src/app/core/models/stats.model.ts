export interface BookReadingDuration {
  bookId: number;
  title: string;
  startedAt: string;
  finishedAt: string;
  daysReading: number;
  /** False for an archived past read (e.g. before a re-read) — its dates can't be edited here. */
  current: boolean;
}

export interface MonthlyReadCount {
  year: number;
  month: number;
  count: number;
}

export interface ReadingStats {
  totalBooksRead: number;
  totalBooks: number;
  currentlyReading: number;
  readingDurations: BookReadingDuration[];
  booksByMonth: MonthlyReadCount[];
}
