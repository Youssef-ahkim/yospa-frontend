"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, Tag, Calendar } from "lucide-react";
import { Reservation } from "@/types";
import { formatCurrency } from "@/lib/currency";
import { formatShortDateTime24 } from "@/lib/dates";

interface TransactionsTableProps {
  reservations?: Reservation[];
  isLoading?: boolean;
  className?: string;
}

export function TransactionsTable({
  reservations,
  isLoading = false,
  className = "",
}: TransactionsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBookings = useMemo(() => {
    if (!reservations) return [];
    if (!searchQuery.trim()) return reservations;
    const q = searchQuery.toLowerCase().trim();
    return reservations.filter((res) => {
      const clientName = res.client?.full_name?.toLowerCase() || "";
      const serviceName = res.service?.name?.toLowerCase() || "";
      return clientName.includes(q) || serviceName.includes(q);
    });
  }, [reservations, searchQuery]);

  return (
    <div
      className={`lg:col-span-8 bg-white rounded-3xl p-6 border border-[#EAE4F2] shadow-xs space-y-5 min-w-0 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[#33283D]">Today&apos;s appointments</h3>
          <p className="text-xs text-[#7A6F86]">Appointments scheduled for today</p>
        </div>

        {/* Search & Navigation Link */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#7A6F86] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search client or service"
              className="pl-8 pr-3 py-1.5 bg-[#FAF8FC] border border-[#EAE4F2] rounded-xl text-xs text-[#33283D] placeholder-[#7A6F86] focus:outline-none focus:border-[#7455A4] focus:ring-1 focus:ring-[#7455A4] w-36 sm:w-48 transition-all"
            />
          </div>
          <Link
            href="/dashboard/reservations"
            className="p-2 bg-[#FAF8FC] border border-[#EAE4F2] rounded-xl text-[#7A6F86] hover:text-[#7455A4] hover:bg-[#F0EAF7] transition-colors cursor-pointer"
            title="View All Reservations"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[11px] font-semibold text-[#7A6F86] border-b border-[#EAE4F2] pb-2">
              <th className="pb-3 font-semibold pl-2">Order ID</th>
              <th className="pb-3 font-semibold">Client &amp; Service</th>
              <th className="pb-3 font-semibold">Time</th>
              <th className="pb-3 font-semibold">Price</th>
              <th className="pb-3 font-semibold text-right pr-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#FAF8FC]">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3.5 pl-2">
                    <div className="h-4 w-16 bg-gray-200 rounded" />
                  </td>
                  <td className="py-3.5">
                    <div className="h-4 w-32 bg-gray-200 rounded mb-1" />
                    <div className="h-3 w-20 bg-gray-100 rounded" />
                  </td>
                  <td className="py-3.5">
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                  </td>
                  <td className="py-3.5">
                    <div className="h-4 w-14 bg-gray-200 rounded" />
                  </td>
                  <td className="py-3.5 text-right pr-2">
                    <div className="h-6 w-20 bg-gray-200 rounded-full inline-block" />
                  </td>
                </tr>
              ))
            ) : filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-xs text-[#7A6F86]">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Calendar className="w-7 h-7 text-[#C9B8E2]" />
                    <p className="font-semibold text-[#33283D]">
                      {searchQuery ? "No appointments match your search." : "No appointments scheduled for today."}
                    </p>
                    {!searchQuery && (
                      <p className="text-[11px] text-[#7A6F86]">
                        New appointments created for today will appear here.
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredBookings.map((res) => {
                const clientName = res.client?.full_name || "Guest Client";
                const serviceName = res.service?.name || "Spa Care";
                const formattedPrice = formatCurrency(res.total_price);
                const formattedDate = formatShortDateTime24(res.start_time);
                const idString = `CTG${String(res.id).padStart(4, "0")}`;

                return (
                  <tr
                    key={res.id}
                    className="hover:bg-[#FAF8FC] transition-colors group cursor-pointer"
                  >
                    {/* Order ID */}
                    <td className="py-3.5 pl-2 font-mono font-semibold text-[#33283D] flex items-center gap-2">
                      <span className="w-4 h-4 rounded border border-[#C9B8E2] group-hover:border-[#7455A4] flex items-center justify-center transition-colors">
                        <span className="w-1.5 h-1.5 rounded-sm bg-transparent group-hover:bg-[#7455A4] transition-colors" />
                      </span>
                      <span>{idString}</span>
                    </td>

                    {/* Client & Service */}
                    <td className="py-3.5">
                      <Link href="/dashboard/reservations" className="block">
                        <p className="font-semibold text-[#33283D] group-hover:text-[#7455A4] transition-colors">
                          {clientName}
                        </p>
                        <p className="text-[11px] text-[#7A6F86] flex items-center gap-1 mt-0.5">
                          <Tag className="w-2.5 h-2.5 text-[#9275BC]" />
                          {serviceName}
                        </p>
                      </Link>
                    </td>

                    {/* Time / Date */}
                    <td className="py-3.5 text-[#7A6F86] whitespace-nowrap">
                      {formattedDate}
                    </td>

                    {/* Price */}
                    <td className="py-3.5 font-bold text-[#33283D]">
                      {formattedPrice}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 text-right pr-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          res.status === "completed"
                            ? "bg-[#91A68D]/15 text-[#91A68D] border-[#91A68D]/30"
                            : res.status === "confirmed"
                            ? "bg-[#F0EAF7] text-[#7455A4] border-[#C9B8E2]"
                            : res.status === "pending"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            res.status === "completed"
                              ? "bg-[#91A68D]"
                              : res.status === "confirmed"
                              ? "bg-[#7455A4]"
                              : res.status === "pending"
                              ? "bg-amber-500"
                              : "bg-gray-400"
                          }`}
                        />
                        <span className="capitalize">{res.status}</span>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
