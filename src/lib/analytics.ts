// src/lib/analytics.ts
// Pure helper functions for dashboard analytics – no side effects, no JSX.

import { Client, Reservation } from "@/types";

export type TimeRange = "1d" | "7d" | "30d" | "12m" | "max";

export interface ChartPoint {
  name: string;
  fullLabel: string;
  revenue: number;
  bookings: number;
}

export interface ChartSeriesResult {
  currentBuckets: ChartPoint[];
  previousBuckets: ChartPoint[];
  currentTotalRevenue: number;
  currentTotalBookings: number;
  previousTotalRevenue: number;
  previousTotalBookings: number;
}

/** Safely parse any price / string to number */
export function parsePrice(val: unknown): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const n = parseFloat(String(val || 0));
  return isNaN(n) ? 0 : n;
}

/** Compute growth percentage string. Returns "—" when previous is 0. */
export function computeGrowth(current: number, previous: number): string {
  if (previous === 0 || !previous) return "—";
  const diff = Math.round(((current - previous) / previous) * 100);
  return diff >= 0 ? `+${diff}%` : `${diff}%`;
}

/** Growth for today's bookings vs the same weekday last week */
export function getTodayGrowth(reservations: Reservation[], now = new Date()): string {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const startOfLastWeek = new Date(startOfToday);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
  const endOfLastWeek = new Date(endOfToday);
  endOfLastWeek.setDate(endOfLastWeek.getDate() - 7);

  const currentCount = reservations.filter((r) => {
    if (r.status === "cancelled") return false;
    const d = new Date(r.start_time);
    return d >= startOfToday && d <= endOfToday;
  }).length;

  const previousCount = reservations.filter((r) => {
    if (r.status === "cancelled") return false;
    const d = new Date(r.start_time);
    return d >= startOfLastWeek && d <= endOfLastWeek;
  }).length;

  return computeGrowth(currentCount, previousCount);
}

/** Growth for completed bookings vs previous equal period (default 30 days) */
export function getCompletedGrowth(reservations: Reservation[], now = new Date(), days = 30): string {
  const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);

  const currentCount = reservations.filter((r) => {
    if (r.status !== "completed") return false;
    const d = new Date(r.start_time);
    return d >= currentStart && d <= now;
  }).length;

  const previousCount = reservations.filter((r) => {
    if (r.status !== "completed") return false;
    const d = new Date(r.start_time);
    return d >= previousStart && d < currentStart;
  }).length;

  return computeGrowth(currentCount, previousCount);
}

/** Growth for clients: only if created_at is in the payload, else "—" */
export function getClientsGrowth(clients: Client[], now = new Date(), days = 30): string {
  if (!clients.length) return "—";
  const hasCreatedAt = clients.every((c) => Boolean(c.created_at));
  if (!hasCreatedAt) return "—";

  const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);

  const currentCount = clients.filter((c) => {
    const d = new Date(c.created_at!);
    return d >= currentStart && d <= now;
  }).length;

  const previousCount = clients.filter((c) => {
    const d = new Date(c.created_at!);
    return d >= previousStart && d < currentStart;
  }).length;

  return computeGrowth(currentCount, previousCount);
}

/** Format reservation order ID as CTG#### */
export function formatOrderId(id: number): string {
  return `CTG${String(id).padStart(4, "0")}`;
}

/**
 * Generate aligned current and previous period series for sales chart.
 * Strictly uses local timezone, zero libraries, and parses total_price safely.
 */
export function getChartSeries(
  reservations: Reservation[] = [],
  range: TimeRange = "7d",
  now = new Date()
): ChartSeriesResult {
  const completed = reservations.filter((r) => r.status === "completed");

  const currentBuckets: ChartPoint[] = [];
  const previousBuckets: ChartPoint[] = [];

  if (range === "1d") {
    // 24 hours of today vs yesterday
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    for (let h = 0; h < 24; h++) {
      currentBuckets.push({
        name: `${h}h`,
        fullLabel: `${String(h).padStart(2, "0")}:00 Today`,
        revenue: 0,
        bookings: 0,
      });
      previousBuckets.push({
        name: `${h}h`,
        fullLabel: `${String(h).padStart(2, "0")}:00 Yesterday`,
        revenue: 0,
        bookings: 0,
      });
    }

    completed.forEach((r) => {
      const d = new Date(r.start_time);
      const price = parsePrice(r.total_price);
      if (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      ) {
        const h = d.getHours();
        if (h >= 0 && h < 24) {
          currentBuckets[h].revenue += price;
          currentBuckets[h].bookings += 1;
        }
      } else if (
        d.getFullYear() === yesterday.getFullYear() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getDate() === yesterday.getDate()
      ) {
        const h = d.getHours();
        if (h >= 0 && h < 24) {
          previousBuckets[h].revenue += price;
          previousBuckets[h].bookings += 1;
        }
      }
    });
  } else if (range === "7d" || range === "30d") {
    const numDays = range === "7d" ? 7 : 30;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const currDays: { date: Date; bucket: ChartPoint }[] = [];
    const prevDays: { date: Date; bucket: ChartPoint }[] = [];

    for (let i = numDays - 1; i >= 0; i--) {
      const currDay = new Date(startOfToday);
      currDay.setDate(currDay.getDate() - i);

      const prevDay = new Date(currDay);
      prevDay.setDate(prevDay.getDate() - numDays);

      const dayName = currDay.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const fullLabelCurr = currDay.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const fullLabelPrev = prevDay.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const currPt: ChartPoint = {
        name: dayName,
        fullLabel: fullLabelCurr,
        revenue: 0,
        bookings: 0,
      };
      const prevPt: ChartPoint = {
        name: dayName,
        fullLabel: fullLabelPrev,
        revenue: 0,
        bookings: 0,
      };

      currentBuckets.push(currPt);
      previousBuckets.push(prevPt);

      currDays.push({ date: currDay, bucket: currPt });
      prevDays.push({ date: prevDay, bucket: prevPt });
    }

    completed.forEach((r) => {
      const d = new Date(r.start_time);
      const price = parsePrice(r.total_price);
      const resMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

      for (const item of currDays) {
        if (item.date.getTime() === resMidnight) {
          item.bucket.revenue += price;
          item.bucket.bookings += 1;
          break;
        }
      }
      for (const item of prevDays) {
        if (item.date.getTime() === resMidnight) {
          item.bucket.revenue += price;
          item.bucket.bookings += 1;
          break;
        }
      }
    });
  } else if (range === "12m") {
    const currMonths: { year: number; month: number; bucket: ChartPoint }[] = [];
    const prevMonths: { year: number; month: number; bucket: ChartPoint }[] = [];

    for (let i = 11; i >= 0; i--) {
      const currMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - i - 12, 1);

      const monthName = currMonth.toLocaleDateString(undefined, { month: "short" });
      const fullLabelCurr = currMonth.toLocaleDateString(undefined, { month: "short", year: "numeric" });
      const fullLabelPrev = prevMonth.toLocaleDateString(undefined, { month: "short", year: "numeric" });

      const currPt: ChartPoint = {
        name: monthName,
        fullLabel: fullLabelCurr,
        revenue: 0,
        bookings: 0,
      };
      const prevPt: ChartPoint = {
        name: monthName,
        fullLabel: fullLabelPrev,
        revenue: 0,
        bookings: 0,
      };

      currentBuckets.push(currPt);
      previousBuckets.push(prevPt);

      currMonths.push({
        year: currMonth.getFullYear(),
        month: currMonth.getMonth(),
        bucket: currPt,
      });
      prevMonths.push({
        year: prevMonth.getFullYear(),
        month: prevMonth.getMonth(),
        bucket: prevPt,
      });
    }

    completed.forEach((r) => {
      const d = new Date(r.start_time);
      const price = parsePrice(r.total_price);
      const y = d.getFullYear();
      const m = d.getMonth();

      for (const item of currMonths) {
        if (item.year === y && item.month === m) {
          item.bucket.revenue += price;
          item.bucket.bookings += 1;
          break;
        }
      }
      for (const item of prevMonths) {
        if (item.year === y && item.month === m) {
          item.bucket.revenue += price;
          item.bucket.bookings += 1;
          break;
        }
      }
    });
  } else if (range === "max") {
    let earliestDate = now;
    completed.forEach((r) => {
      const d = new Date(r.start_time);
      if (d < earliestDate) earliestDate = d;
    });

    const startMonth = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
    const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthDiff =
      (endMonth.getFullYear() - startMonth.getFullYear()) * 12 +
      (endMonth.getMonth() - startMonth.getMonth());
    const count = Math.max(monthDiff + 1, 6);

    const monthList: { year: number; month: number; bucket: ChartPoint }[] = [];

    for (let i = count - 1; i >= 0; i--) {
      const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = mDate.toLocaleDateString(undefined, { month: "short" });
      const fullLabel = mDate.toLocaleDateString(undefined, { month: "short", year: "numeric" });

      const pt: ChartPoint = {
        name: monthName,
        fullLabel,
        revenue: 0,
        bookings: 0,
      };
      currentBuckets.push(pt);
      previousBuckets.push({
        name: monthName,
        fullLabel: "",
        revenue: 0,
        bookings: 0,
      });

      monthList.push({
        year: mDate.getFullYear(),
        month: mDate.getMonth(),
        bucket: pt,
      });
    }

    completed.forEach((r) => {
      const d = new Date(r.start_time);
      const price = parsePrice(r.total_price);
      const y = d.getFullYear();
      const m = d.getMonth();

      for (const item of monthList) {
        if (item.year === y && item.month === m) {
          item.bucket.revenue += price;
          item.bucket.bookings += 1;
          break;
        }
      }
    });
  }

  const currentTotalRevenue = currentBuckets.reduce((acc, b) => acc + b.revenue, 0);
  const currentTotalBookings = currentBuckets.reduce((acc, b) => acc + b.bookings, 0);

  const previousTotalRevenue = previousBuckets.reduce((acc, b) => acc + b.revenue, 0);
  const previousTotalBookings = previousBuckets.reduce((acc, b) => acc + b.bookings, 0);

  return {
    currentBuckets,
    previousBuckets,
    currentTotalRevenue,
    currentTotalBookings,
    previousTotalRevenue,
    previousTotalBookings,
  };
}
