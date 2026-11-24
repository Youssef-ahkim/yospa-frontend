"use client";

import { useState, useEffect } from "react";
import { SlideOver } from "@/components/ui/SlideOver";
import { FormField } from "@/components/ui/FormField";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/context/ToastContext";
import { apiFetch, ApiError } from "@/lib/api";
import { PlatformUser, Role } from "@/types";
import { generateSecurePassword } from "@/lib/password";
import {
  UserCog,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

interface EditPlatformUserSlideOverProps {
  open: boolean;
  onClose: () => void;
  user: PlatformUser | null;
  onSuccess: (updatedUser: PlatformUser) => void;
}

export function EditPlatformUserSlideOver({
  open,
  onClose,
  user,
  onSuccess,
}: EditPlatformUserSlideOverProps) {
  const toast = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [isActive, setIsActive] = useState(true);

  // Password reset state
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Credentials confirmation screen when password was reset
  const [savedPassword, setSavedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync state when slideover opens or target user changes
  useEffect(() => {
    if (open && user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset form state when slide-over opens
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
      setIsActive(user.is_active);
      setIsResettingPassword(false);
      setNewPassword("");
      setShowPassword(false);
      setFieldErrors({});
      setConflictError(null);
      setSavedPassword(null);
      setCopied(false);
    } else if (!open) {
      // Clear sensitive password from component memory on close
      setNewPassword("");
      setSavedPassword(null);
    }
  }, [open, user]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      setNewPassword("");
      setSavedPassword(null);
    };
  }, []);

  const handleToggleResetPassword = (checked: boolean) => {
    setIsResettingPassword(checked);
    if (checked && !newPassword) {
      setNewPassword(generateSecurePassword(16));
    }
  };

  const handleRegeneratePassword = () => {
    setNewPassword(generateSecurePassword(16));
    setShowPassword(true);
  };

  const handleCopyPassword = async () => {
    if (!savedPassword) return;
    try {
      await navigator.clipboard.writeText(savedPassword);
      setCopied(true);
      toast.success("Password copied to clipboard.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy password to clipboard.");
    }
  };

  const handleFinalClose = () => {
    setSavedPassword(null);
    setNewPassword("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setFieldErrors({});
    setConflictError(null);

    // Client-side validations
    const errors: Record<string, string[]> = {};
    if (!name.trim()) errors.name = ["Name is required."];
    if (!email.trim()) errors.email = ["Email is required."];
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = ["Please enter a valid email address."];
    }
    if (isResettingPassword) {
      if (!newPassword.trim()) {
        errors.password = ["Password is required."];
      } else if (newPassword.length < 8) {
        errors.password = ["Password must be at least 8 characters."];
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    const passCandidate = isResettingPassword ? newPassword : null;

    try {
      const payload: {
        name: string;
        email: string;
        role: Role;
        is_active: boolean;
        password?: string;
      } = {
        name: name.trim(),
        email: email.trim(),
        role,
        is_active: isActive,
      };

      if (passCandidate) {
        payload.password = passCandidate;
      }

      const res = await apiFetch<{ message: string; user: PlatformUser }>(
        `/platform/users/${user.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        }
      );

      const roleOrStatusChanged = role !== user.role || isActive !== user.is_active;
      const passChanged = Boolean(passCandidate);

      if (passChanged) {
        setSavedPassword(passCandidate);
        toast.success(
          "User updated and password reset. Note: Active sessions were revoked and the user is signed out."
        );
        onSuccess(res.user);
      } else {
        if (roleOrStatusChanged) {
          toast.success(
            "User updated successfully. Note: Active sessions were revoked and the user is signed out on their next request."
          );
        } else {
          toast.success("User updated successfully.");
        }
        onSuccess(res.user);
        onClose();
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setConflictError(
            err.message || "Cannot deactivate or change role of the last active owner."
          );
          toast.error(err.message || "Cannot deactivate or change role of the last active owner.");
        } else if (err.status === 422 && err.errors) {
          setFieldErrors(err.errors);
          const firstErrKey = Object.keys(err.errors)[0];
          if (firstErrKey && err.errors[firstErrKey][0]) {
            toast.error(err.errors[firstErrKey][0]);
          }
        } else {
          toast.error(err.message || "Failed to update user.");
        }
      } else {
        toast.error("Failed to update user. Please check your connection.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // If password reset credentials screen is active
  if (savedPassword) {
    return (
      <SlideOver
        open={open}
        onClose={() => {
          toast.error("Please confirm you have saved the password by clicking \"I've saved it\".");
        }}
        title="Password Reset Complete"
        description="Save the new password. It will only be displayed once."
        icon={
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck size={18} />
          </div>
        }
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={handleFinalClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#7455A4] hover:bg-[#63478e] shadow-sm transition-all cursor-pointer min-h-[40px] flex items-center justify-center gap-1.5"
            >
              <Check size={14} />
              I&apos;ve saved it
            </button>
          </div>
        }
      >
        <div className="space-y-5 text-[#33283D]">
          <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              This temporary password will <strong className="font-semibold">not be shown again</strong>. Please copy it and transmit it securely to <span className="font-semibold">{name}</span>.
            </p>
          </div>

          <div className="bg-[#FAF8FC] border border-[#EAE4F2] rounded-xl p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#7A6F86]">User</span>
              <span className="font-semibold text-[#1A1626]">{name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#7A6F86]">Email</span>
              <span className="font-mono text-[#7455A4]">{email}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#33283D]">
              New Password
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-sm tracking-wider text-[#1A1626] select-all break-all">
                {savedPassword}
              </div>
              <button
                type="button"
                onClick={handleCopyPassword}
                aria-label="Copy password to clipboard"
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[42px] flex-shrink-0 ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-[#F0EAF7] text-[#7455A4] hover:bg-[#E4D8EE]"
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          </div>
        </div>
      </SlideOver>
    );
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Edit Spa User"
      description="Update account details, role, status, or reset credentials."
      icon={
        <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#7455A4] flex items-center justify-center">
          <UserCog size={18} />
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6E627C] hover:bg-gray-100 transition-colors cursor-pointer min-h-[40px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-platform-user-form"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#7455A4] hover:bg-[#63478e] shadow-sm transition-all disabled:opacity-50 cursor-pointer min-h-[40px] flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Spinner className="w-3.5 h-3.5 text-white" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      }
    >
      <form id="edit-platform-user-form" onSubmit={handleSubmit} className="space-y-5">
        {conflictError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
            <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p>{conflictError}</p>
          </div>
        )}

        <FormField label="Full Name" error={fieldErrors.name?.[0]} required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[#EAE4F2] rounded-xl text-[#1A1626] focus:outline-none focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4] transition-all min-h-[40px]"
            required
          />
        </FormField>

        <FormField label="Email Address" error={fieldErrors.email?.[0]} required>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[#EAE4F2] rounded-xl text-[#1A1626] focus:outline-none focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4] transition-all min-h-[40px]"
            required
          />
        </FormField>

        <FormField label="Role" error={fieldErrors.role?.[0]} required>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[#EAE4F2] rounded-xl text-[#1A1626] focus:outline-none focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4] transition-all min-h-[40px] cursor-pointer"
          >
            <option value="owner">Owner (Full tenant access)</option>
            <option value="admin">Admin (Manage services, therapists, staff)</option>
            <option value="staff">Staff (Bookings and clients only)</option>
          </select>
        </FormField>

        {/* Account Status Toggle */}
        <div className="pt-2 pb-2 border-t border-[#FAF8FC]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#1A1626]">Account Active</p>
              <p className="text-[11px] text-[#7A6F86]">
                Deactivated users are blocked on their next authenticated request.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer min-h-[32px]">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7455A4]" />
            </label>
          </div>
          {fieldErrors.is_active?.[0] && (
            <p className="text-xs text-red-600 mt-1">{fieldErrors.is_active[0]}</p>
          )}
        </div>

        {/* Password Reset Section */}
        <div className="pt-3 border-t border-[#FAF8FC] space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#1A1626]">
              <input
                type="checkbox"
                checked={isResettingPassword}
                onChange={(e) => handleToggleResetPassword(e.target.checked)}
                className="rounded border-[#EAE4F2] text-[#7455A4] focus:ring-[#7455A4]/20"
              />
              <span>Reset User Password</span>
            </label>
            {isResettingPassword && (
              <button
                type="button"
                onClick={handleRegeneratePassword}
                className="text-[11px] font-semibold text-[#7455A4] hover:text-[#5a3e87] flex items-center gap-1 transition-colors cursor-pointer min-h-[28px]"
              >
                <RefreshCw size={11} />
                <span>Generate New</span>
              </button>
            )}
          </div>

          {isResettingPassword && (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 pr-10 text-xs sm:text-sm bg-white border border-[#EAE4F2] rounded-xl text-[#1A1626] font-mono placeholder-[#9275BC]/60 focus:outline-none focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4] transition-all min-h-[40px]"
                  placeholder="Min. 8 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9275BC] hover:text-[#33283D] p-1 rounded-md transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {fieldErrors.password?.[0] ? (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.password[0]}</p>
              ) : (
                <p className="text-[11px] text-[#7A6F86]">
                  A strong 16-character password has been generated. You will be able to copy it after saving.
                </p>
              )}
            </div>
          )}
        </div>
      </form>
    </SlideOver>
  );
}
