"use client";

import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { Therapist } from "@/types";
import { usePermissions } from "@/lib/permissions";
import { useToast } from "@/context/ToastContext";
import { TherapistFormSlideOver } from "@/components/therapists/TherapistFormSlideOver";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Plus,
  Search,
  X,
  UserCheck,
  Phone,
  Mail,
  AlertCircle,
  RotateCcw,
  Edit3,
  Trash2,
  Power,
  FileText,
} from "lucide-react";

type StatusFilter = "all" | "active" | "inactive";

export default function TherapistsPage() {
  const toast = useToast();
  const { canManageTherapists } = usePermissions();

  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Track in-flight action locks by therapist ID
  const [inFlightIds, setInFlightIds] = useState<Record<number, boolean>>({});

  // Slide-over state for create / edit
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [editingTherapist, setEditingTherapist] = useState<Therapist | null>(null);

  // Deletion and 409 Deactivation Dialog states
  const [deleteTarget, setDeleteTarget] = useState<Therapist | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState<Therapist | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const fetchTherapists = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiFetch<Therapist[]>("/therapists?all=1");
      setTherapists(
        [...data].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        )
      );
    } catch (err: any) {
      setError(err?.message || "Failed to load therapists. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTherapists();
  }, []);

  // Filtered therapists based on search query and status tab
  const filteredTherapists = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return therapists.filter((therapist) => {
      const matchesSearch =
        !q ||
        therapist.name.toLowerCase().includes(q) ||
        (therapist.email && therapist.email.toLowerCase().includes(q)) ||
        (therapist.phone && therapist.phone.includes(q)) ||
        (therapist.notes && therapist.notes.toLowerCase().includes(q));

      const isActive = therapist.is_active ?? true;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive) ||
        (statusFilter === "inactive" && !isActive);

      return matchesSearch && matchesStatus;
    });
  }, [therapists, searchQuery, statusFilter]);

  // Counts for filter pills
  const counts = useMemo(() => {
    return {
      all: therapists.length,
      active: therapists.filter((t) => t.is_active ?? true).length,
      inactive: therapists.filter((t) => !(t.is_active ?? true)).length,
    };
  }, [therapists]);

  const handleOpenCreate = () => {
    setEditingTherapist(null);
    setIsSlideOverOpen(true);
  };

  const handleOpenEdit = (therapist: Therapist) => {
    setEditingTherapist(therapist);
    setIsSlideOverOpen(true);
  };

  const handleSaveTherapist = (savedTherapist: Therapist, isEdit: boolean) => {
    setTherapists((prev) => {
      let nextList: Therapist[];
      if (isEdit) {
        nextList = prev.map((t) => (t.id === savedTherapist.id ? savedTherapist : t));
      } else {
        nextList = [savedTherapist, ...prev];
      }
      return [...nextList].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
    });
  };

  // Toggle active / inactive status via PATCH { is_active }
  const handleToggleActive = async (therapist: Therapist) => {
    const currentActive = therapist.is_active ?? true;
    const nextStatus = !currentActive;
    setInFlightIds((prev) => ({ ...prev, [therapist.id]: true }));

    try {
      const response = await apiFetch<{ message: string; therapist: Therapist }>(
        `/therapists/${therapist.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_active: nextStatus }),
        }
      );

      const updated = response.therapist || { ...therapist, is_active: nextStatus };
      setTherapists((prev) => prev.map((t) => (t.id === therapist.id ? updated : t)));
      toast.success(
        response.message ||
          `Therapist "${therapist.name}" is now ${nextStatus ? "active" : "inactive"}.`
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to update therapist status.");
    } finally {
      setInFlightIds((prev) => {
        const next = { ...prev };
        delete next[therapist.id];
        return next;
      });
    }
  };

  // Confirm delete with 409 conflict handling
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;

    setIsDeleting(true);
    setInFlightIds((prev) => ({ ...prev, [target.id]: true }));

    try {
      const response = await apiFetch<{ message: string }>(`/therapists/${target.id}`, {
        method: "DELETE",
      });

      // Remove row only after DELETE succeeds
      setTherapists((prev) => prev.filter((t) => t.id !== target.id));
      setDeleteTarget(null);
      toast.success(response.message || `Therapist "${target.name}" was deleted successfully.`);
    } catch (err: any) {
      if (err?.status === 409) {
        setDeleteTarget(null);
        toast.error(err.message || "This therapist cannot be deleted because they have existing reservations.");
        const isActive = target.is_active ?? true;
        if (isActive) {
          setDeactivateTarget(target);
        }
      } else {
        toast.error(err?.message || "Failed to delete therapist.");
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
      const response = await apiFetch<{ message: string; therapist: Therapist }>(
        `/therapists/${target.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_active: false }),
        }
      );

      const updated = response.therapist || { ...target, is_active: false };
      setTherapists((prev) => prev.map((t) => (t.id === target.id ? updated : t)));
      toast.success(response.message || `Therapist "${target.name}" was deactivated.`);
      setDeactivateTarget(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to deactivate therapist.");
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
          <h1 className="text-2xl font-extrabold text-[#33283D] tracking-tight">Therapists</h1>
          <p className="text-sm text-[#7A6F86] mt-0.5">
            Manage your massage therapists, specialists, and assignment colors
          </p>
        </div>
        {canManageTherapists && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7455A4] hover:bg-[#5E4387] text-white font-semibold text-sm rounded-xl shadow-xs transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New therapist</span>
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
            placeholder="Search therapists by name, phone, email..."
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
            <p className="text-sm font-semibold">Failed to load therapists</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <button
            type="button"
            onClick={fetchTherapists}
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
                <div className="h-4 bg-gray-100 rounded-md w-24 hidden sm:block" />
                <div className="h-6 bg-gray-100 rounded-full w-16" />
              </div>
            ))}
          </div>
        </div>
      ) : filteredTherapists.length === 0 ? (
        <div className="text-center py-20 px-4 bg-white border border-[#EAE4F2] rounded-2xl shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F0EAF7] border border-[#C9B8E2]/50 flex items-center justify-center mx-auto text-[#7455A4] shadow-xs">
            <UserCheck className="w-6 h-6" />
          </div>
          <div className="max-w-sm mx-auto space-y-1">
            <h3 className="text-base font-bold text-[#33283D]">
              {searchQuery || statusFilter !== "all"
                ? "No therapists match your filters"
                : "No therapists registered yet"}
            </h3>
            <p className="text-xs text-[#7A6F86]">
              {searchQuery || statusFilter !== "all"
                ? "Try clearing your search query or selecting a different status filter."
                : "Add your first massage specialist or practitioner to start assigning appointments."}
            </p>
          </div>
          {!searchQuery && statusFilter === "all" ? (
            canManageTherapists ? (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#7455A4] hover:bg-[#5E4387] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New therapist</span>
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
                  <th className="px-6 py-3.5">Therapist</th>
                  <th className="px-6 py-3.5">Contact</th>
                  <th className="px-6 py-3.5">Color Tag</th>
                  <th className="px-6 py-3.5">Status</th>
                  {canManageTherapists && <th className="px-6 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF8FC] bg-white">
                {filteredTherapists.map((therapist) => {
                  const isActive = therapist.is_active ?? true;
                  const isInactive = !isActive;
                  const isInFlight = Boolean(inFlightIds[therapist.id]);
                  const dotColor = therapist.color || "#7455A4";

                  return (
                    <tr
                      key={therapist.id}
                      className={`hover:bg-[#FAF8FC] transition-colors group ${
                        isInactive ? "opacity-60 bg-gray-50/40" : ""
                      }`}
                    >
                      {/* Name, Color Dot & Notes */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs border border-white text-white font-bold text-xs"
                            style={{ backgroundColor: dotColor }}
                          >
                            {(therapist.name || "?")[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 max-w-md">
                            <p
                              className={`text-sm font-semibold truncate ${
                                isInactive
                                  ? "text-[#7A6F86] line-through decoration-[#7A6F86]/40"
                                  : "text-[#33283D] group-hover:text-[#7455A4]"
                              }`}
                            >
                              {therapist.name}
                            </p>
                            {therapist.notes ? (
                              <p className="text-xs text-[#7A6F86] truncate mt-0.5">
                                {therapist.notes}
                              </p>
                            ) : (
                              <p className="text-xs text-[#7A6F86]/50 italic mt-0.5">
                                No notes provided
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact Column (Phone / Email) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1 text-xs text-[#7A6F86]">
                          {therapist.phone ? (
                            <span className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-[#9275BC]" />
                              <span>{therapist.phone}</span>
                            </span>
                          ) : (
                            <span className="text-[#7A6F86]/50 italic">No phone</span>
                          )}
                          {therapist.email && (
                            <span className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-[#9275BC]" />
                              <span>{therapist.email}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Calendar Color Tag */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border border-[#EAE4F2] bg-[#FAF8FC] text-xs font-mono">
                          <span
                            className="w-3 h-3 rounded-full shadow-2xs flex-shrink-0"
                            style={{ backgroundColor: dotColor }}
                          />
                          <span className="text-[#33283D] uppercase text-[11px] font-semibold">
                            {dotColor}
                          </span>
                        </div>
                      </td>

                      {/* Active Status Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            isActive
                              ? "bg-[#91A68D]/15 text-[#91A68D] border-[#91A68D]/30"
                              : "bg-gray-100 text-gray-500 border-gray-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? "bg-[#91A68D]" : "bg-gray-400"
                            }`}
                          />
                          <span>{isActive ? "Active" : "Inactive"}</span>
                        </span>
                      </td>

                      {/* Row Actions */}
                      {canManageTherapists && (
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle Active/Inactive */}
                            <button
                              type="button"
                              disabled={isInFlight}
                              onClick={() => handleToggleActive(therapist)}
                              title={isActive ? "Deactivate therapist" : "Activate therapist"}
                              className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                isActive
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
                              onClick={() => handleOpenEdit(therapist)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#7455A4] bg-[#F0EAF7] hover:bg-[#E4D8F0] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              disabled={isInFlight}
                              onClick={() => setDeleteTarget(therapist)}
                              className="p-1.5 rounded-lg text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Delete therapist"
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
            {filteredTherapists.map((therapist) => {
              const isActive = therapist.is_active ?? true;
              const isInactive = !isActive;
              const isInFlight = Boolean(inFlightIds[therapist.id]);
              const dotColor = therapist.color || "#7455A4";

              return (
                <div
                  key={therapist.id}
                  className={`p-4 space-y-3 transition-colors ${
                    isInactive ? "opacity-60 bg-gray-50/50" : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border border-white text-white font-bold text-xs shadow-2xs"
                        style={{ backgroundColor: dotColor }}
                      >
                        {(therapist.name || "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4
                          className={`text-sm font-semibold truncate ${
                            isInactive ? "text-[#7A6F86] line-through" : "text-[#33283D]"
                          }`}
                        >
                          {therapist.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-[#7A6F86] mt-0.5">
                          {therapist.phone ? (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-[#9275BC]" />
                              {therapist.phone}
                            </span>
                          ) : (
                            <span className="text-[#7A6F86]/50 italic">No phone</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border flex-shrink-0 ${
                        isActive
                          ? "bg-[#91A68D]/15 text-[#91A68D] border-[#91A68D]/30"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isActive ? "bg-[#91A68D]" : "bg-gray-400"
                        }`}
                      />
                      <span>{isActive ? "Active" : "Inactive"}</span>
                    </span>
                  </div>

                  {therapist.notes && (
                    <div className="text-xs text-[#7A6F86] line-clamp-2 flex items-start gap-1.5 bg-[#FAF8FC] p-2 rounded-lg border border-[#EAE4F2]/60">
                      <FileText className="w-3 h-3 text-[#9275BC] flex-shrink-0 mt-0.5" />
                      <span>{therapist.notes}</span>
                    </div>
                  )}

                  {canManageTherapists && (
                    <div className="pt-2 flex items-center justify-end gap-1.5 border-t border-[#FAF8FC]">
                      <button
                        type="button"
                        disabled={isInFlight}
                        onClick={() => handleToggleActive(therapist)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer disabled:opacity-40 ${
                          isActive
                            ? "border-[#EAE4F2] text-[#7A6F86] hover:bg-amber-50 hover:text-amber-700"
                            : "border-[#91A68D]/30 text-[#91A68D] bg-[#91A68D]/10"
                        }`}
                      >
                        {isActive ? "Deactivate" : "Activate"}
                      </button>

                      <button
                        type="button"
                        disabled={isInFlight}
                        onClick={() => handleOpenEdit(therapist)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#7455A4] bg-[#F0EAF7] hover:bg-[#E4D8F0] transition-colors cursor-pointer disabled:opacity-40"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        disabled={isInFlight}
                        onClick={() => setDeleteTarget(therapist)}
                        className="p-1 rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40"
                        title="Delete therapist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Slide-over Form */}
      <TherapistFormSlideOver
        open={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        therapist={editingTherapist}
        onSuccess={handleSaveTherapist}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={`Delete Therapist "${deleteTarget?.name}"?`}
        confirmLabel="Yes, Delete Therapist"
        confirmLoadingLabel="Deleting..."
        isConfirming={isDeleting}
      >
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
          Are you sure you want to permanently delete this therapist? This action cannot be undone.
        </p>
      </ConfirmDialog>

      {/* 409 Conflict Deactivate Instead Dialog */}
      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleConfirmDeactivateInstead}
        title={`Deactivate "${deactivateTarget?.name}" Instead?`}
        confirmLabel="Deactivate Therapist"
        confirmLoadingLabel="Deactivating..."
        isConfirming={isDeactivating}
      >
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
          This therapist cannot be deleted because they are assigned to existing or historical appointments.
          Would you like to deactivate them instead so they are hidden from future appointment bookings?
        </p>
      </ConfirmDialog>
    </div>
  );
}
