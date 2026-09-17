
"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Loader2,
  Save,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

type ClientForm = {
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
};

const API_URL = "http://localhost:8000/api/clients/";
const CSRF_URL = "http://localhost:8000/api/auth/csrf-token/";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie.split(";");

  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.trim().split("=");

    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
}

const emptyForm: ClientForm = {
  client_code: "",
  legal_name: "",
  trading_name: "",
  client_type: "",
  registration_number: "",
  tax_identification_number: "",
  industry: "",
  address: "",
  city: "",
  country: "",
  contact_person: "",
  contact_email: "",
  contact_phone: "",
  status: "",
  risk_level: "",
  notes: "",
};

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();

  const clientId = params?.id;

  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!clientId) {
      return;
    }

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

        const data = await response.json().catch(() => null);

        console.log("Client details response:", response.status, data);

        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "You are not authenticated or do not have permission to edit this client."
          );
        }

        if (response.status === 404) {
          throw new Error("Client was not found.");
        }

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              data?.message ||
              `Failed to load client. Server returned ${response.status}.`
          );
        }

        setForm({
          client_code: data?.client_code ?? "",
          legal_name: data?.legal_name ?? "",
          trading_name: data?.trading_name ?? "",
          client_type: data?.client_type ?? "",
          registration_number: data?.registration_number ?? "",
          tax_identification_number:
            data?.tax_identification_number ?? "",
          industry: data?.industry ?? "",
          address: data?.address ?? "",
          city: data?.city ?? "",
          country: data?.country ?? "",
          contact_person: data?.contact_person ?? "",
          contact_email: data?.contact_email ?? "",
          contact_phone: data?.contact_phone ?? "",
          status: data?.status ?? "",
          risk_level: data?.risk_level ?? "",
          notes: data?.notes ?? "",
        });
      } catch (err) {
        console.error("Load client error:", err);

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to load client.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [clientId]);

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const getCsrfToken = async (): Promise<string> => {
    let csrfToken = getCookie("csrftoken");

    if (csrfToken) {
      return csrfToken;
    }

    const csrfResponse = await fetch(CSRF_URL, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!csrfResponse.ok) {
      throw new Error(
        `Unable to initialize security token. Server returned ${csrfResponse.status}.`
      );
    }

    csrfToken = getCookie("csrftoken");

    if (!csrfToken) {
      throw new Error(
        "CSRF token was not provided by the server."
      );
    }

    return csrfToken;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!clientId) {
      setError("Client ID is missing.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const csrfToken = await getCsrfToken();

      const response = await fetch(`${API_URL}${clientId}/`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => null);

      console.log("Client update response:", response.status, data);

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          data?.detail ||
            "You are not authenticated or do not have permission to update this client."
        );
      }

      if (response.status === 404) {
        throw new Error("Client was not found.");
      }

      if (!response.ok) {
        let errorMessage = `Failed to update client. Server returned ${response.status}.`;

        if (data) {
          if (data.detail) {
            errorMessage = data.detail;
          } else if (data.message) {
            errorMessage = data.message;
          } else if (typeof data === "object") {
            const validationErrors = Object.entries(data)
              .map(([field, messages]) => {
                if (Array.isArray(messages)) {
                  return `${field}: ${messages.join(", ")}`;
                }

                return `${field}: ${String(messages)}`;
              })
              .join(" | ");

            if (validationErrors) {
              errorMessage = validationErrors;
            }
          }
        }

        throw new Error(errorMessage);
      }

      setSuccess("Client updated successfully.");

      setTimeout(() => {
        router.push(`/clients/${clientId}`);
      }, 500);
    } catch (err) {
      console.error("========== CLIENT UPDATE ERROR ==========");
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to update client.");
      }
    } finally {
      setSaving(false);
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

  if (error && !form.legal_name && !form.client_code) {
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

            <p className="mt-2 text-sm text-red-700">
              {error}
            </p>
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
            href={`/clients/${clientId}`}
            className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Client
          </Link>

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100">
                <Building2 className="h-7 w-7 text-blue-600" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Edit Client
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  Update information for{" "}
                  <span className="font-medium text-gray-700">
                    {form.legal_name || "this client"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">
              {error}
            </p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">
              {success}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Client Information */}
          <div className="mb-6 rounded-xl border bg-white shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Client Information
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Basic identification and registration information.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
              <FormField
                label="Client Code"
                name="client_code"
                value={form.client_code}
                onChange={handleChange}
                required
              />

              <FormField
                label="Legal Name"
                name="legal_name"
                value={form.legal_name}
                onChange={handleChange}
                required
              />

              <FormField
                label="Trading Name"
                name="trading_name"
                value={form.trading_name}
                onChange={handleChange}
              />

              <div>
                <label
                  htmlFor="client_type"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Client Type
                </label>

                <select
                  id="client_type"
                  name="client_type"
                  value={form.client_type}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select client type</option>
                  <option value="Company">Company</option>
                  <option value="Individual">Individual</option>
                  <option value="Government">Government</option>
                  <option value="NGO">NGO</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <FormField
                label="Registration Number"
                name="registration_number"
                value={form.registration_number}
                onChange={handleChange}
              />

              <FormField
                label="Tax Identification Number"
                name="tax_identification_number"
                value={form.tax_identification_number}
                onChange={handleChange}
              />

              <FormField
                label="Industry"
                name="industry"
                value={form.industry}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Location */}
          <div className="mb-6 rounded-xl border bg-white shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Location
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Client address and geographical information.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
              <FormField
                label="Address"
                name="address"
                value={form.address}
                onChange={handleChange}
              />

              <FormField
                label="City"
                name="city"
                value={form.city}
                onChange={handleChange}
              />

              <FormField
                label="Country"
                name="country"
                value={form.country}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="mb-6 rounded-xl border bg-white shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Contact Information
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Primary contact details for this client.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
              <FormField
                label="Contact Person"
                name="contact_person"
                value={form.contact_person}
                onChange={handleChange}
              />

              <FormField
                label="Email"
                name="contact_email"
                type="email"
                value={form.contact_email}
                onChange={handleChange}
              />

              <FormField
                label="Phone"
                name="contact_phone"
                value={form.contact_phone}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Risk and Status */}
          <div className="mb-6 rounded-xl border bg-white shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Status & Risk
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Current client status and risk classification.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="status"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Status
                </label>

                <select
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="risk_level"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Risk Level
                </label>

                <select
                  id="risk_level"
                  name="risk_level"
                  value={form.risk_level}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select risk level</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6 rounded-xl border bg-white shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Notes
              </h2>
            </div>

            <div className="p-6">
              <label
                htmlFor="notes"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Additional Notes
              </label>

              <textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={6}
                placeholder="Enter any additional information about this client..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href={`/clients/${clientId}`}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

function FormField({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-gray-700"
      >
        {label}
        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

