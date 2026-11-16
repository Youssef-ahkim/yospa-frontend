"use client";

import { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/currency";
import { ChevronDown, Check, TrendingUp } from "lucide-react";
import { DashboardStats } from "@/hooks/useDashboardData";
import {
  TimeRange,
  getChartSeries,
  computeGrowth,
} from "@/lib/analytics";

export type MetricType = "revenue" | "bookings";

interface SalesChartProps {
  data: DashboardStats | null;
}

export function SalesChart({ data }: SalesChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [metricType, setMetricType] = useState<MetricType>("revenue");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showMetricDropdown, setShowMetricDropdown] = useState(false);

  // Compute real chart series from reservations
  const series = useMemo(() => {
    return getChartSeries(data?.allReservations || [], timeRange);
  }, [data?.allReservations, timeRange]);

  const currentData = series.currentBuckets;
  const secondaryData = series.previousBuckets;

  const isEmpty = series.currentTotalBookings === 0 && series.currentTotalRevenue === 0;

  // Comparison metrics vs last period
  const comparisonInfo = useMemo(() => {
    if (timeRange === "max") {
      return { diffText: "—", growthText: "—", isPositive: true };
    }

    if (metricType === "revenue") {
      const diff = series.currentTotalRevenue - series.previousTotalRevenue;
      const growth = computeGrowth(series.currentTotalRevenue, series.previousTotalRevenue);
      const diffText = diff >= 0 ? `+${formatCurrency(diff)}` : `-${formatCurrency(Math.abs(diff))}`;
      return { diffText, growthText: growth, isPositive: diff >= 0 };
    } else {
      const diff = series.currentTotalBookings - series.previousTotalBookings;
      const growth = computeGrowth(series.currentTotalBookings, series.previousTotalBookings);
      const diffText = diff >= 0 ? `+${diff}` : `${diff}`;
      return { diffText, growthText: growth, isPositive: diff >= 0 };
    }
  }, [series, timeRange, metricType]);

  // SVG dimensions & curve generation
  const svgWidth = 640;
  const svgHeight = 220;
  const paddingX = 24;
  const paddingY = 24;

  const maxVal = useMemo(() => {
    const currVals = currentData.map((d) => (metricType === "revenue" ? d.revenue : d.bookings));
    const prevVals = secondaryData.map((d) => (metricType === "revenue" ? d.revenue : d.bookings));
    const highest = Math.max(...currVals, ...prevVals, 0);
    return highest > 0 ? highest * 1.15 : 100;
  }, [currentData, secondaryData, metricType]);

  const pointsPrimary = useMemo(() => {
    if (currentData.length === 0) return [];
    if (currentData.length === 1) {
      const val = metricType === "revenue" ? currentData[0].revenue : currentData[0].bookings;
      const y = svgHeight - paddingY - (val / maxVal) * (svgHeight - paddingY * 2);
      return [{ x: svgWidth / 2, y, data: currentData[0] }];
    }
    const stepX = (svgWidth - paddingX * 2) / (currentData.length - 1);
    return currentData.map((d, i) => {
      const val = metricType === "revenue" ? d.revenue : d.bookings;
      const x = paddingX + i * stepX;
      const y = svgHeight - paddingY - (val / maxVal) * (svgHeight - paddingY * 2);
      return { x, y, data: d };
    });
  }, [currentData, metricType, maxVal]);

  const pointsSecondary = useMemo(() => {
    if (secondaryData.length === 0 || timeRange === "max") return [];
    if (secondaryData.length === 1) {
      const val = metricType === "revenue" ? secondaryData[0].revenue : secondaryData[0].bookings;
      const y = svgHeight - paddingY - (val / maxVal) * (svgHeight - paddingY * 2);
      return [{ x: svgWidth / 2, y }];
    }
    const stepX = (svgWidth - paddingX * 2) / (secondaryData.length - 1);
    return secondaryData.map((d, i) => {
      const val = metricType === "revenue" ? d.revenue : d.bookings;
      const x = paddingX + i * stepX;
      const y = svgHeight - paddingY - (val / maxVal) * (svgHeight - paddingY * 2);
      return { x, y };
    });
  }, [secondaryData, timeRange, metricType, maxVal]);

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

  // Determine which bottom labels to render based on range
  const visibleIndices = useMemo(() => {
    const len = currentData.length;
    if (len <= 7) return Array.from({ length: len }, (_, i) => i);
    if (timeRange === "1d") {
      // 0, 4, 8, 12, 16, 20, 23
      return [0, 4, 8, 12, 16, 20, 23].filter((i) => i < len);
    }
    if (timeRange === "30d") {
      // every 5 days
      return [0, 5, 10, 15, 20, 25, len - 1].filter((i) => i < len);
    }
    if (len <= 12) return Array.from({ length: len }, (_, i) => i);
    const step = Math.ceil(len / 8);
    const indices: number[] = [];
    for (let i = 0; i < len; i += step) indices.push(i);
    if (indices[indices.length - 1] !== len - 1) indices.push(len - 1);
    return indices;
  }, [currentData.length, timeRange]);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EAE4F2] shadow-xs space-y-6">
      {/* Top Report Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#33283D]">Your sales report</h2>
          <p className="text-xs text-[#7A6F86] mt-0.5">Look at your revenue and appointments</p>
        </div>

        {/* Metric Dropdown Selector */}
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
                ? formatCurrency(series.currentTotalRevenue)
                : `${series.currentTotalBookings} Bookings`}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  comparisonInfo.growthText === "—"
                    ? "bg-gray-100 text-[#7A6F86]"
                    : comparisonInfo.isPositive
                    ? "bg-[#91A68D]/15 text-[#91A68D]"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {comparisonInfo.growthText !== "—" && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      comparisonInfo.isPositive ? "bg-[#91A68D]" : "bg-amber-600"
                    }`}
                  />
                )}
                {comparisonInfo.growthText === "—"
                  ? "—"
                  : `${comparisonInfo.diffText} (${comparisonInfo.growthText})`}
              </span>
              <span className="text-[11px] text-[#7A6F86]">vs last period</span>
            </div>
          </div>

          {/* Time period filter pills (1d, 7d, 30d, 12m, Max) */}
          <div className="flex items-center gap-1.5 pt-2">
            {[
              { id: "1d", label: "1d" },
              { id: "7d", label: "7d" },
              { id: "30d", label: "30d" },
              { id: "12m", label: "12m" },
              { id: "max", label: "Max" },
            ].map((p) => {
              const isActive = timeRange === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setTimeRange(p.id as TimeRange);
                    setHoveredIndex(null);
                  }}
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

        {/* Right Column: Chart area with floating tooltip */}
        <div className="lg:col-span-8 relative">
          {isEmpty ? (
            <div className="w-full h-48 sm:h-56 flex flex-col items-center justify-center text-center p-6 bg-[#FAF8FC] rounded-2xl border border-dashed border-[#EAE4F2]">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#EAE4F2] flex items-center justify-center text-[#7455A4] shadow-xs mb-2">
                <TrendingUp className="w-5 h-5 text-[#9275BC]" />
              </div>
              <p className="text-xs font-bold text-[#33283D]">No completed sales in this period</p>
              <p className="text-[11px] text-[#7A6F86] mt-0.5 max-w-xs">
                Appointments completed within this date range will appear on the performance chart.
              </p>
            </div>
          ) : (
            <div className="w-full overflow-hidden">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-48 sm:h-56 overflow-visible">
                <defs>
                  <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7455A4" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#7455A4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

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
                {primaryAreaPath && <path d={primaryAreaPath} fill="url(#purpleGradient)" />}

                {/* Secondary smooth line (Previous period comparison) */}
                {secondaryLinePath && (
                  <path
                    d={secondaryLinePath}
                    fill="none"
                    stroke="#91A68D"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity="0.65"
                  />
                )}

                {/* Primary smooth curve (royal purple) */}
                {primaryLinePath && (
                  <path
                    d={primaryLinePath}
                    fill="none"
                    stroke="#7455A4"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                )}

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

              {/* Floating Dark Tooltip Card showing real data of hovered point */}
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
                      {pointsPrimary[hoveredIndex].data.fullLabel}
                    </p>
                    <div className="space-y-0.5 text-[10px] text-white/80 pt-0.5">
                      <p className="flex items-center gap-1.5 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#91A68D]" />
                        <span>{pointsPrimary[hoveredIndex].data.bookings} Bookings</span>
                      </p>
                      <p className="flex items-center gap-1.5 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C9B8E2]" />
                        <span>{formatCurrency(pointsPrimary[hoveredIndex].data.revenue)}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* X-axis labels along bottom */}
          <div className="flex items-center justify-between px-4 pt-2 text-[11px] font-semibold text-[#7A6F86]">
            {visibleIndices.map((idx) => {
              const d = currentData[idx];
              if (!d) return null;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setHoveredIndex(idx)}
                  className={`hover:text-[#7455A4] transition-colors cursor-pointer ${
                    hoveredIndex === idx ? "text-[#7455A4] font-bold" : ""
                  }`}
                >
                  {d.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
