"use client";

import { useAuth } from "@/context/AuthContext";

export default function PlatformAccountPlaceholderPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#1A1626] tracking-tight">Superuser Account</h1>
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-[#7455A4] border border-[#C9B8E2]/50">
            Platform Security
          </span>
        </div>
        <p className="text-sm text-[#7A6F86] mt-0.5">
          Manage your platform superuser credentials and session security
        </p>
      </div>

      <div className="bg-white border border-[#EAE4F2] rounded-2xl p-6 shadow-xs max-w-xl space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7455A4] to-[#9275BC] flex items-center justify-center text-white font-bold text-base shadow-xs">
            SU
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#1A1626]">{user?.name}</h2>
            <p className="text-xs text-[#7A6F86]">{user?.email}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-[#FAF8FC] text-xs text-[#7A6F86]">
          Password change and security settings will be fully integrated in Step 5 using the shared ChangePasswordCard component.
        </div>
      </div>
    </div>
  );
}
