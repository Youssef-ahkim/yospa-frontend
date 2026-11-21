"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { apiFetch, ApiError } from "@/lib/api";
import { FormField } from "@/components/ui/FormField";
import { Spinner } from "@/components/ui/Spinner";
import {
  Building2,
  User,
  Mail,
  Sparkles,
  Globe,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const toast = useToast();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Clear passwords from memory on unmount
  useEffect(() => {
    return () => {
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirmation("");
    };
  }, []);

  const initials = user?.name
    ? user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
    : "?";

  const spaStatus = user?.spa?.status ?? "active";

  const isSubmitDisabled =
    isSaving ||
    !currentPassword.trim() ||
    !password.trim() ||
    !passwordConfirmation.trim();

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!currentPassword.trim() || !password.trim() || !passwordConfirmation.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      };

      await apiFetch<{ message: string }>("/user/password", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("Password updated. Other devices were signed out.");
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirmation("");
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      setFieldErrors({});
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 422 && err.errors) {
          setFieldErrors(err.errors);
          const knownFields = ["current_password", "password", "password_confirmation"];
          const unknownFields = Object.keys(err.errors).filter(
            (k) => !knownFields.includes(k)
          );
          if (unknownFields.length > 0) {
            toast.error(err.errors[unknownFields[0]][0] || err.message);
          }
        } else if (err.status === 429) {
          toast.error(err.message || "Too many attempts. Please try again later.");
        } else {
          toast.error(err.message || "Failed to update password.");
        }
      } else {
        toast.error(
          err instanceof Error ? err.message : "Failed to update password."
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A1626] tracking-tight">Settings</h1>
        <p className="text-sm text-[#7A6F86] mt-1">
          View your account preferences and spa tenant details
        </p>
      </div>

      {/* Profile card */}
      <div className="bg-white border border-[#EAE4F2] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#FAF8FC] flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#F0EAF7] flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-[#7455A4]" />
          </div>
          <h2 className="text-sm font-semibold text-[#1A1626]">Profile Information</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar + name row */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7455A4] to-[#9275BC] flex items-center justify-center shadow-md shadow-[#C9B8E2]/40 flex-shrink-0">
              <span className="text-white text-lg font-bold">{initials}</span>
            </div>
            <div>
              <p className="text-base font-semibold text-[#1A1626]">{user?.name}</p>
              <p className="text-sm text-[#7A6F86]">{user?.email}</p>
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#7A6F86] uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="text-sm font-medium text-[#1A1626] bg-[#FAF8FC] px-3.5 py-2.5 rounded-xl border border-[#EAE4F2]">
                {user?.name || "N/A"}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#7A6F86] uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="text-sm font-medium text-[#1A1626] bg-[#FAF8FC] px-3.5 py-2.5 rounded-xl border border-[#EAE4F2] flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#7A6F86] flex-shrink-0" />
                {user?.email || "N/A"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Card (available to all roles) */}
      <div className="bg-white border border-[#EAE4F2] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#FAF8FC] flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#F0EAF7] flex items-center justify-center">
            <KeyRound className="w-3.5 h-3.5 text-[#7455A4]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#1A1626]">Change Password</h2>
            <p className="text-xs text-[#7A6F86]">
              Update your account password. Updating will sign out other devices.
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
          {/* Current Password */}
          <FormField
            label="Current Password"
            required
            error={fieldErrors.current_password?.[0]}
          >
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (fieldErrors.current_password) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.current_password;
                      return next;
                    });
                  }
                }}
                placeholder="Enter your current password"
                className={`w-full pl-3.5 pr-10 py-2.5 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 bg-white ${
                  fieldErrors.current_password
                    ? "border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50"
                    : "border-[#EAE4F2] focus:ring-[#7455A4] focus:border-[#7455A4] hover:border-[#C9B8E2] text-[#33283D]"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A6F86] hover:text-[#33283D] p-1 cursor-pointer transition-colors"
                aria-label={showCurrent ? "Hide current password" : "Show current password"}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FormField>

          {/* New Password */}
          <FormField
            label="New Password"
            required
            error={fieldErrors.password?.[0]}
          >
            <div className="space-y-1">
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.password;
                        return next;
                      });
                    }
                  }}
                  placeholder="At least 8 characters"
                  className={`w-full pl-3.5 pr-10 py-2.5 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 bg-white ${
                    fieldErrors.password
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50"
                      : "border-[#EAE4F2] focus:ring-[#7455A4] focus:border-[#7455A4] hover:border-[#C9B8E2] text-[#33283D]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A6F86] hover:text-[#33283D] p-1 cursor-pointer transition-colors"
                  aria-label={showNew ? "Hide new password" : "Show new password"}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-[#7A6F86]">Must be at least 8 characters long</p>
            </div>
          </FormField>

          {/* Confirm New Password */}
          <FormField
            label="Confirm New Password"
            required
            error={fieldErrors.password_confirmation?.[0]}
          >
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                required
                minLength={8}
                value={passwordConfirmation}
                onChange={(e) => {
                  setPasswordConfirmation(e.target.value);
                  if (fieldErrors.password_confirmation) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.password_confirmation;
                      return next;
                    });
                  }
                }}
                placeholder="Re-enter your new password"
                className={`w-full pl-3.5 pr-10 py-2.5 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 bg-white ${
                  fieldErrors.password_confirmation
                    ? "border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50"
                    : "border-[#EAE4F2] focus:ring-[#7455A4] focus:border-[#7455A4] hover:border-[#C9B8E2] text-[#33283D]"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A6F86] hover:text-[#33283D] p-1 cursor-pointer transition-colors"
                aria-label={showConfirm ? "Hide confirmation password" : "Show confirmation password"}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </FormField>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#7455A4] hover:bg-[#5E4387] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer min-h-[40px]"
            >
              {isSaving && <Spinner className="w-4 h-4" />}
              <span>{isSaving ? "Updating Password..." : "Update Password"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Spa / Tenant card */}
      <div className="bg-white border border-[#EAE4F2] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#FAF8FC] flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#F0EAF7] flex items-center justify-center">
            <Building2 className="w-3.5 h-3.5 text-[#7455A4]" />
          </div>
          <h2 className="text-sm font-semibold text-[#1A1626]">Spa Details</h2>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#7A6F86] uppercase tracking-wider mb-1.5">
                Spa Name
              </label>
              <div className="text-sm font-medium text-[#1A1626] bg-[#FAF8FC] px-3.5 py-2.5 rounded-xl border border-[#EAE4F2] flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#7455A4] flex-shrink-0" />
                <span className="truncate">{user?.spa?.name || "N/A"}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#7A6F86] uppercase tracking-wider mb-1.5">
                Slug
              </label>
              <div className="text-sm font-medium text-[#1A1626] bg-[#FAF8FC] px-3.5 py-2.5 rounded-xl border border-[#EAE4F2] flex items-center gap-2 font-mono">
                <Globe className="w-3.5 h-3.5 text-[#7455A4] flex-shrink-0" />
                <span className="truncate">{user?.spa?.slug || "N/A"}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#7A6F86] uppercase tracking-wider mb-1.5">
                Status
              </label>
              <div className="text-sm font-medium text-[#1A1626] bg-[#FAF8FC] px-3.5 py-2.5 rounded-xl border border-[#EAE4F2] flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#7455A4] flex-shrink-0" />
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    spaStatus === "active"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-gray-100 text-gray-700 border border-gray-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      spaStatus === "active" ? "bg-emerald-500" : "bg-gray-400"
                    }`}
                  />
                  {spaStatus.charAt(0).toUpperCase() + spaStatus.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info note */}
      <p className="text-xs text-[#7A6F86] text-center px-4">
        Spa and account configuration details are read-only. Contact your system administrator to make changes.
      </p>
    </div>
  );
}
