/**
 * Shared date/time formatting utilities.
 * Standardizes all date display across the application to 'en-IN' locale.
 */

/**
 * Format a date string to "dd Mon yyyy" format (e.g., "12 Mar 2026").
 * Appends T00:00:00 to date-only strings to prevent timezone offset issues.
 * @param {string|Date|null} value
 * @returns {string}
 */
// Start Update 12 September 2026, by @WNP: Accept an optional UI locale for bilingual document dates.
export function formatDate(value, locale = 'en-IN') {
    if (!value) return '-';
    let date;
    if (typeof value === 'string') {
        // Date-only strings (YYYY-MM-DD) need T00:00:00 to prevent timezone offset
        date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`);
    } else {
        date = new Date(value);
    }
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

/**
 * Format a datetime string to "dd Mon yyyy, hh:mm" format.
 * @param {string|Date|null} value
 * @returns {string}
 */
// Start Update 12 September 2026, by @WNP: Accept an optional UI locale for bilingual upload timestamps.
export function formatDateTime(value, locale = 'en-IN') {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Format a date/time as a relative "time ago" string for recent items,
 * falling back to short date for older items.
 * @param {string|Date} value
 * @returns {string}
 */
// Start Update 15 September 2026, by @WNP: Format notification relative time with the selected UI locale.
export function formatRelativeTime(value, locale = 'en-US') {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const now = new Date();
    const diffMs = now - date;

    const relativeTime = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (diffMs < 60000) return relativeTime.format(0, 'second');
    if (diffMs < 3600000) return relativeTime.format(-Math.floor(diffMs / 60000), 'minute');
    if (diffMs < 86400000) return relativeTime.format(-Math.floor(diffMs / 3600000), 'hour');
    if (diffMs < 604800000) return relativeTime.format(-Math.floor(diffMs / 86400000), 'day');
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}
