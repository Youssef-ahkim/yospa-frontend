"use client";

import { Client, Service, ReservationStatus } from "@/types";
import { SlideOver } from "@/components/ui/SlideOver";
import { FormField } from "@/components/ui/FormField";
import { Spinner } from "@/components/ui/Spinner";
import { formatCurrency } from "@/lib/currency";
import { Calendar } from "lucide-react";
import Link from "next/link";

interface ReservationFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  clients: Client[];
  services: Service[];
  formData: {
    client_id: string;
    service_id: string;
    start_time: string;
    end_time: string;
    total_price: string;
    status: ReservationStatus;
    notes: string;
  };
  onFormDataChange: (data: ReservationFormProps["formData"]) => void;
  onServiceChange: (serviceId: string) => void;
  onStartTimeChange: (startTime: string) => void;
  isSubmitting: boolean;
  fieldErrors?: Record<string, string[]>;
}

export function ReservationForm({
  open,
  onClose,
  onSubmit,
  clients,
  services,
  formData,
  onFormDataChange,
  onServiceChange,
  onStartTimeChange,
  isSubmitting,
  fieldErrors = {},
}: ReservationFormProps) {
  const inputCls = (field?: string) =>
    `w-full px-3 py-2 border rounded-lg shadow-xs focus:outline-none focus:ring-2 text-sm transition-colors ${
      field && fieldErrors[field]
        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
        : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
    }`;

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="New Reservation"
      icon={<Calendar className="w-4 h-4 text-indigo-600" />}
      width="max-w-lg"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-reservation-form"
            disabled={isSubmitting || clients.length === 0}
            className="flex-1 py-2 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting && <Spinner className="w-4 h-4" />}
            {isSubmitting ? "Creating..." : "Save Reservation"}
          </button>
        </div>
      }
    >
      <form id="create-reservation-form" onSubmit={onSubmit} className="p-6 space-y-5">
        {/* Client Picker */}
        <FormField
          label="Client"
          required
          error={fieldErrors.client_id?.[0]}
          labelExtra={
            <Link href="/dashboard/clients" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              + Add New Client
            </Link>
          }
        >
          {clients.length === 0 ? (
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
              onChange={(e) => onFormDataChange({ ...formData, client_id: e.target.value })}
              className={inputCls("client_id") + " bg-white"}
            >
              <option value="">-- Select Client --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} {c.phone ? `(${c.phone})` : c.email ? `(${c.email})` : ""}
                </option>
              ))}
            </select>
          )}
        </FormField>

        {/* Service Picker */}
        <FormField label="Service" required error={fieldErrors.service_id?.[0]}>
          {services.length === 0 ? (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
              Loading available services...
            </div>
          ) : (
            <select
              required
              value={formData.service_id}
              onChange={(e) => onServiceChange(e.target.value)}
              className={inputCls("service_id") + " bg-white"}
            >
              <option value="">-- Select Service --</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.duration_minutes} min - {formatCurrency(s.price)})
                </option>
              ))}
            </select>
          )}
        </FormField>

        {/* Date & Time Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Start Date & Time" required error={fieldErrors.start_time?.[0]}>
            <input
              type="datetime-local"
              required
              value={formData.start_time}
              onChange={(e) => onStartTimeChange(e.target.value)}
              className={inputCls("start_time")}
            />
          </FormField>
          <FormField label="End Date & Time" required error={fieldErrors.end_time?.[0]}>
            <input
              type="datetime-local"
              required
              value={formData.end_time}
              onChange={(e) => onFormDataChange({ ...formData, end_time: e.target.value })}
              className={inputCls("end_time")}
            />
          </FormField>
        </div>

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
                onChange={(e) => onFormDataChange({ ...formData, total_price: e.target.value })}
                className={inputCls("total_price") + " pr-12"}
                placeholder="0.00"
              />
              <span className="text-xs font-semibold text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 select-none">
                MAD
              </span>
            </div>
          </FormField>
          <FormField label="Status">
            <select
              value={formData.status}
              onChange={(e) => onFormDataChange({ ...formData, status: e.target.value as ReservationStatus })}
              className={inputCls() + " bg-white"}
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </FormField>
        </div>

        {/* Notes */}
        <FormField label="Notes / Preferences" error={fieldErrors.notes?.[0]}>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })}
            className={inputCls("notes")}
            placeholder="E.g. Room preference, special accommodations..."
          />
        </FormField>
      </form>
    </SlideOver>
  );
}
