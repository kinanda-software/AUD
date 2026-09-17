
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

type ClientStatus = "prospect" | "onboarding" | "active" | "inactive";

type RiskLevel = "low" | "medium" | "high";

type EntityType =
  | "company"
  | "government"
  | "ngo"
  | "bank"
  | "insurance"
  | "other";

const API_URL = "http://localhost:8000/api/clients/";
const CSRF_URL = "http://localhost:8000/api/auth/csrf-token/";

export default function NewClientPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    client_code: "",
    legal_name: "",
    client_type: "company" as EntityType,
    industry: "",
    address: "",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    status: "onboarding" as ClientStatus,
    risk_level: "medium" as RiskLevel,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (
    field: keyof typeof formData,
    value: string
  ) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const getCookie = (name: string): string | null => {
    const cookies = document.cookie.split(";");

    for (const cookie of cookies) {
      const [key, ...valueParts] = cookie.trim().split("=");

      if (key === name) {
        return decodeURIComponent(valueParts.join("="));
      }
    }

    return null;
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    // --------------------------------------------------
    // FRONTEND VALIDATION
    // --------------------------------------------------

    if (!formData.client_code.trim()) {
      setError("Client code is required.");
      return;
    }

    if (!formData.legal_name.trim()) {
      setError("Legal client name is required.");
      return;
    }

    if (!formData.industry.trim()) {
      setError("Industry is required.");
      return;
    }

    if (!formData.address.trim()) {
      setError("Address is required.");
      return;
    }

    if (!formData.contact_person.trim()) {
      setError("Contact person is required.");
      return;
    }

    if (!formData.contact_email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!formData.contact_phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    try {
      setSaving(true);

      // --------------------------------------------------
      // STEP 1: GET DJANGO CSRF COOKIE
      // --------------------------------------------------

      const csrfResponse = await fetch(CSRF_URL, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!csrfResponse.ok) {
        console.error(
          "CSRF request failed:",
          csrfResponse.status,
          csrfResponse.statusText
        );

        const csrfContentType =
          csrfResponse.headers.get("content-type") || "";

        const csrfData = csrfContentType.includes(
          "application/json"
        )
          ? await csrfResponse.json()
          : await csrfResponse.text();

        console.error("CSRF response:", csrfData);

        setError(
          "Unable to initialize security protection. Please refresh the page and try again."
        );

        return;
      }

      // --------------------------------------------------
      // STEP 2: READ CSRF TOKEN FROM COOKIE
      // --------------------------------------------------

      const csrfToken = getCookie("csrftoken");

      if (!csrfToken) {
        console.error(
          "CSRF cookie was not found in the browser."
        );

        console.error(
          "Available cookies:",
          document.cookie
        );

        setError(
          "CSRF security token was not received. Please refresh the page and try again."
        );

        return;
      }

      console.log(
        "CSRF token received successfully."
      );

      // --------------------------------------------------
      // STEP 3: SEND CLIENT CREATION REQUEST
      // --------------------------------------------------

      const response = await fetch(API_URL, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({
          client_code: formData.client_code.trim(),
          legal_name: formData.legal_name.trim(),
          client_type: formData.client_type,
          industry: formData.industry.trim(),
          address: formData.address.trim(),
          contact_person: formData.contact_person.trim(),
          contact_email: formData.contact_email.trim(),
          contact_phone: formData.contact_phone.trim(),
          status: formData.status,
          risk_level: formData.risk_level,
        }),
      });

      // --------------------------------------------------
      // STEP 4: READ BACKEND RESPONSE
      // --------------------------------------------------

      const contentType =
        response.headers.get("content-type") || "";

      const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      // --------------------------------------------------
      // STEP 5: HANDLE BACKEND ERROR
      // --------------------------------------------------

      if (!response.ok) {
        console.error(
          "========== CLIENT CREATION ERROR =========="
        );
        console.error(
          "HTTP Status:",
          response.status
        );
        console.error(
          "HTTP Status Text:",
          response.statusText
        );
        console.error(
          "Response Data:",
          data
        );
        console.error(
          "Response Data JSON:",
          JSON.stringify(data, null, 2)
        );
        console.error(
          "=========================================="
        );

        let message =
          `Failed to create client (${response.status}).`;

        if (typeof data === "string") {
          message = data || message;
        } else if (
          data &&
          typeof data === "object"
        ) {
          if (
            "detail" in data &&
            data.detail
          ) {
            message = String(data.detail);
          } else {
            const errors = Object.entries(data)
              .map(([field, messages]) => {
                const text = Array.isArray(messages)
                  ? messages.join(", ")
                  : String(messages);

                return `${field}: ${text}`;
              })
              .join(" | ");

            if (errors) {
              message = errors;
            }
          }
        }

        setError(message);

        return;
      }

      // --------------------------------------------------
      // STEP 6: SUCCESS
      // --------------------------------------------------

      console.log(
        "Client created successfully:",
        data
      );

      setSuccess(
        "Client created successfully."
      );

      // --------------------------------------------------
      // STEP 7: RETURN TO CLIENT LIST
      // --------------------------------------------------

      setTimeout(() => {
        router.push("/clients");
        router.refresh();
      }, 700);
    } catch (err) {
      console.error(
        "Client creation request failed:",
        err
      );

      setError(
        "Unable to connect to the Django backend. Make sure the backend server is running."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <main className="mx-auto w-full max-w-6xl space-y-6">

        {/* Header */}
        <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-7 py-8 text-white shadow-xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-300">
                <Building2 size={17} />
                Client Management
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                New Client
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Create a new client master record for the audit management
                system.
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

        {/* Error Message */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">
              Unable to create client
            </p>

            <p className="mt-1 break-words">
              {error}
            </p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <CheckCircle2 size={20} />

            <span className="font-semibold">
              {success}
            </span>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >

          {/* Basic Information */}
          <div className="border-b border-slate-200 p-6">

            <div className="mb-6">
              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Building2 size={20} />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Client Information
                  </h2>

                  <p className="text-sm text-slate-500">
                    Enter the basic legal and organizational information.
                  </p>
                </div>

              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">

              {/* Client Code */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Client Code
                </label>

                <input
                  type="text"
                  value={formData.client_code}
                  onChange={(event) =>
                    handleChange(
                      "client_code",
                      event.target.value
                    )
                  }
                  placeholder="e.g. CLI-007"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-1 text-xs text-slate-400">
                  Unique identifier for the client.
                </p>
              </div>

              {/* Legal Name */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Legal Client Name
                </label>

                <input
                  type="text"
                  value={formData.legal_name}
                  onChange={(event) =>
                    handleChange(
                      "legal_name",
                      event.target.value
                    )
                  }
                  placeholder="e.g. ABC Manufacturing Ltd"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Entity Type */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Entity Type
                </label>

                <select
                  value={formData.client_type}
                  onChange={(event) =>
                    handleChange(
                      "client_type",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="company">
                    Company
                  </option>

                  <option value="government">
                    Government
                  </option>

                  <option value="ngo">
                    NGO
                  </option>

                  <option value="bank">
                    Bank
                  </option>

                  <option value="insurance">
                    Insurance
                  </option>

                  <option value="other">
                    Other
                  </option>
                </select>
              </div>

              {/* Industry */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Industry
                </label>

                <input
                  type="text"
                  value={formData.industry}
                  onChange={(event) =>
                    handleChange(
                      "industry",
                      event.target.value
                    )
                  }
                  placeholder="e.g. Manufacturing"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Address */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Address
                </label>

                <input
                  type="text"
                  value={formData.address}
                  onChange={(event) =>
                    handleChange(
                      "address",
                      event.target.value
                    )
                  }
                  placeholder="e.g. Dar es Salaam, Tanzania"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Contact Person */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Primary Contact Person
                </label>

                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(event) =>
                    handleChange(
                      "contact_person",
                      event.target.value
                    )
                  }
                  placeholder="e.g. John Mushi"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Contact Email
                </label>

                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(event) =>
                    handleChange(
                      "contact_email",
                      event.target.value
                    )
                  }
                  placeholder="e.g. john@example.com"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Contact Phone
                </label>

                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(event) =>
                    handleChange(
                      "contact_phone",
                      event.target.value
                    )
                  }
                  placeholder="e.g. +255 700 000 007"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

            </div>
          </div>

          {/* Risk and Status */}
          <div className="border-b border-slate-200 p-6">

            <div className="mb-6">
              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <ShieldCheck size={20} />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Client Status and Risk
                  </h2>

                  <p className="text-sm text-slate-500">
                    Set the initial relationship status and client-level risk.
                  </p>
                </div>

              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">

              {/* Status */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Client Status
                </label>

                <select
                  value={formData.status}
                  onChange={(event) =>
                    handleChange(
                      "status",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="prospect">
                    Prospect
                  </option>

                  <option value="onboarding">
                    Onboarding
                  </option>

                  <option value="active">
                    Active
                  </option>

                  <option value="inactive">
                    Inactive
                  </option>
                </select>
              </div>

              {/* Risk */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Risk Level
                </label>

                <select
                  value={formData.risk_level}
                  onChange={(event) =>
                    handleChange(
                      "risk_level",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="low">
                    Low
                  </option>

                  <option value="medium">
                    Medium
                  </option>

                  <option value="high">
                    High
                  </option>
                </select>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-3 bg-slate-50 p-6 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-sm font-semibold text-slate-800">
                Ready to create the client?
              </p>

              <p className="mt-1 text-xs text-slate-500">
                The client will be saved to the AUD backend.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">

              <Link
                href="/clients"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={17} />
                    Save Client
                  </>
                )}
              </button>

            </div>
          </div>

        </form>
      </main>
    </AppLayout>
  );
}

