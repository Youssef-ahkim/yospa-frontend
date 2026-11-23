/**
 * Date helper utilities evaluated in local wall-clock time.
 * 'now' is evaluated at call/render time to avoid stale module-level caching.
 */

/**
 * Parses naive local datetime strings ("YYYY-MM-DDTHH:mm:ss" or "YYYY-MM-DD HH:mm:ss")
 * as local wall-clock time without UTC or timezone offset adjustments.
 */
export function parseNaiveDateTime(dateInput: string | Date): Date {
  if (dateInput instanceof Date) return dateInput;
  if (!dateInput) return new Date(NaN);

  const str = String(dateInput).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, y, m, d, h, min, s] = match;
    return new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(h),
      Number(min),
      s ? Number(s) : 0
    );
  }
  const dateOnlyMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, y, m, d] = dateOnlyMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return new Date(str);
}

export function isToday(dateStr: string | Date, now = new Date()): boolean {
  if (!dateStr) return false;
  const d = parseNaiveDateTime(dateStr);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function isThisMonth(dateStr: string | Date, now = new Date()): boolean {
  if (!dateStr) return false;
  const d = parseNaiveDateTime(dateStr);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth()
  );
}

export function isPast(dateStr: string | Date, now = new Date()): boolean {
  if (!dateStr) return false;
  return parseNaiveDateTime(dateStr) < now;
}

export function isFuture(dateStr: string | Date, now = new Date()): boolean {
  if (!dateStr) return false;
  return parseNaiveDateTime(dateStr) >= now;
}

export function formatTime24(dateStr: string | Date): string {
  if (!dateStr) return "--:--";
  const d = parseNaiveDateTime(dateStr);
  if (isNaN(d.getTime())) return "--:--";
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatShortDateTime24(dateStr: string | Date): string {
  if (!dateStr) return "N/A";
  const d = parseNaiveDateTime(dateStr);
  if (isNaN(d.getTime())) return "N/A";
  const month = d.toLocaleDateString(undefined, { month: "short" });
  const day = d.getDate();
  const time = formatTime24(d);
  return `${month} ${day}, ${time}`;
}

