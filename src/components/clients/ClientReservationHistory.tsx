"use client";

import Link from "next/link";
import {
  Reservation,
  ReservationStatus,
  ALLOWED_STATUS_TRANSITIONS,
} from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import {
  Calendar,
  Clock,
  DollarSign,
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
          <h2 className="text-lg font-bold text-gray-900">Appointment History</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            All reservations booked for this client
          </p>
        </div>
        <Link
          href="/dashboard/reservations"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Book Reservation
        </Link>
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-3 shadow-xs">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-sm font-semibold text-gray-900">No Reservations Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            This client does not have any appointments recorded yet.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {reservations.map((res) => {
                  const serviceName = res.service?.name || "General Service";
                  const startTime = res.start_time;
                  const formattedPrice = res.total_price ?? 0;
                  const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[res.status] || [];
                  const isRowUpdating = updatingResId === res.id;

                  return (
                    <tr key={res.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <Tag className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                          {serviceName}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <StatusBadge status={res.status} />
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {startTime ? new Date(startTime).toLocaleString() : "Date N/A"}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900">
                        <div className="flex items-center gap-0.5">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          {Number(formattedPrice).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm">
                        {isRowUpdating ? (
                          <div className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                            <Spinner className="w-3.5 h-3.5 text-indigo-600" />
                            Updating...
                          </div>
                        ) : allowedNextStatuses.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">No actions</span>
                        ) : (
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {allowedNextStatuses.includes("confirmed") && (
                              <button
                                type="button"
                                disabled={isRowUpdating}
                                onClick={() => onStatusChange(res, "confirmed")}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer border border-emerald-200"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Confirm
                              </button>
                            )}
                            {allowedNextStatuses.includes("completed") && (
                              <button
                                type="button"
                                disabled={isRowUpdating}
                                onClick={() => onStatusChange(res, "completed")}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer border border-blue-200"
                              >
                                <CheckCheck className="w-3 h-3" /> Complete
                              </button>
                            )}
                            {allowedNextStatuses.includes("cancelled") && (
                              <button
                                type="button"
                                disabled={isRowUpdating}
                                onClick={() => onStatusChange(res, "cancelled")}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors cursor-pointer border border-red-200"
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
                <div key={res.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs space-y-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Tag className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      <span className="text-sm font-semibold text-gray-900 truncate">{serviceName}</span>
                    </div>
                    <StatusBadge status={res.status} className="text-[11px]" />
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {startTime ? new Date(startTime).toLocaleString() : "Date N/A"}
                    </div>
                    <div className="flex items-center gap-0.5 font-semibold text-gray-800">
                      <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                      {Number(formattedPrice).toFixed(2)}
                    </div>
                  </div>

                  {/* Actions */}
                  {isRowUpdating ? (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Spinner className="w-3.5 h-3.5 text-indigo-600" />
                      Updating...
                    </div>
                  ) : (
                    allowedNextStatuses.length > 0 && (
                      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                        {allowedNextStatuses.includes("confirmed") && (
                          <button
                            type="button"
                            onClick={() => onStatusChange(res, "confirmed")}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                          </button>
                        )}
                        {allowedNextStatuses.includes("completed") && (
                          <button
                            type="button"
                            onClick={() => onStatusChange(res, "completed")}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                          >
                            <CheckCheck className="w-3.5 h-3.5" /> Complete
                          </button>
                        )}
                        {allowedNextStatuses.includes("cancelled") && (
                          <button
                            type="button"
                            onClick={() => onStatusChange(res, "cancelled")}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors cursor-pointer"
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

