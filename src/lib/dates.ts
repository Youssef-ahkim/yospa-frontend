/**
 * Date helper utilities evaluated in local timezone.
 * 'now' is evaluated at call/render time to avoid stale module-level caching.
 */

export function isToday(dateStr: string | Date, now = new Date()): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function isThisMonth(dateStr: string | Date, now = new Date()): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth()
  );
}

export function isPast(dateStr: string | Date, now = new Date()): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < now;
}

export function isFuture(dateStr: string | Date, now = new Date()): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) >= now;
}

export function formatTime24(dateStr: string | Date): string {
  if (!dateStr) return "--:--";
  const d = new Date(dateStr);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatShortDateTime24(dateStr: string | Date): string {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  const month = d.toLocaleDateString(undefined, { month: "short" });
  const day = d.getDate();
  const time = formatTime24(d);
  return `${month} ${day}, ${time}`;
}

