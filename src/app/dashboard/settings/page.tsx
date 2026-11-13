"use client";

import { useAuth } from "@/context/AuthContext";
import { Building2, User, Shield, Mail, Sparkles } from "lucide-react";

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

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account preferences and tenant details
        </p>
      </div>

      {/* Profile card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <h2 className="text-sm font-semibold text-gray-900">Profile Information</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar + name row */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-200/40 flex-shrink-0">
              <span className="text-white text-lg font-bold">{initials}</span>
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-400">{user?.email}</p>
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="text-sm font-medium text-gray-800 bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-200">
                {user?.name}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="text-sm font-medium text-gray-800 bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-200 flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {user?.email}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spa / Tenant card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <h2 className="text-sm font-semibold text-gray-900">Spa &amp; Tenant Details</h2>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Active Spa Name
              </label>
              <div className="text-sm font-medium text-gray-800 bg-gradient-to-r from-indigo-50 to-violet-50 px-3.5 py-2.5 rounded-xl border border-indigo-100 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                {user?.spa?.name || "N/A"}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Spa ID (Tenant Scope)
              </label>
              <div className="text-sm font-medium text-gray-800 bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-200 flex items-center gap-2 font-mono">
                <Shield className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span className="text-gray-500">ID:</span>
                <span>{user?.spa?.id || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info note */}
      <p className="text-xs text-gray-400 text-center px-4">
        Account details are managed by your administrator. Contact support to make changes.
      </p>
    </div>
  );
}
