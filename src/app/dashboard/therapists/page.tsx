"use client";

import { useAuth } from "@/context/AuthContext";
import { Spinner } from "@/components/ui/Spinner";
import { UserCheck } from "lucide-react";

export default function TherapistsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Spinner className="w-8 h-8 text-[#7455A4]" />
        <span className="text-xs text-[#7A6F86] mt-2 font-medium">Loading therapists...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#33283D] tracking-tight">Therapists</h1>
          <p className="text-sm text-[#7A6F86] mt-0.5">
            Manage your massage therapists, specialists, and roster
          </p>
        </div>
      </div>

      <div className="text-center py-20 px-4 bg-white border border-[#EAE4F2] rounded-2xl shadow-xs space-y-3">
        <UserCheck className="w-10 h-10 text-[#C9B8E2] mx-auto" />
        <h3 className="text-sm font-semibold text-[#33283D]">Therapists Section Ready</h3>
        <p className="text-xs text-[#7A6F86] max-w-sm mx-auto">
          Therapists management and assignment controls will be loaded here.
        </p>
      </div>
    </div>
  );
}
