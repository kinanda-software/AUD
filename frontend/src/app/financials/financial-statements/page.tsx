"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import { getFinancialStatements } from "@/lib/api";
import type { FinancialStatements } from "@/lib/api";

/* =========================================================
   FINANCIAL STATEMENTS CONTENT
========================================================= */

function FinancialStatementsContent() {
  const searchParams = useSearchParams();

  const trialBalanceParam = searchParams.get("trial_balance");

  const trialBalanceId = trialBalanceParam
    ? Number(trialBalanceParam)
    : null;

  const [data, setData] = useState<FinancialStatements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =========================================================
     LOAD FINANCIAL STATEMENTS
  ========================================================= */

  const loadFinancialStatements = async () => {
    if (!trialBalanceId || Number.isNaN(trialBalanceId)) {
      setError(
        "A valid Trial Balance ID is required. Please open Financial Statements from a Trial Balance."
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await getFinancialStatements(trialBalanceId);

      setData(result);
    } catch (err) {
      console.error("Financial Statements error:", err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load financial statements.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialStatements();
  }, [trialBalanceId]);

  /* =========================================================
     FORMATTERS
  ========================================================= */

  const formatAmount = (
    value: number | string | null | undefined
  ) => {
    const amount = Number(value ?? 0);

    return new Intl.NumberFormat("en-TZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatCurrency = (
    value: number | string | null | undefined,
    currency = data?.trial_balance.currency || "TZS"
  ) => {
    return `${currency} ${formatAmount(value)}`;
  };

  const formatDate = (value: string) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
        <div className="w-full bg-slate-50 p-6">
          <div className="flex min-h-[500px] w-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />

              <p className="text-sm text-slate-600">
                Loading financial statements...
              </p>
            </div>
          </div>
        </div>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
        <div className="w-full bg-slate-50 p-6">
          <div className="w-full">
            <Link
              href="/financials/trial-balance"
              className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Trial Balances
            </Link>

            <div className="rounded-xl border border-red-200 bg-red-50 p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-red-100 p-2">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>

                <div className="flex-1">
                  <h2 className="text-lg font-bold text-red-900">
                    Unable to Load Financial Statements
                  </h2>

                  <p className="mt-2 whitespace-pre-wrap text-sm text-red-700">
                    {error}
                  </p>

                  <button
                    type="button"
                    onClick={loadFinancialStatements}
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

  /* =========================================================
     NO DATA
  ========================================================= */

  if (!data) {
    return (
        <div className="w-full bg-slate-50 p-6">
          <div className="w-full">
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-slate-600">
                No financial statement data is available.
              </p>
            </div>
          </div>
        </div>
    );
  }

  /* =========================================================
     CALCULATIONS
  ========================================================= */

  const profitOrLoss = Number(
    data.profit_or_loss.net_profit_or_loss || 0
  );

  const totalAssets = Number(
    data.statement_of_financial_position.total_assets || 0
  );

  const totalLiabilities = Number(
    data.statement_of_financial_position.total_liabilities || 0
  );

  const totalEquity = Number(
    data.statement_of_financial_position.total_equity || 0
  );

  const totalEquityIncludingProfit = Number(
    data.statement_of_financial_position
      .total_equity_including_profit || 0
  );

  const totalLiabilitiesAndEquity = Number(
    data.statement_of_financial_position
      .total_liabilities_and_equity || 0
  );

  const statementDifference = Number(
    data.statement_of_financial_position.difference || 0
  );

  const adjustedDifference = Number(
    data.control.adjusted_difference || 0
  );

  const isProfit = profitOrLoss >= 0;

  /* =========================================================
     PAGE
  ========================================================= */

  return (
      <div className="w-full bg-slate-50">
        <div className="w-full space-y-6 p-6">

          {/* =====================================================
              HEADER
          ===================================================== */}

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                href="/financials/trial-balance"
                className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Trial Balances
              </Link>

              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-600 p-3">
                  <FileText className="h-7 w-7 text-white" />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    Financial Statements
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    Generated from the Adjusted Trial Balance.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={loadFinancialStatements}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {/* =====================================================
              STATEMENT INFORMATION
          ===================================================== */}

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />

                <h2 className="font-bold text-slate-900">
                  Statement Information
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2 lg:grid-cols-5">
              <InfoItem
                label="Trial Balance"
                value={`TB-${data.trial_balance.id}`}
              />

              <InfoItem
                label="Period Start"
                value={formatDate(data.trial_balance.period_start)}
              />

              <InfoItem
                label="Period End"
                value={formatDate(data.trial_balance.period_end)}
              />

              <InfoItem
                label="Currency"
                value={data.trial_balance.currency}
              />

              <InfoItem
                label="Status"
                value={data.trial_balance.status.toUpperCase()}
              />
            </div>
          </div>

          {/* =====================================================
              CONTROL CARDS
          ===================================================== */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ControlCard
              title="Adjusted Trial Balance"
              passed={
                data.control.adjusted_trial_balance_balanced
              }
              description={
                data.control.adjusted_trial_balance_balanced
                  ? "Debit and credit totals are balanced."
                  : `Difference: ${formatCurrency(adjustedDifference)}`
              }
            />

            <ControlCard
              title="Statement of Financial Position"
              passed={
                data.statement_of_financial_position.is_balanced
              }
              description={
                data.statement_of_financial_position.is_balanced
                  ? "Assets equal liabilities and equity."
                  : `Difference: ${formatCurrency(statementDifference)}`
              }
            />
          </div>

          {/* =====================================================
              PROFIT OR LOSS
          ===================================================== */}

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 p-2">
                  <TrendingUp className="h-5 w-5 text-emerald-700" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Statement of Profit or Loss
                  </h2>

                  <p className="text-sm text-slate-500">
                    For the period ended{" "}
                    {formatDate(data.trial_balance.period_end)}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">

              {/* Revenue */}

              <StatementSection
                title="Revenue"
                accounts={data.profit_or_loss.revenue}
                formatCurrency={formatCurrency}
              />

              <div className="my-6 border-t border-slate-200" />

              {/* Expenses */}

              <StatementSection
                title="Expenses"
                accounts={data.profit_or_loss.expenses}
                formatCurrency={formatCurrency}
              />

              <div className="my-6 border-t-2 border-slate-300" />

              {/* Profit */}

              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-5 py-4">
                <div>
                  <p className="font-bold text-slate-900">
                    {isProfit
                      ? "Profit for the Period"
                      : "Loss for the Period"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Revenue less expenses
                  </p>
                </div>

                <p
                  className={`text-lg font-bold ${
                    isProfit
                      ? "text-emerald-700"
                      : "text-red-700"
                  }`}
                >
                  {formatCurrency(profitOrLoss)}
                </p>
              </div>

              {/* Summary */}

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <SummaryCard
                  label="Total Revenue"
                  value={formatCurrency(
                    data.profit_or_loss.total_revenue
                  )}
                />

                <SummaryCard
                  label="Total Expenses"
                  value={formatCurrency(
                    data.profit_or_loss.total_expenses
                  )}
                />

                <SummaryCard
                  label="Net Profit / Loss"
                  value={formatCurrency(profitOrLoss)}
                  highlighted
                />
              </div>
            </div>
          </section>

          {/* =====================================================
              STATEMENT OF FINANCIAL POSITION
          ===================================================== */}

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2">
                  <ShieldCheck className="h-5 w-5 text-blue-700" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Statement of Financial Position
                  </h2>

                  <p className="text-sm text-slate-500">
                    As at{" "}
                    {formatDate(data.trial_balance.period_end)}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">

              {/* Assets */}

              <StatementSection
                title="Assets"
                accounts={
                  data.statement_of_financial_position.assets
                }
                formatCurrency={formatCurrency}
              />

              <div className="my-6 border-t border-slate-200" />

              {/* Liabilities */}

              <StatementSection
                title="Liabilities"
                accounts={
                  data.statement_of_financial_position.liabilities
                }
                formatCurrency={formatCurrency}
              />

              <div className="my-6 border-t border-slate-200" />

              {/* Equity */}

              <StatementSection
                title="Equity"
                accounts={
                  data.statement_of_financial_position.equity
                }
                formatCurrency={formatCurrency}
              />

              {/* Current Period Profit */}

              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-semibold text-slate-800">
                      Current Period Profit / Loss
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Derived from the Statement of Profit or Loss
                    </p>
                  </div>

                  <p
                    className={`font-bold ${
                      Number(
                        data.statement_of_financial_position
                          .current_period_profit_or_loss
                      ) >= 0
                        ? "text-emerald-700"
                        : "text-red-700"
                    }`}
                  >
                    {formatCurrency(
                      data.statement_of_financial_position
                        .current_period_profit_or_loss
                    )}
                  </p>
                </div>
              </div>

              <div className="my-6 border-t-2 border-slate-300" />

              {/* Totals */}

              <div className="space-y-3">
                <TotalRow
                  label="Total Assets"
                  value={formatCurrency(totalAssets)}
                />

                <TotalRow
                  label="Total Liabilities"
                  value={formatCurrency(totalLiabilities)}
                />

                <TotalRow
                  label="Actual Equity"
                  value={formatCurrency(totalEquity)}
                />

                <TotalRow
                  label="Equity Including Current Period Profit / Loss"
                  value={formatCurrency(
                    totalEquityIncludingProfit
                  )}
                />

                <div className="border-t-2 border-slate-300 pt-3">
                  <TotalRow
                    label="Total Liabilities + Equity"
                    value={formatCurrency(
                      totalLiabilitiesAndEquity
                    )}
                    emphasized
                  />
                </div>
              </div>

              {/* Balance result */}

              <div
                className={`mt-5 flex flex-col gap-4 rounded-lg px-5 py-4 md:flex-row md:items-center md:justify-between ${
                  data.statement_of_financial_position.is_balanced
                    ? "bg-emerald-50"
                    : "bg-red-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {data.statement_of_financial_position
                    .is_balanced ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
                  )}

                  <div>
                    <p
                      className={`font-bold ${
                        data.statement_of_financial_position
                          .is_balanced
                          ? "text-emerald-900"
                          : "text-red-900"
                      }`}
                    >
                      {data.statement_of_financial_position
                        .is_balanced
                        ? "Statement Balanced"
                        : "Statement Not Balanced"}
                    </p>

                    <p
                      className={`mt-1 text-xs ${
                        data.statement_of_financial_position
                          .is_balanced
                          ? "text-emerald-700"
                          : "text-red-700"
                      }`}
                    >
                      Assets compared with liabilities and equity.
                    </p>
                  </div>
                </div>

                <p
                  className={`font-bold ${
                    data.statement_of_financial_position
                      .is_balanced
                      ? "text-emerald-700"
                      : "text-red-700"
                  }`}
                >
                  Difference: {formatCurrency(statementDifference)}
                </p>
              </div>
            </div>
          </section>

          {/* =====================================================
              UNCLASSIFIED ACCOUNTS
          ===================================================== */}

          {data.other_accounts.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
              <div className="border-b border-amber-200 bg-amber-50 px-6 py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />

                  <div>
                    <h2 className="font-bold text-amber-900">
                      Accounts Requiring Classification
                    </h2>

                    <p className="mt-1 text-sm text-amber-700">
                      These accounts are not currently classified
                      into the main financial statements.
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Account Code
                      </th>

                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Account Name
                      </th>

                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Classification
                      </th>

                      <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                        Balance
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.other_accounts.map((account) => (
                      <tr
                        key={account.account_id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-slate-800">
                          {account.account_code}
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-700">
                          {account.account_name}
                        </td>

                        <td className="px-6 py-4 text-sm text-amber-700">
                          {account.financial_statement_section ||
                            "Not classified"}
                        </td>

                        <td className="px-6 py-4 text-right text-sm font-semibold text-slate-800">
                          {formatCurrency(account.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* =====================================================
              CONTROL TOTALS
          ===================================================== */}

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="font-bold text-slate-900">
                Financial Statement Controls
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Control totals supporting the generated financial
                statements.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
              <ControlMetric
                label="Adjusted Debit"
                value={formatCurrency(
                  data.control.adjusted_total_debit
                )}
              />

              <ControlMetric
                label="Adjusted Credit"
                value={formatCurrency(
                  data.control.adjusted_total_credit
                )}
              />

              <ControlMetric
                label="Adjusted Difference"
                value={formatCurrency(
                  data.control.adjusted_difference
                )}
              />
            </div>

            <div className="border-t border-slate-200 px-6 py-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-600" />

                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Source Control
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Financial statements are generated from the
                    original trial balance and posted audit
                    adjustments only. The original trial balance
                    is not modified.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* =====================================================
              FOOTER NAVIGATION
          ===================================================== */}

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
            <Link
              href={
                trialBalanceId
                  ? `/financials/adjusted-trial-balance?trial_balance=${trialBalanceId}`
                  : "/financials/trial-balance"
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Adjusted Trial Balance
            </Link>

            <Link
              href="/financials"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Financials Dashboard
            </Link>
          </div>
        </div>
      </div>
  );
}

/* =========================================================
   SUSPENSE WRAPPER
========================================================= */

export default function FinancialStatementsPage() {
  return (
    <Suspense
      fallback={
          <div className="w-full bg-slate-50 p-6">
            <div className="flex min-h-[500px] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />

                <p className="text-sm text-slate-600">
                  Loading financial statements...
                </p>
              </div>
            </div>
          </div>
      }
    >
      <FinancialStatementsContent />
    </Suspense>
  );
}

/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   CONTROL CARD
========================================================= */

function ControlCard({
  title,
  passed,
  description,
}: {
  title: string;
  passed: boolean;
  description: string;
}) {
  return (
    <div
      className={`rounded-xl border p-5 shadow-sm ${
        passed
          ? "border-emerald-200 bg-emerald-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      <div className="flex items-start gap-3">
        {passed ? (
          <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600" />
        ) : (
          <AlertTriangle className="mt-0.5 h-6 w-6 text-red-600" />
        )}

        <div>
          <p
            className={`font-bold ${
              passed ? "text-emerald-900" : "text-red-900"
            }`}
          >
            {title}
          </p>

          <p
            className={`mt-1 text-sm ${
              passed ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   STATEMENT SECTION
========================================================= */

function StatementSection({
  title,
  accounts,
  formatCurrency,
}: {
  title: string;
  accounts: FinancialStatements["profit_or_loss"]["revenue"];
  formatCurrency: (
    value: number | string | null | undefined
  ) => string;
}) {
  const total = accounts.reduce(
    (sum, account) => sum + Number(account.balance || 0),
    0
  );

  return (
    <div>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
        {title}
      </h3>

      {accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 px-5 py-4 text-sm text-slate-500">
          No {title.toLowerCase()} accounts classified.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="divide-y divide-slate-100">
            {accounts.map((account) => (
              <div
                key={account.account_id}
                className="flex items-center justify-between px-5 py-3"
              >
                <p className="text-sm font-medium text-slate-800">
                  {account.account_code} — {account.account_name}
                </p>

                <p className="ml-4 shrink-0 text-sm font-semibold text-slate-800">
                  {formatCurrency(account.balance)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3">
            <p className="text-sm font-bold text-slate-900">
              Total {title}
            </p>

            <p className="text-sm font-bold text-slate-900">
              {formatCurrency(total)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlighted
          ? "border-blue-200 bg-blue-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-base font-bold ${
          highlighted ? "text-blue-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   TOTAL ROW
========================================================= */

function TotalRow({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p
        className={`text-sm ${
          emphasized
            ? "font-bold text-slate-900"
            : "font-medium text-slate-700"
        }`}
      >
        {label}
      </p>

      <p
        className={`text-sm ${
          emphasized
            ? "font-bold text-slate-900"
            : "font-semibold text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   CONTROL METRIC
========================================================= */

function ControlMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-base font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

