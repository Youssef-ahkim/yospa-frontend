"use client";

import { Calendar, CheckCircle2, Clock, Users } from "lucide-react";
import { DashboardStats } from "@/hooks/useDashboardData";

interface StatCardsProps {
  isLoading: boolean;
  data: DashboardStats | null;
}

export function StatCards({ isLoading, data }: StatCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Today's Bookings */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAE4F2] shadow-xs flex items-center gap-4 card-shadow-hover">
        <div className="w-11 h-11 rounded-xl bg-[#33283D] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#7A6F86] truncate">Today&apos;s Bookings</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl sm:text-2xl font-bold text-[#33283D] tabular-nums">
              {isLoading ? "..." : data?.todayAppointmentsCount ?? 0}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#91A68D]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#91A68D]" />
              +2.5%
            </span>
          </div>
        </div>
      </div>

      {/* Card 2: Completed Bookings */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAE4F2] shadow-xs flex items-center gap-4 card-shadow-hover">
        <div className="w-11 h-11 rounded-xl bg-[#F0EAF7] text-[#7455A4] flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-[#7455A4]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#7A6F86] truncate">Completed Bookings</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl sm:text-2xl font-bold text-[#33283D] tabular-nums">
              {isLoading ? "..." : data?.completedCount ?? 0}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#91A68D]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#91A68D]" />
              +12%
            </span>
          </div>
        </div>
      </div>

      {/* Card 3: Pending Confirmation */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAE4F2] shadow-xs flex items-center gap-4 card-shadow-hover">
        <div className="w-11 h-11 rounded-xl bg-[#FAF8FC] border border-[#C9B8E2] text-[#9275BC] flex items-center justify-center flex-shrink-0">
          <Clock className="w-5 h-5 text-[#9275BC]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#7A6F86] truncate">Pending Reviews</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl sm:text-2xl font-bold text-[#33283D] tabular-nums">
              {isLoading ? "..." : data?.futurePendingCount ?? 0}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7455A4]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9B8E2]" />
              {data?.overduePendingCount ? `${data.overduePendingCount} overdue` : "On track"}
            </span>
          </div>
        </div>
      </div>

      {/* Card 4: Total Clients */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAE4F2] shadow-xs flex items-center gap-4 card-shadow-hover">
        <div className="w-11 h-11 rounded-xl bg-[#F0EAF7] text-[#7455A4] flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-[#7455A4]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#7A6F86] truncate">Total Spa Clients</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl sm:text-2xl font-bold text-[#33283D] tabular-nums">
              {isLoading ? "..." : data?.totalClientsCount ?? 0}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#91A68D]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#91A68D]" />
              +4.1%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
