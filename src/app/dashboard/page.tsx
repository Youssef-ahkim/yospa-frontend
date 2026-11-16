"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { AlertCircle, RotateCcw } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCards } from "@/components/dashboard/StatCards";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { TransactionsTable } from "@/components/dashboard/TransactionsTable";
import { BestSellerCard } from "@/components/dashboard/BestSellerCard";

export default function DashboardPage() {
  const { user } = useAuth();
  const { isLoading, error, data, refetch } = useDashboardData();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, []);

  return (
    <div className="space-y-6 pb-6 text-[#33283D]">
      <DashboardHeader
        userName={user?.name}
        greeting={greeting}
        todayFormatted={todayFormatted}
        pendingCount={data?.pendingCount}
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-xs font-medium text-red-700">{error}</p>
          </div>
          <button
            onClick={refetch}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      <StatCards isLoading={isLoading} data={data} />

      <SalesChart data={data} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <TransactionsTable reservations={data?.allRecentReservations} />
        <BestSellerCard reservations={data?.allReservations} />
      </div>
    </div>
  );
}
