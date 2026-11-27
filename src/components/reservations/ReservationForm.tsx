"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Client, Service, Therapist, Reservation, ReservationStatus, Paginated, Product } from "@/types";
import { SlideOver } from "@/components/ui/SlideOver";
import { FormField } from "@/components/ui/FormField";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SearchablePicker } from "@/components/ui/SearchablePicker";
import { formatCurrency } from "@/lib/currency";
import { apiFetch, ApiError } from "@/lib/api";
import { checkReservationOverlap } from "@/lib/overlap";
import { parseNaiveDateTime } from "@/lib/dates";
import { useToast } from "@/context/ToastContext";
import { Calendar, Edit3, AlertTriangle, Package, Plus, Trash2, RefreshCw } from "lucide-react";
import Link from "next/link";

interface ReservationFormProps {
  open: boolean;
  onClose: () => void;
  initial?: Reservation | null;
  initialStartTime?: string;
  clients?: Client[];
  services: Service[];
  therapists?: Therapist[];
  existingReservations?: Reservation[];
  onSuccess: (saved: Reservation, isEdit: boolean) => void;
}

function toLocalDatetimeInput(dateStr: string): string {
  if (!dateStr) return "";
  const d = parseNaiveDateTime(dateStr);
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
  const startDate = parseNaiveDateTime(startStr);
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
  services,
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

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<{ product: Product; quantity: number }[]>([]);

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

  // Server query results for day's reservations (early-warning overlap check)
  const [dayReservations, setDayReservations] = useState<Reservation[]>([]);
  const overlapReqRef = useRef(0);

  // Debounced server query: GET /reservations?from=<day>&to=<day>&therapist_id=<id>
  useEffect(() => {
    if (!open || !formData.start_time) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset day reservations when modal closed or start time unset
      setDayReservations([]);
      return;
    }

    const day = formData.start_time.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      setDayReservations([]);
      return;
    }

    const timer = setTimeout(async () => {
      const currentReq = ++overlapReqRef.current;
      try {
        const queryParams = new URLSearchParams();
        queryParams.set("from", day);
        queryParams.set("to", day);
        if (formData.therapist_id) {
          queryParams.set("therapist_id", formData.therapist_id);
        }

        const data = await apiFetch<Reservation[]>(`/reservations?${queryParams.toString()}`);
        if (currentReq === overlapReqRef.current) {
          setDayReservations(Array.isArray(data) ? data : []);
        }
      } catch {
        // If the query fails, show nothing and let the backend decide
        if (currentReq === overlapReqRef.current) {
          setDayReservations([]);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [open, formData.start_time, formData.therapist_id]);

  // Non-blocking overlap conflict detection (excluding the reservation being edited)
  const overlapCheck = useMemo(() => {
    return checkReservationOverlap({
      startTime: formData.start_time,
      endTime: formData.end_time,
      excludeReservationId: initial?.id,
      targetTherapistId: formData.therapist_id ? Number(formData.therapist_id) : null,
      reservations: dayReservations,
    });
  }, [dayReservations, formData.start_time, formData.end_time, formData.therapist_id, initial?.id]);

  const formatConflictTime = (startStr: string, endStr: string) => {
    const s = parseNaiveDateTime(startStr);
    const e = parseNaiveDateTime(endStr);
    const timeOpts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
    return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${s.toLocaleTimeString([], timeOpts)} - ${e.toLocaleTimeString([], timeOpts)}`;
  };

  const formatDateIfDifferent = (resTime: string, formTime: string) => {
    const r = parseNaiveDateTime(resTime);
    const f = parseNaiveDateTime(formTime);
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
        setSelectedClient(initial.client || null);
        setSelectedTherapist(initial.therapist || null);
        setSelectedProducts(
          (initial.products || []).map((p) => ({
            product: p,
            quantity: p.pivot?.quantity ?? 1,
          }))
        );
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
        setSelectedClient(null);
        setSelectedTherapist(null);
        setSelectedProducts([]);
        const start = initialStartTime || getDefaultStartTime();
        const defaultService = services[0];
        const end = defaultService ? calculateEndTime(start, defaultService.duration_minutes) : "";
        setFormData({
          client_id: "",
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
  }, [open, initial, initialStartTime, services]);

  // Search-as-you-type API fetchers for Client and Therapist (?search, ?per_page=10)
  const fetchClients = useCallback(async (query: string): Promise<Client[]> => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    params.set("per_page", "10");
    const res = await apiFetch<Paginated<Client> | Client[]>(`/clients?${params.toString()}`);
    return Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
  }, []);

  const fetchTherapists = useCallback(async (query: string): Promise<Therapist[]> => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    params.set("per_page", "10");
    params.set("all", "1");
    const res = await apiFetch<Paginated<Therapist> | Therapist[]>(`/therapists?${params.toString()}`);
    return Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
  }, []);

  const fetchProducts = useCallback(async (query: string): Promise<Product[]> => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    params.set("per_page", "10");
    const res = await apiFetch<Paginated<Product> | Product[]>(`/products?${params.toString()}`);
    return Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
  }, []);

  const handleAddProduct = (product: Product | null) => {
    if (!product) return;
    setSelectedProducts((prev) => {
      const idx = prev.findIndex((p) => p.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateProductQuantity = (productId: number, qty: number) => {
    if (qty < 1) return;
    setSelectedProducts((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: qty } : item
      )
    );
  };

  const handleRemoveProduct = (productId: number) => {
    setSelectedProducts((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const productsSubtotal = useMemo(() => {
    return selectedProducts.reduce((sum, item) => {
      const price = Number(item.product.price) || 0;
      return sum + price * item.quantity;
    }, 0);
  }, [selectedProducts]);

  const servicePrice = useMemo(() => {
    const s = availableServices.find((srv) => String(srv.id) === formData.service_id);
    return s ? Number(s.price) || 0 : 0;
  }, [availableServices, formData.service_id]);

  const suggestedTotal = useMemo(() => {
    return servicePrice + productsSubtotal;
  }, [servicePrice, productsSubtotal]);

  const handleSyncPrice = () => {
    setFormData((prev) => ({ ...prev, total_price: suggestedTotal.toFixed(2) }));
    setPriceManuallyEdited(true);
    setPriceAutoUpdated(false);
  };

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
      const productPayload = selectedProducts.map((p) => ({
        product_id: p.product.id,
        quantity: p.quantity,
      }));

      if (isEdit && initial) {
        // PATCH: send client_id, service_id, therapist_id, start_time, end_time (both always), total_price, notes, products. Status omitted.
        const payload = {
          client_id: Number(formData.client_id),
          service_id: Number(formData.service_id),
          therapist_id: formData.therapist_id ? Number(formData.therapist_id) : null,
          start_time: formatForApi(formData.start_time),
          end_time: formatForApi(formData.end_time),
          total_price: parseFloat(String(formData.total_price)),
          notes: formData.notes.trim() || null,
          products: productPayload,
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
        // POST: send client_id, service_id, therapist_id, start_time, end_time, total_price, status, notes, products
        const payload = {
          client_id: Number(formData.client_id),
          service_id: Number(formData.service_id),
          therapist_id: formData.therapist_id ? Number(formData.therapist_id) : null,
          start_time: formatForApi(formData.start_time),
          end_time: formatForApi(formData.end_time),
          total_price: parseFloat(String(formData.total_price)),
          status: formData.status,
          notes: formData.notes.trim() || null,
          products: productPayload,
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
        if (errors.therapist_id) {
          toast.error(errors.therapist_id[0]);
        } else if (errors.start_time) {
          toast.error(errors.start_time[0]);
        } else if (errors.end_time) {
          toast.error(errors.end_time[0]);
        } else if (errors.date) {
          toast.error(errors.date[0]);
        } else if (errors.products) {
          toast.error(errors.products[0]);
        } else {
          const firstKey = Object.keys(errors)[0];
          toast.error(errors[firstKey]?.[0] || err.message);
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
            disabled={isSubmitting || !formData.client_id}
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
      <form id="reservation-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Client Picker (Search-as-you-type) */}
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
          <SearchablePicker<Client>
            value={formData.client_id}
            selectedItem={selectedClient}
            onSelect={(client) => {
              setSelectedClient(client);
              setFormData((prev) => ({
                ...prev,
                client_id: client ? String(client.id) : "",
              }));
              if (fieldErrors.client_id) {
                setFieldErrors((prev) => ({ ...prev, client_id: [] }));
              }
            }}
            fetchOptions={fetchClients}
            getId={(c) => c.id}
            getDisplayValue={(c) =>
              `${c.full_name}${c.phone ? ` (${c.phone})` : c.email ? ` (${c.email})` : ""}`
            }
            renderItem={(c) => (
              <div>
                <span className="font-medium text-[#33283D]">{c.full_name}</span>
                {(c.phone || c.email) && (
                  <span className="text-[11px] text-[#7A6F86] block">
                    {c.phone ? c.phone : ""} {c.email ? `• ${c.email}` : ""}
                  </span>
                )}
              </div>
            )}
            placeholder="Search by client name, phone, or email..."
            required
            error={fieldErrors.client_id?.[0]}
          />
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

        {/* Therapist Picker (Search-as-you-type) */}
        <FormField label="Assigned Therapist" error={fieldErrors.therapist_id?.[0]}>
          <SearchablePicker<Therapist>
            value={formData.therapist_id}
            selectedItem={selectedTherapist}
            onSelect={(therapist) => {
              setSelectedTherapist(therapist);
              setFormData((prev) => ({
                ...prev,
                therapist_id: therapist ? String(therapist.id) : "",
              }));
            }}
            fetchOptions={fetchTherapists}
            getId={(t) => t.id}
            getDisplayValue={(t) => t.name}
            renderItem={(t) => (
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: t.color || "#7455A4" }}
                />
                <span className="font-medium text-[#33283D]">{t.name}</span>
                {!t.is_active && (
                  <span className="text-[10px] text-gray-500 italic">(inactive)</span>
                )}
              </div>
            )}
            placeholder="Search and assign therapist..."
            allowClear
            clearLabel="Unassigned"
            error={fieldErrors.therapist_id?.[0]}
          />
        </FormField>

        {/* Date & Time Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Start Date & Time" required error={fieldErrors.start_time?.[0] || fieldErrors.date?.[0]}>
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
              onChange={(e) => setFormData((prev) => ({ ...prev, end_time: e.target.value }))}
              className={inputCls("end_time")}
            />
          </FormField>
        </div>

        {/* Non-blocking Overlap Warnings */}
        {overlapCheck.hasGenericConflict && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs text-amber-900 leading-relaxed">
              <p className="font-semibold">Schedule Overlap Detected</p>
              {overlapCheck.hasTherapistConflict && overlapCheck.therapistConflict ? (
                <p>
                  This therapist is already assigned to a reservation for{" "}
                  <strong>{overlapCheck.therapistConflict.client?.full_name || "another client"}</strong>
                  {formatDateIfDifferent(overlapCheck.therapistConflict.start_time, formData.start_time)}{" "}
                  ({formatConflictTime(overlapCheck.therapistConflict.start_time, overlapCheck.therapistConflict.end_time)}).
                </p>
              ) : (
                <p>
                  Another appointment exists during this window
                  {overlapCheck.genericConflict
                    ? ` (${formatConflictTime(overlapCheck.genericConflict.start_time, overlapCheck.genericConflict.end_time)})`
                    : ""}. You may still save this reservation.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Products Consumption */}
        <div className="space-y-3 p-3.5 bg-[#FAF8FC] rounded-xl border border-[#EAE4F2]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-[#7455A4]" />
              <span className="text-xs font-bold text-[#33283D] uppercase tracking-wider">
                Products Consumed (Optional)
              </span>
            </div>
            {selectedProducts.length > 0 && (
              <span className="text-xs font-semibold text-[#7455A4]">
                Subtotal: {formatCurrency(productsSubtotal)}
              </span>
            )}
          </div>

          <SearchablePicker<Product>
            value=""
            selectedItem={null}
            onSelect={handleAddProduct}
            fetchOptions={fetchProducts}
            getId={(p) => p.id}
            getDisplayValue={(p) => p.name}
            renderItem={(p) => (
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-[#33283D]">{p.name}</span>
                  {p.sku && (
                    <span className="ml-2 font-mono text-[10px] text-[#7A6F86]">[{p.sku}]</span>
                  )}
                  <span className="text-[11px] text-[#7A6F86] block">
                    {formatCurrency(p.price)} / {p.unit} • In stock: {p.stock_quantity}
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#7455A4] flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add
                </span>
              </div>
            )}
            placeholder="Search products to attach (e.g. oil, scrub, towel)..."
            clearLabel=""
          />

          {fieldErrors.products && (
            <p className="text-xs text-red-600 font-medium">{fieldErrors.products[0]}</p>
          )}

          {selectedProducts.length > 0 && (
            <div className="divide-y divide-[#EAE4F2] bg-white rounded-lg border border-[#EAE4F2] overflow-hidden">
              {selectedProducts.map((item) => {
                const isOutOfStock = item.product.stock_quantity < item.quantity;
                return (
                  <div
                    key={item.product.id}
                    className="p-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-[#33283D] truncate">{item.product.name}</span>
                        {item.product.sku && (
                          <span className="font-mono text-[10px] text-[#7A6F86]">[{item.product.sku}]</span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#7A6F86]">
                        {formatCurrency(item.product.price)} / {item.product.unit} •{" "}
                        <span className={isOutOfStock ? "text-amber-600 font-semibold" : ""}>
                          Stock: {item.product.stock_quantity}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center border border-[#EAE4F2] rounded-lg overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => handleUpdateProductQuantity(item.product.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="px-2 py-1 text-xs text-[#7A6F86] hover:bg-[#FAF8FC] disabled:opacity-40 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2 py-1 text-xs font-bold text-[#33283D] min-w-[28px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateProductQuantity(item.product.id, item.quantity + 1)}
                          className="px-2 py-1 text-xs text-[#7A6F86] hover:bg-[#FAF8FC] cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-bold text-[#33283D] min-w-[60px] text-right">
                        {formatCurrency((Number(item.product.price) || 0) * item.quantity)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(item.product.id)}
                        className="p-1 text-[#BE123C] hover:bg-rose-50 rounded cursor-pointer"
                        title="Remove product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedProducts.length > 0 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#7A6F86]">
                Suggested Total (Service + Products): <strong>{formatCurrency(suggestedTotal)}</strong>
              </span>
              <button
                type="button"
                onClick={handleSyncPrice}
                className="text-xs font-semibold text-[#7455A4] hover:text-[#5E4387] inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Apply to Total
              </button>
            </div>
          )}
        </div>

        {/* Total Price */}
        <FormField
          label="Total Price (MAD)"
          required
          error={fieldErrors.total_price?.[0]}
          labelExtra={
            priceAutoUpdated ? (
              <span className="text-[11px] text-[#7455A4] font-medium animate-pulse">
                Auto-updated from selected service
              </span>
            ) : priceManuallyEdited ? (
              <span className="text-[11px] text-[#7A6F86]">Custom price set</span>
            ) : undefined
          }
        >
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={formData.total_price}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder="0.00"
              className={inputCls("total_price") + " pr-14 font-semibold"}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#7A6F86] pointer-events-none">
              MAD
            </span>
          </div>
        </FormField>

        {/* Initial Status (only visible in create mode) */}
        {!isEdit && (
          <FormField label="Initial Status" required>
            <div className="flex gap-3">
              {(["confirmed", "pending"] as ReservationStatus[]).map((st) => (
                <label
                  key={st}
                  className={`flex-1 flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-colors ${
                    formData.status === st
                      ? "border-[#7455A4] bg-[#F0EAF7]/30 ring-1 ring-[#7455A4]"
                      : "border-[#EAE4F2] hover:bg-[#FAF8FC]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="status"
                      value={st}
                      checked={formData.status === st}
                      onChange={() => setFormData({ ...formData, status: st })}
                      className="text-[#7455A4] focus:ring-[#7455A4]"
                    />
                    <span className="text-xs font-semibold text-[#33283D] capitalize">
                      {st}
                    </span>
                  </div>
                  <StatusBadge status={st} />
                </label>
              ))}
            </div>
          </FormField>
        )}

        {/* Notes */}
        <FormField label="Internal Notes (Optional)" error={fieldErrors.notes?.[0]}>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add any special client requests, preferences, or medical notes..."
            className={inputCls("notes")}
          />
        </FormField>
      </form>
    </SlideOver>
  );
}
