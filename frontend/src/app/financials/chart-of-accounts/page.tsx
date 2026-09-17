"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Edit3,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { getEngagements } from "@/lib/financials";

const API_URL = "http://localhost:8000";

type Engagement = {
  id: number;
  engagement_code?: string;
  code?: string;
  title?: string;
  name?: string;
};

type Account = {
  id: number;
  engagement: number;
  account_code: string;
  account_name: string;
  account_type: string;
  financial_statement_section: string;
  description: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

type AccountForm = {
  engagement: string;
  account_code: string;
  account_name: string;
  account_type: string;
  financial_statement_section: string;
  description: string;
  is_active: boolean;
};

const EMPTY_FORM: AccountForm = {
  engagement: "",
  account_code: "",
  account_name: "",
  account_type: "",
  financial_statement_section: "",
  description: "",
  is_active: true,
};

const ACCOUNT_TYPES = [
  {
    value: "asset",
    label: "Asset",
  },
  {
    value: "liability",
    label: "Liability",
  },
  {
    value: "equity",
    label: "Equity",
  },
  {
    value: "revenue",
    label: "Revenue",
  },
  {
    value: "expense",
    label: "Expense",
  },
];

const FINANCIAL_SECTIONS = [
  {
    value: "statement_of_financial_position",
    label: "Statement of Financial Position",
  },
  {
    value: "profit_or_loss",
    label: "Profit or Loss",
  },
  {
    value: "cash_flow",
    label: "Cash Flow Statement",
  },
  {
    value: "equity",
    label: "Statement of Changes in Equity",
  },
  {
    value: "other",
    label: "Other",
  },
];

function getCookie(name: string) {
  if (typeof document === "undefined") {
    return "";
  }

  const cookies = document.cookie.split(";");

  for (const cookie of cookies) {
    const trimmed = cookie.trim();

    if (trimmed.startsWith(`${name}=`)) {
      return decodeURIComponent(
        trimmed.substring(name.length + 1)
      );
    }
  }

  return "";
}

async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const csrfToken = getCookie("csrftoken");

  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (csrfToken) {
    headers.set("X-CSRFToken", csrfToken);
  }

  headers.set("Referer", window.location.origin);

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers,
      credentials: "include",
    }
  );

  let data: unknown = null;

  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();

    data = text || null;
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;

    if (typeof data === "string" && data.trim()) {
      message = data;
    } else if (
      typeof data === "object" &&
      data !== null
    ) {
      const errorData = data as Record<string, unknown>;

      if (typeof errorData.detail === "string") {
        message = errorData.detail;
      } else {
        try {
          message = JSON.stringify(errorData);
        } catch {
          message = `Request failed with status ${response.status}.`;
        }
      }
    }

    throw new Error(message);
  }

  return data;
}

function getEngagementName(engagement: Engagement) {
  return (
    engagement.title ||
    engagement.name ||
    engagement.engagement_code ||
    engagement.code ||
    `Engagement #${engagement.id}`
  );
}

function getAccountTypeLabel(type: string) {
  return (
    ACCOUNT_TYPES.find(
      (item) => item.value === type
    )?.label || type
  );
}

function getSectionLabel(section: string) {
  return (
    FINANCIAL_SECTIONS.find(
      (item) => item.value === section
    )?.label || section || "Not assigned"
  );
}

function formatDate(value?: string) {
  if (!value) {
    return "—";
  }

  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

export default function ChartOfAccountsPage() {
  const [engagements, setEngagements] = useState<
    Engagement[]
  >([]);

  const [accounts, setAccounts] = useState<Account[]>([]);

  const [selectedEngagement, setSelectedEngagement] =
    useState("");

  const [search, setSearch] = useState("");

  const [loadingEngagements, setLoadingEngagements] =
    useState(true);

  const [loadingAccounts, setLoadingAccounts] =
    useState(false);

  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] =
    useState<AccountForm>(EMPTY_FORM);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  async function loadEngagements() {
    try {
      setLoadingEngagements(true);
      setError("");

      console.log(
        "CHART OF ACCOUNTS: Loading engagements..."
      );

      const data = await getEngagements();

      console.log(
        "CHART OF ACCOUNTS: Engagements:",
        data
      );

      setEngagements(data as Engagement[]);

      if (
        data.length > 0 &&
        !selectedEngagement
      ) {
        setSelectedEngagement(
          String(data[0].id)
        );
      }
    } catch (err) {
      console.error(
        "CHART OF ACCOUNTS: Engagement loading error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load engagements."
      );
    } finally {
      setLoadingEngagements(false);
    }
  }

  async function loadAccounts(engagementId: string) {
    if (!engagementId) {
      setAccounts([]);
      return;
    }

    try {
      setLoadingAccounts(true);
      setError("");

      console.log(
        "CHART OF ACCOUNTS: Loading accounts for engagement:",
        engagementId
      );

      const data = await apiRequest(
        `/api/financials/chart-of-accounts/?engagement=${engagementId}`
      );

      console.log(
        "CHART OF ACCOUNTS: Accounts:",
        data
      );

      if (Array.isArray(data)) {
        setAccounts(data);
      } else if (
        typeof data === "object" &&
        data !== null &&
        "results" in data &&
        Array.isArray(
          (data as { results: unknown }).results
        )
      ) {
        setAccounts(
          (data as { results: Account[] }).results
        );
      } else {
        setAccounts([]);
      }
    } catch (err) {
      console.error(
        "CHART OF ACCOUNTS: Account loading error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Chart of Accounts."
      );

      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  }

  useEffect(() => {
    loadEngagements();
  }, []);

  useEffect(() => {
    if (selectedEngagement) {
      loadAccounts(selectedEngagement);
    }
  }, [selectedEngagement]);

  function openCreateForm() {
    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
      engagement: selectedEngagement,
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(account: Account) {
    setEditingId(account.id);

    setForm({
      engagement: String(account.engagement),
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      financial_statement_section:
        account.financial_statement_section || "",
      description: account.description || "",
      is_active: account.is_active,
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function updateForm(
    field: keyof AccountForm,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.engagement) {
      setError("Please select an engagement.");
      return;
    }

    if (!form.account_code.trim()) {
      setError("Account code is required.");
      return;
    }

    if (!form.account_name.trim()) {
      setError("Account name is required.");
      return;
    }

    if (!form.account_type) {
      setError("Please select an account type.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        engagement: Number(form.engagement),
        account_code: form.account_code.trim(),
        account_name: form.account_name.trim(),
        account_type: form.account_type,
        financial_statement_section:
          form.financial_statement_section,
        description: form.description.trim(),
        is_active: form.is_active,
      };

      if (editingId) {
        await apiRequest(
          `/api/financials/chart-of-accounts/${editingId}/`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );

        setSuccess(
          "Account updated successfully."
        );
      } else {
        await apiRequest(
          "/api/financials/chart-of-accounts/",
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );

        setSuccess(
          "Account created successfully."
        );
      }

      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);

      await loadAccounts(form.engagement);
    } catch (err) {
      console.error(
        "CHART OF ACCOUNTS: Save error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save account."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(account: Account) {
    const confirmed = window.confirm(
      `Delete account ${account.account_code} - ${account.account_name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(account.id);
      setError("");
      setSuccess("");

      await apiRequest(
        `/api/financials/chart-of-accounts/${account.id}/`,
        {
          method: "DELETE",
        }
      );

      setSuccess(
        "Account deleted successfully."
      );

      await loadAccounts(
        String(account.engagement)
      );
    } catch (err) {
      console.error(
        "CHART OF ACCOUNTS: Delete error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete account."
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRefresh() {
    setSuccess("");
    setError("");

    if (selectedEngagement) {
      await loadAccounts(selectedEngagement);
    } else {
      await loadEngagements();
    }
  }

  const filteredAccounts = useMemo(() => {
    const searchValue = search
      .trim()
      .toLowerCase();

    if (!searchValue) {
      return accounts;
    }

    return accounts.filter((account) => {
      return (
        account.account_code
          .toLowerCase()
          .includes(searchValue) ||
        account.account_name
          .toLowerCase()
          .includes(searchValue) ||
        getAccountTypeLabel(account.account_type)
          .toLowerCase()
          .includes(searchValue) ||
        getSectionLabel(
          account.financial_statement_section
        )
          .toLowerCase()
          .includes(searchValue)
      );
    });
  }, [accounts, search]);

  const selectedEngagementObject =
    engagements.find(
      (item) =>
        String(item.id) === selectedEngagement
    );

  return (
    <AppLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="mb-6">
            <div className="mb-4">
              <Link
                href="/financials/trial-balance"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Trial Balance
              </Link>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                  <span>Financials</span>
                  <span>/</span>
                  <span>Chart of Accounts</span>
                </div>

                <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <BookOpen className="h-6 w-6" />
                  </span>
                  Chart of Accounts
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
                  Create and manage the accounts used by
                  your engagement Trial Balance and
                  financial statements.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={
                    loadingAccounts ||
                    loadingEngagements
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      loadingAccounts
                        ? "animate-spin"
                        : ""
                    }`}
                  />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={openCreateForm}
                  disabled={!selectedEngagement}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  New Account
                </button>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />

              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  Error
                </p>

                <p className="mt-1 text-sm">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setError("")}
                className="rounded-md p-1 hover:bg-red-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {success && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

              <div className="flex-1">
                <p className="font-semibold">
                  Success
                </p>

                <p className="mt-1 text-sm">
                  {success}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSuccess("")}
                className="rounded-md p-1 hover:bg-emerald-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Engagement selector */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">

              <div>
                <label
                  htmlFor="engagement"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Engagement
                </label>

                {loadingEngagements ? (
                  <div className="flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading engagements...
                  </div>
                ) : (
                  <select
                    id="engagement"
                    value={selectedEngagement}
                    onChange={(event) => {
                      setSelectedEngagement(
                        event.target.value
                      );
                      setSearch("");
                      setError("");
                      setSuccess("");
                    }}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">
                      Select engagement
                    </option>

                    {engagements.map(
                      (engagement) => (
                        <option
                          key={engagement.id}
                          value={engagement.id}
                        >
                          {getEngagementName(
                            engagement
                          )}
                        </option>
                      )
                    )}
                  </select>
                )}
              </div>

              {selectedEngagementObject && (
                <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Selected Engagement
                  </div>

                  <div className="mt-1 font-semibold text-slate-900">
                    {getEngagementName(
                      selectedEngagementObject
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form */}
          {showForm && (
            <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingId
                      ? "Edit Account"
                      : "Create Account"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {editingId
                      ? "Update the selected Chart of Accounts record."
                      : "Add an account that can be used in the Trial Balance."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="p-5"
              >
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

                  {/* Engagement */}
                  <div>
                    <label
                      htmlFor="form-engagement"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Engagement
                    </label>

                    <select
                      id="form-engagement"
                      value={form.engagement}
                      onChange={(event) =>
                        updateForm(
                          "engagement",
                          event.target.value
                        )
                      }
                      required
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="">
                        Select engagement
                      </option>

                      {engagements.map(
                        (engagement) => (
                          <option
                            key={engagement.id}
                            value={engagement.id}
                          >
                            {getEngagementName(
                              engagement
                            )}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Account code */}
                  <div>
                    <label
                      htmlFor="account-code"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Account Code
                    </label>

                    <input
                      id="account-code"
                      type="text"
                      value={form.account_code}
                      onChange={(event) =>
                        updateForm(
                          "account_code",
                          event.target.value
                        )
                      }
                      placeholder="e.g. 1000"
                      required
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  {/* Account name */}
                  <div>
                    <label
                      htmlFor="account-name"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Account Name
                    </label>

                    <input
                      id="account-name"
                      type="text"
                      value={form.account_name}
                      onChange={(event) =>
                        updateForm(
                          "account_name",
                          event.target.value
                        )
                      }
                      placeholder="e.g. Cash and Bank"
                      required
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  {/* Account type */}
                  <div>
                    <label
                      htmlFor="account-type"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Account Type
                    </label>

                    <select
                      id="account-type"
                      value={form.account_type}
                      onChange={(event) =>
                        updateForm(
                          "account_type",
                          event.target.value
                        )
                      }
                      required
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="">
                        Select account type
                      </option>

                      {ACCOUNT_TYPES.map(
                        (type) => (
                          <option
                            key={type.value}
                            value={type.value}
                          >
                            {type.label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Financial statement section */}
                  <div>
                    <label
                      htmlFor="financial-section"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Financial Statement Section
                    </label>

                    <select
                      id="financial-section"
                      value={
                        form.financial_statement_section
                      }
                      onChange={(event) =>
                        updateForm(
                          "financial_statement_section",
                          event.target.value
                        )
                      }
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="">
                        Select section
                      </option>

                      {FINANCIAL_SECTIONS.map(
                        (section) => (
                          <option
                            key={section.value}
                            value={section.value}
                          >
                            {section.label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Active */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Status
                    </label>

                    <label className="flex h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-300 bg-white px-3">
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(event) =>
                          updateForm(
                            "is_active",
                            event.target.checked
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />

                      <span className="text-sm text-slate-700">
                        Active account
                      </span>
                    </label>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label
                      htmlFor="description"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Description
                    </label>

                    <textarea
                      id="description"
                      value={form.description}
                      onChange={(event) =>
                        updateForm(
                          "description",
                          event.target.value
                        )
                      }
                      rows={3}
                      placeholder="Optional description of the account..."
                      className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>

                {/* Form buttons */}
                <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        {editingId
                          ? "Update Account"
                          : "Create Account"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Account list */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* List header */}
            <div className="border-b border-slate-200 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Accounts
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {selectedEngagementObject
                      ? `Accounts for ${getEngagementName(
                          selectedEngagementObject
                        )}`
                      : "Select an engagement to view its accounts."}
                  </p>
                </div>

                <div className="relative w-full lg:max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="search"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search accounts..."
                    disabled={!selectedEngagement}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* Loading */}
            {loadingAccounts && (
              <div className="flex min-h-[240px] items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-slate-500">
                  <Loader2 className="h-7 w-7 animate-spin" />
                  <p className="text-sm">
                    Loading Chart of Accounts...
                  </p>
                </div>
              </div>
            )}

            {/* No engagement */}
            {!loadingAccounts &&
              !selectedEngagement && (
                <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                    <BookOpen className="h-7 w-7 text-slate-500" />
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900">
                    Select an engagement
                  </h3>

                  <p className="mt-2 max-w-md text-sm text-slate-500">
                    Select an engagement above to
                    manage its Chart of Accounts.
                  </p>
                </div>
              )}

            {/* No accounts */}
            {!loadingAccounts &&
              selectedEngagement &&
              accounts.length === 0 && (
                <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                    <BookOpen className="h-7 w-7 text-slate-500" />
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900">
                    No accounts found
                  </h3>

                  <p className="mt-2 max-w-md text-sm text-slate-500">
                    This engagement does not have any
                    Chart of Accounts yet. Create the
                    first account to use it in the
                    Trial Balance.
                  </p>

                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    Create First Account
                  </button>
                </div>
              )}

            {/* No search results */}
            {!loadingAccounts &&
              selectedEngagement &&
              accounts.length > 0 &&
              filteredAccounts.length === 0 && (
                <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
                  <Search className="mb-3 h-8 w-8 text-slate-400" />

                  <h3 className="font-semibold text-slate-900">
                    No matching accounts
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Try another account code, name,
                    type, or financial statement section.
                  </p>
                </div>
              )}

            {/* Table */}
            {!loadingAccounts &&
              filteredAccounts.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                          Code
                        </th>

                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                          Account Name
                        </th>

                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                          Type
                        </th>

                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                          Financial Statement
                        </th>

                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                          Status
                        </th>

                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                          Updated
                        </th>

                        <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 bg-white">
                      {filteredAccounts.map(
                        (account) => (
                          <tr
                            key={account.id}
                            className="transition hover:bg-slate-50"
                          >
                            <td className="whitespace-nowrap px-5 py-4">
                              <span className="font-mono text-sm font-semibold text-slate-900">
                                {account.account_code}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="font-semibold text-slate-900">
                                {account.account_name}
                              </div>

                              {account.description && (
                                <div className="mt-1 max-w-sm truncate text-xs text-slate-500">
                                  {account.description}
                                </div>
                              )}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                {getAccountTypeLabel(
                                  account.account_type
                                )}
                              </span>
                            </td>

                            <td className="max-w-xs px-5 py-4 text-sm text-slate-600">
                              {getSectionLabel(
                                account.financial_statement_section
                              )}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              {account.is_active ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                  Inactive
                                </span>
                              )}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                              {formatDate(
                                account.updated_at
                              )}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditForm(
                                      account
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDelete(
                                      account
                                    )
                                  }
                                  disabled={
                                    deletingId ===
                                    account.id
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {deletingId ===
                                  account.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}

                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}

            {/* Footer */}
            {!loadingAccounts &&
              selectedEngagement &&
              accounts.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Showing{" "}
                    <strong className="text-slate-900">
                      {filteredAccounts.length}
                    </strong>{" "}
                    of{" "}
                    <strong className="text-slate-900">
                      {accounts.length}
                    </strong>{" "}
                    accounts
                  </span>

                  <span>
                    Active accounts:{" "}
                    <strong className="text-slate-900">
                      {
                        accounts.filter(
                          (account) =>
                            account.is_active
                        ).length
                      }
                    </strong>
                  </span>
                </div>
              )}
          </div>

          {/* Information */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <FileText className="h-5 w-5 text-slate-700" />
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">
                    Chart of Accounts
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Each engagement has its own account
                    structure. These accounts become
                    available when entering Trial Balance
                    balances.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <CheckCircle2 className="h-5 w-5 text-slate-700" />
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">
                    Trial Balance Integration
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Active accounts for the selected
                    engagement are automatically available
                    in the Trial Balance account selector.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}