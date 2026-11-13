import { Reservation } from "@/types";

export const START_HOUR = 7;
export const END_HOUR = 22;
export const TOTAL_HOURS = END_HOUR - START_HOUR; // 15 hours
export const HOUR_HEIGHT = 64; // px per hour
export const WEEK_START_DAY = 1; // 1 = Monday

export interface EventSegment {
  reservation: Reservation;
  startMinutes: number; // minutes from START_HOUR (0 to TOTAL_HOURS * 60)
  endMinutes: number;
  top: number;
  height: number;
  isClampedStart: boolean;
  isClampedEnd: boolean;
}

export interface PositionedSegment extends EventSegment {
  colIndex: number;
  totalCols: number;
  widthPercent: number;
  leftPercent: number;
}

/**
 * Returns the start of the week (Monday at 00:00:00) for a given date.
 */
export function getStartOfWeek(date: Date, weekStartDay = WEEK_START_DAY): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 is Sunday, 1 is Monday...
  // Calculate difference to target weekStartDay
  const diff = (day < weekStartDay ? 7 : 0) + day - weekStartDay;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Add days to a date without mutating the original.
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Check if two dates represent the same calendar day.
 */
export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Format date for header in Day view: e.g. "Monday, Nov 9, 2026"
 */
export function formatDayHeader(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format date range for header in Week view: e.g. "Nov 9 – Nov 15, 2026"
 */
export function formatWeekHeader(startDate: Date): string {
  const endDate = addDays(startDate, 6);
  const startMonth = startDate.toLocaleDateString(undefined, { month: "short" });
  const endMonth = endDate.toLocaleDateString(undefined, { month: "short" });
  const year = endDate.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDate.getDate()} – ${endDate.getDate()}, ${year}`;
  }
  return `${startMonth} ${startDate.getDate()} – ${endMonth} ${endDate.getDate()}, ${year}`;
}

/**
 * Format time to display: e.g. "09:30" or "9:30 AM"
 */
export function formatTimeDisplay(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Convert Date to YYYY-MM-DDTHH:mm local ISO string for datetime input.
 */
export function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${y}-${m}-${d}T${h}:${min}`;
}

/**
 * Clamps multi-day and out-of-bounds reservations to a single day's 07:00-22:00 window.
 * Returns null if the reservation does not touch this day.
 */
export function getEventSegmentForDay(
  reservation: Reservation,
  dayDate: Date
): EventSegment | null {
  const resStart = new Date(reservation.start_time);
  const resEnd = new Date(reservation.end_time);

  // Day boundaries from 00:00 to 23:59:59.999
  const startOfDay = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999);

  // Does this reservation touch this day?
  if (resEnd <= startOfDay || resStart >= endOfDay) {
    return null;
  }

  // Visible window boundaries on this day: 07:00 to 22:00
  const windowStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), START_HOUR, 0, 0, 0);
  const windowEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), END_HOUR, 0, 0, 0);

  const isClampedStart = resStart < windowStart;
  const isClampedEnd = resEnd > windowEnd;

  // Clamp effective start and end to the visible 07:00-22:00 window
  const effectiveStart = resStart < windowStart ? windowStart : resStart;
  const effectiveEnd = resEnd > windowEnd ? windowEnd : resEnd;

  // Calculate minutes from START_HOUR
  let startMinutes = (effectiveStart.getTime() - windowStart.getTime()) / 60000;
  let endMinutes = (effectiveEnd.getTime() - windowStart.getTime()) / 60000;

  // Handle edge cases where event is entirely outside 07:00-22:00 on this day:
  // e.g. starts and ends before 07:00 or starts and ends after 22:00.
  // Instead of silently dropping, clamp to boundary with minimum height.
  if (resEnd <= windowStart) {
    startMinutes = 0;
    endMinutes = 24; // minimal visible slot at 07:00
  } else if (resStart >= windowEnd) {
    startMinutes = TOTAL_HOURS * 60 - 24;
    endMinutes = TOTAL_HOURS * 60; // minimal visible slot at 22:00
  } else {
    // Normal or partially clamped event
    startMinutes = Math.max(0, Math.min(TOTAL_HOURS * 60, startMinutes));
    endMinutes = Math.max(startMinutes + 15, Math.min(TOTAL_HOURS * 60, endMinutes));
  }

  const top = (startMinutes / 60) * HOUR_HEIGHT;
  const rawHeight = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;
  const height = Math.max(26, rawHeight);

  return {
    reservation,
    startMinutes,
    endMinutes,
    top,
    height,
    isClampedStart,
    isClampedEnd,
  };
}

/**
 * Groups events into overlap clusters and computes side-by-side layout (totalCols, colIndex, width, left).
 */
export function computeOverlapLayout(segments: EventSegment[]): PositionedSegment[] {
  if (segments.length === 0) return [];

  // Sort segments by start time ascending, then duration descending
  const sorted = [...segments].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes;
    }
    return (b.endMinutes - b.startMinutes) - (a.endMinutes - a.startMinutes);
  });

  // Step 1: Partition segments into connected overlap clusters
  const clusters: EventSegment[][] = [];
  let currentCluster: EventSegment[] = [];
  let currentClusterEnd = -1;

  for (const seg of sorted) {
    if (currentCluster.length === 0) {
      currentCluster.push(seg);
      currentClusterEnd = seg.endMinutes;
    } else if (seg.startMinutes < currentClusterEnd) {
      // Overlaps with the current cluster
      currentCluster.push(seg);
      currentClusterEnd = Math.max(currentClusterEnd, seg.endMinutes);
    } else {
      // Starts new cluster
      clusters.push(currentCluster);
      currentCluster = [seg];
      currentClusterEnd = seg.endMinutes;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Step 2: For each cluster, greedily assign columns and compute totalCols
  const positioned: PositionedSegment[] = [];

  for (const cluster of clusters) {
    // Columns track the end time of the last event placed in each column
    const columnEndTimes: number[] = [];
    const clusterPositions: { segment: EventSegment; colIndex: number }[] = [];

    for (const seg of cluster) {
      let placedCol = -1;
      for (let i = 0; i < columnEndTimes.length; i++) {
        if (columnEndTimes[i] <= seg.startMinutes) {
          placedCol = i;
          columnEndTimes[i] = seg.endMinutes;
          break;
        }
      }

      if (placedCol === -1) {
        placedCol = columnEndTimes.length;
        columnEndTimes.push(seg.endMinutes);
      }

      clusterPositions.push({ segment: seg, colIndex: placedCol });
    }

    const totalCols = Math.max(1, columnEndTimes.length);

    for (const item of clusterPositions) {
      const widthPercent = 100 / totalCols;
      const leftPercent = (item.colIndex / totalCols) * 100;

      positioned.push({
        ...item.segment,
        colIndex: item.colIndex,
        totalCols,
        widthPercent,
        leftPercent,
      });
    }
  }

  return positioned;
}

