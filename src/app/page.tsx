import Link from "next/link";
import { Users, Calendar, ShieldCheck, Sparkles, ArrowRight, Zap } from "lucide-react";
import { NavAuthButton, HeroAuthButton, FooterAuthLink } from "@/components/AuthButtons";

async function CurrentYear() {
  "use cache";
  return <>{new Date().getFullYear()}</>;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100/80">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-200/50">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900">Yospa</span>
          </div>
          <NavAuthButton />
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <div className="relative overflow-hidden">
          {/* Background gradient blobs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-indigo-100 to-violet-100 rounded-full blur-3xl opacity-60" />
            <div className="absolute top-20 -left-20 w-96 h-96 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full blur-3xl opacity-50" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-36 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/70 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-8 shadow-sm">
              <Zap className="w-3.5 h-3.5 fill-indigo-500 text-indigo-500" />
              Modern Spa &amp; Gym Management
            </div>
            <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-gray-900 max-w-4xl mx-auto leading-[1.08]">
              Run your spa{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                smarter.
              </span>
            </h1>
            <p className="mt-7 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
              A powerful multi-tenant platform to manage clients, track reservations, monitor revenue, and scale your wellness business — all in one place.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <HeroAuthButton />
              <Link
                href="#features"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-base font-medium text-gray-700 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 shadow-sm transition-all"
              >
                See features
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Stats row */}
            <div className="mt-16 flex flex-wrap justify-center gap-8 sm:gap-16">
              {[
                { label: "Clients managed", value: "10,000+" },
                { label: "Reservations tracked", value: "50,000+" },
                { label: "Uptime", value: "99.9%" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-1 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div id="features" className="py-24 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                Everything you need to run your spa
              </h2>
              <p className="mt-3 text-gray-500 text-base max-w-xl mx-auto">
                Built for spa and gym managers who want a clean, fast, and reliable tool.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: Users,
                  title: "Client Management",
                  description: "Keep rich customer profiles, view appointment histories, contact details, and onboard new members effortlessly.",
                  color: "indigo",
                },
                {
                  icon: Calendar,
                  title: "Reservation Tracking",
                  description: "Monitor schedules in a visual calendar, manage booking statuses, and get instant overviews of your daily operations.",
                  color: "violet",
                },
                {
                  icon: ShieldCheck,
                  title: "Multi-Tenant Security",
                  description: "Enterprise-grade tenant isolation keeps each facility's data private, secure, and completely scoped to their account.",
                  color: "blue",
                },
              ].map(({ icon: Icon, title, description, color }) => (
                <div
                  key={title}
                  className="group bg-white p-7 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 space-y-4"
                >
                  <div className={`w-11 h-11 rounded-xl bg-${color}-50 flex items-center justify-center text-${color}-600 group-hover:bg-${color}-100 transition-colors`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-20 border-t border-gray-100 bg-gradient-to-br from-indigo-600 to-violet-700">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Ready to streamline your operations?
            </h2>
            <p className="mt-4 text-indigo-200 text-base">
              Join spa managers who trust Yospa to run their businesses every day.
            </p>
            <div className="mt-8">
              <HeroAuthButton />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-md flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span>© <CurrentYear /> Yospa Management. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <FooterAuthLink />
          </div>
        </div>
      </footer>
    </div>
  );
}
