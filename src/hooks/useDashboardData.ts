"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Client, Reservation } from "@/types";
import { isToday, isThisMonth } from "@/lib/dates";
import { parsePrice } from "@/lib/currency";
import {
  getTodayGrowth,
  getCompletedGrowth,
  getClientsGrowth,
} from "@/lib/analytics";

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
  revenueThisMonth: number;
  todayGrowth: string;
  completedGrowth: string;
  pendingGrowth: string;
  clientsGrowth: string;
  todaySchedule: Reservation[];
  upcomingPendingShortlist: Reservation[];
  allRecentReservations: Reservation[];
  allReservations: Reservation[];
  recentClients: Client[];
  allClients: Client[];
  totalReservationsCount: number;
  topService: {
    name: string;
    duration: number;
    price: number;
    bookingsCount: number;
  } | null;
  monthlyTrend: MonthlyDataPoint[];
}

export function useDashboardData() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardStats | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [clients, reservations] = await Promise.all([
        apiFetch<Client[]>("/clients"),
        apiFetch<Reservation[]>("/reservations"),
      ]);

      const now = new Date();

      // 1. Today's appointments (excluding cancelled)
      const todayAppointmentsCount = reservations.filter(
        (r) => isToday(r.start_time, now) && r.status !== "cancelled"
      ).length;

      // 2. Completed & Cancelled count
      const completedCount = reservations.filter((r) => r.status === "completed").length;
      const cancelledCount = reservations.filter((r) => r.status === "cancelled").length;

      // 3. Pending reservations split into future vs overdue
      const allPending = reservations.filter((r) => r.status === "pending");
      const futurePending = allPending.filter((r) => new Date(r.start_time) >= now);
      const overduePending = allPending.filter((r) => new Date(r.start_time) < now);

      // 4. Revenue this month (completed appointments only)
      const revenueThisMonth = reservations
        .filter((r) => r.status === "completed" && isThisMonth(r.start_time, now))
        .reduce((sum, r) => sum + parsePrice(r.total_price), 0);

      // 5. Today's schedule sorted chronologically
      const todaySchedule = reservations
        .filter((r) => isToday(r.start_time, now))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      // 6. Upcoming pending shortlist
      const upcomingPendingShortlist = futurePending
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .slice(0, 5);

      // 7. Recent reservations (most recent first, for the table)
      const allRecentReservations = [...reservations]
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
        .slice(0, 8);

      // 8. Recent clients
      const recentClients = clients.slice(0, 5);

      // 9. Top service calculation
      const serviceMap = new Map<string, { name: string; duration: number; price: number; count: number }>();
      reservations.forEach((r) => {
        if (r.service?.name) {
          const key = r.service.name;
          const curr = serviceMap.get(key) || {
            name: key,
            duration: r.service.duration_minutes || 60,
            price: parsePrice(r.service.price),
            count: 0,
          };
          curr.count += 1;
          serviceMap.set(key, curr);
        }
      });
      let topService: DashboardStats["topService"] = null;
      let maxCount = -1;
      serviceMap.forEach((val) => {
        if (val.count > maxCount) {
          maxCount = val.count;
          topService = {
            name: val.name,
            duration: val.duration,
            price: val.price,
            bookingsCount: val.count,
          };
        }
      });

      // 10. 12-Month trend aggregation
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const currentYear = now.getFullYear();
      const monthlyBuckets = months.map((m) => ({ month: m, revenue: 0, bookings: 0 }));

      reservations.forEach((r) => {
        const d = new Date(r.start_time);
        if (d.getFullYear() === currentYear) {
          const mIdx = d.getMonth();
          if (mIdx >= 0 && mIdx < 12) {
            monthlyBuckets[mIdx].bookings += 1;
            if (r.status === "completed") {
              monthlyBuckets[mIdx].revenue += parsePrice(r.total_price);
            }
          }
        }
      });

      const todayGrowth = getTodayGrowth(reservations, now);
      const completedGrowth = getCompletedGrowth(reservations, now);
      const pendingGrowth = "—";
      const clientsGrowth = getClientsGrowth(clients, now);

      setData({
        todayAppointmentsCount,
        completedCount,
        cancelledCount,
        pendingCount: allPending.length,
        futurePendingCount: futurePending.length,
        overduePendingCount: overduePending.length,
        totalClientsCount: clients.length,
        revenueThisMonth,
        todayGrowth,
        completedGrowth,
        pendingGrowth,
        clientsGrowth,
        todaySchedule,
        upcomingPendingShortlist,
        allRecentReservations,
        allReservations: reservations,
        recentClients,
        allClients: clients,
        totalReservationsCount: reservations.length,
        topService,
        monthlyTrend: monthlyBuckets,
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
