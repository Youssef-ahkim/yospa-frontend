"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Reservation, 
  ReservationStatus, 
  RESERVATION_STATUSES 
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
  PositionedSegment
} from "./calendarUtils";
import { EventDetailPanel } from "./EventDetailPanel";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  User,
  Tag
} from "lucide-react";

interface CalendarViewProps {
  reservations: Reservation[];
  searchQuery: string;
  statusFilter: "all" | ReservationStatus;
  onSlotClick: (initialStartTime: string) => void;
  onStatusChange: (reservation: Reservation, newStatus: ReservationStatus) => Promise<void>;
  onCancelClick: (reservation: Reservation) => void;
  updatingId: number | null;
}

type ViewMode = "day" | "week";

export function CalendarView({
  reservations,
  searchQuery,
  statusFilter,
  onSlotClick,
  onStatusChange,
  onCancelClick,
  updatingId,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [showCancelled, setShowCancelled] = useState<boolean>(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());

  // Default to day view on small mobile screens (< 768px)
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
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
      const updated = reservations.find((r) => r.id === selectedReservation.id);
      if (updated) {
        setSelectedReservation(updated);
      }
    }
  }, [reservations, selectedReservation?.id]);

  // If statusFilter is "cancelled", show cancelled regardless of toggle
  const effectiveShowCancelled = showCancelled || statusFilter === "cancelled";

  // Filter reservations by search, status filter, and cancelled visibility
  const filteredReservations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return reservations.filter((res) => {
      // 1. Status Filter
      if (statusFilter !== "all" && res.status !== statusFilter) {
        return false;
      }

      // 2. Cancelled Toggle
      if (!effectiveShowCancelled && res.status === "cancelled") {
        return false;
      }

      // 3. Search Query
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
  }, [reservations, searchQuery, statusFilter, effectiveShowCancelled]);

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

  // Status change wrapper updating selectedReservation in place
  const handleStatusChangeInternal = async (res: Reservation, newStatus: ReservationStatus) => {
    await onStatusChange(res, newStatus);
    setSelectedReservation((prev) => (prev?.id === res.id ? { ...prev, status: newStatus } : prev));
  };

  // Hour numbers for grid [7, 8, ..., 22]
  const hourList = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
      {/* Calendar Top Toolbar */}
      <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white">
        {/* Navigation & Title */}
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 shadow-xs">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-md hover:bg-white text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold rounded-md hover:bg-white text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-md hover:bg-white text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-indigo-600" />
            <span>{headerTitle}</span>
          </h2>
        </div>

        {/* View Mode & Toggles */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Show Cancelled Toggle */}
          <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span>Show cancelled</span>
          </label>

          {/* Day / Week Switcher */}
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode("day")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                viewMode === "day"
                  ? "bg-white text-gray-900 shadow-xs font-bold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                viewMode === "week"
                  ? "bg-white text-gray-900 shadow-xs font-bold"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid Container (Horizontally Scrollable in Week View) */}
      <div className="overflow-x-auto relative flex-1">
        <div
          className={`min-w-full flex flex-col ${
            viewMode === "week" ? "min-w-[780px]" : "min-w-[320px]"
          }`}
        >
          {/* Header Row: Column Day Titles */}
          <div className="flex border-b border-gray-200 bg-gray-50/90 sticky top-0 z-20">
            {/* Sticky Time Label Header Column */}
            <div className="w-16 flex-shrink-0 sticky left-0 z-30 bg-gray-50 border-r border-gray-200 py-2.5 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Time
            </div>

            {/* Day Column Headers */}
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${daysInView.length}, minmax(0, 1fr))` }}>
              {daysInView.map((dayDate, idx) => {
                const isCurrentToday = isSameDay(dayDate, now);
                const dayName = dayDate.toLocaleDateString(undefined, { weekday: "short" });
                const dayNum = dayDate.getDate();

                return (
                  <div
                    key={idx}
                    className={`py-2 px-3 text-center border-r border-gray-200 last:border-r-0 ${
                      isCurrentToday ? "bg-indigo-50/60" : ""
                    }`}
                  >
                    <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
                      {dayName}
                    </span>
                    <span
                      className={`inline-flex items-center justify-center text-sm font-bold mt-0.5 w-7 h-7 rounded-full ${
                        isCurrentToday
                          ? "bg-indigo-600 text-white"
                          : "text-gray-900"
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
            <div className="w-16 flex-shrink-0 sticky left-0 z-20 bg-white border-r border-gray-200 select-none">
              {hourList.map((hour) => {
                const hourFormatted = `${String(hour).padStart(2, "0")}:00`;
                return (
                  <div
                    key={hour}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    className="relative text-right pr-2 text-xs font-mono text-gray-400"
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
                gridTemplateColumns: `repeat(${daysInView.length}, minmax(0, 1fr))`,
                height: `${TOTAL_HOURS * HOUR_HEIGHT}px`,
              }}
            >
              {/* Horizontal Background Grid Lines */}
              <div className="absolute inset-0 pointer-events-none flex flex-col">
                {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                  <div
                    key={i}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    className="border-b border-gray-100 w-full"
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
                    className={`relative border-r border-gray-200 last:border-r-0 cursor-pointer hover:bg-indigo-50/20 transition-colors ${
                      isCurrentToday ? "bg-indigo-50/15" : "bg-white"
                    }`}
                    style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
                  >
                    {/* Current Time Indicator Line */}
                    {currentTimeTop !== null && (
                      <div
                        style={{ top: `${currentTimeTop}px` }}
                        className="absolute inset-x-0 z-20 pointer-events-none border-t-2 border-red-500"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 absolute -top-[5px] -left-1.5 shadow-xs" />
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
                          }}
                          className={`absolute z-10 p-1.5 rounded-lg border text-left overflow-hidden transition-all shadow-xs hover:shadow-md hover:scale-[1.01] hover:z-30 cursor-pointer flex flex-col justify-between ${
                            isCancelled
                              ? "bg-gray-50/80 border-dashed border-gray-300 text-gray-500 opacity-65"
                              : `${statusConfig.badgeClass}`
                          }`}
                          title={`${serviceName} - ${clientName} (${startTime} - ${endTime})`}
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

                            {/* Client Name */}
                            <div className="text-[11px] truncate text-gray-700 font-medium mt-0.5">
                              {clientName}
                            </div>
                          </div>

                          {/* Time & Price Footer (if height allows) */}
                          {seg.height >= 40 && (
                            <div className="flex items-center justify-between text-[10px] text-gray-500 pt-0.5">
                              <span className="font-mono">
                                {startTime}
                              </span>
                              <span className="font-semibold text-gray-700">
                                ${Number(res.total_price ?? 0).toFixed(0)}
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

      {/* Selected Event Detail Modal / Panel */}
      {selectedReservation && (
        <EventDetailPanel
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
          onStatusChange={handleStatusChangeInternal}
          onCancelClick={onCancelClick}
          isUpdating={updatingId === selectedReservation.id}
        />
      )}
    </div>
  );
}

