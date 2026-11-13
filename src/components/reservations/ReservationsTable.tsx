"use client";

import Link from "next/link";
import { Reservation, ReservationStatus, ALLOWED_STATUS_TRANSITIONS } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { formatCurrency } from "@/lib/currency";
import {
  Calendar,
  Clock,
  User,
  Tag,
  Plus,
  RotateCcw,
  CheckCircle2,
  CheckCheck,
  XCircle,
} from "lucide-react";

interface ReservationsTableProps {
  displayedReservations: Reservation[];
  totalReservationsCount: number;
  updatingId: number | null;
  onStatusChange: (reservation: Reservation, newStatus: ReservationStatus) => Promise<void>;
  onCreateClick: () => void;
  onClearFilters: () => void;
}

export function ReservationsTable({
  displayedReservations,
  totalReservationsCount,
  updatingId,
  onStatusChange,
  onCreateClick,
  onClearFilters,
}: ReservationsTableProps) {
  if (displayedReservations.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-gray-200 rounded-xl space-y-3">
        <Calendar className="w-10 h-10 text-gray-300 mx-auto" />
        <h3 className="text-sm font-semibold text-gray-900">
          {totalReservationsCount === 0 ? "No reservations yet" : "No reservations match your filters"}
        </h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          {totalReservationsCount === 0
            ? "Get started by scheduling your first client appointment."
            : "Try adjusting your search keyword, date period, or status tab to find matching appointments."}
        </p>
        <div className="pt-2">
          {totalReservationsCount === 0 ? (
            <button
              onClick={onCreateClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Reservation
            </button>
          ) : (
            <button
              onClick={onClearFilters}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Filters
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Service
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {displayedReservations.map((res) => {
              const clientName = res.client?.full_name || "Unknown Client";
              const serviceName = res.service?.name || "General Service";
              const formattedPrice = res.total_price ?? 0;
              const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[res.status] || [];
              const isRowUpdating = updatingId === res.id;

              return (
                <tr key={res.id} className="hover:bg-gray-50/80 transition-colors">
                  {/* Client Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div>
                        {res.client?.id ? (
                          <Link
                            href={`/dashboard/clients/${res.client.id}`}
                            className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                          >
                            {clientName}
                          </Link>
                        ) : (
                          <div className="text-sm font-semibold text-gray-900">{clientName}</div>
                        )}
                        <div className="text-xs text-gray-500">
                          {res.client?.phone || res.client?.email || "No contact info"}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Service Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <Tag className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      <span>{serviceName}</span>
                    </div>
                    {res.service?.duration_minutes && (
                      <span className="text-xs text-gray-400">
                        {res.service.duration_minutes} min duration
                      </span>
                    )}
                  </td>

                  {/* Status Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={res.status} />
                  </td>

                  {/* Date & Time Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span>
                        {res.start_time ? new Date(res.start_time).toLocaleString() : "Date N/A"}
                      </span>
                    </div>
                  </td>

                  {/* Price Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    <span>{formatCurrency(formattedPrice)}</span>
                  </td>

                  {/* Action Transitions Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {isRowUpdating ? (
                      <div className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                        <Spinner className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Updating...</span>
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
                            title="Confirm this appointment"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Confirm
                          </button>
                        )}

                        {allowedNextStatuses.includes("completed") && (
                          <button
                            type="button"
                            disabled={isRowUpdating}
                            onClick={() => onStatusChange(res, "completed")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer border border-blue-200"
                            title="Mark appointment as completed"
                          >
                            <CheckCheck className="w-3 h-3" />
                            Complete
                          </button>
                        )}

                        {allowedNextStatuses.includes("cancelled") && (
                          <button
                            type="button"
                            disabled={isRowUpdating}
                            onClick={() => onStatusChange(res, "cancelled")}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors cursor-pointer border border-red-200"
                            title="Cancel this reservation"
                          >
                            <XCircle className="w-3 h-3" />
                            Cancel
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
    </div>
  );
}

