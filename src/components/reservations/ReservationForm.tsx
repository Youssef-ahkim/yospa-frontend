"use client";

import { useEffect, useState, useMemo } from "react";
import { Client, Service, Therapist, Reservation, ReservationStatus } from "@/types";
import { SlideOver } from "@/components/ui/SlideOver";
import { FormField } from "@/components/ui/FormField";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/currency";
import { apiFetch, ApiError } from "@/lib/api";
import { checkReservationOverlap } from "@/lib/overlap";
import { useToast } from "@/context/ToastContext";
import { Calendar, Edit3, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface ReservationFormProps {
  open: boolean;
  onClose: () => void;
  initial?: Reservation | null;
  initialStartTime?: string;
  clients: Client[];
  services: Service[];
  therapists?: Therapist[];
  existingReservations?: Reservation[];
  onSuccess: (saved: Reservation, isEdit: boolean) => void;
}

function toLocalDatetimeInput(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr.replace(" ", "T"));
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}

function getDefaultStartTime(): string {
  const now = new Date();
  now.setHours(now.getHours() + 1, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const h = pad(now.getHours());
  const min = pad(now.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}

function calculateEndTime(startStr: string, durationMinutes: number): string {
  if (!startStr) return "";
  const startDate = new Date(startStr.replace(" ", "T"));
  if (isNaN(startDate.getTime())) return "";
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = endDate.getFullYear();
  const m = pad(endDate.getMonth() + 1);
  const day = pad(endDate.getDate());
  const h = pad(endDate.getHours());
  const min = pad(endDate.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}

function formatForApi(dt: string): string {
  return dt.replace("T", " ") + (dt.length === 16 ? ":00" : "");
}

export function ReservationForm({
  open,
  onClose,
  initial = null,
  initialStartTime,
  clients,
  services,
  therapists = [],
  existingReservations = [],
  onSuccess,
}: ReservationFormProps) {
  const toast = useToast();
  const isEdit = Boolean(initial);

  const [formData, setFormData] = useState({
    client_id: "",
    service_id: "",
    therapist_id: "",
    start_time: "",
    end_time: "",
    total_price: "",
    status: "confirmed" as ReservationStatus,
    notes: "",
  });

  const [priceManuallyEdited, setPriceManuallyEdited] = useState(false);
  const [priceAutoUpdated, setPriceAutoUpdated] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // In edit mode: if initial.service is inactive (not in active services), append it with (inactive)
  const availableServices = useMemo(() => {
    const srv = initial?.service;
    if (srv && !services.some((s) => s.id === srv.id)) {
      return [
        ...services,
        {
          ...srv,
          name: `${srv.name} (inactive)`,
        },
      ];
    }
    return services;
  }, [services, initial]);

  // In edit mode: if initial.therapist is inactive (not in active therapists), append it with (inactive)
  const availableTherapists = useMemo(() => {
    const t = initial?.therapist;
    if (t && !therapists.some((item) => item.id === t.id)) {
      return [
        ...therapists,
        {
          ...t,
          name: `${t.name} (inactive)`,
        },
      ];
    }
    return therapists;
  }, [therapists, initial]);

  // In edit mode: defensive check to ensure initial.client is included in options
  const availableClients = useMemo(() => {
    const cl = initial?.client;
    if (cl && !clients.some((c) => c.id === cl.id)) {
      return [cl, ...clients];
    }
    return clients;
  }, [clients, initial]);

  // Non-blocking overlap conflict detection (generic + same-therapist)
  const overlapCheck = useMemo(() => {
    return checkReservationOverlap({
      startTime: formData.start_time,
      endTime: formData.end_time,
      excludeReservationId: initial?.id,
      targetTherapistId: formData.therapist_id ? Number(formData.therapist_id) : null,
      reservations: existingReservations,
    });
  }, [existingReservations, formData.start_time, formData.end_time, formData.therapist_id, initial?.id]);

  const formatConflictTime = (startStr: string, endStr: string) => {
    const s = new Date(startStr.replace(" ", "T"));
    const e = new Date(endStr.replace(" ", "T"));
    const timeOpts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
    return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${s.toLocaleTimeString([], timeOpts)} - ${e.toLocaleTimeString([], timeOpts)}`;
  };

  const formatTimeOnly = (dtStr: string) => {
    const d = new Date(dtStr.replace(" ", "T"));
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateIfDifferent = (resTime: string, formTime: string) => {
    const r = new Date(resTime.replace(" ", "T"));
    const f = new Date(formTime.replace(" ", "T"));
    if (r.toDateString() !== f.toDateString()) {
      return ` on ${r.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    }
    return "";
  };

  // Sync form state when opened or when initial changes
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Populate or reset reservation form fields when opening or target changes
      setFieldErrors({});
      setIsSubmitting(false);
      setPriceManuallyEdited(false);
      setPriceAutoUpdated(false);

      if (initial) {
        // Edit mode: prefill existing reservation WITHOUT recalculating/auto-filling price or duration
        setFormData({
          client_id: String(initial.client_id || initial.client?.id || ""),
          service_id: String(initial.service_id || initial.service?.id || ""),
          therapist_id: initial.therapist_id != null ? String(initial.therapist_id) : (initial.therapist?.id != null ? String(initial.therapist.id) : ""),
          start_time: toLocalDatetimeInput(initial.start_time),
          end_time: toLocalDatetimeInput(initial.end_time),
          total_price: initial.total_price != null ? String(initial.total_price) : "",
          status: initial.status,
          notes: initial.notes || "",
        });
      } else {
        // Create mode: auto-fill default values
        const start = initialStartTime || getDefaultStartTime();
        const defaultService = services[0];
        const end = defaultService ? calculateEndTime(start, defaultService.duration_minutes) : "";
        setFormData({
          client_id: clients.length > 0 ? String(clients[0].id) : "",
          service_id: defaultService ? String(defaultService.id) : "",
          therapist_id: "",
          start_time: start,
          end_time: end,
          total_price: defaultService ? String(defaultService.price) : "",
          status: "confirmed",
          notes: "",
        });
      }
    }
  }, [open, initial, initialStartTime, services, clients]);

  const handleServiceChange = (serviceId: string) => {
    const selected = availableServices.find((s) => String(s.id) === serviceId);
    setFormData((prev) => {
      const nextEnd = selected && prev.start_time
        ? calculateEndTime(prev.start_time, selected.duration_minutes)
        : prev.end_time;
      const nextPrice = (!isEdit || !priceManuallyEdited) && selected
        ? String(selected.price)
        : prev.total_price;
      return {
        ...prev,
        service_id: serviceId,
        end_time: nextEnd,
        total_price: nextPrice,
      };
    });

    if (isEdit) {
      if (!priceManuallyEdited && selected) {
        setPriceAutoUpdated(true);
      }
    }
  };

  const handleStartTimeChange = (startTime: string) => {
    const selected = availableServices.find((s) => String(s.id) === formData.service_id);
    setFormData((prev) => ({
      ...prev,
      start_time: startTime,
      end_time: selected && startTime
        ? calculateEndTime(startTime, selected.duration_minutes)
        : prev.end_time,
    }));
  };

  const handlePriceChange = (priceVal: string) => {
    setPriceManuallyEdited(true);
    setPriceAutoUpdated(false);
    setFormData((prev) => ({ ...prev, total_price: priceVal }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!formData.client_id) {
      setFieldErrors({ client_id: ["Please select a client."] });
      toast.error("Please select a client.");
      return;
    }
    if (!formData.service_id) {
      setFieldErrors({ service_id: ["Please select a service."] });
      toast.error("Please select a service.");
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      toast.error("Please specify both start and end date/time.");
      return;
    }
    if (new Date(formData.end_time) <= new Date(formData.start_time)) {
      setFieldErrors({ end_time: ["End time must be later than the start time."] });
      return;
    }
    if (!formData.total_price || isNaN(Number(formData.total_price)) || Number(formData.total_price) < 0) {
      setFieldErrors({ total_price: ["Please enter a valid price (>= 0)."] });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit && initial) {
        // PATCH: send client_id, service_id, therapist_id, start_time, end_time (both always), total_price, notes. Status omitted.
        const payload = {
          client_id: Number(formData.client_id),
          service_id: Number(formData.service_id),
          therapist_id: formData.therapist_id ? Number(formData.therapist_id) : null,
          start_time: formatForApi(formData.start_time),
          end_time: formatForApi(formData.end_time),
          total_price: parseFloat(String(formData.total_price)),
          notes: formData.notes.trim() || null,
        };

        const response = await apiFetch<{ message: string; reservation: Reservation }>(
          `/reservations/${initial.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );

        toast.success(response.message || "Reservation updated successfully.");
        onSuccess(response.reservation, true);
        onClose();
      } else {
        // POST: create new reservation
        const payload = {
          client_id: Number(formData.client_id),
          service_id: Number(formData.service_id),
          therapist_id: formData.therapist_id ? Number(formData.therapist_id) : null,
          start_time: formatForApi(formData.start_time),
          end_time: formatForApi(formData.end_time),
          total_price: parseFloat(String(formData.total_price)),
          status: formData.status,
          notes: formData.notes.trim() || null,
        };

        const response = await apiFetch<{ message: string; reservation: Reservation }>(
          "/reservations",
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );

        toast.success(response.message || "Reservation scheduled successfully.");
        onSuccess(response.reservation, false);
        onClose();
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.errors) {
        const errors = err.errors;
        setFieldErrors(errors);
        const knownFields = ["client_id", "service_id", "start_time", "end_time", "total_price", "notes"];
        const nonFieldKeys = Object.keys(errors).filter((k) => !knownFields.includes(k));
        if (nonFieldKeys.length > 0) {
          toast.error(errors[nonFieldKeys[0]][0] || err.message);
        } else {
          toast.error("Please check the form inputs.");
        }
      } else {
        toast.error(err instanceof Error ? err.message : (isEdit ? "Failed to update reservation." : "Failed to create reservation."));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = (field?: string) =>
    `w-full px-3.5 py-2.5 border rounded-xl shadow-xs focus:outline-none focus:ring-2 text-sm transition-colors ${
      field && fieldErrors[field]
        ? "border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50"
        : "border-[#EAE4F2] focus:ring-[#7455A4] focus:border-[#7455A4] hover:border-[#C9B8E2] text-[#33283D] bg-white"
    }`;

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Reservation" : "New Reservation"}
      icon={
        isEdit ? (
          <Edit3 className="w-4 h-4 text-[#7455A4]" />
        ) : (
          <Calendar className="w-4 h-4 text-[#7455A4]" />
        )
      }
      width="max-w-lg"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 border border-[#EAE4F2] rounded-xl text-sm font-medium text-[#33283D] bg-white hover:bg-[#FAF8FC] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="reservation-form"
            disabled={isSubmitting || availableClients.length === 0}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#7455A4] hover:bg-[#5E4387] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {isSubmitting && <Spinner className="w-4 h-4" />}
            {isSubmitting
              ? isEdit
                ? "Saving..."
                : "Creating..."
              : isEdit
              ? "Save Changes"
              : "Save Reservation"}
          </button>
        </div>
      }
    >
      <form id="reservation-form" onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Client Picker */}
        <FormField
          label="Client"
          required
          error={fieldErrors.client_id?.[0]}
          labelExtra={
            !isEdit ? (
              <Link
                href="/dashboard/clients"
                className="text-xs text-[#7455A4] hover:text-[#5E4387] font-semibold"
              >
                + Add New Client
              </Link>
            ) : undefined
          }
        >
          {availableClients.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              No clients found. Please{" "}
              <Link href="/dashboard/clients" className="underline font-semibold">
                create a client
              </Link>{" "}
              before scheduling a reservation.
            </div>
          ) : (
            <select
              required
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              className={inputCls("client_id") + " bg-white"}
            >
              <option value="">-- Select Client --</option>
              {availableClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} {c.phone ? `(${c.phone})` : c.email ? `(${c.email})` : ""}
                </option>
              ))}
            </select>
          )}
        </FormField>

        {/* Service Picker */}
        <FormField label="Service" required error={fieldErrors.service_id?.[0]}>
          {availableServices.length === 0 ? (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
              Loading available services...
            </div>
          ) : (
            <select
              required
              value={formData.service_id}
              onChange={(e) => handleServiceChange(e.target.value)}
              className={inputCls("service_id") + " bg-white"}
            >
              <option value="">-- Select Service --</option>
              {availableServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.duration_minutes} min - {formatCurrency(s.price)})
                </option>
              ))}
            </select>
          )}
        </FormField>

        {/* Therapist Picker */}
        <FormField label="Assigned Therapist" error={fieldErrors.therapist_id?.[0]}>
          <select
            value={formData.therapist_id}
            onChange={(e) => setFormData((prev) => ({ ...prev, therapist_id: e.target.value }))}
            className={inputCls("therapist_id") + " bg-white"}
          >
            <option value="">Unassigned</option>
            {availableTherapists.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </FormField>

        {/* Date & Time Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Start Date & Time" required error={fieldErrors.start_time?.[0]}>
            <input
              type="datetime-local"
              required
              value={formData.start_time}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              className={inputCls("start_time")}
            />
          </FormField>
          <FormField label="End Date & Time" required error={fieldErrors.end_time?.[0]}>
            <input
              type="datetime-local"
              required
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className={inputCls("end_time")}
            />
          </FormField>
        </div>

        {/* Stronger Same-Therapist Double-Booking Warning */}
        {overlapCheck.therapistConflict && (
          <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 animate-in fade-in duration-150">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-rose-950">
                Therapist Double-Booking Warning
              </p>
              <p>
                <strong className="font-bold text-rose-950">
                  {overlapCheck.therapistConflict.therapist?.name || availableTherapists.find((t) => String(t.id) === formData.therapist_id)?.name || "This therapist"}
                </strong>{" "}
                is already booked with{" "}
                <strong className="font-semibold text-rose-950">
                  {overlapCheck.therapistConflict.client?.full_name || "another client"}
                </strong>{" "}
                from {formatTimeOnly(overlapCheck.therapistConflict.start_time)} to {formatTimeOnly(overlapCheck.therapistConflict.end_time)}
                {formatDateIfDifferent(overlapCheck.therapistConflict.start_time, formData.start_time)}.
              </p>
              <p className="text-rose-800/80 text-[11px]">
                You can still save this reservation if this double-booking is intentional.
              </p>
            </div>
          </div>
        )}

        {/* Existing Generic Overlap Warning (shown when not already showing same-therapist conflict) */}
        {overlapCheck.genericConflict && !overlapCheck.therapistConflict && (
          <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 animate-in fade-in duration-150">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-amber-950">
                Schedule Overlap Detected
              </p>
              <p>
                Conflicts with{" "}
                <strong className="font-semibold text-amber-950">
                  {overlapCheck.genericConflict.client?.full_name || "another client"}
                </strong>{" "}
                ({formatConflictTime(overlapCheck.genericConflict.start_time, overlapCheck.genericConflict.end_time)}).
              </p>
              <p className="text-amber-800/80 text-[11px]">
                You can still save this reservation if this double-booking is intentional.
              </p>
            </div>
          </div>
        )}

        {/* Price and Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Total Price (MAD)" required error={fieldErrors.total_price?.[0]}>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.total_price}
                onChange={(e) => handlePriceChange(e.target.value)}
                className={inputCls("total_price") + " pr-12"}
                placeholder="0.00"
              />
              <span className="text-xs font-semibold text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 select-none">
                MAD
              </span>
            </div>
            {isEdit && priceAutoUpdated && (
              <p className="text-xs text-[#7455A4] mt-1 font-medium">
                Price auto-updated from selected service
              </p>
            )}
          </FormField>

          {isEdit && initial ? (
            <FormField label="Status">
              <div className="flex items-center gap-2 pt-2">
                <StatusBadge status={initial.status} />
                <span className="text-xs text-[#7A6F86]">
                  (Status is changed via row actions)
                </span>
              </div>
            </FormField>
          ) : (
            <FormField label="Status">
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as ReservationStatus })
                }
                className={inputCls() + " bg-white"}
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </FormField>
          )}
        </div>

        {/* Notes */}
        <FormField label="Notes / Preferences" error={fieldErrors.notes?.[0]}>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className={inputCls("notes")}
            placeholder="E.g. Room preference, special accommodations..."
          />
        </FormField>
      </form>
    </SlideOver>
  );
}
