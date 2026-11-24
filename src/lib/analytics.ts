// src/lib/analytics.ts
// Pure helper functions for dashboard analytics – no side effects, no JSX.

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

/** Format reservation order ID as CTG#### */
export function formatOrderId(id: number): string {
  return `CTG${String(id).padStart(4, "0")}`;
}
