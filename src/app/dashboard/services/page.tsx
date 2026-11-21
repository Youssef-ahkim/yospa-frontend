"use client";

import { useEffect, useState, useMemo } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Service } from "@/types";
import { usePermissions } from "@/lib/permissions";
import { formatCurrency } from "@/lib/currency";
import { ServiceFormSlideOver } from "@/components/services/ServiceFormSlideOver";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/context/ToastContext";
import {
  Plus,
  Search,
  X,
  Sparkles,
  Clock,
  AlertCircle,
  RotateCcw,
  Edit3,
  Trash2,
  Power,
} from "lucide-react";

type StatusFilter = "all" | "active" | "inactive";

export default function ServicesPage() {
  const toast = useToast();
  const { canManageServices } = usePermissions();

  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Track in-flight service actions by ID to disable individual row buttons
  const [inFlightIds, setInFlightIds] = useState<Record<number, boolean>>({});

  // Slide-over states for create & edit
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Deletion and 409 Deactivation Dialog states
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState<Service | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiFetch<Service[]>("/services?all=1");
      setServices(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load services. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch services on initial page mount
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

  const handleOpenCreate = () => {
    setEditingService(null);
    setIsSlideOverOpen(true);
  };

  const handleOpenEdit = (service: Service) => {
    setEditingService(service);
    setIsSlideOverOpen(true);
  };

  const handleSaveService = (savedService: Service, isEdit: boolean) => {
    setServices((prev) => {
      let nextList: Service[];
      if (isEdit) {
        nextList = prev.map((s) => (s.id === savedService.id ? savedService : s));
      } else {
        nextList = [savedService, ...prev];
      }
      return [...nextList].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
    });
  };

  // Quick toggle active / inactive via PATCH { is_active } only
  const handleToggleActive = async (service: Service) => {
    const nextStatus = !service.is_active;
    setInFlightIds((prev) => ({ ...prev, [service.id]: true }));

    try {
      const response = await apiFetch<{ message: string; service: Service }>(
        `/services/${service.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_active: nextStatus }),
        }
      );

      const updated = response.service || { ...service, is_active: nextStatus };
      setServices((prev) => prev.map((s) => (s.id === service.id ? updated : s)));
      toast.success(
        response.message ||
          `Service "${service.name}" is now ${nextStatus ? "active" : "inactive"}.`
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update service status.");
    } finally {
      setInFlightIds((prev) => {
        const next = { ...prev };
        delete next[service.id];
        return next;
      });
    }
  };

  // Confirm delete handler with 409 conflict handling
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;

    setIsDeleting(true);
    setInFlightIds((prev) => ({ ...prev, [target.id]: true }));

    try {
      const response = await apiFetch<{ message: string }>(`/services/${target.id}`, {
        method: "DELETE",
      });

      // Remove row only after DELETE succeeds
      setServices((prev) => prev.filter((s) => s.id !== target.id));
      setDeleteTarget(null);
      toast.success(response.message || `Service "${target.name}" was deleted successfully.`);
    } catch (err: unknown) {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.status === 409) {
        // Close delete dialog first
        setDeleteTarget(null);
        toast.error(apiErr.message || "This service cannot be deleted because it has existing reservations.");
        // Offer deactivate instead if currently active
        if (target.is_active) {
          setDeactivateTarget(target);
        }
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to delete service.");
      }
    } finally {
      setIsDeleting(false);
      setInFlightIds((prev) => {
        const next = { ...prev };
        delete next[target.id];
        return next;
      });
    }
  };

  // Confirm deactivation from 409 fallback
  const handleConfirmDeactivateInstead = async () => {
    if (!deactivateTarget) return;
    const target = deactivateTarget;

    setIsDeactivating(true);
    setInFlightIds((prev) => ({ ...prev, [target.id]: true }));

    try {
      const response = await apiFetch<{ message: string; service: Service }>(
        `/services/${target.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_active: false }),
        }
      );

      const updated = response.service || { ...target, is_active: false };
      setServices((prev) => prev.map((s) => (s.id === target.id ? updated : s)));
      toast.success(response.message || `Service "${target.name}" was deactivated.`);
      setDeactivateTarget(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate service.");
    } finally {
      setIsDeactivating(false);
      setInFlightIds((prev) => {
        const next = { ...prev };
        delete next[target.id];
        return next;
      });
    }
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
        {canManageServices && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7455A4] hover:bg-[#5E4387] text-white font-semibold text-sm rounded-xl shadow-xs transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New service</span>
          </button>
        )}
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
            canManageServices ? (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#7455A4] hover:bg-[#5E4387] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New service</span>
              </button>
            ) : null
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
                  <th className="px-6 py-3.5">Status</th>
                  {canManageServices && <th className="px-6 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF8FC] bg-white">
                {filteredServices.map((service) => {
                  const isInactive = !service.is_active;
                  const isInFlight = Boolean(inFlightIds[service.id]);

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
                      <td className="px-6 py-4 whitespace-nowrap">
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

                      {/* Actions */}
                      {canManageServices && (
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle Active/Inactive */}
                            <button
                              type="button"
                              disabled={isInFlight}
                              onClick={() => handleToggleActive(service)}
                              title={service.is_active ? "Deactivate service" : "Activate service"}
                              className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                service.is_active
                                  ? "border-[#EAE4F2] text-[#7A6F86] hover:text-amber-700 hover:bg-amber-50 hover:border-amber-200"
                                  : "border-[#91A68D]/40 text-[#91A68D] hover:bg-[#91A68D]/15"
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              disabled={isInFlight}
                              onClick={() => handleOpenEdit(service)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#7455A4] bg-[#F0EAF7] hover:bg-[#E4D8F0] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              disabled={isInFlight}
                              onClick={() => setDeleteTarget(service)}
                              className="p-1.5 rounded-lg text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Delete service"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
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
              const isInFlight = Boolean(inFlightIds[service.id]);

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

                  <div className="pt-2 flex items-center justify-between border-t border-[#FAF8FC] text-xs">
                    <div>
                      <span className="text-[#7A6F86]">Price: </span>
                      <span className="font-bold text-[#33283D]">
                        {formatCurrency(service.price)}
                      </span>
                    </div>

                    {canManageServices && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isInFlight}
                          onClick={() => handleToggleActive(service)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer disabled:opacity-40 ${
                            service.is_active
                              ? "border-[#EAE4F2] text-[#7A6F86] hover:bg-amber-50 hover:text-amber-700"
                              : "border-[#91A68D]/30 text-[#91A68D] bg-[#91A68D]/10"
                          }`}
                        >
                          {service.is_active ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          type="button"
                          disabled={isInFlight}
                          onClick={() => handleOpenEdit(service)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#7455A4] bg-[#F0EAF7] hover:bg-[#E4D8F0] transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          disabled={isInFlight}
                          onClick={() => setDeleteTarget(service)}
                          className="p-1 rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40"
                          title="Delete service"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
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

      {/* SlideOver for Create & Edit */}
      <ServiceFormSlideOver
        open={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        service={editingService}
        onSuccess={handleSaveService}
      />

      {/* Primary Confirm Dialog for Permanent Delete */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={`Delete "${deleteTarget?.name}"?`}
        description="Are you sure you want to delete this service? This action cannot be undone."
        confirmLabel="Delete Service"
        confirmLoadingLabel="Deleting..."
        isConfirming={isDeleting}
        confirmClassName="bg-red-600 hover:bg-red-700 text-white"
      />

      {/* Secondary Confirm Dialog for 409 Conflict: Deactivate Instead */}
      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleConfirmDeactivateInstead}
        title="Deactivate instead?"
        description={
          <span>
            <strong>&ldquo;{deactivateTarget?.name}&rdquo;</strong> has existing reservations and cannot be permanently deleted. Would you like to deactivate it so it no longer appears for new bookings?
          </span>
        }
        confirmLabel="Deactivate Service"
        confirmLoadingLabel="Deactivating..."
        isConfirming={isDeactivating}
        confirmClassName="bg-amber-600 hover:bg-amber-700 text-white"
      />
    </div>
  );
}
