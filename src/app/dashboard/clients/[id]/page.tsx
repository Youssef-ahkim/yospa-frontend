"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { Client, Reservation, ReservationStatus } from "@/types";
import { usePermissions } from "@/lib/permissions";
import { useToast } from "@/context/ToastContext";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Spinner } from "@/components/ui/Spinner";
import { ClientReservationHistory } from "@/components/clients/ClientReservationHistory";
import { ClientEditSlideOver } from "@/components/clients/ClientEditSlideOver";
import { ClientProfileCard } from "@/components/clients/ClientProfileCard";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  AlertCircle,
} from "lucide-react";

export default function ClientDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-24">
          <Spinner className="w-8 h-8 text-[#7455A4]" />
        </div>
      }
    >
      <ClientDetailContent />
    </Suspense>
  );
}

function ClientDetailContent() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const clientId = Number(params?.id);

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = Number(searchParams.get("per_page")) || 25;

  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { canDelete } = usePermissions();

  // Synchronize query updates to URL
  const updateQuery = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === undefined || val === "") {
          p.delete(key);
        } else {
          p.set(key, String(val));
        }
      }
      router.push(`${pathname}?${p.toString()}`);
    },
    [router, pathname, searchParams]
  );

  // Paginated reservations for this client
  const {
    items: reservations,
    total: resTotal,
    currentPage,
    lastPage,
    from,
    to,
    isFetching: isResFetching,
    refresh: refreshReservations,
  } = usePaginatedList<Reservation>({
    endpoint: "/reservations",
    page,
    perPage,
    filters: {
      client_id: clientId,
    },
    sort: "start_time",
    direction: "desc",
    enabled: Boolean(clientId && !isNaN(clientId)),
    onPageChange: (p) => updateQuery({ page: p }),
  });

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    notes: "",
  });

  // Delete Confirmation Modal State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reservation Status In-Flight & Cancellation State
  const [updatingResId, setUpdatingResId] = useState<number | null>(null);
  const [cancelResTarget, setCancelResTarget] = useState<Reservation | null>(null);
  const [isCancellingRes, setIsCancellingRes] = useState(false);

  const loadClientData = useCallback(
    async (showLoading = false) => {
      try {
        if (showLoading) setIsLoading(true);
        setError(null);

        const clientData = await apiFetch<Client>(`/clients/${clientId}`);
        setClient(clientData);
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 404) {
          setError("Client not found or you do not have permission to view this client.");
        } else {
          setError(err instanceof Error ? err.message : "Failed to load client details.");
        }
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [clientId]
  );

  useEffect(() => {
    if (!clientId || isNaN(clientId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Validate clientId on mount before initiating fetch
      setError("Invalid client ID.");
      setIsLoading(false);
      return;
    }

    loadClientData(true);
  }, [clientId, loadClientData]);

  const handleOpenEdit = () => {
    if (!client) return;
    setEditFormData({
      full_name: client.full_name || "",
      phone: client.phone || "",
      email: client.email || "",
      notes: client.notes || "",
    });
    setFieldErrors({});
    setIsEditOpen(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setIsUpdating(true);

    try {
      const payload = {
        full_name: editFormData.full_name.trim(),
        phone: editFormData.phone.trim(),
        email: editFormData.email.trim() || null,
        notes: editFormData.notes.trim() || null,
      };

      const response = await apiFetch<{ message: string; client: Client }>(`/clients/${clientId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      const updatedClient = response.client || response;
      setClient(updatedClient);
      setIsEditOpen(false);
      toast.success("Client profile updated successfully.");
    } catch (err: unknown) {
      if (err instanceof ApiError && err.errors) {
        setFieldErrors(err.errors);
      }
      toast.error(err instanceof Error ? err.message : "Failed to update client. Please check the inputs.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClient = async () => {
    setIsDeleting(true);

    try {
      await apiFetch<{ message: string }>(`/clients/${clientId}`, {
        method: "DELETE",
      });

      toast.success("Client deleted successfully.");
      router.push("/dashboard/clients");
    } catch (err: unknown) {
      const apiErr = err instanceof ApiError ? err : null;
      const humanMessage =
        apiErr?.status === 409 || apiErr?.status === 400
          ? "This client cannot be deleted because they have active appointments or dependencies."
          : (err as Error)?.message || "Unable to delete client. Please try again or contact support.";
      toast.error(humanMessage);
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (reservation: Reservation, newStatus: ReservationStatus) => {
    if (newStatus === "cancelled") {
      setCancelResTarget(reservation);
      return;
    }

    setUpdatingResId(reservation.id);

    try {
      await apiFetch<{ message: string; reservation: Reservation }>(
        `/reservations/${reservation.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
        }
      );

      toast.success(`Reservation marked as ${newStatus}.`);
      refreshReservations();
      loadClientData(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update reservation status.");
    } finally {
      setUpdatingResId(null);
    }
  };

  const handleConfirmCancelRes = async () => {
    if (!cancelResTarget) return;

    setIsCancellingRes(true);
    setUpdatingResId(cancelResTarget.id);

    try {
      await apiFetch<{ message: string; reservation: Reservation }>(
        `/reservations/${cancelResTarget.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "cancelled" }),
        }
      );

      setCancelResTarget(null);
      toast.success("Reservation cancelled.");
      refreshReservations();
      loadClientData(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel reservation.");
    } finally {
      setIsCancellingRes(false);
      setUpdatingResId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner className="w-8 h-8 text-[#7455A4]" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#7A6F86] hover:text-[#33283D] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </Link>
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-sm">Error Loading Client</h3>
            <p className="text-sm mt-1">{error || "Client could not be found."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/clients"
            className="p-2.5 rounded-xl border border-[#EAE4F2] bg-white hover:bg-[#FAF8FC] text-[#33283D] transition-colors cursor-pointer"
            title="Back to Clients"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-[#33283D] flex items-center gap-2 tracking-tight">
              {client.full_name}
            </h1>
            <p className="text-sm text-[#7A6F86] mt-0.5">
              Client Profile and Appointment History
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenEdit}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-[#EAE4F2] rounded-xl text-sm font-semibold text-[#33283D] bg-white hover:bg-[#FAF8FC] shadow-xs transition-colors cursor-pointer"
          >
            <Edit3 className="w-4 h-4 text-[#7A6F86]" />
            Edit Profile
          </button>
          {canDelete && (
            <button
              onClick={() => setIsDeleteOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 border border-red-200 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 shadow-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Client Overview Card & Stats Grid */}
      <ClientProfileCard client={client} />

      {/* Reservation History Section with Server-Side Pagination */}
      <ClientReservationHistory
        reservations={reservations}
        updatingResId={updatingResId}
        onStatusChange={handleStatusChange}
        pagination={{
          currentPage,
          lastPage,
          total: resTotal,
          from,
          to,
          perPage,
          onPageChange: (p) => updateQuery({ page: p }),
          onPerPageChange: (pp) => updateQuery({ per_page: pp, page: 1 }),
          isLoading: isResFetching,
        }}
      />

      {/* Edit Client Slide-over */}
      <ClientEditSlideOver
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleUpdateClient}
        formData={editFormData}
        onFormDataChange={setEditFormData}
        fieldErrors={fieldErrors}
        isUpdating={isUpdating}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteClient}
        title={`Delete Client "${client.full_name}"?`}
        confirmLabel="Yes, Delete Client"
        confirmLoadingLabel="Deleting..."
        isConfirming={isDeleting}
      >
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
          Are you sure you want to delete this client? If the client has existing appointments, deletion may be blocked.
        </p>
      </ConfirmDialog>

      {/* Cancel Reservation Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(cancelResTarget)}
        onClose={() => setCancelResTarget(null)}
        onConfirm={handleConfirmCancelRes}
        title="Cancel Appointment?"
        confirmLabel="Yes, Cancel Appointment"
        confirmLoadingLabel="Cancelling..."
        isConfirming={isCancellingRes}
      >
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
          Are you sure you want to cancel this appointment? The client will be notified if automatic notifications are enabled.
        </p>
      </ConfirmDialog>
    </div>
  );
}
