"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { PlatformAuditLog } from "@/types";
import {
  ShieldAlert,
  Search,
  X,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

type ActionFilter = "all" | "spa" | "user";

function formatActionBadge(action: string) {
  let badgeClass = "bg-gray-100 text-gray-700 border-gray-200";
  let dotClass = "bg-gray-400";

  if (action === "spa.create") {
    badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
    dotClass = "bg-emerald-500";
  } else if (action === "spa.update") {
    badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
    dotClass = "bg-amber-500";
  } else if (action === "spa.delete") {
    badgeClass = "bg-red-50 text-red-700 border-red-200";
    dotClass = "bg-red-500";
  } else if (action === "user.create") {
    badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
    dotClass = "bg-blue-500";
  } else if (action === "user.update") {
    badgeClass = "bg-purple-50 text-purple-700 border-purple-200";
    dotClass = "bg-[#7455A4]";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      {action}
    </span>
  );
}

function formatMeta(meta?: Record<string, unknown> | null) {
  if (!meta || Object.keys(meta).length === 0) {
    return <span className="text-[#9275BC] italic text-[11px]">No extra details</span>;
  }

  const entries = Object.entries(meta);
  return (
    <div className="flex flex-wrap gap-1.5 max-w-md">
      {entries.map(([key, val]) => {
        let displayVal = String(val);
        if (typeof val === "object" && val !== null) {
          displayVal = JSON.stringify(val);
        } else if (typeof val === "boolean") {
          displayVal = val ? "true" : "false";
        }
        return (
          <span
            key={key}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FAF8FC] border border-[#EAE4F2] text-[10px] text-[#33283D] font-mono"
          >
            <span className="text-[#7A6F86]">{key}:</span>
            <span className="font-semibold text-[#7455A4] truncate max-w-[140px]">{displayVal}</span>
          </span>
        );
      })}
    </div>
  );
}

export default function PlatformAuditPage() {
  const [logs, setLogs] = useState<PlatformAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");

  const reqIdRef = useRef(0);

  const fetchLogs = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch<PlatformAuditLog[]>("/platform/audit?limit=50");
      if (reqId === reqIdRef.current) {
        setLogs(data);
      }
    } catch (err: unknown) {
      if (reqId === reqIdRef.current) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load platform audit logs.");
        }
      }
    } finally {
      if (reqId === reqIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch logs on mount
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    const q = search.toLowerCase().trim();
    return logs.filter((log) => {
      // Filter by category
      if (actionFilter === "spa" && !log.action.startsWith("spa.")) {
        return false;
      }
      if (actionFilter === "user" && !log.action.startsWith("user.")) {
        return false;
      }

      // Filter by text search
      if (!q) return true;

      const actorMatch =
        log.actor?.name?.toLowerCase().includes(q) ||
        log.actor?.email?.toLowerCase().includes(q);
      const actionMatch = log.action.toLowerCase().includes(q);
      const spaMatch =
        log.spa?.name?.toLowerCase().includes(q) ||
        log.spa?.slug?.toLowerCase().includes(q);
      const ipMatch = log.ip?.toLowerCase().includes(q);
      const metaMatch = log.meta ? JSON.stringify(log.meta).toLowerCase().includes(q) : false;

      return actorMatch || actionMatch || spaMatch || ipMatch || metaMatch;
    });
  }, [logs, search, actionFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#1A1626] tracking-tight">Platform Audit Logs</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-[#7455A4] border border-[#C9B8E2]/50">
              Security Trail
            </span>
          </div>
          <p className="text-sm text-[#7A6F86] mt-0.5">
            Immutable audit record of administrative actions, spa provisioning, and user alterations (latest 50 events)
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={isLoading}
          aria-label="Refresh audit logs"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#EAE4F2] text-[#33283D] hover:bg-[#FAF8FC] transition-colors cursor-pointer min-h-[40px] self-start sm:self-auto shadow-2xs"
        >
          <RotateCcw size={14} className={isLoading ? "animate-spin text-[#7455A4]" : "text-[#7A6F86]"} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#EAE4F2] rounded-2xl p-4 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9275BC] w-4 h-4 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter logs by actor, action, spa, IP..."
            className="w-full pl-10 pr-10 py-2 bg-[#FAF8FC] border border-[#EAE4F2] rounded-xl text-xs sm:text-sm text-[#1A1626] placeholder-[#9275BC]/70 focus:outline-none focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4] transition-all min-h-[40px]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9275BC] hover:text-[#33283D] p-1 rounded-lg hover:bg-[#F0EAF7] transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-[#FAF8FC] p-1 rounded-xl border border-[#EAE4F2] self-start sm:self-auto">
          {[
            { label: "All Events", value: "all" },
            { label: "Spa Events", value: "spa" },
            { label: "User Events", value: "user" },
          ].map((tab) => {
            const isSelected = actionFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActionFilter(tab.value as ActionFilter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[36px] ${
                  isSelected
                    ? "bg-white text-[#7455A4] shadow-xs border border-[#C9B8E2]/60"
                    : "text-[#7A6F86] hover:text-[#33283D] hover:bg-white/50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Logs Table / Cards */}
      {error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Error loading audit logs</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors cursor-pointer min-h-[40px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      ) : isLoading ? (
        <div className="bg-white border border-[#EAE4F2] rounded-2xl shadow-sm p-6 space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-[#FAF8FC] last:border-none">
              <div className="space-y-1.5">
                <div className="h-4 bg-gray-100 rounded w-36 animate-pulse" />
                <div className="h-3 bg-gray-100 rounded w-24 animate-pulse" />
              </div>
              <div className="h-6 bg-gray-100 rounded-full w-24 animate-pulse" />
              <div className="h-4 bg-gray-100 rounded w-48 animate-pulse hidden md:block" />
            </div>
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white border border-[#EAE4F2] rounded-2xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#7455A4] flex items-center justify-center mx-auto mb-3">
            <ShieldAlert size={24} />
          </div>
          <h2 className="text-base font-semibold text-[#1A1626]">No Audit Logs Found</h2>
          <p className="text-xs text-[#7A6F86] mt-1 max-w-sm mx-auto">
            {search || actionFilter !== "all"
              ? "No events match your search or filter criteria."
              : "No administrative audit events have been recorded yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#EAE4F2] rounded-2xl shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8FC] border-b border-[#EAE4F2] text-[#7A6F86] font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">Action</th>
                  <th className="px-4 py-3.5">Actor</th>
                  <th className="px-4 py-3.5">Target / Subject</th>
                  <th className="px-6 py-3.5">Meta Changes</th>
                  <th className="px-4 py-3.5 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE4F2]/60">
                {filteredLogs.map((log) => {
                  const dateFormatted = log.created_at
                    ? new Date(log.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "—";

                  const targetLabel = log.spa
                    ? `${log.spa.name} (/${log.spa.slug})`
                    : log.subject_type === "spa" && log.meta?.deleted_spa_name
                    ? String(log.meta.deleted_spa_name)
                    : log.subject_type === "user" && log.meta?.email
                    ? String(log.meta.email)
                    : `${log.subject_type} #${log.subject_id ?? "—"}`;

                  return (
                    <tr key={log.id} className="hover:bg-[#FAF8FC]/70 transition-colors">
                      <td className="px-6 py-3.5 whitespace-nowrap text-[#7A6F86] font-mono text-[11px]">
                        {dateFormatted}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {formatActionBadge(log.action)}
                      </td>

                      <td className="px-4 py-3.5">
                        {log.actor ? (
                          <div>
                            <div className="font-semibold text-[#1A1626]">{log.actor.name}</div>
                            <div className="text-[10px] text-[#7A6F86] font-mono">{log.actor.email}</div>
                          </div>
                        ) : (
                          <span className="text-[#9275BC] italic text-[11px]">System / Background</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 max-w-[200px]">
                        <div className="font-medium text-[#1A1626] truncate" title={targetLabel}>
                          {targetLabel}
                        </div>
                        <div className="text-[10px] text-[#9275BC] uppercase tracking-wider">
                          {log.subject_type}
                        </div>
                      </td>

                      <td className="px-6 py-3.5">{formatMeta(log.meta)}</td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap font-mono text-[11px] text-[#7A6F86]">
                        {log.ip || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-[#EAE4F2]/70">
            {filteredLogs.map((log) => {
              const dateFormatted = log.created_at
                ? new Date(log.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—";

              const targetLabel = log.spa
                ? `${log.spa.name} (/${log.spa.slug})`
                : log.subject_type === "spa" && log.meta?.deleted_spa_name
                ? String(log.meta.deleted_spa_name)
                : log.subject_type === "user" && log.meta?.email
                ? String(log.meta.email)
                : `${log.subject_type} #${log.subject_id ?? "—"}`;

              return (
                <div key={log.id} className="p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    {formatActionBadge(log.action)}
                    <span className="text-[10px] font-mono text-[#9275BC]">{dateFormatted}</span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[#7A6F86]">Actor: </span>
                      <span className="font-semibold text-[#1A1626]">
                        {log.actor?.name || "System"}
                      </span>
                    </div>
                    {log.ip && (
                      <span className="text-[10px] font-mono text-[#7A6F86] bg-[#FAF8FC] px-1.5 py-0.5 rounded border border-[#EAE4F2]">
                        {log.ip}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[#7A6F86]">Target: </span>
                    <span className="font-medium text-[#1A1626] font-mono text-[11px]">{targetLabel}</span>
                  </div>

                  <div>{formatMeta(log.meta)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
