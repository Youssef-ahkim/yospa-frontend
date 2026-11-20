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
  Sparkles,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: any;
}

const navigation: NavItem[] = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clients", href: "/dashboard/clients", icon: Users },
  { name: "Reservations", href: "/dashboard/reservations", icon: Calendar },
  { name: "Services", href: "/dashboard/services", icon: Sparkles },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="space-y-1">
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
            className={`flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-xl transition-all duration-150 ${
              isActive
                ? "bg-[#F0EAF7] text-[#7455A4] font-semibold border border-[#C9B8E2]/50 shadow-xs"
                : "text-[#33283D]/80 hover:bg-[#F0EAF7]/50 hover:text-[#7455A4]"
            }`}
          >
            <Icon
              size={18}
              className={`flex-shrink-0 transition-colors ${
                isActive ? "text-[#7455A4]" : "text-[#9275BC]"
              }`}
            />
            <span className="flex-1">{item.name}</span>
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#7455A4] flex-shrink-0" />
            )}
          </Link>
        );
      })}
    </div>
  );
}

function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#EAE4F2] flex md:hidden safe-area-pb shadow-lg">
      {navigation.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-2 px-1 text-[10px] font-semibold tracking-tight transition-colors ${
              isActive ? "text-[#7455A4]" : "text-[#7A6F86] hover:text-[#33283D]"
            }`}
          >
            <div
              className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors ${
                isActive ? "bg-[#F0EAF7]" : ""
              }`}
            >
              <Icon size={16} />
            </div>
            <span className="truncate max-w-full text-center">{item.name}</span>
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
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8FC]">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/logo.png"
            alt="Yospa logo"
            height={64}
            width={Math.round((64 * 1672) / 941)}
            className="object-contain"
            priority
          />
          <Spinner className="w-6 h-6 text-[#7455A4]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8FC] flex text-[#33283D]">
      {/* ── Desktop Sidebar ── */}
      <div className="hidden md:flex md:w-[260px] md:flex-col fixed inset-y-0 z-50">
        <div className="flex flex-col h-full bg-white border-r border-[#EAE4F2] shadow-sm">
          {/* Logo Header */}
          <div className="flex items-center px-6 h-18 border-b border-[#EAE4F2]/70 flex-shrink-0">
            <Image
              src="/logo.png"
              alt="Yospa logo"
              height={56}
              width={Math.round((56 * 1672) / 941)}
              className="object-contain"
            />
          </div>

          {/* Active Spa Badge */}
          <div className="px-4 pt-5 pb-3 flex-shrink-0">
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#FAF8FC] border border-[#C9B8E2]/60 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7455A4] to-[#9275BC] flex items-center justify-center flex-shrink-0 text-white shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="truncate min-w-0">
                <p className="text-[10px] font-semibold text-[#7455A4] uppercase tracking-wider leading-none">
                  Active Spa
                </p>
                <p className="text-xs font-semibold text-[#33283D] truncate mt-0.5">
                  {user?.spa?.name ?? (isLoading ? "Loading..." : "No Spa Assigned")}
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 pt-3 pb-1 text-[11px] font-semibold text-[#9275BC]/90 uppercase tracking-wider flex-shrink-0">
            Main Menu
          </div>

          <Suspense fallback={null}>
            <nav className="mt-1 flex-1 px-3">
              <NavLinks />
            </nav>
          </Suspense>

          <div className="flex-1" />

          {/* User profile footer */}
          <div className="flex-shrink-0 p-4 border-t border-[#EAE4F2] bg-white">
            <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-xl bg-[#FAF8FC] border border-[#EAE4F2]/80">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7455A4] to-[#9275BC] flex items-center justify-center flex-shrink-0 shadow-xs">
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
              <div className="truncate flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#33283D] truncate leading-tight">
                  {user?.name || (isLoading ? "Loading..." : "User")}
                </p>
                <p className="text-[11px] text-[#9275BC] truncate leading-tight mt-0.5">
                  {user?.email || (isLoading ? "..." : "")}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#6E627C] hover:text-red-600 hover:bg-red-50/80 border border-[#EAE4F2] hover:border-red-100 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Top Bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white/95 backdrop-blur-md border-b border-[#EAE4F2] flex items-center justify-between px-4 shadow-xs">
        <div className="flex items-center">
          <Image
            src="/logo.png"
            alt="Yospa logo"
            height={46}
            width={Math.round((46 * 1672) / 941)}
            className="object-contain"
          />
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-xl text-[#33283D] hover:bg-[#F0EAF7] transition-colors cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── Mobile Drawer ── */}
      {drawerOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-50 bg-[#33283D]/30 backdrop-blur-xs"
            onClick={closeDrawer}
          />
          <div className="md:hidden fixed top-0 right-0 bottom-0 z-50 w-72 bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 h-14 border-b border-[#EAE4F2] flex-shrink-0">
              <Image
                src="/logo.png"
                alt="Yospa logo"
                height={46}
                width={Math.round((46 * 1672) / 941)}
                className="object-contain"
              />
              <button
                onClick={closeDrawer}
                className="p-1.5 rounded-lg text-[#7A6F86] hover:text-[#33283D] hover:bg-[#F0EAF7] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 pt-4 pb-2 flex-shrink-0">
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#FAF8FC] border border-[#C9B8E2]/60">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7455A4] to-[#9275BC] flex items-center justify-center flex-shrink-0 text-white">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="truncate min-w-0">
                  <p className="text-[10px] font-semibold text-[#7455A4] uppercase tracking-wider leading-none">
                    Active Spa
                  </p>
                  <p className="text-sm font-semibold text-[#33283D] truncate mt-0.5">
                    {user?.spa?.name ?? "No Spa Assigned"}
                  </p>
                </div>
              </div>
            </div>

            <p className="px-5 pt-3 pb-1 text-[11px] font-semibold text-[#9275BC] uppercase tracking-wider flex-shrink-0">
              Main Menu
            </p>

            <nav className="flex-1 overflow-y-auto px-3 space-y-1 pb-4">
              <Suspense fallback={null}>
                <NavLinks onNavigate={closeDrawer} />
              </Suspense>
            </nav>

            <div className="flex-shrink-0 p-4 border-t border-[#EAE4F2]">
              <div className="flex items-center gap-3 px-2 py-2 mb-3 bg-[#FAF8FC] rounded-xl border border-[#EAE4F2]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7455A4] to-[#9275BC] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                  {initials}
                </div>
                <div className="truncate flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#33283D] truncate leading-tight">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-[#9275BC] truncate leading-tight">
                    {user?.email || ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { logout(); closeDrawer(); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#6E627C] hover:text-red-600 hover:bg-red-50 border border-[#EAE4F2] transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 md:pl-[260px] flex flex-col min-h-screen">
        <main className="flex-1 pb-24 md:pb-12 pt-14 md:pt-0">
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
