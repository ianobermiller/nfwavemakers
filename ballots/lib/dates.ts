/** Local calendar date as `YYYY-MM-DD` (avoids UTC shift from `toISOString`). */
export function formatLocalYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * The next Tuesday on or after `from` (today when `from` is already a Tuesday),
 * as a local `YYYY-MM-DD` string for `<input type="date">`.
 */
export function nextTuesdayDate(from: Date = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const day = date.getDay(); // 0 Sun … 2 Tue
  const daysUntilTuesday = (2 - day + 7) % 7;
  date.setDate(date.getDate() + daysUntilTuesday);
  return formatLocalYmd(date);
}
