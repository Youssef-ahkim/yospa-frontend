"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { Paginated } from "@/types";

export interface UsePaginatedListOptions<F extends Record<string, unknown> = Record<string, unknown>> {
  endpoint: string;
  page?: number;
  perPage?: number;
  search?: string;
  filters?: F;
  sort?: string;
  direction?: "asc" | "desc";
  debounceMs?: number;
  enabled?: boolean;
}

export interface UsePaginatedListResult<T> {
  data: Paginated<T> | null;
  items: T[];
  total: number;
  currentPage: number;
  lastPage: number;
  perPage: number;
  from: number | null;
  to: number | null;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  isEmpty: boolean;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<Paginated<T> | null>>;
}

export function usePaginatedList<T, F extends Record<string, unknown> = Record<string, unknown>>({
  endpoint,
  page = 1,
  perPage = 25,
  search = "",
  filters,
  sort,
  direction,
  debounceMs = 300,
  enabled = true,
}: UsePaginatedListOptions<F>): UsePaginatedListResult<T> {
  const [data, setData] = useState<Paginated<T> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 300ms debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [search, debounceMs]);

  // Stale-response guard counter
  const requestIdRef = useRef(0);

  // Stable filters representation for dependency checking
  const filtersKey = useMemo(() => {
    if (!filters) return "";
    return JSON.stringify(filters);
  }, [filters]);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    const currentRequestId = ++requestIdRef.current;
    setIsFetching(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("per_page", String(perPage));

      if (debouncedSearch && debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      }
      if (sort) {
        params.set("sort", sort);
      }
      if (direction) {
        params.set("direction", direction);
      }
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (value !== undefined && value !== null && value !== "" && value !== "all") {
            params.set(key, String(value));
          }
        }
      }

      const queryString = params.toString();
      const url = `${endpoint}${queryString ? `?${queryString}` : ""}`;
      const result = await apiFetch<Paginated<T>>(url);

      // Stale-response guard: ignore out-of-order responses
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      setData(result);
      setIsLoading(false);
      setIsFetching(false);
    } catch (err: unknown) {
      if (currentRequestId !== requestIdRef.current) {
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to load list.";
      setError(message);
      setIsLoading(false);
      setIsFetching(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, page, perPage, debouncedSearch, sort, direction, filtersKey, enabled]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch paginated list when query parameters change
    fetchData();
  }, [fetchData]);

  const items = useMemo(() => data?.data ?? [], [data]);
  const total = data?.total ?? 0;
  const currentPage = data?.current_page ?? page;
  const lastPage = data?.last_page ?? 1;
  const from = data?.from ?? null;
  const to = data?.to ?? null;
  const isEmpty = !isLoading && !error && items.length === 0;

  return {
    data,
    items,
    total,
    currentPage,
    lastPage,
    perPage: data?.per_page ?? perPage,
    from,
    to,
    isLoading,
    isFetching,
    error,
    isEmpty,
    refresh: fetchData,
    retry: fetchData,
    setData,
  };
}
