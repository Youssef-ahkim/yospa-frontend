"use client";

import { useState, useMemo, Suspense, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/lib/permissions";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { CreateTicketSlideOver } from "@/components/tickets/CreateTicketSlideOver";
import { TicketDetailSlideOver } from "@/components/tickets/TicketDetailSlideOver";
import {
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  TICKET_CATEGORIES,
} from "@/types";
import {
  LifeBuoy,
  Plus,
  Search,
  X,
  MessageSquare,
  Clock,
  User as UserIcon,
  AlertCircle,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";

function TicketsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { canManageTickets, isStaff } = usePermissions();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  // URL state
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const perPageParam = parseInt(searchParams.get("per_page") || "25", 10);
  const searchParam = searchParams.get("search") || "";
  const statusFilter = (searchParams.get("status") as TicketStatus) || "";
  const priorityFilter = (searchParams.get("priority") as TicketPriority) || "";
  const categoryFilter = (searchParams.get("category") as TicketCategory) || "";

  const [searchInput, setSearchInput] = useState(searchParam);

  // Sync search input with URL searchParam
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync search input on URL searchParam navigation
    setSearchInput(searchParam);
  }, [searchParam]);

  const updateUrl = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val === null || val === "" || (key === "page" && val === 1)) {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (statusFilter) f.status = statusFilter;
    if (priorityFilter) f.priority = priorityFilter;
    if (categoryFilter) f.category = categoryFilter;
    return f;
  }, [statusFilter, priorityFilter, categoryFilter]);

  const {
    items: tickets,
    total,
    currentPage,
    lastPage,
    from,
    to,
    isLoading,
    isFetching,
    error,
    refresh,
    retry,
  } = usePaginatedList<Ticket>({
    endpoint: "/tickets",
    page: pageParam,
    perPage: perPageParam,
    search: searchInput,
    filters,
    enabled: !!user && canManageTickets,
  });

  if (authLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Access Guard: staff role forbidden
  if (!canManageTickets || isStaff) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white border border-[#EAE4F2] rounded-3xl text-center shadow-xs">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[#33283D] mb-2">Access Denied</h2>
        <p className="text-sm text-[#7A6F86] max-w-md mx-auto">
          Support tickets are managed by spa owners and administrators. Please reach out to your manager if you need support.
        </p>
      </div>
    );
  }

  const hasActiveFilters = Boolean(
    searchInput || statusFilter || priorityFilter || categoryFilter
  );

  const resetAllFilters = () => {
    setSearchInput("");
    updateUrl({
      search: null,
      status: null,
      priority: null,
      category: null,
      page: 1,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[#33283D] tracking-tight">
              Support Tickets
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0EAF7] text-[#7455A4] border border-[#C9B8E2]/60">
              {total} {total === 1 ? "ticket" : "tickets"}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#7A6F86]">
            Get help from the YoSpa platform engineering and operations team.
          </p>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#7455A4] hover:bg-[#5C3E8C] rounded-2xl transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Ticket</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-[#EAE4F2] rounded-2xl shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#A195AD] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                updateUrl({ search: e.target.value || null, page: 1 });
              }}
              placeholder="Search subject or description..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-[#EAE4F2] bg-white text-[#33283D] placeholder:text-[#A195AD] focus:outline-hidden focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4]"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput("");
                  updateUrl({ search: null, page: 1 });
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A195AD] hover:text-[#33283D]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                updateUrl({ status: e.target.value || null, page: 1 });
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE4F2] bg-white text-[#33283D] focus:outline-hidden focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4]"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => {
                updateUrl({ priority: e.target.value || null, page: 1 });
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE4F2] bg-white text-[#33283D] focus:outline-hidden focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4]"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                updateUrl({ category: e.target.value || null, page: 1 });
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE4F2] bg-white text-[#33283D] focus:outline-hidden focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4]"
            >
              <option value="">All Categories</option>
              {(Object.keys(TICKET_CATEGORIES) as TicketCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {TICKET_CATEGORIES[cat]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-[#FAF8FC] text-xs">
            <span className="text-[#7A6F86]">Active filters applied</span>
            <button
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1 text-[#7455A4] hover:text-[#5C3E8C] font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Ticket List View */}
      {error ? (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-rose-800">{error}</p>
          <button
            onClick={() => retry()}
            className="px-4 py-2 text-xs font-semibold text-rose-700 bg-white border border-rose-300 rounded-xl hover:bg-rose-50 cursor-pointer shadow-xs"
          >
            Retry Loading
          </button>
        </div>
      ) : isLoading ? (
        <div className="bg-white border border-[#EAE4F2] rounded-3xl p-12 flex flex-col items-center justify-center text-center">
          <Spinner size="lg" />
          <p className="mt-3 text-sm text-[#7A6F86]">Loading support tickets...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white border border-[#EAE4F2] rounded-3xl p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#F0EAF7] text-[#7455A4] flex items-center justify-center mx-auto mb-4 border border-[#C9B8E2]/60">
            <LifeBuoy className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#33283D] mb-1">
            {hasActiveFilters ? "No matching tickets found" : "No support tickets yet"}
          </h3>
          <p className="text-xs text-[#7A6F86] max-w-sm mx-auto mb-5">
            {hasActiveFilters
              ? "Try adjusting your search keywords or filter options."
              : "Need help or found a problem? Open a ticket to contact platform engineering."}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={resetAllFilters}
              className="px-4 py-2 text-xs font-semibold text-[#7455A4] bg-[#F0EAF7] hover:bg-[#E4D7F5] rounded-xl transition-colors cursor-pointer"
            >
              Clear filters
            </button>
          ) : (
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#7455A4] hover:bg-[#5C3E8C] rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Your First Ticket</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-[#EAE4F2] rounded-3xl overflow-hidden shadow-xs">
            <div className="divide-y divide-[#FAF8FC]">
              {tickets.map((ticket) => {
                const status = TICKET_STATUSES[ticket.status];
                const priority = TICKET_PRIORITIES[ticket.priority];
                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className="p-4 sm:p-5 hover:bg-[#FAF8FC] transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-[#33283D] group-hover:text-[#7455A4] transition-colors line-clamp-1">
                          {ticket.subject}
                        </span>

                        {status && (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${status.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                            {status.label}
                          </span>
                        )}

                        {priority && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${priority.badgeClass}`}
                          >
                            {priority.label}
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FAF8FC] text-[#7A6F86] border border-[#EAE4F2]">
                          {TICKET_CATEGORIES[ticket.category] || ticket.category}
                        </span>
                      </div>

                      <p className="text-xs text-[#7A6F86] line-clamp-1">
                        {ticket.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#A195AD] pt-1">
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          {ticket.creator?.name || "Spa User"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FAF8FC] border border-[#EAE4F2] text-xs font-semibold text-[#7A6F86]">
                        <MessageSquare className="w-3.5 h-3.5 text-[#7455A4]" />
                        <span>{ticket.messages_count ?? 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Pagination */}
          <Pagination
            currentPage={currentPage}
            lastPage={lastPage}
            total={total}
            perPage={perPageParam}
            from={from}
            to={to}
            onPageChange={(page) => updateUrl({ page })}
            onPerPageChange={(newPerPage) => updateUrl({ per_page: newPerPage, page: 1 })}
            disabled={isFetching}
          />
        </div>
      )}

      {/* Create Ticket Drawer */}
      <CreateTicketSlideOver
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => refresh()}
      />

      {/* Ticket Details & Conversation Drawer */}
      <TicketDetailSlideOver
        ticketId={selectedTicketId}
        open={selectedTicketId !== null}
        onClose={() => setSelectedTicketId(null)}
        onUpdated={() => refresh()}
      />
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <TicketsContent />
    </Suspense>
  );
}
