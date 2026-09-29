"use client";

import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  X,
} from "lucide-react";

import {
  getAdjustedTrialBalance,
  type AdjustedTrialBalance,
} from "@/lib/api";

const API_URL = "http://localhost:8000/api";

type Engagement = {
  id: number;
  code?: string;
  name?: string;
  title?: string;
  legal_name?: string;
};

type TrialBalance = {
  id: number;
  engagement: number;
  period_start: string;
  period_end: string;
  currency: string;
  status: string;
  description: string;
};

type Account = {
  id: number;
  engagement: number;
  account_code: string;
  account_name: string;
  account_type?: string;
  financial_statement_section?: string;
  is_active?: boolean;
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
  reference: string;
  purpose: string;
  opening_balance: number | string;
  adjustments: number | string;
  adjusted_balance: number | string;
  auditor_notes: string;
  conclusion: string;
  status: "draft" | "in_review" | "completed";
  created_at: string;
  updated_at: string;
};

type FormData = {
  engagement: string;
  trial_balance: string;
  account: string;
  schedule_name: string;
  reference: string;
  purpose: string;
  opening_balance: string;
  adjustments: string;
  adjusted_balance: string;
  auditor_notes: string;
  conclusion: string;
  status: "draft" | "in_review" | "completed";
};

function getCsrfToken(): string {
  if (typeof document === "undefined") {
    return "";
  }

  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrftoken="));

  if (!cookie) {
    return "";
  }

  return decodeURIComponent(
    cookie.substring("csrftoken=".length)
  );
}

async function ensureCsrfToken(): Promise<string> {
  let token = getCsrfToken();

  if (token) {
    return token;
  }

  try {
    await fetch(`${API_URL}/auth/csrf-token/`, {
      method: "GET",
      credentials: "include",
    });
  } catch {
    return "";
  }

  token = getCsrfToken();

  return token;
}

function getApiErrorMessage(
  data: unknown,
  fallback: string
): string {
  if (typeof data === "string") {
    return data || fallback;
  }

  if (Array.isArray(data)) {
    return data.map(String).join(" ");
  }

  if (
    typeof data === "object" &&
    data !== null
  ) {
    const objectData =
      data as Record<string, unknown>;

    if (
      Array.isArray(
        objectData.non_field_errors
      )
    ) {
      return objectData.non_field_errors
        .map(String)
        .join(" ");
    }

    if (
      typeof objectData.detail === "string"
    ) {
      return objectData.detail;
    }

    const messages = Object.entries(
      objectData
    ).flatMap(([field, value]) => {
      if (Array.isArray(value)) {
        return value.map(
          (message) =>
            `${field}: ${String(message)}`
        );
      }

      if (typeof value === "string") {
        return [`${field}: ${value}`];
      }

      return [];
    });

    if (messages.length > 0) {
      return messages.join(" | ");
    }
  }

  return fallback;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (
    options.method || "GET"
  ).toUpperCase();

  const headers = new Headers(
    options.headers
  );

  headers.set(
    "Content-Type",
    "application/json"
  );

  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(
      method
    )
  ) {
    const csrfToken =
      await ensureCsrfToken();

    if (csrfToken) {
      headers.set(
        "X-CSRFToken",
        csrfToken
      );
    }
  }

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      method,
      headers,
      credentials: "include",
    }
  );

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  let data: unknown = null;

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(
        data,
        `Request failed with status ${response.status}`
      )
    );
  }

  return data as T;
}

function formatMoney(
  value: number | string,
  currency = "TZS"
) {
  const amount = Number(value || 0);

  return `${currency} ${amount.toLocaleString(
    "en-TZ",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatDate(date?: string) {
  if (!date) {
    return "-";
  }

  return new Date(
    date
  ).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getEngagementLabel(
  engagement: Engagement
) {
  return (
    engagement.code ||
    engagement.title ||
    engagement.name ||
    engagement.legal_name ||
    `Engagement #${engagement.id}`
  );
}

function getTrialBalanceStatusLabel(
  status: string
) {
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
      return status;
  }
}

/*
 * IMPORTANT:
 *
 * The component that uses useSearchParams()
 * is kept separate from the default page
 * component.
 *
 * Next.js requires useSearchParams()
 * to be inside a Suspense boundary during
 * production prerendering.
 */
function LeadSchedulesContent() {
  const searchParams =
    useSearchParams();

  const trialBalanceFromUrl =
    searchParams.get(
      "trial_balance"
    );

  const requestedTrialBalanceId =
    trialBalanceFromUrl
      ? Number(trialBalanceFromUrl)
      : null;

  const [
    leadSchedules,
    setLeadSchedules,
  ] = useState<LeadSchedule[]>([]);

  const [
    engagements,
    setEngagements,
  ] = useState<Engagement[]>([]);

  const [
    trialBalances,
    setTrialBalances,
  ] = useState<TrialBalance[]>([]);

  const [
    accounts,
    setAccounts,
  ] = useState<Account[]>([]);

  const [
    adjustedTrialBalance,
    setAdjustedTrialBalance,
  ] =
    useState<AdjustedTrialBalance | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadingOptions,
    setLoadingOptions,
  ] = useState(true);

  const [
    loadingAdjustedBalance,
    setLoadingAdjustedBalance,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    form,
    setForm,
  ] = useState<FormData>({
    engagement: "",
    trial_balance: "",
    account: "",
    schedule_name: "",
    reference: "",
    purpose: "",
    opening_balance: "",
    adjustments: "",
    adjusted_balance: "",
    auditor_notes: "",
    conclusion: "",
    status: "draft",
  });

  const selectedTrialBalance =
    useMemo(() => {
      return trialBalances.find(
        (tb) =>
          tb.id ===
          Number(form.trial_balance)
      );
    }, [
      trialBalances,
      form.trial_balance,
    ]);

  const selectedAccount =
    useMemo(() => {
      return accounts.find(
        (account) =>
          account.id ===
          Number(form.account)
      );
    }, [
      accounts,
      form.account,
    ]);

  const filteredTrialBalances =
    useMemo(() => {
      if (!form.engagement) {
        return [];
      }

      return trialBalances.filter(
        (tb) =>
          tb.engagement ===
          Number(form.engagement)
      );
    }, [
      trialBalances,
      form.engagement,
    ]);

  const filteredAccounts =
    useMemo(() => {
      if (!form.engagement) {
        return [];
      }

      return accounts.filter(
        (account) =>
          account.engagement ===
            Number(form.engagement) &&
          account.is_active !== false
      );
    }, [
      accounts,
      form.engagement,
    ]);

  const existingSchedule =
    useMemo(() => {
      if (
        !form.engagement ||
        !form.trial_balance ||
        !form.account
      ) {
        return undefined;
      }

      return leadSchedules.find(
        (schedule) =>
          schedule.engagement ===
            Number(form.engagement) &&
          schedule.trial_balance ===
            Number(form.trial_balance) &&
          schedule.account ===
            Number(form.account)
      );
    }, [
      leadSchedules,
      form.engagement,
      form.trial_balance,
      form.account,
    ]);

  const filteredSchedules =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return leadSchedules;
      }

      return leadSchedules.filter(
        (schedule) =>
          schedule.schedule_name
            ?.toLowerCase()
            .includes(query) ||
          schedule.reference
            ?.toLowerCase()
            .includes(query) ||
          schedule.account_code
            ?.toLowerCase()
            .includes(query) ||
          schedule.account_name
            ?.toLowerCase()
            .includes(query) ||
          schedule.engagement_name
            ?.toLowerCase()
            .includes(query)
      );
    }, [
      leadSchedules,
      search,
    ]);

  const summary = useMemo(
    () => ({
      total: leadSchedules.length,

      draft: leadSchedules.filter(
        (item) =>
          item.status === "draft"
      ).length,

      review: leadSchedules.filter(
        (item) =>
          item.status === "in_review"
      ).length,

      completed:
        leadSchedules.filter(
          (item) =>
            item.status ===
            "completed"
        ).length,
    }),
    [leadSchedules]
  );

  /*
   * Find the selected account inside
   * the Adjusted Trial Balance.
   */
  const selectedAdjustedLine =
    useMemo(() => {
      if (
        !adjustedTrialBalance ||
        !form.account
      ) {
        return null;
      }

      return (
        adjustedTrialBalance.lines.find(
          (line) =>
            line.account_id ===
            Number(form.account)
        ) || null
      );
    }, [
      adjustedTrialBalance,
      form.account,
    ]);

  /*
   * Convert debit/credit into a signed
   * account balance.
   *
   * Debit balance  = positive
   * Credit balance = negative
   */
  const calculatedOpeningBalance =
    useMemo(() => {
      if (!selectedAdjustedLine) {
        return 0;
      }

      return (
        Number(
          selectedAdjustedLine.original_debit ||
            0
        ) -
        Number(
          selectedAdjustedLine.original_credit ||
            0
        )
      );
    }, [selectedAdjustedLine]);

  const calculatedAdjustedBalance =
    useMemo(() => {
      if (!selectedAdjustedLine) {
        return 0;
      }

      return (
        Number(
          selectedAdjustedLine.adjusted_debit ||
            0
        ) -
        Number(
          selectedAdjustedLine.adjusted_credit ||
            0
        )
      );
    }, [selectedAdjustedLine]);

  const calculatedAdjustments =
    useMemo(() => {
      return (
        calculatedAdjustedBalance -
        calculatedOpeningBalance
      );
    }, [
      calculatedAdjustedBalance,
      calculatedOpeningBalance,
    ]);

  /*
   * Load all register/options data.
   */
  async function loadData() {
    try {
      setLoading(true);
      setLoadingOptions(true);
      setError("");

      const [
        scheduleData,
        engagementData,
        trialBalanceData,
        accountData,
      ] = await Promise.all([
        apiRequest<LeadSchedule[]>(
          "/financials/lead-schedules/"
        ),

        apiRequest<Engagement[]>(
          "/engagements/"
        ),

        apiRequest<TrialBalance[]>(
          "/financials/trial-balances/"
        ),

        apiRequest<Account[]>(
          "/financials/chart-of-accounts/"
        ),
      ]);

      setLeadSchedules(
        scheduleData
      );

      setEngagements(
        engagementData
      );

      setTrialBalances(
        trialBalanceData
      );

      setAccounts(
        accountData
      );

      /*
       * If this page was opened from:
       *
       * /financials/lead-schedules?trial_balance=1
       *
       * automatically select TB #1.
       */
      if (
        requestedTrialBalanceId &&
        !Number.isNaN(
          requestedTrialBalanceId
        )
      ) {
        const requestedTB =
          trialBalanceData.find(
            (tb) =>
              tb.id ===
              requestedTrialBalanceId
          );

        if (requestedTB) {
          setForm((current) => ({
            ...current,
            engagement:
              String(
                requestedTB.engagement
              ),
            trial_balance:
              String(
                requestedTB.id
              ),
          }));

          setShowForm(true);
        }
      }
    } catch (err) {
      console.error(
        "Lead schedule loading error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Lead Schedule data."
      );
    } finally {
      setLoading(false);
      setLoadingOptions(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [requestedTrialBalanceId]);

  /*
   * When a Trial Balance is selected,
   * retrieve the Adjusted Trial Balance.
   */
  useEffect(() => {
    async function loadAdjustedBalance() {
      if (!form.trial_balance) {
        setAdjustedTrialBalance(null);

        return;
      }

      try {
        setLoadingAdjustedBalance(
          true
        );
        setError("");

        const result =
          await getAdjustedTrialBalance(
            Number(
              form.trial_balance
            )
          );

        setAdjustedTrialBalance(
          result
        );
      } catch (err) {
        console.error(
          "Adjusted Trial Balance loading error:",
          err
        );

        setAdjustedTrialBalance(
          null
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load the Adjusted Trial Balance."
        );
      } finally {
        setLoadingAdjustedBalance(
          false
        );
      }
    }

    loadAdjustedBalance();
  }, [form.trial_balance]);

  /*
   * Once the account changes, populate
   * the balance fields from the ATB.
   */
  useEffect(() => {
    if (
      !selectedAdjustedLine
    ) {
      setForm((current) => ({
        ...current,
        opening_balance: "",
        adjustments: "",
        adjusted_balance: "",
      }));

      return;
    }

    setForm((current) => ({
      ...current,
      opening_balance:
        calculatedOpeningBalance.toFixed(
          2
        ),
      adjustments:
        calculatedAdjustments.toFixed(
          2
        ),
      adjusted_balance:
        calculatedAdjustedBalance.toFixed(
          2
        ),
    }));
  }, [
    selectedAdjustedLine,
    calculatedOpeningBalance,
    calculatedAdjustments,
    calculatedAdjustedBalance,
  ]);

  function updateForm<
    K extends keyof FormData
  >(
    field: K,
    value: FormData[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleEngagementChange(
    value: string
  ) {
    setError("");

    setAdjustedTrialBalance(
      null
    );

    setForm((current) => ({
      ...current,
      engagement: value,
      trial_balance: "",
      account: "",
      opening_balance: "",
      adjustments: "",
      adjusted_balance: "",
    }));
  }

  function handleTrialBalanceChange(
    value: string
  ) {
    setError("");
    setSuccess("");

    const trialBalance =
      trialBalances.find(
        (tb) =>
          tb.id === Number(value)
      );

    if (!trialBalance) {
      setForm((current) => ({
        ...current,
        trial_balance: "",
        account: "",
        opening_balance: "",
        adjustments: "",
        adjusted_balance: "",
      }));

      setAdjustedTrialBalance(
        null
      );

      return;
    }

    /*
     * IMPORTANT:
     *
     * We DO NOT reject a locked TB.
     *
     * Locking protects the original TB from
     * being edited. It should not prevent
     * audit working papers from referencing it.
     */
    setForm((current) => ({
      ...current,
      trial_balance: value,
      account: "",
      opening_balance: "",
      adjustments: "",
      adjusted_balance: "",
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.engagement) {
      setError(
        "Please select an engagement."
      );

      return;
    }

    if (!form.trial_balance) {
      setError(
        "Please select a Trial Balance."
      );

      return;
    }

    if (!form.account) {
      setError(
        "Please select an account."
      );

      return;
    }

    if (!selectedTrialBalance) {
      setError(
        "The selected Trial Balance could not be found."
      );

      return;
    }

    if (!selectedAdjustedLine) {
      setError(
        "No Adjusted Trial Balance line was found for the selected account."
      );

      return;
    }

    if (!form.schedule_name.trim()) {
      setError(
        "Please enter a Lead Schedule name."
      );

      return;
    }

    if (existingSchedule) {
      const accountLabel =
        selectedAccount
          ? `${selectedAccount.account_code} — ${selectedAccount.account_name}`
          : `Account #${form.account}`;

      setError(
        `A Lead Schedule already exists for ${accountLabel} on Trial Balance #${form.trial_balance}. Existing schedule: "${existingSchedule.schedule_name}" (ID #${existingSchedule.id}).`
      );

      return;
    }

    setSaving(true);

    try {
      const payload = {
        engagement:
          Number(
            form.engagement
          ),

        trial_balance:
          Number(
            form.trial_balance
          ),

        account:
          Number(
            form.account
          ),

        schedule_name:
          form.schedule_name.trim(),

        reference:
          form.reference.trim(),

        purpose:
          form.purpose.trim(),

        /*
         * These values are derived from
         * the Adjusted Trial Balance.
         */
        opening_balance:
          calculatedOpeningBalance,

        adjustments:
          calculatedAdjustments,

        adjusted_balance:
          calculatedAdjustedBalance,

        auditor_notes:
          form.auditor_notes.trim(),

        conclusion:
          form.conclusion.trim(),

        status:
          form.status,
      };

      await apiRequest<LeadSchedule>(
        "/financials/lead-schedules/",
        {
          method: "POST",
          body: JSON.stringify(
            payload
          ),
        }
      );

      setSuccess(
        "Lead Schedule created successfully."
      );

      setForm({
        engagement: "",
        trial_balance: "",
        account: "",
        schedule_name: "",
        reference: "",
        purpose: "",
        opening_balance: "",
        adjustments: "",
        adjusted_balance: "",
        auditor_notes: "",
        conclusion: "",
        status: "draft",
      });

      setAdjustedTrialBalance(
        null
      );

      setShowForm(false);

      await loadData();
    } catch (err) {
      console.error(
        "Lead schedule creation error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to create Lead Schedule."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
      <div className="w-full min-w-0 bg-slate-50">
        <div className="w-full min-w-0 px-4 py-6 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <Link
                  href="/financials"
                  className="flex items-center gap-1 hover:text-slate-900"
                >
                  <ArrowLeft size={16} />
                  Financials
                </Link>

                <span>/</span>

                <span>
                  Lead Schedules
                </span>
              </div>

              <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
                <FileText
                  className="text-blue-600"
                  size={28}
                />

                Lead Schedules
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Account-level audit working
                papers linked to the Adjusted
                Trial Balance.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  loadData()
                }
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw size={16} />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setShowForm(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus size={17} />
                New Lead Schedule
              </button>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0"
              />

              <div>
                <p className="font-semibold">
                  Lead Schedule Error
                </p>

                <p className="mt-0.5">
                  {error}
                </p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle2 size={18} />
              {success}
            </div>
          )}

          {/* Summary */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Total Schedules
                </p>

                <FileText
                  className="text-blue-600"
                  size={20}
                />
              </div>

              <p className="text-2xl font-bold text-slate-900">
                {summary.total}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Draft
                </p>

                <FileText
                  className="text-slate-500"
                  size={20}
                />
              </div>

              <p className="text-2xl font-bold text-slate-900">
                {summary.draft}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  In Review
                </p>

                <Calculator
                  className="text-amber-600"
                  size={20}
                />
              </div>

              <p className="text-2xl font-bold text-slate-900">
                {summary.review}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Completed
                </p>

                <CheckCircle2
                  className="text-green-600"
                  size={20}
                />
              </div>

              <p className="text-2xl font-bold text-slate-900">
                {summary.completed}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4 w-full min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search schedule, reference, account or engagement..."
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Register */}
          <div className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-900">
                Lead Schedule Register
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Account-level schedules linked
                to Trial Balances and Adjusted
                Trial Balances.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-500">
                <Loader2
                  size={24}
                  className="mr-2 animate-spin"
                />

                Loading lead schedules...
              </div>
            ) : filteredSchedules.length ===
              0 ? (
              <div className="py-16 text-center">
                <FileText
                  size={42}
                  className="mx-auto mb-3 text-slate-300"
                />

                <h3 className="font-semibold text-slate-800">
                  No lead schedules found
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Create your first Lead
                  Schedule to begin account-level
                  audit documentation.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    setShowForm(true);
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Plus size={16} />
                  Create Lead Schedule
                </button>
              </div>
            ) : (
              <div className="w-full min-w-0 overflow-x-auto">
                <table className="min-w-[1200px] w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">
                        Schedule
                      </th>

                      <th className="px-5 py-3">
                        Account
                      </th>

                      <th className="px-5 py-3">
                        Trial Balance
                      </th>

                      <th className="px-5 py-3 text-right">
                        Opening Balance
                      </th>

                      <th className="px-5 py-3 text-right">
                        Adjustments
                      </th>

                      <th className="px-5 py-3 text-right">
                        Adjusted Balance
                      </th>

                      <th className="px-5 py-3">
                        Status
                      </th>

                      <th className="px-5 py-3 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredSchedules.map(
                      (schedule) => (
                        <tr
                          key={schedule.id}
                          className="border-b border-slate-100 transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <Link
                              href={`/financials/lead-schedules/${schedule.id}`}
                              className="font-semibold text-slate-900 hover:text-blue-700 hover:underline"
                            >
                              {
                                schedule.schedule_name
                              }
                            </Link>

                            <div className="mt-1 text-xs text-slate-500">
                              {schedule.reference ||
                                "No reference"}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-800">
                              {schedule.account_code ||
                                "-"}
                            </div>

                            <div className="text-xs text-slate-500">
                              {schedule.account_name ||
                                "-"}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-800">
                              TB #
                              {
                                schedule.trial_balance
                              }
                            </div>

                            <div className="text-xs text-slate-500">
                              {formatDate(
                                schedule.trial_balance_period_start
                              )}
                              {" - "}
                              {formatDate(
                                schedule.trial_balance_period_end
                              )}
                            </div>

                            {schedule.trial_balance_status && (
                              <div className="mt-1 text-xs text-slate-400">
                                {getTrialBalanceStatusLabel(
                                  schedule.trial_balance_status
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right font-medium text-slate-800">
                            {formatMoney(
                              schedule.opening_balance
                            )}
                          </td>

                          <td className="px-5 py-4 text-right font-medium text-slate-800">
                            {formatMoney(
                              schedule.adjustments
                            )}
                          </td>

                          <td className="px-5 py-4 text-right font-semibold text-slate-900">
                            {formatMoney(
                              schedule.adjusted_balance
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                schedule.status ===
                                "completed"
                                  ? "bg-green-100 text-green-700"
                                  : schedule.status ===
                                    "in_review"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {schedule.status ===
                              "in_review"
                                ? "In Review"
                                : schedule.status ===
                                  "completed"
                                ? "Completed"
                                : "Draft"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/financials/lead-schedules/${schedule.id}`}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Eye size={16} />
                              View
                            </Link>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {showForm && (
          <div className="fixed inset-0 left-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 md:left-64">

            <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

              {/* Modal Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    New Lead Schedule
                  </h2>

                  <p className="text-sm text-slate-500">
                    Create an account-level audit
                    working paper linked to the
                    Adjusted Trial Balance.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-6 p-6"
              >

                {/* Working Paper Information */}
                <section>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
                    Working Paper Information
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

                    {/* Engagement */}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Engagement *
                      </label>

                      <select
                        required
                        value={
                          form.engagement
                        }
                        onChange={(event) =>
                          handleEngagementChange(
                            event.target.value
                          )
                        }
                        disabled={
                          loadingOptions
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">
                          Select engagement
                        </option>

                        {engagements.map(
                          (engagement) => (
                            <option
                              key={
                                engagement.id
                              }
                              value={
                                engagement.id
                              }
                            >
                              {getEngagementLabel(
                                engagement
                              )}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {/* Trial Balance */}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Trial Balance *
                      </label>

                      <select
                        required
                        value={
                          form.trial_balance
                        }
                        onChange={(event) =>
                          handleTrialBalanceChange(
                            event.target.value
                          )
                        }
                        disabled={
                          !form.engagement
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                      >
                        <option value="">
                          Select Trial Balance
                        </option>

                        {filteredTrialBalances.map(
                          (tb) => (
                            <option
                              key={tb.id}
                              value={tb.id}
                            >
                              TB #{tb.id} —{" "}
                              {
                                tb.period_end
                              }{" "}
                              —{" "}
                              {getTrialBalanceStatusLabel(
                                tb.status
                              )}
                            </option>
                          )
                        )}
                      </select>

                      {form.engagement &&
                        filteredTrialBalances.length ===
                          0 && (
                          <p className="mt-1.5 text-xs text-red-600">
                            No Trial Balance is
                            available for this
                            engagement.
                          </p>
                        )}

                      {selectedTrialBalance && (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="text-xs text-slate-500">
                            Trial Balance Status
                          </p>

                          <p className="mt-0.5 text-sm font-semibold text-slate-800">
                            {getTrialBalanceStatusLabel(
                              selectedTrialBalance.status
                            )}
                          </p>

                          {selectedTrialBalance.status ===
                            "locked" && (
                            <p className="mt-1 text-xs text-green-700">
                              Locked TB is read-only.
                              It can still be used as
                              the source for audit
                              working papers.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Account */}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Account *
                      </label>

                      <select
                        required
                        value={
                          form.account
                        }
                        onChange={(event) => {
                          setError("");

                          updateForm(
                            "account",
                            event.target.value
                          );
                        }}
                        disabled={
                          !form.trial_balance ||
                          loadingAdjustedBalance
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                      >
                        <option value="">
                          {loadingAdjustedBalance
                            ? "Loading accounts..."
                            : "Select account"}
                        </option>

                        {filteredAccounts.map(
                          (account) => (
                            <option
                              key={
                                account.id
                              }
                              value={
                                account.id
                              }
                            >
                              {
                                account.account_code
                              }{" "}
                              —{" "}
                              {
                                account.account_name
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  {/* ATB Status */}
                  {adjustedTrialBalance && (
                    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <Calculator
                          size={19}
                          className="mt-0.5 shrink-0 text-blue-600"
                        />

                        <div>
                          <p className="font-semibold text-blue-900">
                            Adjusted Trial Balance
                          </p>

                          <p className="mt-1 text-sm text-blue-800">
                            Original TB and posted
                            adjustments are being used
                            to calculate the account
                            balance automatically.
                          </p>

                          <p className="mt-1 text-xs text-blue-700">
                            Posted adjustments:{" "}
                            {
                              adjustedTrialBalance
                                .summary
                                .posted_adjustment_count
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Duplicate */}
                  {existingSchedule && (
                    <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                      <AlertTriangle
                        size={18}
                        className="mt-0.5 shrink-0 text-amber-600"
                      />

                      <div className="text-sm text-amber-800">
                        <p className="font-semibold">
                          Lead Schedule already exists
                        </p>

                        <p className="mt-1">
                          A Lead Schedule already
                          exists for this engagement,
                          Trial Balance and account.
                        </p>

                        <p className="mt-1 font-medium">
                          Existing schedule:{" "}
                          {
                            existingSchedule.schedule_name
                          }{" "}
                          (ID #
                          {
                            existingSchedule.id
                          })
                        </p>

                        <Link
                          href={`/financials/lead-schedules/${existingSchedule.id}`}
                          onClick={() =>
                            setShowForm(false)
                          }
                          className="mt-3 inline-flex items-center gap-2 font-semibold text-amber-800 underline hover:text-amber-950"
                        >
                          <Eye size={15} />
                          Open existing Lead Schedule
                        </Link>
                      </div>
                    </div>
                  )}
                </section>

                {/* Schedule Details */}
                <section>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
                    Schedule Details
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Schedule Name *
                      </label>

                      <input
                        required
                        type="text"
                        value={
                          form.schedule_name
                        }
                        onChange={(event) =>
                          updateForm(
                            "schedule_name",
                            event.target.value
                          )
                        }
                        placeholder="Cash and Bank Lead Schedule"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Reference
                      </label>

                      <input
                        type="text"
                        value={
                          form.reference
                        }
                        onChange={(event) =>
                          updateForm(
                            "reference",
                            event.target.value
                          )
                        }
                        placeholder="LS-CASH-001"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Purpose
                      </label>

                      <textarea
                        rows={3}
                        value={
                          form.purpose
                        }
                        onChange={(event) =>
                          updateForm(
                            "purpose",
                            event.target.value
                          )
                        }
                        placeholder="Explain the purpose of this lead schedule..."
                        className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                </section>

                {/* Account Balances */}
                <section>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
                    Account Balances
                  </h3>

                  {!form.account ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      Select an account to load its
                      original and adjusted balances.
                    </div>
                  ) : loadingAdjustedBalance ? (
                    <div className="flex items-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-700">
                      <Loader2
                        size={18}
                        className="mr-2 animate-spin"
                      />
                      Loading account balances...
                    </div>
                  ) : !selectedAdjustedLine ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                      No balance was found for the
                      selected account in this Adjusted
                      Trial Balance.
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Original TB Balance
                          </label>

                          <input
                            readOnly
                            type="text"
                            value={formatMoney(
                              calculatedOpeningBalance,
                              selectedTrialBalance?.currency ||
                                "TZS"
                            )}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Posted Adjustments
                          </label>

                          <input
                            readOnly
                            type="text"
                            value={formatMoney(
                              calculatedAdjustments,
                              selectedTrialBalance?.currency ||
                                "TZS"
                            )}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Adjusted TB Balance
                          </label>

                          <input
                            readOnly
                            type="text"
                            value={formatMoney(
                              calculatedAdjustedBalance,
                              selectedTrialBalance?.currency ||
                                "TZS"
                            )}
                            className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-900"
                          />
                        </div>
                      </div>

                      <div className="mt-3 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
                        <strong>
                          System calculation:
                        </strong>{" "}
                        Original Trial Balance + Posted
                        Adjustments = Adjusted Trial
                        Balance.
                        <span className="ml-1">
                          These values cannot be manually
                          changed here.
                        </span>
                      </div>
                    </>
                  )}
                </section>

                {/* Audit Documentation */}
                <section>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">
                    Audit Documentation
                  </h3>

                  <div className="space-y-4">

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Auditor Notes
                      </label>

                      <textarea
                        rows={4}
                        value={
                          form.auditor_notes
                        }
                        onChange={(event) =>
                          updateForm(
                            "auditor_notes",
                            event.target.value
                          )
                        }
                        placeholder="Document procedures performed, evidence obtained and observations..."
                        className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Conclusion
                      </label>

                      <textarea
                        rows={4}
                        value={
                          form.conclusion
                        }
                        onChange={(event) =>
                          updateForm(
                            "conclusion",
                            event.target.value
                          )
                        }
                        placeholder="State the audit conclusion for this account..."
                        className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div className="max-w-xs">
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Status
                      </label>

                      <select
                        value={
                          form.status
                        }
                        onChange={(event) =>
                          updateForm(
                            "status",
                            event.target
                              .value as FormData["status"]
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                    </div>
                  </div>
                </section>

                {/* Actions */}
                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    onClick={() =>
                      setShowForm(false)
                    }
                    className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving ||
                      !selectedTrialBalance ||
                      !selectedAdjustedLine ||
                      loadingAdjustedBalance ||
                      !!existingSchedule
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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

                        {existingSchedule
                          ? "Lead Schedule Already Exists"
                          : "Save Lead Schedule"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
}

/*
 * Suspense boundary required because
 * LeadSchedulesContent uses useSearchParams().
 */
export default function LeadSchedulesPage() {
  return (
    <Suspense
      fallback={
          <div className="w-full bg-slate-50 p-6">
            <div className="flex min-h-[500px] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />

                <p className="text-sm text-slate-600">
                  Loading lead schedules...
                </p>
              </div>
            </div>
          </div>
      }
    >
      <LeadSchedulesContent />
    </Suspense>
  );
}
