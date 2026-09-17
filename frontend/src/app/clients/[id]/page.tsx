
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
  trading_name: string;
  client_type: string;
  registration_number: string;
  tax_identification_number: string;
  industry: string;
  address: string;
  city: string;
  country: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  status: string;
  risk_level: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

const API_URL = "http://localhost:8000/api/clients/";

export default function ClientDetailsPage() {
  const params = useParams();
  const clientId = params?.id;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!clientId) return;

    const fetchClient = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}${clientId}/`, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        });

        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "You are not authenticated or do not have permission to view this client."
          );
        }

        if (response.status === 404) {
          throw new Error("Client was not found.");
        }

        if (!response.ok) {
          throw new Error(
            `Failed to load client. Server returned ${response.status}.`
          );
        }

        const data = await response.json();
        setClient(data);
      } catch (err) {
        console.error("Client details error:", err);

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load client details.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [clientId]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";

    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 text-gray-600">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading client...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6">
          <Link
            href="/clients"
            className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Link>

          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-semibold text-red-800">
              Unable to load client
            </h1>

            <p className="mt-2 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!client) {
    return (
      <AppLayout>
        <div className="p-6">
          <Link
            href="/clients"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Link>

          <div className="mt-6 rounded-xl border bg-white p-8 text-center">
            <h1 className="text-xl font-semibold text-gray-900">
              Client not found
            </h1>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/clients"
            className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Link>

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100">
                <Building2 className="h-7 w-7 text-blue-600" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {client.legal_name}
                  </h1>

                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    {client.client_code}
                  </span>
                </div>

                {client.trading_name && (
                  <p className="mt-1 text-gray-500">
                    Trading as: {client.trading_name}
                  </p>
                )}
              </div>
            </div>

            <Link
              href={`/clients/${client.id}/edit`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Edit className="h-4 w-4" />
              Edit Client
            </Link>
          </div>
        </div>

        {/* Status Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <CheckCircle2 className="h-4 w-4" />
              Status
            </div>

            <p className="text-lg font-semibold text-gray-900">
              {client.status || "—"}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <ShieldCheck className="h-4 w-4" />
              Risk Level
            </div>

            <p className="text-lg font-semibold text-gray-900">
              {client.risk_level || "—"}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <Building2 className="h-4 w-4" />
              Client Type
            </div>

            <p className="text-lg font-semibold text-gray-900">
              {client.client_type || "—"}
            </p>
          </div>
        </div>

        {/* Client Information */}
        <div className="mb-6 rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Client Information
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
            <InfoItem label="Legal Name" value={client.legal_name} />
            <InfoItem label="Trading Name" value={client.trading_name} />
            <InfoItem label="Client Type" value={client.client_type} />

            <InfoItem
              label="Registration Number"
              value={client.registration_number}
            />

            <InfoItem
              label="Tax Identification Number"
              value={client.tax_identification_number}
            />

            <InfoItem label="Industry" value={client.industry} />
            <InfoItem label="Country" value={client.country} />
            <InfoItem label="City" value={client.city} />
            <InfoItem label="Address" value={client.address} />
          </div>
        </div>

        {/* Contact Information */}
        <div className="mb-6 rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Contact Information
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
            <ContactItem
              icon={<User className="h-5 w-5" />}
              label="Contact Person"
              value={client.contact_person}
            />

            <ContactItem
              icon={<Mail className="h-5 w-5" />}
              label="Email"
              value={client.contact_email}
            />

            <ContactItem
              icon={<Phone className="h-5 w-5" />}
              label="Phone"
              value={client.contact_phone}
            />

            <ContactItem
              icon={<MapPin className="h-5 w-5" />}
              label="Location"
              value={
                [client.address, client.city, client.country]
                  .filter(Boolean)
                  .join(", ") || "—"
              }
            />
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6 rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
          </div>

          <div className="p-6">
            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
              {client.notes || "No notes have been added for this client."}
            </p>
          </div>
        </div>

        {/* Record Information */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Record Information
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-5 w-5 text-gray-400" />

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Created
                </p>

                <p className="mt-1 text-sm text-gray-900">
                  {formatDate(client.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-5 w-5 text-gray-400" />

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Last Updated
                </p>

                <p className="mt-1 text-sm text-gray-900">
                  {formatDate(client.updated_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );


function InfoItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-sm text-gray-900">{value || "—"}</p>
    </div>
  );
}

function ContactItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-gray-400">{icon}</div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </p>

        <p className="mt-1 text-sm text-gray-900">{value || "—"}</p>
      </div>
    </div>
  );
}

}