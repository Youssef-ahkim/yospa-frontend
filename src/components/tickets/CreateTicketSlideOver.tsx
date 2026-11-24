"use client";

import { useState } from "react";
import { SlideOver } from "@/components/ui/SlideOver";
import { FormField } from "@/components/ui/FormField";
import { Spinner } from "@/components/ui/Spinner";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { TicketCategory, TicketPriority, TICKET_CATEGORIES } from "@/types";
import { LifeBuoy } from "lucide-react";

interface CreateTicketSlideOverProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateTicketSlideOver({
  open,
  onClose,
  onCreated,
}: CreateTicketSlideOverProps) {
  const toast = useToast();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory>("bug");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setSubject("");
    setCategory("bug");
    setPriority("medium");
    setDescription("");
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!subject.trim()) {
      newErrors.subject = "Subject is required.";
    } else if (subject.length > 255) {
      newErrors.subject = "Subject cannot exceed 255 characters.";
    }

    if (!description.trim()) {
      newErrors.description = "Description is required.";
    } else if (description.length > 5000) {
      newErrors.description = "Description cannot exceed 5000 characters.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/tickets", {
        method: "POST",
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          priority,
          description: description.trim(),
        }),
      });

      toast.success("Support ticket created successfully.");
      resetForm();
      onCreated();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(err.errors)) {
          fieldErrors[key] = Array.isArray(msgs) ? msgs[0] : String(msgs);
        }
        setErrors(fieldErrors);
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to create ticket.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SlideOver
      open={open}
      onClose={handleClose}
      title="Create Support Ticket"
      description="Report a problem, ask a billing question, or request a feature."
      icon={<LifeBuoy className="w-5 h-5 text-[#7455A4]" />}
      width="max-w-xl"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-[#7A6F86] hover:text-[#33283D] bg-white border border-[#EAE4F2] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-ticket-form"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#7455A4] hover:bg-[#5C3E8C] rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {loading && <Spinner size="sm" />}
            <span>Submit Ticket</span>
          </button>
        </div>
      }
    >
      <form id="create-ticket-form" onSubmit={handleSubmit} className="space-y-5">
        <FormField label="Subject" required error={errors.subject}>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary of the issue"
            maxLength={255}
            disabled={loading}
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-[#EAE4F2] bg-white text-[#33283D] placeholder:text-[#A195AD] focus:outline-hidden focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4]"
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Category" required error={errors.category}>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
              disabled={loading}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-[#EAE4F2] bg-white text-[#33283D] focus:outline-hidden focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4]"
            >
              {(Object.keys(TICKET_CATEGORIES) as TicketCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {TICKET_CATEGORIES[cat]}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Priority" required error={errors.priority}>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              disabled={loading}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-[#EAE4F2] bg-white text-[#33283D] focus:outline-hidden focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4]"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </FormField>
        </div>

        <FormField label="Description" required error={errors.description}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            placeholder="Describe what happened, steps to reproduce, or details of your request..."
            maxLength={5000}
            disabled={loading}
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-[#EAE4F2] bg-white text-[#33283D] placeholder:text-[#A195AD] focus:outline-hidden focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4] resize-y"
          />
        </FormField>
      </form>
    </SlideOver>
  );
}
