"use client";

import Link from "next/link";
import { Calendar, Bell, ChevronDown } from "lucide-react";

interface DashboardHeaderProps {
  userName?: string;
  greeting: string;
  todayFormatted: string;
  pendingCount?: number;
}

export function DashboardHeader({
  userName,
  greeting,
  todayFormatted,
  pendingCount = 0,
}: DashboardHeaderProps) {
  const firstName = userName?.trim() ? userName.trim().split(" ")[0] : "there";
  const initial = userName?.trim() ? userName.trim()[0].toUpperCase() : "U";

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-[#33283D] tracking-tight">
          {greeting}, {firstName}!
        </h1>
        <p className="text-xs sm:text-sm text-[#7A6F86] mt-1">
          Here&apos;s what&apos;s happening with your spa today
        </p>
      </div>

      {/* Right header controls */}
      <div className="flex items-center gap-3">
        {/* Date chip */}
        <div className="flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl border border-[#EAE4F2] text-xs font-semibold text-[#33283D] shadow-xs">
          <Calendar className="w-3.5 h-3.5 text-[#7455A4]" />
          <span>{todayFormatted}</span>
        </div>

        {/* Notification bell linking to pending reservations with dynamic badge */}
        <Link
          href="/dashboard/reservations?status=pending"
          className="relative p-2.5 bg-white rounded-xl border border-[#EAE4F2] text-[#33283D] hover:bg-[#F0EAF7] hover:border-[#C9B8E2] transition-colors cursor-pointer shadow-xs inline-flex items-center justify-center"
          aria-label="Pending reservations"
        >
          <Bell className="w-4 h-4 text-[#33283D]" />
          {pendingCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#7455A4] ring-2 ring-white" />
          )}
        </Link>

        {/* Profile pill */}
        <div className="flex items-center gap-2 pl-1 pr-2 py-1 bg-white rounded-xl border border-[#EAE4F2] shadow-xs">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7455A4] to-[#9275BC] text-white flex items-center justify-center text-xs font-bold shadow-xs">
            {initial}
          </div>
          <span className="text-xs font-semibold text-[#33283D] hidden sm:inline max-w-[100px] truncate">
            {userName?.trim() ? firstName : "Admin"}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-[#7A6F86]" />
        </div>
      </div>
    </div>
  );
}
