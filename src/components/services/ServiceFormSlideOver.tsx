"use client";

import { useEffect, useState } from "react";
import { SlideOver } from "@/components/ui/SlideOver";
import { FormField } from "@/components/ui/FormField";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/context/ToastContext";
import { apiFetch, ApiError } from "@/lib/api";
import { Service } from "@/types";
import { Sparkles, Edit3, Plus } from "lucide-react";

interface ServiceFormSlideOverProps {
  open: boolean;
  onClose: () => void;
  service: Service | null;
  onSuccess: (savedService: Service, isEdit: boolean) => void;
}

export function ServiceFormSlideOver({
  open,
  onClose,
  service,
  onSuccess,
}: ServiceFormSlideOverProps) {
  const toast = useToast();
  const isEdit = Boolean(service);

  const [formData, setFormData] = useState({
    name: "",
    duration_minutes: "60",
    price: "",
    description: "",
    is_active: true,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state whenever slideover opens or service changes
  useEffect(() => {
    if (open) {
      setFieldErrors({});
      if (service) {
        setFormData({
          name: service.name,
          duration_minutes: String(service.duration_minutes),
          price: String(service.price),
          description: service.description || "",
          is_active: service.is_active,
        });
      } else {
        setFormData({
          name: "",
          duration_minutes: "60",
          price: "",
          description: "",
          is_active: true,
        });
      }
    }
  }, [open, service]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Client-side validation
    const errors: Record<string, string[]> = {};
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      errors.name = ["Service name is required."];
    } else if (trimmedName.length > 255) {
      errors.name = ["Service name must not exceed 255 characters."];
    }

    const durationNum = parseInt(formData.duration_minutes, 10);
    if (isNaN(durationNum) || durationNum < 5 || durationNum > 1440) {
      errors.duration_minutes = ["Duration must be an integer between 5 and 1440 minutes."];
    }

    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum < 0) {
      errors.price = ["Price must be a number greater than or equal to 0."];
    }

    if (formData.description && formData.description.length > 2000) {
      errors.description = ["Description must not exceed 2000 characters."];
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Please review the highlighted form errors.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: trimmedName,
        duration_minutes: durationNum,
        price: priceNum,
        description: formData.description.trim() || null,
        is_active: formData.is_active,
      };

      const endpoint = isEdit ? `/services/${service!.id}` : "/services";
      const method = isEdit ? "PUT" : "POST";

      const response = await apiFetch<{ message: string; service: Service }>(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      const saved = response.service || (response as any);
      toast.success(
        response.message || (isEdit ? "Service updated successfully." : "Service created successfully.")
      );
      onSuccess(saved, isEdit);
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError && err.errors) {
        setFieldErrors(err.errors);
        const knownFields = ["name", "duration_minutes", "price", "description", "is_active"];
        const nonFieldKeys = Object.keys(err.errors).filter((k) => !knownFields.includes(k));
        if (nonFieldKeys.length > 0) {
          toast.error(err.errors[nonFieldKeys[0]][0] || err.message);
        } else {
          toast.error("Validation error. Please check your inputs.");
        }
      } else {
        toast.error(err?.message || "Failed to save service. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 bg-white ${
      fieldErrors[field]
        ? "border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50"
        : "border-[#EAE4F2] focus:ring-[#7455A4] focus:border-[#7455A4] hover:border-[#C9B8E2] text-[#33283D]"
    }`;

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Service" : "New Service"}
      description={
        isEdit
          ? "Update treatment details, duration, price, and visibility"
          : "Add a new spa treatment or service to your catalog"
      }
      icon={
        isEdit ? (
          <Edit3 className="w-4 h-4 text-[#7455A4]" />
        ) : (
          <Plus className="w-4 h-4 text-[#7455A4]" />
        )
      }
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 border border-[#EAE4F2] rounded-xl text-sm font-medium text-[#33283D] bg-white hover:bg-[#FAF8FC] transition-colors cursor-pointer disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="service-form"
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#7455A4] hover:bg-[#5E4387] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {isSubmitting && <Spinner className="w-4 h-4" />}
            <span>{isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Service"}</span>
          </button>
        </div>
      }
    >
      <form id="service-form" onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Service Name */}
        <FormField label="Service Name" required error={fieldErrors.name?.[0]}>
          <input
            type="text"
            required
            maxLength={255}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={inputClass("name")}
            placeholder="e.g. Signature Hammam & Scrub"
          />
        </FormField>

        {/* Duration and Price Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Duration (minutes)" required error={fieldErrors.duration_minutes?.[0]}>
            <input
              type="number"
              required
              min={5}
              max={1440}
              step={1}
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
              className={inputClass("duration_minutes")}
              placeholder="60"
            />
          </FormField>

          <FormField label="Price (MAD)" required error={fieldErrors.price?.[0]}>
            <input
              type="number"
              required
              min={0}
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className={inputClass("price")}
              placeholder="450.00"
            />
          </FormField>
        </div>

        {/* Description */}
        <FormField label="Description" error={fieldErrors.description?.[0]}>
          <textarea
            rows={3}
            maxLength={2000}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-[#EAE4F2] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7455A4] focus:border-[#7455A4] hover:border-[#C9B8E2] bg-white text-[#33283D] placeholder-[#7A6F86]/60 transition-colors resize-none"
            placeholder="Brief overview of the treatment ritual, benefits, and special techniques..."
          />
        </FormField>

        {/* Active Toggle Switch */}
        <div className="pt-1">
          <div className="flex items-center justify-between p-3.5 bg-[#FAF8FC] border border-[#EAE4F2] rounded-xl">
            <div className="space-y-0.5 pr-4">
              <span className="text-sm font-semibold text-[#33283D]">Active for bookings</span>
              <p className="text-xs text-[#7A6F86]">
                When active, this service is available for scheduling appointments.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={formData.is_active}
              onClick={() => setFormData((prev) => ({ ...prev, is_active: !prev.is_active }))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#7455A4] focus:ring-offset-2 ${
                formData.is_active ? "bg-[#7455A4]" : "bg-gray-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  formData.is_active ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          {fieldErrors.is_active && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.is_active[0]}</p>
          )}
        </div>
      </form>
    </SlideOver>
  );
}
