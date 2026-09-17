/** Formats a year/month pair as a capitalized, locale-aware label (e.g. "Septiembre de 2026"). */
export function formatMonthLabel(year: number, month: number, locale: string): string {
  const date = new Date(year, month - 1, 1);
  const label = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}
