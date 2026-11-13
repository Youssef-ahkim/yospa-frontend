import { Client, Reservation } from "@/types";
import { Mail, Phone, Calendar, DollarSign, FileText } from "lucide-react";

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
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-xl font-bold">
            {client.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{client.full_name}</h2>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-gray-400" />
                {client.phone}
              </span>
              {client.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {client.email}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100 text-sm">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Contact Email</p>
            <p className="text-gray-900 mt-1 font-medium">{client.email || "No email registered"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Phone Number</p>
            <p className="text-gray-900 mt-1 font-medium">{client.phone}</p>
          </div>
          {client.created_at && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Joined Date</p>
              <p className="text-gray-900 mt-1 font-medium">
                {new Date(client.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Client ID</p>
            <p className="text-gray-900 mt-1 font-medium">#{client.id}</p>
          </div>
        </div>

        {client.notes && (
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              Notes & Preferences
            </p>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">
              {client.notes}
            </p>
          </div>
        )}
      </div>

      {/* Stats Column */}
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center gap-3 text-indigo-600 mb-2">
            <Calendar className="w-5 h-5" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Reservations
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{reservations.length}</p>
          <p className="text-xs text-gray-500 mt-1">
            {reservations.filter((r) => r.status === "confirmed" || r.status === "pending").length} upcoming/active
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center gap-3 text-emerald-600 mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Total Spend
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900">${totalSpend.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Excludes cancelled appointments</p>
        </div>
      </div>
    </div>
  );
}

