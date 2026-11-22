"use client";

import { useAuth } from "@/context/AuthContext";
import { ChangePasswordCard } from "@/components/account/ChangePasswordCard";
import {
  Building2,
  User,
  Mail,
  Sparkles,
  Globe,
  ShieldCheck,
} from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  const initials = user?.name
    ? user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
    : "?";

  const spaStatus = user?.spa?.status ?? "active";

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

      {/* Change Password Card (reused shared component) */}
      <ChangePasswordCard />

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
              <div className="text-sm font-medium text-[#1A1626] bg-[#FAF8FC] px-3.5 py-2.5 rounded-xl border border-[#EAE4F2] flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-[#7455A4] flex-shrink-0" />
                <span className="truncate">{user?.spa?.slug || "N/A"}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#7A6F86] uppercase tracking-wider mb-1.5">
                Tenant Status
              </label>
              <div className="text-sm font-medium text-[#1A1626] bg-[#FAF8FC] px-3.5 py-2.5 rounded-xl border border-[#EAE4F2] flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#7455A4] flex-shrink-0" />
                <span className="capitalize">{spaStatus}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
