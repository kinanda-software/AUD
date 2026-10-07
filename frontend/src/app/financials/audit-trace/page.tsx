"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import FinancialEvidencePanel from "@/components/financials/FinancialEvidencePanel";
import type { EvidenceTarget } from "@/lib/financialEvidence";
import { getEngagements, type Engagement } from "@/lib/api";
import { getChartOfAccounts, type ChartOfAccount } from "@/lib/financials";
import {
  getFinancialTrace, getTraceTrialBalances, type FinancialTrace, type TraceTrialBalance,
} from "@/lib/financialTrace";

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm";
const buttonClass = "rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50";
const secondaryClass = "rounded-lg border px-3 py-2 text-sm disabled:opacity-50";

function TraceContent() {
  const parameters = useSearchParams();
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [engagementId, setEngagementId] = useState(parameters.get("engagement") || "");
  const [tbId, setTbId] = useState(parameters.get("trial_balance") || "");
  const [accountId, setAccountId] = useState(parameters.get("account") || "");
  const [balances, setBalances] = useState<TraceTrialBalance[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [trace, setTrace] = useState<FinancialTrace | null>(null);
  const [ledgerOffset, setLedgerOffset] = useState(0);
  const [adjustmentOffset, setAdjustmentOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tracing, setTracing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getEngagements().then((data) => {
      if (!active) return;
      setEngagements(data);
      if (!parameters.get("engagement") && data.length) setEngagementId(String(data[0].id));
      if (!data.length) setLoading(false);
    }, (err: unknown) => {
      if (active) {
        setError(err instanceof Error ? err.message : "Could not load engagements.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [parameters]);

  useEffect(() => {
    if (!engagementId) return;
    let active = true;
    Promise.all([getTraceTrialBalances(Number(engagementId)), getChartOfAccounts(Number(engagementId))]).then(
      ([trialBalances, chart]) => {
        if (!active) return;
        setBalances(trialBalances); setAccounts(chart); setLoading(false);
      }, (err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Could not load financial records.");
          setLoading(false);
        }
      },
    );
    return () => { active = false; };
  }, [engagementId]);

  useEffect(() => {
    if (!tbId || !accountId || loading) return;
    let active = true;
    getFinancialTrace(Number(tbId), Number(accountId), ledgerOffset, adjustmentOffset).then(
      (data) => { if (active) { setTrace(data); setTracing(false); } },
      (err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Could not load the financial trace.");
          setTrace(null); setTracing(false);
        }
      },
    );
    return () => { active = false; };
  }, [tbId, accountId, loading, ledgerOffset, adjustmentOffset, refresh]);

  function resetTrace() {
    setTrace(null); setLedgerOffset(0); setAdjustmentOffset(0); setError(""); setTracing(false);
  }
  function exportTrace() {
    if (!trace) return;
    const blob = new Blob([JSON.stringify({
      exported_at: new Date().toISOString(), scope: "Current displayed pages; totals cover all scoped records.", ...trace,
    }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `audit-trace-tb-${trace.trial_balance.id}-account-${trace.account.id}.json`;
    link.click(); URL.revokeObjectURL(url);
  }
  const evidenceTargets: EvidenceTarget[] = trace ? [
    { target_kind: "account_trace", target_id: trace.trial_balance.id, selector: trace.account.id,
      label: `Account trace: ${trace.account.code} - ${trace.account.name}` },
    ...trace.adjustments.rows.map((row): EvidenceTarget => ({
      target_kind: "adjustment", target_id: row.id, selector: -1, label: `Adjustment: ${row.number} (#${row.id})`,
    })),
    ...trace.ledger.rows.flatMap((row): EvidenceTarget[] => [
      { target_kind: "ledger", target_id: row.id, selector: -1, label: `Ledger #${row.id}: ${row.description}` },
      ...(row.journal ? [
        { target_kind: "journal" as const, target_id: row.journal.id, selector: -1, label: `Journal: ${row.journal.entry_number}` },
        ...row.journal.sources.map((source): EvidenceTarget => ({
          target_kind: source.evidence_target_kind, target_id: source.id, selector: -1,
          label: `Source ${source.kind} #${source.id}: ${source.label}`,
        })),
      ] : []),
    ]),
    ...trace.lead_schedules.flatMap((lead): EvidenceTarget[] => [
      { target_kind: "lead_schedule", target_id: lead.id, selector: -1, label: `Lead schedule: ${lead.name}` },
      ...lead.support.map((detail): EvidenceTarget => ({
        target_kind: "supporting_detail", target_id: detail.id, selector: -1, label: `Support #${detail.id}: ${detail.description}`,
      })),
    ]),
  ] : [];

  return <main className="space-y-5 p-6">
    <header>
      <Link href="/financials" className="text-sm text-blue-700">Back to Financials</Link>
      <h1 className="mt-2 text-2xl font-semibold">Financial Audit Trace</h1>
      <p className="mt-2 text-sm text-slate-600">Follow an adjusted trial-balance account through audit adjustments,
        lead support, candidate ledger activity, verified journal provenance and explicitly linked source records.</p>
    </header>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    <div className="grid gap-3 md:grid-cols-3">
      <label className="text-sm">Engagement<select className={inputClass} value={engagementId} onChange={(event) => {
        setEngagementId(event.target.value); setTbId(""); setAccountId(""); setAccounts([]); setBalances([]);
        setLoading(Boolean(event.target.value)); resetTrace();
      }}>
        <option value="">Select engagement</option>{engagements.map((item) =>
          <option key={item.id} value={item.id}>{item.engagement_code || item.title}</option>)}
      </select></label>
      <label className="text-sm">Trial balance<select className={inputClass} value={tbId} disabled={loading}
        onChange={(event) => { setTbId(event.target.value); resetTrace(); setTracing(Boolean(event.target.value && accountId)); }}>
        <option value="">Select trial balance</option>{balances.map((item) =>
          <option key={item.id} value={item.id}>TB #{item.id}: {item.period_start} - {item.period_end} ({item.currency})</option>)}
      </select></label>
      <label className="text-sm">Account<select className={inputClass} value={accountId} disabled={loading}
        onChange={(event) => { setAccountId(event.target.value); resetTrace(); setTracing(Boolean(event.target.value && tbId)); }}>
        <option value="">Select account</option>{accounts.map((item) =>
          <option key={item.id} value={item.id}>{item.account_code} - {item.account_name}</option>)}
      </select></label>
    </div>
    <div className="flex gap-3">
      <button className={buttonClass} disabled={loading || tracing || !tbId || !accountId} onClick={() => {
        setError(""); setTracing(true); setRefresh((value) => value + 1);
      }}>Refresh trace</button>
      <button className={secondaryClass} disabled={!trace || tracing} onClick={exportTrace}>Export displayed trace (JSON)</button>
    </div>
    {(loading || tracing) && <p role="status">Loading financial trace...</p>}
    {!loading && !tbId && <p className="text-sm">Select a trial balance and account. Accounts absent from both its TB and adjustments have no trace.</p>}
    {trace && <>
      <FinancialEvidencePanel key={`${trace.trial_balance.id}:${trace.account.id}`}
        engagement={trace.trial_balance.engagement} targets={evidenceTargets} />
      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">{trace.account.code} - {trace.account.name}</h2>
        <p className="mt-2 text-sm">{trace.account.type}; statement classification: {trace.account.financial_statement_section || "Not mapped"}.
          TB #{trace.trial_balance.id}, {trace.trial_balance.period_start} - {trace.trial_balance.period_end},
          {" "}{trace.trial_balance.currency}. Amounts below use debit-positive / credit-negative signs.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ["Original TB net", trace.calculation.original_net],
            ["Posted adjustment debits", trace.calculation.adjustment_debit],
            ["Posted adjustment credits (subtract)", trace.calculation.adjustment_credit],
            ["Adjusted TB net", trace.calculation.adjusted_net],
          ].map(([label, value]) => <div className="rounded-lg bg-slate-50 p-3" key={label}>
            <p className="text-sm text-slate-600">{label}</p><p className="mt-1 font-mono font-semibold">{value}</p>
          </div>)}
        </div>
        <Link href={`/financials/adjusted-trial-balance?trial_balance=${trace.trial_balance.id}`}
          className="mt-3 inline-block text-sm text-blue-700">Open adjusted trial balance</Link>
      </section>
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-semibold">Trace boundaries and gaps</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{trace.warnings.map((warning) =>
          <li key={warning}>{warning}</li>)}</ul>
      </section>
      <section className="overflow-x-auto rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Audit adjustment contributions ({trace.adjustments.count})</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead><tr className="border-b"><th className="p-2">Adjustment</th><th>Status</th><th>Side</th><th>Amount</th><th>Included in adjusted TB</th></tr></thead>
          <tbody>{trace.adjustments.rows.map((row) => <tr key={row.id} className="border-b">
            <td className="p-2"><Link className="text-blue-700" href="/financials/adjustments">{row.number} (#{row.id})</Link>
              <p>{row.description}</p></td><td>{row.status}</td><td>{row.side}</td><td className="font-mono">{row.amount}</td>
            <td>{row.included ? "Yes" : "No"}</td>
          </tr>)}</tbody>
        </table>
        {!trace.adjustments.count && <p className="mt-3 text-sm">No linked audit adjustments.</p>}
        <div className="mt-3 flex items-center gap-3">
          <button className={secondaryClass} disabled={tracing || !adjustmentOffset} onClick={() => {
            setTracing(true); setAdjustmentOffset(Math.max(0, adjustmentOffset - trace.adjustments.page_size));
          }}>Previous adjustments</button>
          <span className="text-sm">Showing {trace.adjustments.rows.length} of {trace.adjustments.count}</span>
          <button className={secondaryClass} disabled={tracing || trace.adjustments.next_offset === null} onClick={() => {
            setTracing(true); setAdjustmentOffset(trace.adjustments.next_offset!);
          }}>Next adjustments</button>
        </div>
      </section>
      <section className="space-y-3 rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Candidate ledger reconciliation and provenance</h2>
        <p className="text-sm">Posted activity: {trace.ledger_scope.date_from} - {trace.ledger_scope.date_to}.
          {trace.ledger_scope.includes_opening ? " Includes configured opening balances." : " Period activity only."}
          {" "}Currency {trace.ledger_scope.currency_confirmed ? "confirmed against fixed base currency" : "not confirmed"}.</p>
        <p className="text-sm">Candidate ledger net: <strong>{trace.ledger_scope.net}</strong>.
          Original TB less candidate ledger: <strong>{trace.ledger_scope.difference_to_original_tb}</strong>.
          Missing journal provenance: <strong>{trace.ledger_scope.missing_provenance_count}</strong>.</p>
        {trace.ledger.rows.map((row) => <article className="space-y-2 rounded-lg border p-3 text-sm" key={row.id}>
          <p className="font-medium">GL #{row.id} - {row.transaction_date} - {row.reference || "No reference"}</p>
          <p>{row.description}</p><p>Debit: {row.debit}; credit: {row.credit}; source: {row.source}.</p>
          <p className={row.provenance === "verified" ? "text-green-700" : "text-amber-800"}>
            Journal-line provenance: {row.provenance}.
          </p>
          {row.journal ? <>
            <p><Link className="text-blue-700" href="/financials/journal-entries">Journal {row.journal.entry_number} (#{row.journal.id})</Link>
              {" "} / line #{row.journal.journal_line} / {row.journal.status}</p>
            <p>{row.journal.description}</p>
            <p>Preparer: {row.journal.created_by || "Not recorded"}; approver: {row.journal.approved_by || "Not recorded"}.
              {" "}Approval time: {row.journal.approved_at || "Not recorded"}.</p>
            {row.journal.sources.length ? <ul className="list-disc pl-5">{row.journal.sources.map((source) =>
              <li key={`${source.kind}-${source.id}`}><Link className="text-blue-700" href={source.path}>
                {source.kind}: {source.label} (source #{source.id})</Link> - explicit journal link</li>)}</ul>
              : <p className="text-slate-600">No explicitly linked document/payment/asset/inventory source. No source is inferred from reference text.</p>}
          </> : <p className="text-slate-600">No usable linked journal. This may be a manual/imported or legacy ledger entry.</p>}
        </article>)}
        {!trace.ledger.count && <p className="text-sm">No posted ledger candidates in this scope.</p>}
        <div className="flex items-center gap-3">
          <button className={secondaryClass} disabled={tracing || !ledgerOffset} onClick={() => {
            setTracing(true); setLedgerOffset(Math.max(0, ledgerOffset - trace.ledger.page_size));
          }}>Previous ledger page</button>
          <span className="text-sm">Showing {trace.ledger.rows.length} of {trace.ledger.count} (offset {trace.ledger.offset})</span>
          <button className={secondaryClass} disabled={tracing || trace.ledger.next_offset === null} onClick={() => {
            setTracing(true); setLedgerOffset(trace.ledger.next_offset!);
          }}>Next ledger page</button>
        </div>
      </section>
      <section className="space-y-4 rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Lead schedules, support and recorded conclusions</h2>
        {!trace.lead_schedules.length && <p className="text-sm">No lead schedule explicitly linked to this trial balance/account.</p>}
        {trace.lead_schedules.map((lead) => <article key={lead.id} className="space-y-2 rounded-lg border p-3 text-sm">
          <Link className="font-medium text-blue-700" href={`/financials/lead-schedules/${lead.id}`}>
            {lead.name} (#{lead.id})</Link>
          <p>Reference: {lead.reference || "None"}; status: {lead.status}.</p>
          <p>Stored final balance: {lead.adjusted_balance}; difference to current adjusted TB: {lead.difference_to_current_adjusted_tb}.</p>
          <p>Supporting total: {lead.support_total}; difference to stored lead balance: {lead.support_difference}.</p>
          <p>Auditor notes: {lead.auditor_notes || "Not recorded"}</p><p>Conclusion: {lead.conclusion || "Not recorded"}</p>
          <ul className="space-y-2">{lead.support.map((detail) => <li key={detail.id} className="rounded bg-slate-50 p-2">
            Support #{detail.id}: {detail.description}; {detail.amount}; {detail.status}.
            <p>Reference: {detail.reference || "None"}; audit notes: {detail.audit_notes || "Not recorded"}</p>
          </li>)}</ul>
          <p>Showing {lead.support.length} of {lead.support_count} supporting rows (limit {lead.support_limit}).
            Open the lead schedule for complete supporting detail.</p>
        </article>)}
      </section>
    </>}
  </main>;
}

export default function AuditTracePage() {
  return <Suspense fallback={<p className="p-6">Loading financial trace...</p>}><TraceContent /></Suspense>;
}
