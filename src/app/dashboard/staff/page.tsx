"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Staff, Role } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/lib/permissions";
import { useToast } from "@/context/ToastContext";
import { StaffFormSlideOver } from "@/components/staff/StaffFormSlideOver";
import { Spinner } from "@/components/ui/Spinner";
import {
  UserPlus,
  Search,
  X,
  Users,
  Mail,
  AlertCircle,
  RotateCcw,
  Edit3,
  Power,
  Shield,
  Crown,
  User as UserIcon,
  ShieldAlert,
  ArrowLeft,
  Lock,
} from "lucide-react";

type StatusFilter = "all" | "active" | "inactive";

function RoleBadge({ role }: { role: Role }) {
  if (role === "owner") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F0EAF7] text-[#7455A4] border border-[#C9B8E2]">
        <Crown className="w-3 h-3 text-[#7455A4]" />
        <span>Owner</span>
      </span>
    );
  }

  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
        <Shield className="w-3 h-3 text-sky-600" />
        <span>Admin</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#91A68D]/15 text-[#91A68D] border border-[#91A68D]/30">
      <UserIcon className="w-3 h-3 text-[#91A68D]" />
      <span>Staff</span>
    </span>
  );
}

export default function StaffPage() {
  const toast = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { canManageStaff, canEditAccount } = usePermissions();

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Track in-flight action locks by staff ID
  const [inFlightIds, setInFlightIds] = useState<Record<number, boolean>>({});

  // Slide-over states for create & edit
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  const fetchStaff = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiFetch<Staff[]>("/staff?all=1");
      setStaffList(
        [...data].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        )
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load staff accounts. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && canManageStaff) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch staff list on initial page mount
      fetchStaff();
    }
  }, [isAuthLoading, canManageStaff]);

  // Filtered staff based on search query and status tab
  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return staffList.filter((member) => {
      const matchesSearch =
        !q ||
        member.name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q);

      const isActive = member.is_active ?? true;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive) ||
        (statusFilter === "inactive" && !isActive);

      return matchesSearch && matchesStatus;
    });
  }, [staffList, searchQuery, statusFilter]);

  // Counts for filter pills
  const counts = useMemo(() => {
    return {
      all: staffList.length,
      active: staffList.filter((s) => s.is_active ?? true).length,
      inactive: staffList.filter((s) => !(s.is_active ?? true)).length,
    };
  }, [staffList]);

  const handleOpenCreate = () => {
    setEditingStaff(null);
    setIsSlideOverOpen(true);
  };

  const handleOpenEdit = (member: Staff) => {
    setEditingStaff(member);
    setIsSlideOverOpen(true);
  };

  const handleSaveStaff = (savedStaff: Staff, isEdit: boolean) => {
    setStaffList((prev) => {
      let nextList: Staff[];
      if (isEdit) {
        nextList = prev.map((s) => (s.id === savedStaff.id ? savedStaff : s));
      } else {
        nextList = [savedStaff, ...prev];
      }
      return [...nextList].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
    });
  };

  // Quick toggle active / inactive status via PATCH { is_active }
  const handleToggleActive = async (member: Staff) => {
    const permission = canEditAccount(member);
    if (!permission.canDeactivate) {
      toast.error(permission.reason || "You cannot deactivate this account.");
      return;
    }

    const currentActive = member.is_active ?? true;
    const nextStatus = !currentActive;
    setInFlightIds((prev) => ({ ...prev, [member.id]: true }));

    try {
      const response = await apiFetch<{ message: string; staff: Staff }>(
        `/staff/${member.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_active: nextStatus }),
        }
      );

      const updated = response.staff || { ...member, is_active: nextStatus };
      setStaffList((prev) => prev.map((s) => (s.id === member.id ? updated : s)));
      toast.success(
        response.message ||
          `Account for "${member.name}" is now ${nextStatus ? "active" : "deactivated"}.`
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update account status.");
    } finally {
      setInFlightIds((prev) => {
        const next = { ...prev };
        delete next[member.id];
        return next;
      });
    }
  };

  // Wait for session and user resolution before deciding to prevent flash of restricted state
  if (isAuthLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Spinner className="w-8 h-8 text-[#7455A4]" />
        <span className="text-xs text-[#7A6F86] mt-2 font-medium">Checking permissions...</span>
      </div>
    );
  }

  // Friendly restricted access message for staff members
  if (!canManageStaff) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#F0EAF7] border border-[#C9B8E2]/60 flex items-center justify-center mx-auto text-[#7455A4] shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-[#33283D]">Access Restricted</h2>
          <p className="text-xs text-[#7A6F86] leading-relaxed">
            You do not have permission to view or manage staff accounts. This section is restricted to owners and administrators.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7455A4] hover:bg-[#5E4387] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Overview</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#33283D] pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#33283D] tracking-tight">Staff Management</h1>
          <p className="text-sm text-[#7A6F86] mt-0.5">
            Manage your team accounts, access roles, and login credentials
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7455A4] hover:bg-[#5E4387] text-white font-semibold text-sm rounded-xl shadow-xs transition-all duration-200 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>New staff account</span>
        </button>
      </div>

      {/* Search and Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#7A6F86] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff by name, email, or role..."
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
            <p className="text-sm font-semibold">Failed to load staff accounts</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <button
            type="button"
            onClick={fetchStaff}
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
                <div className="h-6 bg-gray-100 rounded-full w-20 hidden sm:block" />
                <div className="h-6 bg-gray-100 rounded-full w-16" />
              </div>
            ))}
          </div>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="text-center py-20 px-4 bg-white border border-[#EAE4F2] rounded-2xl shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F0EAF7] border border-[#C9B8E2]/50 flex items-center justify-center mx-auto text-[#7455A4] shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div className="max-w-sm mx-auto space-y-1">
            <h3 className="text-base font-bold text-[#33283D]">
              {searchQuery || statusFilter !== "all"
                ? "No staff members match your filters"
                : "No staff accounts found"}
            </h3>
            <p className="text-xs text-[#7A6F86]">
              {searchQuery || statusFilter !== "all"
                ? "Try clearing your search query or selecting a different status filter."
                : "Add your team members to grant them access to reservations and client records."}
            </p>
          </div>
          {!searchQuery && statusFilter === "all" ? (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#7455A4] hover:bg-[#5E4387] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>New staff account</span>
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
                  <th className="px-6 py-3.5">Member</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF8FC] bg-white">
                {filteredStaff.map((member) => {
                  const isActive = member.is_active ?? true;
                  const isInactive = !isActive;
                  const isInFlight = Boolean(inFlightIds[member.id]);
                  const editPermission = canEditAccount(member);
                  const isSelf = user?.id === member.id;

                  return (
                    <tr
                      key={member.id}
                      className={`hover:bg-[#FAF8FC] transition-colors group ${
                        isInactive ? "opacity-60 bg-gray-50/40" : ""
                      }`}
                    >
                      {/* Name & Avatar */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7455A4] to-[#9275BC] text-white flex items-center justify-center flex-shrink-0 shadow-xs font-bold text-xs">
                            {(member.name || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-sm font-semibold ${
                                  isInactive
                                    ? "text-[#7A6F86] line-through decoration-[#7A6F86]/40"
                                    : "text-[#33283D] group-hover:text-[#7455A4]"
                                }`}
                              >
                                {member.name}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] font-bold text-[#7455A4] bg-[#F0EAF7] px-1.5 py-0.2 rounded-md">
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-[#7A6F86]">
                          <Mail className="w-3.5 h-3.5 text-[#9275BC]" />
                          <span>{member.email}</span>
                        </span>
                      </td>

                      {/* Role Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <RoleBadge role={member.role} />
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

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!editPermission.canEdit && editPermission.reason && (
                            <span className="text-[11px] text-[#7A6F86] italic mr-1.5 hidden lg:inline">
                              {editPermission.reason}
                            </span>
                          )}

                          {/* Toggle Active/Inactive */}
                          <button
                            type="button"
                            disabled={isInFlight || !editPermission.canDeactivate}
                            onClick={() => handleToggleActive(member)}
                            title={
                              !editPermission.canDeactivate
                                ? editPermission.reason || "Action disabled"
                                : isActive
                                ? "Deactivate account"
                                : "Activate account"
                            }
                            className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              isActive
                                ? "border-[#EAE4F2] text-[#7A6F86] hover:text-amber-700 hover:bg-amber-50 hover:border-amber-200"
                                : "border-[#91A68D]/40 text-[#91A68D] hover:bg-[#91A68D]/15"
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            disabled={isInFlight || !editPermission.canEdit}
                            onClick={() => handleOpenEdit(member)}
                            title={
                              !editPermission.canEdit
                                ? editPermission.reason || "Action disabled"
                                : isSelf
                                ? "Edit profile details"
                                : "Edit account details"
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#7455A4] bg-[#F0EAF7] hover:bg-[#E4D8F0] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {editPermission.canEdit ? (
                              <Edit3 className="w-3.5 h-3.5" />
                            ) : (
                              <Lock className="w-3 h-3 text-[#7A6F86]" />
                            )}
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards List */}
          <div className="md:hidden divide-y divide-[#EAE4F2]">
            {filteredStaff.map((member) => {
              const isActive = member.is_active ?? true;
              const isInactive = !isActive;
              const isInFlight = Boolean(inFlightIds[member.id]);
              const editPermission = canEditAccount(member);
              const isSelf = user?.id === member.id;

              return (
                <div
                  key={member.id}
                  className={`p-4 space-y-3 transition-colors ${
                    isInactive ? "opacity-60 bg-gray-50/50" : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7455A4] to-[#9275BC] text-white flex items-center justify-center flex-shrink-0 font-bold text-xs shadow-xs">
                        {(member.name || "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4
                            className={`text-sm font-semibold truncate ${
                              isInactive ? "text-[#7A6F86] line-through" : "text-[#33283D]"
                            }`}
                          >
                            {member.name}
                          </h4>
                          {isSelf && (
                            <span className="text-[10px] font-bold text-[#7455A4] bg-[#F0EAF7] px-1 py-0.2 rounded-md">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#7A6F86] truncate mt-0.5">{member.email}</p>
                      </div>
                    </div>

                    <RoleBadge role={member.role} />
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-[#FAF8FC] text-xs">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
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

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isInFlight || !editPermission.canDeactivate}
                        onClick={() => handleToggleActive(member)}
                        title={
                          !editPermission.canDeactivate
                            ? editPermission.reason || "Action disabled"
                            : isActive
                            ? "Deactivate account"
                            : "Activate account"
                        }
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                          isActive
                            ? "border-[#EAE4F2] text-[#7A6F86] hover:bg-amber-50 hover:text-amber-700"
                            : "border-[#91A68D]/30 text-[#91A68D] bg-[#91A68D]/10"
                        }`}
                      >
                        {isActive ? "Deactivate" : "Activate"}
                      </button>

                      <button
                        type="button"
                        disabled={isInFlight || !editPermission.canEdit}
                        onClick={() => handleOpenEdit(member)}
                        title={
                          !editPermission.canEdit
                            ? editPermission.reason || "Action disabled"
                            : isSelf
                            ? "Edit profile"
                            : "Edit account"
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#7455A4] bg-[#F0EAF7] hover:bg-[#E4D8F0] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {editPermission.canEdit ? (
                          <Edit3 className="w-3 h-3" />
                        ) : (
                          <Lock className="w-3 h-3 text-[#7A6F86]" />
                        )}
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                  {!editPermission.canEdit && editPermission.reason && (
                    <p className="text-[11px] text-[#7A6F86] italic text-right pt-0.5">
                      {editPermission.reason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Slide-over Form */}
      <StaffFormSlideOver
        open={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        staff={editingStaff}
        onSuccess={handleSaveStaff}
      />
    </div>
  );
}
