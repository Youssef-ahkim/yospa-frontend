"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { 
  Reservation, 
  ReservationStatus, 
  ALLOWED_STATUS_TRANSITIONS 
} from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { formatCurrency } from "@/lib/currency";
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  Tag, 
  Clock, 
  Coins, 
  FileText, 
  CheckCircle2, 
  CheckCheck, 
  XCircle, 
  ExternalLink,
  Edit3,
  Trash2
} from "lucide-react";

interface EventDetailPanelProps {
  reservation: Reservation;
  onClose: () => void;
  onStatusChange: (reservation: Reservation, newStatus: ReservationStatus) => Promise<void>;
  onCancelClick: (reservation: Reservation) => void;
  onEditClick: (reservation: Reservation) => void;
  onDeleteClick: (reservation: Reservation) => void;
  isUpdating: boolean;
}

export function EventDetailPanel({
  reservation,
  onClose,
  onStatusChange,
  onCancelClick,
  onEditClick,
  onDeleteClick,
  isUpdating,
}: EventDetailPanelProps) {
  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const clientName = reservation.client?.full_name || "Unknown Client";
  const serviceName = reservation.service?.name || "General Service";
  const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[reservation.status] || [];

  const startTimeStr = reservation.start_time
    ? new Date(reservation.start_time).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N/A";

  const endTimeStr = reservation.end_time
    ? new Date(reservation.end_time).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N/A";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      {/* Click outside to close */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#EAE4F2] space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAE4F2] pb-4">
          <div className="flex items-center gap-2.5">
            <StatusBadge status={reservation.status} />
            <span className="text-xs text-[#7A6F86] font-mono">#{reservation.id}</span>
          </div>
          <div className="flex items-center gap-2">
            {(reservation.status === "pending" || reservation.status === "confirmed") && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => {
                  onClose();
                  onEditClick(reservation);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#7455A4] bg-[#F0EAF7] hover:bg-[#E4D8F0] border border-[#C9B8E2] transition-colors cursor-pointer disabled:opacity-50"
                title="Edit reservation"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
            {(reservation.status === "pending" || reservation.status === "cancelled") && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => onDeleteClick(reservation)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#BE123C] bg-rose-50 hover:bg-rose-100 border border-[#FECDD3] transition-colors cursor-pointer disabled:opacity-50"
                title="Delete reservation"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#7A6F86] hover:text-[#33283D] hover:bg-[#FAF8FC] transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Client & Service Info */}
        <div className="space-y-4">
          {/* Client Card */}
          <div className="p-3.5 bg-[#FAF8FC] rounded-xl border border-[#EAE4F2] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#F0EAF7] border border-[#C9B8E2]/50 flex items-center justify-center text-[#7455A4]">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  {reservation.client?.id ? (
                    <Link
                      href={`/dashboard/clients/${reservation.client.id}`}
                      className="text-sm font-bold text-[#33283D] hover:text-[#7455A4] transition-colors inline-flex items-center gap-1"
                    >
                      {clientName}
                      <ExternalLink className="w-3 h-3 text-[#7A6F86]" />
                    </Link>
                  ) : (
                    <span className="text-sm font-bold text-[#33283D]">{clientName}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[#7A6F86] pt-1">
              {reservation.client?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#9275BC]" />
                  {reservation.client.phone}
                </span>
              )}
              {reservation.client?.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-[#9275BC]" />
                  {reservation.client.email}
                </span>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-[#FAF8FC] rounded-xl border border-[#EAE4F2]">
              <span className="text-xs text-[#7A6F86] font-semibold flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#9275BC]" /> Service
              </span>
              <p className="font-bold text-[#33283D] mt-1">{serviceName}</p>
              {reservation.service?.duration_minutes && (
                <p className="text-xs text-[#7A6F86] mt-0.5">
                  {reservation.service.duration_minutes} minutes
                </p>
              )}
            </div>

            <div className="p-3 bg-[#FAF8FC] rounded-xl border border-[#EAE4F2]">
              <span className="text-xs text-[#7A6F86] font-semibold flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-[#91A68D]" /> Price
              </span>
              <p className="font-extrabold text-[#33283D] mt-1">
                {formatCurrency(reservation.total_price)}
              </p>
            </div>
          </div>

          {/* Time & Date */}
          <div className="p-3 bg-[#FAF8FC] rounded-xl border border-[#EAE4F2] flex items-center gap-2.5 text-sm text-[#33283D]">
            <Clock className="w-4 h-4 text-[#7A6F86] flex-shrink-0" />
            <div>
              <span className="font-semibold">{startTimeStr}</span>
              <span className="text-[#7A6F86] mx-1.5">→</span>
              <span className="font-semibold">{endTimeStr}</span>
            </div>
          </div>

          {/* Notes */}
          {reservation.notes && (
            <div className="p-3 bg-[#FAF8FC] rounded-xl border border-[#EAE4F2] space-y-1">
              <span className="text-xs text-[#7A6F86] font-semibold flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-[#9275BC]" /> Notes
              </span>
              <p className="text-xs text-[#33283D] whitespace-pre-wrap">{reservation.notes}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-[#EAE4F2]">
          {isUpdating ? (
            <div className="flex items-center justify-center py-2 text-sm text-[#7A6F86] gap-2">
              <Spinner className="w-4 h-4 text-[#7455A4]" />
              <span>Updating reservation status...</span>
            </div>
          ) : allowedTransitions.length === 0 ? (
            <p className="text-xs text-[#7A6F86] text-center py-1 italic">
              This reservation is {reservation.status} (terminal state).
            </p>
          ) : (
            <div className="flex items-center gap-2">
              {allowedTransitions.includes("confirmed") && (
                <button
                  type="button"
                  onClick={() => onStatusChange(reservation, "confirmed")}
                  className="flex-1 py-2 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#7455A4] bg-[#F0EAF7] hover:bg-[#E4D8F0] border border-[#C9B8E2] rounded-xl transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirm
                </button>
              )}

              {allowedTransitions.includes("completed") && (
                <button
                  type="button"
                  onClick={() => onStatusChange(reservation, "completed")}
                  className="flex-1 py-2 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#91A68D] bg-[#91A68D]/15 hover:bg-[#91A68D]/25 border border-[#91A68D]/30 rounded-xl transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Complete
                </button>
              )}

              {allowedTransitions.includes("cancelled") && (
                <button
                  type="button"
                  onClick={() => onCancelClick(reservation)}
                  className="flex-1 py-2 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#BE123C] bg-[#FFF1F2] hover:bg-rose-100 border border-[#FECDD3] rounded-xl transition-colors cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

