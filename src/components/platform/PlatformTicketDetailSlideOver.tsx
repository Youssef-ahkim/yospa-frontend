"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { SlideOver } from "@/components/ui/SlideOver";
import { Spinner } from "@/components/ui/Spinner";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import {
  Ticket,
  TicketMessage,
  TicketStatus,
  TicketPriority,
  TICKET_CATEGORIES,
} from "@/types";
import {
  LifeBuoy,
  Send,
  ShieldCheck,
  Building2,
  AlertTriangle,
  Save,
} from "lucide-react";

interface PlatformTicketDetailSlideOverProps {
  ticketId: number | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function PlatformTicketDetailSlideOver({
  ticketId,
  open,
  onClose,
  onUpdated,
}: PlatformTicketDetailSlideOverProps) {
  const toast = useToast();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusVal, setStatusVal] = useState<TicketStatus>("open");
  const [priorityVal, setPriorityVal] = useState<TicketPriority>("medium");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Ticket>(`/platform/tickets/${id}`);
      setTicket(data);
      setStatusVal(data.status);
      setPriorityVal(data.priority);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ticket.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && ticketId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- load ticket on drawer open
      fetchTicket(ticketId);
    } else {
      setTicket(null);
      setReplyBody("");
      setError(null);
    }
  }, [open, ticketId, fetchTicket]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleUpdateAttributes = async () => {
    if (!ticketId) return;

    setUpdatingStatus(true);
    try {
      const res = await apiFetch<{ message: string; ticket: Ticket }>(
        `/platform/tickets/${ticketId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: statusVal,
            priority: priorityVal,
          }),
        }
      );

      toast.success("Ticket updated successfully.");
      setTicket((prev) => (prev ? { ...prev, ...res.ticket } : res.ticket));
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update ticket.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId || !replyBody.trim()) return;

    setSendingReply(true);
    try {
      const res = await apiFetch<{
        message: string;
        ticket_message: TicketMessage;
        ticket: Ticket;
      }>(`/platform/tickets/${ticketId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: replyBody.trim() }),
      });

      toast.success("Platform reply sent.");
      setReplyBody("");

      setTicket((prev) => {
        if (!prev) return res.ticket;
        const currentMessages = prev.messages || [];
        return {
          ...prev,
          ...res.ticket,
          messages: [...currentMessages, res.ticket_message],
          messages_count: (prev.messages_count ?? currentMessages.length) + 1,
        };
      });

      setStatusVal(res.ticket.status);
      onUpdated();
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reply.");
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={ticket ? ticket.subject : "Ticket Review"}
      description={
        ticket
          ? `Spa: ${ticket.spa?.name || "Unknown Spa"} | Submitter: ${
              ticket.creator?.name || "User"
            }`
          : "Loading..."
      }
      icon={<LifeBuoy className="w-5 h-5 text-[#7455A4]" />}
      width="max-w-2xl"
      footer={
        <div className="flex items-center justify-end w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#7A6F86] hover:text-[#33283D] bg-white border border-[#EAE4F2] rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      }
    >
      {loading && !ticket ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <Spinner size="lg" />
          <p className="mt-3 text-sm text-[#7A6F86]">Loading ticket details...</p>
        </div>
      ) : error ? (
        <div className="py-12 px-4 bg-rose-50 border border-rose-200 rounded-2xl text-center">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-rose-800">{error}</p>
          <button
            onClick={() => ticketId && fetchTicket(ticketId)}
            className="mt-3 px-3.5 py-1.5 text-xs font-medium text-rose-700 bg-white border border-rose-300 rounded-lg shadow-2xs hover:bg-rose-50"
          >
            Retry
          </button>
        </div>
      ) : ticket ? (
        <div className="space-y-5">
          {/* Spa & Submitter Info Card */}
          <div className="p-4 bg-[#FAF8FC] border border-[#EAE4F2] rounded-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#7455A4]" />
                <span className="text-xs font-bold text-[#33283D]">
                  {ticket.spa?.name}
                </span>
                <span className="text-[11px] text-[#A195AD]">
                  ({ticket.spa?.slug})
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-[#7455A4] border border-[#C9B8E2]/60">
                {TICKET_CATEGORIES[ticket.category] || ticket.category}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#7A6F86] pt-1 border-t border-[#FAF8FC]">
              <span>
                Creator: <strong>{ticket.creator?.name}</strong> ({ticket.creator?.email})
              </span>
              <span>
                Created: {new Date(ticket.created_at).toLocaleString()}
              </span>
              {ticket.resolved_at && (
                <span className="text-emerald-700 font-medium">
                  Resolved: {new Date(ticket.resolved_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Quick Updater Toolbar */}
          <div className="p-3.5 bg-white border border-[#EAE4F2] rounded-2xl shadow-xs space-y-2">
            <div className="text-xs font-bold text-[#33283D] uppercase tracking-wider">
              Ticket Controls
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
              <div>
                <label className="block text-[11px] font-medium text-[#7A6F86] mb-1">
                  Status
                </label>
                <select
                  value={statusVal}
                  onChange={(e) => setStatusVal(e.target.value as TicketStatus)}
                  disabled={updatingStatus}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[#EAE4F2] bg-white text-[#33283D] focus:outline-hidden focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4]"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#7A6F86] mb-1">
                  Priority
                </label>
                <select
                  value={priorityVal}
                  onChange={(e) => setPriorityVal(e.target.value as TicketPriority)}
                  disabled={updatingStatus}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[#EAE4F2] bg-white text-[#33283D] focus:outline-hidden focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="sm:self-end">
                <button
                  type="button"
                  onClick={handleUpdateAttributes}
                  disabled={
                    updatingStatus ||
                    (statusVal === ticket.status && priorityVal === ticket.priority)
                  }
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#7455A4] hover:bg-[#5C3E8C] rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-40"
                >
                  {updatingStatus ? <Spinner size="sm" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>

          {/* Conversation Thread */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A6F86]">
              Thread History
            </h3>

            {/* Initial description */}
            <div className="p-4 rounded-2xl bg-white border border-[#EAE4F2] shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs text-[#7A6F86]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#F0EAF7] flex items-center justify-center text-[#7455A4] font-bold text-[10px]">
                    {ticket.creator?.name?.slice(0, 2).toUpperCase() || "OP"}
                  </div>
                  <span className="font-semibold text-[#33283D]">
                    {ticket.creator?.name || "Submitter"}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-sm bg-gray-100 text-[10px] text-gray-600 uppercase">
                    Spa {ticket.creator?.role || "User"}
                  </span>
                </div>
                <span className="text-[11px]">
                  {new Date(ticket.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-[#33283D] whitespace-pre-wrap leading-relaxed pt-1">
                {ticket.description}
              </p>
            </div>

            {/* Replies */}
            {ticket.messages && ticket.messages.length > 0 ? (
              ticket.messages.map((msg) => {
                const isPlatform = msg.is_platform_reply;
                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-2xl shadow-2xs space-y-2 transition-all ${
                      isPlatform
                        ? "bg-[#FAF7FD] border border-[#C9B8E2] ring-1 ring-[#7455A4]/10"
                        : "bg-white border border-[#EAE4F2]"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-[#7A6F86]">
                      <div className="flex items-center gap-2">
                        {isPlatform ? (
                          <>
                            <div className="w-6 h-6 rounded-full bg-[#7455A4] flex items-center justify-center text-white">
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-bold text-[#7455A4]">
                              Platform Support (You)
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="w-6 h-6 rounded-full bg-[#F0EAF7] flex items-center justify-center text-[#7455A4] font-bold text-[10px]">
                              {msg.user?.name?.slice(0, 2).toUpperCase() || "U"}
                            </div>
                            <span className="font-semibold text-[#33283D]">
                              {msg.user?.name || "Spa User"}
                            </span>
                            {msg.user?.role && (
                              <span className="px-1.5 py-0.5 rounded-sm bg-gray-100 text-[10px] text-gray-600 uppercase">
                                {msg.user.role}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <span className="text-[11px]">
                        {msg.created_at
                          ? new Date(msg.created_at).toLocaleString()
                          : "Just now"}
                      </span>
                    </div>

                    <p className="text-sm text-[#33283D] whitespace-pre-wrap leading-relaxed pt-1">
                      {msg.body}
                    </p>
                  </div>
                );
              })
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          {/* Platform Reply Form */}
          <div className="pt-5 border-t border-[#EAE4F2]">
            <form onSubmit={handleSendReply} className="space-y-3">
              <label
                htmlFor="platform-reply-box"
                className="block text-xs font-semibold text-[#33283D]"
              >
                Reply to Spa (as Platform Support)
              </label>
              <textarea
                id="platform-reply-box"
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={3}
                placeholder="Type resolution instructions, follow-up questions, or status updates..."
                maxLength={5000}
                disabled={sendingReply}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#EAE4F2] bg-white text-[#33283D] placeholder:text-[#A195AD] focus:outline-hidden focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4] resize-y"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#A195AD]">
                  Replying will mark open tickets as &ldquo;In Progress&rdquo; automatically.
                </span>
                <button
                  type="submit"
                  disabled={sendingReply || !replyBody.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#7455A4] hover:bg-[#5C3E8C] rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {sendingReply ? <Spinner size="sm" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Reply to Spa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </SlideOver>
  );
}
