"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { Client, Reservation, ReservationStatus } from "@/types";
import { useToast } from "@/context/ToastContext";
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
          <Spinner className="w-8 h-8 text-indigo-600" />
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
  const toast = useToast();
  const clientId = Number(params?.id);

  const [client, setClient] = useState<Client | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!clientId || isNaN(clientId)) {
      setError("Invalid client ID.");
      setIsLoading(false);
      return;
    }

    const loadClientData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [clientData, allReservations] = await Promise.all([
          apiFetch<Client>(`/clients/${clientId}`),
          apiFetch<Reservation[]>("/reservations").catch(() => []),
        ]);

        setClient(clientData);

        const matchingReservations = allReservations.filter((res) => {
          const resClientId = res.client?.id ?? res.client_id;
          return resClientId !== undefined && Number(resClientId) === clientId;
        });

        setReservations(matchingReservations);
      } catch (err: any) {
        if (err.status === 404) {
          setError("Client not found or you do not have permission to view this client.");
        } else {
          setError(err.message || "Failed to load client details.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadClientData();
  }, [clientId]);

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
    } catch (err: any) {
      if (err instanceof ApiError && err.errors) {
        setFieldErrors(err.errors);
      }
      toast.error(err.message || "Failed to update client. Please check the inputs.");
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
    } catch (err: any) {
      const humanMessage =
        err.status === 409 || err.status === 400
          ? "This client cannot be deleted because they have active appointments or dependencies."
          : err.message || "Unable to delete client. Please try again or contact support.";
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
      const response = await apiFetch<{ message: string; reservation: Reservation }>(
        `/reservations/${reservation.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const updated = response.reservation || { ...reservation, status: newStatus };
      setReservations((prev) =>
        prev.map((item) => (item.id === reservation.id ? updated : item))
      );
      toast.success(`Reservation marked as ${newStatus}.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update reservation status.");
    } finally {
      setUpdatingResId(null);
    }
  };

  const handleConfirmCancelRes = async () => {
    if (!cancelResTarget) return;

    setIsCancellingRes(true);
    setUpdatingResId(cancelResTarget.id);

    try {
      const response = await apiFetch<{ message: string; reservation: Reservation }>(
        `/reservations/${cancelResTarget.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "cancelled" }),
        }
      );

      const updated = response.reservation || { ...cancelResTarget, status: "cancelled" };
      setReservations((prev) =>
        prev.map((item) => (item.id === cancelResTarget.id ? updated : item))
      );
      setCancelResTarget(null);
      toast.success("Reservation cancelled.");
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel reservation.");
    } finally {
      setIsCancellingRes(false);
      setUpdatingResId(null);
    }
  };

  const totalSpend = reservations
    .filter((r) => r.status !== "cancelled")
    .reduce((sum, r) => {
      const priceNum = Number(r.total_price ?? 0);
      return sum + (isNaN(priceNum) ? 0 : priceNum);
    }, 0);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner className="w-8 h-8 text-indigo-600" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </Link>
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-3">
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
            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
            title="Back to Clients"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {client.full_name}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Client Profile and Appointment History
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenEdit}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-xs transition-colors cursor-pointer"
          >
            <Edit3 className="w-4 h-4 text-gray-500" />
            Edit Profile
          </button>
          <button
            onClick={() => setIsDeleteOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 shadow-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Client Overview Card & Stats Grid */}
      <ClientProfileCard
        client={client}
        reservations={reservations}
        totalSpend={totalSpend}
      />

      {/* Reservation History Section */}
      <ClientReservationHistory
        reservations={reservations}
        updatingResId={updatingResId}
        onStatusChange={handleStatusChange}
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
          Are you sure you want to delete this client?
        </p>
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed">
          <strong>Warning:</strong> Deleting this client will permanently remove their profile and all of their associated appointments/reservations (cascade deletion).
        </div>
      </ConfirmDialog>

      {/* Reservation Cancellation Confirmation Modal */}
      <ConfirmDialog
        open={!!cancelResTarget}
        onClose={() => setCancelResTarget(null)}
        onConfirm={handleConfirmCancelRes}
        title="Cancel Reservation?"
        confirmLabel="Cancel Reservation"
        confirmLoadingLabel="Cancelling..."
        cancelLabel="Keep Reservation"
        isConfirming={isCancellingRes}
      >
        {cancelResTarget && (
          <>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              Are you sure you want to cancel the appointment for{" "}
              <strong className="text-gray-900">{client.full_name}</strong>?
            </p>
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-1 text-gray-600">
              <p>
                <strong>Service:</strong> {cancelResTarget.service?.name || "General Service"}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {cancelResTarget.start_time ? new Date(cancelResTarget.start_time).toLocaleString() : "N/A"}
              </p>
            </div>
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
