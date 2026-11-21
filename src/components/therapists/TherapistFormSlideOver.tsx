"use client";

import { useEffect, useState } from "react";
import { SlideOver } from "@/components/ui/SlideOver";
import { FormField } from "@/components/ui/FormField";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/context/ToastContext";
import { apiFetch, ApiError } from "@/lib/api";
import { Therapist } from "@/types";
import { UserCheck, Edit3, Plus, Palette } from "lucide-react";

interface TherapistFormSlideOverProps {
  open: boolean;
  onClose: () => void;
  therapist: Therapist | null;
  onSuccess: (savedTherapist: Therapist, isEdit: boolean) => void;
}

const PRESET_COLORS = [
  "#7455A4",
  "#9275BC",
  "#91A68D",
  "#E07A5F",
  "#3D5A80",
  "#D4A373",
  "#2A9D8F",
  "#E76F51",
];

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export function TherapistFormSlideOver({
  open,
  onClose,
  therapist,
  onSuccess,
}: TherapistFormSlideOverProps) {
  const toast = useToast();
  const isEdit = Boolean(therapist);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    color: "#7455A4",
    notes: "",
    is_active: true,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state whenever slideover opens or therapist changes
  useEffect(() => {
    if (open) {
      setFieldErrors({});
      if (therapist) {
        setFormData({
          name: therapist.name || "",
          phone: therapist.phone || "",
          email: therapist.email || "",
          color: therapist.color || "#7455A4",
          notes: therapist.notes || "",
          is_active: therapist.is_active ?? true,
        });
      } else {
        setFormData({
          name: "",
          phone: "",
          email: "",
          color: "#7455A4",
          notes: "",
          is_active: true,
        });
      }
    }
  }, [open, therapist]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Client-side validation
    const errors: Record<string, string[]> = {};
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      errors.name = ["Therapist name is required."];
    } else if (trimmedName.length > 255) {
      errors.name = ["Name must not exceed 255 characters."];
    }

    const trimmedColor = formData.color.trim();
    if (!HEX_COLOR_REGEX.test(trimmedColor)) {
      errors.color = ["Color must be a valid hex code (e.g. #7455A4)."];
    }

    if (formData.notes && formData.notes.length > 2000) {
      errors.notes = ["Notes must not exceed 2000 characters."];
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Please review the highlighted form errors.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, any> = {
        name: trimmedName,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        color: trimmedColor.toUpperCase(),
        notes: formData.notes.trim() || null,
        is_active: formData.is_active,
      };

      const endpoint = isEdit ? `/therapists/${therapist!.id}` : "/therapists";
      const method = isEdit ? "PATCH" : "POST";

      const response = await apiFetch<{ message: string; therapist: Therapist }>(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      const saved = response.therapist || (response as any);
      toast.success(
        response.message || (isEdit ? "Therapist updated successfully." : "Therapist created successfully.")
      );
      onSuccess(saved, isEdit);
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError && err.errors) {
        setFieldErrors(err.errors);
        const knownFields = ["name", "phone", "email", "color", "notes", "is_active"];
        const nonFieldKeys = Object.keys(err.errors).filter((k) => !knownFields.includes(k));
        if (nonFieldKeys.length > 0) {
          toast.error(err.errors[nonFieldKeys[0]][0] || err.message);
        } else {
          toast.error("Validation error. Please check your inputs.");
        }
      } else {
        toast.error(err?.message || "Failed to save therapist. Please try again.");
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
      title={isEdit ? "Edit Therapist" : "New Therapist"}
      description={
        isEdit
          ? `Update details and calendar color for ${therapist?.name}`
          : "Add a new massage therapist or practitioner to your team"
      }
      icon={
        isEdit ? (
          <Edit3 className="w-4 h-4 text-[#7455A4]" />
        ) : (
          <UserCheck className="w-4 h-4 text-[#7455A4]" />
        )
      }
      width="max-w-md"
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
            form="therapist-form"
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#7455A4] hover:bg-[#5E4387] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {isSubmitting && <Spinner className="w-4 h-4" />}
            <span>
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Therapist"}
            </span>
          </button>
        </div>
      }
    >
      <form id="therapist-form" onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Therapist Name */}
        <FormField label="Full Name" required error={fieldErrors.name?.[0]}>
          <input
            type="text"
            required
            maxLength={255}
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. Sarah Jenkins"
            className={inputClass("name")}
            autoFocus
          />
        </FormField>

        {/* Contact Info: Phone & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Phone Number" error={fieldErrors.phone?.[0]}>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="e.g. +1 555-0199"
              className={inputClass("phone")}
            />
          </FormField>

          <FormField label="Email" error={fieldErrors.email?.[0]}>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="e.g. sarah@example.com"
              className={inputClass("email")}
            />
          </FormField>
        </div>

        {/* Calendar Color Picker & Swatches */}
        <FormField label="Calendar Accent Color" required error={fieldErrors.color?.[0]}>
          <div className="space-y-2.5">
            <p className="text-xs text-[#7A6F86]">
              Used to identify this therapist&apos;s appointments on the schedule
            </p>
            <div className="flex items-center gap-3">
              {/* Native color picker box */}
              <div className="relative flex-shrink-0">
                <input
                  type="color"
                  value={HEX_COLOR_REGEX.test(formData.color) ? formData.color : "#7455A4"}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, color: e.target.value.toUpperCase() }))
                  }
                  className="w-10 h-10 rounded-xl cursor-pointer border border-[#EAE4F2] p-0.5 bg-white shadow-2xs"
                  title="Pick custom color"
                />
              </div>

              {/* Text input for manual hex typing */}
              <div className="relative flex-1">
                <Palette className="w-3.5 h-3.5 text-[#7A6F86] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={7}
                  value={formData.color}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, color: e.target.value }))
                  }
                  placeholder="#7455A4"
                  className={`${inputClass("color")} pl-9 font-mono uppercase text-xs`}
                />
              </div>
            </div>

            {/* Preset Color Swatches */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {PRESET_COLORS.map((hex) => {
                const isSelected = formData.color.toUpperCase() === hex.toUpperCase();
                return (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, color: hex }))}
                    className={`w-7 h-7 rounded-lg transition-transform cursor-pointer border-2 shadow-2xs flex items-center justify-center ${
                      isSelected
                        ? "border-[#33283D] scale-110 shadow-sm"
                        : "border-white hover:scale-105"
                    }`}
                    style={{ backgroundColor: hex }}
                    title={hex}
                  >
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-white shadow-xs" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </FormField>

        {/* Notes */}
        <FormField label="Internal Notes" error={fieldErrors.notes?.[0]}>
          <textarea
            rows={3}
            maxLength={2000}
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Specializes in deep tissue and Swedish massage..."
            className={`${inputClass("notes")} resize-none`}
          />
        </FormField>

        {/* Active Toggle Switch */}
        <div className="pt-1">
          <div className="flex items-center justify-between p-3.5 bg-[#FAF8FC] border border-[#EAE4F2] rounded-xl">
            <div className="space-y-0.5 pr-4">
              <span className="text-sm font-semibold text-[#33283D]">Active for bookings</span>
              <p className="text-xs text-[#7A6F86]">
                When active, this therapist will appear in reservation assignment selectors.
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
