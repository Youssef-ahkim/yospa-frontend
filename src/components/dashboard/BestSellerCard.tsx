"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles, ArrowUpRight } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { Reservation } from "@/types";
import { getTopServices } from "@/lib/analytics";

interface BestSellerCardProps {
  reservations?: Reservation[];
}

export function BestSellerCard({ reservations }: BestSellerCardProps) {
  const [topServiceSlide, setTopServiceSlide] = useState(0);

  const topServicesList = useMemo(() => {
    return getTopServices(reservations || []);
  }, [reservations]);

  // Hide the card completely if there is no completed service data
  if (topServicesList.length === 0) {
    return null;
  }

  const currentService = topServicesList[topServiceSlide % topServicesList.length];

  return (
    <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-[#EAE4F2] shadow-xs flex flex-col justify-between space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-[#33283D]">Congratulations! 🎉</h3>
        </div>
        <p className="text-xs text-[#7A6F86] mt-1 leading-relaxed">
          Some of your spa services have the highest bookings this week
        </p>
      </div>

      {/* Interactive Service Visual Showcase */}
      <div className="relative bg-[#FAF8FC] rounded-2xl p-6 border border-[#EAE4F2] flex flex-col items-center justify-center text-center overflow-hidden">
        {/* Nav Arrows (only active/visible when multiple services exist) */}
        {topServicesList.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                setTopServiceSlide((prev) => (prev - 1 + topServicesList.length) % topServicesList.length)
              }
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white shadow-xs border border-[#EAE4F2] flex items-center justify-center text-[#7A6F86] hover:text-[#7455A4] transition-colors cursor-pointer z-10"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setTopServiceSlide((prev) => (prev + 1) % topServicesList.length)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white shadow-xs border border-[#EAE4F2] flex items-center justify-center text-[#7A6F86] hover:text-[#7455A4] transition-colors cursor-pointer z-10"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Service Centerpiece Card */}
        <div className="w-32 h-36 bg-white rounded-2xl shadow-md border border-[#EAE4F2] p-4 flex flex-col items-center justify-center gap-2 mb-3 transform hover:scale-105 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7455A4] to-[#9275BC] text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-[10px] font-bold text-[#7455A4] uppercase tracking-wider bg-[#F0EAF7] px-2 py-0.5 rounded-md">
            {currentService.tag}
          </span>
        </div>

        {/* Title & Sold count */}
        <h4 className="text-sm font-bold text-[#33283D] max-w-[200px] truncate">
          {currentService.name}
        </h4>
        <p className="text-xs text-[#7A6F86] mt-1 font-medium">
          {currentService.bookingsCount} booked · {formatCurrency(currentService.price)}
        </p>
      </div>

      {/* Quick CTA button */}
      <Link
        href="/dashboard/reservations?new=1"
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-[#7455A4] to-[#9275BC] text-white text-xs font-bold rounded-2xl shadow-md shadow-[#7455A4]/20 hover:opacity-95 transition-all cursor-pointer"
      >
        <span>Book New Appointment</span>
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
