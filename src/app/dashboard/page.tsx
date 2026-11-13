"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatCurrency } from "@/lib/currency";
import { formatTime24, formatShortDateTime24 } from "@/lib/dates";
import { RESERVATION_STATUSES } from "@/types";
import {
  Calendar,
  Clock,
  Users,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  Tag,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const { isLoading, error, data, refetch } = useDashboardData();

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold">
              <Sparkles className="w-3 h-3" />
              Dashboard
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Welcome back, {user?.name?.split(" ")[0] || "Manager"} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Here&apos;s an overview of your spa operations today.
          </p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-red-800">
                Failed to load dashboard data
              </h3>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={refetch}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-8 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3 h-32"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-gray-100" />
                  <div className="w-16 h-3 bg-gray-100 rounded-full" />
                </div>
                <div className="w-20 h-7 bg-gray-100 rounded-lg" />
                <div className="w-28 h-3 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-28 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100" />
                <div className="w-32 h-4 bg-gray-100 rounded-lg" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-36 h-5 bg-gray-100 rounded-lg" />
                  <div className="w-16 h-4 bg-gray-100 rounded-full" />
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((__, j) => (
                    <div key={j} className="h-12 bg-gray-100 rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Data */}
      {!isLoading && data && (
        <div className="space-y-8">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Today's Appointments */}
            <div className="relative bg-white p-5 rounded-2xl border border-gray-200 shadow-sm overflow-hidden group hover:shadow-md hover:border-indigo-200 transition-all duration-200">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-400 to-violet-400 rounded-t-2xl" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Today</span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">{data.todayAppointmentsCount}</p>
              <p className="text-xs font-medium text-gray-500 mt-1">Today&apos;s appointments</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Excludes cancelled</p>
            </div>

            {/* Pending */}
            <div className="relative bg-white p-5 rounded-2xl border border-gray-200 shadow-sm overflow-hidden group hover:shadow-md hover:border-amber-200 transition-all duration-200">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-400 rounded-t-2xl" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pending</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">{data.futurePendingCount}</p>
              <p className="text-xs font-medium text-gray-500 mt-1">Pending confirmation</p>
              <p className="text-[11px] mt-0.5">
                {data.overduePendingCount > 0 ? (
                  <span className="text-amber-600 font-semibold">+{data.overduePendingCount} overdue</span>
                ) : (
                  <span className="text-gray-400">Future appointments</span>
                )}
              </p>
            </div>

            {/* Total Clients */}
            <div className="relative bg-white p-5 rounded-2xl border border-gray-200 shadow-sm overflow-hidden group hover:shadow-md hover:border-blue-200 transition-all duration-200">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-t-2xl" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Clients</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">{data.totalClientsCount}</p>
              <p className="text-xs font-medium text-gray-500 mt-1">Total clients</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Registered spa members</p>
            </div>

            {/* Revenue */}
            <div className="relative bg-white p-5 rounded-2xl border border-gray-200 shadow-sm overflow-hidden group hover:shadow-md hover:border-emerald-200 transition-all duration-200">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-t-2xl" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Revenue</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">{formatCurrency(data.revenueThisMonth)}</p>
              <p className="text-xs font-medium text-gray-500 mt-1">Revenue this month</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Completed bookings</p>
            </div>
          </div>

          {/* Quick-Nav Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/dashboard/clients"
              className="group relative bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 flex items-center justify-between overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-indigo-50/0 group-hover:from-indigo-50/60 group-hover:to-violet-50/40 transition-all duration-300" />
              <div className="relative flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-indigo-600 transition-colors flex-shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">{data.totalClientsCount}</span>
                    <span className="text-sm text-gray-400 font-medium">clients</span>
                  </div>
                  <h2 className="text-sm font-semibold text-gray-700 group-hover:text-indigo-700 transition-colors">
                    Manage Clients
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">View profiles, histories & contact info</p>
                </div>
              </div>
              <ArrowRight className="relative w-5 h-5 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </Link>

            <Link
              href="/dashboard/reservations"
              className="group relative bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 flex items-center justify-between overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-indigo-50/0 group-hover:from-indigo-50/60 group-hover:to-violet-50/40 transition-all duration-300" />
              <div className="relative flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-indigo-600 transition-colors flex-shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">{data.totalReservationsCount}</span>
                    <span className="text-sm text-gray-400 font-medium">total</span>
                  </div>
                  <h2 className="text-sm font-semibold text-gray-700 group-hover:text-indigo-700 transition-colors">
                    Reservations
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">Calendar, bookings, and status actions</p>
                </div>
              </div>
              <ArrowRight className="relative w-5 h-5 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </Link>
          </div>

          {/* Schedule & Pending Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Today's Schedule */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-900">Today&apos;s Schedule</h2>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                    {data.todaySchedule.length}
                  </span>
                </div>
                <Link
                  href="/dashboard/reservations"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline transition-colors flex items-center gap-1"
                >
                  View all
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="px-4 py-2">
                {data.todaySchedule.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <Calendar className="w-8 h-8 text-gray-200 mx-auto" />
                    <p className="text-sm font-medium text-gray-500">No appointments today</p>
                    <p className="text-xs text-gray-400">New bookings will appear here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {data.todaySchedule.map((res) => {
                      const clientName = res.client?.full_name || "Client";
                      const serviceName = res.service?.name || "Service";
                      const timeStr = formatTime24(res.start_time);
                      const statusConfig = RESERVATION_STATUSES[res.status];

                      return (
                        <Link
                          key={res.id}
                          href="/dashboard/reservations"
                          className="py-3 flex items-center justify-between hover:bg-gray-50/70 -mx-1 px-1 rounded-xl transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-bold text-indigo-600 w-11 text-left bg-indigo-50 px-1.5 py-0.5 rounded-md">
                              {timeStr}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors">
                                {clientName}
                              </p>
                              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                <Tag className="w-3 h-3 text-indigo-400" />
                                {serviceName}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full capitalize font-semibold border ${
                                statusConfig?.badgeClass || "bg-gray-100 text-gray-700 border-gray-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${statusConfig?.dotClass || "bg-gray-400"}`}
                              />
                              {statusConfig?.label || res.status}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Pending Confirmation */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-900">Pending Confirmation</h2>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                    {data.upcomingPendingShortlist.length}
                  </span>
                </div>
                <Link
                  href="/dashboard/reservations"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline transition-colors flex items-center gap-1"
                >
                  Manage all
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="px-4 py-2">
                {data.upcomingPendingShortlist.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto" />
                    <p className="text-sm font-medium text-gray-600">All caught up!</p>
                    <p className="text-xs text-gray-400">No pending appointments needing confirmation.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {data.upcomingPendingShortlist.map((res) => {
                      const clientName = res.client?.full_name || "Client";
                      const serviceName = res.service?.name || "Service";
                      const dateStr = formatShortDateTime24(res.start_time);
                      const statusConfig = RESERVATION_STATUSES.pending;

                      return (
                        <Link
                          key={res.id}
                          href="/dashboard/reservations"
                          className="py-3 flex items-center justify-between hover:bg-gray-50/70 -mx-1 px-1 rounded-xl transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono font-bold text-gray-500 w-24 text-left leading-tight bg-gray-50 px-1.5 py-0.5 rounded-md">
                              {dateStr}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors">
                                {clientName}
                              </p>
                              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                <Tag className="w-3 h-3 text-indigo-400" />
                                {serviceName}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full capitalize font-semibold border ${statusConfig.badgeClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
                              Needs Review
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
