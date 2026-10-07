"use client";
import { apiRequest } from "@/lib/api";


import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  FileEdit,
  FilePlus2,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  X,
  XCircle,
} from "lucide-react";

type Engagement = {
  id: number;
  engagement_code?: string;
  title?: string;
  name?: string;
};

type Account = {
  id: number;
  engagement: number;
  account_code: string;
  account_name: string;
  account_type: string;
  is_active: boolean;
};

type TrialBalance = {
  id: number;
  engagement: number;
  period_start: string;
  period_end: string;
  currency: string;
  status: "draft" | "imported" | "reviewed" | "locked";
  description?: string;
  total_debit?: string | number;
  total_credit?: string | number;
  difference?: string | number;
  is_balanced?: boolean;
  created_at: string;
  updated_at: string;
};

type AdjustmentStatus = "proposed" | "posted" | "rejected";

type Adjustment = {
  id: number;
  engagement: number;
  trial_balance: number | null;
  trial_balance_status?: string | null;
  adjustment_number: string;
  description: string;
  debit_account: number;
  debit_account_code?: string;
  debit_account_name?: string;
  credit_account: number;
  credit_account_code?: string;
  credit_account_name?: string;
  amount: string;
  status: AdjustmentStatus;
  created_at: string;
  updated_at: string;
};

type AdjustmentForm = {
  engagement: string;
  trial_balance: string;
  adjustment_number: string;
  description: string;
  debit_account: string;
  credit_account: string;
  amount: string;
};

function formatAmount(value: string | number) {
  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-TZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-TZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTrialBalanceLabel(trialBalance: TrialBalance) {
  const start = formatDate(trialBalance.period_start);
  const end = formatDate(trialBalance.period_end);

  return `TB #${trialBalance.id} • ${start} - ${end} • ${trialBalance.status}`;
}

function listResults<T>(data: T[] | { results: T[] }): T[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  throw new Error("The server returned an invalid financial list response.");
}

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trialBalances, setTrialBalances] = useState<TrialBalance[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingTrialBalances, setLoadingTrialBalances] =
    useState(false);

  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedEngagement, setSelectedEngagement] =
    useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(
    null
  );

  const [form, setForm] = useState<AdjustmentForm>({
    engagement: "",
    trial_balance: "",
    adjustment_number: "",
    description: "",
    debit_account: "",
    credit_account: "",
    amount: "",
  });

  const [formError, setFormError] = useState("");

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadAdjustments();
    }
  }, [selectedEngagement, statusFilter]);

  useEffect(() => {
    if (form.engagement) {
      loadAccounts(form.engagement);
      loadTrialBalances(form.engagement);
    } else {
      setAccounts([]);
      setTrialBalances([]);
    }
  }, [form.engagement]);

  async function loadInitialData() {
    setLoading(true);
    setError("");

    try {
      await Promise.all([
        loadEngagements(),
        loadAdjustments(),
      ]);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to load financial data.");
    } finally {
      setLoading(false);
    }
  }

  async function loadEngagements() {
    const data = await apiRequest<Engagement[] | { results: Engagement[] }>(
      "/engagements/", { cache: "no-store" }
    );
    setEngagements(listResults(data));
  }

  async function loadAdjustments() {
    try {
      const params = new URLSearchParams();

      if (selectedEngagement) {
        params.set("engagement", selectedEngagement);
      }

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const query = params.toString();

      const data = await apiRequest<Adjustment[] | { results: Adjustment[] }>(
        `/financials/adjustments/${
          query ? `?${query}` : ""
        }`,
        {
          cache: "no-store",
        }
      );

      setAdjustments(listResults(data));
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load adjustments."
      );
    }
  }

  async function loadAccounts(engagementId: string) {
    setLoadingAccounts(true);
    setFormError("");

    try {
      const data = await apiRequest<Account[] | { results: Account[] }>(
        `/financials/chart-of-accounts/by-engagement/${engagementId}/`,
        {
          cache: "no-store",
        }
      );

      setAccounts(
        listResults(data).filter(
          (account: Account) => account.is_active
        )
      );
    } catch (err) {
      console.error(err);

      setAccounts([]);

      setFormError(
        err instanceof Error
          ? err.message
          : "Unable to load accounts for this engagement."
      );
    } finally {
      setLoadingAccounts(false);
    }
  }

  async function loadTrialBalances(engagementId: string) {
    setLoadingTrialBalances(true);
    setTrialBalances([]);

    try {
      const params = new URLSearchParams();
      params.set("engagement", engagementId);

      const data = await apiRequest<TrialBalance[] | { results: TrialBalance[] }>(
        `/financials/trial-balances/?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      setTrialBalances(listResults(data));
    } catch (err) {
      console.error(err);

      setTrialBalances([]);

      setFormError(
        err instanceof Error
          ? err.message
          : "Unable to load trial balances for this engagement."
      );
    } finally {
      setLoadingTrialBalances(false);
    }
  }

  function resetForm() {
    setForm({
      engagement: selectedEngagement,
      trial_balance: "",
      adjustment_number: "",
      description: "",
      debit_account: "",
      credit_account: "",
      amount: "",
    });

    setEditingId(null);
    setFormError("");
  }

  function openCreateForm() {
    setSuccess("");
    setError("");

    setForm({
      engagement: selectedEngagement,
      trial_balance: "",
      adjustment_number: "",
      description: "",
      debit_account: "",
      credit_account: "",
      amount: "",
    });

    setEditingId(null);
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(adjustment: Adjustment) {
    if (adjustment.status !== "proposed") {
      setError("Only proposed adjustments can be edited.");
      return;
    }

    if (!adjustment.trial_balance) {
      setError(
        "This adjustment has no trial balance and cannot be edited until it is linked to one."
      );
      return;
    }

    setSuccess("");
    setError("");

    setForm({
      engagement: String(adjustment.engagement),
      trial_balance: String(adjustment.trial_balance),
      adjustment_number: adjustment.adjustment_number,
      description: adjustment.description,
      debit_account: String(adjustment.debit_account),
      credit_account: String(adjustment.credit_account),
      amount: adjustment.amount,
    });

    setEditingId(adjustment.id);
    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    resetForm();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setFormError("");
    setSuccess("");
    setError("");

    if (!form.engagement) {
      setFormError("Please select an engagement.");
      return;
    }

    if (!form.trial_balance) {
      setFormError("Please select a trial balance.");
      return;
    }

    if (!form.adjustment_number.trim()) {
      setFormError("Please enter an adjustment number.");
      return;
    }

    if (!form.description.trim()) {
      setFormError("Please enter an adjustment description.");
      return;
    }

    if (!form.debit_account) {
      setFormError("Please select a debit account.");
      return;
    }

    if (!form.credit_account) {
      setFormError("Please select a credit account.");
      return;
    }

    if (form.debit_account === form.credit_account) {
      setFormError(
        "Debit and credit accounts must be different."
      );
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }

    if (loadingTrialBalances) {
      setFormError(
        "Please wait while trial balances are loading."
      );
      return;
    }

    if (loadingAccounts) {
      setFormError(
        "Please wait while accounts are loading."
      );
      return;
    }

    const selectedTrialBalance = trialBalances.find(
      (trialBalance) =>
        trialBalance.id === Number(form.trial_balance)
    );

    if (!selectedTrialBalance) {
      setFormError(
        "The selected trial balance is no longer available. Please select it again."
      );
      return;
    }

    if (
      selectedTrialBalance.engagement !==
      Number(form.engagement)
    ) {
      setFormError(
        "The selected trial balance does not belong to the selected engagement."
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        engagement: Number(form.engagement),
        trial_balance: Number(form.trial_balance),
        adjustment_number:
          form.adjustment_number.trim(),
        description: form.description.trim(),
        debit_account: Number(form.debit_account),
        credit_account: Number(form.credit_account),
        amount: form.amount,
        status: "proposed",
      };

      console.log(
        "Saving adjustment payload:",
        payload
      );

      const url = editingId
        ? `/financials/adjustments/${editingId}/`
        : "/financials/adjustments/";

      await apiRequest<Adjustment>(url, {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });

      setSuccess(
        editingId
          ? "Adjustment updated successfully."
          : "Adjustment created successfully."
      );

      setShowForm(false);
      resetForm();

      await loadAdjustments();
    } catch (err) {
      console.error(err);

      setFormError(
        err instanceof Error
          ? err.message
          : "A network error occurred. Make sure the Django server is running."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePost(adjustment: Adjustment) {
    if (adjustment.status !== "proposed") {
      return;
    }

    if (!adjustment.trial_balance) {
      setError(
        "This adjustment cannot be posted because it has no trial balance."
      );
      return;
    }

    const confirmed = window.confirm(
      `Post adjustment ${adjustment.adjustment_number} for TZS ${formatAmount(
        adjustment.amount
      )}?`
    );

    if (!confirmed) {
      return;
    }

    setActionId(adjustment.id);
    setError("");
    setSuccess("");

    try {
      await apiRequest<Adjustment>(
        `/financials/adjustments/${adjustment.id}/post/`,
        {
          method: "POST",
        }
      );

      setSuccess(
        `Adjustment ${adjustment.adjustment_number} posted successfully.`
      );

      await loadAdjustments();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Network error while posting adjustment."
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(adjustment: Adjustment) {
    if (adjustment.status !== "proposed") {
      return;
    }

    const confirmed = window.confirm(
      `Reject adjustment ${adjustment.adjustment_number}?`
    );

    if (!confirmed) {
      return;
    }

    setActionId(adjustment.id);
    setError("");
    setSuccess("");

    try {
      await apiRequest<Adjustment>(
        `/financials/adjustments/${adjustment.id}/reject/`,
        {
          method: "POST",
        }
      );

      setSuccess(
        `Adjustment ${adjustment.adjustment_number} rejected.`
      );

      await loadAdjustments();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Network error while rejecting adjustment."
      );
    } finally {
      setActionId(null);
    }
  }

  function getEngagementName(id: number) {
    const engagement = engagements.find(
      (item) => item.id === id
    );

    if (!engagement) {
      return `Engagement #${id}`;
    }

    return (
      engagement.engagement_code ||
      engagement.title ||
      engagement.name ||
      `Engagement #${id}`
    );
  }

  function getTrialBalanceLabel(
    trialBalanceId: number | null | undefined
  ) {
    if (!trialBalanceId) {
      return "No Trial Balance";
    }

    const trialBalance = trialBalances.find(
      (item) => item.id === trialBalanceId
    );

    if (!trialBalance) {
      return `Trial Balance #${trialBalanceId}`;
    }

    return formatTrialBalanceLabel(trialBalance);
  }

  const filteredAdjustments = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return adjustments;
    }

    return adjustments.filter((adjustment) => {
      return (
        adjustment.adjustment_number
          .toLowerCase()
          .includes(search) ||
        adjustment.description
          .toLowerCase()
          .includes(search) ||
        adjustment.debit_account_name
          ?.toLowerCase()
          .includes(search) ||
        adjustment.credit_account_name
          ?.toLowerCase()
          .includes(search) ||
        getEngagementName(adjustment.engagement)
          .toLowerCase()
          .includes(search) ||
        `trial balance #${adjustment.trial_balance || ""}`
          .toLowerCase()
          .includes(search)
      );
    });
  }, [adjustments, searchTerm, engagements]);

  const proposedCount = adjustments.filter(
    (item) => item.status === "proposed"
  ).length;

  const postedCount = adjustments.filter(
    (item) => item.status === "posted"
  ).length;

  const totalAmount = adjustments.reduce(
    (total, adjustment) =>
      total + Number(adjustment.amount || 0),
    0
  );

  return (

      <main className="w-full overflow-x-hidden bg-slate-50">
        <div className="w-full px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:text-sm">
                <span>Financials</span>
                <span>/</span>
                <span className="font-medium text-slate-700">
                  Adjustments
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Audit Adjustments
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Create, review, post, and reject proposed audit
                adjustments.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  loadAdjustments();
                }}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 sm:flex-none"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:flex-none"
              >
                <Plus className="h-4 w-4" />
                New Adjustment
              </button>
            </div>
          </div>

          {/* Alerts */}
          {success && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">
                Total Adjustments
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                {adjustments.length}
              </p>
            </div>

            <div className="min-w-0 rounded-xl border border-amber-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="truncate text-xs font-medium text-amber-700 sm:text-sm">
                Proposed
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                {proposedCount}
              </p>
            </div>

            <div className="min-w-0 rounded-xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="truncate text-xs font-medium text-emerald-700 sm:text-sm">
                Posted
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                {postedCount}
              </p>
            </div>

            <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">
                Total Amount
              </p>

              <p className="mt-2 truncate text-base font-bold text-slate-900 sm:text-xl">
                TZS {formatAmount(totalAmount)}
              </p>
            </div>
          </div>

          {/* Create / Edit Form */}
          {showForm && (
            <section className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="hidden rounded-lg bg-slate-100 p-2 sm:block">
                    {editingId ? (
                      <Edit3 className="h-5 w-5 text-slate-700" />
                    ) : (
                      <FilePlus2 className="h-5 w-5 text-slate-700" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-slate-900">
                      {editingId
                        ? "Edit Adjustment"
                        : "Create Adjustment"}
                    </h2>

                    <p className="text-xs text-slate-500 sm:text-sm">
                      New adjustments start as proposed and must be
                      linked to a trial balance.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Close form"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-5">
                {formError && (
                  <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Engagement */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Engagement
                    </label>

                    <select
                      value={form.engagement}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          engagement: event.target.value,
                          trial_balance: "",
                          debit_account: "",
                          credit_account: "",
                        }))
                      }
                      className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      required
                    >
                      <option value="">
                        Select engagement
                      </option>

                      {engagements.map((engagement) => (
                        <option
                          key={engagement.id}
                          value={engagement.id}
                        >
                          {engagement.engagement_code ||
                            engagement.title ||
                            engagement.name ||
                            `Engagement #${engagement.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Trial Balance */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Trial Balance
                    </label>

                    <select
                      value={form.trial_balance}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          trial_balance:
                            event.target.value,
                        }))
                      }
                      disabled={
                        !form.engagement ||
                        loadingTrialBalances
                      }
                      className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none disabled:bg-slate-100 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      required
                    >
                      <option value="">
                        {loadingTrialBalances
                          ? "Loading trial balances..."
                          : !form.engagement
                          ? "Select engagement first"
                          : trialBalances.length === 0
                          ? "No trial balances found"
                          : "Select trial balance"}
                      </option>

                      {trialBalances.map(
                        (trialBalance) => (
                          <option
                            key={trialBalance.id}
                            value={trialBalance.id}
                          >
                            {formatTrialBalanceLabel(
                              trialBalance
                            )}
                          </option>
                        )
                      )}
                    </select>

                    {form.engagement &&
                      !loadingTrialBalances &&
                      trialBalances.length === 0 && (
                        <p className="mt-1.5 text-xs text-amber-600">
                          No trial balance exists for this
                          engagement. Create or import a trial
                          balance first.
                        </p>
                      )}
                  </div>

                  {/* Adjustment Number */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Adjustment Number
                    </label>

                    <input
                      type="text"
                      value={form.adjustment_number}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          adjustment_number:
                            event.target.value,
                        }))
                      }
                      placeholder="e.g. AJ-002"
                      className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      required
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Amount
                    </label>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.amount}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          amount: event.target.value,
                        }))
                      }
                      placeholder="0.00"
                      className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      required
                    />
                  </div>

                  {/* Debit Account */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Debit Account
                    </label>

                    <select
                      value={form.debit_account}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          debit_account:
                            event.target.value,
                        }))
                      }
                      disabled={
                        !form.engagement ||
                        loadingAccounts
                      }
                      className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none disabled:bg-slate-100 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      required
                    >
                      <option value="">
                        {loadingAccounts
                          ? "Loading accounts..."
                          : !form.engagement
                          ? "Select engagement first"
                          : accounts.length === 0
                          ? "No active accounts found"
                          : "Select debit account"}
                      </option>

                      {accounts.map((account) => (
                        <option
                          key={account.id}
                          value={account.id}
                        >
                          {account.account_code} -{" "}
                          {account.account_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Credit Account */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Credit Account
                    </label>

                    <select
                      value={form.credit_account}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          credit_account:
                            event.target.value,
                        }))
                      }
                      disabled={
                        !form.engagement ||
                        loadingAccounts
                      }
                      className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none disabled:bg-slate-100 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      required
                    >
                      <option value="">
                        {loadingAccounts
                          ? "Loading accounts..."
                          : !form.engagement
                          ? "Select engagement first"
                          : accounts.length === 0
                          ? "No active accounts found"
                          : "Select credit account"}
                      </option>

                      {accounts.map((account) => (
                        <option
                          key={account.id}
                          value={account.id}
                        >
                          {account.account_code} -{" "}
                          {account.account_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Status
                    </label>

                    <div className="flex min-h-11 items-center rounded-lg border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-700">
                      Proposed
                    </div>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Description
                    </label>

                    <textarea
                      rows={4}
                      value={form.description}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          description:
                            event.target.value,
                        }))
                      }
                      placeholder="Explain the reason for this adjustment..."
                      className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      required
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="min-h-11 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving ||
                      loadingAccounts ||
                      loadingTrialBalances
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <SaveIcon />
                    )}

                    {saving
                      ? "Saving..."
                      : editingId
                      ? "Update Adjustment"
                      : "Create Adjustment"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Filters */}
          <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Filter className="h-4 w-4" />
              Filters
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <select
                value={selectedEngagement}
                onChange={(event) =>
                  setSelectedEngagement(
                    event.target.value
                  )
                }
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">
                  All engagements
                </option>

                {engagements.map((engagement) => (
                  <option
                    key={engagement.id}
                    value={engagement.id}
                  >
                    {engagement.engagement_code ||
                      engagement.title ||
                      engagement.name ||
                      `Engagement #${engagement.id}`}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="all">
                  All statuses
                </option>

                <option value="proposed">
                  Proposed
                </option>

                <option value="posted">
                  Posted
                </option>

                <option value="rejected">
                  Rejected
                </option>
              </select>

              <div className="relative md:col-span-2 lg:col-span-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                  placeholder="Search adjustments..."
                  className="min-h-11 w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>
          </section>

          {/* Adjustment Register */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Adjustment Register
                </h2>

                <p className="text-sm text-slate-500">
                  {filteredAdjustments.length} adjustment
                  {filteredAdjustments.length === 1
                    ? ""
                    : "s"}{" "}
                  displayed
                </p>
              </div>

              <span className="text-xs text-slate-500 sm:text-sm">
                Audit adjustment workflow
              </span>
            </div>

            {loading ? (
              <div className="flex min-h-[260px] items-center justify-center p-6">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading adjustments...
                </div>
              </div>
            ) : filteredAdjustments.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center px-5 py-10 text-center">
                <div className="mb-4 rounded-full bg-slate-100 p-4">
                  <FileEdit className="h-7 w-7 text-slate-500" />
                </div>

                <h3 className="font-semibold text-slate-900">
                  No adjustments found
                </h3>

                <p className="mt-1 max-w-md text-sm text-slate-500">
                  There are no adjustments matching the
                  current filters.
                </p>

                <button
                  type="button"
                  onClick={openCreateForm}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  Create Adjustment
                </button>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden overflow-x-auto xl:block">
                  <table className="w-full min-w-[1250px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">
                          Adjustment
                        </th>

                        <th className="px-5 py-3 font-semibold">
                          Engagement
                        </th>

                        <th className="px-5 py-3 font-semibold">
                          Trial Balance
                        </th>

                        <th className="px-5 py-3 font-semibold">
                          Description
                        </th>

                        <th className="px-5 py-3 font-semibold">
                          Debit
                        </th>

                        <th className="px-5 py-3 font-semibold">
                          Credit
                        </th>

                        <th className="px-5 py-3 text-right font-semibold">
                          Amount
                        </th>

                        <th className="px-5 py-3 font-semibold">
                          Status
                        </th>

                        <th className="px-5 py-3 font-semibold">
                          Created
                        </th>

                        <th className="px-5 py-3 text-right font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200">
                      {filteredAdjustments.map(
                        (adjustment) => {
                          const isActing =
                            actionId === adjustment.id;

                          return (
                            <tr
                              key={adjustment.id}
                              className="hover:bg-slate-50"
                            >
                              <td className="whitespace-nowrap px-5 py-4">
                                <div className="font-semibold text-slate-900">
                                  {
                                    adjustment.adjustment_number
                                  }
                                </div>

                                <div className="text-xs text-slate-400">
                                  ID #{adjustment.id}
                                </div>
                              </td>

                              <td className="max-w-[180px] px-5 py-4">
                                <span className="break-words font-medium text-slate-700">
                                  {getEngagementName(
                                    adjustment.engagement
                                  )}
                                </span>
                              </td>

                              <td className="max-w-[210px] px-5 py-4">
                                <div className="font-medium text-slate-700">
                                  {adjustment.trial_balance
                                    ? `TB #${adjustment.trial_balance}`
                                    : "No Trial Balance"}
                                </div>

                                {adjustment.trial_balance_status && (
                                  <div className="mt-1 text-xs text-slate-500">
                                    Status:{" "}
                                    {
                                      adjustment.trial_balance_status
                                    }
                                  </div>
                                )}
                              </td>

                              <td className="max-w-[250px] px-5 py-4">
                                <p className="break-words text-slate-700">
                                  {
                                    adjustment.description
                                  }
                                </p>
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-medium text-slate-800">
                                  {adjustment.debit_account_code ||
                                    "-"}
                                </div>

                                <div className="text-xs text-slate-500">
                                  {adjustment.debit_account_name ||
                                    "-"}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-medium text-slate-800">
                                  {adjustment.credit_account_code ||
                                    "-"}
                                </div>

                                <div className="text-xs text-slate-500">
                                  {adjustment.credit_account_name ||
                                    "-"}
                                </div>
                              </td>

                              <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-slate-900">
                                TZS{" "}
                                {formatAmount(
                                  adjustment.amount
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <StatusBadge
                                  status={
                                    adjustment.status
                                  }
                                />
                              </td>

                              <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                                {formatDate(
                                  adjustment.created_at
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <ActionButtons
                                  adjustment={adjustment}
                                  isActing={isActing}
                                  onEdit={openEditForm}
                                  onPost={handlePost}
                                  onReject={handleReject}
                                />
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile / Tablet Cards */}
                <div className="grid grid-cols-1 gap-3 p-3 xl:hidden">
                  {filteredAdjustments.map(
                    (adjustment) => {
                      const isActing =
                        actionId === adjustment.id;

                      return (
                        <article
                          key={adjustment.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-base font-bold text-slate-900">
                                {
                                  adjustment.adjustment_number
                                }
                              </p>

                              <p className="mt-0.5 break-words text-xs text-slate-500">
                                {getEngagementName(
                                  adjustment.engagement
                                )}
                              </p>
                            </div>

                            <StatusBadge
                              status={adjustment.status}
                            />
                          </div>

                          <div className="mt-4 rounded-lg bg-white p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Trial Balance
                            </p>

                            <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                              {adjustment.trial_balance
                                ? `Trial Balance #${adjustment.trial_balance}`
                                : "No Trial Balance"}
                            </p>

                            {adjustment.trial_balance_status && (
                              <p className="mt-1 text-xs text-slate-500">
                                Status:{" "}
                                {
                                  adjustment.trial_balance_status
                                }
                              </p>
                            )}
                          </div>

                          <div className="mt-4 rounded-lg bg-white p-3">
                            <p className="break-words text-sm leading-5 text-slate-700">
                              {adjustment.description}
                            </p>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                Debit
                              </p>

                              <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                                {adjustment.debit_account_code ||
                                  "-"}
                              </p>

                              <p className="break-words text-xs text-slate-500">
                                {adjustment.debit_account_name ||
                                  "-"}
                              </p>
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                Credit
                              </p>

                              <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                                {adjustment.credit_account_code ||
                                  "-"}
                              </p>

                              <p className="break-words text-xs text-slate-500">
                                {adjustment.credit_account_name ||
                                  "-"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-col gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                Amount
                              </p>

                              <p className="mt-1 text-base font-bold text-slate-900">
                                TZS{" "}
                                {formatAmount(
                                  adjustment.amount
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {formatDate(
                                  adjustment.created_at
                                )}
                              </p>
                            </div>

                            <ActionButtons
                              adjustment={adjustment}
                              isActing={isActing}
                              onEdit={openEditForm}
                              onPost={handlePost}
                              onReject={handleReject}
                            />
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>

  );
}

function StatusBadge({
  status,
}: {
  status: AdjustmentStatus;
}) {
  if (status === "proposed") {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
        Proposed
      </span>
    );
  }

  if (status === "posted") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Posted
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
      <XCircle className="h-3.5 w-3.5" />
      Rejected
    </span>
  );
}

function ActionButtons({
  adjustment,
  isActing,
  onEdit,
  onPost,
  onReject,
}: {
  adjustment: Adjustment;
  isActing: boolean;
  onEdit: (adjustment: Adjustment) => void;
  onPost: (adjustment: Adjustment) => void;
  onReject: (adjustment: Adjustment) => void;
}) {
  if (adjustment.status !== "proposed") {
    return (
      <span className="text-xs font-medium text-slate-400">
        No actions
      </span>
    );
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button
        type="button"
        onClick={() => onEdit(adjustment)}
        disabled={isActing}
        title="Edit adjustment"
        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <Edit3 className="h-4 w-4" />
        <span className="hidden sm:inline">
          Edit
        </span>
      </button>

      <button
        type="button"
        onClick={() => onPost(adjustment)}
        disabled={isActing}
        title="Post adjustment"
        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isActing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}

        <span>Post</span>
      </button>

      <button
        type="button"
        onClick={() => onReject(adjustment)}
        disabled={isActing}
        title="Reject adjustment"
        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        <XCircle className="h-4 w-4" />

        <span className="hidden sm:inline">
          Reject
        </span>
      </button>
    </div>
  );
}

function SaveIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </svg>
  );
}
