"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { DashboardSummary, Paginated, Reservation } from "@/types";
import { toNaiveDateString } from "@/lib/dates";

export interface MonthlyDataPoint {
  month: string;
  revenue: number;
  bookings: number;
}

export interface DashboardStats {
  todayAppointmentsCount: number;
  completedCount: number;
  cancelledCount: number;
  pendingCount: number;
  futurePendingCount: number;
  overduePendingCount: number;
  totalClientsCount: number;
  totalReservationsCount: number;
  revenueThisMonth: number | null;
  revenue: number | null;
  todayGrowth?: string;
  completedGrowth?: string;
  pendingGrowth?: string;
  clientsGrowth?: string;
  todaySchedule: Reservation[];
  upcomingPendingShortlist?: Reservation[];
  allRecentReservations?: Reservation[];
  allReservations?: Reservation[];
  summary: DashboardSummary | null;
}

export function useDashboardData() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardStats | null>(null);
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    try {
      setIsLoading(true);
      setError(null);

      const today = toNaiveDateString(new Date());

      const [summaryRes, scheduleRes] = await Promise.all([
        apiFetch<DashboardSummary>("/dashboard/summary"),
        apiFetch<Paginated<Reservation> | Reservation[]>(
          `/reservations?from=${today}&to=${today}&per_page=10&sort=start_time&direction=asc`
        ),
      ]);

      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      const todaySchedule = Array.isArray(scheduleRes)
        ? scheduleRes
        : (scheduleRes?.data ?? []);

      const stats: DashboardStats = {
        todayAppointmentsCount: summaryRes.today_reservations_count,
        completedCount: summaryRes.counts_by_status.completed,
        cancelledCount: summaryRes.counts_by_status.cancelled,
        pendingCount: summaryRes.counts_by_status.pending,
        futurePendingCount: summaryRes.upcoming_count,
        overduePendingCount: 0,
        totalClientsCount: summaryRes.total_clients,
        totalReservationsCount: summaryRes.total_reservations,
        revenueThisMonth: summaryRes.revenue,
        revenue: summaryRes.revenue,
        todaySchedule,
        allRecentReservations: todaySchedule,
        allReservations: todaySchedule,
        summary: summaryRes,
      };

      setData(stats);
    } catch (err: unknown) {
      if (currentRequestId === requestIdRef.current) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load dashboard data. Please check your connection."
        );
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch dashboard data on initial hook mount
    fetchData();

    const handleFocus = () => {
      fetchData();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchData]);

  return {
    isLoading,
    error,
    data,
    summary: data?.summary ?? null,
    todaySchedule: data?.todaySchedule ?? [],
    refetch: fetchData,
  };
}
