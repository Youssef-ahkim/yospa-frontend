// src/lib/analytics.ts
// Pure helper functions for dashboard analytics – no side effects, no JSX.

import { Client, Reservation } from "@/types";

export type TimeRange = "1d" | "7d" | "30d" | "month" | "all";

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
  // Check if payload actually contains created_at
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
