"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import {
  getChartOfAccounts,
  getEngagements,
  type ChartOfAccount,
  type Engagement,
} from "@/lib/financials";
import {
  createBankStatement,
  getBankMatchCandidates,
  getBankReconciliationSummary,
  getBankStatementLines,
  getBankStatements,
  importBankStatementCsv,
  matchBankStatementLine,
  reconcileBankStatement,
  unmatchBankStatementLine,
  type BankMatchCandidate,
  type BankReconciliationSummary,
  type BankStatement,
  type BankStatementLine,
} from "@/lib/financialWorkflows";

function money(value: string, currency: string) {
  const [whole, fraction] = value.split(".");
  return `${currency} ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction || "00"}`;
}

export default function BankReconciliationPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [selectedEngagement, setSelectedEngagement] = useState("");
  const [statementId, setStatementId] = useState("");
  const [lines, setLines] = useState<BankStatementLine[]>([]);
  const [candidates, setCandidates] = useState<Record<number, BankMatchCandidate[]>>({});
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [summary, setSummary] = useState<BankReconciliationSummary | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState("");
  const [currency, setCurrency] = useState("TZS");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [opening, setOpening] = useState("");
  const [closing, setClosing] = useState("");
  const [bookOpening, setBookOpening] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  const selectedStatement = statements.find((item) => String(item.id) === statementId);
  const selectedEngagementName = engagements.find((item) => String(item.id) === selectedEngagement);
  const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm";

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [engagementData, statementData] = await Promise.all([
          getEngagements(),
          getBankStatements(selectedEngagement ? Number(selectedEngagement) : undefined),
        ]);
        if (!active) return;
        setEngagements(engagementData);
        setStatements(statementData);
        if (!selectedEngagement && engagementData.length) {
          setSelectedEngagement(String(engagementData[0].id));
        }
        if (statementId && !statementData.some((item) => String(item.id) === statementId)) {
          setStatementId("");
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load bank statements.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [reload, selectedEngagement, statementId]);

  useEffect(() => {
    let active = true;
    if (!selectedEngagement) return () => { active = false; };
    void getChartOfAccounts(Number(selectedEngagement)).then(
      (result) => {
        if (active) setAccounts(result.filter((item) => item.account_type === "asset"));
      },
      (err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load cash accounts.");
      }
    );
    return () => { active = false; };
  }, [selectedEngagement]);

  useEffect(() => {
    let active = true;
    if (!statementId) return () => { active = false; };
    async function loadStatement() {
      setError("");
      try {
        const [lineData, report, candidateData] = await Promise.all([
          getBankStatementLines(Number(statementId)),
          getBankReconciliationSummary(Number(statementId)),
          getBankMatchCandidates(Number(statementId)),
        ]);
        if (!active) return;
        setLines(lineData);
        setSummary(report);
        setCandidates(Object.fromEntries(candidateData.map((item) => [item.line_id, item.candidates])));
        setSelections({});
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load reconciliation detail.");
      }
    }
    void loadStatement();
    return () => { active = false; };
  }, [statementId, reload]);

  async function createStatement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await createBankStatement({
        engagement: Number(selectedEngagement),
        account: Number(accountId),
        currency,
        period_start: periodStart,
        period_end: periodEnd,
        opening_balance: opening,
        closing_balance: closing,
        book_opening_balance: bookOpening,
      });
      setLines([]);
      setSummary(null);
      setStatementId(String(created.id));
      setReload((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create bank statement.");
    } finally {
      setSaving(false);
    }
  }

  async function importCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !selectedStatement) return;
    setSaving(true);
    setError("");
    try {
      await importBankStatementCsv(selectedStatement.id, file);
      setFile(null);
      setReload((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import the CSV.");
    } finally {
      setSaving(false);
    }
  }

  async function matchLine(lineId: number) {
    const ledgerId = selections[lineId];
    if (!ledgerId) return;
    setSaving(true);
    setError("");
    try {
      await matchBankStatementLine(lineId, Number(ledgerId));
      setReload((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not match ledger entry.");
    } finally {
      setSaving(false);
    }
  }

  async function unmatchLine(lineId: number) {
    setSaving(true);
    setError("");
    try {
      await unmatchBankStatementLine(lineId);
      setReload((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove ledger match.");
    } finally {
      setSaving(false);
    }
  }

  async function finalizeReconciliation() {
    if (!selectedStatement) return;
    setSaving(true);
    setError("");
    try {
      await reconcileBankStatement(selectedStatement.id);
      setReload((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Statement cannot be reconciled.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full px-6 py-8">
      <Link href="/financials" className="text-sm text-blue-700">Back to Financials</Link>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">Bank Reconciliation</h1>
      <p className="mt-2 text-sm text-slate-600">
        Import a bank CSV, match statement transactions to posted cash-ledger entries,
        review differences and lock a completed reconciliation.
      </p>
      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        Suggestions require the same signed amount and account; ledger dates may differ
        by up to three days. Suggestions are never applied automatically. CSV amount is
        positive for money into the bank and negative for money out. CSV headers:
        <code className="ml-1">date,description,reference,amount</code>.
        The import limit is 10 MB / 10,000 rows.
      </div>
      {error && <div role="alert" className="my-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}

      {loading ? (
        <p role="status" className="mt-6 flex items-center gap-2"><Loader2 className="animate-spin" /> Loading bank statements...</p>
      ) : (
        <>
          <div className="my-6 grid gap-5 lg:grid-cols-2">
            <form onSubmit={createStatement} className="rounded-xl border bg-white p-5">
              <h2 className="font-semibold">Start a statement</h2>
              <label className="mt-3 block text-sm">Engagement
                <select className={inputClass} value={selectedEngagement} onChange={(event) => { setSelectedEngagement(event.target.value); setAccountId(""); }} required>
                  <option value="">Select engagement</option>
                  {engagements.map((item) => <option key={item.id} value={item.id}>{item.engagement_code || item.title || `Engagement #${item.id}`}</option>)}
                </select>
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm">Bank/cash account
                  <select className={inputClass} value={accountId} onChange={(event) => setAccountId(event.target.value)} required>
                    <option value="">Select asset account</option>
                    {accounts.map((item) => <option key={item.id} value={item.id}>{item.account_code} — {item.account_name}</option>)}
                  </select>
                </label>
                <label className="text-sm">Currency<input className={inputClass} value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} required maxLength={10} /></label>
                <label className="text-sm">Period start<input className={inputClass} type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} required /></label>
                <label className="text-sm">Period end<input className={inputClass} type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} required /></label>
                <label className="text-sm">Statement opening balance<input className={inputClass} type="number" step="0.01" value={opening} onChange={(event) => setOpening(event.target.value)} required /></label>
                <label className="text-sm">Statement closing balance<input className={inputClass} type="number" step="0.01" value={closing} onChange={(event) => setClosing(event.target.value)} required /></label>
                <label className="text-sm sm:col-span-2">Book opening balance
                  <input className={inputClass} type="number" step="0.01" value={bookOpening} onChange={(event) => setBookOpening(event.target.value)} />
                  <span className="mt-1 block text-xs font-normal text-slate-500">Optional at setup; required before final reconciliation. Confirm from the cash book/previous period.</span>
                </label>
              </div>
              <button disabled={saving || !selectedEngagementName} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                Create statement
              </button>
            </form>

            <section className="rounded-xl border bg-white p-5">
              <h2 className="font-semibold">Open a statement</h2>
              <label className="mt-3 block text-sm">Statement
                <select className={inputClass} value={statementId} onChange={(event) => {
                  setLines([]);
                  setSummary(null);
                  setStatementId(event.target.value);
                }}>
                  <option value="">Select a statement</option>
                  {statements.map((item) => <option key={item.id} value={item.id}>{item.account_code} — {item.period_start} to {item.period_end} — {item.currency} — {item.status} — #{item.id}</option>)}
                </select>
              </label>
              {selectedStatement?.status === "draft" && (
                <form onSubmit={importCsv} className="mt-5">
                  <label className="block text-sm">CSV statement export
                    <input className={inputClass} type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
                  </label>
                  <button disabled={saving || !file} className="mt-3 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"><Upload size={16} /> Import transactions</button>
                </form>
              )}
            </section>
          </div>

          {selectedStatement && summary && (
            <section className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Statement lines", summary.statement_line_count],
                  ["Matched", summary.matched_statement_line_count],
                  ["Unmatched statement lines", summary.unmatched_statement_line_count],
                  ["Unmatched posted ledger lines", summary.unmatched_posted_ledger_line_count],
                  ["Statement movement", money(summary.statement_movement, summary.currency)],
                  ["Statement difference", money(summary.statement_difference, summary.currency)],
                  ["Book closing", summary.posted_ledger_closing_balance === null ? "Set book opening" : money(summary.posted_ledger_closing_balance, summary.currency)],
                  ["Bank less book", summary.bank_less_ledger_difference === null ? "N/A" : money(summary.bank_less_ledger_difference, summary.currency)],
                ].map(([label, value]) => <div key={label} className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>)}
              </div>
              <div className="overflow-x-auto rounded-xl border bg-white">
                <table className="w-full whitespace-nowrap text-left text-sm">
                  <thead className="bg-slate-50"><tr><th className="p-3">Date</th><th className="p-3">Description / reference</th><th className="p-3">Statement amount</th><th className="p-3">Ledger match</th><th className="p-3">Action</th></tr></thead>
                  <tbody>{lines.map((line) => <tr key={line.id} className="border-t">
                    <td className="p-3">{line.transaction_date}</td>
                    <td className="p-3">{line.description}{line.reference && <span className="block text-xs text-slate-500">{line.reference}</span>}</td>
                    <td className="p-3">{money(line.amount, selectedStatement.currency)}</td>
                    <td className="p-3">
                      {line.matched_entry !== null
                        ? `GL #${line.matched_entry}${line.matched_entry_reference ? ` (${line.matched_entry_reference})` : ""}`
                        : <select className="max-w-sm rounded border p-2" value={selections[line.id] ?? ""} onChange={(event) => setSelections((previous) => ({ ...previous, [line.id]: event.target.value }))}>
                            <option value="">Select a reviewed suggestion</option>
                            {(candidates[line.id] ?? []).map((candidate) => <option key={candidate.id} value={candidate.id}>
                              {candidate.match_type === "exact" ? "Exact date" : `${Math.abs(candidate.date_difference_days)}-day date difference`}
                              {" — "}GL #{candidate.id} — {candidate.date} — {candidate.reference || candidate.description}
                              {" — "}{money(candidate.amount, selectedStatement.currency)}
                            </option>)}
                          </select>}
                      {line.matched_entry === null && selections[line.id] && (
                        <p className="mt-1 max-w-sm whitespace-normal text-xs text-slate-500">
                          {(candidates[line.id] ?? [])
                            .find((candidate) => String(candidate.id) === selections[line.id])
                            ?.match_reasons.join(" · ")}
                        </p>
                      )}
                    </td>
                    <td className="p-3">
                      {selectedStatement.status === "draft" && (line.matched_entry !== null
                        ? <button type="button" onClick={() => void unmatchLine(line.id)} disabled={saving} className="text-blue-700 underline">Unmatch</button>
                        : <button type="button" onClick={() => void matchLine(line.id)} disabled={saving || !selections[line.id]} className="text-blue-700 underline">Match</button>)}
                    </td>
                  </tr>)}</tbody>
                </table>
                {lines.length === 0 && <p className="p-4 text-sm text-slate-600">Import statement CSV transactions to begin matching.</p>}
              </div>
              {selectedStatement.status === "draft" ? (
                <button type="button" onClick={() => void finalizeReconciliation()} disabled={saving || !summary.can_reconcile} className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                  <CheckCircle2 size={17} /> Complete reconciliation
                </button>
              ) : (
                <p className="text-sm font-semibold text-green-700">Reconciled {selectedStatement.reconciled_at ? `at ${new Date(selectedStatement.reconciled_at).toLocaleString()}` : ""}; statement is locked.</p>
              )}
              <p className="text-xs text-slate-500">Completion requires every statement line to match one posted ledger line, no unmatched posted ledger lines in the period, a supplied book opening balance, and zero statement/book differences. Suggestions use exact signed amounts and a three-day date window; references and descriptions only help rank candidates. Outstanding-cheque/deposit adjustments and amount-tolerance matching are not included.</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
