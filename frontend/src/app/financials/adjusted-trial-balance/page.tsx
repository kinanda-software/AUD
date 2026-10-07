"use client";
import { API_ORIGIN } from "@/lib/apiConfig";


import { getAdjustedTrialBalance } from "@/lib/api";
import { isRecord } from "@/lib/typeGuards";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useSearchParams,
  useRouter,
} from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  CheckCircle2,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

const API_URL = `${API_ORIGIN}/api`;

type TrialBalance = {
  id: number;
  engagement: number;
  period_start: string;
  period_end: string;
  currency: string;
  status: string;
  description: string;
};

type Summary = {
  total_original_debit: number;
  total_original_credit: number;
  total_adjustment_debit: number;
  total_adjustment_credit: number;
  total_adjusted_debit: number;
  total_adjusted_credit: number;
  difference: number;
  is_balanced: boolean;
  line_count: number;
  posted_adjustment_count: number;
};

type AdjustedTrialBalanceLine = {
  account_id: number;
  account_code: string;
  account_name: string;
  original_debit: number;
  original_credit: number;
  adjustment_debit: number;
  adjustment_credit: number;
  adjusted_debit: number;
  adjusted_credit: number;
};

type AdjustedTrialBalanceResponse = {
  trial_balance: TrialBalance;
  summary: Summary;
  lines: AdjustedTrialBalanceLine[];
};

/* =========================================================
   HELPERS
========================================================= */

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toText(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return Boolean(value);
}

function formatAmount(
  amount: number,
  currency: string
) {
  return `${currency} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: string) {
  if (!date) {
    return "-";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* =========================================================
   NORMALIZE ACCOUNT LINES
========================================================= */

function normalizeLines(
  rawLines: unknown[]
): AdjustedTrialBalanceLine[] {
  return rawLines.map((value, index) => {
    const line = isRecord(value) ? value : {};
    return {
      account_id: toNumber(
        line.account_id ??
          line.account ??
          line.id ??
          index + 1
      ),
      account_code: toText(line.account_code, ""),
      account_name: toText(
        line.account_name ?? line.account,
        ""
      ),
      original_debit: toNumber(line.original_debit),
      original_credit: toNumber(line.original_credit),
      adjustment_debit: toNumber(line.adjustment_debit),
      adjustment_credit: toNumber(line.adjustment_credit),
      adjusted_debit: toNumber(line.adjusted_debit),
      adjusted_credit: toNumber(line.adjusted_credit),
    };
  });
}

/* =========================================================
   CALCULATE SUMMARY FROM LINES
========================================================= */

function calculateSummaryFromLines(
  lines: AdjustedTrialBalanceLine[],
  apiSummary?: unknown
): Summary {
  const summary = isRecord(apiSummary) ? apiSummary : {};
  const totalOriginalDebit = lines.reduce(
    (total, line) =>
      total + line.original_debit,
    0
  );

  const totalOriginalCredit = lines.reduce(
    (total, line) =>
      total + line.original_credit,
    0
  );

  const totalAdjustmentDebit = lines.reduce(
    (total, line) =>
      total + line.adjustment_debit,
    0
  );

  const totalAdjustmentCredit = lines.reduce(
    (total, line) =>
      total + line.adjustment_credit,
    0
  );

  const totalAdjustedDebit = lines.reduce(
    (total, line) =>
      total + line.adjusted_debit,
    0
  );

  const totalAdjustedCredit = lines.reduce(
    (total, line) =>
      total + line.adjusted_credit,
    0
  );

  const difference =
    Math.abs(
      totalAdjustedDebit -
        totalAdjustedCredit
    );

  const isBalanced = difference < 0.01;

  return {
    total_original_debit:
      summary.total_original_debit !== undefined
        ? toNumber(summary.total_original_debit)
        : totalOriginalDebit,

    total_original_credit:
      summary.total_original_credit !== undefined
        ? toNumber(summary.total_original_credit)
        : totalOriginalCredit,

    total_adjustment_debit:
      summary.total_adjustment_debit !== undefined
        ? toNumber(summary.total_adjustment_debit)
        : totalAdjustmentDebit,

    total_adjustment_credit:
      summary.total_adjustment_credit !== undefined
        ? toNumber(summary.total_adjustment_credit)
        : totalAdjustmentCredit,

    total_adjusted_debit:
      summary.total_adjusted_debit !== undefined
        ? toNumber(summary.total_adjusted_debit)
        : totalAdjustedDebit,

    total_adjusted_credit:
      summary.total_adjusted_credit !== undefined
        ? toNumber(summary.total_adjusted_credit)
        : totalAdjustedCredit,

    difference:
      summary.difference !== undefined
        ? toNumber(summary.difference)
        : difference,

    is_balanced:
      summary.is_balanced !== undefined
        ? toBoolean(summary.is_balanced)
        : isBalanced,

    line_count:
      summary.line_count !== undefined
        ? toNumber(summary.line_count)
        : lines.length,

    posted_adjustment_count:
      summary.posted_adjustment_count !== undefined
        ? toNumber(summary.posted_adjustment_count)
        : 0,
  };
}

/* =========================================================
   FETCH ORIGINAL TRIAL BALANCE
========================================================= */

async function getTrialBalanceDetails(
  id: number
): Promise<Partial<TrialBalance>> {
  const response = await fetch(
    `${API_URL}/financials/trial-balances/${id}/`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    console.warn(
      "Could not load Trial Balance details:",
      response.status
    );

    return {};
  }

  const parsed: unknown = await response.json();
  if (!isRecord(parsed)) {
    throw new Error("The Trial Balance API returned an invalid response.");
  }

  return {
    id: toNumber(parsed.id ?? id),

    engagement: Number(
      parsed.engagement ??
        parsed.engagement_id ??
        0
    ),

    period_start: toText(parsed.period_start, ""),

    period_end: toText(parsed.period_end, ""),

    currency: toText(parsed.currency, "TZS"),

    status: toText(parsed.status, "unknown"),

    description: toText(parsed.description, ""),
  };
}

/* =========================================================
   NORMALIZE COMPLETE ATB RESPONSE
========================================================= */

function normalizeAdjustedTrialBalance(
  rawResult: unknown,
  trialBalanceDetails: Partial<TrialBalance>,
  requestedTrialBalanceId: number
): AdjustedTrialBalanceResponse {
  if (!isRecord(rawResult)) {
    throw new Error("The Adjusted Trial Balance API returned an invalid response.");
  }
  let raw: Record<string, unknown> = rawResult;

  if (
    isRecord(raw.data) &&
    (raw.data.lines || raw.data.summary || raw.data.trial_balance)
  ) {
    raw = raw.data;
  }

  const rawLines: unknown[] = Array.isArray(raw.lines)
    ? raw.lines
    : [];

  const lines =
    normalizeLines(rawLines);

  const rawTrialBalance = isRecord(raw.trial_balance)
    ? raw.trial_balance
    : {};

  const trialBalance: TrialBalance = {
    id: Number(
      rawTrialBalance.id ??
        trialBalanceDetails.id ??
        requestedTrialBalanceId
    ),

    engagement: Number(
      rawTrialBalance.engagement ??
        rawTrialBalance.engagement_id ??
        trialBalanceDetails.engagement ??
        0
    ),

    period_start: toText(
      rawTrialBalance.period_start,
      trialBalanceDetails.period_start ?? ""
    ),

    period_end: toText(
      rawTrialBalance.period_end,
      trialBalanceDetails.period_end ?? ""
    ),

    currency: toText(
      rawTrialBalance.currency,
      trialBalanceDetails.currency ?? "TZS"
    ),

    status: toText(
      rawTrialBalance.status,
      trialBalanceDetails.status ?? "unknown"
    ),

    description: toText(
      rawTrialBalance.description,
      trialBalanceDetails.description ?? ""
    ),
  };

  const summary =
    calculateSummaryFromLines(
      lines,
      raw.summary
    );

  return {
    trial_balance:
      trialBalance,

    summary,

    lines,
  };
}

/* =========================================================
   PAGE CONTENT
========================================================= */

function AdjustedTrialBalanceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const trialBalanceParam =
    searchParams.get("trial_balance");

  const trialBalanceId =
    trialBalanceParam
      ? Number(trialBalanceParam)
      : null;

  const [data, setData] =
    useState<AdjustedTrialBalanceResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const fetchAdjustedTrialBalance = async (
    showRefreshLoader = false
  ) => {
    if (
      !trialBalanceId ||
      Number.isNaN(trialBalanceId)
    ) {
      setError(
        "A valid Trial Balance ID is required. Please open Adjusted Trial Balance from a Trial Balance."
      );

      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (showRefreshLoader) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [
        adjustedResult,
        trialBalanceDetails,
      ] = await Promise.all([
        getAdjustedTrialBalance(
          trialBalanceId
        ),

        getTrialBalanceDetails(
          trialBalanceId
        ),
      ]);

      console.log(
        "Adjusted Trial Balance API response:",
        adjustedResult
      );

      console.log(
        "Trial Balance details:",
        trialBalanceDetails
      );

      const normalized =
        normalizeAdjustedTrialBalance(
          adjustedResult,
          trialBalanceDetails,
          trialBalanceId
        );

      console.log(
        "Normalized Adjusted Trial Balance:",
        normalized
      );

      setData(normalized);
    } catch (err) {
      console.error(
        "Adjusted Trial Balance error:",
        err
      );

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Failed to load adjusted trial balance."
        );
      }

      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdjustedTrialBalance();
  }, [trialBalanceId]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredLines = useMemo(() => {
    if (!data?.lines) {
      return [];
    }

    const searchTerm =
      search.trim().toLowerCase();

    if (!searchTerm) {
      return data.lines;
    }

    return data.lines.filter(
      (line) =>
        line.account_code
          .toLowerCase()
          .includes(searchTerm) ||
        line.account_name
          .toLowerCase()
          .includes(searchTerm)
    );
  }, [data, search]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
        <div className="w-full bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full">
            <div className="flex min-h-[500px] items-center justify-center">
              <div className="text-center">
                <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-600" />

                <p className="text-sm font-medium text-slate-600">
                  Loading adjusted trial balance...
                </p>
              </div>
            </div>
          </div>
        </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
        <div className="w-full bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full">

            <div className="mb-6">
              <Link
                href="/financials"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Financials
              </Link>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
              <div className="flex items-start gap-4">

                <div className="rounded-xl bg-red-100 p-3">
                  <TriangleAlert className="h-6 w-6 text-red-600" />
                </div>

                <div>
                  <h1 className="text-lg font-semibold text-red-900">
                    Unable to load Adjusted Trial Balance
                  </h1>

                  <p className="mt-2 text-sm text-red-700">
                    {error}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      fetchAdjustedTrialBalance()
                    }
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
    );
  }

  /* =======================================================
     NO DATA
  ======================================================= */

  if (!data) {
    return (
        <div className="w-full bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full">

            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <FileText className="mx-auto h-10 w-10 text-slate-400" />

              <h1 className="mt-4 text-lg font-semibold text-slate-900">
                No Adjusted Trial Balance Found
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                There is no adjusted trial balance available for this trial balance.
              </p>
            </div>

          </div>
        </div>
    );
  }

  const {
    trial_balance,
    summary,
  } = data;

  /* =======================================================
     UI
  ======================================================= */

  return (
      <div className="w-full bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="w-full space-y-6">

          {/* HEADER */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <Link
                href="/financials"
                className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Financials
              </Link>

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-blue-100 p-3">
                  <Calculator className="h-7 w-7 text-blue-600" />
                </div>

                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Adjusted Trial Balance
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    Original trial balance adjusted for posted audit adjustments.
                  </p>
                </div>

              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                fetchAdjustedTrialBalance(true)
              }
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={
                  refreshing
                    ? "h-4 w-4 animate-spin"
                    : "h-4 w-4"
                }
              />

              Refresh
            </button>

          </div>

          {/* TRIAL BALANCE INFORMATION */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-500" />

                <h2 className="font-semibold text-slate-900">
                  Trial Balance Information
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Trial Balance ID
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  #{trial_balance.id}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Engagement
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  #{trial_balance.engagement}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Period
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatDate(
                    trial_balance.period_start
                  )}{" "}
                  â€“{" "}
                  {formatDate(
                    trial_balance.period_end
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Status
                </p>

                <span className="mt-1 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                  {trial_balance.status}
                </span>
              </div>

            </div>

            {trial_balance.description && (
              <div className="border-t border-slate-200 px-5 py-4 sm:px-6">

                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Description
                </p>

                <p className="mt-1 text-sm text-slate-700">
                  {trial_balance.description}
                </p>

              </div>
            )}

          </div>

          {/* BALANCE STATUS */}
          <div
            className={`rounded-2xl border p-5 shadow-sm ${
              summary.is_balanced
                ? "border-emerald-200 bg-emerald-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-start gap-3">

                <div
                  className={`rounded-xl p-3 ${
                    summary.is_balanced
                      ? "bg-emerald-100"
                      : "bg-red-100"
                  }`}
                >
                  {summary.is_balanced ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  ) : (
                    <TriangleAlert className="h-6 w-6 text-red-600" />
                  )}
                </div>

                <div>

                  <h2
                    className={`font-semibold ${
                      summary.is_balanced
                        ? "text-emerald-900"
                        : "text-red-900"
                    }`}
                  >
                    {summary.is_balanced
                      ? "Adjusted Trial Balance is Balanced"
                      : "Adjusted Trial Balance is Not Balanced"}
                  </h2>

                  <p
                    className={`mt-1 text-sm ${
                      summary.is_balanced
                        ? "text-emerald-700"
                        : "text-red-700"
                    }`}
                  >
                    Difference:{" "}
                    {formatAmount(
                      summary.difference,
                      trial_balance.currency
                    )}
                  </p>

                </div>

              </div>

              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <ShieldCheck className="h-5 w-5" />
                Posted adjustments only
              </div>

            </div>
          </div>

          {/* KPI CARDS */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Original Debit
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900">
                {formatAmount(
                  summary.total_original_debit,
                  trial_balance.currency
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Original Credit
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900">
                {formatAmount(
                  summary.total_original_credit,
                  trial_balance.currency
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
              <p className="text-sm font-medium text-blue-700">
                Adjusted Debit
              </p>

              <p className="mt-2 text-xl font-bold text-blue-900">
                {formatAmount(
                  summary.total_adjusted_debit,
                  trial_balance.currency
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
              <p className="text-sm font-medium text-blue-700">
                Adjusted Credit
              </p>

              <p className="mt-2 text-xl font-bold text-blue-900">
                {formatAmount(
                  summary.total_adjusted_credit,
                  trial_balance.currency
                )}
              </p>
            </div>

          </div>

          {/* ADJUSTMENT SUMMARY */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Adjustment Debit
              </p>

              <p className="mt-2 text-lg font-bold text-slate-900">
                {formatAmount(
                  summary.total_adjustment_debit,
                  trial_balance.currency
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Adjustment Credit
              </p>

              <p className="mt-2 text-lg font-bold text-slate-900">
                {formatAmount(
                  summary.total_adjustment_credit,
                  trial_balance.currency
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Posted Adjustments
              </p>

              <p className="mt-2 text-lg font-bold text-slate-900">
                {summary.posted_adjustment_count}
              </p>
            </div>

          </div>

          {/* ACCOUNT TABLE */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">

              <div>
                <h2 className="font-semibold text-slate-900">
                  Adjusted Account Balances
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredLines.length} account
                  {filteredLines.length === 1
                    ? ""
                    : "s"} shown
                </p>
              </div>

              <div className="relative w-full lg:w-80">

                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search account code or name..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

              </div>

            </div>

            <div className="overflow-x-auto">

              <table className="min-w-[1100px] w-full">

                <thead className="bg-slate-50">

                  <tr className="border-b border-slate-200">

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Account
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Original Debit
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Original Credit
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Adj. Debit
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Adj. Credit
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Adjusted Debit
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Adjusted Credit
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredLines.length === 0 ? (
                    <tr>

                      <td
                        colSpan={7}
                        className="px-6 py-12 text-center text-sm text-slate-500"
                      >
                        No accounts match your search.
                      </td>

                    </tr>
                  ) : (
                    filteredLines.map(
                      (line) => (
                        <tr
                          key={`${line.account_id}-${line.account_code}`}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >

                          <td className="px-4 py-4">

                            <div className="font-semibold text-slate-900">
                              {line.account_code}
                            </div>

                            <div className="mt-1 text-sm text-slate-500">
                              {line.account_name}
                            </div>

                            <Link
                              href={`/financials/audit-trace?engagement=${trial_balance.engagement}&trial_balance=${trial_balance.id}&account=${line.account_id}`}
                              className="mt-1 inline-block text-xs text-blue-700 hover:underline"
                            >
                              Trace account
                            </Link>

                          </td>

                          <td className="px-4 py-4 text-right font-mono text-sm tabular-nums text-slate-700">
                            {formatAmount(
                              line.original_debit,
                              trial_balance.currency
                            )}
                          </td>

                          <td className="px-4 py-4 text-right font-mono text-sm tabular-nums text-slate-700">
                            {formatAmount(
                              line.original_credit,
                              trial_balance.currency
                            )}
                          </td>

                          <td className="px-4 py-4 text-right font-mono text-sm tabular-nums text-blue-700">
                            {formatAmount(
                              line.adjustment_debit,
                              trial_balance.currency
                            )}
                          </td>

                          <td className="px-4 py-4 text-right font-mono text-sm tabular-nums text-blue-700">
                            {formatAmount(
                              line.adjustment_credit,
                              trial_balance.currency
                            )}
                          </td>

                          <td className="px-4 py-4 text-right font-mono text-sm font-semibold tabular-nums text-slate-900">
                            {formatAmount(
                              line.adjusted_debit,
                              trial_balance.currency
                            )}
                          </td>

                          <td className="px-4 py-4 text-right font-mono text-sm font-semibold tabular-nums text-slate-900">
                            {formatAmount(
                              line.adjusted_credit,
                              trial_balance.currency
                            )}
                          </td>

                        </tr>
                      )
                    )
                  )}

                </tbody>

                <tfoot className="bg-slate-50">

                  <tr>

                    <td className="px-4 py-4 text-sm font-bold text-slate-900">
                      TOTAL
                    </td>

                    <td className="px-4 py-4 text-right font-mono text-sm font-bold tabular-nums text-slate-900">
                      {formatAmount(
                        summary.total_original_debit,
                        trial_balance.currency
                      )}
                    </td>

                    <td className="px-4 py-4 text-right font-mono text-sm font-bold tabular-nums text-slate-900">
                      {formatAmount(
                        summary.total_original_credit,
                        trial_balance.currency
                      )}
                    </td>

                    <td className="px-4 py-4 text-right font-mono text-sm font-bold tabular-nums text-blue-700">
                      {formatAmount(
                        summary.total_adjustment_debit,
                        trial_balance.currency
                      )}
                    </td>

                    <td className="px-4 py-4 text-right font-mono text-sm font-bold tabular-nums text-blue-700">
                      {formatAmount(
                        summary.total_adjustment_credit,
                        trial_balance.currency
                      )}
                    </td>

                    <td className="px-4 py-4 text-right font-mono text-sm font-bold tabular-nums text-slate-900">
                      {formatAmount(
                        summary.total_adjusted_debit,
                        trial_balance.currency
                      )}
                    </td>

                    <td className="px-4 py-4 text-right font-mono text-sm font-bold tabular-nums text-slate-900">
                      {formatAmount(
                        summary.total_adjusted_credit,
                        trial_balance.currency
                      )}
                    </td>

                  </tr>

                </tfoot>

              </table>

            </div>
          </div>

          {/* AUDIT NOTE */}
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">
            <strong className="text-slate-700">
              Audit note:
            </strong>{" "}
            The Adjusted Trial Balance is calculated from
            the original trial balance plus posted audit
            adjustments. Proposed and rejected adjustments
            are excluded.
          </div>

          {/* FINANCIAL REPORTING WORKFLOW */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="flex items-start gap-3">

              <div className="rounded-xl bg-blue-100 p-3">
                <Calculator className="h-6 w-6 text-blue-600" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Financial Reporting Workflow
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Continue working with Trial Balance #
                  {trial_balance.id}.
                </p>
              </div>

            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">

              {/* BACK TO TRIAL BALANCE */}
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/financials/trial-balance/${trial_balance.id}`
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Trial Balance
              </button>

              {/* LEAD SCHEDULES */}
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/financials/lead-schedules?trial_balance=${trial_balance.id}`
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Lead Schedules
                <ArrowRight className="h-4 w-4" />
              </button>

              {/* FINANCIAL STATEMENTS */}
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/financials/financial-statements?trial_balance=${trial_balance.id}`
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                Financial Statements
                <ArrowRight className="h-4 w-4" />
              </button>

            </div>

          </div>

        </div>
      </div>
  );
}

/* =========================================================
   SUSPENSE WRAPPER
========================================================= */

export default function AdjustedTrialBalancePage() {
  return (
    <Suspense
      fallback={
          <div className="w-full bg-slate-50 p-4 sm:p-6 lg:p-8">
            <div className="w-full">
              <div className="flex min-h-[500px] items-center justify-center">
                <div className="text-center">
                  <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-600" />

                  <p className="text-sm font-medium text-slate-600">
                    Loading adjusted trial balance...
                  </p>
                </div>
              </div>
            </div>
          </div>
      }
    >
      <AdjustedTrialBalanceContent />
    </Suspense>
  );
}
