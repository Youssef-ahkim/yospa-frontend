"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { 
  Client, 
  Reservation, 
  ReservationStatus,
  RESERVATION_STATUSES,
  ALLOWED_STATUS_TRANSITIONS 
} from "@/types";
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  DollarSign, 
  Tag, 
  Edit3, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  CheckCheck,
  XCircle,
  X, 
  FileText,
  User,
  Plus
} from "lucide-react";

export default function ClientDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-24">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
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
  const clientId = Number(params?.id);

  const [client, setClient] = useState<Client | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
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
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Reservation Status In-Flight & Cancellation State
  const [updatingResId, setUpdatingResId] = useState<number | null>(null);
  const [cancelResTarget, setCancelResTarget] = useState<Reservation | null>(null);
  const [isCancellingRes, setIsCancellingRes] = useState(false);
  const [resActionError, setResActionError] = useState<string | null>(null);

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

        // Fetch client details and reservations in parallel
        const [clientData, allReservations] = await Promise.all([
          apiFetch<Client>(`/clients/${clientId}`),
          apiFetch<Reservation[]>("/reservations").catch(() => []),
        ]);

        setClient(clientData);

        // Filter reservations matching client id as numbers
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

  // Open Edit Modal with current data
  const handleOpenEdit = () => {
    if (!client) return;
    setEditFormData({
      full_name: client.full_name || "",
      phone: client.phone || "",
      email: client.email || "",
      notes: client.notes || "",
    });
    setFieldErrors({});
    setEditError(null);
    setIsEditOpen(true);
  };

  // Submit Edit
  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
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

      // Use res.client from the PUT response
      const updatedClient = response.client || response;
      setClient(updatedClient);
      setIsEditOpen(false);
    } catch (err: any) {
      if (err instanceof ApiError && err.errors) {
        setFieldErrors(err.errors);
      }
      setEditError(err.message || "Failed to update client. Please check the inputs.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Submit Delete
  const handleDeleteClient = async () => {
    setDeleteError(null);
    setIsDeleting(true);

    try {
      await apiFetch<{ message: string }>(`/clients/${clientId}`, {
        method: "DELETE",
      });

      // Redirect back to clients list
      router.push("/dashboard/clients");
    } catch (err: any) {
      const humanMessage =
        err.status === 409 || err.status === 400
          ? "This client cannot be deleted because they have active appointments or dependencies."
          : err.message || "Unable to delete client. Please try again or contact support.";
      setDeleteError(humanMessage);
      setIsDeleting(false);
    }
  };

  // Execute Status Transition for a Reservation
  const handleStatusChange = async (reservation: Reservation, newStatus: ReservationStatus) => {
    setResActionError(null);

    // If transitioning to cancelled, open confirmation dialog
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
    } catch (err: any) {
      setResActionError(err.message || "Failed to update reservation status.");
    } finally {
      setUpdatingResId(null);
    }
  };

  // Confirm Reservation Cancellation
  const handleConfirmCancelRes = async () => {
    if (!cancelResTarget) return;

    setIsCancellingRes(true);
    setResActionError(null);
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
    } catch (err: any) {
      setResActionError(err.message || "Failed to cancel reservation.");
    } finally {
      setIsCancellingRes(false);
      setUpdatingResId(null);
    }
  };

  // Total spend = sum of price over non-cancelled reservations only
  const totalSpend = reservations
    .filter((r) => r.status !== "cancelled")
    .reduce((sum, r) => {
      const priceNum = Number(r.total_price ?? 0);
      return sum + (isNaN(priceNum) ? 0 : priceNum);
    }, 0);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
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
            onClick={() => {
              setDeleteError(null);
              setIsDeleteOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 shadow-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Client Overview Card & Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Info Card */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-xl font-bold">
              {client.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{client.full_name}</h2>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-1">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {client.phone}
                </span>
                {client.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {client.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Contact Email</p>
              <p className="text-gray-900 mt-1 font-medium">{client.email || "No email registered"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Phone Number</p>
              <p className="text-gray-900 mt-1 font-medium">{client.phone}</p>
            </div>
            {client.created_at && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Joined Date</p>
                <p className="text-gray-900 mt-1 font-medium">
                  {new Date(client.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Client ID</p>
              <p className="text-gray-900 mt-1 font-medium">#{client.id}</p>
            </div>
          </div>

          {client.notes && (
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                Notes & Preferences
              </p>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">
                {client.notes}
              </p>
            </div>
          )}
        </div>

        {/* Stats Column */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
            <div className="flex items-center gap-3 text-indigo-600 mb-2">
              <Calendar className="w-5 h-5" />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Reservations
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{reservations.length}</p>
            <p className="text-xs text-gray-500 mt-1">
              {reservations.filter((r) => r.status === "confirmed" || r.status === "pending").length} upcoming/active
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
            <div className="flex items-center gap-3 text-emerald-600 mb-2">
              <DollarSign className="w-5 h-5" />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Spend
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">${totalSpend.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Excludes cancelled appointments</p>
          </div>
        </div>
      </div>

      {/* Reservation History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Appointment History</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              All reservations booked for this client
            </p>
          </div>
          <Link
            href="/dashboard/reservations"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Book Reservation
          </Link>
        </div>

        {resActionError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{resActionError}</span>
            </div>
            <button
              onClick={() => setResActionError(null)}
              className="text-red-400 hover:text-red-600 p-0.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {reservations.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-3 shadow-xs">
            <Calendar className="w-10 h-10 text-gray-300 mx-auto" />
            <h3 className="text-sm font-semibold text-gray-900">No Reservations Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              This client does not have any appointments recorded yet.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Service</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {reservations.map((res) => {
                    const serviceName = res.service?.name || "General Service";
                    const startTime = res.start_time;
                    const formattedPrice = res.total_price ?? 0;
                    const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[res.status] || [];
                    const isRowUpdating = updatingResId === res.id;

                    return (
                      <tr key={res.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            <Tag className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                            {serviceName}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${RESERVATION_STATUSES[res.status]?.badgeClass ?? "bg-gray-50 text-gray-700 border-gray-200"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${RESERVATION_STATUSES[res.status]?.dotClass ?? "bg-gray-400"}`} />
                            {RESERVATION_STATUSES[res.status]?.label ?? res.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {startTime ? new Date(startTime).toLocaleString() : "Date N/A"}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900">
                          <div className="flex items-center gap-0.5">
                            <DollarSign className="w-4 h-4 text-gray-400" />
                            {Number(formattedPrice).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm">
                          {isRowUpdating ? (
                            <div className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                              Updating...
                            </div>
                          ) : allowedNextStatuses.length === 0 ? (
                            <span className="text-xs text-gray-400 italic">No actions</span>
                          ) : (
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {allowedNextStatuses.includes("confirmed") && (
                                <button type="button" disabled={isRowUpdating} onClick={() => handleStatusChange(res, "confirmed")}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> Confirm
                                </button>
                              )}
                              {allowedNextStatuses.includes("completed") && (
                                <button type="button" disabled={isRowUpdating} onClick={() => handleStatusChange(res, "completed")}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer border border-blue-200">
                                  <CheckCheck className="w-3 h-3" /> Complete
                                </button>
                              )}
                              {allowedNextStatuses.includes("cancelled") && (
                                <button type="button" disabled={isRowUpdating} onClick={() => handleStatusChange(res, "cancelled")}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors cursor-pointer border border-red-200">
                                  <XCircle className="w-3 h-3" /> Cancel
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {reservations.map((res) => {
                const serviceName = res.service?.name || "General Service";
                const startTime = res.start_time;
                const formattedPrice = res.total_price ?? 0;
                const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[res.status] || [];
                const isRowUpdating = updatingResId === res.id;
                const statusConfig = RESERVATION_STATUSES[res.status];

                return (
                  <div key={res.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs space-y-3">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Tag className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <span className="text-sm font-semibold text-gray-900 truncate">{serviceName}</span>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize flex-shrink-0 ${statusConfig?.badgeClass ?? "bg-gray-50 text-gray-700 border-gray-200"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig?.dotClass ?? "bg-gray-400"}`} />
                        {statusConfig?.label ?? res.status}
                      </span>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {startTime ? new Date(startTime).toLocaleString() : "Date N/A"}
                      </div>
                      <div className="flex items-center gap-0.5 font-semibold text-gray-800">
                        <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                        {Number(formattedPrice).toFixed(2)}
                      </div>
                    </div>

                    {/* Actions */}
                    {isRowUpdating ? (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                        Updating...
                      </div>
                    ) : allowedNextStatuses.length > 0 && (
                      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                        {allowedNextStatuses.includes("confirmed") && (
                          <button type="button" onClick={() => handleStatusChange(res, "confirmed")}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                          </button>
                        )}
                        {allowedNextStatuses.includes("completed") && (
                          <button type="button" onClick={() => handleStatusChange(res, "completed")}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer">
                            <CheckCheck className="w-3.5 h-3.5" /> Complete
                          </button>
                        )}
                        {allowedNextStatuses.includes("cancelled") && (
                          <button type="button" onClick={() => handleStatusChange(res, "cancelled")}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors cursor-pointer">
                            <XCircle className="w-3.5 h-3.5" /> Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Edit Client Slide-over Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Edit Client</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form id="edit-client-form" onSubmit={handleUpdateClient} className="p-6 space-y-4">
                {editError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.full_name}
                    onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg shadow-xs focus:outline-none focus:ring-2 text-sm ${
                      fieldErrors.full_name
                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                    }`}
                    placeholder="e.g. John Doe"
                  />
                  {fieldErrors.full_name && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.full_name[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg shadow-xs focus:outline-none focus:ring-2 text-sm ${
                      fieldErrors.phone
                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                    }`}
                    placeholder="+212 600-000000"
                  />
                  {fieldErrors.phone && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.phone[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg shadow-xs focus:outline-none focus:ring-2 text-sm ${
                      fieldErrors.email
                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                    }`}
                    placeholder="john@example.com"
                  />
                  {fieldErrors.email && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.email[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="Preferences, allergy information, or special requests..."
                  />
                  {fieldErrors.notes && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.notes[0]}</p>
                  )}
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3 sticky bottom-0">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-client-form"
                disabled={isUpdating}
                className="flex-1 py-2 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Delete Client &quot;{client.full_name}&quot;?
              </h3>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                Are you sure you want to delete this client?
              </p>
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed">
                <strong>Warning:</strong> Deleting this client will permanently remove their profile and all of their associated appointments/reservations (cascade deletion).
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteOpen(false)}
                className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteClient}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isDeleting ? "Deleting..." : "Yes, Delete Client"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reservation Cancellation Confirmation Modal */}
      {cancelResTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Cancel Reservation?
              </h3>
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
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isCancellingRes}
                onClick={() => setCancelResTarget(null)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Keep Reservation
              </button>
              <button
                type="button"
                disabled={isCancellingRes}
                onClick={handleConfirmCancelRes}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isCancellingRes && <Loader2 className="w-4 h-4 animate-spin" />}
                {isCancellingRes ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

