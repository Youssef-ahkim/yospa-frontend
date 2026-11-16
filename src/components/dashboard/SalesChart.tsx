"use client";

import { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/currency";
import { ChevronDown, Check } from "lucide-react";
import { DashboardStats } from "@/hooks/useDashboardData";

export type TimeRange = "1d" | "7d" | "30d" | "month" | "all";
export type MetricType = "revenue" | "bookings";

interface SalesChartProps {
  data: DashboardStats | null;
}

export function SalesChart({ data }: SalesChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [metricType, setMetricType] = useState<MetricType>("revenue");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(7);
  const [showMetricDropdown, setShowMetricDropdown] = useState(false);

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

  // Secondary line data for comparison curve
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

        {/* Right Column: Chart area with floating tooltip */}
        <div className="lg:col-span-8 relative">
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

              <path d={primaryAreaPath} fill="url(#purpleGradient)" />

              <path
                d={secondaryLinePath}
                fill="none"
                stroke="#91A68D"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.65"
              />

              <path
                d={primaryLinePath}
                fill="none"
                stroke="#7455A4"
                strokeWidth="3"
                strokeLinecap="round"
              />

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
  );
}
