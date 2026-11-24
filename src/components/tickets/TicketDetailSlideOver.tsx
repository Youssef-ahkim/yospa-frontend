"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { SlideOver } from "@/components/ui/SlideOver";
import { Spinner } from "@/components/ui/Spinner";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import {
  Ticket,
  TicketMessage,
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  TICKET_CATEGORIES,
} from "@/types";
import {
  LifeBuoy,
  Send,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface TicketDetailSlideOverProps {
  ticketId: number | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function TicketDetailSlideOver({
  ticketId,
  open,
  onClose,
  onUpdated,
}: TicketDetailSlideOverProps) {
  const toast = useToast();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Ticket>(`/tickets/${id}`);
      setTicket(data);
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

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId || !replyBody.trim()) return;

    setSending(true);
    try {
      const res = await apiFetch<{
        message: string;
        ticket_message: TicketMessage;
      }>(`/tickets/${ticketId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: replyBody.trim() }),
      });

      toast.success("Message sent.");
      setReplyBody("");

      setTicket((prev) => {
        if (!prev) return prev;
        const currentMessages = prev.messages || [];
        return {
          ...prev,
          messages: [...currentMessages, res.ticket_message],
          messages_count: (prev.messages_count ?? currentMessages.length) + 1,
        };
      });

      onUpdated();
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!ticketId) return;

    setClosing(true);
    try {
      const res = await apiFetch<{ message: string; ticket: Ticket }>(
        `/tickets/${ticketId}/close`,
        { method: "PATCH" }
      );

      toast.success("Ticket closed successfully.");
      setTicket((prev) => (prev ? { ...prev, status: "closed" } : res.ticket));
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to close ticket.");
    } finally {
      setClosing(false);
    }
  };

  const statusConfig = ticket ? TICKET_STATUSES[ticket.status] : null;
  const priorityConfig = ticket ? TICKET_PRIORITIES[ticket.priority] : null;

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={ticket ? ticket.subject : "Ticket Details"}
      description={
        ticket
          ? `Created by ${ticket.creator?.name || "User"} on ${new Date(
              ticket.created_at
            ).toLocaleDateString()}`
          : "Loading details..."
      }
      icon={<LifeBuoy className="w-5 h-5 text-[#7455A4]" />}
      width="max-w-2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {ticket && ticket.status !== "closed" && (
              <button
                type="button"
                onClick={handleCloseTicket}
                disabled={closing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                {closing ? <Spinner size="sm" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>Close Ticket</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#7A6F86] hover:text-[#33283D] bg-white border border-[#EAE4F2] rounded-xl transition-colors cursor-pointer"
          >
            Done
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
          {/* Metadata badges bar */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-[#FAF8FC] border border-[#EAE4F2] rounded-2xl">
            {statusConfig && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig.badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
                {statusConfig.label}
              </span>
            )}

            {priorityConfig && (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${priorityConfig.badgeClass}`}
              >
                Priority: {priorityConfig.label}
              </span>
            )}

            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-[#7455A4] border border-[#C9B8E2]/60">
              {TICKET_CATEGORIES[ticket.category] || ticket.category}
            </span>

            {ticket.resolved_at && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                Resolved {new Date(ticket.resolved_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Conversation Thread */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A6F86]">
              Conversation History
            </h3>

            {/* Initial description from creator */}
            <div className="p-4 rounded-2xl bg-white border border-[#EAE4F2] shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs text-[#7A6F86]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#F0EAF7] flex items-center justify-center text-[#7455A4] font-bold text-[10px]">
                    {ticket.creator?.name?.slice(0, 2).toUpperCase() || "OP"}
                  </div>
                  <span className="font-semibold text-[#33283D]">
                    {ticket.creator?.name || "Original Poster"}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-sm bg-gray-100 text-[10px] text-gray-600 uppercase">
                    {ticket.creator?.role || "Author"}
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[11px]">
                  <Clock className="w-3 h-3" />
                  {new Date(ticket.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-[#33283D] whitespace-pre-wrap leading-relaxed pt-1">
                {ticket.description}
              </p>
            </div>

            {/* Thread replies */}
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
                              YoSpa Platform Support
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-[#7455A4]/15 text-[#7455A4] font-bold text-[10px] border border-[#7455A4]/30">
                              Support Team
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
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3" />
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

          {/* Reply Form / Closed state banner */}
          <div className="pt-5 border-t border-[#EAE4F2]">
            {ticket.status === "closed" ? (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-center">
                <p className="text-xs font-semibold text-gray-600">
                  This ticket is closed and can no longer receive replies.
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  If you have a new question or issue, please open a new support ticket.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendReply} className="space-y-3">
                <label
                  htmlFor="tenant-reply-box"
                  className="block text-xs font-semibold text-[#33283D]"
                >
                  Write a reply
                </label>
                <textarea
                  id="tenant-reply-box"
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  rows={3}
                  placeholder="Provide additional details or respond to support..."
                  maxLength={5000}
                  disabled={sending}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#EAE4F2] bg-white text-[#33283D] placeholder:text-[#A195AD] focus:outline-hidden focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4] resize-y"
                />
                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={sending || !replyBody.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#7455A4] hover:bg-[#5C3E8C] rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {sending ? <Spinner size="sm" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Send Reply</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </SlideOver>
  );
}
