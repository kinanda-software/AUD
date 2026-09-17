
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Edit,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

type Client = {
  id: number;
  client_code: string;
  legal_name: string;
  trading_name?: string | null;
  client_type: string;
  registration_number?: string | null;
  tax_identification_number?: string | null;
  industry?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  contact_person?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  status: string;
  risk_level: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

const API_URL = "http://localhost:8000/api/clients/";

export default function ClientDetailsPage() {
  const params = useParams();

  const clientId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!clientId) {
      setError("Client ID was not provided.");
      setLoading(false);
      return;
    }

    const fetchClient = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}${clientId}/`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        const contentType =
          response.headers.get("content-type") || "";

        const data = contentType.includes("application/json")
          ? await response.json()
          : await response.text();

        if (!response.ok) {
          console.error(
            "Client details request failed:",
            response.status,
            data
          );

          if (
            response.status === 401 ||
            response.status === 403
          ) {
            setError(
              "You are not authenticated. Please log in again."
            );
          } else if (response.status === 404) {
            setError(
              `Client with ID ${clientId} was not found.`
            );
          } else {
            setError(
              `Unable to load client (${response.status}).`
            );
          }

          return;
        }

        console.log(
          "Client details loaded successfully:",
          data
        );

        setClient(data);
      } catch (err) {
        console.error(
          "Client details request failed:",
          err
        );

        setError(
          "Unable to connect to the Django backend. Make sure the backend server is running."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [clientId]);

  const formatLabel = (value?: string | null) => {
    if (!value) {
      return "—";
    }

    return value
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  const formatDate = (value?: string) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  const getStatusClass = (status?: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-700";

      case "onboarding":
        return "bg-blue-100 text-blue-700";

      case "prospect":
        return "bg-amber-100 text-amber-700";

      case "inactive":
        return "bg-slate-200 text-slate-600";

      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const getRiskClass = (risk?: string) => {
    switch (risk) {
      case "low":
        return "bg-emerald-100 text-emerald-700";

      case "medium":
        return "bg-amber-100 text-amber-700";

      case "high":
        return "bg-red-100 text-red-700";

      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <main className="mx-auto w-full max-w-6xl">
          <div className="flex min-h-[500px] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <Loader2
                size={32}
                className="animate-spin text-blue-600"
              />

              <p className="text-sm font-medium">
                Loading client details...
              </p>
            </div>
          </div>
        </main>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <main className="mx-auto w-full max-w-6xl space-y-6">

          <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-7 py-8 text-white shadow-xl">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-300">
                  <Building2 size={17} />
                  Client Management
                </div>

                <h1 className="text-3xl font-bold tracking-tight">
                  Client Details
                </h1>

                <p className="mt-3 text-sm text-slate-300">
                  View client master information.
                </p>
              </div>

              <Link
                href="/clients"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                <ArrowLeft size={17} />
                Back to Clients
              </Link>
            </div>
          </section>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h2 className="font-bold text-red-800">
              Unable to load client
            </h2>

            <p className="mt-2 text-sm text-red-700">
              {error}
            </p>

            <p className="mt-2 text-xs text-red-600">
              Client ID: {clientId}
            </p>
          </div>

        </main>
      </AppLayout>
    );
  }

  if (!client) {
    return (
      <AppLayout>
        <main className="mx-auto w-full max-w-6xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <Building2
              size={40}
              className="mx-auto text-slate-400"
            />

            <h1 className="mt-4 text-xl font-bold text-slate-900">
              Client not found
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              No client information was returned from the server.
            </p>

            <Link
              href="/clients"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
            >
              <ArrowLeft size={17} />
              Back to Clients
            </Link>
          </div>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="mx-auto w-full max-w-6xl space-y-6">

        {/* Header */}
        <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-7 py-8 text-white shadow-xl">

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-300">
                <Building2 size={17} />
                Client Management
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {client.legal_name}
              </h1>

              <p className="mt-3 text-sm text-slate-300">
                Client Code:{" "}
                <span className="font-semibold text-white">
                  {client.client_code}
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">

              <Link
                href="/clients"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                <ArrowLeft size={17} />
                Back to Clients
              </Link>

              <Link
                href={`/clients/${client.id}/edit`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                <Edit size={17} />
                Edit Client
              </Link>

            </div>
          </div>
        </section>

        {/* Status Summary */}
        <section className="grid gap-4 md:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Client Code
            </p>

            <p className="mt-2 text-xl font-bold text-slate-900">
              {client.client_code}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </p>

            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${getStatusClass(
                  client.status
                )}`}
              >
                <CheckCircle2 size={15} />
                {formatLabel(client.status)}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Risk Level
            </p>

            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${getRiskClass(
                  client.risk_level
                )}`}
              >
                <ShieldCheck size={15} />
                {formatLabel(client.risk_level)}
              </span>
            </div>
          </div>

        </section>

        {/* Client Information */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 p-6">
            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Building2 size={20} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Client Information
                </h2>

                <p className="text-sm text-slate-500">
                  Legal and organizational information.
                </p>
              </div>

            </div>
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-2">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Legal Name
              </p>

              <p className="mt-2 font-semibold text-slate-900">
                {client.legal_name || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Trading Name
              </p>

              <p className="mt-2 font-semibold text-slate-900">
                {client.trading_name || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Entity Type
              </p>

              <p className="mt-2 font-semibold text-slate-900">
                {formatLabel(client.client_type)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Industry
              </p>

              <p className="mt-2 font-semibold text-slate-900">
                {client.industry || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Registration Number
              </p>

              <p className="mt-2 font-semibold text-slate-900">
                {client.registration_number || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tax Identification Number
              </p>

              <p className="mt-2 font-semibold text-slate-900">
                {client.tax_identification_number || "—"}
              </p>
            </div>

          </div>
        </section>

        {/* Contact Information */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 p-6">
            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <User size={20} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Contact Information
                </h2>

                <p className="text-sm text-slate-500">
                  Primary contact details for this client.
                </p>
              </div>

            </div>
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-2">

            <div className="flex items-start gap-3">
              <User
                size={18}
                className="mt-1 text-slate-400"
              />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Contact Person
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {client.contact_person || "—"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail
                size={18}
                className="mt-1 text-slate-400"
              />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {client.contact_email || "—"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone
                size={18}
                className="mt-1 text-slate-400"
              />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Phone
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {client.contact_phone || "—"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin
                size={18}
                className="mt-1 text-slate-400"
              />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Address
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {client.address || "—"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                City
              </p>

              <p className="mt-2 font-semibold text-slate-900">
                {client.city || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Country
              </p>

              <p className="mt-2 font-semibold text-slate-900">
                {client.country || "—"}
              </p>
            </div>

          </div>
        </section>

        {/* Notes */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Notes
            </h2>

            <p className="text-sm text-slate-500">
              Additional information recorded for this client.
            </p>
          </div>

          <div className="p-6">
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {client.notes || "No notes have been added for this client."}
            </p>
          </div>
        </section>

        {/* Record Information */}
        <section className="rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">

          <div className="grid gap-6 p-6 md:grid-cols-2">

            <div className="flex items-start gap-3">
              <CalendarDays
                size={18}
                className="mt-1 text-slate-400"
              />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Created
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {formatDate(client.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CalendarDays
                size={18}
                className="mt-1 text-slate-400"
              />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Last Updated
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {formatDate(client.updated_at)}
                </p>
              </div>
            </div>

          </div>
        </section>

      </main>
    </AppLayout>
  );
}

