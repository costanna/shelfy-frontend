export interface BookReadingDuration {
  bookId: number;
  title: string;
  startedAt: string;
  finishedAt: string;
  daysReading: number;
}

export interface MonthlyReadCount {
  year: number;
  month: number;
  count: number;
}

export interface ReadingStats {
  totalBooksRead: number;
  totalBooks: number;
  readingDurations: BookReadingDuration[];
  booksByMonth: MonthlyReadCount[];
}
