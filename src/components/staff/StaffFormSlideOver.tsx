"use client";

import { useEffect, useState } from "react";
import { SlideOver } from "@/components/ui/SlideOver";
import { FormField } from "@/components/ui/FormField";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/context/ToastContext";
import { apiFetch, ApiError } from "@/lib/api";
import { Staff, Role } from "@/types";
import { usePermissions } from "@/lib/permissions";
import { UserPlus, Edit3, Eye, EyeOff, Shield, Info, Lock } from "lucide-react";

interface StaffFormSlideOverProps {
  open: boolean;
  onClose: () => void;
  staff: Staff | null;
  onSuccess: (savedStaff: Staff, isEdit: boolean) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function StaffFormSlideOver({
  open,
  onClose,
  staff,
  onSuccess,
}: StaffFormSlideOverProps) {
  const toast = useToast();
  const { isOwner, canEditAccount } = usePermissions();
  const isEdit = Boolean(staff);

  const editPermission = staff
    ? canEditAccount(staff)
    : { canEdit: true, canDeactivate: true, canChangeRole: true };

  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    password: string;
    role: Role;
    is_active: boolean;
  }>({
    name: "",
    email: "",
    password: "",
    role: "staff",
    is_active: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFieldErrors({});
      setShowPassword(false);
      if (staff) {
        setFormData({
          name: staff.name || "",
          email: staff.email || "",
          password: "",
          role: staff.role || "staff",
          is_active: staff.is_active ?? true,
        });
      } else {
        setFormData({
          name: "",
          email: "",
          password: "",
          role: "staff",
          is_active: true,
        });
      }
    }
  }, [open, staff]);

  // Allowed role options: admin can only assign "staff"; owner can assign "staff", "admin", "owner"
  const availableRoles: { value: Role; label: string; description: string }[] = isOwner
    ? [
        { value: "staff", label: "Staff", description: "Can manage reservations & clients; read-only services/therapists." },
        { value: "admin", label: "Admin", description: "Can manage services, therapists, and staff accounts." },
        { value: "owner", label: "Owner", description: "Full unrestricted administrative access to the spa." },
      ]
    : [
        { value: "staff", label: "Staff", description: "Can manage reservations & clients; read-only services/therapists." },
      ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const errors: Record<string, string[]> = {};
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      errors.name = ["Name is required."];
    } else if (trimmedName.length > 255) {
      errors.name = ["Name must not exceed 255 characters."];
    }

    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      errors.email = ["Email is required."];
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = ["Please enter a valid email address."];
    }

    const trimmedPassword = formData.password.trim();
    if (!isEdit) {
      if (!trimmedPassword) {
        errors.password = ["Password is required."];
      } else if (trimmedPassword.length < 8) {
        errors.password = ["Password must be at least 8 characters."];
      }
    } else if (trimmedPassword && trimmedPassword.length < 8) {
      errors.password = ["New password must be at least 8 characters."];
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
        email: trimmedEmail,
        role: formData.role,
        is_active: formData.is_active,
      };

      if (!isEdit) {
        payload.password = trimmedPassword;
      } else if (trimmedPassword) {
        payload.password = trimmedPassword;
      }

      const endpoint = isEdit ? `/staff/${staff!.id}` : "/staff";
      const method = isEdit ? "PATCH" : "POST";

      const response = await apiFetch<{ message: string; staff: Staff }>(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      const saved = response.staff || (response as any);
      toast.success(
        response.message || (isEdit ? "Staff account updated successfully." : "Staff account created successfully.")
      );
      onSuccess(saved, isEdit);
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError && err.errors) {
        setFieldErrors(err.errors);
        const knownFields = ["name", "email", "password", "role", "is_active"];
        const nonFieldKeys = Object.keys(err.errors).filter((k) => !knownFields.includes(k));
        if (nonFieldKeys.length > 0) {
          toast.error(err.errors[nonFieldKeys[0]][0] || err.message);
        } else {
          toast.error("Validation error. Please check your inputs.");
        }
      } else {
        // Map 409 (last active owner), 403 (unauthorized action), and general errors to toasts
        toast.error(err?.message || "Failed to save staff account.");
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
      title={isEdit ? "Edit Staff Member" : "New Staff Account"}
      description={
        isEdit
          ? `Update account details and credentials for ${staff?.name}`
          : "Create a new user account with assigned role and login credentials"
      }
      icon={
        isEdit ? (
          <Edit3 className="w-4 h-4 text-[#7455A4]" />
        ) : (
          <UserPlus className="w-4 h-4 text-[#7455A4]" />
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
            form="staff-form"
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#7455A4] hover:bg-[#5E4387] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {isSubmitting && <Spinner className="w-4 h-4" />}
            <span>
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Account"}
            </span>
          </button>
        </div>
      }
    >
      <form id="staff-form" onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Full Name */}
        <FormField label="Full Name" required error={fieldErrors.name?.[0]}>
          <input
            type="text"
            required
            maxLength={255}
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. John Doe"
            className={inputClass("name")}
            autoFocus
          />
        </FormField>

        {/* Email Address */}
        <FormField label="Email Address" required error={fieldErrors.email?.[0]}>
          <input
            type="email"
            required
            maxLength={255}
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="e.g. john@yospa.com"
            className={inputClass("email")}
          />
        </FormField>

        {/* Role Selection */}
        <FormField label="Access Role" required error={fieldErrors.role?.[0]}>
          <div className="space-y-2">
            <select
              value={formData.role}
              disabled={isEdit && !editPermission.canChangeRole}
              onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value as Role }))}
              className={`${inputClass("role")} capitalize disabled:bg-gray-100 disabled:cursor-not-allowed`}
            >
              {availableRoles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {isEdit && !editPermission.canChangeRole && (
              <p className="text-[11px] text-amber-700 flex items-center gap-1">
                <Info className="w-3 h-3 flex-shrink-0" />
                <span>You cannot change the role of your own account.</span>
              </p>
            )}
            <p className="text-[11px] text-[#7A6F86]">
              {availableRoles.find((r) => r.value === formData.role)?.description}
            </p>
          </div>
        </FormField>

        {/* Password */}
        <FormField
          label={isEdit ? "New Password" : "Password"}
          required={!isEdit}
          error={fieldErrors.password?.[0]}
        >
          <div className="space-y-1">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required={!isEdit}
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                placeholder={isEdit ? "Leave blank to keep current password" : "At least 8 characters"}
                className={`${inputClass("password")} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A6F86] hover:text-[#33283D] transition-colors cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isEdit && (
              <p className="text-[11px] text-[#7A6F86]">
                Only enter a password if you want to reset credentials for this user.
              </p>
            )}
          </div>
        </FormField>

        {/* Active Status Switch (in edit mode or always) */}
        <div className="pt-1">
          <div className="flex items-center justify-between p-3.5 bg-[#FAF8FC] border border-[#EAE4F2] rounded-xl">
            <div className="space-y-0.5 pr-4">
              <span className="text-sm font-semibold text-[#33283D]">Account Active</span>
              <p className="text-xs text-[#7A6F86]">
                {formData.is_active
                  ? "User is authorized to sign in and perform actions."
                  : "Deactivated user. Tokens revoked and logins blocked."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              disabled={isEdit && !editPermission.canDeactivate}
              aria-checked={formData.is_active}
              onClick={() => {
                if (!isEdit || editPermission.canDeactivate) {
                  setFormData((prev) => ({ ...prev, is_active: !prev.is_active }));
                }
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#7455A4] focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                formData.is_active ? "bg-[#7455A4]" : "bg-gray-300"
              }`}
              title={
                isEdit && !editPermission.canDeactivate
                  ? editPermission.reason || "You cannot deactivate your own account."
                  : undefined
              }
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  formData.is_active ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          {isEdit && !editPermission.canDeactivate && (
            <p className="text-[11px] text-amber-700 flex items-center gap-1 mt-1">
              <Info className="w-3 h-3 flex-shrink-0" />
              <span>{editPermission.reason || "You cannot deactivate your own account."}</span>
            </p>
          )}
        </div>
      </form>
    </SlideOver>
  );
}
