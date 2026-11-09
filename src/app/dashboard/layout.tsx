"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { 
  Users, 
  Calendar, 
  Settings, 
  LogOut, 
  LayoutDashboard, 
  Building2 
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Clients", href: "/dashboard/clients", icon: Users },
    { name: "Reservations", href: "/dashboard/reservations", icon: Calendar },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col fixed inset-y-0 z-50 bg-white border-r border-gray-200">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-6">
            <h1 className="text-xl font-bold text-indigo-600">Yospa Portal</h1>
          </div>
          
          <div className="mt-6 px-4">
            <div className="flex items-center gap-3 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-100">
              <Building2 className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <div className="truncate">
                <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider">Active Spa</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.spa?.name ?? (isLoading ? "Loading..." : "No Spa Assigned")}
                </p>
              </div>
            </div>
          </div>

          <nav className="mt-6 flex-1 px-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer / Logout */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="truncate">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || (isLoading ? "Loading..." : "User")}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email || (isLoading ? "..." : "")}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-4 h-4 text-gray-500" />
            Sign out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col">
        <main className="flex-1 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}