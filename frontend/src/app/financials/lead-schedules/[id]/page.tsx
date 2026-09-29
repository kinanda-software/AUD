"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  FileText,
  Lock,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

const API_URL = "http://localhost:8000/api";

type Engagement = {
  id: number;
  title?: string;
  engagement_code?: string;
};

type TrialBalance = {
  id: number;
  engagement: number;
  period_start: string;
  period_end: string;
  currency: string;
  status: string;
  description?: string;
  total_debit?: string | number;
  total_credit?: string | number;
  difference?: string | number;
  is_balanced?: boolean;
};

type Account = {
  id: number;
  engagement: number;
  account_code: string;
  account_name: string;
  account_type?: string;
  financial_statement_section?: string;
};

type TrialBalanceLine = {
  id: number;
  trial_balance: number;
  account: number;
  account_code: string;
  account_name: string;
  debit: string | number;
  credit: string | number;
};

type LeadSchedule = {
  id: number;
  engagement: number;
  engagement_name?: string;
  trial_balance: number;

  trial_balance_period_start?: string;
  trial_balance_period_end?: string;
  trial_balance_status?: string;

  account: number;
  account_code?: string;
  account_name?: string;

  schedule_name: string;
  reference?: string;
  purpose?: string;

  opening_balance: string | number;
  adjustments: string | number;
  adjusted_balance: string | number;

  auditor_notes?: string;
  conclusion?: string;

  status: "draft" | "in_review" | "completed";

  created_at: string;
  updated_at: string;
};

type SupportingDetailStatus =
  | "draft"
  | "tested"
  | "agreed"
  | "exception";

type SupportingDetail = {
  id: number;
  lead_schedule: number;
  lead_schedule_name?: string;
  lead_schedule_adjusted_balance?: string | number;

  description: string;
  reference?: string;
  amount: string | number;
  audit_notes?: string;
  status: SupportingDetailStatus;

  created_at: string;
  updated_at: string;
};

type SupportingDetailForm = {
  description: string;
  reference: string;
  amount: string;
  audit_notes: string;
  status: SupportingDetailStatus;
};

type FormData = {
  schedule_name: string;
  reference: string;
  purpose: string;
  opening_balance: string;
  adjustments: string;
  adjusted_balance: string;
  auditor_notes: string;
  conclusion: string;
  status: LeadSchedule["status"];
};

function getCsrfToken(): string {
  const match = document.cookie.match(
    /(?:^|;\s*)csrftoken=([^;]+)/
  );

  return match ? decodeURIComponent(match[1]) : "";
}

async function getApiErrorMessage(
  response: Response
): Promise<string> {
  try {
    const data = await response.json();

    if (typeof data === "string") {
      return data;
    }

    if (data?.detail) {
      return String(data.detail);
    }

    if (Array.isArray(data)) {
      return data.join(", ");
    }

    if (data && typeof data === "object") {
      return Object.entries(data)
        .map(([field, value]) => {
          if (Array.isArray(value)) {
            return `${field}: ${value.join(", ")}`;
          }

          return `${field}: ${String(value)}`;
        })
        .join(" | ");
    }

    return `Request failed with status ${response.status}.`;
  } catch {
    return `Request failed with status ${response.status}.`;
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (
    options.method || "GET"
  ).toUpperCase();

  if (method !== "GET" && !getCsrfToken()) {
    await fetch(`${API_URL}/auth/csrf/`, {
      credentials: "include",
    });
  }

  const headers = new Headers(options.headers);

  headers.set(
    "Content-Type",
    "application/json"
  );

  const csrfToken = getCsrfToken();

  if (method !== "GET" && csrfToken) {
    headers.set(
      "X-CSRFToken",
      csrfToken
    );
  }

  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,
      headers,
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(response)
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

function toNumber(
  value: string | number | undefined | null
): number {
  const number = Number(value ?? 0);

  return Number.isFinite(number)
    ? number
    : 0;
}

function formatMoney(
  value: string | number | undefined | null,
  currency = "TZS"
): string {
  return new Intl.NumberFormat(
    "en-TZ",
    {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(toNumber(value));
}

function formatDate(
  value?: string
): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-TZ",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
}

function getStatusLabel(
  status?: string
): string {
  switch (status) {
    case "draft":
      return "Draft";

    case "imported":
      return "Imported";

    case "reviewed":
      return "Reviewed";

    case "locked":
      return "Locked";

    default:
      return status || "Unknown";
  }
}

function getScheduleStatusLabel(
  status?: LeadSchedule["status"]
): string {
  switch (status) {
    case "draft":
      return "Draft";

    case "in_review":
      return "In Review";

    case "completed":
      return "Completed";

    default:
      return status || "Unknown";
  }
}

function getSupportingStatusLabel(
  status?: SupportingDetailStatus
): string {
  switch (status) {
    case "draft":
      return "Draft";

    case "tested":
      return "Tested";

    case "agreed":
      return "Agreed";

    case "exception":
      return "Exception";

    default:
      return status || "Unknown";
  }
}

function getSupportingStatusClasses(
  status?: SupportingDetailStatus
): string {
  switch (status) {
    case "tested":
      return "bg-blue-100 text-blue-700";

    case "agreed":
      return "bg-emerald-100 text-emerald-700";

    case "exception":
      return "bg-red-100 text-red-700";

    case "draft":
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function LeadScheduleDetailPage() {
  const params = useParams();
  const router = useRouter();

  const scheduleId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [schedule, setSchedule] =
    useState<LeadSchedule | null>(null);

  const [engagement, setEngagement] =
    useState<Engagement | null>(null);

  const [trialBalance, setTrialBalance] =
    useState<TrialBalance | null>(null);

  const [account, setAccount] =
    useState<Account | null>(null);

  const [trialBalanceLine, setTrialBalanceLine] =
    useState<TrialBalanceLine | null>(null);

  const [supportingDetails, setSupportingDetails] =
    useState<SupportingDetail[]>([]);

  const [form, setForm] =
    useState<FormData>({
      schedule_name: "",
      reference: "",
      purpose: "",
      opening_balance: "0.00",
      adjustments: "0.00",
      adjusted_balance: "0.00",
      auditor_notes: "",
      conclusion: "",
      status: "draft",
    });

  const [supportingForm, setSupportingForm] =
    useState<SupportingDetailForm>({
      description: "",
      reference: "",
      amount: "",
      audit_notes: "",
      status: "draft",
    });

  const [editingSupportingId, setEditingSupportingId] =
    useState<number | null>(null);

  const [showSupportingForm, setShowSupportingForm] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [savingSupporting, setSavingSupporting] =
    useState(false);

  const [deletingSupportingId, setDeletingSupportingId] =
    useState<number | null>(null);

  const [editing, setEditing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const isLocked =
    schedule?.trial_balance_status === "locked" ||
    trialBalance?.status === "locked";

  const calculatedAdjustedBalance =
    useMemo(() => {
      return (
        toNumber(form.opening_balance) +
        toNumber(form.adjustments)
      );
    }, [
      form.opening_balance,
      form.adjustments,
    ]);

  const trialBalanceAccountBalance =
    useMemo(() => {
      if (!trialBalanceLine) {
        return 0;
      }

      return (
        toNumber(trialBalanceLine.debit) -
        toNumber(trialBalanceLine.credit)
      );
    }, [trialBalanceLine]);

  const reconciliationDifference =
    useMemo(() => {
      return (
        calculatedAdjustedBalance -
        trialBalanceAccountBalance
      );
    }, [
      calculatedAdjustedBalance,
      trialBalanceAccountBalance,
    ]);

  const isReconciled =
    Math.abs(reconciliationDifference) < 0.005;

  const supportingDetailsTotal =
    useMemo(() => {
      return supportingDetails.reduce(
        (total, detail) =>
          total + toNumber(detail.amount),
        0
      );
    }, [supportingDetails]);

  const supportingDetailsDifference =
    useMemo(() => {
      const adjustedBalance =
        editing
          ? calculatedAdjustedBalance
          : toNumber(schedule?.adjusted_balance);

      return (
        adjustedBalance -
        supportingDetailsTotal
      );
    }, [
      supportingDetails,
      supportingDetailsTotal,
      calculatedAdjustedBalance,
      editing,
      schedule,
    ]);

  const supportingDetailsReconciled =
    Math.abs(
      supportingDetailsDifference
    ) < 0.005;

  const supportingExceptionCount =
    useMemo(() => {
      return supportingDetails.filter(
        (detail) =>
          detail.status === "exception"
      ).length;
    }, [supportingDetails]);

  const currency =
    trialBalance?.currency || "TZS";

  function updateField<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateSupportingField<
    K extends keyof SupportingDetailForm
  >(
    field: K,
    value: SupportingDetailForm[K]
  ) {
    setSupportingForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetSupportingForm() {
    setSupportingForm({
      description: "",
      reference: "",
      amount: "",
      audit_notes: "",
      status: "draft",
    });

    setEditingSupportingId(null);
    setShowSupportingForm(false);
  }

  async function loadSupportingDetails(
    currentScheduleId: number
  ) {
    const data =
      await apiRequest<SupportingDetail[]>(
        `/financials/supporting-details/?lead_schedule=${currentScheduleId}`
      );

    setSupportingDetails(data);
  }

  async function loadData() {
    if (!scheduleId) {
      setError(
        "Lead Schedule ID is missing."
      );

      setLoading(false);

      return;
    }

    try {
      setLoading(true);
      setError("");

      const scheduleData =
        await apiRequest<LeadSchedule>(
          `/financials/lead-schedules/${scheduleId}/`
        );

      setSchedule(scheduleData);

      setForm({
        schedule_name:
          scheduleData.schedule_name || "",
        reference:
          scheduleData.reference || "",
        purpose:
          scheduleData.purpose || "",
        opening_balance: String(
          scheduleData.opening_balance ??
            "0.00"
        ),
        adjustments: String(
          scheduleData.adjustments ??
            "0.00"
        ),
        adjusted_balance: String(
          scheduleData.adjusted_balance ??
            "0.00"
        ),
        auditor_notes:
          scheduleData.auditor_notes || "",
        conclusion:
          scheduleData.conclusion || "",
        status:
          scheduleData.status || "draft",
      });

      const [
        engagementData,
        trialBalanceData,
        accountData,
        trialBalanceLines,
        supportingDetailsData,
      ] = await Promise.all([
        apiRequest<Engagement>(
          `/engagements/${scheduleData.engagement}/`
        ),

        apiRequest<TrialBalance>(
          `/financials/trial-balances/${scheduleData.trial_balance}/`
        ),

        apiRequest<Account>(
          `/financials/chart-of-accounts/${scheduleData.account}/`
        ),

        apiRequest<TrialBalanceLine[]>(
          `/financials/trial-balance-lines/?trial_balance=${scheduleData.trial_balance}`
        ),

        apiRequest<SupportingDetail[]>(
          `/financials/supporting-details/?lead_schedule=${scheduleData.id}`
        ),
      ]);

      setEngagement(
        engagementData
      );

      setTrialBalance(
        trialBalanceData
      );

      setAccount(
        accountData
      );

      setSupportingDetails(
        supportingDetailsData
      );

      const matchingLine =
        trialBalanceLines.find(
          (line) =>
            Number(line.account) ===
            Number(scheduleData.account)
        );

      setTrialBalanceLine(
        matchingLine || null
      );

      if (!matchingLine) {
        console.warn(
          "No Trial Balance line found for this Lead Schedule account."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Lead Schedule."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [scheduleId]);

  useEffect(() => {
    if (!editing) {
      return;
    }

    setForm((current) => ({
      ...current,
      adjusted_balance:
        calculatedAdjustedBalance.toFixed(2),
    }));
  }, [
    calculatedAdjustedBalance,
    editing,
  ]);

  async function handleSave() {
    if (!schedule) return;

    if (isLocked) {
      setError(
        "This Lead Schedule cannot be modified because its Trial Balance is locked."
      );

      return;
    }

    if (!form.schedule_name.trim()) {
      setError(
        "Schedule name is required."
      );

      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        schedule_name:
          form.schedule_name.trim(),

        reference:
          form.reference.trim(),

        purpose:
          form.purpose.trim(),

        opening_balance:
          Number(
            form.opening_balance || 0
          ),

        adjustments:
          Number(
            form.adjustments || 0
          ),

        adjusted_balance:
          Number(
            calculatedAdjustedBalance.toFixed(
              2
            )
          ),

        auditor_notes:
          form.auditor_notes.trim(),

        conclusion:
          form.conclusion.trim(),

        status:
          form.status,
      };

      await apiRequest<LeadSchedule>(
        `/financials/lead-schedules/${schedule.id}/`,
        {
          method: "PATCH",
          body: JSON.stringify(
            payload
          ),
        }
      );

      setSuccess(
        "Lead Schedule saved successfully."
      );

      setEditing(false);

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save Lead Schedule."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!schedule) return;

    if (isLocked) {
      setError(
        "This Lead Schedule cannot be deleted because its Trial Balance is locked."
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this Lead Schedule? This action cannot be undone."
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setError("");

      await apiRequest(
        `/financials/lead-schedules/${schedule.id}/`,
        {
          method: "DELETE",
        }
      );

      router.push(
        "/financials/lead-schedules"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete Lead Schedule."
      );
    } finally {
      setDeleting(false);
    }
  }

  function cancelEditing() {
    if (!schedule) return;

    setForm({
      schedule_name:
        schedule.schedule_name || "",

      reference:
        schedule.reference || "",

      purpose:
        schedule.purpose || "",

      opening_balance:
        String(
          schedule.opening_balance ??
            "0.00"
        ),

      adjustments:
        String(
          schedule.adjustments ??
            "0.00"
        ),

      adjusted_balance:
        String(
          schedule.adjusted_balance ??
            "0.00"
        ),

      auditor_notes:
        schedule.auditor_notes || "",

      conclusion:
        schedule.conclusion || "",

      status:
        schedule.status || "draft",
    });

    setEditing(false);
    setError("");
  }

  function startSupportingEdit(
    detail: SupportingDetail
  ) {
    setSupportingForm({
      description:
        detail.description || "",

      reference:
        detail.reference || "",

      amount:
        String(
          detail.amount ?? ""
        ),

      audit_notes:
        detail.audit_notes || "",

      status:
        detail.status || "draft",
    });

    setEditingSupportingId(
      detail.id
    );

    setShowSupportingForm(true);

    setError("");
    setSuccess("");
  }

  async function handleSupportingSave() {
    if (!schedule) return;

    if (isLocked) {
      setError(
        "Supporting details cannot be modified because the linked Trial Balance is locked."
      );

      return;
    }

    if (
      !supportingForm.description.trim()
    ) {
      setError(
        "Supporting detail description is required."
      );

      return;
    }

    const amount = Number(
      supportingForm.amount || 0
    );

    if (
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      setError(
        "Supporting detail amount must be zero or greater."
      );

      return;
    }

    try {
      setSavingSupporting(true);
      setError("");
      setSuccess("");

      const payload = {
        lead_schedule:
          schedule.id,

        description:
          supportingForm.description.trim(),

        reference:
          supportingForm.reference.trim(),

        amount,

        audit_notes:
          supportingForm.audit_notes.trim(),

        status:
          supportingForm.status,
      };

      if (editingSupportingId) {
        await apiRequest<SupportingDetail>(
          `/financials/supporting-details/${editingSupportingId}/`,
          {
            method: "PATCH",
            body: JSON.stringify(
              payload
            ),
          }
        );

        setSuccess(
          "Supporting detail updated successfully."
        );
      } else {
        await apiRequest<SupportingDetail>(
          `/financials/supporting-details/`,
          {
            method: "POST",
            body: JSON.stringify(
              payload
            ),
          }
        );

        setSuccess(
          "Supporting detail added successfully."
        );
      }

      resetSupportingForm();

      await loadSupportingDetails(
        schedule.id
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save supporting detail."
      );
    } finally {
      setSavingSupporting(false);
    }
  }

  async function handleSupportingDelete(
    detail: SupportingDetail
  ) {
    if (!schedule) return;

    if (isLocked) {
      setError(
        "Supporting details cannot be deleted because the linked Trial Balance is locked."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Delete supporting detail "${detail.description}"? This action cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingSupportingId(
        detail.id
      );

      setError("");
      setSuccess("");

      await apiRequest(
        `/financials/supporting-details/${detail.id}/`,
        {
          method: "DELETE",
        }
      );

      setSupportingDetails(
        (current) =>
          current.filter(
            (item) =>
              item.id !== detail.id
          )
      );

      setSuccess(
        "Supporting detail deleted successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete supporting detail."
      );
    } finally {
      setDeletingSupportingId(
        null
      );
    }
  }

  if (loading) {
    return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-sm text-slate-500">
            Loading Lead Schedule...
          </div>
        </div>
    );
  }

  if (!schedule) {
    return (
        <div className="p-6">
          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 text-red-600" />

              <div>
                <h2 className="font-semibold text-red-900">
                  Lead Schedule not found
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error ||
                    "The requested Lead Schedule could not be loaded."}
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/financials/lead-schedules"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lead Schedules
          </Link>
        </div>
    );
  }

  return (
      <div className="w-full bg-slate-50">
        <div className="w-full px-6 py-6">

          {/* Header */}
          <div className="mb-6">
            <Link
              href="/financials/lead-schedules"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Lead Schedules
            </Link>

            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-slate-900 p-2">
                    <FileText className="h-5 w-5 text-white" />
                  </div>

                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                      {schedule.schedule_name}
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                      Lead Schedule Working Paper
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    schedule.status ===
                    "completed"
                      ? "bg-emerald-100 text-emerald-700"
                      : schedule.status ===
                        "in_review"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {getScheduleStatusLabel(
                    schedule.status
                  )}
                </span>

                {isLocked && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">
                    <Lock className="h-3.5 w-3.5" />
                    Trial Balance Locked
                  </span>
                )}

                {!editing &&
                  !isLocked && (
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setSuccess("");
                        setEditing(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                  )}

                {editing && (
                  <>
                    <button
                      type="button"
                      onClick={
                        cancelEditing
                      }
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleSave
                      }
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {saving
                        ? "Saving..."
                        : "Save Changes"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                <div>
                  <p className="font-semibold text-red-900">
                    Action could not be completed
                  </p>

                  <p className="mt-1 text-sm text-red-700">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                <div>
                  <p className="font-semibold text-emerald-900">
                    Success
                  </p>

                  <p className="mt-1 text-sm text-emerald-700">
                    {success}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Locked warning */}
          {isLocked && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                <div>
                  <p className="font-semibold text-amber-900">
                    Read-only working paper
                  </p>

                  <p className="mt-1 text-sm text-amber-800">
                    The Trial Balance linked to this Lead Schedule
                    is locked. This Lead Schedule and its supporting
                    details can be reviewed, but they cannot be
                    modified or deleted.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Engagement / TB information */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Engagement
              </p>

              <p className="mt-2 font-semibold text-slate-900">
                {engagement?.title ||
                  schedule.engagement_name ||
                  `Engagement #${schedule.engagement}`}
              </p>

              {engagement?.engagement_code && (
                <p className="mt-1 text-xs text-slate-500">
                  {engagement.engagement_code}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Trial Balance
              </p>

              <p className="mt-2 font-semibold text-slate-900">
                TB #{schedule.trial_balance}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {formatDate(
                  trialBalance?.period_start
                )}
                {" — "}
                {formatDate(
                  trialBalance?.period_end
                )}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Account
              </p>

              <p className="mt-2 font-semibold text-slate-900">
                {account?.account_name ||
                  schedule.account_name ||
                  "Unknown account"}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {account?.account_code ||
                  schedule.account_code ||
                  "—"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Trial Balance Status
              </p>

              <div className="mt-2">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    trialBalance?.status ===
                    "locked"
                      ? "bg-amber-100 text-amber-800"
                      : trialBalance?.status ===
                        "reviewed"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {getStatusLabel(
                    trialBalance?.status ||
                      schedule.trial_balance_status
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

            {/* Main working paper */}
            <div className="space-y-6 xl:col-span-2">

              {/* Schedule information */}
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h2 className="font-semibold text-slate-900">
                    Working Paper Information
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Core identification and purpose of the Lead
                    Schedule.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">
                      Schedule Name
                    </label>

                    {editing ? (
                      <input
                        value={
                          form.schedule_name
                        }
                        onChange={(event) =>
                          updateField(
                            "schedule_name",
                            event.target.value
                          )
                        }
                        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                      />
                    ) : (
                      <p className="mt-2 text-sm text-slate-900">
                        {schedule.schedule_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Reference
                    </label>

                    {editing ? (
                      <input
                        value={
                          form.reference
                        }
                        onChange={(event) =>
                          updateField(
                            "reference",
                            event.target.value
                          )
                        }
                        placeholder="e.g. A-01"
                        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                      />
                    ) : (
                      <p className="mt-2 text-sm text-slate-900">
                        {schedule.reference ||
                          "—"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Status
                    </label>

                    {editing ? (
                      <select
                        value={
                          form.status
                        }
                        onChange={(event) =>
                          updateField(
                            "status",
                            event.target.value as LeadSchedule["status"]
                          )
                        }
                        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                      >
                        <option value="draft">
                          Draft
                        </option>

                        <option value="in_review">
                          In Review
                        </option>

                        <option value="completed">
                          Completed
                        </option>
                      </select>
                    ) : (
                      <p className="mt-2 text-sm text-slate-900">
                        {getScheduleStatusLabel(
                          schedule.status
                        )}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">
                      Purpose
                    </label>

                    {editing ? (
                      <textarea
                        rows={4}
                        value={
                          form.purpose
                        }
                        onChange={(event) =>
                          updateField(
                            "purpose",
                            event.target.value
                          )
                        }
                        placeholder="Describe the purpose of this Lead Schedule..."
                        className="mt-2 w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                      />
                    ) : (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {schedule.purpose ||
                          "No purpose recorded."}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Balance section */}
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h2 className="font-semibold text-slate-900">
                    Lead Schedule Balances
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Reconcile the working paper balance to the
                    corresponding Trial Balance account.
                  </p>
                </div>

                <div className="p-6">
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">
                            Item
                          </th>

                          <th className="px-4 py-3 text-right font-semibold text-slate-700">
                            Amount
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="px-4 py-4 text-slate-700">
                            Opening Balance
                          </td>

                          <td className="px-4 py-4 text-right">
                            {editing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={
                                  form.opening_balance
                                }
                                onChange={(event) =>
                                  updateField(
                                    "opening_balance",
                                    event.target.value
                                  )
                                }
                                className="w-48 rounded-lg border border-slate-300 px-3 py-2 text-right text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                              />
                            ) : (
                              <span className="font-medium text-slate-900">
                                {formatMoney(
                                  schedule.opening_balance,
                                  currency
                                )}
                              </span>
                            )}
                          </td>
                        </tr>

                        <tr>
                          <td className="px-4 py-4 text-slate-700">
                            Adjustments
                          </td>

                          <td className="px-4 py-4 text-right">
                            {editing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={
                                  form.adjustments
                                }
                                onChange={(event) =>
                                  updateField(
                                    "adjustments",
                                    event.target.value
                                  )
                                }
                                className="w-48 rounded-lg border border-slate-300 px-3 py-2 text-right text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                              />
                            ) : (
                              <span className="font-medium text-slate-900">
                                {formatMoney(
                                  schedule.adjustments,
                                  currency
                                )}
                              </span>
                            )}
                          </td>
                        </tr>

                        <tr className="bg-slate-50">
                          <td className="px-4 py-4 font-semibold text-slate-900">
                            Adjusted Balance
                          </td>

                          <td className="px-4 py-4 text-right font-bold text-slate-900">
                            {formatMoney(
                              editing
                                ? calculatedAdjustedBalance
                                : schedule.adjusted_balance,
                              currency
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/* =====================================================
                  SUPPORTING DETAILS
              ====================================================== */}
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <h2 className="font-semibold text-slate-900">
                        Supporting Details
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Break down the Lead Schedule balance into
                        supporting items and document the audit work
                        performed.
                      </p>
                    </div>

                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => {
                          setError("");
                          setSuccess("");

                          setEditingSupportingId(
                            null
                          );

                          setSupportingForm({
                            description: "",
                            reference: "",
                            amount: "",
                            audit_notes: "",
                            status: "draft",
                          });

                          setShowSupportingForm(
                            true
                          );
                        }}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        <Plus className="h-4 w-4" />
                        Add Supporting Detail
                      </button>
                    )}
                  </div>
                </div>

                {/* Supporting detail form */}
                {showSupportingForm &&
                  !isLocked && (
                    <div className="border-b border-slate-200 bg-slate-50 p-6">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {editingSupportingId
                              ? "Edit Supporting Detail"
                              : "Add Supporting Detail"}
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            Enter the amount and supporting audit
                            documentation.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={
                            resetSupportingForm
                          }
                          className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-900"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-slate-700">
                            Description
                          </label>

                          <input
                            value={
                              supportingForm.description
                            }
                            onChange={(event) =>
                              updateSupportingField(
                                "description",
                                event.target.value
                              )
                            }
                            placeholder="e.g. Bank account - CRDB"
                            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-slate-700">
                            Reference
                          </label>

                          <input
                            value={
                              supportingForm.reference
                            }
                            onChange={(event) =>
                              updateSupportingField(
                                "reference",
                                event.target.value
                              )
                            }
                            placeholder="e.g. BANK-001"
                            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-slate-700">
                            Amount
                          </label>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              supportingForm.amount
                            }
                            onChange={(event) =>
                              updateSupportingField(
                                "amount",
                                event.target.value
                              )
                            }
                            placeholder="0.00"
                            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-right text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-slate-700">
                            Status
                          </label>

                          <select
                            value={
                              supportingForm.status
                            }
                            onChange={(event) =>
                              updateSupportingField(
                                "status",
                                event.target.value as SupportingDetailStatus
                              )
                            }
                            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          >
                            <option value="draft">
                              Draft
                            </option>

                            <option value="tested">
                              Tested
                            </option>

                            <option value="agreed">
                              Agreed
                            </option>

                            <option value="exception">
                              Exception
                            </option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-slate-700">
                            Audit Notes
                          </label>

                          <textarea
                            rows={4}
                            value={
                              supportingForm.audit_notes
                            }
                            onChange={(event) =>
                              updateSupportingField(
                                "audit_notes",
                                event.target.value
                              )
                            }
                            placeholder="Document the evidence inspected, procedures performed, exceptions identified, or other observations..."
                            className="mt-2 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                          />
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={
                            resetSupportingForm
                          }
                          disabled={
                            savingSupporting
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={
                            handleSupportingSave
                          }
                          disabled={
                            savingSupporting
                          }
                          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Save className="h-4 w-4" />

                          {savingSupporting
                            ? "Saving..."
                            : editingSupportingId
                            ? "Update Detail"
                            : "Add Detail"}
                        </button>
                      </div>
                    </div>
                  )}

                <div className="p-6">
                  {supportingDetails.length ===
                  0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                      <FileText className="mx-auto h-8 w-8 text-slate-400" />

                      <p className="mt-3 font-medium text-slate-700">
                        No supporting details recorded
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Add the individual items that make up this
                        Lead Schedule balance.
                      </p>

                      {!isLocked && (
                        <button
                          type="button"
                          onClick={() => {
                            setError("");
                            setSuccess("");

                            setEditingSupportingId(
                              null
                            );

                            setSupportingForm({
                              description: "",
                              reference: "",
                              amount: "",
                              audit_notes: "",
                              status: "draft",
                            });

                            setShowSupportingForm(
                              true
                            );
                          }}
                          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          <Plus className="h-4 w-4" />
                          Add First Detail
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="min-w-[900px] w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                Description
                              </th>

                              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                                Reference
                              </th>

                              <th className="px-4 py-3 text-right font-semibold text-slate-700">
                                Amount
                              </th>

                              <th className="px-4 py-3 text-center font-semibold text-slate-700">
                                Status
                              </th>

                              <th className="px-4 py-3 text-right font-semibold text-slate-700">
                                Actions
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-200">
                            {supportingDetails.map(
                              (detail) => (
                                <tr
                                  key={
                                    detail.id
                                  }
                                  className="hover:bg-slate-50"
                                >
                                  <td className="px-4 py-4">
                                    <div className="font-medium text-slate-900">
                                      {
                                        detail.description
                                      }
                                    </div>

                                    {detail.audit_notes && (
                                      <div className="mt-1 max-w-md truncate text-xs text-slate-500">
                                        {
                                          detail.audit_notes
                                        }
                                      </div>
                                    )}
                                  </td>

                                  <td className="px-4 py-4 text-slate-600">
                                    {detail.reference ||
                                      "—"}
                                  </td>

                                  <td className="px-4 py-4 text-right font-medium text-slate-900">
                                    {formatMoney(
                                      detail.amount,
                                      currency
                                    )}
                                  </td>

                                  <td className="px-4 py-4 text-center">
                                    <span
                                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getSupportingStatusClasses(
                                        detail.status
                                      )}`}
                                    >
                                      {getSupportingStatusLabel(
                                        detail.status
                                      )}
                                    </span>
                                  </td>

                                  <td className="px-4 py-4">
                                    <div className="flex justify-end gap-2">
                                      {!isLocked && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              startSupportingEdit(
                                                detail
                                              )
                                            }
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                          >
                                            <Pencil className="h-3.5 w-3.5" />
                                            Edit
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleSupportingDelete(
                                                detail
                                              )
                                            }
                                            disabled={
                                              deletingSupportingId ===
                                              detail.id
                                            }
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />

                                            {deletingSupportingId ===
                                            detail.id
                                              ? "Deleting..."
                                              : "Delete"}
                                          </button>
                                        </>
                                      )}

                                      {isLocked && (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                                          <Lock className="h-3.5 w-3.5" />
                                          Read only
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>

                          <tfoot className="border-t-2 border-slate-300 bg-slate-50">
                            <tr>
                              <td
                                colSpan={2}
                                className="px-4 py-4 font-semibold text-slate-900"
                              >
                                Supporting Details Total
                              </td>

                              <td className="px-4 py-4 text-right font-bold text-slate-900">
                                {formatMoney(
                                  supportingDetailsTotal,
                                  currency
                                )}
                              </td>

                              <td
                                colSpan={2}
                                className="px-4 py-4"
                              />
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Supporting reconciliation */}
                      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Lead Schedule Balance
                          </p>

                          <p className="mt-2 text-lg font-bold text-slate-900">
                            {formatMoney(
                              editing
                                ? calculatedAdjustedBalance
                                : schedule.adjusted_balance,
                              currency
                            )}
                          </p>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Supporting Details Total
                          </p>

                          <p className="mt-2 text-lg font-bold text-slate-900">
                            {formatMoney(
                              supportingDetailsTotal,
                              currency
                            )}
                          </p>
                        </div>

                        <div
                          className={`rounded-lg border p-4 ${
                            supportingDetailsReconciled
                              ? "border-emerald-200 bg-emerald-50"
                              : "border-red-200 bg-red-50"
                          }`}
                        >
                          <p
                            className={`text-xs font-semibold uppercase tracking-wide ${
                              supportingDetailsReconciled
                                ? "text-emerald-700"
                                : "text-red-700"
                            }`}
                          >
                            Difference
                          </p>

                          <p
                            className={`mt-2 text-lg font-bold ${
                              supportingDetailsReconciled
                                ? "text-emerald-700"
                                : "text-red-700"
                            }`}
                          >
                            {formatMoney(
                              supportingDetailsDifference,
                              currency
                            )}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`mt-4 rounded-lg p-4 ${
                          supportingDetailsReconciled &&
                          supportingExceptionCount === 0
                            ? "bg-emerald-50"
                            : "bg-amber-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {supportingDetailsReconciled &&
                          supportingExceptionCount ===
                            0 ? (
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                          ) : (
                            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                          )}

                          <div>
                            <p
                              className={`font-semibold ${
                                supportingDetailsReconciled &&
                                supportingExceptionCount ===
                                  0
                                  ? "text-emerald-900"
                                  : "text-amber-900"
                              }`}
                            >
                              {supportingDetailsReconciled
                                ? supportingExceptionCount >
                                  0
                                  ? "Balance reconciled with exceptions"
                                  : "Supporting details reconciled"
                                : "Supporting details require reconciliation"}
                            </p>

                            <p
                              className={`mt-1 text-xs leading-5 ${
                                supportingDetailsReconciled &&
                                supportingExceptionCount ===
                                  0
                                  ? "text-emerald-700"
                                  : "text-amber-800"
                              }`}
                            >
                              {supportingDetailsReconciled
                                ? supportingExceptionCount >
                                  0
                                  ? `${supportingExceptionCount} supporting detail(s) are marked as exceptions and require auditor attention.`
                                  : "The supporting detail total agrees with the Lead Schedule adjusted balance."
                                : "The supporting detail total does not agree with the Lead Schedule adjusted balance. Investigate the difference before completion."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* Notes */}
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h2 className="font-semibold text-slate-900">
                    Audit Documentation
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Record audit observations and the working paper
                    conclusion.
                  </p>
                </div>

                <div className="space-y-5 p-6">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Auditor Notes
                    </label>

                    {editing ? (
                      <textarea
                        rows={6}
                        value={
                          form.auditor_notes
                        }
                        onChange={(event) =>
                          updateField(
                            "auditor_notes",
                            event.target.value
                          )
                        }
                        placeholder="Document procedures performed, explanations, reconciling items, or observations..."
                        className="mt-2 w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                      />
                    ) : (
                      <div className="mt-2 min-h-24 rounded-lg bg-slate-50 p-4">
                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {schedule.auditor_notes ||
                            "No auditor notes recorded."}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Conclusion
                    </label>

                    {editing ? (
                      <textarea
                        rows={5}
                        value={
                          form.conclusion
                        }
                        onChange={(event) =>
                          updateField(
                            "conclusion",
                            event.target.value
                          )
                        }
                        placeholder="Document the conclusion reached from the work performed..."
                        className="mt-2 w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                      />
                    ) : (
                      <div className="mt-2 min-h-24 rounded-lg bg-slate-50 p-4">
                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {schedule.conclusion ||
                            "No conclusion recorded."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* Reconciliation panel */}
            <div className="space-y-6">

              {/* Lead Schedule reconciliation */}
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="font-semibold text-slate-900">
                    Reconciliation
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Lead Schedule adjusted balance compared with
                    the corresponding Trial Balance account.
                  </p>
                </div>

                <div className="space-y-4 p-5">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Lead Schedule
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatMoney(
                        editing
                          ? calculatedAdjustedBalance
                          : schedule.adjusted_balance,
                        currency
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      TB Debit
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatMoney(
                        trialBalanceLine?.debit ||
                          0,
                        currency
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      TB Credit
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatMoney(
                        trialBalanceLine?.credit ||
                          0,
                        currency
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      TB Account Balance
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatMoney(
                        trialBalanceAccountBalance,
                        currency
                      )}
                    </p>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">
                        Difference
                      </span>

                      <span
                        className={`text-lg font-bold ${
                          isReconciled
                            ? "text-emerald-700"
                            : "text-red-700"
                        }`}
                      >
                        {formatMoney(
                          reconciliationDifference,
                          currency
                        )}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`rounded-lg p-4 ${
                      isReconciled
                        ? "bg-emerald-50"
                        : "bg-red-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {isReconciled ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                      ) : (
                        <CircleAlert className="mt-0.5 h-5 w-5 text-red-600" />
                      )}

                      <div>
                        <p
                          className={`font-semibold ${
                            isReconciled
                              ? "text-emerald-900"
                              : "text-red-900"
                          }`}
                        >
                          {isReconciled
                            ? "Reconciled"
                            : "Reconciliation Required"}
                        </p>

                        <p
                          className={`mt-1 text-xs leading-5 ${
                            isReconciled
                              ? "text-emerald-700"
                              : "text-red-700"
                          }`}
                        >
                          {isReconciled
                            ? "The Lead Schedule adjusted balance agrees with the Trial Balance account."
                            : "The Lead Schedule does not currently agree with the Trial Balance account. Investigate the difference before completion."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {!trialBalanceLine && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                        <div>
                          <p className="font-semibold text-amber-900">
                            TB account line not found
                          </p>

                          <p className="mt-1 text-xs leading-5 text-amber-800">
                            No Trial Balance line was found for
                            this Lead Schedule account.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Supporting details summary */}
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="font-semibold text-slate-900">
                    Supporting Details Summary
                  </h2>
                </div>

                <div className="space-y-4 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      Lead Schedule Balance
                    </span>

                    <span className="text-sm font-semibold text-slate-900">
                      {formatMoney(
                        editing
                          ? calculatedAdjustedBalance
                          : schedule.adjusted_balance,
                        currency
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      Supporting Total
                    </span>

                    <span className="text-sm font-semibold text-slate-900">
                      {formatMoney(
                        supportingDetailsTotal,
                        currency
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                    <span className="text-sm font-semibold text-slate-700">
                      Difference
                    </span>

                    <span
                      className={`text-sm font-bold ${
                        supportingDetailsReconciled
                          ? "text-emerald-700"
                          : "text-red-700"
                      }`}
                    >
                      {formatMoney(
                        supportingDetailsDifference,
                        currency
                      )}
                    </span>
                  </div>

                  <div
                    className={`rounded-lg p-3 text-center text-xs font-semibold ${
                      supportingDetailsReconciled
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {supportingDetailsReconciled
                      ? "Supporting details reconciled"
                      : "Supporting details not reconciled"}
                  </div>

                  {supportingExceptionCount >
                    0 && (
                    <div className="rounded-lg bg-red-50 p-3 text-center text-xs font-semibold text-red-700">
                      {supportingExceptionCount} exception
                      {supportingExceptionCount !==
                      1
                        ? "s"
                        : ""}{" "}
                      require attention
                    </div>
                  )}
                </div>
              </section>

              {/* TB summary */}
              {trialBalance && (
                <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="font-semibold text-slate-900">
                      Trial Balance Summary
                    </h2>
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">
                        Total Debit
                      </span>

                      <span className="text-sm font-semibold text-slate-900">
                        {formatMoney(
                          trialBalance.total_debit,
                          currency
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">
                        Total Credit
                      </span>

                      <span className="text-sm font-semibold text-slate-900">
                        {formatMoney(
                          trialBalance.total_credit,
                          currency
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                      <span className="text-sm font-semibold text-slate-700">
                        TB Difference
                      </span>

                      <span className="text-sm font-bold text-slate-900">
                        {formatMoney(
                          trialBalance.difference,
                          currency
                        )}
                      </span>
                    </div>

                    <div
                      className={`rounded-lg p-3 text-center text-xs font-semibold ${
                        trialBalance.is_balanced
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {trialBalance.is_balanced
                        ? "Trial Balance is balanced"
                        : "Trial Balance is not balanced"}
                    </div>
                  </div>
                </section>
              )}

              {/* Metadata */}
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="font-semibold text-slate-900">
                    Record Information
                  </h2>
                </div>

                <div className="space-y-3 p-5 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      Created
                    </span>

                    <span className="text-right text-slate-700">
                      {formatDate(
                        schedule.created_at
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      Last Updated
                    </span>

                    <span className="text-right text-slate-700">
                      {formatDate(
                        schedule.updated_at
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      Schedule ID
                    </span>

                    <span className="font-mono text-xs text-slate-700">
                      #{schedule.id}
                    </span>
                  </div>
                </div>
              </section>

              {/* Delete */}
              {!isLocked &&
                !editing && (
                  <section className="rounded-xl border border-red-200 bg-white shadow-sm">
                    <div className="p-5">
                      <h2 className="font-semibold text-red-900">
                        Danger Zone
                      </h2>

                      <p className="mt-1 text-xs leading-5 text-red-700">
                        Deleting this Lead Schedule is permanent.
                      </p>

                      <button
                        type="button"
                        onClick={
                          handleDelete
                        }
                        disabled={
                          deleting
                        }
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />

                        {deleting
                          ? "Deleting..."
                          : "Delete Lead Schedule"}
                      </button>
                    </div>
                  </section>
                )}
            </div>
          </div>
        </div>
      </div>
  );
}
