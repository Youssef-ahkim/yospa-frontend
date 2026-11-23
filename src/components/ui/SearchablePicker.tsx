"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

export interface SearchablePickerProps<T> {
  value: string | number | null;
  selectedItem?: T | null;
  onSelect: (item: T | null) => void;
  fetchOptions: (query: string) => Promise<T[]>;
  getId: (item: T) => string | number;
  renderItem: (item: T) => React.ReactNode;
  getDisplayValue: (item: T) => string;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  clearLabel?: string;
  error?: string;
  className?: string;
  required?: boolean;
}

export function SearchablePicker<T>({
  value,
  selectedItem,
  onSelect,
  fetchOptions,
  getId,
  renderItem,
  getDisplayValue,
  placeholder = "Search and select...",
  disabled = false,
  allowClear = false,
  clearLabel = "None",
  error,
  className = "",
  required = false,
}: SearchablePickerProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [options, setOptions] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const requestIdRef = useRef(0);

  // Fetch options with search query
  const loadOptions = useCallback(
    async (query: string) => {
      const currentRequestId = ++requestIdRef.current;
      setIsLoading(true);

      try {
        const results = await fetchOptions(query);
        if (currentRequestId === requestIdRef.current) {
          setOptions(results);
          setIsLoading(false);
        }
      } catch {
        if (currentRequestId === requestIdRef.current) {
          setOptions([]);
          setIsLoading(false);
        }
      }
    },
    [fetchOptions]
  );

  // When picker opens, load initial options
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Load initial options on picker open
      loadOptions("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen, loadOptions]);

  // Debounced search when user types (300ms)
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      loadOptions(q);
    }, 300);
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isOpen]);

  // Ensure the selectedItem is always present in displayed options even if not in results
  const displayedOptions = React.useMemo(() => {
    if (!selectedItem) return options;
    const selectedId = String(getId(selectedItem));
    const alreadyInOptions = options.some((opt) => String(getId(opt)) === selectedId);
    if (alreadyInOptions) {
      return options;
    }
    // Prepend currently selected item so it is always visible and selectable
    return [selectedItem, ...options];
  }, [options, selectedItem, getId]);

  const hasSelection = value !== null && value !== "" && value !== undefined;
  const displayLabel = selectedItem
    ? getDisplayValue(selectedItem)
    : hasSelection
    ? `Item #${value}`
    : placeholder;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 border rounded-xl shadow-xs text-sm text-left flex items-center justify-between gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          error
            ? "border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50"
            : isOpen
            ? "border-[#7455A4] ring-2 ring-[#7455A4] bg-white text-[#33283D]"
            : "border-[#EAE4F2] hover:border-[#C9B8E2] bg-white text-[#33283D]"
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span
          className={`truncate ${
            hasSelection ? "font-medium text-[#33283D]" : "text-[#7A6F86]/60"
          }`}
        >
          {displayLabel}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0 text-[#7A6F86]">
          {allowClear && hasSelection && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onSelect(null);
                }
              }}
              className="p-0.5 hover:text-[#33283D] rounded-full hover:bg-gray-100 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[#7455A4]" : ""
            }`}
          />
        </div>
      </button>

      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input
          tabIndex={-1}
          type="text"
          value={hasSelection ? String(value) : ""}
          required={required}
          onChange={() => {}}
          className="sr-only"
        />
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-[#EAE4F2] rounded-xl shadow-lg overflow-hidden animate-in fade-in-50 duration-100">
          {/* Search Input Box */}
          <div className="p-2 border-b border-[#EAE4F2] bg-[#FAF8FC]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#7A6F86] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Type to search..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-[#EAE4F2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7455A4] focus:border-[#7455A4] text-[#33283D] placeholder-[#7A6F86]/60"
              />
              {isLoading ? (
                <Spinner className="w-3.5 h-3.5 text-[#7455A4] absolute right-2.5 top-1/2 -translate-y-1/2" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7A6F86] hover:text-[#33283D] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-[#FAF8FC] p-1 text-xs">
            {allowClear && (
              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                  !hasSelection
                    ? "bg-[#F0EAF7] text-[#7455A4] font-semibold"
                    : "text-[#7A6F86] hover:bg-[#FAF8FC]"
                }`}
              >
                <span>{clearLabel}</span>
                {!hasSelection && <Check className="w-3.5 h-3.5 text-[#7455A4]" />}
              </button>
            )}

            {displayedOptions.map((opt) => {
              const optId = getId(opt);
              const isSelected = String(optId) === String(value);
              const isPinnedSelection =
                selectedItem &&
                String(getId(selectedItem)) === String(optId) &&
                !options.some((o) => String(getId(o)) === String(optId));

              return (
                <button
                  key={String(optId)}
                  type="button"
                  onClick={() => {
                    onSelect(opt);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? "bg-[#F0EAF7] text-[#7455A4] font-semibold"
                      : "text-[#33283D] hover:bg-[#FAF8FC]"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    {renderItem(opt)}
                    {isPinnedSelection && (
                      <span className="text-[10px] text-[#7455A4] font-normal block">
                        (Currently selected)
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[#7455A4] flex-shrink-0" />
                  )}
                </button>
              );
            })}

            {!isLoading && displayedOptions.length === 0 && (
              <div className="p-3 text-center text-xs text-[#7A6F86]">
                No matches found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
