"use client";

import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  Service,
  Therapist,
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
  ArrowUpDown,
} from "lucide-react";
import { CalendarView } from "@/components/reservations/CalendarView";
import { ReservationsTable } from "@/components/reservations/ReservationsTable";
import { ReservationForm } from "@/components/reservations/ReservationForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/context/ToastContext";
import { usePaginatedList } from "@/hooks/usePaginatedList";

function ReservationsContent() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read URL query parameters
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = Number(searchParams.get("per_page")) || 25;
  const statusParam = (searchParams.get("status") as ReservationStatus | "all") || "all";
  const therapistIdParam = searchParams.get("therapist_id") || "all";
  const fromParam = searchParams.get("from") || "";
  const toParam = searchParams.get("to") || "";
  const searchParam = searchParams.get("search") || "";
  const directionParam = (searchParams.get("direction") as "asc" | "desc") || "desc";

  // Local state for search input to allow smooth typing before URL update
  const [searchInput, setSearchInput] = useState(searchParam);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync search input on URL searchParam navigation
    setSearchInput(searchParam);
  }, [searchParam]);

  // Synchronize query updates to URL
  const updateQuery = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === undefined || val === "" || val === "all") {
          params.delete(key);
        } else {
          params.set(key, String(val));
        }
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  // Date range validation: from <= to
  const isDateRangeValid = useMemo(() => {
    if (fromParam && toParam) {
      return fromParam <= toParam;
    }
    return true;
  }, [fromParam, toParam]);

  // Filter options: Services & Therapists metadata
  const [services, setServices] = useState<Service[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);

  // View mode switcher: list vs calendar
  const [activeView, setActiveView] = useState<"list" | "calendar">("list");
  const [calendarReservations, setCalendarReservations] = useState<Reservation[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);

  // Paginated list hook for reservations list view
  const {
    items: reservations,
    total,
    currentPage,
    lastPage,
    from: pageFrom,
    to: pageTo,
    isLoading,
    isFetching,
    error,
    refresh,
    retry,
  } = usePaginatedList<Reservation>({
    endpoint: "/reservations",
    page,
    perPage,
    search: searchParam,
    filters: {
      status: statusParam !== "all" ? statusParam : undefined,
      therapist_id: therapistIdParam !== "all" ? therapistIdParam : undefined,
      from: isDateRangeValid && fromParam ? fromParam : undefined,
      to: isDateRangeValid && toParam ? toParam : undefined,
    },
    sort: "start_time",
    direction: directionParam,
    enabled: activeView === "list",
  });

  // Load services and therapists for dropdowns
  const fetchMetadata = useCallback(async () => {
    try {
      const [servicesData, therapistsData] = await Promise.all([
        apiFetch<Service[]>("/services").catch(() => []),
        apiFetch<Therapist[]>("/therapists?all=1").catch(() => []),
      ]);
      setServices(servicesData);
      setTherapists(therapistsData);
    } catch {
      // Ignored for filter metadata
    }
  }, []);

  // Fetch full unpaginated reservations when calendar view is opened
  const fetchCalendarData = useCallback(async () => {
    try {
      setIsCalendarLoading(true);
      const data = await apiFetch<Reservation[]>("/reservations");
      setCalendarReservations(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load calendar events.");
    } finally {
      setIsCalendarLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch service and therapist metadata for filters
    fetchMetadata();
  }, [fetchMetadata]);

  useEffect(() => {
    if (activeView === "calendar") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Load calendar events when calendar view is opened
      fetchCalendarData();
    }
  }, [activeView, fetchCalendarData]);

  // Action states
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Reservation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Slide-over modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [slotStartTime, setSlotStartTime] = useState<string | undefined>(undefined);

  // Status transition handler
  const handleStatusChange = async (reservation: Reservation, newStatus: ReservationStatus) => {
    if (newStatus === "cancelled") {
      setCancelTarget(reservation);
      return;
    }
    setUpdatingId(reservation.id);
    try {
      await apiFetch<{ message: string; reservation: Reservation }>(
        `/reservations/${reservation.id}`,
        { method: "PATCH", body: JSON.stringify({ status: newStatus }) }
      );
      toast.success(`Reservation marked as ${RESERVATION_STATUSES[newStatus].label}.`);
      refresh();
      if (activeView === "calendar") fetchCalendarData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update reservation status.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Confirm cancel dialog
  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    setUpdatingId(cancelTarget.id);
    try {
      await apiFetch<{ message: string; reservation: Reservation }>(
        `/reservations/${cancelTarget.id}`,
        { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) }
      );
      setCancelTarget(null);
      toast.success("Reservation cancelled.");
      refresh();
      if (activeView === "calendar") fetchCalendarData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel reservation.");
    } finally {
      setIsCancelling(false);
      setUpdatingId(null);
    }
  };

  // Confirm delete dialog
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setUpdatingId(deleteTarget.id);
    try {
      const response = await apiFetch<{ message: string }>(
        `/reservations/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      setDeleteTarget(null);
      toast.success(response.message || "Reservation deleted successfully.");
      refresh();
      if (activeView === "calendar") fetchCalendarData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete reservation.");
    } finally {
      setIsDeleting(false);
      setUpdatingId(null);
    }
  };

  const openCreateModal = (initialStart?: string) => {
    setEditingReservation(null);
    setSlotStartTime(initialStart);
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

  const handleReservationSaved = () => {
    refresh();
    if (activeView === "calendar") fetchCalendarData();
  };

  // Clear all filters handler
  const clearAllFilters = () => {
    setSearchInput("");
    router.push(pathname);
  };

  const hasActiveFilters = Boolean(
    searchParam ||
      statusParam !== "all" ||
      therapistIdParam !== "all" ||
      fromParam ||
      toParam
  );

  const statusTabs: { label: string; value: "all" | ReservationStatus }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
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
          <button
            onClick={() => retry()}
            className="text-sm underline hover:text-red-900 cursor-pointer font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {activeView === "calendar" ? (
        isCalendarLoading ? (
          <div className="flex justify-center items-center py-24 bg-white border border-[#EAE4F2] rounded-2xl shadow-xs">
            <div className="flex flex-col items-center gap-2">
              <Spinner className="w-8 h-8 text-[#7455A4]" />
              <span className="text-xs text-[#7A6F86] font-medium">Loading calendar schedule...</span>
            </div>
          </div>
        ) : (
          <CalendarView
            reservations={calendarReservations}
            therapists={therapists}
            searchQuery={searchParam}
            statusFilter={statusParam}
            onSlotClick={(timeStr) => openCreateModal(timeStr)}
            onStatusChange={handleStatusChange}
            onCancelClick={(res) => setCancelTarget(res)}
            onEditClick={openEditModal}
            onDeleteClick={(res) => setDeleteTarget(res)}
            updatingId={updatingId}
          />
        )
      ) : (
        <>
          {/* Filters Bar */}
          <div className="bg-white border border-[#EAE4F2] rounded-2xl p-4 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Search input */}
              <div className="md:col-span-4 relative">
                <Search className="w-4 h-4 text-[#7A6F86] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchInput(val);
                    updateQuery({ search: val || null, page: 1 });
                  }}
                  placeholder="Search client name or phone..."
                  className="w-full pl-9 pr-8 py-2 text-sm border border-[#EAE4F2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7455A4] focus:border-[#7455A4] bg-white text-[#33283D] placeholder-[#7A6F86]/60 transition-colors"
                />
                {searchInput && (
                  <button
                    onClick={() => {
                      setSearchInput("");
                      updateQuery({ search: null, page: 1 });
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A6F86] hover:text-[#33283D] cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Therapist Filter */}
              <div className="md:col-span-3">
                <select
                  value={therapistIdParam}
                  onChange={(e) => updateQuery({ therapist_id: e.target.value, page: 1 })}
                  className="w-full px-3 py-2 text-xs border border-[#EAE4F2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7455A4] bg-white text-[#33283D]"
                >
                  <option value="all">All Therapists</option>
                  {therapists.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {!t.is_active ? "(inactive)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range: From & To */}
              <div className="md:col-span-3 flex items-center gap-1.5">
                <input
                  type="date"
                  value={fromParam}
                  onChange={(e) => updateQuery({ from: e.target.value || null, page: 1 })}
                  className={`w-full px-2 py-1.5 text-xs border rounded-xl bg-white text-[#33283D] ${
                    !isDateRangeValid ? "border-red-400 bg-red-50" : "border-[#EAE4F2]"
                  }`}
                  title="From date"
                />
                <span className="text-xs text-[#7A6F86]">to</span>
                <input
                  type="date"
                  value={toParam}
                  onChange={(e) => updateQuery({ to: e.target.value || null, page: 1 })}
                  className={`w-full px-2 py-1.5 text-xs border rounded-xl bg-white text-[#33283D] ${
                    !isDateRangeValid ? "border-red-400 bg-red-50" : "border-[#EAE4F2]"
                  }`}
                  title="To date"
                />
              </div>

              {/* Sort toggle & Reset */}
              <div className="md:col-span-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateQuery({
                      direction: directionParam === "desc" ? "asc" : "desc",
                      page: 1,
                    })
                  }
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-[#7455A4] bg-[#F0EAF7] hover:bg-[#E4D8F0] border border-[#C9B8E2] rounded-xl transition-colors cursor-pointer"
                  title="Toggle chronological sorting"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>{directionParam === "desc" ? "Newest" : "Oldest"}</span>
                </button>

                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="p-2 text-xs text-[#7A6F86] hover:text-[#33283D] rounded-xl hover:bg-[#FAF8FC] border border-[#EAE4F2] transition-colors cursor-pointer"
                    title="Reset all filters"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Date Range Validation Warning */}
            {!isDateRangeValid && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Start date must be on or before end date.</span>
              </p>
            )}

            {/* Status Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pt-2 border-t border-[#EAE4F2]">
              {statusTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => updateQuery({ status: tab.value, page: 1 })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    statusParam === tab.value
                      ? "bg-[#33283D] text-white font-semibold shadow-xs"
                      : "text-[#7A6F86] hover:text-[#33283D] hover:bg-[#FAF8FC]"
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Table Component */}
          {isLoading ? (
            <div className="flex justify-center items-center py-24 bg-white border border-[#EAE4F2] rounded-2xl shadow-xs">
              <div className="flex flex-col items-center gap-2">
                <Spinner className="w-8 h-8 text-[#7455A4]" />
                <span className="text-xs text-[#7A6F86] font-medium">Loading reservations...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={isFetching ? "opacity-60 pointer-events-none transition-opacity" : ""}>
                <ReservationsTable
                  displayedReservations={reservations}
                  totalReservationsCount={total}
                  updatingId={updatingId}
                  onStatusChange={handleStatusChange}
                  onEditClick={openEditModal}
                  onDeleteClick={(res) => setDeleteTarget(res)}
                  onCreateClick={() => openCreateModal()}
                  onClearFilters={clearAllFilters}
                />
              </div>

              {/* Server-side Pagination Control */}
              <Pagination
                currentPage={currentPage}
                lastPage={lastPage}
                total={total}
                perPage={perPage}
                from={pageFrom}
                to={pageTo}
                onPageChange={(newPage) => updateQuery({ page: newPage })}
                onPerPageChange={(newPerPage) => updateQuery({ per_page: newPerPage, page: 1 })}
                disabled={isFetching}
              />
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Reservation?"
        confirmLabel="Delete Reservation"
        confirmLoadingLabel="Deleting..."
        cancelLabel="Keep Reservation"
        isConfirming={isDeleting}
      >
        {deleteTarget && (
          <>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              Are you sure you want to permanently delete this reservation for{" "}
              <strong className="text-gray-900">
                {deleteTarget.client?.full_name || "this client"}
              </strong>
              ? This action cannot be undone.
            </p>
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-1 text-gray-600">
              <p>
                <strong>Service:</strong> {deleteTarget.service?.name || "General Service"}
              </p>
              <p>
                <strong>Date & Time:</strong>{" "}
                {deleteTarget.start_time
                  ? new Date(deleteTarget.start_time).toLocaleString()
                  : "N/A"}
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
        services={services}
        existingReservations={reservations}
        onSuccess={handleReservationSaved}
      />
    </div>
  );
}

export default function ReservationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-24 bg-white border border-[#EAE4F2] rounded-2xl shadow-xs">
          <div className="flex flex-col items-center gap-2">
            <Spinner className="w-8 h-8 text-[#7455A4]" />
            <span className="text-xs text-[#7A6F86] font-medium">Loading reservations...</span>
          </div>
        </div>
      }
    >
      <ReservationsContent />
    </Suspense>
  );
}
