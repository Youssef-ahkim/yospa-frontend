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
        : "border-[#EAE4F2] focus:ring-[#7455A4] focus:border-[#7455A4] hover:border-[#C9B8E2] bg-white text-[#33283D]"
    }`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#33283D] tracking-tight">Clients</h1>
          <p className="text-sm text-[#7A6F86] mt-0.5">
            Manage your spa members and customer contacts
          </p>
        </div>
        <button
          onClick={openModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[40px] bg-[#7455A4] hover:bg-[#5E4387] text-white font-semibold text-sm rounded-xl shadow-xs transition-all duration-200 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#7A6F86] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 border border-[#EAE4F2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7455A4] focus:border-[#7455A4] text-sm bg-white shadow-xs hover:border-[#C9B8E2] text-[#33283D] placeholder-[#7A6F86]/60 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[#7A6F86] hover:text-[#33283D] transition-colors cursor-pointer rounded-lg hover:bg-[#FAF8FC]"
            aria-label="Clear search"
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
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-[#EAE4F2] rounded-2xl shadow-xs">
          <Spinner className="w-6 h-6 text-[#7455A4] mb-3" />
          <p className="text-sm text-[#7A6F86]">Loading clients...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-20 bg-white border border-[#EAE4F2] rounded-2xl shadow-xs">
          <Users className="w-10 h-10 text-[#C9B8E2] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#33283D]">
            {searchQuery ? "No clients match your search." : "No clients yet."}
          </p>
          {!searchQuery && (
            <p className="text-xs text-[#7A6F86] mt-1">Add your first client to get started.</p>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#EAE4F2] rounded-2xl overflow-hidden shadow-xs">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-[#EAE4F2]">
              <thead className="bg-[#FAF8FC]">
                <tr>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-[#7A6F86] uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-[#7A6F86] uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-[#7A6F86] uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold text-[#7A6F86] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF8FC] bg-white">
                {filteredClients.map((client) => {
                  return (
                    <tr key={client.id} className="hover:bg-[#FAF8FC] transition-colors group">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <Link href={`/dashboard/clients/${client.id}`} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#F0EAF7] border border-[#C9B8E2]/50 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-[#7455A4]">
                              {(client.full_name || "?")[0].toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-[#33283D] group-hover:text-[#7455A4] transition-colors">
                            {client.full_name}
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5 text-sm text-[#7A6F86]">
                          {client.email ? (
                            <span className="flex items-center gap-1.5 text-xs">
                              <Mail className="w-3 h-3 text-[#9275BC]" />
                              {client.email}
                            </span>
                          ) : (
                            <span className="text-xs text-[#7A6F86]/60 italic">No email</span>
                          )}
                          {client.phone && (
                            <span className="flex items-center gap-1.5 text-xs text-[#7A6F86]">
                              <Phone className="w-3 h-3 text-[#9275BC]" />
                              {client.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-[#7A6F86]">
                        {client.created_at ? new Date(client.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <Link
                          href={`/dashboard/clients/${client.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7455A4] hover:text-[#5E4387] bg-[#F0EAF7] hover:bg-[#E4D8F0] px-3 py-1.5 rounded-lg transition-colors"
                        >
                          View
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (360px-friendly, with >=40px touch targets) */}
          <div className="md:hidden divide-y divide-[#EAE4F2]">
            {filteredClients.map((client) => {
              return (
                <div key={client.id} className="p-4 space-y-3 bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="flex items-center gap-3 min-w-0"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#F0EAF7] border border-[#C9B8E2]/50 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-[#7455A4]">
                          {(client.full_name || "?")[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#33283D] truncate hover:text-[#7455A4] transition-colors">
                          {client.full_name}
                        </p>
                        <p className="text-xs text-[#7A6F86]">
                          Joined {client.created_at ? new Date(client.created_at).toLocaleDateString() : "—"}
                        </p>
                      </div>
                    </Link>
                  </div>

                  {/* Contact Details */}
                  <div className="space-y-1.5 text-xs text-[#7A6F86] bg-[#FAF8FC] p-2.5 rounded-xl border border-[#EAE4F2]">
                    {client.phone && (
                      <a
                        href={`tel:${client.phone}`}
                        className="flex items-center gap-2 hover:text-[#7455A4] transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#9275BC] flex-shrink-0" />
                        <span>{client.phone}</span>
                      </a>
                    )}
                    {client.email ? (
                      <a
                        href={`mailto:${client.email}`}
                        className="flex items-center gap-2 hover:text-[#7455A4] transition-colors truncate"
                      >
                        <Mail className="w-3.5 h-3.5 text-[#9275BC] flex-shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </a>
                    ) : (
                      <p className="italic text-[#7A6F86]/60">No email registered</p>
                    )}
                  </div>

                  {/* Actions with >= 40px touch targets */}
                  <div className="pt-1">
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="w-full min-h-[40px] inline-flex items-center justify-center gap-2 text-xs font-semibold text-[#7455A4] bg-[#F0EAF7] hover:bg-[#E4D8F0] px-4 py-2 rounded-xl transition-colors cursor-pointer"
                    >
                      View Details
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-5 py-3 border-t border-[#EAE4F2] bg-[#FAF8FC] flex items-center justify-between">
            <p className="text-xs text-[#7A6F86]">
              Showing <span className="font-semibold text-[#33283D]">{filteredClients.length}</span> of{" "}
              <span className="font-semibold text-[#33283D]">{clients.length}</span> clients
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
        icon={<UserPlus className="w-4 h-4 text-[#7455A4]" />}
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-2.5 px-4 border border-[#EAE4F2] rounded-xl text-sm font-medium text-[#33283D] bg-white hover:bg-[#FAF8FC] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-client-form"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#7455A4] hover:bg-[#5E4387] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
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
              className="w-full px-3.5 py-2.5 border border-[#EAE4F2] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7455A4] focus:border-[#7455A4] hover:border-[#C9B8E2] bg-white text-[#33283D] placeholder-[#7A6F86]/60 transition-colors resize-none"
              placeholder="Preferences, allergies, or special requests..."
            />
          </FormField>
        </form>
      </SlideOver>
    </div>
  );
}
