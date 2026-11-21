"use client";

import Link from "next/link";
import {
  Reservation,
  ReservationStatus,
  ALLOWED_STATUS_TRANSITIONS,
} from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { formatCurrency } from "@/lib/currency";
import {
  Calendar,
  Clock,
  Tag,
  CheckCircle2,
  CheckCheck,
  XCircle,
  Plus,
} from "lucide-react";

interface ClientReservationHistoryProps {
  reservations: Reservation[];
  updatingResId: number | null;
  onStatusChange: (reservation: Reservation, newStatus: ReservationStatus) => void;
}

export function ClientReservationHistory({
  reservations,
  updatingResId,
  onStatusChange,
}: ClientReservationHistoryProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#33283D]">Appointment History</h2>
          <p className="text-xs text-[#7A6F86] mt-0.5">
            All reservations booked for this client
          </p>
        </div>
        <Link
          href="/dashboard/reservations"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#7455A4] bg-[#F0EAF7] hover:bg-[#E4D8F0] rounded-xl transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Book Reservation
        </Link>
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EAE4F2] p-12 text-center space-y-3 shadow-xs">
          <Calendar className="w-10 h-10 text-[#C9B8E2] mx-auto" />
          <h3 className="text-sm font-semibold text-[#33283D]">No Reservations Found</h3>
          <p className="text-xs text-[#7A6F86] max-w-sm mx-auto">
            This client does not have any appointments recorded yet.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white border border-[#EAE4F2] rounded-2xl overflow-hidden shadow-xs">
            <table className="min-w-full divide-y divide-[#EAE4F2]">
              <thead className="bg-[#FAF8FC]">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#7A6F86] uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#7A6F86] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#7A6F86] uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#7A6F86] uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-[#7A6F86] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF8FC] bg-white">
                {reservations.map((res) => {
                  const serviceName = res.service?.name || "General Service";
                  const startTime = res.start_time;
                  const formattedPrice = res.total_price ?? 0;
                  const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[res.status] || [];
                  const isRowUpdating = updatingResId === res.id;

                  return (
                    <tr key={res.id} className="hover:bg-[#FAF8FC] transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#33283D]">
                          <Tag className="w-4 h-4 text-[#9275BC] flex-shrink-0" />
                          {serviceName}
                        </div>
                        {res.therapist && (
                          <div className="flex items-center gap-1.5 text-xs text-[#7A6F86] mt-0.5">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: res.therapist.color || "#7455A4" }}
                            />
                            <span>{res.therapist.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <StatusBadge status={res.status} />
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-[#7A6F86]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#7A6F86]/70" />
                          {startTime ? new Date(startTime).toLocaleString() : "Date N/A"}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm font-bold text-[#33283D]">
                        <span>{formatCurrency(formattedPrice)}</span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm">
                        {isRowUpdating ? (
                          <div className="inline-flex items-center gap-1.5 text-xs text-[#7A6F86]">
                            <Spinner className="w-3.5 h-3.5 text-[#7455A4]" />
                            Updating...
                          </div>
                        ) : allowedNextStatuses.length === 0 ? (
                          <span className="text-xs text-[#7A6F86]/60 italic">No actions</span>
                        ) : (
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {allowedNextStatuses.includes("confirmed") && (
                              <button
                                type="button"
                                disabled={isRowUpdating}
                                onClick={() => onStatusChange(res, "confirmed")}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#7455A4] bg-[#F0EAF7] hover:bg-[#E4D8F0] rounded-lg transition-colors cursor-pointer border border-[#C9B8E2]"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Confirm
                              </button>
                            )}
                            {allowedNextStatuses.includes("completed") && (
                              <button
                                type="button"
                                disabled={isRowUpdating}
                                onClick={() => onStatusChange(res, "completed")}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#91A68D] bg-[#91A68D]/15 hover:bg-[#91A68D]/25 rounded-lg transition-colors cursor-pointer border border-[#91A68D]/30"
                              >
                                <CheckCheck className="w-3 h-3" /> Complete
                              </button>
                            )}
                            {allowedNextStatuses.includes("cancelled") && (
                              <button
                                type="button"
                                disabled={isRowUpdating}
                                onClick={() => onStatusChange(res, "cancelled")}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#BE123C] bg-[#FFF1F2] hover:bg-rose-100 rounded-lg transition-colors cursor-pointer border border-[#FECDD3]"
                              >
                                <XCircle className="w-3 h-3" /> Cancel
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

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {reservations.map((res) => {
              const serviceName = res.service?.name || "General Service";
              const startTime = res.start_time;
              const formattedPrice = res.total_price ?? 0;
              const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[res.status] || [];
              const isRowUpdating = updatingResId === res.id;

              return (
                <div key={res.id} className="bg-white border border-[#EAE4F2] rounded-2xl p-4 shadow-xs space-y-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Tag className="w-4 h-4 text-[#9275BC] flex-shrink-0" />
                        <span className="text-sm font-semibold text-[#33283D] truncate">{serviceName}</span>
                      </div>
                      {res.therapist && (
                        <div className="flex items-center gap-1.5 text-xs text-[#7A6F86] mt-1 pl-6">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: res.therapist.color || "#7455A4" }}
                          />
                          <span>{res.therapist.name}</span>
                        </div>
                      )}
                    </div>
                    <StatusBadge status={res.status} className="text-[11px] flex-shrink-0" />
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center justify-between text-xs text-[#7A6F86]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#7A6F86]/70" />
                      {startTime ? new Date(startTime).toLocaleString() : "Date N/A"}
                    </div>
                    <div className="font-bold text-[#33283D]">
                      {formatCurrency(formattedPrice)}
                    </div>
                  </div>

                  {/* Actions */}
                  {isRowUpdating ? (
                    <div className="flex items-center gap-1.5 text-xs text-[#7A6F86]">
                      <Spinner className="w-3.5 h-3.5 text-[#7455A4]" />
                      Updating...
                    </div>
                  ) : (
                    allowedNextStatuses.length > 0 && (
                      <div className="flex items-center gap-2 pt-1 border-t border-[#EAE4F2]">
                        {allowedNextStatuses.includes("confirmed") && (
                          <button
                            type="button"
                            onClick={() => onStatusChange(res, "confirmed")}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-[#7455A4] bg-[#F0EAF7] hover:bg-[#E4D8F0] rounded-xl border border-[#C9B8E2] transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                          </button>
                        )}
                        {allowedNextStatuses.includes("completed") && (
                          <button
                            type="button"
                            onClick={() => onStatusChange(res, "completed")}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-[#91A68D] bg-[#91A68D]/15 hover:bg-[#91A68D]/25 rounded-xl border border-[#91A68D]/30 transition-colors cursor-pointer"
                          >
                            <CheckCheck className="w-3.5 h-3.5" /> Complete
                          </button>
                        )}
                        {allowedNextStatuses.includes("cancelled") && (
                          <button
                            type="button"
                            onClick={() => onStatusChange(res, "cancelled")}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-[#BE123C] bg-[#FFF1F2] hover:bg-rose-100 rounded-xl border border-[#FECDD3] transition-colors cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Cancel
                          </button>
                        )}
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

