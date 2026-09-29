"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChevronDown,
  CircleAlert,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Save,
  X,
} from "lucide-react";

import {
  getEngagements,
  getGeneralLedger,
  createGeneralLedgerEntry,
  type Engagement,
  type GeneralLedgerEntry,
  type GeneralLedgerSource,
  type GeneralLedgerStatus,
} from "@/lib/api";

const SOURCE_OPTIONS: {
  value: GeneralLedgerSource;
  label: string;
}[] = [
  { value: "manual", label: "Manual" },
  { value: "import", label: "Import" },
  { value: "trial_balance", label: "Trial Balance" },
  { value: "adjustment", label: "Adjustment" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS: {
  value: GeneralLedgerStatus;
  label: string;
}[] = [
  { value: "draft", label: "Draft" },
  { value: "posted", label: "Posted" },
  { value: "void", label: "Void" },
];

function formatAmount(value: number | string) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function statusLabel(status: string) {
  switch (status) {
    case "posted":
      return "Posted";
    case "draft":
      return "Draft";
    case "void":
      return "Void";
    default:
      return status;
  }
}

function sourceLabel(source: string) {
  switch (source) {
    case "trial_balance":
      return "Trial Balance";
    case "adjustment":
      return "Adjustment";
    case "manual":
      return "Manual";
    case "import":
      return "Import";
    case "other":
      return "Other";
    default:
      return source;
  }
}

function getToday() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Failed to create General Ledger entry.";
}

export default function GeneralLedgerPage() {
  const [entries, setEntries] = useState<GeneralLedgerEntry[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);

  const [selectedEngagement, setSelectedEngagement] =
    useState("");

  const [status, setStatus] =
    useState<GeneralLedgerStatus | "">("");

  const [source, setSource] =
    useState<GeneralLedgerSource | "">("");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  /* =========================================================
     NEW ENTRY MODAL STATE
  ========================================================= */

  const [isNewEntryOpen, setIsNewEntryOpen] =
    useState(false);

  const [savingEntry, setSavingEntry] =
    useState(false);

  const [entryError, setEntryError] =
    useState("");

  const [form, setForm] = useState({
    engagement: "",
    account: "",
    transaction_date: getToday(),
    reference: "",
    description: "",
    debit: "",
    credit: "",
    source: "manual" as GeneralLedgerSource,
    status: "draft" as GeneralLedgerStatus,
  });

  async function loadEngagements() {
    try {
      const data = await getEngagements();

      setEngagements(data);

      if (data.length > 0 && !selectedEngagement) {
        setSelectedEngagement(String(data[0].id));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadGeneralLedger(
    showRefreshState = false
  ) {
    try {
      setError("");

      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await getGeneralLedger({
        engagement: selectedEngagement || undefined,
        status,
        source,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });

      setEntries(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load General Ledger."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadEngagements();
  }, []);

  useEffect(() => {
    if (selectedEngagement) {
      loadGeneralLedger();
    } else {
      setEntries([]);
      setLoading(false);
    }
  }, [
    selectedEngagement,
    status,
    source,
    dateFrom,
    dateTo,
  ]);

  /* =========================================================
     NEW ENTRY FUNCTIONS
  ========================================================= */

  function openNewEntry() {
    setEntryError("");

    setForm({
      engagement: selectedEngagement,
      account: "",
      transaction_date: getToday(),
      reference: "",
      description: "",
      debit: "",
      credit: "",
      source: "manual",
      status: "draft",
    });

    setIsNewEntryOpen(true);
  }

  function closeNewEntry() {
    if (savingEntry) {
      return;
    }

    setIsNewEntryOpen(false);
    setEntryError("");
  }

  function updateForm(
    field: keyof typeof form,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleCreateEntry() {
    setEntryError("");

    if (!form.engagement) {
      setEntryError("Please select an engagement.");
      return;
    }

    if (!form.account.trim()) {
      setEntryError("Please enter the Account ID.");
      return;
    }

    const accountId = Number(form.account);

    if (!Number.isInteger(accountId) || accountId <= 0) {
      setEntryError(
        "Account ID must be a valid positive number."
      );
      return;
    }

    if (!form.transaction_date) {
      setEntryError("Transaction date is required.");
      return;
    }

    if (!form.description.trim()) {
      setEntryError("Description is required.");
      return;
    }

    const debit = form.debit.trim()
      ? Number(form.debit)
      : 0;

    const credit = form.credit.trim()
      ? Number(form.credit)
      : 0;

    if (Number.isNaN(debit) || debit < 0) {
      setEntryError(
        "Debit must be a valid number greater than or equal to zero."
      );
      return;
    }

    if (Number.isNaN(credit) || credit < 0) {
      setEntryError(
        "Credit must be a valid number greater than or equal to zero."
      );
      return;
    }

    if (debit === 0 && credit === 0) {
      setEntryError(
        "Enter an amount in either Debit or Credit."
      );
      return;
    }

    try {
      setSavingEntry(true);

      await createGeneralLedgerEntry({
        engagement: Number(form.engagement),
        account: accountId,
        transaction_date: form.transaction_date,
        reference: form.reference.trim(),
        description: form.description.trim(),
        debit,
        credit,
        source: form.source,
        status: form.status,
      });

      setIsNewEntryOpen(false);
      setEntryError("");

      setForm({
        engagement: selectedEngagement,
        account: "",
        transaction_date: getToday(),
        reference: "",
        description: "",
        debit: "",
        credit: "",
        source: "manual",
        status: "draft",
      });

      await loadGeneralLedger(true);
    } catch (err) {
      console.error(err);

      setEntryError(
        extractErrorMessage(err)
      );
    } finally {
      setSavingEntry(false);
    }
  }

  const selectedEngagementName = useMemo(() => {
    const engagement = engagements.find(
      (item) =>
        String(item.id) ===
        String(form.engagement)
    );

    if (!engagement) {
      return "";
    }

    return `${engagement.engagement_code} — ${engagement.title}`;
  }, [engagements, form.engagement]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return entries;
    }

    return entries.filter((entry) => {
      return [
        entry.account_code,
        entry.account_name,
        entry.reference,
        entry.description,
        entry.account_type,
        entry.financial_statement_section,
        sourceLabel(entry.source),
        statusLabel(entry.status),
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query)
        );
    });
  }, [entries, search]);

  const totals = useMemo(() => {
    return filteredEntries.reduce(
      (result, entry) => {
        result.debit += Number(entry.debit ?? 0);
        result.credit += Number(entry.credit ?? 0);

        return result;
      },
      {
        debit: 0,
        credit: 0,
      }
    );
  }, [filteredEntries]);

  const difference = totals.debit - totals.credit;

  function clearFilters() {
    setStatus("");
    setSource("");
    setDateFrom("");
    setDateTo("");
    setSearch("");
  }

  return (
    <div className="w-full">
      <div className="w-full px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <Link
              href="/financials"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              title="Back to Financials"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <BarChart3 className="h-4 w-4" />
              <span>Audit Financials</span>
              <span>/</span>
              <span>General Ledger</span>
            </div>
          </div>

          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                General Ledger
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Review detailed financial transactions by account,
                including transaction dates, references, debit,
                credit, source, and posting status.
              </p>
            </div>

            <button
              type="button"
              onClick={openNewEntry}
              disabled={!selectedEngagement}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              New Entry
            </button>
          </div>
        </div>

        {/* Engagement Selection */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Engagement
              </label>

              <div className="relative">
                <select
                  value={selectedEngagement}
                  onChange={(event) =>
                    setSelectedEngagement(event.target.value)
                  }
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="">
                    Select an engagement
                  </option>

                  {engagements.map((engagement) => (
                    <option
                      key={engagement.id}
                      value={engagement.id}
                    >
                      {engagement.engagement_code} —{" "}
                      {engagement.title}
                    </option>
                  ))}
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadGeneralLedger(true)}
              disabled={refreshing || !selectedEngagement}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}

              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />

              <h2 className="text-sm font-semibold text-slate-900">
                Ledger Filters
              </h2>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <X className="h-4 w-4" />
              Clear filters
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {/* Search */}
            <div className="xl:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Search
              </label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Account, reference, description..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </label>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as
                      | GeneralLedgerStatus
                      | ""
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                <option value="">All statuses</option>

                {STATUS_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Source */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Source
              </label>

              <select
                value={source}
                onChange={(event) =>
                  setSource(
                    event.target.value as
                      | GeneralLedgerSource
                      | ""
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                <option value="">All sources</option>

                {SOURCE_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Date Range
              </label>

              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) =>
                    setDateFrom(event.target.value)
                  }
                  className="min-w-0 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 text-xs text-slate-700 outline-none focus:border-slate-400"
                  title="From date"
                />

                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) =>
                    setDateTo(event.target.value)
                  }
                  className="min-w-0 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 text-xs text-slate-700 outline-none focus:border-slate-400"
                  title="To date"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Unable to load General Ledger
              </p>

              <p className="mt-1 text-sm">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="mb-5 grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="Ledger Entries"
            value={filteredEntries.length.toLocaleString()}
          />

          <SummaryCard
            label="Total Debit"
            value={formatAmount(totals.debit)}
          />

          <SummaryCard
            label="Total Credit"
            value={formatAmount(totals.credit)}
          />
        </div>

        {/* Balance Control */}
        <div
          className={`mb-5 rounded-2xl border p-5 shadow-sm ${
            Math.abs(difference) < 0.005
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Ledger Control
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Debit and credit totals for the currently displayed
                entries.
              </p>
            </div>

            <div className="text-left md:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Difference
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                {formatAmount(Math.abs(difference))}
              </p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                General Ledger Entries
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {filteredEntries.length} displayed entries
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CalendarDays className="h-4 w-4" />
              Transaction-level detail
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading General Ledger...
              </div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <BarChart3 className="h-6 w-6 text-slate-500" />
              </div>

              <h3 className="font-semibold text-slate-900">
                No General Ledger entries
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                There are currently no ledger entries matching
                the selected engagement and filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1250px] w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Account
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Reference
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Description
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Debit
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Credit
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Source
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                        {formatDate(
                          entry.transaction_date
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">
                          {entry.account_code}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {entry.account_name}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                        {entry.reference || "—"}
                      </td>

                      <td className="max-w-[300px] px-4 py-4">
                        <p className="truncate text-sm text-slate-700">
                          {entry.description}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-medium text-slate-900">
                        {formatAmount(entry.debit)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-medium text-slate-900">
                        {formatAmount(entry.credit)}
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {sourceLabel(entry.source)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${
                            entry.status === "posted"
                              ? "bg-emerald-50 text-emerald-700"
                              : entry.status === "void"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {statusLabel(entry.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td
                      colSpan={4}
                      className="px-4 py-4 text-right text-sm font-semibold text-slate-700"
                    >
                      Total
                    </td>

                    <td className="px-4 py-4 text-right text-sm font-bold text-slate-900">
                      {formatAmount(totals.debit)}
                    </td>

                    <td className="px-4 py-4 text-right text-sm font-bold text-slate-900">
                      {formatAmount(totals.credit)}
                    </td>

                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          NEW GENERAL LEDGER ENTRY MODAL
      ===================================================== */}

      {isNewEntryOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeNewEntry();
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  New General Ledger Entry
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add a manual transaction to the selected engagement.
                </p>
              </div>

              <button
                type="button"
                onClick={closeNewEntry}
                disabled={savingEntry}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[calc(92vh-150px)] overflow-y-auto px-6 py-6">

              {/* Error */}
              {entryError && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
                  <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />

                  <div>
                    <p className="font-semibold">
                      Unable to save entry
                    </p>

                    <p className="mt-1 text-sm leading-5">
                      {entryError}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-5">

                {/* Engagement */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Engagement
                  </label>

                  <select
                    value={form.engagement}
                    onChange={(event) =>
                      updateForm(
                        "engagement",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="">
                      Select an engagement
                    </option>

                    {engagements.map((engagement) => (
                      <option
                        key={engagement.id}
                        value={engagement.id}
                      >
                        {engagement.engagement_code} —{" "}
                        {engagement.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Account */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Account ID
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={form.account}
                    onChange={(event) =>
                      updateForm(
                        "account",
                        event.target.value
                      )
                    }
                    placeholder="e.g. 12"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />

                  <p className="mt-1.5 text-xs text-slate-500">
                    Enter the Chart of Accounts ID belonging to this engagement.
                  </p>
                </div>

                {/* Selected Engagement Info */}
                {selectedEngagementName && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Selected engagement
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {selectedEngagementName}
                    </p>
                  </div>
                )}

                {/* Date + Reference */}
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Transaction Date
                    </label>

                    <input
                      type="date"
                      value={form.transaction_date}
                      onChange={(event) =>
                        updateForm(
                          "transaction_date",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Reference
                    </label>

                    <input
                      type="text"
                      value={form.reference}
                      onChange={(event) =>
                        updateForm(
                          "reference",
                          event.target.value
                        )
                      }
                      placeholder="e.g. JV-001"
                      maxLength={100}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Description
                  </label>

                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateForm(
                        "description",
                        event.target.value
                      )
                    }
                    placeholder="Describe the transaction..."
                    rows={3}
                    maxLength={500}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                {/* Debit + Credit */}
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Debit
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.debit}
                      onChange={(event) =>
                        updateForm(
                          "debit",
                          event.target.value
                        )
                      }
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-right text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Credit
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.credit}
                      onChange={(event) =>
                        updateForm(
                          "credit",
                          event.target.value
                        )
                      }
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-right text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                </div>

                {/* Source + Status */}
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Source
                    </label>

                    <select
                      value={form.source}
                      onChange={(event) =>
                        updateForm(
                          "source",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    >
                      {SOURCE_OPTIONS.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Status
                    </label>

                    <select
                      value={form.status}
                      onChange={(event) =>
                        updateForm(
                          "status",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={closeNewEntry}
                disabled={savingEntry}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCreateEntry}
                disabled={savingEntry}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingEntry ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Entry
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}