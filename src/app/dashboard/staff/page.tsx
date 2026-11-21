"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/lib/permissions";
import { Spinner } from "@/components/ui/Spinner";
import { ShieldAlert, ArrowLeft, Users } from "lucide-react";

export default function StaffPage() {
  const { user, isLoading } = useAuth();
  const { canManageStaff } = usePermissions();

  // Wait for session and user resolution before deciding to prevent flash of restricted state
  if (isLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Spinner className="w-8 h-8 text-[#7455A4]" />
        <span className="text-xs text-[#7A6F86] mt-2 font-medium">Checking permissions...</span>
      </div>
    );
  }

  // Friendly restricted access message for staff members
  if (!canManageStaff) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#F0EAF7] border border-[#C9B8E2]/60 flex items-center justify-center mx-auto text-[#7455A4] shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-[#33283D]">Access Restricted</h2>
          <p className="text-xs text-[#7A6F86] leading-relaxed">
            You do not have permission to view or manage staff accounts. This section is restricted to owners and administrators.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7455A4] hover:bg-[#5E4387] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Overview</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#33283D] tracking-tight">Staff Management</h1>
          <p className="text-sm text-[#7A6F86] mt-0.5">
            Manage your team accounts, credentials, and access roles
          </p>
        </div>
      </div>

      <div className="text-center py-20 px-4 bg-white border border-[#EAE4F2] rounded-2xl shadow-xs space-y-3">
        <Users className="w-10 h-10 text-[#C9B8E2] mx-auto" />
        <h3 className="text-sm font-semibold text-[#33283D]">Staff Section Ready</h3>
        <p className="text-xs text-[#7A6F86] max-w-sm mx-auto">
          Staff management accounts and controls will be loaded here.
        </p>
      </div>
    </div>
  );
}
