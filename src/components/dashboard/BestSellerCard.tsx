"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles, ArrowUpRight } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { DashboardStats } from "@/hooks/useDashboardData";

interface BestSellerCardProps {
  topService?: DashboardStats["topService"];
}

export function BestSellerCard({ topService }: BestSellerCardProps) {
  const [topServiceSlide, setTopServiceSlide] = useState(0);

  const featuredServices = useMemo(() => {
    const defaultServices = [
      {
        title: "Signature Hammam & Body Scrub",
        category: "Hammam Ritual",
        price: "450 MAD",
        bookings: "271 sold",
        duration: "60 min",
        tag: "Best Seller",
        color: "bg-[#7455A4]",
      },
      {
        title: "Aromatherapy Deep Tissue Massage",
        category: "Massage Therapy",
        price: "600 MAD",
        bookings: "184 sold",
        duration: "75 min",
        tag: "Trending",
        color: "bg-[#9275BC]",
      },
      {
        title: "Rejuvenating Radiance Facial",
        category: "Facial Care",
        price: "520 MAD",
        bookings: "142 sold",
        duration: "50 min",
        tag: "Popular",
        color: "bg-[#91A68D]",
      },
    ];

    if (topService) {
      defaultServices[0].title = topService.name;
      defaultServices[0].price = formatCurrency(topService.price);
      defaultServices[0].bookings = `${topService.bookingsCount} booked`;
      defaultServices[0].duration = `${topService.duration} min`;
    }

    return defaultServices;
  }, [topService]);

  const currentService = featuredServices[topServiceSlide % featuredServices.length];

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
        {/* Nav Arrows */}
        <button
          type="button"
          onClick={() =>
            setTopServiceSlide((prev) => (prev - 1 + featuredServices.length) % featuredServices.length)
          }
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white shadow-xs border border-[#EAE4F2] flex items-center justify-center text-[#7A6F86] hover:text-[#7455A4] transition-colors cursor-pointer z-10"
          aria-label="Previous"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setTopServiceSlide((prev) => (prev + 1) % featuredServices.length)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white shadow-xs border border-[#EAE4F2] flex items-center justify-center text-[#7A6F86] hover:text-[#7455A4] transition-colors cursor-pointer z-10"
          aria-label="Next"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

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
          {currentService.title}
        </h4>
        <p className="text-xs text-[#7A6F86] mt-1 font-medium">
          {currentService.bookings} · {currentService.price}
        </p>
      </div>

      {/* Quick CTA button */}
      <Link
        href="/dashboard/reservations"
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-[#7455A4] to-[#9275BC] text-white text-xs font-bold rounded-2xl shadow-md shadow-[#7455A4]/20 hover:opacity-95 transition-all cursor-pointer"
      >
        <span>Book New Appointment</span>
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
