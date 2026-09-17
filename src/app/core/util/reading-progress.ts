export function readingProgressPercent(currentPage: number | null, pageCount: number | null): number {
  if (!currentPage || !pageCount) {
    return 0;
  }
  return Math.min(100, Math.round((currentPage / pageCount) * 100));
}
