"use client";

import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import {
  Client,
  Service,
  Reservation,
  ReservationStatus,
  RESERVATION_STATUSES,
  ALLOWED_STATUS_TRANSITIONS,
} from "@/types";
import Link from "next/link";
import {
  Calendar,
  List,
  Clock,
  User,
  Tag,
  Plus,
  X,
  AlertCircle,
  Search,
  CheckCircle2,
  CheckCheck,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { CalendarView } from "@/components/reservations/CalendarView";
import { ReservationForm } from "@/components/reservations/ReservationForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/context/ToastContext";

type DateFilter = "all" | "today" | "upcoming" | "past";

export default function ReservationsPage() {
  const toast = useToast();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<"list" | "calendar">("list");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ReservationStatus>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    client_id: "",
    service_id: "",
    start_time: "",
    end_time: "",
    total_price: "",
    status: "confirmed" as ReservationStatus,
    notes: "",
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [reservationsData, clientsData, servicesData] = await Promise.all([
        apiFetch<Reservation[]>("/reservations"),
        apiFetch<Client[]>("/clients").catch(() => []),
        apiFetch<Service[]>("/services").catch(() => []),
      ]);
      setReservations(reservationsData);
      setClients(clientsData);
      setServices(servicesData);
    } catch (err: any) {
      setError(err.message || "Failed to load reservations.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const checkDateFilter = (startTimeStr: string, filter: DateFilter): boolean => {
    if (filter === "all") return true;
    const itemDate = new Date(startTimeStr);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    if (filter === "today") return itemDate >= startOfToday && itemDate <= endOfToday;
    if (filter === "upcoming") return itemDate > endOfToday;
    if (filter === "past") return itemDate < startOfToday;
    return true;
  };

  const baseFiltered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return reservations.filter((res) => {
      const matchesSearch =
        q === "" ||
        (res.client?.full_name && res.client.full_name.toLowerCase().includes(q)) ||
        (res.client?.phone && res.client.phone.includes(q)) ||
        (res.client?.email && res.client.email.toLowerCase().includes(q)) ||
        (res.service?.name && res.service.name.toLowerCase().includes(q));
      const matchesDate = checkDateFilter(res.start_time, dateFilter);
      return matchesSearch && matchesDate;
    });
  }, [reservations, searchQuery, dateFilter]);

  const statusCounts = useMemo(() => ({
    all: baseFiltered.length,
    pending: baseFiltered.filter((r) => r.status === "pending").length,
    confirmed: baseFiltered.filter((r) => r.status === "confirmed").length,
    completed: baseFiltered.filter((r) => r.status === "completed").length,
    cancelled: baseFiltered.filter((r) => r.status === "cancelled").length,
  }), [baseFiltered]);

  const displayedReservations = useMemo(
    () => baseFiltered.filter((r) => statusFilter === "all" || r.status === statusFilter),
    [baseFiltered, statusFilter]
  );

  const handleStatusChange = async (reservation: Reservation, newStatus: ReservationStatus) => {
    if (newStatus === "cancelled") {
      setCancelTarget(reservation);
      return;
    }
    setUpdatingId(reservation.id);
    try {
      const response = await apiFetch<{ message: string; reservation: Reservation }>(
        `/reservations/${reservation.id}`,
        { method: "PATCH", body: JSON.stringify({ status: newStatus }) }
      );
      const updated = response.reservation || { ...reservation, status: newStatus };
      setReservations((prev) => prev.map((item) => (item.id === reservation.id ? updated : item)));
      toast.success(`Reservation marked as ${RESERVATION_STATUSES[newStatus].label}.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update reservation status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    setUpdatingId(cancelTarget.id);
    try {
      const response = await apiFetch<{ message: string; reservation: Reservation }>(
        `/reservations/${cancelTarget.id}`,
        { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) }
      );
      const updated = response.reservation || { ...cancelTarget, status: "cancelled" };
      setReservations((prev) => prev.map((item) => (item.id === cancelTarget.id ? updated : item)));
      setCancelTarget(null);
      toast.success("Reservation cancelled.");
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel reservation.");
    } finally {
      setIsCancelling(false);
      setUpdatingId(null);
    }
  };

  const getDefaultStartTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const calculateEndTime = (startStr: string, durationMinutes: number) => {
    if (!startStr) return "";
    const startDate = new Date(startStr);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    return new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const openCreateModal = (initialStartTime?: string) => {
    setFormError(null);
    const initialStart = initialStartTime || getDefaultStartTime();
    const defaultService = services[0];
    const initialEnd = defaultService ? calculateEndTime(initialStart, defaultService.duration_minutes) : "";
    setFormData({
      client_id: clients.length > 0 ? String(clients[0].id) : "",
      service_id: defaultService ? String(defaultService.id) : "",
      start_time: initialStart,
      end_time: initialEnd,
      total_price: defaultService ? String(defaultService.price) : "",
      status: "confirmed",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleServiceChange = (serviceId: string) => {
    const selected = services.find((s) => String(s.id) === serviceId);
    setFormData((prev) => ({
      ...prev,
      service_id: serviceId,
      total_price: selected ? String(selected.price) : prev.total_price,
      end_time: selected && prev.start_time ? calculateEndTime(prev.start_time, selected.duration_minutes) : prev.end_time,
    }));
  };

  const handleStartTimeChange = (startTime: string) => {
    setFormData((prev) => {
      const selected = services.find((s) => String(s.id) === prev.service_id);
      return {
        ...prev,
        start_time: startTime,
        end_time: selected && startTime ? calculateEndTime(startTime, selected.duration_minutes) : prev.end_time,
      };
    });
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.client_id) { setFormError("Please select a client."); return; }
    if (!formData.service_id) { setFormError("Please select a service."); return; }
    if (!formData.start_time || !formData.end_time) { setFormError("Please specify both start and end date/time."); return; }
    if (new Date(formData.end_time) <= new Date(formData.start_time)) { setFormError("End time must be later than the start time."); return; }
    if (!formData.total_price || isNaN(Number(formData.total_price))) { setFormError("Please enter a valid price."); return; }

    setIsSubmitting(true);
    try {
      const payload = {
        client_id: Number(formData.client_id),
        service_id: Number(formData.service_id),
        start_time: formData.start_time.replace("T", " ") + ":00",
        end_time: formData.end_time.replace("T", " ") + ":00",
        total_price: parseFloat(String(formData.total_price)),
        status: formData.status,
        notes: formData.notes.trim() || null,
      };
      const response = await apiFetch<any>("/reservations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const newReservation = response.reservation || response;
      setReservations((prev) => [newReservation, ...prev]);
      setIsModalOpen(false);
      toast.success("Reservation created successfully.");
    } catch (err: any) {
      setFormError(err.message || "Failed to create reservation. Please review inputs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
          <p className="text-sm text-gray-500 mt-1">
            View, schedule, and manage appointment workflows
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* List / Calendar toggle */}
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveView("list")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                activeView === "list" ? "bg-white text-gray-900 shadow-xs font-semibold" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView("calendar")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                activeView === "calendar" ? "bg-white text-gray-900 shadow-xs font-semibold" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>
          <button
            onClick={() => openCreateModal()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Reservation
          </button>
        </div>
      </div>

      {/* Load error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-4">
        {/* Search & Date Filter Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by client name, email, phone, or service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Filter Tabs (List View Only) */}
          {activeView === "list" && (
            <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50 self-start sm:self-auto">
              {(
                [
                  { id: "all", label: "All Dates" },
                  { id: "today", label: "Today" },
                  { id: "upcoming", label: "Upcoming" },
                  { id: "past", label: "Past" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setDateFilter(item.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    dateFilter === item.id
                      ? "bg-white text-gray-900 shadow-xs font-semibold"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status Filter Pills Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          <span className="text-xs font-medium text-gray-400 mr-1">Status:</span>

          {/* All Pill */}
          <button
            onClick={() => setStatusFilter("all")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
              statusFilter === "all"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <span>All</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                statusFilter === "all" ? "bg-indigo-700 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {statusCounts.all}
            </span>
          </button>

          {/* Individual Status Pills */}
          {(["confirmed", "pending", "completed", "cancelled"] as const).map((statusKey) => {
            const config = RESERVATION_STATUSES[statusKey];
            const isSelected = statusFilter === statusKey;
            const count = statusCounts[statusKey];

            return (
              <button
                key={statusKey}
                onClick={() => setStatusFilter(statusKey)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : `${config.badgeClass} hover:opacity-80`
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : config.dotClass}`} />
                <span>{config.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isSelected ? "bg-indigo-700 text-white" : "bg-white/80 text-gray-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area: Calendar View vs List Table View */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-xl">
          <Spinner className="w-6 h-6 text-indigo-600 mb-3" />
          <p className="text-sm text-gray-400">Loading reservations...</p>
        </div>
      ) : activeView === "calendar" ? (
        <CalendarView
          reservations={reservations}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onSlotClick={(slotStartTime) => openCreateModal(slotStartTime)}
          onStatusChange={handleStatusChange}
          onCancelClick={(res) => setCancelTarget(res)}
          updatingId={updatingId}
        />
      ) : (
        <>
          {/* Results Header */}
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span>
              Showing <strong>{displayedReservations.length}</strong> of {reservations.length} total reservations
            </span>
            {(searchQuery || statusFilter !== "all" || dateFilter !== "all") && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset all filters
              </button>
            )}
          </div>

          {/* Table & Content Area */}
          {displayedReservations.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-200 rounded-xl space-y-3">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto" />
              <h3 className="text-sm font-semibold text-gray-900">
                {reservations.length === 0 ? "No reservations yet" : "No reservations match your filters"}
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {reservations.length === 0
                  ? "Get started by scheduling your first client appointment."
                  : "Try adjusting your search keyword, date period, or status tab to find matching appointments."}
              </p>
              <div className="pt-2">
                {reservations.length === 0 ? (
                  <button
                    onClick={() => openCreateModal()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Reservation
                  </button>
                ) : (
                  <button
                    onClick={clearAllFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {displayedReservations.map((res) => {
                      const clientName = res.client?.full_name || "Unknown Client";
                      const serviceName = res.service?.name || "General Service";
                      const formattedPrice = res.total_price ?? 0;
                      const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[res.status] || [];
                      const isRowUpdating = updatingId === res.id;

                      return (
                        <tr key={res.id} className="hover:bg-gray-50/80 transition-colors">
                          {/* Client Column */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <div>
                                {res.client?.id ? (
                                  <Link
                                    href={`/dashboard/clients/${res.client.id}`}
                                    className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                                  >
                                    {clientName}
                                  </Link>
                                ) : (
                                  <div className="text-sm font-semibold text-gray-900">{clientName}</div>
                                )}
                                <div className="text-xs text-gray-500">
                                  {res.client?.phone || res.client?.email || "No contact info"}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Service Column */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                              <Tag className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                              <span>{serviceName}</span>
                            </div>
                            {res.service?.duration_minutes && (
                              <span className="text-xs text-gray-400">
                                {res.service.duration_minutes} min duration
                              </span>
                            )}
                          </td>

                          {/* Status Column */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={res.status} />
                          </td>

                          {/* Date & Time Column */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span>
                                {res.start_time ? new Date(res.start_time).toLocaleString() : "Date N/A"}
                              </span>
                            </div>
                          </td>

                          {/* Price Column */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            <span>{formatCurrency(formattedPrice)}</span>
                          </td>

                          {/* Action Transitions Column */}
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            {isRowUpdating ? (
                              <div className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                                <Spinner className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Updating...</span>
                              </div>
                            ) : allowedNextStatuses.length === 0 ? (
                              <span className="text-xs text-gray-400 italic">No actions</span>
                            ) : (
                              <div className="inline-flex items-center justify-end gap-1.5">
                                {allowedNextStatuses.includes("confirmed") && (
                                  <button
                                    type="button"
                                    disabled={isRowUpdating}
                                    onClick={() => handleStatusChange(res, "confirmed")}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer border border-emerald-200"
                                    title="Confirm this appointment"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    Confirm
                                  </button>
                                )}

                                {allowedNextStatuses.includes("completed") && (
                                  <button
                                    type="button"
                                    disabled={isRowUpdating}
                                    onClick={() => handleStatusChange(res, "completed")}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer border border-blue-200"
                                    title="Mark appointment as completed"
                                  >
                                    <CheckCheck className="w-3 h-3" />
                                    Complete
                                  </button>
                                )}

                                {allowedNextStatuses.includes("cancelled") && (
                                  <button
                                    type="button"
                                    disabled={isRowUpdating}
                                    onClick={() => handleStatusChange(res, "cancelled")}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors cursor-pointer border border-red-200"
                                    title="Cancel this reservation"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    Cancel
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
            </div>
          )}
        </>
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
        title="Cancel Reservation?"
        description={
          cancelTarget ? (
            <>
              <p>
                Are you sure you want to cancel the appointment for{" "}
                <strong className="text-gray-900">
                  {cancelTarget.client?.full_name || "this client"}
                </strong>
                ?
              </p>
              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-1 text-gray-600">
                <p>
                  <strong>Service:</strong> {cancelTarget.service?.name || "General Service"}
                </p>
                <p>
                  <strong>Date:</strong>{" "}
                  {cancelTarget.start_time ? new Date(cancelTarget.start_time).toLocaleString() : "N/A"}
                </p>
              </div>
            </>
          ) : undefined
        }
        confirmLabel={isCancelling ? "Cancelling..." : "Yes, Cancel"}
        isConfirming={isCancelling}
      />

      {/* New Reservation Slide-Over */}
      <ReservationForm
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateReservation}
        clients={clients}
        services={services}
        formData={formData}
        onFormDataChange={setFormData}
        onServiceChange={handleServiceChange}
        onStartTimeChange={handleStartTimeChange}
        isSubmitting={isSubmitting}
        formError={formError}
      />
    </div>
  );
}
