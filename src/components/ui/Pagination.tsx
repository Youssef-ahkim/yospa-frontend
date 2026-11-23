"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
  from?: number | null;
  to?: number | null;
  onPageChange: (newPage: number) => void;
  onPerPageChange?: (newPerPage: number) => void;
  perPageOptions?: number[];
  disabled?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  lastPage,
  total,
  perPage,
  from,
  to,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 25, 50],
  disabled = false,
  className = "",
}: PaginationProps) {
  if (total <= 0) return null;

  const safeLastPage = Math.max(1, lastPage);
  const hasFromTo = from != null && to != null;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border border-[#EAE4F2] rounded-2xl shadow-xs text-xs text-[#7A6F86] ${className}`}
    >
      {/* Left section: Counts and Per-page select */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <div>
          {hasFromTo ? (
            <span>
              Showing <strong className="text-[#33283D] font-semibold">{from}</strong>-
              <strong className="text-[#33283D] font-semibold">{to}</strong> of{" "}
              <strong className="text-[#33283D] font-semibold">{total}</strong>
            </span>
          ) : (
            <span>
              Total: <strong className="text-[#33283D] font-semibold">{total}</strong>
            </span>
          )}
        </div>

        {onPerPageChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-[#EAE4F2]">
            <label htmlFor="per-page-select" className="text-[11px] text-[#7A6F86]">
              Per page:
            </label>
            <select
              id="per-page-select"
              value={perPage}
              disabled={disabled}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              className="py-1 px-2 border border-[#EAE4F2] rounded-lg bg-white text-[#33283D] font-medium text-xs focus:outline-none focus:ring-1 focus:ring-[#7455A4] cursor-pointer disabled:opacity-50"
            >
              {perPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right section: Prev, Page indicator, Next */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
        <button
          type="button"
          disabled={disabled || currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#EAE4F2] bg-white font-medium text-xs text-[#33283D] hover:bg-[#FAF8FC] hover:border-[#C9B8E2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer min-h-[36px]"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev</span>
        </button>

        <span className="px-2 text-xs font-semibold text-[#33283D] whitespace-nowrap">
          Page {currentPage} of {safeLastPage}
        </span>

        <button
          type="button"
          disabled={disabled || currentPage >= safeLastPage}
          onClick={() => onPageChange(currentPage + 1)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#EAE4F2] bg-white font-medium text-xs text-[#33283D] hover:bg-[#FAF8FC] hover:border-[#C9B8E2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer min-h-[36px]"
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
