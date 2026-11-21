"use client";

import { useState, useEffect } from "react";
import { SlideOver } from "@/components/ui/SlideOver";
import { FormField } from "@/components/ui/FormField";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/context/ToastContext";
import { apiFetch, ApiError } from "@/lib/api";
import { generateSecurePassword } from "@/lib/password";
import {
  Building2,
  Sparkles,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

interface CreateSpaSlideOverProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CreatedSpaResponse {
  message: string;
  spa: {
    id: number;
    name: string;
    slug: string;
    status: string;
  };
  owner: {
    id: number;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
  };
}

interface SavedCredentials {
  spaName: string;
  spaSlug: string;
  ownerName: string;
  ownerEmail: string;
  password: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CreateSpaSlideOver({
  open,
  onClose,
  onSuccess,
}: CreateSpaSlideOverProps) {
  const toast = useToast();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugCustomized, setIsSlugCustomized] = useState(false);

  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Credentials confirmation screen shown once after successful 201 response
  const [createdCredentials, setCreatedCredentials] = useState<SavedCredentials | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset & initialize state when slideover opens
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset form state when slide-over opens
      setName("");
      setSlug("");
      setIsSlugCustomized(false);
      setOwnerName("");
      setOwnerEmail("");
      // Generate a secure 16-char password by default
      setOwnerPassword(generateSecurePassword(16));
      setShowPassword(false);
      setFieldErrors({});
      setCreatedCredentials(null);
      setCopied(false);
    } else {
      // Clear all sensitive credentials from component state on close
      setOwnerPassword("");
      setCreatedCredentials(null);
    }
  }, [open]);

  // Clean up passwords from state on unmount
  useEffect(() => {
    return () => {
      setOwnerPassword("");
      setCreatedCredentials(null);
    };
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isSlugCustomized) {
      setSlug(slugify(val));
    }
  };

  const handleSlugChange = (val: string) => {
    setIsSlugCustomized(true);
    setSlug(slugify(val));
  };

  const handleRegeneratePassword = () => {
    const newPass = generateSecurePassword(16);
    setOwnerPassword(newPass);
    setShowPassword(true);
  };

  const handleCopyPassword = async () => {
    if (!createdCredentials?.password) return;
    try {
      await navigator.clipboard.writeText(createdCredentials.password);
      setCopied(true);
      toast.success("Password copied to clipboard.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy password to clipboard.");
    }
  };

  const handleFinalClose = () => {
    setCreatedCredentials(null);
    setOwnerPassword("");
    onSuccess();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Client-side pre-validations
    const errors: Record<string, string[]> = {};
    if (!name.trim()) {
      errors.name = ["Spa name is required."];
    }
    if (slug.trim() && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())) {
      errors.slug = ["Slug must contain only lowercase letters, numbers, and hyphens."];
    }
    if (!ownerName.trim()) {
      errors.owner_name = ["Owner name is required."];
    }
    if (!ownerEmail.trim()) {
      errors.owner_email = ["Owner email is required."];
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail.trim())) {
      errors.owner_email = ["Please enter a valid email address."];
    }
    if (!ownerPassword.trim()) {
      errors.owner_password = ["Password is required."];
    } else if (ownerPassword.length < 8) {
      errors.owner_password = ["Password must be at least 8 characters."];
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    const passwordToSave = ownerPassword;

    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        owner_name: ownerName.trim(),
        owner_email: ownerEmail.trim(),
        owner_password: passwordToSave,
      };

      const res = await apiFetch<CreatedSpaResponse>("/platform/spas", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Show the credentials confirmation screen
      setCreatedCredentials({
        spaName: res.spa.name,
        spaSlug: res.spa.slug,
        ownerName: res.owner.name,
        ownerEmail: res.owner.email,
        password: passwordToSave,
      });

      toast.success(res.message || "Spa created successfully.");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 422 && err.errors) {
          setFieldErrors(err.errors);
          const firstErrKey = Object.keys(err.errors)[0];
          if (firstErrKey && err.errors[firstErrKey][0]) {
            toast.error(err.errors[firstErrKey][0]);
          }
        } else {
          toast.error(err.message || "Failed to create spa.");
        }
      } else {
        toast.error("Failed to create spa. Please check your connection.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // If credentials confirmation screen is active
  if (createdCredentials) {
    return (
      <SlideOver
        open={open}
        onClose={() => {
          toast.error("Please confirm you have saved the password by clicking \"I've saved it\".");
        }}
        title="Spa Created Successfully"
        description="Save the owner credentials. The password is only displayed once."
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
          {/* Warning notice */}
          <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              This temporary password will <strong className="font-semibold">not be shown again</strong>. Please copy it and transmit it securely to the owner.
            </p>
          </div>

          {/* Spa Details */}
          <div className="bg-[#FAF8FC] border border-[#EAE4F2] rounded-xl p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#EAE4F2]/60">
              <span className="text-[#7A6F86]">Spa Name</span>
              <span className="font-semibold text-[#1A1626]">{createdCredentials.spaName}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-[#EAE4F2]/60">
              <span className="text-[#7A6F86]">Slug</span>
              <span className="font-mono text-[#7455A4]">/{createdCredentials.spaSlug}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-[#EAE4F2]/60">
              <span className="text-[#7A6F86]">Initial Owner</span>
              <span className="font-semibold text-[#1A1626]">{createdCredentials.ownerName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#7A6F86]">Owner Email</span>
              <span className="text-[#1A1626] font-mono">{createdCredentials.ownerEmail}</span>
            </div>
          </div>

          {/* Password Box */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#33283D]">
              Generated Password
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-sm tracking-wider text-[#1A1626] select-all break-all">
                {createdCredentials.password}
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
      title="Create New Spa"
      description="Provision a new tenant spa and assign its initial owner account."
      icon={
        <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#7455A4] flex items-center justify-center">
          <Building2 size={18} />
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
            form="create-spa-form"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#7455A4] hover:bg-[#63478e] shadow-sm transition-all disabled:opacity-50 cursor-pointer min-h-[40px] flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Spinner className="w-3.5 h-3.5 text-white" />
                <span>Provisioning...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Create Spa</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <form id="create-spa-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Spa Details Section */}
        <div className="pb-1">
          <h3 className="text-xs font-bold text-[#7455A4] uppercase tracking-wider">
            1. Spa Information
          </h3>
        </div>

        <FormField
          label="Spa Name"
          error={fieldErrors.name?.[0]}
          required
        >
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Lotus Wellness & Spa"
            className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[#EAE4F2] rounded-xl text-[#1A1626] placeholder-[#9275BC]/60 focus:outline-none focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4] transition-all min-h-[40px]"
            required
          />
        </FormField>

        <FormField
          label="Spa Slug"
          error={fieldErrors.slug?.[0]}
        >
          <div>
            <input
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="e.g. lotus-wellness"
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[#EAE4F2] rounded-xl text-[#1A1626] font-mono placeholder-[#9275BC]/60 focus:outline-none focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4] transition-all min-h-[40px]"
            />
            <p className="text-[11px] text-[#7A6F86] mt-1">
              Lowercase letters, digits, and hyphens. Auto-generated from name if left default.
            </p>
          </div>
        </FormField>

        {/* Owner Details Section */}
        <div className="pt-3 pb-1 border-t border-[#FAF8FC]">
          <h3 className="text-xs font-bold text-[#7455A4] uppercase tracking-wider">
            2. Initial Owner Account
          </h3>
          <p className="text-[11px] text-[#7A6F86] mt-0.5">
            This account will be assigned the Owner role for this spa.
          </p>
        </div>

        <FormField
          label="Owner Full Name"
          error={fieldErrors.owner_name?.[0]}
          required
        >
          <input
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="e.g. Sarah Jenkins"
            className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[#EAE4F2] rounded-xl text-[#1A1626] placeholder-[#9275BC]/60 focus:outline-none focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4] transition-all min-h-[40px]"
            required
          />
        </FormField>

        <FormField
          label="Owner Email Address"
          error={fieldErrors.owner_email?.[0]}
          required
        >
          <input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="owner@lotus-spa.com"
            className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[#EAE4F2] rounded-xl text-[#1A1626] placeholder-[#9275BC]/60 focus:outline-none focus:ring-2 focus:ring-[#7455A4]/20 focus:border-[#7455A4] transition-all min-h-[40px]"
            required
          />
        </FormField>

        {/* Password input with generator */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-[#33283D]">
              Owner Password <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleRegeneratePassword}
              className="text-[11px] font-semibold text-[#7455A4] hover:text-[#5a3e87] flex items-center gap-1 transition-colors cursor-pointer min-h-[28px]"
            >
              <RefreshCw size={11} />
              <span>Generate New</span>
            </button>
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="owner_password"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
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

          {fieldErrors.owner_password?.[0] ? (
            <p className="text-xs text-red-600 mt-1">
              {fieldErrors.owner_password[0]}
            </p>
          ) : (
            <p className="text-[11px] text-[#7A6F86]">
              A cryptographically strong 16-character password has been generated. You will have a chance to copy it before closing.
            </p>
          )}
        </div>
      </form>
    </SlideOver>
  );
}
