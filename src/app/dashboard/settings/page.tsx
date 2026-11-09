"use client";

import { useAuth } from "@/context/AuthContext";
import { Building2, User, Shield, Mail } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account preferences and view active tenant details
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y divide-gray-200">
        {/* Profile Section */}
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            Profile Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase">Full Name</label>
              <div className="mt-1 text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                {user?.name}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase">Email Address</label>
              <div className="mt-1 text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                {user?.email}
              </div>
            </div>
          </div>
        </div>

        {/* Spa / Tenant Section */}
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Spa & Multi-Tenant Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase">Active Spa Name</label>
              <div className="mt-1 text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                {user?.spa?.name || "N/A"}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase">Spa ID (Tenant Scope)</label>
              <div className="mt-1 text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-500" />
                ID: {user?.spa?.id || "N/A"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}