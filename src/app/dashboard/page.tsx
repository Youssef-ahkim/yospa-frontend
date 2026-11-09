"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { Users, Calendar, ArrowRight, Clock, Loader2 } from "lucide-react";

interface Client {
  id: number;
  full_name?: string;
  name?: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

interface Reservation {
  id: number;
  client?: {
    full_name?: string;
    name?: string;
    email?: string | null;
  } | null;
  service?: {
    name?: string;
  } | null;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  start_time?: string;
  starts_at?: string;
  total_price?: number | string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadOverviewData = async () => {
      try {
        setIsLoading(true);
        const [clientsData, reservationsData] = await Promise.allSettled([
          apiFetch<Client[]>("/clients"),
          apiFetch<Reservation[]>("/reservations"),
        ]);

        if (clientsData.status === "fulfilled") {
          setClients(clientsData.value || []);
        }
        if (reservationsData.status === "fulfilled") {
          setReservations(reservationsData.value || []);
        }
      } catch (err) {
        console.error("Failed to load dashboard overview data", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadOverviewData();
  }, []);

  const recentReservations = reservations.slice(0, 5);
  const recentClients = clients.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Here is an overview of your spa management portal.
        </p>
      </div>

      {/* Metric / Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/dashboard/clients"
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:border-indigo-300 transition-all flex items-center justify-between group"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {isLoading ? "..." : clients.length}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Manage Clients</h2>
            <p className="text-sm text-gray-500">View, search, and add new client records.</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/dashboard/reservations"
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:border-indigo-300 transition-all flex items-center justify-between group"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {isLoading ? "..." : reservations.length}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Reservations</h2>
            <p className="text-sm text-gray-500">Check upcoming appointments and booking statuses.</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Recent Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reservations */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Reservations</h2>
            <Link
              href="/dashboard/reservations"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              View all
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
            </div>
          ) : recentReservations.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No reservations found.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentReservations.map((res) => {
                const clientName = res.client?.full_name || res.client?.name || "Client";
                const serviceName = res.service?.name || "Service";
                const startTime = res.start_time || res.starts_at;

                return (
                  <div key={res.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{clientName}</p>
                      <p className="text-xs text-gray-500">{serviceName}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs px-2 py-0.5 rounded-full capitalize font-medium bg-gray-100 text-gray-700">
                        {res.status}
                      </span>
                      {startTime && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" />
                          {new Date(startTime).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Clients */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Clients</h2>
            <Link
              href="/dashboard/clients"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              View all
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
            </div>
          ) : recentClients.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No clients found.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentClients.map((client) => (
                <div key={client.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {client.full_name || client.name}
                    </p>
                    <p className="text-xs text-gray-500">{client.email || "No email"}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    {client.phone || "No phone"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
