"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { 
  Reservation, 
  ReservationStatus, 
  RESERVATION_STATUSES,
  Therapist
} from "@/types";
import { 
  START_HOUR, 
  END_HOUR, 
  TOTAL_HOURS, 
  HOUR_HEIGHT, 
  getStartOfWeek, 
  addDays, 
  isSameDay, 
  formatDayHeader, 
  formatWeekHeader, 
  formatTimeDisplay, 
  toLocalDatetimeString, 
  getEventSegmentForDay, 
  computeOverlapLayout,
  getVisibleDateRange
} from "./calendarUtils";
import { EventDetailPanel } from "./EventDetailPanel";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  AlertCircle,
  RotateCcw
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

interface CalendarViewProps {
  reservations?: Reservation[];
  therapists?: Therapist[];
  searchQuery?: string;
  statusFilter?: "all" | ReservationStatus;
  onSlotClick: (initialStartTime: string) => void;
  onStatusChange: (reservation: Reservation, newStatus: ReservationStatus) => Promise<void>;
  onCancelClick: (reservation: Reservation) => void;
  onEditClick: (reservation: Reservation) => void;
  onDeleteClick: (reservation: Reservation) => void;
  updatingId: number | null;
  refreshKey?: number;
}

type ViewMode = "day" | "week";

export function CalendarView({
  reservations: externalReservations,
  therapists = [],
  searchQuery = "",
  statusFilter = "all",
  onSlotClick,
  onStatusChange,
  onCancelClick,
  onEditClick,
  onDeleteClick,
  updatingId,
  refreshKey = 0,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [showCancelled, setShowCancelled] = useState<boolean>(false);
  const [therapistFilter, setTherapistFilter] = useState<string>("all");
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());

  // Internal range-fetched reservations for visible week/month
  const [fetchedReservations, setFetchedReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  // Range fetch for visible week/month (staying within backend 42-day limit)
  const fetchCalendarReservations = useCallback(async () => {
    const range = getVisibleDateRange(currentDate, viewMode);
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch<Reservation[]>(
        `/reservations?from=${range.fromStr}&to=${range.toStr}`
      );
      if (currentRequestId === requestIdRef.current) {
        setFetchedReservations(Array.isArray(data) ? data : []);
        setIsLoading(false);
      }
    } catch (err: unknown) {
      if (currentRequestId === requestIdRef.current) {
        if (err instanceof ApiError && err.errors?.date) {
          setError(err.errors.date[0]);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load calendar appointments.");
        }
        setIsLoading(false);
      }
    }
  }, [currentDate, viewMode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch calendar reservations on visible range navigation or refresh trigger
    fetchCalendarReservations();
  }, [fetchCalendarReservations, refreshKey]);

  // Use externalReservations if explicitly provided, otherwise use internal range-fetched reservations
  const activeReservations = useMemo(() => {
    if (externalReservations !== undefined) {
      return externalReservations;
    }
    return fetchedReservations;
  }, [fetchedReservations, externalReservations]);

  // Aggregate therapists from props + any inactive therapists appearing on loaded reservations
  const filterTherapistsList = useMemo(() => {
    const map = new Map<number, { id: number; name: string; color: string }>();

    // Add active therapists from props
    (therapists || []).forEach((t) => {
      map.set(t.id, { id: t.id, name: t.name, color: t.color });
    });

    // Add any therapists on loaded reservations (e.g. inactive)
    activeReservations.forEach((r) => {
      if (r.therapist && !map.has(r.therapist.id)) {
        map.set(r.therapist.id, {
          id: r.therapist.id,
          name: `${r.therapist.name} (inactive)`,
          color: r.therapist.color || "#7455A4",
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
  }, [therapists, activeReservations]);

  // Default to day view on small mobile screens (< 768px)
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial responsive viewport default on mount
      setViewMode("day");
    }
  }, []);

  // Update current-time clock every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Sync selectedReservation when the underlying reservations prop changes
  useEffect(() => {
    if (selectedReservation) {
      const updated = activeReservations.find((r) => r.id === selectedReservation.id);
      if (updated) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize selected reservation with updated reservations prop
        setSelectedReservation(updated);
      } else {
        setSelectedReservation(null);
      }
    }
  }, [activeReservations, selectedReservation]);

  // If statusFilter is "cancelled", show cancelled regardless of toggle
  const effectiveShowCancelled = showCancelled || statusFilter === "cancelled";

  // Filter reservations by search, status filter, and cancelled visibility
  const filteredReservations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return activeReservations.filter((res) => {
      // 1. Status Filter
      if (statusFilter !== "all" && res.status !== statusFilter) {
        return false;
      }

      // 2. Cancelled Toggle
      if (!effectiveShowCancelled && res.status === "cancelled") {
        return false;
      }

      // 3. Therapist Filter
      if (therapistFilter === "unassigned") {
        if (res.therapist != null || res.therapist_id != null) {
          return false;
        }
      } else if (therapistFilter !== "all") {
        const targetId = Number(therapistFilter);
        const rTherapistId = res.therapist_id ?? res.therapist?.id;
        if (rTherapistId == null || Number(rTherapistId) !== targetId) {
          return false;
        }
      }

      // 4. Search Query
      if (q) {
        const matchClient = res.client?.full_name?.toLowerCase().includes(q);
        const matchEmail = res.client?.email?.toLowerCase().includes(q);
        const matchPhone = res.client?.phone?.includes(q);
        const matchService = res.service?.name?.toLowerCase().includes(q);
        if (!matchClient && !matchEmail && !matchPhone && !matchService) {
          return false;
        }
      }

      return true;
    });
  }, [activeReservations, searchQuery, statusFilter, effectiveShowCancelled, therapistFilter]);

  // Days in view
  const daysInView = useMemo(() => {
    if (viewMode === "day") {
      return [currentDate];
    }
    const monday = getStartOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [currentDate, viewMode]);

  // Navigation handlers
  const handlePrev = () => {
    setCurrentDate((prev) => addDays(prev, viewMode === "day" ? -1 : -7));
  };

  const handleNext = () => {
    setCurrentDate((prev) => addDays(prev, viewMode === "day" ? 1 : 7));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Header Title
  const headerTitle = useMemo(() => {
    if (viewMode === "day") {
      return formatDayHeader(currentDate);
    }
    return formatWeekHeader(getStartOfWeek(currentDate));
  }, [currentDate, viewMode]);

  // Handle slot click (rounds to half hour)
  const handleSlotClick = (e: React.MouseEvent<HTMLDivElement>, dayDate: Date) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;

    const hourOffset = Math.floor(clickY / HOUR_HEIGHT);
    const minuteInHour = clickY % HOUR_HEIGHT >= HOUR_HEIGHT / 2 ? 30 : 0;
    const targetHour = Math.min(END_HOUR - 1, Math.max(START_HOUR, START_HOUR + hourOffset));

    const targetDate = new Date(
      dayDate.getFullYear(),
      dayDate.getMonth(),
      dayDate.getDate(),
      targetHour,
      minuteInHour,
      0,
      0
    );

    onSlotClick(toLocalDatetimeString(targetDate));
  };

  // Status change wrapper updating selectedReservation in place and refreshing
  const handleStatusChangeInternal = async (res: Reservation, newStatus: ReservationStatus) => {
    try {
      await onStatusChange(res, newStatus);
      setSelectedReservation((prev) => (prev?.id === res.id ? { ...prev, status: newStatus } : prev));
      fetchCalendarReservations();
    } catch {
      // Handled by onStatusChange / toast
    }
  };

  // Hour numbers for grid [7, 8, ..., 22]
  const hourList = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

  return (
    <div className="bg-white border border-[#EAE4F2] rounded-2xl shadow-xs overflow-hidden flex flex-col">
      {/* Calendar Top Toolbar */}
      <div className="p-4 border-b border-[#EAE4F2] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white">
        {/* Navigation & Title */}
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-xl border border-[#EAE4F2] p-0.5 bg-[#FAF8FC] shadow-xs">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg hover:bg-white text-[#7A6F86] hover:text-[#33283D] transition-colors cursor-pointer"
              title="Previous"
              aria-label="Previous period"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-white text-[#33283D] transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg hover:bg-white text-[#7A6F86] hover:text-[#33283D] transition-colors cursor-pointer"
              title="Next"
              aria-label="Next period"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-base font-extrabold text-[#33283D] flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#7455A4]" />
            <span>{headerTitle}</span>
            {isLoading && <Spinner className="w-3.5 h-3.5 text-[#7455A4]" />}
          </h2>
        </div>

        {/* View Mode & Toggles */}
        <div className="flex flex-wrap items-center gap-2.5 self-end md:self-auto">
          {/* Therapist Filter Select */}
          <div className="inline-flex items-center">
            <select
              value={therapistFilter}
              onChange={(e) => setTherapistFilter(e.target.value)}
              className="px-2.5 py-1 text-xs font-semibold rounded-xl border border-[#EAE4F2] bg-[#FAF8FC] text-[#33283D] hover:bg-white focus:outline-none focus:ring-1 focus:ring-[#7455A4] cursor-pointer max-w-[130px] sm:max-w-[170px] truncate"
              title="Filter appointments by assigned therapist"
              aria-label="Filter appointments by assigned therapist"
            >
              <option value="all">All Therapists</option>
              <option value="unassigned">Unassigned</option>
              {filterTherapistsList.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Show Cancelled Toggle */}
          <label className="inline-flex items-center gap-1.5 text-xs text-[#7A6F86] hover:text-[#33283D] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-[#C9B8E2] text-[#7455A4] focus:ring-[#7455A4] cursor-pointer"
            />
            <span>Show cancelled</span>
          </label>

          {/* Day / Week Switcher */}
          <div className="inline-flex rounded-xl border border-[#EAE4F2] p-0.5 bg-[#FAF8FC] shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode("day")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                viewMode === "day"
                  ? "bg-white text-[#33283D] shadow-xs"
                  : "text-[#7A6F86] hover:text-[#33283D]"
              }`}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                viewMode === "week"
                  ? "bg-white text-[#33283D] shadow-xs"
                  : "text-[#7A6F86] hover:text-[#33283D]"
              }`}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {/* Error State with Retry Button instead of empty calendar */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center m-4 bg-red-50 border border-red-200 rounded-2xl shadow-xs">
          <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
          <h3 className="text-sm font-bold text-red-800">Failed to load calendar appointments</h3>
          <p className="text-xs text-red-600 mt-1 max-w-md leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={() => fetchCalendarReservations()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : (
        /* Calendar Grid Container (Horizontally Scrollable in Week View) */
        <div className="overflow-x-auto relative flex-1">
        <div
          className={`min-w-full flex flex-col ${
            viewMode === "week" ? "min-w-[780px]" : "min-w-[320px]"
          }`}
        >
          {/* Header Row: Column Day Titles */}
          <div className="flex border-b border-[#EAE4F2] bg-[#FAF8FC] sticky top-0 z-20">
            {/* Sticky Time Label Header Column */}
            <div className="w-16 flex-shrink-0 sticky left-0 z-30 bg-[#FAF8FC] border-r border-[#EAE4F2] py-2.5 text-center text-[11px] font-semibold text-[#7A6F86] uppercase tracking-wider">
              Time
            </div>

            {/* Day Column Headers */}
            <div
              className="flex-1 grid"
              style={{
                gridTemplateColumns: `repeat(${daysInView.length}, minmax(${viewMode === "week" ? "110px" : "0"}, 1fr))`,
              }}
            >
              {daysInView.map((dayDate, idx) => {
                const isCurrentToday = isSameDay(dayDate, now);
                const dayName = dayDate.toLocaleDateString(undefined, { weekday: "short" });
                const dayNum = dayDate.getDate();

                return (
                  <div
                    key={idx}
                    className={`py-2 px-3 text-center border-r border-[#EAE4F2] last:border-r-0 ${
                      isCurrentToday ? "bg-[#F0EAF7]/30" : ""
                    }`}
                  >
                    <span className="text-[11px] font-medium text-[#7A6F86] uppercase tracking-wider block">
                      {dayName}
                    </span>
                    <span
                      className={`inline-flex items-center justify-center text-sm font-bold mt-0.5 w-7 h-7 rounded-full ${
                        isCurrentToday
                          ? "bg-[#7455A4] text-white shadow-xs"
                          : "text-[#33283D]"
                      }`}
                    >
                      {dayNum}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time Body Grid */}
          <div className="flex relative">
            {/* Left Sticky Hour Labels Column */}
            <div className="w-16 flex-shrink-0 sticky left-0 z-20 bg-white border-r border-[#EAE4F2] select-none">
              {hourList.map((hour) => {
                const hourFormatted = `${String(hour).padStart(2, "0")}:00`;
                return (
                  <div
                    key={hour}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    className="relative text-right pr-2 text-xs font-mono text-[#7A6F86]/70"
                  >
                    <span className="-top-2.5 relative">{hourFormatted}</span>
                  </div>
                );
              })}
            </div>

            {/* Day Columns Container */}
            <div
              className="flex-1 grid relative"
              style={{
                gridTemplateColumns: `repeat(${daysInView.length}, minmax(${viewMode === "week" ? "110px" : "0"}, 1fr))`,
                height: `${TOTAL_HOURS * HOUR_HEIGHT}px`,
              }}
            >
              {/* Horizontal Background Grid Lines */}
              <div className="absolute inset-0 pointer-events-none flex flex-col">
                {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                  <div
                    key={i}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    className="border-b border-[#FAF8FC] w-full"
                  />
                ))}
              </div>

              {/* Day Columns */}
              {daysInView.map((dayDate, dayIdx) => {
                const isCurrentToday = isSameDay(dayDate, now);

                // Compute segments and overlap positioning for this day
                const daySegments = filteredReservations
                  .map((res) => getEventSegmentForDay(res, dayDate))
                  .filter((seg): seg is NonNullable<typeof seg> => seg !== null);

                const positionedEvents = computeOverlapLayout(daySegments);

                // Current time line calculation
                let currentTimeTop: number | null = null;
                if (isCurrentToday) {
                  const minutesFromStart =
                    now.getHours() * 60 + now.getMinutes() - START_HOUR * 60;
                  if (minutesFromStart >= 0 && minutesFromStart <= TOTAL_HOURS * 60) {
                    currentTimeTop = (minutesFromStart / 60) * HOUR_HEIGHT;
                  }
                }

                return (
                  <div
                    key={dayIdx}
                    onClick={(e) => handleSlotClick(e, dayDate)}
                    className={`relative border-r border-[#EAE4F2] last:border-r-0 cursor-pointer hover:bg-[#F0EAF7]/20 transition-colors ${
                      isCurrentToday ? "bg-[#F0EAF7]/10" : "bg-white"
                    }`}
                    style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
                  >
                    {/* Current Time Indicator Line */}
                    {currentTimeTop !== null && (
                      <div
                        style={{ top: `${currentTimeTop}px` }}
                        className="absolute inset-x-0 z-20 pointer-events-none border-t-2 border-[#7455A4]"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[#7455A4] absolute -top-[5px] -left-1.5 shadow-xs" />
                      </div>
                    )}

                    {/* Positioned Event Cards */}
                    {positionedEvents.map((seg) => {
                      const res = seg.reservation;
                      const statusConfig = RESERVATION_STATUSES[res.status] || {
                        label: res.status,
                        badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
                        dotClass: "bg-gray-400",
                      };

                      const isCancelled = res.status === "cancelled";
                      const clientName = res.client?.full_name || "Unknown Client";
                      const serviceName = res.service?.name || "General Service";
                      const startTime = res.start_time
                        ? formatTimeDisplay(new Date(res.start_time))
                        : "";
                      const endTime = res.end_time
                        ? formatTimeDisplay(new Date(res.end_time))
                        : "";

                      return (
                        <div
                          key={`${res.id}-${dayIdx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReservation(res);
                          }}
                          style={{
                            top: `${seg.top}px`,
                            height: `${seg.height}px`,
                            left: `${seg.leftPercent}%`,
                            width: `${seg.widthPercent}%`,
                            borderLeftWidth: res.therapist?.color ? "4px" : undefined,
                            borderLeftColor: res.therapist?.color || undefined,
                          }}
                          className={`absolute z-10 p-1.5 rounded-lg border text-left overflow-hidden transition-all shadow-xs hover:shadow-md hover:scale-[1.01] hover:z-30 cursor-pointer flex flex-col justify-between ${
                            isCancelled
                              ? "bg-gray-50/80 border-dashed border-gray-300 text-gray-500 opacity-65"
                              : `${statusConfig.badgeClass}`
                          }`}
                          title={`${serviceName} - ${clientName}${res.therapist ? ` (Therapist: ${res.therapist.name})` : ""} (${startTime} - ${endTime})`}
                        >
                          <div className="min-w-0">
                            {/* Service Name & Time */}
                            <div className="flex items-center justify-between gap-1 leading-tight">
                              <span
                                className={`text-xs font-bold truncate ${
                                  isCancelled ? "line-through text-gray-500" : "text-gray-900"
                                }`}
                              >
                                {serviceName}
                              </span>
                            </div>

                            {/* Client & Therapist Name */}
                            <div className="flex items-center gap-1.5 text-[11px] truncate text-gray-700 font-medium mt-0.5">
                              {res.therapist && (
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0 shadow-2xs"
                                  style={{ backgroundColor: res.therapist.color }}
                                  title={`Therapist: ${res.therapist.name}`}
                                />
                              )}
                              <span className="truncate">{clientName}</span>
                            </div>
                          </div>

                          {/* Time & Price Footer (if height allows) */}
                          {seg.height >= 40 && (
                            <div className="flex items-center justify-between text-[10px] text-gray-500 pt-0.5">
                              <span className="font-mono">
                                {startTime}
                              </span>
                              <span className="font-semibold text-gray-700">
                                {Number(res.total_price ?? 0).toFixed(0)} MAD
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Selected Event Detail Modal / Panel */}
      {selectedReservation && (
        <EventDetailPanel
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
          onStatusChange={handleStatusChangeInternal}
          onCancelClick={onCancelClick}
          onEditClick={(res) => {
            setSelectedReservation(null);
            onEditClick(res);
          }}
          onDeleteClick={(res) => onDeleteClick(res)}
          isUpdating={updatingId === selectedReservation.id}
        />
      )}
    </div>
  );
}

