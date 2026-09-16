export interface BookNote {
  id: number;
  content: string;
  pageReference: number | null;
  createdAt: string;
  bookId: number;
}

export interface NoteRequest {
  content: string;
  pageReference: number | null;
}
