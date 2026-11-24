"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles, ArrowUpRight, AlertCircle, RotateCcw } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { apiFetch } from "@/lib/api";
import { BestSellerService, SalesReportRange } from "@/types";

interface BestSellerCardProps {
  range: SalesReportRange;
  canSeeRevenue: boolean;
}

export function BestSellerCard({ range, canSeeRevenue }: BestSellerCardProps) {
  const [services, setServices] = useState<BestSellerService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topServiceSlide, setTopServiceSlide] = useState(0);
  const requestIdRef = useRef(0);

  const fetchBestSellers = useCallback(async (r: SalesReportRange) => {
    const currentReq = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<BestSellerService[]>(`/dashboard/best-sellers?range=${r}`);
      if (currentReq === requestIdRef.current) {
        setServices(Array.isArray(res) ? res : []);
        setTopServiceSlide(0);
        setIsLoading(false);
      }
    } catch (err: unknown) {
      if (currentReq === requestIdRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load top services.");
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch top services when range changes
    fetchBestSellers(range);
  }, [range, fetchBestSellers]);

  const tags = ["Best Seller", "Trending", "Popular", "Top Choice", "Featured"];
  const currentService =
    services.length > 0 ? services[topServiceSlide % services.length] : null;
  const currentTag = currentService
    ? tags[(topServiceSlide % services.length) % tags.length]
    : "Best Seller";

  const rangeLabel =
    range === "1d"
      ? "today"
      : range === "7d"
      ? "this week"
      : range === "30d"
      ? "this month"
      : "this year";

  return (
    <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-[#EAE4F2] shadow-xs flex flex-col justify-between space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-[#33283D]">Top Services 🎉</h3>
        </div>
        <p className="text-xs text-[#7A6F86] mt-1 leading-relaxed">
          Your spa services with the highest completed bookings {rangeLabel}
        </p>
      </div>

      {isLoading ? (
        <div className="bg-[#FAF8FC] rounded-2xl p-6 border border-[#EAE4F2] flex flex-col items-center justify-center text-center animate-pulse space-y-3">
          <div className="w-32 h-32 bg-gray-200 rounded-2xl" />
          <div className="h-4 w-28 bg-gray-200 rounded-lg" />
          <div className="h-3 w-20 bg-gray-100 rounded-lg" />
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-2xl p-5 border border-red-200 flex flex-col items-center justify-center text-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-xs text-red-700 font-medium">{error}</p>
          <button
            type="button"
            onClick={() => fetchBestSellers(range)}
            className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors cursor-pointer mt-1"
          >
            <RotateCcw className="w-3 h-3" />
            Retry
          </button>
        </div>
      ) : !currentService ? (
        <div className="bg-[#FAF8FC] rounded-2xl p-6 border border-[#EAE4F2] flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white border border-[#EAE4F2] flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5 text-[#9275BC] opacity-60" />
          </div>
          <p className="text-xs font-bold text-[#33283D]">No completed services</p>
          <p className="text-[11px] text-[#7A6F86] max-w-[200px]">
            Services completed in this date range will be showcased here.
          </p>
        </div>
      ) : (
        /* Interactive Service Visual Showcase */
        <div className="relative bg-[#FAF8FC] rounded-2xl p-6 border border-[#EAE4F2] flex flex-col items-center justify-center text-center overflow-hidden">
          {/* Nav Arrows (only active/visible when multiple services exist) */}
          {services.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setTopServiceSlide(
                    (prev) => (prev - 1 + services.length) % services.length
                  )
                }
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white shadow-xs border border-[#EAE4F2] flex items-center justify-center text-[#7A6F86] hover:text-[#7455A4] transition-colors cursor-pointer z-10"
                aria-label="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setTopServiceSlide((prev) => (prev + 1) % services.length)}
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
              {currentTag}
            </span>
          </div>

          {/* Title & Booked count (and revenue for owner/admin) */}
          <h4 className="text-sm font-bold text-[#33283D] max-w-[200px] truncate">
            {currentService.name}
          </h4>
          <p className="text-xs text-[#7A6F86] mt-1 font-medium">
            {currentService.count} booked
            {canSeeRevenue && currentService.revenue !== null ? (
              <span> · {formatCurrency(currentService.revenue)}</span>
            ) : null}
          </p>
        </div>
      )}

      {/* Quick CTA button */}
      <Link
        href="/dashboard/reservations"
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-[#7455A4] to-[#9275BC] text-white text-xs font-bold rounded-2xl shadow-md shadow-[#7455A4]/20 hover:opacity-95 transition-all cursor-pointer"
      >
        <span>View Reservations</span>
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
