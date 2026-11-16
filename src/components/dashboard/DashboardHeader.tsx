"use client";

import { Calendar, Bell, ChevronDown } from "lucide-react";

interface DashboardHeaderProps {
  userName?: string;
  greeting: string;
  todayFormatted: string;
}

export function DashboardHeader({
  userName,
  greeting,
  todayFormatted,
}: DashboardHeaderProps) {
  const firstName = userName ? userName.split(" ")[0] : "Jonathan";
  const initial = userName ? userName[0].toUpperCase() : "J";

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

        {/* Notification bell */}
        <button
          type="button"
          className="relative p-2.5 bg-white rounded-xl border border-[#EAE4F2] text-[#33283D] hover:bg-[#F0EAF7] hover:border-[#C9B8E2] transition-colors cursor-pointer shadow-xs"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4 text-[#33283D]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#7455A4] ring-2 ring-white" />
        </button>

        {/* Profile pill */}
        <div className="flex items-center gap-2 pl-1 pr-2 py-1 bg-white rounded-xl border border-[#EAE4F2] shadow-xs">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7455A4] to-[#9275BC] text-white flex items-center justify-center text-xs font-bold shadow-xs">
            {initial}
          </div>
          <span className="text-xs font-semibold text-[#33283D] hidden sm:inline max-w-[100px] truncate">
            {userName ? firstName : "Admin"}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-[#7A6F86]" />
        </div>
      </div>
    </div>
  );
}
