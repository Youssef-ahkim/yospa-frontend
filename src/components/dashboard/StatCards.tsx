"use client";

import { Calendar, CheckCircle2, Clock, Users, DollarSign } from "lucide-react";
import { DashboardStats } from "@/hooks/useDashboardData";
import { usePermissions } from "@/lib/permissions";
import { formatCurrency } from "@/lib/currency";

interface StatCardsProps {
  isLoading: boolean;
  data: DashboardStats | null;
  canSeeRevenue?: boolean;
}

export function StatCards({
  isLoading,
  data,
  canSeeRevenue: propCanSeeRevenue,
}: StatCardsProps) {
  const { canSeeRevenue: hookCanSeeRevenue } = usePermissions();
  const canSeeRevenue = propCanSeeRevenue ?? hookCanSeeRevenue;

  // Revenue card is strictly hidden for staff (where role cannot see revenue or revenue is null)
  const showRevenueCard = canSeeRevenue && (isLoading || (data && data.revenue !== null));

  if (isLoading) {
    const skeletonCount = canSeeRevenue ? 5 : 4;
    return (
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 ${
          canSeeRevenue ? "lg:grid-cols-5" : "lg:grid-cols-4"
        } gap-4`}
      >
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAE4F2] shadow-xs flex items-center gap-4 animate-pulse"
          >
            <div className="w-11 h-11 rounded-xl bg-gray-200 flex-shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-20 bg-gray-200 rounded" />
              <div className="h-6 w-16 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 ${
        showRevenueCard ? "lg:grid-cols-5" : "lg:grid-cols-4"
      } gap-4`}
    >
      {/* Card 1: Today's Bookings */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAE4F2] shadow-xs flex items-center gap-4 card-shadow-hover">
        <div className="w-11 h-11 rounded-xl bg-[#33283D] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#7A6F86] truncate">Today&apos;s Bookings</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl sm:text-2xl font-bold text-[#33283D] tabular-nums">
              {data?.todayAppointmentsCount ?? 0}
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
              {data?.completedCount ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Card 3: Pending confirmation */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAE4F2] shadow-xs flex items-center gap-4 card-shadow-hover">
        <div className="w-11 h-11 rounded-xl bg-[#FAF8FC] border border-[#C9B8E2] text-[#9275BC] flex items-center justify-center flex-shrink-0">
          <Clock className="w-5 h-5 text-[#9275BC]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#7A6F86] truncate">Pending confirmation</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl sm:text-2xl font-bold text-[#33283D] tabular-nums">
              {data?.pendingCount ?? 0}
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
              {data?.totalClientsCount ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Card 5: Revenue (this month) - strictly hidden for staff */}
      {showRevenueCard && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAE4F2] shadow-xs flex items-center gap-4 card-shadow-hover">
          <div className="w-11 h-11 rounded-xl bg-[#F0EAF7] text-[#7455A4] flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5 text-[#7455A4]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[#7A6F86] truncate" title="Revenue (this month)">
              Revenue (this month)
            </p>
            <div className="flex items-baseline mt-0.5">
              <span className="text-lg sm:text-xl xl:text-2xl font-bold text-[#33283D] tabular-nums whitespace-nowrap">
                {data?.revenue !== null && data?.revenue !== undefined
                  ? formatCurrency(data.revenue)
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
