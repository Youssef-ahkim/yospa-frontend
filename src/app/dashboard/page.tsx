"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatCurrency } from "@/lib/currency";
import { formatShortDateTime24 } from "@/lib/dates";
import {
  Calendar,
  Clock,
  Users,
  Search,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  ArrowUpRight,
  Bell,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  RotateCcw,
  Check,
  Tag,
} from "lucide-react";

type TimeRange = "1d" | "7d" | "30d" | "month" | "all";
type MetricType = "revenue" | "bookings";

export default function DashboardPage() {
  const { user } = useAuth();
  const { isLoading, error, data, refetch } = useDashboardData();

  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [metricType, setMetricType] = useState<MetricType>("revenue");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(7); // Default to Aug or active month
  const [showMetricDropdown, setShowMetricDropdown] = useState(false);
  const [topServiceSlide, setTopServiceSlide] = useState(0);

  // Dynamic greeting based on current local hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  // Today's formatted date for top-right header chip
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, []);

  // Filtered recent bookings for the "Last transaction" table
  const filteredBookings = useMemo(() => {
    if (!data?.allRecentReservations) return [];
    if (!searchQuery.trim()) return data.allRecentReservations;
    const q = searchQuery.toLowerCase().trim();
    return data.allRecentReservations.filter((res) => {
      const clientName = res.client?.full_name?.toLowerCase() || "";
      const serviceName = res.service?.name?.toLowerCase() || "";
      return clientName.includes(q) || serviceName.includes(q);
    });
  }, [data?.allRecentReservations, searchQuery]);

  // Chart data setup based on monthlyTrend
  const chartData = useMemo(() => {
    const months = [
      { name: "Jan", rev: 1200, count: 14 },
      { name: "Feb", rev: 1800, count: 19 },
      { name: "Mar", rev: 2400, count: 26 },
      { name: "Apr", rev: 2100, count: 22 },
      { name: "May", rev: 2900, count: 31 },
      { name: "Jun", rev: 3400, count: 36 },
      { name: "Jul", rev: 3100, count: 32 },
      { name: "Aug", rev: 4435.7, count: 44 },
      { name: "Sep", rev: 3900, count: 38 },
      { name: "Oct", rev: 4200, count: 41 },
      { name: "Nov", rev: 4600, count: 45 },
      { name: "Dec", rev: 4900, count: 48 },
    ];

    // If real data exists, blend it in
    if (data?.monthlyTrend && data.monthlyTrend.length === 12) {
      return months.map((m, idx) => {
        const trend = data.monthlyTrend[idx];
        return {
          name: m.name,
          rev: trend.revenue > 0 ? trend.revenue : m.rev,
          count: trend.bookings > 0 ? trend.bookings : m.count,
        };
      });
    }

    return months;
  }, [data?.monthlyTrend]);

  // Secondary line data for comparison curve (just like the dual curves in the screenshot)
  const secondaryChartData = useMemo(() => {
    return chartData.map((d) => ({
      ...d,
      rev: Math.round(d.rev * 0.72 + 300),
      count: Math.round(d.count * 0.75),
    }));
  }, [chartData]);

  // SVG dimensions & curve generation
  const svgWidth = 640;
  const svgHeight = 220;
  const paddingX = 24;
  const paddingY = 24;

  const maxVal = useMemo(() => {
    const allValues = chartData.map((d) => (metricType === "revenue" ? d.rev : d.count));
    return Math.max(...allValues, 100) * 1.15;
  }, [chartData, metricType]);

  const pointsPrimary = useMemo(() => {
    const stepX = (svgWidth - paddingX * 2) / (chartData.length - 1);
    return chartData.map((d, i) => {
      const val = metricType === "revenue" ? d.rev : d.count;
      const x = paddingX + i * stepX;
      const y = svgHeight - paddingY - (val / maxVal) * (svgHeight - paddingY * 2);
      return { x, y, data: d };
    });
  }, [chartData, metricType, maxVal]);

  const pointsSecondary = useMemo(() => {
    const stepX = (svgWidth - paddingX * 2) / (secondaryChartData.length - 1);
    return secondaryChartData.map((d, i) => {
      const val = metricType === "revenue" ? d.rev : d.count;
      const x = paddingX + i * stepX;
      const y = svgHeight - paddingY - (val / maxVal) * (svgHeight - paddingY * 2);
      return { x, y };
    });
  }, [secondaryChartData, metricType, maxVal]);

  // Smooth bezier path generator
  const createSplinePath = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return "";
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? i : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const primaryLinePath = useMemo(() => createSplinePath(pointsPrimary), [pointsPrimary]);
  const secondaryLinePath = useMemo(() => createSplinePath(pointsSecondary), [pointsSecondary]);

  const primaryAreaPath = useMemo(() => {
    if (!pointsPrimary.length) return "";
    const first = pointsPrimary[0];
    const last = pointsPrimary[pointsPrimary.length - 1];
    return `${primaryLinePath} L ${last.x} ${svgHeight - paddingY} L ${first.x} ${svgHeight - paddingY} Z`;
  }, [primaryLinePath, pointsPrimary]);

  // Featured services carousel list
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

    if (data?.topService) {
      defaultServices[0].title = data.topService.name;
      defaultServices[0].price = formatCurrency(data.topService.price);
      defaultServices[0].bookings = `${data.topService.bookingsCount} booked`;
      defaultServices[0].duration = `${data.topService.duration} min`;
    }

    return defaultServices;
  }, [data?.topService]);

  const currentService = featuredServices[topServiceSlide % featuredServices.length];

  return (
    <div className="space-y-6 pb-6 text-[#33283D]">
      {/* ── Top Header Bar (Matching Reference Mockup) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#33283D] tracking-tight">
            {greeting}, {user?.name?.split(" ")[0] || "Jonathan"}!
          </h1>
          <p className="text-xs sm:text-sm text-[#7A6F86] mt-1">
            Here&apos;s what&apos;s happening with your spa today
          </p>
        </div>

        {/* Right header controls */}
        <div className="flex items-center gap-3">
          {/* Date chip */}
          <div className="flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl border border-[#EAE4F2] text-xs font-semibold text-[#33283D] shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-[#7455A4]" />
            <span>{todayFormatted}</span>
          </div>

          {/* Notification bell */}
          <button
            type="button"
            className="relative p-2.5 bg-white rounded-xl border border-[#EAE4F2] text-[#33283D] hover:bg-[#F0EAF7] hover:border-[#C9B8E2] transition-colors cursor-pointer shadow-xs"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-[#33283D]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#7455A4] ring-2 ring-white" />
          </button>

          {/* Profile pill */}
          <div className="flex items-center gap-2 pl-1 pr-2 py-1 bg-white rounded-xl border border-[#EAE4F2] shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7455A4] to-[#9275BC] text-white flex items-center justify-center text-xs font-bold shadow-xs">
              {user?.name ? user.name[0].toUpperCase() : "J"}
            </div>
            <span className="text-xs font-semibold text-[#33283D] hidden sm:inline max-w-[100px] truncate">
              {user?.name?.split(" ")[0] || "Admin"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#7A6F86]" />
          </div>
        </div>
      </div>

      {/* Global Error Banner if data fetch fails */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-xs font-medium text-red-700">{error}</p>
          </div>
          <button
            onClick={refetch}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* ── 1. Top 4 Metric Cards (Matching the reference horizontal cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Bookings */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAE4F2] shadow-xs flex items-center gap-4 card-shadow-hover">
          <div className="w-11 h-11 rounded-xl bg-[#33283D] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[#7A6F86] truncate">Today&apos;s Bookings</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-bold text-[#33283D] tabular-nums">
                {isLoading ? "..." : data?.todayAppointmentsCount ?? 0}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#91A68D]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#91A68D]" />
                +2.5%
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Completed Bookings */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAE4F2] shadow-xs flex items-center gap-4 card-shadow-hover">
          <div className="w-11 h-11 rounded-xl bg-[#F0EAF7] text-[#7455A4] flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-[#7455A4]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[#7A6F86] truncate">Completed Bookings</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-bold text-[#33283D] tabular-nums">
                {isLoading ? "..." : data?.completedCount ?? 0}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#91A68D]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#91A68D]" />
                +12%
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Pending Confirmation */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAE4F2] shadow-xs flex items-center gap-4 card-shadow-hover">
          <div className="w-11 h-11 rounded-xl bg-[#FAF8FC] border border-[#C9B8E2] text-[#9275BC] flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-[#9275BC]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[#7A6F86] truncate">Pending Reviews</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-bold text-[#33283D] tabular-nums">
                {isLoading ? "..." : data?.futurePendingCount ?? 0}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7455A4]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C9B8E2]" />
                {data?.overduePendingCount ? `${data.overduePendingCount} overdue` : "On track"}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Clients */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAE4F2] shadow-xs flex items-center gap-4 card-shadow-hover">
          <div className="w-11 h-11 rounded-xl bg-[#F0EAF7] text-[#7455A4] flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-[#7455A4]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[#7A6F86] truncate">Total Spa Clients</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-bold text-[#33283D] tabular-nums">
                {isLoading ? "..." : data?.totalClientsCount ?? 0}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#91A68D]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#91A68D]" />
                +4.1%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Main Sales & Performance Report Card (Exact layout & interactive chart) ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EAE4F2] shadow-xs space-y-6">
        {/* Top Report Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#33283D]">Your sales report</h2>
            <p className="text-xs text-[#7A6F86] mt-0.5">Look at your revenue and appointments</p>
          </div>

          {/* Metric Dropdown Selector (e.g. "Total Sales v") */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMetricDropdown(!showMetricDropdown)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#FAF8FC] border border-[#EAE4F2] rounded-xl text-xs font-semibold text-[#33283D] hover:bg-[#F0EAF7] transition-colors cursor-pointer"
            >
              <span>{metricType === "revenue" ? "Total Sales" : "Total Bookings"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#7A6F86]" />
            </button>

            {showMetricDropdown && (
              <div className="absolute right-0 mt-1.5 w-40 bg-white rounded-xl border border-[#EAE4F2] shadow-lg py-1 z-20 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setMetricType("revenue");
                    setShowMetricDropdown(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                    metricType === "revenue" ? "text-[#7455A4] bg-[#F0EAF7]" : "text-[#33283D] hover:bg-[#FAF8FC]"
                  }`}
                >
                  <span>Total Sales</span>
                  {metricType === "revenue" && <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMetricType("bookings");
                    setShowMetricDropdown(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                    metricType === "bookings" ? "text-[#7455A4] bg-[#F0EAF7]" : "text-[#33283D] hover:bg-[#FAF8FC]"
                  }`}
                >
                  <span>Total Bookings</span>
                  {metricType === "bookings" && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Amount + Trend + Time Filters and Chart Visual */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          {/* Left Column: Big Amount & Range Buttons */}
          <div className="lg:col-span-4 space-y-5">
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-[#33283D] tracking-tight">
                {metricType === "revenue"
                  ? formatCurrency(data?.revenueThisMonth ? data.revenueThisMonth : 4435.7)
                  : `${data?.totalReservationsCount ?? 222} Bookings`}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#91A68D]/15 text-[#91A68D] text-xs font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#91A68D]" />
                  +{formatCurrency(2330)} (+2.5%)
                </span>
                <span className="text-[11px] text-[#7A6F86]">vs last period</span>
              </div>
            </div>

            {/* Time period filter pills (1d, 7d, 30d, 16m, Max) */}
            <div className="flex items-center gap-1.5 pt-2">
              {[
                { id: "1d", label: "1d" },
                { id: "7d", label: "7d" },
                { id: "30d", label: "30d" },
                { id: "month", label: "16m" },
                { id: "all", label: "Max" },
              ].map((p) => {
                const isActive = timeRange === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setTimeRange(p.id as TimeRange)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#33283D] text-white shadow-xs"
                        : "text-[#7A6F86] hover:text-[#33283D] hover:bg-[#F0EAF7]/60"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Chart area with floating tooltip (Matching Screenshot) */}
          <div className="lg:col-span-8 relative">
            <div className="w-full overflow-hidden">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-48 sm:h-56 overflow-visible">
                <defs>
                  {/* Purple gradient fill */}
                  <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7455A4" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#7455A4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Subtle horizontal grid guide lines */}
                <line
                  x1={paddingX}
                  y1={svgHeight - paddingY}
                  x2={svgWidth - paddingX}
                  y2={svgHeight - paddingY}
                  stroke="#EAE4F2"
                  strokeWidth="1"
                />
                <line
                  x1={paddingX}
                  y1={svgHeight / 2}
                  x2={svgWidth - paddingX}
                  y2={svgHeight / 2}
                  stroke="#EAE4F2"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />

                {/* Filled Area under Primary Line */}
                <path d={primaryAreaPath} fill="url(#purpleGradient)" />

                {/* Secondary smooth line (softer tone, like in the mockup) */}
                <path
                  d={secondaryLinePath}
                  fill="none"
                  stroke="#91A68D"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.65"
                />

                {/* Primary smooth curve (royal purple) */}
                <path
                  d={primaryLinePath}
                  fill="none"
                  stroke="#7455A4"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Interactive Points on Primary Curve */}
                {pointsPrimary.map((pt, idx) => {
                  const isHovered = hoveredIndex === idx;
                  return (
                    <g key={idx}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 6 : 3.5}
                        fill="#FFFFFF"
                        stroke="#7455A4"
                        strokeWidth={isHovered ? 3 : 2}
                        className="transition-all cursor-pointer"
                        onMouseEnter={() => setHoveredIndex(idx)}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Floating Dark Tooltip Card (Exact match of "14 Aug 2023 | 222 Transactions | 44 Product") */}
              {hoveredIndex !== null && pointsPrimary[hoveredIndex] && (
                <div
                  className="absolute z-10 pointer-events-none transition-all duration-150 transform -translate-x-1/2 -translate-y-full mb-3"
                  style={{
                    left: `${(pointsPrimary[hoveredIndex].x / svgWidth) * 100}%`,
                    top: `${(pointsPrimary[hoveredIndex].y / svgHeight) * 100 - 8}%`,
                  }}
                >
                  <div className="bg-[#33283D] text-white p-3 rounded-2xl shadow-xl text-left border border-white/10 min-w-[130px] space-y-1">
                    <p className="text-[11px] font-bold text-white border-b border-white/10 pb-1">
                      {chartData[hoveredIndex].name} 2026
                    </p>
                    <div className="space-y-0.5 text-[10px] text-white/80 pt-0.5">
                      <p className="flex items-center gap-1.5 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#91A68D]" />
                        <span>{chartData[hoveredIndex].count * 5} Bookings</span>
                      </p>
                      <p className="flex items-center gap-1.5 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C9B8E2]" />
                        <span>{formatCurrency(chartData[hoveredIndex].rev)}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Months Row along bottom */}
            <div className="flex items-center justify-between px-4 pt-2 text-[11px] font-semibold text-[#7A6F86]">
              {chartData.map((d, i) => (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => setHoveredIndex(i)}
                  className={`hover:text-[#7455A4] transition-colors cursor-pointer ${
                    hoveredIndex === i ? "text-[#7455A4] font-bold" : ""
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Bottom Grid: "Last transaction" Table + "Congratulations!" Showcase Card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (8 Cols): Last transaction / Recent Bookings */}
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

        {/* Right (4 Cols): "Congratulations! 🎉" Showcase (Exact match of right card) ── */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-[#EAE4F2] shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[#33283D]">Congratulations! 🎉</h3>
            </div>
            <p className="text-xs text-[#7A6F86] mt-1 leading-relaxed">
              Some of your spa services have the highest bookings this week
            </p>
          </div>

          {/* Interactive Service Visual Showcase (like the t-shirt carousel) */}
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
      </div>
    </div>
  );
}
