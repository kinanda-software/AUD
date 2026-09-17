"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import {
  createTrialBalance,
  getEngagements,
  getTrialBalances,
  type Engagement,
  type TrialBalance,
} from "@/lib/financials";

function formatMoney(value: string | number, currency = "TZS") {
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
    engagement.engagement_code ||
    engagement.title ||
    engagement.name ||
    engagement.code ||
    `Engagement #${engagement.id}`
  );
}

function StatusBadge({ status }: { status: TrialBalance["status"] }) {
  const styles: Record<string, string> = {
    draft: "bg-amber-50 text-amber-700 border-amber-200",
    imported: "bg-blue-50 text-blue-700 border-blue-200",
    reviewed: "bg-purple-50 text-purple-700 border-purple-200",
    locked: "bg-green-50 text-green-700 border-green-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
        styles[status] || "bg-gray-50 text-gray-700 border-gray-200"
      }`}
    >
      {status === "locked" && <Lock size={13} />}
      {status}
    </span>
  );
}

export default function TrialBalancePage() {
  const router = useRouter();

  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [trialBalances, setTrialBalances] = useState<TrialBalance[]>([]);

  const [selectedEngagement, setSelectedEngagement] =
    useState<string>("");

  const [showCreateForm, setShowCreateForm] = useState(false);

  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [currency, setCurrency] = useState("TZS");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [loadingEngagements, setLoadingEngagements] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadEngagements() {
    try {
      setLoadingEngagements(true);

      const data = await getEngagements();

      console.log("ENGAGEMENTS FROM API:", data);

      setEngagements(data);
    } catch (err) {
      console.error("Failed to load engagements:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load engagements."
      );
    } finally {
      setLoadingEngagements(false);
    }
  }

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [engagementData, trialBalanceData] =
        await Promise.all([
          getEngagements(),
          getTrialBalances(
            selectedEngagement
              ? Number(selectedEngagement)
              : undefined
          ),
        ]);

      console.log("ENGAGEMENTS FROM API:", engagementData);

      setEngagements(engagementData);
      setTrialBalances(trialBalanceData);
    } catch (err) {
      console.error("Failed to load Trial Balances:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Trial Balances."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedEngagement]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedEngagement) {
      setError("Please select an engagement.");
      return;
    }

    if (!periodStart || !periodEnd) {
      setError("Please select the Trial Balance period.");
      return;
    }

    if (periodStart > periodEnd) {
      setError(
        "Period end date cannot be before period start date."
      );
      return;
    }

    try {
      setCreating(true);
      setError("");
      setSuccess("");

      const created = await createTrialBalance({
        engagement: Number(selectedEngagement),
        period_start: periodStart,
        period_end: periodEnd,
        currency,
        description,
      });

      setSuccess("Trial Balance created successfully.");

      setShowCreateForm(false);

      setPeriodStart("");
      setPeriodEnd("");
      setDescription("");

      router.push(
        `/financials/trial-balance/${created.id}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create Trial Balance."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600">
                <FileSpreadsheet size={18} />
                Financials
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Trial Balance
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage, review and lock engagement Trial Balances.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={17}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(true);
                  setError("");
                  setSuccess("");
                }}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                <Plus size={18} />
                New Trial Balance
              </button>
            </div>
          </div>

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

          {/* Create form */}
          {showCreateForm && (
            <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-semibold text-slate-900">
                  Create Trial Balance
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Create the reporting period before entering account
                  balances.
                </p>
              </div>

              <form
                onSubmit={handleCreate}
                className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2"
              >
                {/* Engagement */}
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Engagement
                  </label>

                  <select
                    value={selectedEngagement}
                    onChange={(event) =>
                      setSelectedEngagement(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                    disabled={loadingEngagements}
                  >
                    <option value="">
                      {loadingEngagements
                        ? "Loading engagements..."
                        : "Select an engagement"}
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

                  {!loadingEngagements &&
                    engagements.length === 0 && (
                      <p className="mt-2 text-sm text-amber-600">
                        No engagements available.
                      </p>
                    )}

                  {!loadingEngagements &&
                    engagements.length > 0 && (
                      <p className="mt-2 text-xs text-slate-500">
                        {engagements.length} engagement
                        {engagements.length !== 1 ? "s" : ""} available.
                      </p>
                    )}
                </div>

                {/* Period Start */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Period Start
                  </label>

                  <input
                    type="date"
                    value={periodStart}
                    onChange={(event) =>
                      setPeriodStart(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>

                {/* Period End */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Period End
                  </label>

                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(event) =>
                      setPeriodEnd(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>

                {/* Currency */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Currency
                  </label>

                  <select
                    value={currency}
                    onChange={(event) =>
                      setCurrency(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="TZS">TZS</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Description
                  </label>

                  <input
                    type="text"
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    placeholder="e.g. 2026 Financial Statement Audit TB"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 md:col-span-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={creating}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creating && (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    )}

                    Create Trial Balance
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filter */}
          <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Filter by Engagement
            </label>

            <select
              value={selectedEngagement}
              onChange={(event) =>
                setSelectedEngagement(event.target.value)
              }
              className="w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All engagements</option>

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

          {/* Trial Balance table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-900">
                Trial Balances
              </h2>
            </div>

            {loading ? (
              <div className="flex min-h-64 items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Loader2
                    size={22}
                    className="animate-spin"
                  />
                  Loading Trial Balances...
                </div>
              </div>
            ) : trialBalances.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
                <FileSpreadsheet
                  size={42}
                  className="mb-3 text-slate-300"
                />

                <h3 className="font-semibold text-slate-800">
                  No Trial Balances found
                </h3>

                <p className="mt-1 max-w-md text-sm text-slate-500">
                  Create a Trial Balance for an engagement to begin
                  entering financial data.
                </p>

                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Plus size={17} />
                  Create Trial Balance
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Engagement
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Period
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Debit
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Credit
                      </th>

                      <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Difference
                      </th>

                      <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {trialBalances.map((tb) => (
                      <tr
                        key={tb.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-900">
                            {getEngagementName(
                              tb.engagement,
                              engagements
                            )}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            Trial Balance #{tb.id}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <CalendarDays size={15} />
                            {tb.period_start} → {tb.period_end}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right font-mono text-sm text-slate-700">
                          {formatMoney(
                            tb.total_debit,
                            tb.currency
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-mono text-sm text-slate-700">
                          {formatMoney(
                            tb.total_credit,
                            tb.currency
                          )}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span
                            className={
                              tb.is_balanced
                                ? "font-semibold text-green-600"
                                : "font-semibold text-red-600"
                            }
                          >
                            {formatMoney(
                              tb.difference,
                              tb.currency
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <StatusBadge status={tb.status} />
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/financials/trial-balance/${tb.id}`
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Open
                            <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Control note */}
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <ShieldCheck
              size={20}
              className="mt-0.5 shrink-0 text-blue-600"
            />

            <div>
              <p className="text-sm font-semibold text-blue-900">
                Audit control
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-800">
                A Trial Balance must be balanced before it can be
                locked. Once locked, the backend prevents changes to
                its underlying lines.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}