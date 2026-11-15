import { Client, Reservation } from "@/types";
import { Mail, Phone, Calendar, Coins, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface ClientProfileCardProps {
  client: Client;
  reservations: Reservation[];
  totalSpend: number;
}

export function ClientProfileCard({
  client,
  reservations,
  totalSpend,
}: ClientProfileCardProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* Info Card */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EAE4F2] p-4 sm:p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#F0EAF7] border border-[#C9B8E2]/60 flex items-center justify-center text-[#7455A4] text-xl font-bold">
            {client.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#33283D] tracking-tight">{client.full_name}</h2>
            <div className="flex flex-wrap items-center gap-4 text-sm text-[#7A6F86] mt-1">
              <span className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-[#9275BC]" />
                {client.phone}
              </span>
              {client.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-[#9275BC]" />
                  {client.email}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#EAE4F2] text-sm">
          <div>
            <p className="text-xs font-semibold text-[#7A6F86] uppercase tracking-wider">Contact Email</p>
            <p className="text-[#33283D] mt-1 font-medium">{client.email || "No email registered"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#7A6F86] uppercase tracking-wider">Phone Number</p>
            <p className="text-[#33283D] mt-1 font-medium">{client.phone}</p>
          </div>
          {client.created_at && (
            <div>
              <p className="text-xs font-semibold text-[#7A6F86] uppercase tracking-wider">Joined Date</p>
              <p className="text-[#33283D] mt-1 font-medium">
                {new Date(client.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-[#7A6F86] uppercase tracking-wider">Client ID</p>
            <p className="text-[#33283D] mt-1 font-mono font-medium">#{client.id}</p>
          </div>
        </div>

        {client.notes && (
          <div className="pt-4 border-t border-[#EAE4F2]">
            <p className="text-xs font-semibold text-[#7A6F86] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#9275BC]" />
              Notes & Preferences
            </p>
            <p className="text-sm text-[#33283D] bg-[#FAF8FC] p-3.5 rounded-xl border border-[#EAE4F2] whitespace-pre-wrap">
              {client.notes}
            </p>
          </div>
        )}
      </div>

      {/* Stats Column */}
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
        <div className="bg-white rounded-2xl border border-[#EAE4F2] p-5 shadow-xs">
          <div className="flex items-center gap-3 text-[#7455A4] mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#F0EAF7] flex items-center justify-center">
              <Calendar className="w-4 h-4 text-[#7455A4]" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#7A6F86]">
              Reservations
            </span>
          </div>
          <p className="text-3xl font-extrabold text-[#33283D]">{reservations.length}</p>
          <p className="text-xs text-[#7A6F86] mt-1">
            {reservations.filter((r) => r.status === "confirmed" || r.status === "pending").length} upcoming/active
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#EAE4F2] p-5 shadow-xs">
          <div className="flex items-center gap-3 text-[#91A68D] mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#91A68D]/15 flex items-center justify-center">
              <Coins className="w-4 h-4 text-[#91A68D]" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#7A6F86]">
              Total Spend
            </span>
          </div>
          <p className="text-3xl font-extrabold text-[#33283D]">{formatCurrency(totalSpend)}</p>
          <p className="text-xs text-[#7A6F86] mt-1">Excludes cancelled appointments</p>
        </div>
      </div>
    </div>
  );
}

