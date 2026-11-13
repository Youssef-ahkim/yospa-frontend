"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Client, Reservation } from "@/types";
import { isToday, isThisMonth } from "@/lib/dates";
import { parsePrice } from "@/lib/currency";

export interface DashboardStats {
  todayAppointmentsCount: number;
  futurePendingCount: number;
  overduePendingCount: number;
  totalClientsCount: number;
  revenueThisMonth: number;
  todaySchedule: Reservation[];
  upcomingPendingShortlist: Reservation[];
  recentClients: Client[];
  totalReservationsCount: number;
}

export function useDashboardData() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardStats | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch clients and reservations in parallel.
      // If either fails, Promise.all rejects so we don't display a partial dashboard.
      const [clients, reservations] = await Promise.all([
        apiFetch<Client[]>("/clients"),
        apiFetch<Reservation[]>("/reservations"),
      ]);

      // Reference time computed at render/fetch time
      const now = new Date();

      // 1. Today's appointments (excluding cancelled)
      const todayAppointmentsCount = reservations.filter(
        (r) => isToday(r.start_time, now) && r.status !== "cancelled"
      ).length;

      // 2. Pending reservations split into future (shortlist eligible) vs overdue
      const allPending = reservations.filter((r) => r.status === "pending");
      const futurePending = allPending.filter((r) => new Date(r.start_time) >= now);
      const overduePending = allPending.filter((r) => new Date(r.start_time) < now);

      // 3. Revenue this month (completed appointments only)
      const revenueThisMonth = reservations
        .filter((r) => r.status === "completed" && isThisMonth(r.start_time, now))
        .reduce((sum, r) => sum + parsePrice(r.total_price), 0);

      // 4. Today's schedule sorted chronologically by start_time
      const todaySchedule = reservations
        .filter((r) => isToday(r.start_time, now))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      // 5. Upcoming pending shortlist (next 5 future pending reservations)
      const upcomingPendingShortlist = futurePending
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .slice(0, 5);

      // 6. Recent clients
      const recentClients = clients.slice(0, 5);

      setData({
        todayAppointmentsCount,
        futurePendingCount: futurePending.length,
        overduePendingCount: overduePending.length,
        totalClientsCount: clients.length,
        revenueThisMonth,
        todaySchedule,
        upcomingPendingShortlist,
        recentClients,
        totalReservationsCount: reservations.length,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard data. Please check your connection.");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    isLoading,
    error,
    data,
    refetch: fetchData,
  };
}

