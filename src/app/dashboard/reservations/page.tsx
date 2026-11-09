"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Calendar, Loader2, Clock, DollarSign, User, Tag } from "lucide-react";

interface Reservation {
  id: number;
  client?: {
    id: number;
    full_name?: string;
    name?: string;
    email?: string | null;
  } | null;
  service?: {
    id: number;
    name?: string;
  } | null;
  service_name?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  start_time?: string;
  starts_at?: string;
  total_price?: number | string;
  price?: number | string;
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setIsLoading(true);
        const data = await apiFetch<Reservation[]>("/reservations");
        setReservations(data);
      } catch (err: any) {
        setError(err.message || "Failed to load reservations.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReservations();
  }, []);

  const getStatusBadgeClass = (status: Reservation["status"]) => {
    switch (status) {
      case "confirmed":
        return "bg-green-50 text-green-700 border-green-200";
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "completed":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
        <p className="text-sm text-gray-500 mt-1">
          View and manage upcoming appointments and service bookings
        </p>
      </div>

      {/* Main Content Area */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-16 bg-white border border-gray-200 rounded-xl">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
      ) : reservations.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <p className="text-gray-500 text-sm">No reservations found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {reservations.map((res) => {
                const clientName = res.client?.full_name || res.client?.name || "Unknown Client";
                const serviceName = res.service?.name || res.service_name || "General Service";
                const startTime = res.start_time || res.starts_at;
                const formattedPrice = res.total_price ?? res.price ?? 0;

                return (
                  <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {clientName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {res.client?.email || "No email"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <Tag className="w-4 h-4 text-indigo-500" />
                        {serviceName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getStatusBadgeClass(
                          res.status
                        )}`}
                      >
                        {res.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {startTime ? new Date(startTime).toLocaleString() : "Date N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      <div className="flex items-center gap-0.5">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        {formattedPrice}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}