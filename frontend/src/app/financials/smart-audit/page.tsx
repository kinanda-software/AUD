"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Download, Loader2, ShieldCheck } from "lucide-react";
import {
  getEngagements,
  getFinancialAnalysis,
  getTrialBalances,
  type Engagement,
  type FinancialAnalysis,
  type TrialBalance,
} from "@/lib/financials";

function formatMoney(value: string | null, currency: string) {
  if (value === null) return "N/A";
  const [whole, fraction] = value.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${currency} ${grouped}.${fraction || "00"}`;
}

export default function SmartAuditPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [trialBalances, setTrialBalances] = useState<TrialBalance[]>([]);
  const [currentId, setCurrentId] = useState("");
  const [comparisonId, setComparisonId] = useState("");
  const [amountThreshold, setAmountThreshold] = useState("0.00");
  const [percentThreshold, setPercentThreshold] = useState("25.00");
  const [reconcileLedger, setReconcileLedger] = useState(false);
  const [report, setReport] = useState<FinancialAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [engagementData, balanceData] = await Promise.all([
          getEngagements(),
          getTrialBalances(),
        ]);
        if (!active) return;
        setEngagements(engagementData);
        setTrialBalances(balanceData);
        const requestedId = new URLSearchParams(window.location.search).get("trial_balance");
        setCurrentId(
          requestedId && balanceData.some((item) => String(item.id) === requestedId)
            ? requestedId
            : ""
        );
        setComparisonId("");
        setReport(null);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Could not load financial data.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [reloadKey]);

  const selectedBalance = trialBalances.find(
    (item) => String(item.id) === currentId
  );
  const comparisonBalances = selectedBalance
    ? trialBalances.filter((item) =>
        item.engagement === selectedBalance.engagement
        && item.currency === selectedBalance.currency
        && item.period_end < selectedBalance.period_start
      )
    : [];
  const balanceLabel = (item: TrialBalance) => {
    const engagement = engagements.find((value) => value.id === item.engagement);
    return `${engagement?.engagement_code || engagement?.title || `Engagement #${item.engagement}`} — ${item.period_start} to ${item.period_end} — ${item.currency} — TB #${item.id}`;
  };

  async function runAnalysis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBalance) {
      setError("Select a trial balance before running analysis.");
      return;
    }
    setRunning(true);
    setError("");
    setReport(null);
    try {
      const result = await getFinancialAnalysis(selectedBalance.id, {
        comparisonId: comparisonId ? Number(comparisonId) : undefined,
        amountThreshold,
        percentThreshold,
        reconcileLedger,
      });
      setReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Financial analysis failed.");
    } finally {
      setRunning(false);
    }
  }

  function exportSnapshot() {
    if (!report) return;
    const blob = new Blob(
      [JSON.stringify({ exported_at: new Date().toISOString(), ...report }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `financial-analysis-tb-${report.trial_balance_id}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  const accountRows = report?.accounts.filter((account) =>
    `${account.account_code} ${account.account_name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  ) ?? [];
  const visibleFindings = report?.findings.filter(
    (finding) => severity === "all" || finding.severity === severity
  ) ?? [];
  const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm";

  return (
    <div className="w-full px-6 py-8">
      <Link href="/financials" className="text-sm text-blue-700">
        Back to Financials
      </Link>
      <h1 className="mt-3 flex items-center gap-2 text-3xl font-bold text-slate-900">
        <ShieldCheck aria-hidden="true" /> Comparisons &amp; Smart Audit
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Compare trial-balance periods and screen posted ledger and journal activity
        using transparent review rules. Source records remain unchanged.
      </p>

      {error && (
        <div role="alert" className="my-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
          {!loading && !running && (
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="ml-3 underline"
            >
              Reload financial data
            </button>
          )}
        </div>
      )}

      {loading ? (
        <p role="status" className="mt-6 flex items-center gap-2 text-sm">
          <Loader2 className="animate-spin" /> Loading financial data...
        </p>
      ) : (
        <form
          onSubmit={runAnalysis}
          onChange={() => setReport(null)}
          className="my-6 rounded-2xl border border-slate-200 bg-white p-5"
        >
          <fieldset disabled={running} className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Current trial balance
              <select
                required
                className={inputClass}
                value={currentId}
                onChange={(event) => {
                  setCurrentId(event.target.value);
                  setComparisonId("");
                }}
              >
                <option value="">Select a trial balance</option>
                {trialBalances.map((item) => (
                  <option key={item.id} value={item.id}>{balanceLabel(item)}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Comparison period (optional)
              <select
                className={inputClass}
                value={comparisonId}
                onChange={(event) => setComparisonId(event.target.value)}
              >
                <option value="">No comparison</option>
                {comparisonBalances.map((item) => (
                  <option key={item.id} value={item.id}>{balanceLabel(item)}</option>
                ))}
              </select>
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Earlier, non-overlapping period for the same engagement and currency.
              </span>
            </label>
            <label className="text-sm font-medium">
              Review amount threshold ({selectedBalance?.currency ?? "currency"})
              <input
                required
                type="number"
                min="0"
                max="9999999999999999.99"
                step="0.01"
                className={inputClass}
                value={amountThreshold}
                onChange={(event) => setAmountThreshold(event.target.value)}
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                User-selected screening threshold, not audit materiality. Zero disables the large manual-entry checks.
              </span>
            </label>
            <label className="text-sm font-medium">
              Period movement threshold (%)
              <input
                required
                type="number"
                min="0"
                max="999999.99"
                step="0.01"
                className={inputClass}
                value={percentThreshold}
                onChange={(event) => setPercentThreshold(event.target.value)}
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Both the amount and percentage thresholds must be met.
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={reconcileLedger}
                onChange={(event) => setReconcileLedger(event.target.checked)}
                className="mt-1"
              />
              <span>
                Compare TB balances with posted period ledger activity
                <span className="block text-xs font-normal text-amber-700">
                  Enable only when ledger activity includes the opening balances needed
                  for this comparison. This is not bank reconciliation.
                </span>
              </span>
            </label>
            <div className="md:col-span-2">
              <button
                disabled={!selectedBalance || running}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {running && <Loader2 size={16} className="animate-spin" />}
                {running ? "Running analysis..." : "Run analysis"}
              </button>
              {trialBalances.length === 0 && (
                <p className="mt-2 text-sm text-slate-600">
                  Create a trial balance before running an analysis.
                </p>
              )}
            </div>
          </fieldset>
        </form>
      )}

      {report && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                TB #{report.trial_balance_id}: {report.period_start} to {report.period_end}
              </h2>
              {report.comparison_id !== null && (
                <p className="mt-1 text-sm text-slate-600">
                  Compared with TB #{report.comparison_id}: {report.comparison_period_start}
                  {" to "}{report.comparison_period_end}. Period lengths are not normalized.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={exportSnapshot}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white p-2 text-sm"
            >
              <Download size={16} /> Export JSON snapshot
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Accounts", report.summary.account_count],
              ["High-priority candidates", report.summary.high_count],
              ["Medium-priority candidates", report.summary.medium_count],
              ["Trial-balance difference", formatMoney(report.difference, report.currency)],
            ].map(([title, value]) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">{title}</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Review candidates ({report.summary.finding_count})
              </h2>
              <label className="text-sm">
                Severity
                <select
                  className="ml-2 rounded border border-slate-300 p-2"
                  value={severity}
                  onChange={(event) => setSeverity(event.target.value)}
                >
                  <option value="all">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                </select>
              </label>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {report.ledger_entry_count} posted ledger lines and {report.journal_entry_count}
              {" "}posted journal entries were inspected. Flags are not confirmed misstatements.
            </p>
            {visibleFindings.length === 0 && (
              <p className="mt-4 text-sm text-slate-600">
                No candidates match these rules and filters. This does not establish audit assurance.
              </p>
            )}
            <ul className="mt-4 space-y-3">
              {visibleFindings.map((finding, index) => (
                <li
                  key={`${finding.rule}-${finding.account_id}-${index}`}
                  className="rounded-lg border border-slate-200 p-3 text-sm"
                >
                  <span className={`mr-2 rounded px-2 py-1 text-xs font-semibold ${
                    finding.severity === "high"
                      ? "bg-red-50 text-red-700"
                      : "bg-amber-50 text-amber-700"
                  }`}>
                    {finding.severity.toUpperCase()}
                  </span>
                  <strong>{finding.rule.replaceAll("_", " ")}</strong>
                  {finding.account_code && <span> | Account {finding.account_code}</span>}
                  {finding.amount !== null && (
                    <span> | {formatMoney(finding.amount, report.currency)}</span>
                  )}
                  <p className="mt-2 text-slate-600">{finding.message}</p>
                  {finding.ledger_entry_ids.length > 0 && (
                    <p className="mt-1 text-xs text-slate-600">
                      Ledger entry IDs: {finding.ledger_entry_ids.join(", ")}
                      {" — "}
                      <Link href="/financials/general-ledger" className="text-blue-700 underline">
                        Open general ledger
                      </Link>
                    </p>
                  )}
                  {finding.journal_entry_ids.length > 0 && (
                    <p className="mt-1 text-xs text-slate-600">
                      Journal entry IDs: {finding.journal_entry_ids.join(", ")}
                      {" — "}
                      <Link href="/financials/journal-entries" className="text-blue-700 underline">
                        Open journal entries
                      </Link>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Account comparison</h2>
            <label className="mt-3 block max-w-md text-sm">
              Search account code or name
              <input
                className={inputClass}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <p className="my-3 text-xs text-slate-500">
              Positive balance = debit; negative = credit. N/A means no comparison or an undefined percentage.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3">Account</th>
                    <th className="p-3">Current net</th>
                    <th className="p-3">Comparison net</th>
                    <th className="p-3">Movement</th>
                    <th className="p-3">Movement %</th>
                    <th className="p-3">Presence</th>
                    {report.reconcile_ledger && <>
                      <th className="p-3">Ledger net</th>
                      <th className="p-3">TB less ledger</th>
                    </>}
                  </tr>
                </thead>
                <tbody>
                  {accountRows.map((account) => (
                    <tr key={account.account_id} className="border-t">
                      <td className="p-3">{account.account_code} — {account.account_name}</td>
                      <td className="p-3">{formatMoney(account.current_balance, report.currency)}</td>
                      <td className="p-3">{formatMoney(account.comparison_balance, report.currency)}</td>
                      <td className="p-3">{formatMoney(account.movement, report.currency)}</td>
                      <td className="p-3">{account.movement_percent === null ? "N/A" : `${account.movement_percent}%`}</td>
                      <td className="p-3">{account.presence.replaceAll("_", " ")}</td>
                      {report.reconcile_ledger && <>
                        <td className="p-3">{formatMoney(account.ledger_net, report.currency)}</td>
                        <td className="p-3">{formatMoney(account.ledger_difference, report.currency)}</td>
                      </>}
                    </tr>
                  ))}
                </tbody>
              </table>
              {accountRows.length === 0 && (
                <p className="p-3 text-sm text-slate-600">No accounts match this search.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-semibold text-slate-900">Scope and limitations</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {report.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
