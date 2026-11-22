"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { PlatformStats, PlatformSpa } from "@/types";
import {
  Building2,
  Users,
  UserCheck,
  Calendar,
  Search,
  X,
  AlertCircle,
  RotateCcw,
  ChevronRight,
  Plus,
} from "lucide-react";
import { CreateSpaSlideOver } from "@/components/platform/CreateSpaSlideOver";

type StatusFilter = "all" | "active" | "suspended";

export default function PlatformSpasPage() {
  // Stats state
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Spas list state
  const [spas, setSpas] = useState<PlatformSpa[]>([]);
  const [isLoadingSpas, setIsLoadingSpas] = useState(true);
  const [spasError, setSpasError] = useState<string | null>(null);

  // Search & Filter state
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Create slide-over state
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Ref to track latest request ID and prevent race conditions/stale responses
  const requestIdRef = useRef(0);

  // Fetch aggregate platform stats
  const fetchStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      setStatsError(null);
      const data = await apiFetch<PlatformStats>("/platform/stats");
      setStats(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setStatsError(err.message);
      } else {
        setStatsError("Failed to load platform statistics.");
      }
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Fetch spas list with stale response rejection
  const fetchSpas = useCallback(async (query: string, status: StatusFilter) => {
    const currentRequestId = ++requestIdRef.current;
    setIsLoadingSpas(true);
    setSpasError(null);

    try {
      const params = new URLSearchParams();
      if (query) {
        params.set("search", query);
      }
      if (status !== "all") {
        params.set("status", status);
      }
      const queryString = params.toString() ? `?${params.toString()}` : "";
      const data = await apiFetch<PlatformSpa[]>(`/platform/spas${queryString}`);

      // Stale response guard: ignore if a newer request was dispatched in the meantime
      if (currentRequestId === requestIdRef.current) {
        setSpas(data);
      }
    } catch (err: unknown) {
      if (currentRequestId === requestIdRef.current) {
        if (err instanceof ApiError) {
          setSpasError(err.message);
        } else {
          setSpasError("Failed to load spas.");
        }
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoadingSpas(false);
      }
    }
  }, []);

  // Initial stats fetch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial load of platform stats on mount
    fetchStats();
  }, [fetchStats]);

  // Refetch spas when debounced search query or status filter changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch spas when debounced query or status filter changes
    fetchSpas(debouncedSearch, statusFilter);
  }, [debouncedSearch, statusFilter, fetchSpas]);

  return (
    <div className="space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#1A1626] tracking-tight">Platform Spas</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-[#7455A4] border border-[#C9B8E2]/50">
              Multi-tenant
            </span>
          </div>
          <p className="text-sm text-[#7A6F86] mt-0.5">
            Manage all tenant spas, view system-wide stats, and provision tenant owners
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#7455A4] hover:bg-[#63478e] shadow-sm transition-all cursor-pointer min-h-[40px] self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>New Spa</span>
        </button>
      </div>

      {/* ── Platform Stats Cards ── */}
      {statsError ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-xs font-medium text-red-700">{statsError}</p>
          </div>
          <button
            onClick={fetchStats}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors cursor-pointer min-h-[36px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Spas */}
          <div className="bg-white border border-[#EAE4F2] rounded-2xl p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7A6F86] uppercase tracking-wider">
                Total Spas
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#7455A4] flex items-center justify-center">
                <Building2 size={16} />
              </div>
            </div>
            <div className="mt-3">
              {isLoadingStats ? (
                <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-[#1A1626]">{stats?.spas.total ?? 0}</p>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-[#7A6F86]">
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {stats?.spas.active ?? 0} active
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {stats?.spas.suspended ?? 0} suspended
              </span>
            </div>
          </div>

          {/* Card 2: Total Users */}
          <div className="bg-white border border-[#EAE4F2] rounded-2xl p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7A6F86] uppercase tracking-wider">
                Platform Users
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users size={16} />
              </div>
            </div>
            <div className="mt-3">
              {isLoadingStats ? (
                <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-[#1A1626]">{stats?.users ?? 0}</p>
              )}
            </div>
            <p className="mt-2 text-xs text-[#7A6F86]">Across all active & suspended spas</p>
          </div>

          {/* Card 3: Total Clients */}
          <div className="bg-white border border-[#EAE4F2] rounded-2xl p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7A6F86] uppercase tracking-wider">
                Total Clients
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserCheck size={16} />
              </div>
            </div>
            <div className="mt-3">
              {isLoadingStats ? (
                <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-[#1A1626]">{stats?.clients ?? 0}</p>
              )}
            </div>
            <p className="mt-2 text-xs text-[#7A6F86]">Client profiles registered</p>
          </div>

          {/* Card 4: Total Reservations */}
          <div className="bg-white border border-[#EAE4F2] rounded-2xl p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7A6F86] uppercase tracking-wider">
                Total Bookings
              </span>
              <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                <Calendar size={16} />
              </div>
            </div>
            <div className="mt-3">
              {isLoadingStats ? (
                <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-[#1A1626]">{stats?.reservations ?? 0}</p>
              )}
            </div>
            <p className="mt-2 text-xs text-[#7A6F86]">System-wide reservations booked</p>
          </div>
        </div>
      )}

      {/* ── Filters & Search Bar ── */}
      <div className="bg-white border border-[#EAE4F2] rounded-2xl p-4 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        {/* Search input with debounced server filter */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9275BC] w-4 h-4 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search spas by name, slug, owner email..."
            className="w-full pl-10 pr-10 py-2 bg-[#FAF8FC] border border-[#EAE4F2] rounded-xl text-xs sm:text-sm text-[#1A1626] placeholder-[#9275BC]/70 focus:outline-none focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4] transition-all min-h-[40px]"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9275BC] hover:text-[#33283D] p-1 rounded-lg hover:bg-[#F0EAF7] transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-[#FAF8FC] p-1 rounded-xl border border-[#EAE4F2] overflow-x-auto max-w-full pb-0.5 self-start sm:self-auto">
          {(["all", "active", "suspended"] as StatusFilter[]).map((tab) => {
            const isSelected = statusFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer min-h-[36px] ${
                  isSelected
                    ? "bg-white text-[#7455A4] shadow-xs border border-[#C9B8E2]/60"
                    : "text-[#7A6F86] hover:text-[#33283D] hover:bg-white/50"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Spas Content: Error / Loading / Empty / Table ── */}
      {spasError ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Error loading spas</p>
              <p className="text-xs text-red-600 mt-0.5">{spasError}</p>
            </div>
          </div>
          <button
            onClick={() => fetchSpas(debouncedSearch, statusFilter)}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors cursor-pointer min-h-[40px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      ) : isLoadingSpas ? (
        /* Loading Skeleton */
        <div className="bg-white border border-[#EAE4F2] rounded-2xl shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-[#FAF8FC]">
            <div className="h-4 bg-gray-100 rounded w-32 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-20 animate-pulse" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-[#FAF8FC] last:border-none">
              <div className="space-y-1.5">
                <div className="h-4 bg-gray-100 rounded w-48 animate-pulse" />
                <div className="h-3 bg-gray-100 rounded w-28 animate-pulse" />
              </div>
              <div className="h-6 bg-gray-100 rounded-full w-20 animate-pulse" />
              <div className="h-4 bg-gray-100 rounded w-36 animate-pulse hidden md:block" />
              <div className="h-4 bg-gray-100 rounded w-24 animate-pulse hidden lg:block" />
            </div>
          ))}
        </div>
      ) : spas.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-[#EAE4F2] rounded-2xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#7455A4] flex items-center justify-center mx-auto mb-3">
            <Building2 size={24} />
          </div>
          <h2 className="text-base font-semibold text-[#1A1626]">No Spas Found</h2>
          <p className="text-xs text-[#7A6F86] mt-1 max-w-sm mx-auto">
            {searchInput || statusFilter !== "all"
              ? "No spas match your current search or filter criteria. Try clearing filters."
              : "No tenant spas have been provisioned on the platform yet."}
          </p>
          {searchInput || statusFilter !== "all" ? (
            <button
              onClick={() => {
                setSearchInput("");
                setStatusFilter("all");
              }}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-[#F0EAF7] text-[#7455A4] hover:bg-[#E4D8EE] transition-colors cursor-pointer min-h-[40px]"
            >
              Clear all filters
            </button>
          ) : (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#7455A4] hover:bg-[#63478e] transition-colors cursor-pointer min-h-[40px]"
            >
              <Plus size={14} />
              <span>Create First Spa</span>
            </button>
          )}
        </div>
      ) : (
        /* Spas List: Desktop Table + Mobile Cards */
        <div className="bg-white border border-[#EAE4F2] rounded-2xl shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8FC] border-b border-[#EAE4F2] text-[#7A6F86] font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-3.5">Spa Name & Slug</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Owner(s)</th>
                  <th className="px-4 py-3.5">Counts</th>
                  <th className="px-4 py-3.5">Created</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE4F2]/60">
                {spas.map((spa) => {
                  const isActive = spa.status === "active";
                  const createdFormatted = spa.created_at
                    ? new Date(spa.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <tr
                      key={spa.id}
                      className="hover:bg-[#FAF8FC]/70 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-sm text-[#1A1626]">
                          {spa.name}
                        </div>
                        <div className="text-[11px] text-[#9275BC] font-mono mt-0.5">
                          /{spa.slug}
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          {isActive ? "Active" : "Suspended"}
                        </span>
                      </td>

                      <td className="px-4 py-4 max-w-xs">
                        {spa.owner_emails && spa.owner_emails.length > 0 ? (
                          <div className="text-[#33283D] truncate" title={spa.owner_emails.join(", ")}>
                            {spa.owner_emails.join(", ")}
                          </div>
                        ) : (
                          <span className="text-[#9275BC] italic">No owner assigned</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-[11px] text-[#7A6F86]">
                          <span title="Users" className="flex items-center gap-1">
                            <Users size={12} className="text-[#9275BC]" />
                            {spa.counts.users}
                          </span>
                          <span>·</span>
                          <span title="Clients" className="flex items-center gap-1">
                            <UserCheck size={12} className="text-[#9275BC]" />
                            {spa.counts.clients}
                          </span>
                          <span>·</span>
                          <span title="Reservations" className="flex items-center gap-1">
                            <Calendar size={12} className="text-[#9275BC]" />
                            {spa.counts.reservations}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-[#7A6F86]">
                        {createdFormatted}
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <Link
                          href={`/platform/spas/${spa.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#7455A4] bg-[#F0EAF7] hover:bg-[#E4D8EE] transition-colors cursor-pointer min-h-[36px]"
                        >
                          <span>Manage</span>
                          <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden divide-y divide-[#EAE4F2]/70">
            {spas.map((spa) => {
              const isActive = spa.status === "active";
              const createdFormatted = spa.created_at
                ? new Date(spa.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—";

              return (
                <div key={spa.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-sm text-[#1A1626]">{spa.name}</h3>
                      <p className="text-[11px] text-[#9275BC] font-mono">/{spa.slug}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isActive ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                      {isActive ? "Active" : "Suspended"}
                    </span>
                  </div>

                  <div className="text-xs text-[#7A6F86] break-all">
                    <span className="font-medium text-[#33283D]">Owner: </span>
                    {spa.owner_emails && spa.owner_emails.length > 0
                      ? spa.owner_emails.join(", ")
                      : "None"}
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-[#FAF8FC] p-2.5 rounded-xl border border-[#EAE4F2]/60 text-center text-[10px]">
                    <div>
                      <p className="text-[#9275BC]">Users</p>
                      <p className="font-bold text-[#1A1626] text-xs mt-0.5">{spa.counts.users}</p>
                    </div>
                    <div>
                      <p className="text-[#9275BC]">Clients</p>
                      <p className="font-bold text-[#1A1626] text-xs mt-0.5">{spa.counts.clients}</p>
                    </div>
                    <div>
                      <p className="text-[#9275BC]">Bookings</p>
                      <p className="font-bold text-[#1A1626] text-xs mt-0.5">{spa.counts.reservations}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#9275BC]">Created {createdFormatted}</span>
                    <Link
                      href={`/platform/spas/${spa.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#7455A4] bg-[#F0EAF7] hover:bg-[#E4D8EE] transition-colors cursor-pointer min-h-[40px]"
                    >
                      <span>Manage</span>
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Spa Slide-Over */}
      <CreateSpaSlideOver
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          fetchStats();
          fetchSpas(debouncedSearch, statusFilter);
        }}
      />
    </div>
  );
}
