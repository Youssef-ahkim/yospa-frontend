"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, Tag } from "lucide-react";
import { Reservation } from "@/types";
import { formatCurrency } from "@/lib/currency";
import { formatShortDateTime24 } from "@/lib/dates";

interface TransactionsTableProps {
  reservations?: Reservation[];
}

export function TransactionsTable({ reservations }: TransactionsTableProps) {
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
    <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-[#EAE4F2] shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[#33283D]">Last transaction</h3>
          <p className="text-xs text-[#7A6F86]">Recent appointments and customer payments</p>
        </div>

        {/* Search Input matching reference design */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#7A6F86] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
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
              <th className="pb-3 font-semibold">Client & Service</th>
              <th className="pb-3 font-semibold">Date</th>
              <th className="pb-3 font-semibold">Price</th>
              <th className="pb-3 font-semibold text-right pr-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#FAF8FC]">
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-xs text-[#7A6F86]">
                  No recent appointments found.
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

                    {/* Date */}
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
