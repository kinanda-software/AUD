
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  FileText,
  Loader2,
  MapPin,
  Plus,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";

type ClientStatus = "Active" | "Onboarding" | "Inactive";

type RiskLevel = "Low" | "Moderate" | "High" | "Significant";

type EntityType =
  | "Private Company"
  | "Public Company"
  | "Non-Governmental Organization"
  | "Government Entity"
  | "Partnership";

type Client = {
  id: number;
  code: string;
  name: string;
  entity_type: EntityType;
  industry: string;
  location: string;
  contact_person: string;
  email: string;
  phone: string;
  status: ClientStatus;
  risk: RiskLevel;
  created_at?: string;
  updated_at?: string;
};

const API_URL = "http://localhost:8000/api/clients/";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ClientStatus>("All");
  const [riskFilter, setRiskFilter] = useState<"All" | RiskLevel>("All");

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL, {
      method: "GET",
      credentials: "include",
      headers: {
      Accept: "application/json",
      },
      cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to load clients. Status: ${response.status}`);
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setClients(data);
      } else if (data.results && Array.isArray(data.results)) {
        setClients(data.results);
      } else {
        setClients([]);
      }
    } catch (err) {
      console.error("Failed to load clients:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load clients from the server."
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredClients = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesSearch =
        !search ||
        client.code?.toLowerCase().includes(search) ||
        client.name?.toLowerCase().includes(search) ||
        client.industry?.toLowerCase().includes(search) ||
        client.location?.toLowerCase().includes(search) ||
        client.contact_person?.toLowerCase().includes(search) ||
        client.email?.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "All" || client.status === statusFilter;

      const matchesRisk =
        riskFilter === "All" || client.risk === riskFilter;

      return matchesSearch && matchesStatus && matchesRisk;
    });
  }, [clients, searchTerm, statusFilter, riskFilter]);

  const metrics = useMemo(() => {
    const total = clients.length;

    const active = clients.filter(
      (client) => client.status === "Active"
    ).length;

    const onboarding = clients.filter(
      (client) => client.status === "Onboarding"
    ).length;

    const highRisk = clients.filter(
      (client) =>
        client.risk === "High" || client.risk === "Significant"
    ).length;

    return {
      total,
      active,
      onboarding,
      highRisk,
    };
  }, [clients]);

  function getStatusClasses(status: ClientStatus) {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";

      case "Onboarding":
        return "bg-amber-50 text-amber-700 border border-amber-200";

      case "Inactive":
        return "bg-slate-100 text-slate-600 border border-slate-200";

      default:
        return "bg-slate-100 text-slate-600 border border-slate-200";
    }
  }

  function getRiskClasses(risk: RiskLevel) {
    switch (risk) {
      case "Low":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";

      case "Moderate":
        return "bg-blue-50 text-blue-700 border border-blue-200";

      case "High":
        return "bg-orange-50 text-orange-700 border border-orange-200";

      case "Significant":
        return "bg-red-50 text-red-700 border border-red-200";

      default:
        return "bg-slate-100 text-slate-600 border border-slate-200";
    }
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                  <Building2 size={16} />
                  <span>Audit Management</span>
                  <ChevronRight size={14} />
                  <span className="text-slate-700">Clients</span>
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  Client Directory
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Manage audit clients, client profiles, risk classifications,
                  and engagement relationships.
                </p>
              </div>

              <Link
                href="/clients/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-500"
              >
                <Plus size={18} />
                New Client
              </Link>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-7xl px-6 py-7">
          {/* Error */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertCircle className="mt-0.5 shrink-0" size={20} />

              <div>
                <p className="font-semibold">Unable to load clients</p>
                <p className="mt-1 text-sm">{error}</p>

                <button
                  type="button"
                  onClick={loadClients}
                  className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total Clients
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {loading ? "—" : metrics.total}
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                  <Users size={22} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Active Clients
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {loading ? "—" : metrics.active}
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                  <CheckCircle2 size={22} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Onboarding
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {loading ? "—" : metrics.onboarding}
                  </p>
                </div>

                <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                  <CircleDot size={22} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    High / Significant Risk
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {loading ? "—" : metrics.highRisk}
                  </p>
                </div>

                <div className="rounded-xl bg-red-50 p-3 text-red-600">
                  <ShieldAlert size={22} />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search clients by code, name, industry, location..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as "All" | ClientStatus
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Onboarding">Onboarding</option>
                <option value="Inactive">Inactive</option>
              </select>

              <select
                value={riskFilter}
                onChange={(event) =>
                  setRiskFilter(
                    event.target.value as "All" | RiskLevel
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="All">All Risk Levels</option>
                <option value="Low">Low</option>
                <option value="Moderate">Moderate</option>
                <option value="High">High</option>
                <option value="Significant">Significant</option>
              </select>
            </div>
          </div>

          {/* Client Directory */}
          <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Client Directory
                  </h2>

                  <p className="text-sm text-slate-500">
                    Showing {filteredClients.length} of {clients.length} clients
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadClients}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-80 items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Loader2 size={20} className="animate-spin" />
                  Loading clients from database...
                </div>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
                <div className="rounded-full bg-slate-100 p-4 text-slate-500">
                  <Building2 size={28} />
                </div>

                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  No clients found
                </h3>

                <p className="mt-1 max-w-md text-sm text-slate-500">
                  {clients.length === 0
                    ? "There are currently no clients in the database. Create your first client to get started."
                    : "No clients match your current search or filters."}
                </p>

                {clients.length === 0 && (
                  <Link
                    href="/clients/new"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    <Plus size={17} />
                    Create Client
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Client
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Entity Type
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Industry
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Location
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Status
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Risk
                      </th>

                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredClients.map((client) => (
                      <tr
                        key={client.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                              <Building2 size={20} />
                            </div>

                            <div>
                              <p className="font-semibold text-slate-900">
                                {client.name}
                              </p>

                              <p className="mt-0.5 text-xs font-medium text-slate-500">
                                {client.code}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span className="text-sm text-slate-700">
                            {client.entity_type}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <span className="text-sm text-slate-700">
                            {client.industry}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin size={15} className="text-slate-400" />
                            {client.location}
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                              client.status
                            )}`}
                          >
                            {client.status}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRiskClasses(
                              client.risk
                            )}`}
                          >
                            {client.risk}
                          </span>
                        </td>

                        <td className="px-6 py-5 text-right">
                          <Link
                            href={`/clients/${client.id}`}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <FileText size={16} />
                            View
                            <ChevronRight size={15} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
