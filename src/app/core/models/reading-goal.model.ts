export interface ReadingGoal {
  year: number;
  targetBooks: number | null;
  booksRead: number;
}

export interface ReadingGoalRequest {
  targetBooks: number;
}
