import Link from "next/link";
import { Compass, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAF8FC] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#EAE4F2] shadow-sm p-8 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-[#F0EAF7] text-[#7455A4] flex items-center justify-center mx-auto">
          <Compass className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#1A1626] tracking-tight">Page Not Found</h1>
          <p className="text-sm text-[#7A6F86]">
            The page you are looking for does not exist or may have been moved.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#7455A4] hover:bg-[#5B3A82] text-white text-sm font-semibold shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
