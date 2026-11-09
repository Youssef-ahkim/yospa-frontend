import Link from "next/link";
import { Users, Calendar, ShieldCheck } from "lucide-react";
import { Sparkles } from "lucide-react";
import { NavAuthButton, HeroAuthButton, FooterAuthLink } from "@/components/AuthButtons";

async function CurrentYear() {
  "use cache";
  return <>{new Date().getFullYear()}</>;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col justify-between">
      {/* Navbar */}
      <header className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md shadow-indigo-100">
            Y
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">Yospa</span>
        </div>
        <div>
          <NavAuthButton />
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Modern Spa & Gym Management
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-gray-900 max-w-3xl mx-auto leading-tight">
            Streamline your spa operations with{" "}
            <span className="text-indigo-600">precision</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            A powerful multi-tenant platform designed to manage clients, track reservations, and scale your wellness business seamlessly.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <HeroAuthButton />
          </div>
        </div>

        {/* Features Grid */}
        <div className="bg-gray-50 py-20 border-t border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Client Management</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Keep detailed customer records, view contact details, and seamlessly onboard new members to your spa.
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Reservation Tracking</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Monitor service schedules, check live booking statuses, and manage pricing in real-time.
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Multi-Tenant Security</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Enterprise-grade data isolation ensuring your facility data remains private, secure, and scoped.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500 border-t border-gray-100">
        <p>© <CurrentYear /> Yospa Management. All rights reserved.</p>
        <div className="flex items-center gap-6 mt-4 sm:mt-0">
          <FooterAuthLink />
        </div>
      </footer>
    </div>
  );
}