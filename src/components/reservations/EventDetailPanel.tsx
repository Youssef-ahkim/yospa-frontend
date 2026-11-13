"use client";

import React from "react";
import Link from "next/link";
import { 
  Reservation, 
  ReservationStatus, 
  RESERVATION_STATUSES, 
  ALLOWED_STATUS_TRANSITIONS 
} from "@/types";
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  Tag, 
  Clock, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  CheckCheck, 
  XCircle, 
  Loader2, 
  ExternalLink 
} from "lucide-react";

interface EventDetailPanelProps {
  reservation: Reservation;
  onClose: () => void;
  onStatusChange: (reservation: Reservation, newStatus: ReservationStatus) => Promise<void>;
  onCancelClick: (reservation: Reservation) => void;
  isUpdating: boolean;
}

export function EventDetailPanel({
  reservation,
  onClose,
  onStatusChange,
  onCancelClick,
  isUpdating,
}: EventDetailPanelProps) {
  const clientName = reservation.client?.full_name || "Unknown Client";
  const serviceName = reservation.service?.name || "General Service";
  const statusConfig = RESERVATION_STATUSES[reservation.status] || {
    label: reservation.status,
    badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
    dotClass: "bg-gray-400",
  };
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

      <div className="relative z-10 bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border capitalize ${statusConfig.badgeClass}`}
            >
              <span className={`w-2 h-2 rounded-full ${statusConfig.dotClass}`} />
              {statusConfig.label}
            </span>
            <span className="text-xs text-gray-400 font-mono">#{reservation.id}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Client & Service Info */}
        <div className="space-y-4">
          {/* Client Card */}
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  {reservation.client?.id ? (
                    <Link
                      href={`/dashboard/clients/${reservation.client.id}`}
                      className="text-sm font-bold text-gray-900 hover:text-indigo-600 transition-colors inline-flex items-center gap-1"
                    >
                      {clientName}
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </Link>
                  ) : (
                    <span className="text-sm font-bold text-gray-900">{clientName}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 pt-1">
              {reservation.client?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {reservation.client.phone}
                </span>
              )}
              {reservation.client?.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  {reservation.client.email}
                </span>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-indigo-500" /> Service
              </span>
              <p className="font-semibold text-gray-900 mt-1">{serviceName}</p>
              {reservation.service?.duration_minutes && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {reservation.service.duration_minutes} minutes
                </p>
              )}
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Price
              </span>
              <p className="font-semibold text-gray-900 mt-1">
                ${Number(reservation.total_price ?? 0).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Time & Date */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2.5 text-sm text-gray-700">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div>
              <span className="font-medium">{startTimeStr}</span>
              <span className="text-gray-400 mx-1.5">→</span>
              <span className="font-medium">{endTimeStr}</span>
            </div>
          </div>

          {/* Notes */}
          {reservation.notes && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
              <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-gray-400" /> Notes
              </span>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{reservation.notes}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-gray-100">
          {isUpdating ? (
            <div className="flex items-center justify-center py-2 text-sm text-gray-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Updating reservation status...</span>
            </div>
          ) : allowedTransitions.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-1 italic">
              This reservation is {reservation.status} (terminal state).
            </p>
          ) : (
            <div className="flex items-center gap-2">
              {allowedTransitions.includes("confirmed") && (
                <button
                  type="button"
                  onClick={() => onStatusChange(reservation, "confirmed")}
                  className="flex-1 py-2 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirm
                </button>
              )}

              {allowedTransitions.includes("completed") && (
                <button
                  type="button"
                  onClick={() => onStatusChange(reservation, "completed")}
                  className="flex-1 py-2 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Complete
                </button>
              )}

              {allowedTransitions.includes("cancelled") && (
                <button
                  type="button"
                  onClick={() => onCancelClick(reservation)}
                  className="flex-1 py-2 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
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

