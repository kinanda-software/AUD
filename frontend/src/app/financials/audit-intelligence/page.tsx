"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import FinancialEvidencePanel from "@/components/financials/FinancialEvidencePanel";
import FindingReviewPanel from "@/components/financials/FindingReviewPanel";
import type { EvidenceTarget } from "@/lib/financialEvidence";
import { getEngagements, type Engagement } from "@/lib/api";
import {
  createIntelligenceRun, getIntelligenceRun, getIntelligenceRuns, journalRules,
  type IntelligenceRun, type JournalRule, type RunInput, type RunList,
} from "@/lib/auditIntelligence";

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm";
const buttonClass = "rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50";
const secondaryClass = "rounded-lg border px-3 py-2 text-sm disabled:opacity-50";
const displayPageSize = 25;
const rules = Object.keys(journalRules) as JournalRule[];

function blankRun(): Omit<RunInput, "engagement"> {
  return {
    name: "", date_from: `${new Date().getFullYear()}-01-01`, date_to: new Date().toISOString().slice(0, 10),
    source: "all", sampling_method: "seeded_random", sample_size: 10,
    seed: "audit-sample-1", amount_threshold: "100000.00", round_increment: "1000.00", rules: [...rules],
  };
}

export default function AuditIntelligencePage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [engagementId, setEngagementId] = useState("");
  const [form, setForm] = useState(blankRun);
  const [history, setHistory] = useState<RunList | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [run, setRun] = useState<IntelligenceRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [panel, setPanel] = useState<"sample" | "findings" | "population">("sample");
  const [resultPage, setResultPage] = useState(0);

  useEffect(() => {
    let active = true;
    getEngagements().then((data) => {
      if (!active) return;
      setEngagements(data);
      if (data.length) setEngagementId(String(data[0].id));
      else setLoading(false);
    }, (err: unknown) => {
      if (active) {
        setError(err instanceof Error ? err.message : "Could not load engagements.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!engagementId) return;
    let active = true;
    getIntelligenceRuns(Number(engagementId), historyPage).then((data) => {
      if (active) { setHistory(data); setLoading(false); }
    }, (err: unknown) => {
      if (active) {
        setError(err instanceof Error ? err.message : "Could not load saved runs.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [engagementId, historyPage, refresh]);

  async function createRun() {
    setBusy(true); setError(""); setSuccess("");
    try {
      const data = await createIntelligenceRun({ ...form, engagement: Number(engagementId) });
      setRun(data); setPanel("sample"); setResultPage(0); setHistoryPage(1);
      setSuccess(`Run #${data.id} saved. Results are review candidates, not audit conclusions.`);
      setLoading(true); setRefresh((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the run.");
    } finally { setBusy(false); }
  }

  async function openRun(id: number) {
    setBusy(true); setError(""); setSuccess("");
    try {
      const data = await getIntelligenceRun(id);
      setRun(data); setPanel("sample"); setResultPage(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the saved run.");
    } finally { setBusy(false); }
  }

  function exportRun() {
    if (!run) return;
    const blob = new Blob([JSON.stringify(run, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `audit-intelligence-run-${run.id}.json`;
    link.click(); URL.revokeObjectURL(url);
  }

  const selectedIds = new Set(run?.results.sampled_journal_ids || []);
  const populationById = new Map(run?.results.population.map((journal) => [journal.id, journal]) || []);
  const sample = run?.results.sampled_journal_ids.flatMap((id) => {
    const journal = populationById.get(id);
    return journal ? [journal] : [];
  }) || [];
  const journalRows = panel === "sample" ? sample : run?.results.population || [];
  const rowCount = panel === "findings" ? run?.results.findings.length || 0 : journalRows.length;
  const start = resultPage * displayPageSize;
  const disabled = busy || loading;
  const evidenceTargets: EvidenceTarget[] = run ? [
    { target_kind: "run", target_id: run.id, selector: -1, label: `Saved run #${run.id}: ${run.name}` },
    ...(panel === "findings"
      ? run.results.findings.slice(start, start + displayPageSize).map((finding, index): EvidenceTarget => ({
        target_kind: "run_finding", target_id: run.id, selector: start + index,
        label: `Finding #${start + index + 1}: ${journalRules[finding.rule]} (${finding.journal_ids.join(", ")})`,
      }))
      : journalRows.slice(start, start + displayPageSize).map((journal): EvidenceTarget => ({
        target_kind: "journal", target_id: journal.id, selector: -1,
        label: `Live journal #${journal.id}: ${journal.entry_number} (not the saved journal snapshot)`,
      }))),
  ] : [];

  return <main className="space-y-5 p-6">
    <header>
      <Link href="/financials" className="text-sm text-blue-700">Back to Financials</Link>
      <h1 className="mt-2 text-2xl font-semibold">Audit Intelligence</h1>
      <p className="mt-2 text-sm text-slate-600">Save immutable journal-screening runs and reproducible samples,
        preserving the selected scope, rules, seed and population snapshots.</p>
    </header>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {success && <p role="status" className="rounded-lg bg-green-50 p-3 text-green-800">{success}</p>}
    <label className="block max-w-md text-sm">Engagement
      <select className={inputClass} disabled={busy} value={engagementId} onChange={(event) => {
        setEngagementId(event.target.value); setHistoryPage(1); setHistory(null); setRun(null);
        setLoading(Boolean(event.target.value)); setError(""); setSuccess(""); setResultPage(0);
      }}>
        <option value="">Select engagement</option>{engagements.map((engagement) =>
          <option key={engagement.id} value={engagement.id}>{engagement.engagement_code || engagement.title}</option>)}
      </select>
    </label>
    {loading && <p role="status">Loading saved runs...</p>}
    <section className="rounded-xl border bg-white p-5">
      <h2 className="font-semibold">Create a journal-testing and sampling run</h2>
      <p className="mt-2 text-sm text-slate-600">Only posted journal headers and their lines are included.
        Standalone ledger imports are not part of this population. All enabled rules screen the full population,
        not only the sample. Runs are limited to 10,000 journals and 50,000 lines; larger scopes must be narrowed.</p>
      <form onSubmit={(event) => { event.preventDefault(); void createRun(); }}>
        <fieldset disabled={disabled || !engagementId} className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm">Run name<input className={inputClass} required maxLength={200} value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="text-sm">From transaction date<input className={inputClass} type="date" required value={form.date_from}
            onChange={(event) => setForm({ ...form, date_from: event.target.value })} /></label>
          <label className="text-sm">To transaction date<input className={inputClass} type="date" required min={form.date_from}
            value={form.date_to} onChange={(event) => setForm({ ...form, date_to: event.target.value })} /></label>
          <label className="text-sm">Journal source<select className={inputClass} value={form.source}
            onChange={(event) => setForm({ ...form, source: event.target.value as RunInput["source"] })}>
            <option value="all">All sources</option><option value="manual">Manual</option>
            <option value="import">Import</option><option value="adjustment">Adjustment</option>
            <option value="other">Other / generated source journals</option>
          </select></label>
          <label className="text-sm">Sampling method<select className={inputClass} value={form.sampling_method}
            onChange={(event) => setForm({ ...form, sampling_method: event.target.value as RunInput["sampling_method"] })}>
            <option value="seeded_random">Seeded random (hash ranked, no replacement)</option>
            <option value="high_value">High-value targeted (largest total debit)</option>
          </select></label>
          <label className="text-sm">Sample size<input className={inputClass} type="number" required min={1} max={1000}
            value={form.sample_size} onChange={(event) => setForm({ ...form, sample_size: Number(event.target.value) })} /></label>
          <label className="text-sm">Reproducibility seed<input className={inputClass} required maxLength={100} value={form.seed}
            onChange={(event) => setForm({ ...form, seed: event.target.value })} /></label>
          <label className="text-sm">Large / round-amount threshold<input className={inputClass} type="number" required min="0.01" step="0.01"
            value={form.amount_threshold} onChange={(event) => setForm({ ...form, amount_threshold: event.target.value })} /></label>
          <label className="text-sm">Round-amount increment<input className={inputClass} type="number" required min="0.01" step="0.01"
            value={form.round_increment} onChange={(event) => setForm({ ...form, round_increment: event.target.value })} /></label>
          <div className="md:col-span-3">
            <p className="font-medium">Journal screening rules (select at least one)</p>
            <div className="mt-2 grid gap-2 md:grid-cols-3">{rules.map((rule) =>
              <label className="flex items-center gap-2 text-sm" key={rule}>
                <input type="checkbox" checked={form.rules.includes(rule)} onChange={(event) => setForm({
                  ...form, rules: event.target.checked ? [...form.rules, rule] : form.rules.filter((value) => value !== rule),
                })} />{journalRules[rule]}
              </label>)}</div>
          </div>
          <p className="text-sm text-slate-600 md:col-span-3">Thresholds and sample size are auditor inputs, not automatically computed
            materiality or statistical confidence. Missing approval metadata does not prove approval was required historically.
            Weekend means Saturday/Sunday transaction dates. High-value selection is non-statistical; its seed is recorded but not used.</p>
          <div><button className={buttonClass} type="submit" disabled={!form.rules.length}>Save screening run</button></div>
        </fieldset>
      </form>
    </section>
    <section className="overflow-x-auto rounded-xl border bg-white p-5">
      <h2 className="font-semibold">Saved runs ({history?.count || 0})</h2>
      <table className="mt-3 w-full text-left text-sm">
        <thead><tr className="border-b"><th className="p-2">Run</th><th>Created</th><th>Population</th><th>Sample</th><th>Findings</th><th /></tr></thead>
        <tbody>{history?.results.map((item) => <tr key={item.id} className="border-b">
          <td className="p-2">#{item.id} - {item.name}</td><td>{item.created_at}</td><td>{item.population_count}</td>
          <td>{item.sample_count}</td><td>{item.finding_count}</td>
          <td className="p-2"><button className={secondaryClass} disabled={disabled} onClick={() => void openRun(item.id)}>Open snapshot</button></td>
        </tr>)}</tbody>
      </table>
      {!loading && !history?.count && <p className="mt-3 text-sm">No saved runs in this engagement.</p>}
      <div className="mt-3 flex gap-3">
        <button className={secondaryClass} disabled={disabled || !history?.previous} onClick={() => {
          setLoading(true); setHistoryPage((value) => value - 1);
        }}>Previous runs</button>
        <button className={secondaryClass} disabled={disabled || !history?.next} onClick={() => {
          setLoading(true); setHistoryPage((value) => value + 1);
        }}>Next runs</button>
      </div>
    </section>
    {run && <section className="space-y-4 rounded-xl border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Saved snapshot #{run.id}: {run.name}</h2>
        <button className={secondaryClass} onClick={exportRun}>Export full saved run (JSON)</button>
      </div>
      <p className="text-sm">Algorithm: {run.algorithm_version}; saved: {run.created_at}.
        Scope: {run.parameters.date_from} - {run.parameters.date_to}, {run.parameters.source} sources.
        Currency: {run.parameters.base_currency || "Unconfirmed"}.</p>
      <p className="text-sm">Method: {run.parameters.sampling_method}; seed: {run.parameters.seed};
        threshold: {run.parameters.amount_threshold}; increment: {run.parameters.round_increment}.
        Rules: {run.parameters.rules.map((rule) => journalRules[rule]).join(", ")}.</p>
      <p className="break-all font-mono text-xs">Population SHA-256: {run.population_fingerprint}</p>
      <p className="text-sm">Population total debit: <strong>{run.results.population_total_debit}</strong>;
        sample total debit: <strong>{run.results.sample_total_debit}</strong>.
        These journal totals are not net ledger balances.</p>
      <ul className="list-disc space-y-1 rounded-lg bg-amber-50 py-3 pl-8 pr-3 text-sm">
        {run.results.warnings.map((warning) => <li key={warning}>{warning}</li>)}
      </ul>
      <nav className="flex flex-wrap gap-2" aria-label="Saved run results">
        {(["sample", "findings", "population"] as const).map((tab) => <button key={tab}
          className={panel === tab ? buttonClass : secondaryClass} onClick={() => { setPanel(tab); setResultPage(0); }}>
          {tab === "sample" ? `Sample (${run.sample_count})` : tab === "findings"
            ? `Screening findings (${run.finding_count})` : `Full population (${run.population_count})`}
        </button>)}
      </nav>
      <FinancialEvidencePanel key={run.id} engagement={run.engagement} targets={evidenceTargets} />
      {panel === "findings" && run.finding_count > 0 &&
        <FindingReviewPanel key={`${run.id}:${start}`} run={run} offset={start} />}
      {panel === "findings" ? <div className="space-y-3">
        {run.results.findings.slice(start, start + displayPageSize).map((finding, index) =>
          <article key={`${finding.rule}-${start + index}`} className="rounded-lg border p-3 text-sm">
            <h3 className="font-medium">Finding #{start + index + 1}: {journalRules[finding.rule]}</h3><p>{finding.message}</p>
            <p>Snapshot journals: {finding.journal_ids.map((id) => populationById.get(id)?.entry_number || `#${id}`).join(", ")}</p>
            <p>{finding.journal_ids.some((id) => selectedIds.has(id)) ? "Includes sampled journals." : "Not part of the selected sample."}</p>
          </article>)}
        {!run.finding_count && <p className="text-sm">No candidates under the selected rules. This is not an assurance conclusion.</p>}
      </div> : <div className="space-y-3">
        {journalRows.slice(start, start + displayPageSize).map((journal) => <details key={journal.id} className="rounded-lg border p-3 text-sm">
          <summary className="cursor-pointer font-medium">{journal.entry_number} (#{journal.id}) - {journal.transaction_date}
            {" "} - debit {journal.total_debit} / credit {journal.total_credit}
            {selectedIds.has(journal.id) ? " - Sampled" : ""}</summary>
          <div className="mt-3 space-y-2">
            <p>{journal.description}; reference: {journal.reference || "None"}; source: {journal.source}.</p>
            <p>Preparer: {journal.preparer || "Not recorded"}; approver: {journal.approver || "Not recorded"};
              approval time: {journal.approved_at || "Not recorded"}; reversal of: {journal.reversal_of || "None"}.</p>
            <Link className="text-blue-700" href="/financials/journal-entries">Open live Journal Entries (may differ from snapshot)</Link>
            <div className="overflow-x-auto"><table className="w-full text-left">
              <thead><tr className="border-b"><th className="p-2">Snapshot account</th><th>Debit</th><th>Credit</th><th>Ledger provenance</th><th>Dimensions</th></tr></thead>
              <tbody>{journal.lines.map((line) => <tr className="border-b" key={line.id}>
                <td className="p-2">{line.account_code} - {line.account_name} (line #{line.id})</td><td>{line.debit}</td><td>{line.credit}</td>
                <td>{line.ledger_id ? `GL #${line.ledger_id}` : "Missing"} - {line.ledger_consistent ? "Consistent" : "Unverified/inconsistent"}</td>
                <td>{line.dimensions.map((dimension) => `${dimension.type}: ${dimension.name}`).join(", ") || "Unsegmented"}</td>
              </tr>)}</tbody>
            </table></div>
          </div>
        </details>)}
      </div>}
      <div className="flex items-center gap-3">
        <button className={secondaryClass} disabled={!resultPage} onClick={() => setResultPage((value) => value - 1)}>Previous results</button>
        <span className="text-sm">{rowCount ? start + 1 : 0} - {Math.min(start + displayPageSize, rowCount)} of {rowCount}</span>
        <button className={secondaryClass} disabled={start + displayPageSize >= rowCount}
          onClick={() => setResultPage((value) => value + 1)}>Next results</button>
      </div>
    </section>}
  </main>;
}
