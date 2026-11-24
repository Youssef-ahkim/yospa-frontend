"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { formatCurrency } from "@/lib/currency";
import { ChevronDown, Check, TrendingUp, AlertCircle, RotateCcw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { SalesReportData, SalesReportRange, SalesBucket } from "@/types";

export type MetricType = "revenue" | "bookings";

interface SalesChartProps {
  range: SalesReportRange;
  onRangeChange: (range: SalesReportRange) => void;
  canSeeRevenue: boolean;
}

export function SalesChart({ range, onRangeChange, canSeeRevenue }: SalesChartProps) {
  const [metricType, setMetricType] = useState<MetricType>("revenue");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showMetricDropdown, setShowMetricDropdown] = useState(false);

  const [data, setData] = useState<SalesReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  // Fetch sales report when range changes, with stale-response guard
  const fetchReport = useCallback(async (r: SalesReportRange) => {
    const currentReq = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<SalesReportData>(`/dashboard/sales-report?range=${r}`);
      if (currentReq === requestIdRef.current) {
        setData(res);
        setIsLoading(false);
      }
    } catch (err: unknown) {
      if (currentReq === requestIdRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load sales report.");
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch sales report when range changes
    fetchReport(range);
  }, [range, fetchReport]);

  // Process buckets: identify future buckets
  const processedBuckets = useMemo(() => {
    if (!data?.buckets) return [];
    return data.buckets.map((b: SalesBucket) => ({
      ...b,
      isFuture:
        data.range === "1d" &&
        Boolean(data.now) &&
        Boolean(data.now && b.start > data.now),
    }));
  }, [data]);

  // Non-future buckets
  const nonFutureBuckets = useMemo(() => {
    return processedBuckets.filter((b) => !b.isFuture);
  }, [processedBuckets]);

  // Active totals excluding future buckets
  const activeTotals = useMemo(() => {
    if (!data) return { revenue: null, bookings: 0, completed_count: 0 };
    const validRev = canSeeRevenue
      ? nonFutureBuckets.reduce((acc, b) => acc + (b.revenue ?? 0), 0)
      : null;
    const validBookings = nonFutureBuckets.reduce((acc, b) => acc + b.bookings, 0);
    const validCompleted = nonFutureBuckets.reduce((acc, b) => acc + b.completed_count, 0);
    return {
      revenue: validRev,
      bookings: validBookings,
      completed_count: validCompleted,
    };
  }, [data, nonFutureBuckets, canSeeRevenue]);

  const isEmpty =
    activeTotals.bookings === 0 &&
    (activeTotals.revenue === null || activeTotals.revenue === 0);

  // Active metric: force bookings for staff
  const effectiveMetric: MetricType = canSeeRevenue ? metricType : "bookings";

  // SVG dimensions & curve generation
  const svgWidth = 640;
  const svgHeight = 220;
  const paddingX = 24;
  const paddingY = 24;

  const maxVal = useMemo(() => {
    const vals = nonFutureBuckets.map((d) =>
      effectiveMetric === "revenue" ? (d.revenue ?? 0) : d.bookings
    );
    const highest = Math.max(...vals, 0);
    return highest > 0 ? highest * 1.15 : 100;
  }, [nonFutureBuckets, effectiveMetric]);

  // Points for all buckets along the X-axis
  const bucketPoints = useMemo(() => {
    const len = processedBuckets.length;
    if (len === 0) return [];
    const stepX = len > 1 ? (svgWidth - paddingX * 2) / (len - 1) : 0;

    return processedBuckets.map((d, i) => {
      const x = len === 1 ? svgWidth / 2 : paddingX + i * stepX;
      const val = effectiveMetric === "revenue" ? (d.revenue ?? 0) : d.bookings;
      const y = svgHeight - paddingY - (val / maxVal) * (svgHeight - paddingY * 2);
      return { x, y, data: d, isFuture: d.isFuture };
    });
  }, [processedBuckets, effectiveMetric, maxVal]);

  // Only non-future points form the primary curve
  const nonFuturePoints = useMemo(() => {
    return bucketPoints.filter((pt) => !pt.isFuture);
  }, [bucketPoints]);

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

  const primaryLinePath = useMemo(() => createSplinePath(nonFuturePoints), [nonFuturePoints]);

  const primaryAreaPath = useMemo(() => {
    if (!nonFuturePoints.length) return "";
    if (nonFuturePoints.length === 1) return "";
    const first = nonFuturePoints[0];
    const last = nonFuturePoints[nonFuturePoints.length - 1];
    return `${primaryLinePath} L ${last.x} ${svgHeight - paddingY} L ${first.x} ${svgHeight - paddingY} Z`;
  }, [primaryLinePath, nonFuturePoints]);

  // Visible bottom label indices
  const visibleIndices = useMemo(() => {
    const len = processedBuckets.length;
    if (len === 0) return [];
    if (len <= 7) return Array.from({ length: len }, (_, i) => i);
    if (range === "1d") {
      return [0, 4, 8, 12, 16, 20, 23].filter((i) => i < len);
    }
    if (range === "30d") {
      return [0, 5, 10, 15, 20, 25, len - 1].filter((i) => i < len);
    }
    if (len <= 12) return Array.from({ length: len }, (_, i) => i);
    const step = Math.ceil(len / 8);
    const indices: number[] = [];
    for (let i = 0; i < len; i += step) indices.push(i);
    if (indices[indices.length - 1] !== len - 1) indices.push(len - 1);
    return indices;
  }, [processedBuckets.length, range]);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EAE4F2] shadow-xs space-y-6">
      {/* Top Report Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#33283D]">Your sales report</h2>
          <p className="text-xs text-[#7A6F86] mt-0.5">
            {canSeeRevenue
              ? "Look at your revenue and appointments"
              : "Look at your appointment bookings"}
          </p>
        </div>

        {/* Metric Dropdown Selector (Owner / Admin only) */}
        {canSeeRevenue ? (
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
                    metricType === "revenue"
                      ? "text-[#7455A4] bg-[#F0EAF7]"
                      : "text-[#33283D] hover:bg-[#FAF8FC]"
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
                    metricType === "bookings"
                      ? "text-[#7455A4] bg-[#F0EAF7]"
                      : "text-[#33283D] hover:bg-[#FAF8FC]"
                  }`}
                >
                  <span>Total Bookings</span>
                  {metricType === "bookings" && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        ) : (
          <span className="inline-flex items-center px-3 py-1 bg-[#FAF8FC] border border-[#EAE4F2] rounded-xl text-xs font-semibold text-[#7A6F86]">
            Total Bookings
          </span>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end animate-pulse">
          <div className="lg:col-span-4 space-y-5">
            <div className="space-y-2">
              <div className="h-9 w-44 bg-gray-200 rounded-xl" />
              <div className="h-4 w-28 bg-gray-100 rounded-lg" />
            </div>
            <div className="flex gap-1.5 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 w-11 bg-gray-200 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-8 h-48 sm:h-56 bg-gray-50 rounded-2xl border border-gray-100" />
        </div>
      ) : error ? (
        /* Error State with Retry */
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <p className="text-xs font-medium text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => fetchReport(range)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      ) : (
        /* Amount + Range Switcher and Chart Visual */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          {/* Left Column: Big Amount & Range Buttons */}
          <div className="lg:col-span-4 space-y-5">
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-[#33283D] tracking-tight">
                {effectiveMetric === "revenue"
                  ? formatCurrency(activeTotals.revenue ?? 0)
                  : `${activeTotals.bookings} Bookings`}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] text-[#7A6F86]">
                  {range === "1d"
                    ? "Today so far"
                    : range === "7d"
                    ? "Last 7 days"
                    : range === "30d"
                    ? "Last 30 days"
                    : "Last 12 months"}
                </span>
              </div>
            </div>

            {/* Time period filter pills (1d, 7d, 30d, 12m) */}
            <div className="flex items-center gap-1.5 pt-2">
              {(
                [
                  { id: "1d", label: "1d" },
                  { id: "7d", label: "7d" },
                  { id: "30d", label: "30d" },
                  { id: "12m", label: "12m" },
                ] as const
              ).map((p) => {
                const isActive = range === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onRangeChange(p.id);
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
                <p className="text-xs font-bold text-[#33283D]">
                  {canSeeRevenue
                    ? "No completed sales in this period"
                    : "No bookings recorded in this period"}
                </p>
                <p className="text-[11px] text-[#7A6F86] mt-0.5 max-w-xs">
                  Appointments within this date range will appear on the performance chart.
                </p>
              </div>
            ) : (
              <div className="w-full overflow-hidden">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-48 sm:h-56 overflow-visible"
                >
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

                  {/* Interactive Points on Primary Curve for non-future buckets */}
                  {nonFuturePoints.map((pt, idx) => {
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
                {hoveredIndex !== null && nonFuturePoints[hoveredIndex] && (
                  <div
                    className="absolute z-10 pointer-events-none transition-all duration-150 transform -translate-x-1/2 -translate-y-full mb-3"
                    style={{
                      left: `${(nonFuturePoints[hoveredIndex].x / svgWidth) * 100}%`,
                      top: `${(nonFuturePoints[hoveredIndex].y / svgHeight) * 100 - 8}%`,
                    }}
                  >
                    <div className="bg-[#33283D] text-white p-3 rounded-2xl shadow-xl text-left border border-white/10 min-w-[130px] space-y-1">
                      <p className="text-[11px] font-bold text-white border-b border-white/10 pb-1">
                        {nonFuturePoints[hoveredIndex].data.label}
                      </p>
                      <div className="space-y-0.5 text-[10px] text-white/80 pt-0.5">
                        <p className="flex items-center gap-1.5 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#91A68D]" />
                          <span>{nonFuturePoints[hoveredIndex].data.bookings} Bookings</span>
                        </p>
                        {canSeeRevenue && nonFuturePoints[hoveredIndex].data.revenue !== null && (
                          <p className="flex items-center gap-1.5 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C9B8E2]" />
                            <span>
                              {formatCurrency(nonFuturePoints[hoveredIndex].data.revenue ?? 0)}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* X-axis labels along bottom */}
            <div className="flex items-center justify-between px-4 pt-2 text-[11px] font-semibold text-[#7A6F86]">
              {visibleIndices.map((idx) => {
                const d = processedBuckets[idx];
                if (!d) return null;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (!d.isFuture) {
                        const targetIdx = nonFuturePoints.findIndex(
                          (p) => p.data.start === d.start
                        );
                        if (targetIdx !== -1) setHoveredIndex(targetIdx);
                      }
                    }}
                    disabled={d.isFuture}
                    className={`transition-colors ${
                      d.isFuture
                        ? "text-[#7A6F86]/35 cursor-default"
                        : "hover:text-[#7455A4] cursor-pointer"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
