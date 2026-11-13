"use client";

import { useEffect, Suspense, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getSafeRedirectPath } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import Image from "next/image";
import {
  Users,
  Calendar,
  Settings,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: any;
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clients", href: "/dashboard/clients", icon: Users },
  { name: "Reservations", href: "/dashboard/reservations", icon: Calendar },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {navigation.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-150 ${
              isActive
                ? "bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 shadow-sm border border-indigo-100/80"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <Icon
              size={18}
              className={`flex-shrink-0 ${
                isActive ? "text-indigo-600" : "text-gray-400"
              }`}
            />
            <span className="flex-1">{item.name}</span>
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
            )}
          </Link>
        );
      })}
    </>
  );
}

function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 flex md:hidden safe-area-pb">
      {navigation.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
              isActive ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <div
              className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors ${
                isActive ? "bg-indigo-50" : ""
              }`}
            >
              <Icon size={16} />
            </div>
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        const currentPath = window.location.pathname + window.location.search;
        const safeNext = getSafeRedirectPath(currentPath);
        router.replace(`/login?next=${encodeURIComponent(safeNext)}`);
      }
    }
  }, [user, isLoading, router]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  // Prevent flash of protected content while session is loading or if user is invalid.
  // Nothing from the dashboard shell or children renders until user is validated.
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc]">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/logo.png"
            alt="Yospa logo"
            height={64}
            width={Math.round((64 * 1672) / 941)}
            className="object-contain"
            priority
          />
          <Spinner className="w-6 h-6 text-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex">
      {/* ── Desktop Sidebar ── */}
      <div className="hidden md:flex md:w-[260px] md:flex-col fixed inset-y-0 z-50">
        <div className="flex flex-col h-full bg-white border-r border-gray-200/80 shadow-sm">
          {/* Logo */}
          <div className="flex items-center px-5 h-16 border-b border-gray-100 flex-shrink-0">
            <Image src="/logo.png" alt="Yospa logo" height={64} width={Math.round(64 * 1672 / 941)} className="object-contain" />
          </div>

          {/* Spa badge */}
          <div className="px-4 pt-4 pb-2 flex-shrink-0">
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100/70">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[10px] font-bold">S</span>
              </div>
              <div className="truncate min-w-0">
                <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider leading-none">
                  Active Spa
                </p>
                <p className="text-sm font-semibold text-gray-800 truncate mt-0.5">
                  {user?.spa?.name ?? (isLoading ? "Loading..." : "No Spa Assigned")}
                </p>
              </div>
            </div>
          </div>

          <p className="px-6 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex-shrink-0">
            Navigation
          </p>

          <Suspense
            fallback={
              <nav className="flex-1 px-3 space-y-0.5">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-gray-600 hover:bg-gray-50"
                    >
                      <Icon size={18} className="text-gray-400" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            }
          >
            <nav className="mt-2 flex-1 px-3 space-y-0.5">
              <NavLinks />
            </nav>
          </Suspense>

          <div className="flex-1" />

          {/* User footer */}
          <div className="flex-shrink-0 p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 px-2 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
              <div className="truncate flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                  {user?.name || (isLoading ? "Loading..." : "User")}
                </p>
                <p className="text-xs text-gray-400 truncate leading-tight">
                  {user?.email || (isLoading ? "..." : "")}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-100 transition-all duration-150 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Top Bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white/95 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center">
          <Image src="/logo.png" alt="Yospa logo" height={52} width={Math.round(52 * 1672 / 941)} className="object-contain" />
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── Mobile Drawer ── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={closeDrawer}
          />
          {/* Panel */}
          <div className="md:hidden fixed top-0 right-0 bottom-0 z-50 w-72 bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center">
                <Image src="/logo.png" alt="Yospa logo" height={52} width={Math.round(52 * 1672 / 941)} className="object-contain" />
              </div>
              <button
                onClick={closeDrawer}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Spa badge */}
            <div className="px-4 pt-4 pb-2 flex-shrink-0">
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100/70">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[10px] font-bold">S</span>
                </div>
                <div className="truncate min-w-0">
                  <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider leading-none">
                    Active Spa
                  </p>
                  <p className="text-sm font-semibold text-gray-800 truncate mt-0.5">
                    {user?.spa?.name ?? "No Spa Assigned"}
                  </p>
                </div>
              </div>
            </div>

            <p className="px-5 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex-shrink-0">
              Navigation
            </p>

            <nav className="flex-1 overflow-y-auto px-3 space-y-0.5 pb-4">
              <Suspense fallback={null}>
                <NavLinks onNavigate={closeDrawer} />
              </Suspense>
            </nav>

            {/* User + logout */}
            <div className="flex-shrink-0 p-4 border-t border-gray-100">
              <div className="flex items-center gap-3 px-2 py-2 mb-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-white text-sm font-bold">{initials}</span>
                </div>
                <div className="truncate flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-gray-400 truncate leading-tight">
                    {user?.email || ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { logout(); closeDrawer(); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-100 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 md:pl-[260px] flex flex-col min-h-screen">
        <main className="flex-1 pb-24 md:pb-10 pt-14 md:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile Bottom Tab Bar ── */}
      <Suspense fallback={null}>
        <BottomTabBar />
      </Suspense>
    </div>
  );
}
