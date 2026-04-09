/**
 * Timezone utilities — all display locked to US Central Time (America/Chicago).
 * CST = UTC-6  |  CDT = UTC-5 (DST observed automatically)
 */

export const TZ = 'America/Chicago';

/**
 * Returns the current local date string in 'YYYY-MM-DD' format for Central Time.
 * Avoids the UTC-offset trap of `new Date().toISOString().slice(0, 10)`.
 *
 * @param {Date} [date] - defaults to now
 * @returns {string} e.g. "2026-04-08"
 */
export function localDateStr(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  // en-CA locale gives ISO-style YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
}

/**
 * Formats a Date (or date string) for display using Central Time.
 *
 * @param {Date|string} date
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function formatDate(date, options = {}) {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...options }).format(d);
}

/**
 * Formats a time portion for display (e.g. "3:30 PM") using Central Time.
 *
 * @param {Date|string} date
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function formatTime(date, options = { hour: 'numeric', minute: '2-digit', hour12: true }) {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...options }).format(d);
}

/**
 * Formats a full date + time (e.g. "Apr 8, 2026, 3:30 PM") using Central Time.
 *
 * @param {Date|string} date
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function formatDateTime(date, options = {}) {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options,
  }).format(d);
}
