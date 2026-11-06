/** Formatting helpers. Only call the locale-dependent ones in the browser (after mount). */

const dateTime = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const fullDateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'full',
  timeStyle: 'long',
});

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

/** "Nov 6, 2026, 4:30 PM" in the browser's time zone. */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

/** "Friday, November 6, 2026 at 4:30:12 PM GMT+5" for tooltips. */
export function formatFullDateTime(iso: string): string {
  return fullDateTime.format(new Date(iso));
}

/** "2 minutes ago", "yesterday", relative to `now`. */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return 'just now';
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute');
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), 'hour');
  return relative.format(Math.round(seconds / 86_400), 'day');
}

/** Server-safe, time-zone independent placeholder (UTC date) used before mount. */
export function isoDatePart(iso: string): string {
  return iso.slice(0, 10);
}

/** "1 mailbox", "10 mailboxes". */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** First letters of up to two words, for avatars. */
export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}
