"use client";

import { ShieldAlert } from "lucide-react";

export default function PlatformAuditPlaceholderPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#1A1626] tracking-tight">Platform Audit Logs</h1>
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-[#7455A4] border border-[#C9B8E2]/50">
            Security & Compliance
          </span>
        </div>
        <p className="text-sm text-[#7A6F86] mt-0.5">
          System-wide audit trail of administrative actions, spa provisioning, and user alterations
        </p>
      </div>

      <div className="bg-white border border-[#EAE4F2] rounded-2xl p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#7455A4] flex items-center justify-center mx-auto mb-3">
          <ShieldAlert size={24} />
        </div>
        <h2 className="text-base font-semibold text-[#1A1626]">Audit Trail Log Viewer</h2>
        <p className="text-xs text-[#7A6F86] mt-1 max-w-md mx-auto">
          The full platform audit log interface with real-time metadata inspector will be enabled in Step 5.
        </p>
      </div>
    </div>
  );
}
