"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { getSafeRedirectPath } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import {
  Building2,
  ShieldAlert,
  User,
  LogOut,
  Shield,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const navItems: NavItem[] = [
  { name: "Spas", href: "/platform", icon: Building2 },
  { name: "Audit", href: "/platform/audit", icon: ShieldAlert },
  { name: "Account", href: "/platform/account", icon: User },
];

export default function PlatformClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          const currentPath = window.location.pathname + window.location.search;
          const safeNext = getSafeRedirectPath(currentPath, null);
          router.replace(`/login?next=${encodeURIComponent(safeNext)}`);
        }
      } else if (user.role !== "superuser") {
        router.replace("/dashboard");
      }
    }
  }, [user, isLoading, router]);

  // Prevent flash of platform content while loading or if not superuser
  if (isLoading || !user || user.role !== "superuser") {
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

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "SU";

  return (
    <div className="min-h-screen bg-[#FAF8FC] flex text-[#33283D]">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex md:w-[260px] md:flex-col fixed inset-y-0 z-50">
        <div className="flex flex-col h-full bg-white border-r border-[#EAE4F2] shadow-sm">
          {/* Logo & Platform Header */}
          <div className="flex items-center justify-between px-6 h-18 border-b border-[#EAE4F2]/70 flex-shrink-0">
            <Image
              src="/logo.png"
              alt="Yospa logo"
              height={52}
              width={Math.round((52 * 1672) / 941)}
              className="object-contain"
            />
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-[#7455A4]/10 text-[#7455A4] border border-[#7455A4]/20">
              <Shield size={10} className="text-[#7455A4]" />
              Platform
            </span>
          </div>

          {/* Superuser Mode Badge */}
          <div className="px-4 pt-5 pb-3 flex-shrink-0">
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-purple-50/70 border border-purple-200/60 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7455A4] to-[#9275BC] flex items-center justify-center flex-shrink-0 text-white shadow-xs">
                <Shield size={14} />
              </div>
              <div className="truncate min-w-0">
                <p className="text-[10px] font-bold text-[#7455A4] uppercase tracking-wider leading-none">
                  Superuser Mode
                </p>
                <p className="text-xs font-semibold text-[#33283D] truncate mt-0.5">
                  Platform Console
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 pt-3 pb-1 text-[11px] font-semibold text-[#9275BC]/90 uppercase tracking-wider flex-shrink-0">
            Navigation
          </div>

          <nav className="mt-1 flex-1 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/platform"
                  ? pathname === "/platform" || pathname.startsWith("/platform/spas")
                  : pathname === item.href || pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
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
          </nav>

          {/* User profile footer */}
          <div className="flex-shrink-0 p-4 border-t border-[#EAE4F2] bg-white">
            <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-xl bg-[#FAF8FC] border border-[#EAE4F2]/80">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7455A4] to-[#9275BC] flex items-center justify-center flex-shrink-0 shadow-xs">
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
              <div className="truncate flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#33283D] truncate leading-tight">
                  {user.name}
                </p>
                <p className="text-[11px] text-[#9275BC] truncate leading-tight mt-0.5">
                  {user.email}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#6E627C] hover:text-red-600 hover:bg-red-50/80 border border-[#EAE4F2] hover:border-red-100 transition-all cursor-pointer min-h-[40px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Top Bar ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white/95 backdrop-blur-md border-b border-[#EAE4F2] flex items-center justify-between px-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Yospa logo"
            height={42}
            width={Math.round((42 * 1672) / 941)}
            className="object-contain"
          />
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-[#7455A4]/10 text-[#7455A4] border border-[#7455A4]/20">
            Platform
          </span>
        </div>
        <button
          onClick={logout}
          aria-label="Sign out"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#6E627C] hover:text-red-600 hover:bg-red-50 transition-colors min-h-[40px] cursor-pointer"
        >
          <LogOut size={14} />
          <span>Exit</span>
        </button>
      </header>

      {/* ── Main Content Area ── */}
      <main className="flex-1 md:pl-[260px] flex flex-col min-h-screen">
        <div className="flex-1 pt-18 md:pt-6 pb-20 md:pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Navigation Bar ── */}
      <nav
        aria-label="Platform mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 backdrop-blur-md border-t border-[#EAE4F2] flex items-center justify-around px-2 shadow-lg"
      >
        {navItems.map((item) => {
          const isActive =
            item.href === "/platform"
              ? pathname === "/platform" || pathname.startsWith("/platform/spas")
              : pathname === item.href || pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex-1 min-w-0 min-h-[48px] flex flex-col items-center justify-center gap-1 py-1 px-1 text-[11px] font-semibold tracking-tight transition-colors ${
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
    </div>
  );
}
