"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { Client } from "@/types";
import { useToast } from "@/context/ToastContext";
import { SlideOver } from "@/components/ui/SlideOver";
import { FormField } from "@/components/ui/FormField";
import { Spinner } from "@/components/ui/Spinner";
import {
  UserPlus,
  Search,
  X,
  Mail,
  Phone,
  ChevronRight,
  Users,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

export default function ClientsPage() {
  const toast = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    notes: "",
  });

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiFetch<Client[]>("/clients");
      setClients(data);
    } catch (err: any) {
      setError(err.message || "Failed to load clients.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const openModal = () => {
    setFieldErrors({});
    setFormData({ full_name: "", email: "", phone: "", notes: "" });
    setIsModalOpen(true);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const payload = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        notes: formData.notes.trim() || null,
      };

      const response = await apiFetch<{ message: string; client: Client }>("/clients", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const newClient = response.client || (response as any);
      setClients((prev) => [newClient, ...prev]);
      setIsModalOpen(false);
      setFormData({ full_name: "", email: "", phone: "", notes: "" });
      toast.success("Client created successfully.");
    } catch (err: any) {
      if (err instanceof ApiError && err.errors) {
        setFieldErrors(err.errors);
      }
      toast.error(err.message || "Failed to create client. Please check the inputs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClients = clients.filter((client) => {
    const clientName = client.full_name || "";
    const clientEmail = client.email || "";
    const clientPhone = client.phone || "";
    const query = searchQuery.toLowerCase();
    return (
      clientName.toLowerCase().includes(query) ||
      clientEmail.toLowerCase().includes(query) ||
      clientPhone.includes(searchQuery)
    );
  });

  const inputClass = (field: string) =>
    `w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
      fieldErrors[field]
        ? "border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50"
        : "border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-300 bg-white"
    }`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your spa members and customer contacts
          </p>
        </div>
        <button
          onClick={openModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-200/50 transition-all duration-200 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white shadow-sm hover:border-gray-300 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button
            onClick={fetchClients}
            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 transition-colors cursor-pointer flex-shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Loading / List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <Spinner className="w-6 h-6 text-indigo-500 mb-3" />
          <p className="text-sm text-gray-400">Loading clients...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            {searchQuery ? "No clients match your search." : "No clients yet."}
          </p>
          {!searchQuery && (
            <p className="text-xs text-gray-400 mt-1">Add your first client to get started.</p>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                  Joined
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <Link href={`/dashboard/clients/${client.id}`} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-indigo-600">
                          {(client.full_name || "?")[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors">
                        {client.full_name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex flex-col gap-0.5 text-sm text-gray-500">
                      {client.email ? (
                        <span className="flex items-center gap-1.5 text-xs">
                          <Mail className="w-3 h-3 text-gray-300" />
                          {client.email}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 italic">No email</span>
                      )}
                      {client.phone && (
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Phone className="w-3 h-3 text-gray-300" />
                          {client.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-400 hidden sm:table-cell">
                    {client.created_at ? new Date(client.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right">
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      View
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Showing <span className="font-semibold text-gray-600">{filteredClients.length}</span> of{" "}
              <span className="font-semibold text-gray-600">{clients.length}</span> clients
            </p>
          </div>
        </div>
      )}

      {/* Add Client Slide-Over */}
      <SlideOver
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Client"
        description="Fill in the client's details below"
        icon={<UserPlus className="w-4 h-4 text-indigo-600" />}
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-client-form"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              {isSubmitting && <Spinner className="w-4 h-4" />}
              {isSubmitting ? "Saving..." : "Save Client"}
            </button>
          </div>
        }
      >
        <form id="create-client-form" onSubmit={handleCreateClient} className="p-6 space-y-5">
          <FormField label="Full Name" required error={fieldErrors.full_name?.[0]}>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className={inputClass("full_name")}
              placeholder="e.g. Jane Doe"
            />
          </FormField>

          <FormField label="Phone Number" required error={fieldErrors.phone?.[0]}>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={inputClass("phone")}
              placeholder="+212 600-000000"
            />
          </FormField>

          <FormField label="Email Address" error={fieldErrors.email?.[0]}>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={inputClass("email")}
              placeholder="jane@example.com"
            />
          </FormField>

          <FormField label="Notes" error={fieldErrors.notes?.[0]}>
            <textarea
              rows={4}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-300 bg-white transition-colors resize-none"
              placeholder="Preferences, allergies, or special requests..."
            />
          </FormField>
        </form>
      </SlideOver>
    </div>
  );
}
