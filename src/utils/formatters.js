/**
 * Convert minutes-since-midnight to HH:MM string.
 */
export function minutesToHHMM(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Format a date string (YYYY-MM-DD) to a short day name (Mon, Tue...).
 */
export function toDayName(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short' });
}

/**
 * Format a date string to a short date (1 Jun).
 */
export function toShortDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/**
 * Extract HH:MM from a timestamp string.
 */
export function timestampToHHMM(ts) {
  return ts.slice(11, 16);
}
