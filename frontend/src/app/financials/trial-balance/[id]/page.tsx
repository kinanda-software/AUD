"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  FileSpreadsheet,
  Lock,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Unlock,
} from "lucide-react";

import {
  createTrialBalanceLine,
  deleteTrialBalanceLine,
  getChartOfAccounts,
  getEngagements,
  getTrialBalance,
  lockTrialBalance,
  type ChartOfAccount,
  type Engagement,
  type TrialBalance,
  type TrialBalanceLine,
} from "@/lib/financials";

function formatMoney(
  value: string | number,
  currency = "TZS"
) {
  const number = Number(value || 0);

  return `${currency} ${number.toLocaleString("en-TZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getEngagementName(
  engagementId: number,
  engagements: Engagement[]
) {
  const engagement = engagements.find(
    (item) => item.id === engagementId
  );

  if (!engagement) {
    return `Engagement #${engagementId}`;
  }

  return (
    engagement.title ||
    engagement.name ||
    engagement.engagement_code ||
    engagement.code ||
    `Engagement #${engagement.id}`
  );
}

function StatusBadge({
  status,
}: {
  status: TrialBalance["status"];
}) {
  const styles: Record<string, string> = {
    draft: "bg-amber-50 text-amber-700 border-amber-200",
    imported: "bg-blue-50 text-blue-700 border-blue-200",
    reviewed: "bg-purple-50 text-purple-700 border-purple-200",
    locked: "bg-green-50 text-green-700 border-green-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
        styles[status] ||
        "bg-gray-50 text-gray-700 border-gray-200"
      }`}
    >
      {status === "locked" && <Lock size={13} />}
      {status}
    </span>
  );
}

export default function TrialBalanceDetailPage() {
  const params = useParams();
  const router = useRouter();

  const trialBalanceId = Number(params.id);

  const [trialBalance, setTrialBalance] =
    useState<TrialBalance | null>(null);

  const [engagements, setEngagements] = useState<Engagement[]>(
    []
  );

  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);

  const [selectedAccount, setSelectedAccount] =
    useState<string>("");

  const [debit, setDebit] = useState("");
  const [credit, setCredit] = useState("");

  const [loading, setLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] =
    useState(false);
  const [adding, setAdding] = useState(false);
  const [locking, setLocking] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(
    null
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isLocked = trialBalance?.status === "locked";

  const localTotalDebit = useMemo(() => {
    return (
      trialBalance?.lines.reduce(
        (sum, line) => sum + Number(line.debit || 0),
        0
      ) || 0
    );
  }, [trialBalance]);

  const localTotalCredit = useMemo(() => {
    return (
      trialBalance?.lines.reduce(
        (sum, line) => sum + Number(line.credit || 0),
        0
      ) || 0
    );
  }, [trialBalance]);

  const localDifference =
    localTotalDebit - localTotalCredit;

  const localBalanced =
    Math.abs(localDifference) < 0.005;

  async function loadTrialBalance() {
    try {
      setLoading(true);
      setError("");

      const [tb, engagementData] = await Promise.all([
        getTrialBalance(trialBalanceId),
        getEngagements(),
      ]);

      setTrialBalance(tb);
      setEngagements(engagementData);

      setAccountsLoading(true);

      const accountData = await getChartOfAccounts(
        tb.engagement
      );

      setAccounts(accountData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Trial Balance."
      );
    } finally {
      setAccountsLoading(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!trialBalanceId || Number.isNaN(trialBalanceId)) {
      setError("Invalid Trial Balance ID.");
      setLoading(false);
      return;
    }

    loadTrialBalance();
  }, [trialBalanceId]);

  function validateAmountInput() {
    const debitValue = Number(debit || 0);
    const creditValue = Number(credit || 0);

    if (debitValue < 0 || creditValue < 0) {
      setError("Debit and credit cannot be negative.");
      return false;
    }

    if (debitValue > 0 && creditValue > 0) {
      setError(
        "A Trial Balance line cannot have both debit and credit."
      );
      return false;
    }

    if (debitValue === 0 && creditValue === 0) {
      setError(
        "Enter either a debit amount or a credit amount."
      );
      return false;
    }

    return true;
  }

  async function handleAddLine(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!trialBalance) {
      return;
    }

    if (isLocked) {
      setError(
        "This Trial Balance is locked and cannot be modified."
      );
      return;
    }

    if (!selectedAccount) {
      setError("Please select an account.");
      return;
    }

    if (!validateAmountInput()) {
      return;
    }

    try {
      setAdding(true);
      setError("");
      setSuccess("");

      await createTrialBalanceLine({
        trial_balance: trialBalance.id,
        account: Number(selectedAccount),
        debit: debit || "0.00",
        credit: credit || "0.00",
      });

      setSelectedAccount("");
      setDebit("");
      setCredit("");

      await loadTrialBalance();

      setSuccess("Trial Balance line added successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to add Trial Balance line."
      );
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteLine(line: TrialBalanceLine) {
    if (!trialBalance) {
      return;
    }

    if (isLocked) {
      setError(
        "This Trial Balance is locked and cannot be modified."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete ${line.account_code} - ${line.account_name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(line.id);
      setError("");
      setSuccess("");

      await deleteTrialBalanceLine(line.id);

      await loadTrialBalance();

      setSuccess("Trial Balance line deleted.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete Trial Balance line."
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function handleLock() {
    if (!trialBalance) {
      return;
    }

    if (isLocked) {
      return;
    }

    if (!localBalanced) {
      setError(
        "The Trial Balance must balance before it can be locked."
      );
      return;
    }

    const confirmed = window.confirm(
      "Lock this Trial Balance? Once locked, its lines cannot be modified."
    );

    if (!confirmed) {
      return;
    }

    try {
      setLocking(true);
      setError("");
      setSuccess("");

      const locked = await lockTrialBalance(
        trialBalance.id
      );

      setTrialBalance(locked);

      setSuccess(
        "Trial Balance locked successfully. No further line modifications are allowed."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to lock Trial Balance."
      );
    } finally {
      setLocking(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2
              size={24}
              className="animate-spin"
            />
            Loading Trial Balance...
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!trialBalance) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-slate-50 p-6">
          <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={22}
                className="text-red-600"
              />

              <div>
                <h1 className="font-semibold text-red-900">
                  Trial Balance could not be loaded
                </h1>

                <p className="mt-1 text-sm text-red-700">
                  {error || "The requested Trial Balance does not exist."}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    router.push("/financials/trial-balance")
                  }
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <ArrowLeft size={16} />
                  Back to Trial Balances
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Back */}
          <button
            type="button"
            onClick={() =>
              router.push("/financials/trial-balance")
            }
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={17} />
            Back to Trial Balances
          </button>

          {/* Messages */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle
                className="mt-0.5 shrink-0"
                size={18}
              />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              <CheckCircle2
                className="mt-0.5 shrink-0"
                size={18}
              />
              <span>{success}</span>
            </div>
          )}

          {/* Header */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-5 border-b border-slate-200 p-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600">
                  <FileSpreadsheet size={18} />
                  Financials / Trial Balance
                </div>

                <h1 className="text-2xl font-bold text-slate-900">
                  Trial Balance #{trialBalance.id}
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  {getEngagementName(
                    trialBalance.engagement,
                    engagements
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge
                  status={trialBalance.status}
                />

                {!isLocked && (
                  <button
                    type="button"
                    onClick={handleLock}
                    disabled={locking || !localBalanced}
                    title={
                      !localBalanced
                        ? "Trial Balance must balance before locking."
                        : "Lock Trial Balance"
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {locking ? (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <Lock size={17} />
                    )}
                    Lock Trial Balance
                  </button>
                )}

                {isLocked && (
                  <div className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700">
                    <Lock size={17} />
                    Locked
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Period Start
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {trialBalance.period_start}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Period End
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {trialBalance.period_end}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Currency
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {trialBalance.currency}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Lines
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {trialBalance.lines.length}
                </p>
              </div>
            </div>

            {trialBalance.description && (
              <div className="border-t border-slate-100 px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Description
                </p>

                <p className="mt-1 text-sm text-slate-700">
                  {trialBalance.description}
                </p>
              </div>
            )}
          </div>

          {/* Locked notice */}
          {isLocked && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
              <ShieldCheck
                size={21}
                className="mt-0.5 shrink-0 text-green-600"
              />

              <div>
                <p className="text-sm font-semibold text-green-900">
                  Trial Balance is locked
                </p>

                <p className="mt-1 text-xs leading-5 text-green-800">
                  This Trial Balance is now protected from line
                  creation, editing and deletion. Any attempted
                  modification is rejected by the backend.
                </p>
              </div>
            </div>
          )}

          {/* Add line */}
          {!isLocked && (
            <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
                <Plus size={18} className="text-blue-600" />

                <div>
                  <h2 className="font-semibold text-slate-900">
                    Add Account Balance
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Select an account and enter either a debit or
                    credit balance.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleAddLine}
                className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-12"
              >
                <div className="lg:col-span-6">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Account
                  </label>

                  <select
                    value={selectedAccount}
                    onChange={(event) =>
                      setSelectedAccount(event.target.value)
                    }
                    disabled={accountsLoading || adding}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  >
                    <option value="">
                      {accountsLoading
                        ? "Loading accounts..."
                        : "Select account"}
                    </option>

                    {accounts
                      .filter((account) => account.is_active)
                      .map((account) => (
                        <option
                          key={account.id}
                          value={account.id}
                        >
                          {account.account_code} -{" "}
                          {account.account_name}
                        </option>
                      ))}
                  </select>

                  {accounts.length === 0 &&
                    !accountsLoading && (
                      <p className="mt-2 text-xs text-amber-600">
                        No Chart of Accounts found for this
                        engagement.
                      </p>
                    )}
                </div>

                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Debit
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={debit}
                    onChange={(event) => {
                      setDebit(event.target.value);

                      if (event.target.value) {
                        setCredit("");
                      }
                    }}
                    placeholder="0.00"
                    disabled={adding}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-right font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Credit
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={credit}
                    onChange={(event) => {
                      setCredit(event.target.value);

                      if (event.target.value) {
                        setDebit("");
                      }
                    }}
                    placeholder="0.00"
                    disabled={adding}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-right font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  />
                </div>

                <div className="flex items-end lg:col-span-2">
                  <button
                    type="submit"
                    disabled={
                      adding ||
                      accountsLoading ||
                      accounts.length === 0
                    }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {adding ? (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <Save size={17} />
                    )}
                    Add Line
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Summary cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  Total Debit
                </p>

                <CircleDollarSign
                  size={20}
                  className="text-blue-600"
                />
              </div>

              <p className="mt-2 text-xl font-bold text-slate-900">
                {formatMoney(
                  localTotalDebit,
                  trialBalance.currency
                )}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  Total Credit
                </p>

                <CircleDollarSign
                  size={20}
                  className="text-purple-600"
                />
              </div>

              <p className="mt-2 text-xl font-bold text-slate-900">
                {formatMoney(
                  localTotalCredit,
                  trialBalance.currency
                )}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  Difference
                </p>

                {localBalanced ? (
                  <CheckCircle2
                    size={20}
                    className="text-green-600"
                  />
                ) : (
                  <AlertCircle
                    size={20}
                    className="text-red-600"
                  />
                )}
              </div>

              <p
                className={`mt-2 text-xl font-bold ${
                  localBalanced
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatMoney(
                  localDifference,
                  trialBalance.currency
                )}
              </p>
            </div>

            <div
              className={`rounded-xl border p-5 shadow-sm ${
                localBalanced
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <p
                  className={`text-sm font-medium ${
                    localBalanced
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  Balance Status
                </p>

                {localBalanced ? (
                  <CheckCircle2
                    size={20}
                    className="text-green-600"
                  />
                ) : (
                  <AlertCircle
                    size={20}
                    className="text-red-600"
                  />
                )}
              </div>

              <p
                className={`mt-2 text-xl font-bold ${
                  localBalanced
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                {localBalanced
                  ? "Balanced"
                  : "Unbalanced"}
              </p>
            </div>
          </div>

          {/* Lines table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Account Balances
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {trialBalance.lines.length} account{" "}
                  {trialBalance.lines.length === 1
                    ? "line"
                    : "lines"}
                </p>
              </div>

              {isLocked && (
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-green-700">
                  <Lock size={14} />
                  Read only
                </span>
              )}
            </div>

            {trialBalance.lines.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center">
                <FileSpreadsheet
                  size={38}
                  className="mb-3 text-slate-300"
                />

                <h3 className="font-semibold text-slate-800">
                  No account balances
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Add accounts above to build the Trial Balance.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        #
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Account
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Account Name
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Debit
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Credit
                      </th>

                      {!isLocked && (
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Action
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {trialBalance.lines.map((line, index) => (
                      <tr
                        key={line.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 text-sm text-slate-400">
                          {index + 1}
                        </td>

                        <td className="px-5 py-4 font-mono text-sm font-semibold text-slate-800">
                          {line.account_code}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {line.account_name}
                        </td>

                        <td className="px-5 py-4 text-right font-mono text-sm text-slate-700">
                          {Number(line.debit) > 0
                            ? formatMoney(
                                line.debit,
                                trialBalance.currency
                              )
                            : "—"}
                        </td>

                        <td className="px-5 py-4 text-right font-mono text-sm text-slate-700">
                          {Number(line.credit) > 0
                            ? formatMoney(
                                line.credit,
                                trialBalance.currency
                              )
                            : "—"}
                        </td>

                        {!isLocked && (
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteLine(line)
                              }
                              disabled={
                                deletingId === line.id
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingId === line.id ? (
                                <Loader2
                                  size={14}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2 size={14} />
                              )}
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>

                  <tfoot className="border-t-2 border-slate-300 bg-slate-50">
                    <tr>
                      <td
                        colSpan={3}
                        className="px-5 py-4 text-right text-sm font-bold uppercase text-slate-700"
                      >
                        Total
                      </td>

                      <td className="px-5 py-4 text-right font-mono text-sm font-bold text-slate-900">
                        {formatMoney(
                          localTotalDebit,
                          trialBalance.currency
                        )}
                      </td>

                      <td className="px-5 py-4 text-right font-mono text-sm font-bold text-slate-900">
                        {formatMoney(
                          localTotalCredit,
                          trialBalance.currency
                        )}
                      </td>

                      {!isLocked && <td />}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Control information */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  size={21}
                  className="mt-0.5 text-blue-600"
                />

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Trial Balance control
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Debit and credit totals must agree before the
                    Trial Balance can be locked.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                {isLocked ? (
                  <Lock
                    size={21}
                    className="mt-0.5 text-green-600"
                  />
                ) : (
                  <Unlock
                    size={21}
                    className="mt-0.5 text-amber-600"
                  />
                )}

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Modification status
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {isLocked
                      ? "This Trial Balance is locked and is now read-only."
                      : "This Trial Balance is still editable until it is locked."}
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