"use client";

import { useAuth } from "@/context/AuthContext";
import { ChangePasswordCard } from "@/components/account/ChangePasswordCard";
import { User, Mail, Shield } from "lucide-react";

export default function PlatformAccountPage() {
  const { user } = useAuth();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SU";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#1A1626] tracking-tight">Superuser Account</h1>
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-[#7455A4] border border-[#C9B8E2]/50">
            Platform Security
          </span>
        </div>
        <p className="text-sm text-[#7A6F86] mt-1">
          Manage your platform superuser credentials and session security
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-[#EAE4F2] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#FAF8FC] flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#F0EAF7] flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-[#7455A4]" />
          </div>
          <h2 className="text-sm font-semibold text-[#1A1626]">Superuser Profile</h2>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7455A4] to-[#9275BC] flex items-center justify-center shadow-md shadow-[#C9B8E2]/40 flex-shrink-0">
              <span className="text-white text-lg font-bold">{initials}</span>
            </div>
            <div>
              <p className="text-base font-semibold text-[#1A1626]">{user?.name}</p>
              <p className="text-sm text-[#7A6F86]">{user?.email}</p>
            </div>
          </div>

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
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#7A6F86] uppercase tracking-wider mb-1.5">
                Role & Privileges
              </label>
              <div className="text-sm font-medium text-[#1A1626] bg-[#FAF8FC] px-3.5 py-2.5 rounded-xl border border-[#EAE4F2] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#7455A4] flex-shrink-0" />
                <span>Superuser (Platform Administrator — all platform endpoints, zero tenant access)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reusable Password Change Card */}
      <ChangePasswordCard />
    </div>
  );
}
