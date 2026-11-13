"use client";

import { SlideOver } from "@/components/ui/SlideOver";
import { FormField } from "@/components/ui/FormField";
import { Spinner } from "@/components/ui/Spinner";
import { Edit3 } from "lucide-react";

interface ClientEditSlideOverProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  formData: {
    full_name: string;
    phone: string;
    email: string;
    notes: string;
  };
  onFormDataChange: (data: ClientEditSlideOverProps["formData"]) => void;
  fieldErrors: Record<string, string[]>;
  isUpdating: boolean;
}

export function ClientEditSlideOver({
  open,
  onClose,
  onSubmit,
  formData,
  onFormDataChange,
  fieldErrors,
  isUpdating,
}: ClientEditSlideOverProps) {
  const inputClass = (field: string) =>
    `w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 bg-white transition-colors ${
      fieldErrors[field]
        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
        : "border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-300"
    }`;

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Edit Client"
      description="Update the client's information"
      icon={<Edit3 className="w-4 h-4 text-indigo-600" />}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-client-form"
            disabled={isUpdating}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {isUpdating && <Spinner className="w-4 h-4" />}
            {isUpdating ? "Saving..." : "Save Changes"}
          </button>
        </div>
      }
    >
      <form id="edit-client-form" onSubmit={onSubmit} className="p-6 space-y-5">
        <FormField label="Full Name" required error={fieldErrors.full_name?.[0]}>
          <input
            type="text"
            required
            value={formData.full_name}
            onChange={(e) => onFormDataChange({ ...formData, full_name: e.target.value })}
            className={inputClass("full_name")}
            placeholder="e.g. John Doe"
          />
        </FormField>

        <FormField label="Phone Number" required error={fieldErrors.phone?.[0]}>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => onFormDataChange({ ...formData, phone: e.target.value })}
            className={inputClass("phone")}
            placeholder="+212 600-000000"
          />
        </FormField>

        <FormField label="Email Address" error={fieldErrors.email?.[0]}>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => onFormDataChange({ ...formData, email: e.target.value })}
            className={inputClass("email")}
            placeholder="john@example.com"
          />
        </FormField>

        <FormField label="Notes" error={fieldErrors.notes?.[0]}>
          <textarea
            rows={4}
            value={formData.notes}
            onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-300 bg-white transition-colors resize-none"
            placeholder="Preferences, allergy information, or special requests..."
          />
        </FormField>
      </form>
    </SlideOver>
  );
}

