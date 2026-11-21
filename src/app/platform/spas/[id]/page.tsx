"use client";

import { useEffect, useState, useCallback, useRef, use, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { PlatformSpaDetail, PlatformUser } from "@/types";
import { FormField } from "@/components/ui/FormField";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/context/ToastContext";
import { EditPlatformUserSlideOver } from "@/components/platform/EditPlatformUserSlideOver";
import {
  ArrowLeft,
  Users,
  UserCheck,
  Calendar,
  Sparkles,
  RotateCcw,
  Save,
  Trash2,
  Power,
  AlertCircle,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SpaDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-24">
          <Spinner className="w-8 h-8 text-[#7455A4]" />
        </div>
      }
    >
      <SpaDetailContent params={params} />
    </Suspense>
  );
}

function SpaDetailContent({ params }: PageProps) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const toast = useToast();

  const [detail, setDetail] = useState<PlatformSpaDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Spa edit state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSavingSpa, setIsSavingSpa] = useState(false);
  const [spaErrors, setSpaErrors] = useState<Record<string, string[]>>({});

  // Status toggle (Suspend / Activate) dialog
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [typedSlug, setTypedSlug] = useState("");
  const [isDeletingSpa, setIsDeletingSpa] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Edit user slide-over state
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);

  // Request ID ref to protect against stale responses
  const reqIdRef = useRef(0);

  const fetchSpaDetail = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch<PlatformSpaDetail>(`/platform/spas/${id}`);
      if (reqId === reqIdRef.current) {
        setDetail(data);
        setName(data.spa.name);
        setSlug(data.spa.slug);
      }
    } catch (err: unknown) {
      if (reqId === reqIdRef.current) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load spa details.");
        }
      }
    } finally {
      if (reqId === reqIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial load of spa detail
    fetchSpaDetail();
  }, [fetchSpaDetail]);

  const handleUpdateSpa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;

    setSpaErrors({});
    setIsSavingSpa(true);

    try {
      const payload: { name?: string; slug?: string } = {};
      if (name.trim() !== detail.spa.name) {
        payload.name = name.trim();
      }
      if (slug.trim() !== detail.spa.slug) {
        payload.slug = slug.trim();
      }

      if (Object.keys(payload).length === 0) {
        toast.info("No changes to save.");
        setIsSavingSpa(false);
        return;
      }

      const res = await apiFetch<{ message: string; spa: PlatformSpaDetail["spa"] }>(
        `/platform/spas/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        }
      );

      setDetail((prev) => (prev ? { ...prev, spa: res.spa } : prev));
      setName(res.spa.name);
      setSlug(res.spa.slug);
      toast.success(res.message || "Spa details updated.");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 422 && err.errors) {
          setSpaErrors(err.errors);
          const firstKey = Object.keys(err.errors)[0];
          if (firstKey && err.errors[firstKey][0]) {
            toast.error(err.errors[firstKey][0]);
          }
        } else {
          toast.error(err.message || "Failed to update spa.");
        }
      } else {
        toast.error("Failed to update spa.");
      }
    } finally {
      setIsSavingSpa(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!detail) return;

    setIsTogglingStatus(true);
    const nextStatus = detail.spa.status === "active" ? "suspended" : "active";

    try {
      const res = await apiFetch<{ message: string; spa: PlatformSpaDetail["spa"] }>(
        `/platform/spas/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        }
      );

      setDetail((prev) => (prev ? { ...prev, spa: res.spa } : prev));
      toast.success(
        nextStatus === "suspended"
          ? "Spa suspended. All tenant users are now locked out."
          : "Spa activated. Tenant users have regained access."
      );
      setIsStatusDialogOpen(false);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        toast.error(err.message || "Failed to change spa status.");
      } else {
        toast.error("Failed to change spa status.");
      }
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleDeleteSpa = async () => {
    if (!detail) return;
    if (typedSlug.trim() !== detail.spa.slug) {
      setDeleteError("Confirmation slug does not match.");
      return;
    }

    setIsDeletingSpa(true);
    setDeleteError(null);

    try {
      await apiFetch<{ message: string }>(`/platform/spas/${id}`, {
        method: "DELETE",
        body: JSON.stringify({ confirm_slug: typedSlug.trim() }),
      });

      toast.success("Spa and associated records permanently deleted.");
      setIsDeleteDialogOpen(false);
      router.replace("/platform");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setDeleteError(err.message || "Cannot delete spa. Must be suspended with 0 reservations.");
        } else if (err.status === 422 && err.errors?.confirm_slug) {
          setDeleteError(err.errors.confirm_slug[0]);
        } else {
          setDeleteError(err.message || "Failed to delete spa.");
        }
        toast.error(err.message || "Failed to delete spa.");
      } else {
        setDeleteError("Failed to delete spa. Please try again.");
      }
    } finally {
      setIsDeletingSpa(false);
    }
  };

  const handleUserSaved = (updatedUser: PlatformUser) => {
    setDetail((prev) => {
      if (!prev) return prev;
      const updatedUsers = prev.users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
      return { ...prev, users: updatedUsers };
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-gray-100 rounded animate-pulse" />
        <div className="bg-white border border-[#EAE4F2] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="h-7 w-64 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-2xl text-center space-y-4">
        <AlertCircle size={32} className="text-red-500 mx-auto" />
        <div>
          <h2 className="text-base font-bold text-red-900">Failed to Load Spa</h2>
          <p className="text-xs text-red-700 mt-1">{error || "Spa not found."}</p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/platform"
            className="px-4 py-2 bg-white border border-red-200 text-red-700 rounded-xl text-xs font-semibold hover:bg-red-50 transition-colors min-h-[40px] flex items-center justify-center"
          >
            Back to Spas
          </Link>
          <button
            onClick={fetchSpaDetail}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors cursor-pointer min-h-[40px] flex items-center gap-1.5"
          >
            <RotateCcw size={14} />
            Try again
          </button>
        </div>
      </div>
    );
  }

  const spa = detail.spa;
  const counts = detail.counts;
  const isActive = spa.status === "active";

  // Deletion guard checks
  const isSuspended = spa.status === "suspended";
  const hasZeroReservations = counts.reservations === 0;
  const canDeleteSpa = isSuspended && hasZeroReservations;

  let deleteDisabledReason = "";
  if (!isSuspended && !hasZeroReservations) {
    deleteDisabledReason = `Spa must be suspended and have 0 reservations before deletion (currently active with ${counts.reservations} reservation(s)).`;
  } else if (!isSuspended) {
    deleteDisabledReason = "Spa must be suspended before deletion.";
  } else if (!hasZeroReservations) {
    deleteDisabledReason = `Cannot delete spa with existing reservations (${counts.reservations} reservation(s)).`;
  }

  const createdFormatted = spa.created_at
    ? new Date(spa.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <div className="space-y-6 text-[#33283D]">
      {/* ── Top Navigation & Back Link ── */}
      <div>
        <Link
          href="/platform"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7455A4] hover:text-[#5a3e87] transition-colors p-1 -ml-1 rounded-lg min-h-[36px]"
        >
          <ArrowLeft size={14} />
          <span>Back to Spas</span>
        </Link>
      </div>

      {/* ── Spa Header Card ── */}
      <div className="bg-white border border-[#EAE4F2] rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#1A1626] tracking-tight">{spa.name}</h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
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
          <div className="flex items-center gap-2 text-xs text-[#7A6F86]">
            <span className="font-mono text-[#7455A4]">/{spa.slug}</span>
            <span>·</span>
            <span>Created {createdFormatted}</span>
          </div>
        </div>

        {/* Suspend / Activate Action Button */}
        <button
          onClick={() => setIsStatusDialogOpen(true)}
          className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[40px] self-start sm:self-auto border ${
            isActive
              ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
              : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
          }`}
        >
          <Power size={14} />
          <span>{isActive ? "Suspend Spa" : "Activate Spa"}</span>
        </button>
      </div>

      {/* ── Entity Counts Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-[#EAE4F2] rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#7A6F86]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Users</span>
            <Users size={14} className="text-[#9275BC]" />
          </div>
          <p className="text-xl font-bold text-[#1A1626] mt-1">{counts.users}</p>
        </div>

        <div className="bg-white border border-[#EAE4F2] rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#7A6F86]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Clients</span>
            <UserCheck size={14} className="text-[#9275BC]" />
          </div>
          <p className="text-xl font-bold text-[#1A1626] mt-1">{counts.clients}</p>
        </div>

        <div className="bg-white border border-[#EAE4F2] rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#7A6F86]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Services</span>
            <Sparkles size={14} className="text-[#9275BC]" />
          </div>
          <p className="text-xl font-bold text-[#1A1626] mt-1">{counts.services}</p>
        </div>

        <div className="bg-white border border-[#EAE4F2] rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-[#7A6F86]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Therapists</span>
            <UserCheck size={14} className="text-[#9275BC]" />
          </div>
          <p className="text-xl font-bold text-[#1A1626] mt-1">{counts.therapists}</p>
        </div>

        <div className="bg-white border border-[#EAE4F2] rounded-xl p-3.5 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[#7A6F86]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Bookings</span>
            <Calendar size={14} className="text-[#9275BC]" />
          </div>
          <p className="text-xl font-bold text-[#1A1626] mt-1">{counts.reservations}</p>
        </div>
      </div>

      {/* ── Edit Spa Information Form Card ── */}
      <div className="bg-white border border-[#EAE4F2] rounded-2xl p-6 shadow-xs">
        <div className="mb-4">
          <h2 className="text-base font-bold text-[#1A1626]">Spa Settings</h2>
          <p className="text-xs text-[#7A6F86]">Modify spa display name and public slug</p>
        </div>

        <form onSubmit={handleUpdateSpa} className="space-y-4 max-w-xl">
          <FormField label="Spa Name" error={spaErrors.name?.[0]} required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[#EAE4F2] rounded-xl text-[#1A1626] focus:outline-none focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4] transition-all min-h-[40px]"
              required
            />
          </FormField>

          <FormField label="Slug" error={spaErrors.slug?.[0]} required>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[#EAE4F2] rounded-xl text-[#1A1626] font-mono focus:outline-none focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4] transition-all min-h-[40px]"
              required
            />
          </FormField>

          <button
            type="submit"
            disabled={
              isSavingSpa ||
              (name.trim() === spa.name && slug.trim() === spa.slug)
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#7455A4] hover:bg-[#63478e] shadow-sm transition-all disabled:opacity-50 cursor-pointer min-h-[40px]"
          >
            {isSavingSpa ? (
              <>
                <Spinner className="w-3.5 h-3.5 text-white" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* ── Users Table Section ── */}
      <div className="bg-white border border-[#EAE4F2] rounded-2xl shadow-xs overflow-hidden">
        <div className="p-6 border-b border-[#EAE4F2]/60 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#1A1626]">Spa Users</h2>
            <p className="text-xs text-[#7A6F86]">
              Accounts provisioned under this spa ({detail.users.length} total)
            </p>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8FC] border-b border-[#EAE4F2] text-[#7A6F86] font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-3.5">Name</th>
                <th className="px-4 py-3.5">Email</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE4F2]/60">
              {detail.users.map((u) => (
                <tr key={u.id} className="hover:bg-[#FAF8FC]/70 transition-colors">
                  <td className="px-6 py-4 font-semibold text-[#1A1626]">{u.name}</td>
                  <td className="px-4 py-4 text-[#7A6F86] font-mono">{u.email}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-[#7455A4] border border-[#C9B8E2]/60">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        u.is_active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          u.is_active ? "bg-emerald-500" : "bg-gray-400"
                        }`}
                      />
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setIsEditUserOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#7455A4] bg-[#F0EAF7] hover:bg-[#E4D8EE] transition-colors cursor-pointer min-h-[36px]"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-[#EAE4F2]/60">
          {detail.users.map((u) => (
            <div key={u.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-sm text-[#1A1626]">{u.name}</h3>
                  <p className="text-xs text-[#7A6F86] font-mono">{u.email}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    u.is_active
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-gray-100 text-gray-600 border-gray-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      u.is_active ? "bg-emerald-500" : "bg-gray-400"
                    }`}
                  />
                  {u.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-[#7455A4]">
                  {u.role}
                </span>
                <button
                  onClick={() => {
                    setSelectedUser(u);
                    setIsEditUserOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#7455A4] bg-[#F0EAF7] hover:bg-[#E4D8EE] transition-colors cursor-pointer min-h-[40px]"
                >
                  Manage User
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Danger Zone Card ── */}
      <div className="bg-red-50/40 border border-red-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-red-900">Danger Zone</h2>
          <p className="text-xs text-red-700 mt-0.5">
            Permanently delete this spa and all associated tenant records (clients, services, therapists, users).
          </p>
        </div>

        {!canDeleteSpa && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Deletion is disabled</p>
              <p className="mt-0.5">{deleteDisabledReason}</p>
            </div>
          </div>
        )}

        <div>
          <button
            type="button"
            disabled={!canDeleteSpa}
            onClick={() => {
              setTypedSlug("");
              setDeleteError(null);
              setIsDeleteDialogOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[40px]"
          >
            <Trash2 size={14} />
            <span>Delete Spa</span>
          </button>
        </div>
      </div>

      {/* ── Suspend / Activate ConfirmDialog ── */}
      <ConfirmDialog
        open={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        onConfirm={handleToggleStatus}
        isConfirming={isTogglingStatus}
        title={isActive ? "Suspend Spa Tenant?" : "Activate Spa Tenant?"}
        confirmLabel={isActive ? "Suspend Spa" : "Activate Spa"}
        confirmClassName={
          isActive
            ? "bg-amber-600 hover:bg-amber-700 text-white"
            : "bg-emerald-600 hover:bg-emerald-700 text-white"
        }
        description={
          isActive ? (
            <span className="text-xs text-[#7A6F86] block space-y-1">
              <span>
                Suspending this spa will immediately lock out all its users.
              </span>{" "}
              <strong className="text-[#1A1626] font-semibold">
                Users will receive a 403 Account Deactivated response and will be evicted from the app on their next authenticated request.
              </strong>
            </span>
          ) : (
            <span className="text-xs text-[#7A6F86]">
              Activating this spa will restore dashboard access for its owner, admin, and staff accounts.
            </span>
          )
        }
      />

      {/* ── Delete Spa Typed-Slug ConfirmDialog ── */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteSpa}
        isConfirming={isDeletingSpa}
        confirmDisabled={typedSlug.trim() !== spa.slug}
        title="Permanently Delete Spa?"
        confirmLabel="Permanently Delete"
        confirmLoadingLabel="Deleting..."
        confirmClassName="bg-red-600 hover:bg-red-700 text-white"
      >
        <div className="space-y-3 mt-3 text-xs text-[#33283D]">
          <p className="text-red-700 font-medium">
            This action is permanent and cannot be undone. All services, therapists, clients, and user accounts under this spa will be removed.
          </p>
          <div className="space-y-1.5">
            <label className="block font-medium">
              Type <strong className="font-mono text-red-600 font-bold select-all">{spa.slug}</strong> to confirm:
            </label>
            <input
              type="text"
              value={typedSlug}
              onChange={(e) => setTypedSlug(e.target.value)}
              placeholder={spa.slug}
              className="w-full px-3 py-2 border border-red-300 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>
          {deleteError && (
            <p className="text-xs text-red-600 font-semibold">{deleteError}</p>
          )}
        </div>
      </ConfirmDialog>

      {/* ── Edit Platform User Slide-Over ── */}
      <EditPlatformUserSlideOver
        open={isEditUserOpen}
        onClose={() => {
          setIsEditUserOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSuccess={handleUserSaved}
      />
    </div>
  );
}
