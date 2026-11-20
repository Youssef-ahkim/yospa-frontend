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
  Edit3,
  Trash2,
} from "lucide-react";

interface ReservationsTableProps {
  displayedReservations: Reservation[];
  totalReservationsCount: number;
  updatingId: number | null;
  onStatusChange: (reservation: Reservation, newStatus: ReservationStatus) => Promise<void>;
  onEditClick: (reservation: Reservation) => void;
  onDeleteClick: (reservation: Reservation) => void;
  onCreateClick: () => void;
  onClearFilters: () => void;
}

export function ReservationsTable({
  displayedReservations,
  totalReservationsCount,
  updatingId,
  onStatusChange,
  onEditClick,
  onDeleteClick,
  onCreateClick,
  onClearFilters,
}: ReservationsTableProps) {
  if (displayedReservations.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-[#EAE4F2] rounded-2xl space-y-3 shadow-xs">
        <Calendar className="w-10 h-10 text-[#C9B8E2] mx-auto" />
        <h3 className="text-sm font-semibold text-[#33283D]">
          {totalReservationsCount === 0 ? "No reservations yet" : "No reservations match your filters"}
        </h3>
        <p className="text-xs text-[#7A6F86] max-w-sm mx-auto">
          {totalReservationsCount === 0
            ? "Get started by scheduling your first client appointment."
            : "Try adjusting your search keyword, date period, or status tab to find matching appointments."}
        </p>
        <div className="pt-2">
          {totalReservationsCount === 0 ? (
            <button
              onClick={onCreateClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#7455A4] hover:bg-[#5E4387] rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Reservation
            </button>
          ) : (
            <button
              onClick={onClearFilters}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#7455A4] bg-[#F0EAF7] hover:bg-[#E4D8F0] rounded-xl transition-colors cursor-pointer"
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
    <div className="bg-white border border-[#EAE4F2] rounded-2xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#EAE4F2]">
          <thead className="bg-[#FAF8FC]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[#7A6F86] uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[#7A6F86] uppercase tracking-wider">
                Service
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[#7A6F86] uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[#7A6F86] uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[#7A6F86] uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-[#7A6F86] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#FAF8FC] bg-white">
            {displayedReservations.map((res) => {
              const clientName = res.client?.full_name || "Unknown Client";
              const serviceName = res.service?.name || "General Service";
              const formattedPrice = res.total_price ?? 0;
              const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[res.status] || [];
              const isRowUpdating = updatingId === res.id;

              return (
                <tr key={res.id} className="hover:bg-[#FAF8FC] transition-colors">
                  {/* Client Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#F0EAF7] flex items-center justify-center flex-shrink-0">
                        <User className="w-3.5 h-3.5 text-[#7455A4]" />
                      </div>
                      <div>
                        {res.client?.id ? (
                          <Link
                            href={`/dashboard/clients/${res.client.id}`}
                            className="text-sm font-semibold text-[#33283D] hover:text-[#7455A4] transition-colors"
                          >
                            {clientName}
                          </Link>
                        ) : (
                          <div className="text-sm font-semibold text-[#33283D]">{clientName}</div>
                        )}
                        <div className="text-xs text-[#7A6F86]">
                          {res.client?.phone || res.client?.email || "No contact info"}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Service Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#33283D]">
                      <Tag className="w-4 h-4 text-[#9275BC] flex-shrink-0" />
                      <span>{serviceName}</span>
                    </div>
                    {res.service?.duration_minutes && (
                      <span className="text-xs text-[#7A6F86]">
                        {res.service.duration_minutes} min duration
                      </span>
                    )}
                  </td>

                  {/* Status Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={res.status} />
                  </td>

                  {/* Date & Time Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#7A6F86]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#7A6F86]/70 flex-shrink-0" />
                      <span>
                        {res.start_time ? new Date(res.start_time).toLocaleString() : "Date N/A"}
                      </span>
                    </div>
                  </td>

                  {/* Price Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#33283D]">
                    <span>{formatCurrency(formattedPrice)}</span>
                  </td>

                  {/* Action Transitions Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {isRowUpdating ? (
                      <div className="inline-flex items-center gap-1.5 text-xs text-[#7A6F86]">
                        <Spinner className="w-3.5 h-3.5 text-[#7455A4]" />
                        <span>Updating...</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {(res.status === "pending" || res.status === "confirmed") && (
                          <button
                            type="button"
                            disabled={isRowUpdating}
                            onClick={() => onEditClick(res)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#33283D] bg-white hover:bg-[#FAF8FC] rounded-lg transition-colors cursor-pointer border border-[#EAE4F2] shadow-2xs"
                            title="Edit this reservation"
                          >
                            <Edit3 className="w-3 h-3 text-[#7455A4]" />
                            Edit
                          </button>
                        )}

                        {allowedNextStatuses.includes("confirmed") && (
                          <button
                            type="button"
                            disabled={isRowUpdating}
                            onClick={() => onStatusChange(res, "confirmed")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#7455A4] bg-[#F0EAF7] hover:bg-[#E4D8F0] rounded-lg transition-colors cursor-pointer border border-[#C9B8E2]"
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#91A68D] bg-[#91A68D]/15 hover:bg-[#91A68D]/25 rounded-lg transition-colors cursor-pointer border border-[#91A68D]/30"
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
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#BE123C] bg-[#FFF1F2] hover:bg-rose-100 rounded-lg transition-colors cursor-pointer border border-[#FECDD3]"
                            title="Cancel this reservation"
                          >
                            <XCircle className="w-3 h-3" />
                            Cancel
                          </button>
                        )}

                        {(res.status === "pending" || res.status === "cancelled") && (
                          <button
                            type="button"
                            disabled={isRowUpdating}
                            onClick={() => onDeleteClick(res)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#BE123C] bg-white hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-[#FECDD3] shadow-2xs disabled:opacity-50"
                            title="Delete this reservation"
                          >
                            <Trash2 className="w-3 h-3 text-[#BE123C]" />
                            Delete
                          </button>
                        )}

                        {!(res.status === "pending" || res.status === "confirmed" || res.status === "cancelled") && allowedNextStatuses.length === 0 && (
                          <span className="text-xs text-[#7A6F86]/60 italic">No actions</span>
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

