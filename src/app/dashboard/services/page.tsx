"use client";

import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { Service } from "@/types";
import { formatCurrency } from "@/lib/currency";
import {
  Plus,
  Search,
  X,
  Sparkles,
  Clock,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

type StatusFilter = "all" | "active" | "inactive";

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiFetch<Service[]>("/services?all=1");
      setServices(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load services. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Filtered services based on search query and status tab
  const filteredServices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return services.filter((service) => {
      const matchesSearch =
        !q ||
        service.name.toLowerCase().includes(q) ||
        (service.description && service.description.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && service.is_active) ||
        (statusFilter === "inactive" && !service.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [services, searchQuery, statusFilter]);

  // Counts for filter pills
  const counts = useMemo(() => {
    return {
      all: services.length,
      active: services.filter((s) => s.is_active).length,
      inactive: services.filter((s) => !s.is_active).length,
    };
  }, [services]);

  // Handler stub for "New service" (will open slide-over in Step 3)
  const handleOpenCreate = () => {
    // Stub for Step 3 slide-over
  };

  return (
    <div className="space-y-6 text-[#33283D] pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#33283D] tracking-tight">Services</h1>
          <p className="text-sm text-[#7A6F86] mt-0.5">
            Manage your spa treatments, durations, pricing, and availability
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7455A4] hover:bg-[#5E4387] text-white font-semibold text-sm rounded-xl shadow-xs transition-all duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New service</span>
        </button>
      </div>

      {/* Search and Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#7A6F86] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search services by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 border border-[#EAE4F2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7455A4] focus:border-[#7455A4] text-sm bg-white shadow-xs hover:border-[#C9B8E2] text-[#33283D] placeholder-[#7A6F86]/60 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A6F86] hover:text-[#33283D] transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs with Counts */}
        <div className="flex items-center gap-1.5 p-1 bg-[#FAF8FC] border border-[#EAE4F2] rounded-xl self-start sm:self-auto">
          {(
            [
              { id: "all", label: "All", count: counts.all },
              { id: "active", label: "Active", count: counts.active },
              { id: "inactive", label: "Inactive", count: counts.inactive },
            ] as const
          ).map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-white text-[#7455A4] shadow-xs"
                    : "text-[#7A6F86] hover:text-[#33283D] hover:bg-white/60"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? "bg-[#F0EAF7] text-[#7455A4]"
                      : "bg-[#EAE4F2]/70 text-[#7A6F86]"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Failed to load services</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <button
            type="button"
            onClick={fetchServices}
            className="inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-900 bg-red-100/80 hover:bg-red-200/80 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex-shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Main Content: Skeleton, Empty, or Data */}
      {isLoading ? (
        <div className="bg-white border border-[#EAE4F2] rounded-2xl overflow-hidden shadow-xs divide-y divide-[#EAE4F2]">
          <div className="p-5 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-[#F0EAF7]/60" />
                  <div className="space-y-1.5 flex-1 max-w-sm">
                    <div className="h-4 bg-gray-200 rounded-md w-3/4" />
                    <div className="h-3 bg-gray-100 rounded-md w-1/2" />
                  </div>
                </div>
                <div className="h-4 bg-gray-100 rounded-md w-16 hidden sm:block" />
                <div className="h-4 bg-gray-200 rounded-md w-20" />
                <div className="h-6 bg-gray-100 rounded-full w-16" />
              </div>
            ))}
          </div>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="text-center py-20 px-4 bg-white border border-[#EAE4F2] rounded-2xl shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F0EAF7] border border-[#C9B8E2]/50 flex items-center justify-center mx-auto text-[#7455A4] shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="max-w-sm mx-auto space-y-1">
            <h3 className="text-base font-bold text-[#33283D]">
              {searchQuery || statusFilter !== "all"
                ? "No services match your filters"
                : "No services yet"}
            </h3>
            <p className="text-xs text-[#7A6F86]">
              {searchQuery || statusFilter !== "all"
                ? "Try clearing your search query or selecting a different status filter."
                : "Create your first treatment or service to start accepting bookings."}
            </p>
          </div>
          {!searchQuery && statusFilter === "all" ? (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#7455A4] hover:bg-[#5E4387] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New service</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="text-xs font-semibold text-[#7455A4] hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#EAE4F2] rounded-2xl overflow-hidden shadow-xs">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-[#EAE4F2] text-left text-xs">
              <thead className="bg-[#FAF8FC]">
                <tr className="text-[11px] font-semibold text-[#7A6F86] uppercase tracking-wider">
                  <th className="px-6 py-3.5">Service</th>
                  <th className="px-6 py-3.5">Duration</th>
                  <th className="px-6 py-3.5">Price</th>
                  <th className="px-6 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF8FC] bg-white">
                {filteredServices.map((service) => {
                  const isInactive = !service.is_active;
                  return (
                    <tr
                      key={service.id}
                      className={`hover:bg-[#FAF8FC] transition-colors group ${
                        isInactive ? "opacity-60 bg-gray-50/40" : ""
                      }`}
                    >
                      {/* Name & Truncated Description */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs border transition-colors ${
                              isInactive
                                ? "bg-gray-100 text-gray-400 border-gray-200"
                                : "bg-[#F0EAF7] text-[#7455A4] border-[#C9B8E2]/50 group-hover:bg-[#EAE4F2]"
                            }`}
                          >
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 max-w-md">
                            <p
                              className={`text-sm font-semibold truncate ${
                                isInactive
                                  ? "text-[#7A6F86] line-through decoration-[#7A6F86]/40"
                                  : "text-[#33283D] group-hover:text-[#7455A4]"
                              }`}
                            >
                              {service.name}
                            </p>
                            {service.description ? (
                              <p className="text-xs text-[#7A6F86] truncate mt-0.5">
                                {service.description}
                              </p>
                            ) : (
                              <p className="text-xs text-[#7A6F86]/50 italic mt-0.5">
                                No description provided
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7A6F86]">
                          <Clock className="w-3.5 h-3.5 text-[#9275BC]" />
                          <span>{service.duration_minutes} min</span>
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-[#33283D]">
                        {formatCurrency(service.price)}
                      </td>

                      {/* Active/Inactive Status Badge */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            service.is_active
                              ? "bg-[#91A68D]/15 text-[#91A68D] border-[#91A68D]/30"
                              : "bg-gray-100 text-gray-500 border-gray-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              service.is_active ? "bg-[#91A68D]" : "bg-gray-400"
                            }`}
                          />
                          <span>{service.is_active ? "Active" : "Inactive"}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards List */}
          <div className="md:hidden divide-y divide-[#EAE4F2]">
            {filteredServices.map((service) => {
              const isInactive = !service.is_active;
              return (
                <div
                  key={service.id}
                  className={`p-4 space-y-3 transition-colors ${
                    isInactive ? "opacity-60 bg-gray-50/50" : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                          isInactive
                            ? "bg-gray-100 text-gray-400 border-gray-200"
                            : "bg-[#F0EAF7] text-[#7455A4] border-[#C9B8E2]/50"
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <h4
                          className={`text-sm font-semibold truncate ${
                            isInactive ? "text-[#7A6F86] line-through" : "text-[#33283D]"
                          }`}
                        >
                          {service.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-[#7A6F86] mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#9275BC]" />
                            {service.duration_minutes} min
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border flex-shrink-0 ${
                        service.is_active
                          ? "bg-[#91A68D]/15 text-[#91A68D] border-[#91A68D]/30"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          service.is_active ? "bg-[#91A68D]" : "bg-gray-400"
                        }`}
                      />
                      <span>{service.is_active ? "Active" : "Inactive"}</span>
                    </span>
                  </div>

                  {service.description && (
                    <p className="text-xs text-[#7A6F86] line-clamp-2">
                      {service.description}
                    </p>
                  )}

                  <div className="pt-1 flex items-center justify-between border-t border-[#FAF8FC] text-xs">
                    <span className="text-[#7A6F86]">Price</span>
                    <span className="font-bold text-[#33283D]">
                      {formatCurrency(service.price)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table Footer: Showing X of Y */}
          <div className="px-5 py-3 border-t border-[#EAE4F2] bg-[#FAF8FC] flex items-center justify-between">
            <p className="text-xs text-[#7A6F86]">
              Showing <span className="font-semibold text-[#33283D]">{filteredServices.length}</span>{" "}
              of <span className="font-semibold text-[#33283D]">{services.length}</span> services
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
