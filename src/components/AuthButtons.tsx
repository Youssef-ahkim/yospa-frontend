"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, LayoutDashboard } from "lucide-react";

export function NavAuthButton() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-9 w-20 bg-gray-100 rounded-lg animate-pulse" />;
  }

  if (user) {
    return (
      <Link
        href="/dashboard"
        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
      >
        <LayoutDashboard className="w-4 h-4" />
        Dashboard
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
    >
      Sign in
    </Link>
  );
}

export function HeroAuthButton() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-12 w-36 bg-gray-100 rounded-xl animate-pulse" />;
  }

  if (user) {
    return (
      <Link
        href="/dashboard"
        className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent rounded-xl text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
      >
        Go to Dashboard
        <ArrowRight className="w-4 h-4" />
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent rounded-xl text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
    >
      Get Started
      <ArrowRight className="w-4 h-4" />
    </Link>
  );
}

export function FooterAuthLink() {
  const { user } = useAuth();

  return (
    <Link
      href={user ? "/dashboard" : "/login"}
      className="hover:text-gray-900 transition-colors"
    >
      {user ? "Dashboard" : "Sign In"}
    </Link>
  );
}

