"use client";

import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import {
  Client,
  Service,
  Reservation,
  ReservationStatus,
  RESERVATION_STATUSES,
} from "@/types";
import {
  Calendar,
  List,
  Plus,
  X,
  AlertCircle,
  Search,
  RotateCcw,
} from "lucide-react";
import { CalendarView } from "@/components/reservations/CalendarView";
import { ReservationsTable } from "@/components/reservations/ReservationsTable";
import { ReservationForm } from "@/components/reservations/ReservationForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [slotStartTime, setSlotStartTime] = useState<string | undefined>(undefined);

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

  const openCreateModal = (initialStartTime?: string) => {
    setEditingReservation(null);
    setSlotStartTime(initialStartTime);
    setIsModalOpen(true);
  };

  const openEditModal = (reservation: Reservation) => {
    if (reservation.status === "completed" || reservation.status === "cancelled") {
      toast.error("Completed and cancelled reservations cannot be edited.");
      return;
    }
    setEditingReservation(reservation);
    setSlotStartTime(undefined);
    setIsModalOpen(true);
  };

  const handleReservationSaved = (savedReservation: Reservation, isEdit: boolean) => {
    if (isEdit) {
      setReservations((prev) =>
        prev.map((item) => (item.id === savedReservation.id ? savedReservation : item))
      );
    } else {
      setReservations((prev) => [savedReservation, ...prev]);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateFilter("all");
  };

  const hasActiveFilters = searchQuery !== "" || statusFilter !== "all" || dateFilter !== "all";

  const statusTabs: { label: string; value: "all" | ReservationStatus; count: number }[] = [
    { label: "All", value: "all", count: statusCounts.all },
    { label: "Pending", value: "pending", count: statusCounts.pending },
    { label: "Confirmed", value: "confirmed", count: statusCounts.confirmed },
    { label: "Completed", value: "completed", count: statusCounts.completed },
    { label: "Cancelled", value: "cancelled", count: statusCounts.cancelled },
  ];

  const dateFilterButtons: { label: string; value: DateFilter }[] = [
    { label: "All Time", value: "all" },
    { label: "Today", value: "today" },
    { label: "Upcoming", value: "upcoming" },
    { label: "Past", value: "past" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#33283D] tracking-tight">Reservations</h1>
          <p className="text-sm text-[#7A6F86] mt-0.5">
            Manage your schedule, bookings, and appointment statuses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-[#FAF8FC] p-1 rounded-xl border border-[#EAE4F2]">
            <button
              onClick={() => setActiveView("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeView === "list"
                  ? "bg-white text-[#33283D] shadow-xs"
                  : "text-[#7A6F86] hover:text-[#33283D]"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setActiveView("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeView === "calendar"
                  ? "bg-white text-[#33283D] shadow-xs"
                  : "text-[#7A6F86] hover:text-[#33283D]"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>

          <button
            onClick={() => openCreateModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#7455A4] hover:bg-[#5E4387] text-white text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Reservation</span>
          </button>
        </div>
      </div>

      {/* Global Page Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button onClick={() => fetchData()} className="text-sm underline hover:text-red-900 cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex justify-center items-center py-24 bg-white border border-[#EAE4F2] rounded-2xl shadow-xs">
          <div className="flex flex-col items-center gap-2">
            <Spinner className="w-8 h-8 text-[#7455A4]" />
            <span className="text-xs text-[#7A6F86] font-medium">Loading reservations...</span>
          </div>
        </div>
      ) : activeView === "calendar" ? (
        <CalendarView
          reservations={reservations}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onSlotClick={(timeStr) => openCreateModal(timeStr)}
          onStatusChange={handleStatusChange}
          onCancelClick={(res) => setCancelTarget(res)}
          updatingId={updatingId}
        />
      ) : (
        <>
          {/* Filters Bar */}
          <div className="bg-white border border-[#EAE4F2] rounded-2xl p-4 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[#7A6F86] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by client, phone, email, service..."
                  className="w-full pl-9 pr-8 py-2 text-sm border border-[#EAE4F2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7455A4] focus:border-[#7455A4] bg-white text-[#33283D] placeholder-[#7A6F86]/60 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A6F86] hover:text-[#33283D] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Date Filter Quick Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {dateFilterButtons.map((btn) => (
                  <button
                    key={btn.value}
                    onClick={() => setDateFilter(btn.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      dateFilter === btn.value
                        ? "bg-[#33283D] text-white font-semibold"
                        : "text-[#7A6F86] hover:bg-[#FAF8FC] border border-[#EAE4F2]"
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}

                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#7A6F86] hover:text-[#33283D] rounded-lg hover:bg-[#FAF8FC] transition-colors cursor-pointer ml-1"
                    title="Reset all search filters"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pt-2 border-t border-[#EAE4F2]">
              {statusTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    statusFilter === tab.value
                      ? "bg-[#33283D] text-white font-semibold shadow-xs"
                      : "text-[#7A6F86] hover:text-[#33283D] hover:bg-[#FAF8FC]"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      statusFilter === tab.value
                        ? "bg-white/20 text-white"
                        : "bg-[#F0EAF7] text-[#7455A4]"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Table Component */}
          <ReservationsTable
            displayedReservations={displayedReservations}
            totalReservationsCount={reservations.length}
            updatingId={updatingId}
            onStatusChange={handleStatusChange}
            onCreateClick={() => openCreateModal()}
            onClearFilters={clearAllFilters}
          />
        </>
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
        title="Cancel Reservation?"
        confirmLabel="Cancel Reservation"
        confirmLoadingLabel="Cancelling..."
        cancelLabel="Keep Reservation"
        isConfirming={isCancelling}
      >
        {cancelTarget && (
          <>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
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
        )}
      </ConfirmDialog>

      {/* Reservation Form Slide-Over (Create and Edit) */}
      <ReservationForm
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingReservation(null);
          setSlotStartTime(undefined);
        }}
        initial={editingReservation}
        initialStartTime={slotStartTime}
        clients={clients}
        services={services}
        onSuccess={handleReservationSaved}
      />
    </div>
  );
}
