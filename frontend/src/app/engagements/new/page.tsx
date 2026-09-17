"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "../../../components/layout/AppLayout";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Users,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { getClients } from "@/lib/api";

const API_URL = "http://localhost:8000/api";

type Client = {
  id: number;
  client_code?: string;
  legal_name?: string;
  trading_name?: string;
  name?: string;
};

type EngagementResponse = {
  id: number;
  [key: string]: unknown;
};

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

async function ensureCsrfToken(): Promise<string | null> {
  let token = getCookie("csrftoken");

  if (token) {
    return token;
  }

  try {
    await fetch(`${API_URL}/auth/csrf-token/`, {
      method: "GET",
      credentials: "include",
    });
  } catch (error) {
    console.error("Failed to obtain CSRF token:", error);
  }

  return getCookie("csrftoken");
}

function formatServerError(data: unknown): string {
  if (!data) {
    return "The server returned an empty response.";
  }

  if (typeof data === "string") {
    return data.trim() || "The server returned an empty response.";
  }

  if (Array.isArray(data)) {
    return data
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        try {
          return JSON.stringify(item);
        } catch {
          return String(item);
        }
      })
      .join(", ");
  }

  if (typeof data === "object") {
    const errorData = data as Record<string, unknown>;

    const messages: string[] = [];

    for (const [field, value] of Object.entries(errorData)) {
      if (Array.isArray(value)) {
        messages.push(
          `${field}: ${value
            .map((item) => String(item))
            .join(", ")}`
        );
      } else if (
        value &&
        typeof value === "object"
      ) {
        try {
          messages.push(
            `${field}: ${JSON.stringify(value)}`
          );
        } catch {
          messages.push(
            `${field}: ${String(value)}`
          );
        }
      } else {
        messages.push(
          `${field}: ${String(value)}`
        );
      }
    }

    if (messages.length > 0) {
      return messages.join(" | ");
    }

    try {
      return JSON.stringify(data);
    } catch {
      return "The server returned an unknown error.";
    }
  }

  return String(data);
}

export default function NewEngagementPage() {
  const router = useRouter();

  /* =========================================================
     BASIC ENGAGEMENT INFORMATION
  ========================================================= */

  const [engagementCode, setEngagementCode] = useState("");
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");

  const [engagementType, setEngagementType] =
    useState("financial_statement");

  const [startDate, setStartDate] = useState("");

  const [financialYearEnd, setFinancialYearEnd] =
    useState("");

  /* =========================================================
     ACCEPTANCE / CONTINUANCE
  ========================================================= */

  const [riskRating, setRiskRating] = useState("");
  const [decision, setDecision] = useState("");

  const [
    predecessorCommunication,
    setPredecessorCommunication,
  ] = useState(false);

  const [
    independenceConfirmed,
    setIndependenceConfirmed,
  ] = useState(false);

  const [termsAgreed, setTermsAgreed] =
    useState(false);

  /* =========================================================
     OTHER FORM DATA
  ========================================================= */

  const [
    managementIntegrity,
    setManagementIntegrity,
  ] = useState("Low Risk");

  const [
    financialStability,
    setFinancialStability,
  ] = useState("Low Risk");

  const [
    litigationHistory,
    setLitigationHistory,
  ] = useState("No Significant Issues");

  const [amlKyc, setAmlKyc] =
    useState("Satisfactory");

  const [
    communicationNotes,
    setCommunicationNotes,
  ] = useState("");

  const [
    decisionRationale,
    setDecisionRationale,
  ] = useState("");

  const [
    requiredNotifications,
    setRequiredNotifications,
  ] = useState("");

  const [
    engagementLetterStatus,
    setEngagementLetterStatus,
  ] = useState("Not Started");

  const [auditScope, setAuditScope] =
    useState("");

  const [
    overallAuditStrategy,
    setOverallAuditStrategy,
  ] = useState("");

  /* =========================================================
     CLIENTS
  ========================================================= */

  const [clients, setClients] =
    useState<Client[]>([]);

  const [clientsLoading, setClientsLoading] =
    useState(true);

  const [clientsError, setClientsError] =
    useState("");

  /* =========================================================
     SAVE STATE
  ========================================================= */

  const [saving, setSaving] =
    useState(false);

  const [saveError, setSaveError] =
    useState("");

  /* =========================================================
     LOAD CLIENTS
  ========================================================= */

  useEffect(() => {
    async function loadClients() {
      try {
        setClientsLoading(true);
        setClientsError("");

        const data = await getClients();

        const clientData = Array.isArray(data)
          ? data
          : Array.isArray(
              (data as { results?: Client[] })?.results
            )
          ? (data as { results: Client[] }).results
          : [];

        setClients(clientData as Client[]);
      } catch (error) {
        console.error(
          "Failed to load clients:",
          error
        );

        setClientsError(
          "Unable to load clients from the server."
        );
      } finally {
        setClientsLoading(false);
      }
    }

    loadClients();
  }, []);

  /* =========================================================
     CLIENT DISPLAY NAME
  ========================================================= */

  function getClientName(client: Client) {
    const name =
      client.legal_name ||
      client.trading_name ||
      client.name ||
      `Client ${client.id}`;

    if (client.client_code) {
      return `${client.client_code} - ${name}`;
    }

    return name;
  }

  /* =========================================================
     SAVE ENGAGEMENT
  ========================================================= */

  async function handleSaveAndContinue() {
    setSaveError("");

    /* -------------------------
       VALIDATION
    ------------------------- */

    if (!engagementCode.trim()) {
      setSaveError(
        "Engagement code is required."
      );
      return;
    }

    if (!clientId) {
      setSaveError(
        "Please select a client."
      );
      return;
    }

    if (!title.trim()) {
      setSaveError(
        "Engagement title is required."
      );
      return;
    }

    if (!startDate) {
      setSaveError(
        "Start date is required."
      );
      return;
    }

    if (!financialYearEnd) {
      setSaveError(
        "Financial year end is required."
      );
      return;
    }

    if (!decision) {
      setSaveError(
        "Please select an engagement decision."
      );
      return;
    }

    if (
      (decision === "decline" ||
        decision === "resign") &&
      !decisionRationale.trim()
    ) {
      setSaveError(
        "Please provide the rationale for the decision."
      );
      return;
    }

    if (!independenceConfirmed) {
      setSaveError(
        "Please confirm the independence and ethical requirements."
      );
      return;
    }

    if (!termsAgreed) {
      setSaveError(
        "Please confirm that the terms of engagement have been agreed."
      );
      return;
    }

    try {
      setSaving(true);

      /* -------------------------
         CSRF
      ------------------------- */

      const csrfToken =
        await ensureCsrfToken();

      /* -------------------------
         PAYLOAD
      ------------------------- */

      const payload = {
        engagement_code:
          engagementCode.trim(),

        client: Number(clientId),

        title: title.trim(),

        engagement_type:
          engagementType,

        description: [
          "Client Acceptance / Continuance",

          `Acceptance risk rating: ${
            riskRating || "Not assessed"
          }`,

          `Management integrity: ${
            managementIntegrity
          }`,

          `Financial stability: ${
            financialStability
          }`,

          `Litigation history: ${
            litigationHistory
          }`,

          `AML / KYC: ${amlKyc}`,

          `Engagement decision: ${
            decision
          }`,

          `Predecessor communication confirmed: ${
            predecessorCommunication
              ? "Yes"
              : "No"
          }`,

          `Independence confirmed: ${
            independenceConfirmed
              ? "Yes"
              : "No"
          }`,

          `Terms agreed: ${
            termsAgreed
              ? "Yes"
              : "No"
          }`,

          `Engagement letter status: ${
            engagementLetterStatus
          }`,

          communicationNotes
            ? `Communication notes: ${communicationNotes}`
            : "",

          decisionRationale
            ? `Decision rationale: ${decisionRationale}`
            : "",

          requiredNotifications
            ? `Required notifications: ${requiredNotifications}`
            : "",

          auditScope
            ? `Initial audit scope: ${auditScope}`
            : "",

          overallAuditStrategy
            ? `Initial audit strategy: ${overallAuditStrategy}`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),

        status: "planning",

        current_phase: "phase_1",

        risk_level:
          riskRating === "high"
            ? "high"
            : riskRating === "elevated"
            ? "medium"
            : "low",

        start_date: startDate,

        financial_year_end:
          financialYearEnd,

        progress_percentage: 0,
      };

      /* -------------------------
         DEBUG PAYLOAD
      ------------------------- */

      console.log(
        "Creating engagement with payload:",
        payload
      );

      /* -------------------------
         POST REQUEST
      ------------------------- */

      const response = await fetch(
        `${API_URL}/engagements/`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            ...(csrfToken
              ? {
                  "X-CSRFToken":
                    csrfToken,
                }
              : {}),
          },

          credentials: "include",

          body: JSON.stringify(
            payload
          ),
        }
      );

      /* -------------------------
         READ RESPONSE
      ------------------------- */

      const responseText =
        await response.text();

      let data: unknown = null;

      try {
        data = responseText
          ? JSON.parse(responseText)
          : null;
      } catch {
        data = responseText;
      }

      /* -------------------------
         ERROR RESPONSE
      ------------------------- */

      if (!response.ok) {
        console.error(
          "========================================"
        );

        console.error(
          "ENGAGEMENT CREATION ERROR"
        );

        console.error(
          "HTTP status:",
          response.status
        );

        console.error(
          "HTTP status text:",
          response.statusText
        );

        console.error(
          "Response URL:",
          response.url
        );

        console.error(
          "Response body:",
          data
        );

        console.error(
          "Payload sent:",
          payload
        );

        console.error(
          "========================================"
        );

        const message =
          `Failed to create engagement (${response.status}): ${formatServerError(
            data
          )}`;

        setSaveError(message);

        return;
      }

      /* -------------------------
         SUCCESS RESPONSE
      ------------------------- */

      console.log(
        "Engagement created successfully:",
        data
      );

      /* -------------------------
         VERIFY ID
      ------------------------- */

      if (
        !data ||
        typeof data !== "object" ||
        !("id" in data)
      ) {
        console.error(
          "Server created engagement but did not return an ID:",
          data
        );

        setSaveError(
          "Engagement was created, but the server did not return its ID."
        );

        return;
      }

      const createdEngagement =
        data as EngagementResponse;

      console.log(
        "Created engagement ID:",
        createdEngagement.id
      );

      /* -------------------------
         MOVE TO PHASE 1
      ------------------------- */

      router.push(
        `/engagements/${createdEngagement.id}/audit-planning`
      );
    } catch (error) {
      console.error(
        "Engagement creation failed:",
        error
      );

      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to create engagement."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-8">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/engagements"
              className="mb-3 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft size={16} />
              Back to Engagements
            </Link>

            <h1 className="text-2xl font-bold text-slate-900">
              New Engagement
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Complete the engagement setup and acceptance
              requirements.
            </p>
          </div>

          <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
            Step 1 of 6
          </div>
        </div>

        {/* =====================================================
            PROGRESS
        ===================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            {[
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
            ].map((step, index) => (
              <div
                key={step}
                className="flex flex-1 items-center gap-3 last:flex-none"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    index === 0
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {step}
                </div>

                {index < 5 && (
                  <div
                    className={`h-1 flex-1 rounded-full ${
                      index === 0
                        ? "bg-blue-600"
                        : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-between text-xs text-slate-500">
            <span>Setup</span>
            <span>Scope</span>
            <span>Risk</span>
            <span>Strategy</span>
            <span>Team</span>
            <span>Review</span>
          </div>
        </div>

        {/* =====================================================
            BASIC ENGAGEMENT INFORMATION
        ===================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 p-6">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <FileText size={22} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Engagement Information
              </h2>

              <p className="text-sm text-slate-500">
                Enter the core information used to create the
                engagement record.
              </p>
            </div>
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Engagement Code *
              </label>

              <input
                type="text"
                value={engagementCode}
                onChange={(e) =>
                  setEngagementCode(
                    e.target.value
                  )
                }
                placeholder="e.g. ENG-2026-001"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Client *
              </label>

              <select
                value={clientId}
                onChange={(e) =>
                  setClientId(e.target.value)
                }
                disabled={clientsLoading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              >
                <option value="">
                  {clientsLoading
                    ? "Loading clients..."
                    : "Select client"}
                </option>

                {clients.map((client) => (
                  <option
                    key={client.id}
                    value={client.id}
                  >
                    {getClientName(client)}
                  </option>
                ))}
              </select>

              {clientsError && (
                <p className="mt-2 text-xs text-red-600">
                  {clientsError}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Engagement Title *
              </label>

              <input
                type="text"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                placeholder="e.g. 2026 Financial Statement Audit"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Engagement Type *
              </label>

              <select
                value={engagementType}
                onChange={(e) =>
                  setEngagementType(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="financial_statement">
                  Financial Statement Audit
                </option>

                <option value="compliance">
                  Compliance Audit
                </option>

                <option value="internal_control">
                  Internal Controls Review
                </option>

                <option value="it_audit">
                  IT Audit
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Start Date *
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(e) =>
                  setStartDate(e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Financial Year End *
              </label>

              <input
                type="date"
                value={financialYearEnd}
                onChange={(e) =>
                  setFinancialYearEnd(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        {/* =====================================================
            1. CLIENT ACCEPTANCE
        ===================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 p-6">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <ShieldCheck size={22} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                1. Client Acceptance / Continuance
              </h2>

              <p className="text-sm text-slate-500">
                Evaluate whether the client relationship should
                be accepted or continued.
              </p>
            </div>
          </div>

          <div className="space-y-6 p-6">

            <div>
              <label className="mb-3 block text-sm font-semibold text-slate-700">
                Acceptance / Continuance Risk Rating
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  {
                    value: "standard",
                    title: "Standard",
                    description:
                      "Normal client acceptance risk.",
                  },
                  {
                    value: "elevated",
                    title: "Elevated",
                    description:
                      "Additional attention is required.",
                  },
                  {
                    value: "high",
                    title: "High",
                    description:
                      "Significant acceptance concerns exist.",
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setRiskRating(
                        option.value
                      )
                    }
                    className={`rounded-xl border p-4 text-left transition ${
                      riskRating === option.value
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        {option.title}
                      </span>

                      {riskRating ===
                        option.value && (
                        <CheckCircle2
                          size={18}
                          className="text-blue-600"
                        />
                      )}
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Management Integrity
                </label>

                <select
                  value={managementIntegrity}
                  onChange={(e) =>
                    setManagementIntegrity(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                >
                  <option>Low Risk</option>
                  <option>Medium Risk</option>
                  <option>High Risk</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Financial Stability
                </label>

                <select
                  value={financialStability}
                  onChange={(e) =>
                    setFinancialStability(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                >
                  <option>Low Risk</option>
                  <option>Medium Risk</option>
                  <option>High Risk</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Litigation History
                </label>

                <select
                  value={litigationHistory}
                  onChange={(e) =>
                    setLitigationHistory(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                >
                  <option>
                    No Significant Issues
                  </option>
                  <option>
                    Issues Identified
                  </option>
                  <option>
                    Significant Issues
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  AML / KYC Due Diligence
                </label>

                <select
                  value={amlKyc}
                  onChange={(e) =>
                    setAmlKyc(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                >
                  <option>Satisfactory</option>
                  <option>
                    Further Review Required
                  </option>
                  <option>
                    Concern Identified
                  </option>
                </select>
              </div>

            </div>
          </div>
        </section>

        {/* =====================================================
            2. PREDECESSOR AUDITOR
        ===================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 p-6">
            <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
              <AlertTriangle size={22} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                2. Predecessor Auditor Communication
              </h2>

              <p className="text-sm text-slate-500">
                Document professional clearance and communication
                with the predecessor auditor.
              </p>
            </div>
          </div>

          <div className="space-y-4 p-6">

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={
                  predecessorCommunication
                }
                onChange={(e) =>
                  setPredecessorCommunication(
                    e.target.checked
                  )
                }
                className="h-4 w-4"
              />

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Client permission obtained
                </p>

                <p className="text-xs text-slate-500">
                  Permission has been obtained to communicate with
                  the predecessor auditor.
                </p>
              </div>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                "Professional clearance requested",
                "Communication sent",
                "Response received",
                "Matters reviewed",
              ].map((item) => (
                <label
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                  />

                  <span className="text-sm text-slate-700">
                    {item}
                  </span>
                </label>
              ))}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Communication / Response Notes
              </label>

              <textarea
                rows={4}
                value={communicationNotes}
                onChange={(e) =>
                  setCommunicationNotes(
                    e.target.value
                  )
                }
                placeholder="Document relevant matters arising from predecessor auditor communication..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </section>

        {/* =====================================================
            3. ENGAGEMENT DECISION
        ===================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900">
              3. Engagement Decision
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Record the firm's decision regarding the engagement.
            </p>
          </div>

          <div className="space-y-6 p-6">

            <div className="grid gap-3 md:grid-cols-4">
              {[
                "Accept",
                "Continue",
                "Decline",
                "Resign",
              ].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setDecision(
                      item.toLowerCase()
                    )
                  }
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    decision ===
                    item.toLowerCase()
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            {(decision === "decline" ||
              decision === "resign") && (
              <div className="space-y-5 rounded-xl border border-red-200 bg-red-50 p-5">

                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle size={18} />

                  <span className="text-sm font-semibold">
                    Additional documentation required
                  </span>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Rationale *
                  </label>

                  <textarea
                    rows={4}
                    value={decisionRationale}
                    onChange={(e) =>
                      setDecisionRationale(
                        e.target.value
                      )
                    }
                    placeholder="Document the rationale for the decision..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Required Notifications
                  </label>

                  <textarea
                    rows={3}
                    value={requiredNotifications}
                    onChange={(e) =>
                      setRequiredNotifications(
                        e.target.value
                      )
                    }
                    placeholder="Document notifications made to governance, regulators, or other relevant parties..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-red-500"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* =====================================================
            4. INDEPENDENCE
        ===================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 p-6">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <ShieldCheck size={22} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                4. Independence & Ethical Requirements
              </h2>

              <p className="text-sm text-slate-500">
                Confirm compliance with independence and ethical
                requirements.
              </p>
            </div>
          </div>

          <div className="space-y-4 p-6">

            {[
              "Independence requirements assessed",
              "No prohibited relationships identified",
              "Conflicts of interest assessed",
              "Ethical requirements confirmed",
            ].map((item) => (
              <label
                key={item}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4"
                />

                <span className="text-sm font-medium text-slate-700">
                  {item}
                </span>
              </label>
            ))}

            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-emerald-50 p-4">
              <input
                type="checkbox"
                checked={
                  independenceConfirmed
                }
                onChange={(e) =>
                  setIndependenceConfirmed(
                    e.target.checked
                  )
                }
                className="h-4 w-4"
              />

              <span className="text-sm font-semibold text-emerald-800">
                I confirm that independence and ethical
                requirements have been assessed.
              </span>
            </label>
          </div>
        </section>

        {/* =====================================================
            5. ENGAGEMENT LETTER
        ===================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 p-6">
            <div className="rounded-xl bg-purple-50 p-3 text-purple-600">
              <FileText size={22} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                5. Engagement Letter / Terms of Engagement
              </h2>

              <p className="text-sm text-slate-500">
                Establish and document the agreed terms of the
                engagement.
              </p>
            </div>
          </div>

          <div className="space-y-5 p-6">

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Engagement Letter Status
              </label>

              <select
                value={
                  engagementLetterStatus
                }
                onChange={(e) =>
                  setEngagementLetterStatus(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              >
                <option>Not Started</option>
                <option>Draft</option>
                <option>Sent</option>
                <option>Accepted</option>
                <option>Signed</option>
              </select>
            </div>

            <div className="rounded-xl border-2 border-dashed border-slate-300 p-8 text-center">
              <FileText
                className="mx-auto text-slate-400"
                size={32}
              />

              <p className="mt-3 text-sm font-semibold text-slate-700">
                Upload Engagement Letter
              </p>

              <p className="mt-1 text-xs text-slate-500">
                PDF, DOCX or other approved document formats
              </p>

              <input
                type="file"
                className="mx-auto mt-4 text-sm"
              />
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) =>
                  setTermsAgreed(
                    e.target.checked
                  )
                }
                className="h-4 w-4"
              />

              <span className="text-sm font-medium text-slate-700">
                Terms of engagement have been agreed with the
                client.
              </span>
            </label>
          </div>
        </section>

        {/* =====================================================
            6. TEAM & STRATEGY
        ===================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 p-6">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
              <Users size={22} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                6. Engagement Team & Overall Audit Strategy
              </h2>

              <p className="text-sm text-slate-500">
                Establish the engagement team and define the
                overall audit strategy and scope.
              </p>
            </div>
          </div>

          <div className="space-y-6 p-6">

            <div className="grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Engagement Partner
                </label>

                <select className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm">
                  <option>Select partner</option>
                  <option>admin.aud</option>
                  <option>manager.aud</option>
                  <option>test.auditor</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Lead Auditor
                </label>

                <select className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm">
                  <option>Select lead auditor</option>
                  <option>admin.aud</option>
                  <option>manager.aud</option>
                  <option>test.auditor</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Audit Scope
              </label>

              <textarea
                rows={4}
                value={auditScope}
                onChange={(e) =>
                  setAuditScope(
                    e.target.value
                  )
                }
                placeholder="Define the overall scope of the audit..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Overall Audit Strategy
              </label>

              <textarea
                rows={5}
                value={
                  overallAuditStrategy
                }
                onChange={(e) =>
                  setOverallAuditStrategy(
                    e.target.value
                  )
                }
                placeholder="Document the overall audit strategy, timing, direction and extent of audit procedures..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </section>

        {/* =====================================================
            ERROR
        ===================================================== */}

        {saveError && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0">
              <p className="font-semibold">
                Unable to save engagement
              </p>

              <p className="mt-1 break-words">
                {saveError}
              </p>
            </div>
          </div>
        )}

        {/* =====================================================
            FOOTER
        ===================================================== */}

        <div className="flex items-center justify-between border-t border-slate-200 pt-6">

          <Link
            href="/engagements"
            className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="button"
            onClick={
              handleSaveAndContinue
            }
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Saving...
              </>
            ) : (
              <>
                Save & Continue
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>

      </div>
    </AppLayout>
  );
}