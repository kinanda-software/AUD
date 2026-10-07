"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/components/layout/AppLayout";
import { apiRequest, getEngagements, type Engagement } from "@/lib/api";
import { getChartOfAccounts, type ChartOfAccount } from "@/lib/financials";
import { getTraceTrialBalances, type TraceTrialBalance } from "@/lib/financialTrace";
import type { EvidencePage } from "@/lib/financialEvidence";
import { statementCSV } from "@/lib/statementExport";
import {
  approveStatementVersion, deleteStatementMapping, getStatementLines, getStatementMappings,
  getStatementVersion, getStatementVersions, previewStatements, saveStatementLine,
  saveStatementMapping, saveStatementVersion, statementGroups,
  type MappedStatementReport, type StatementAccount, type StatementGroup, type StatementLine,
  type StatementMapping, type StatementVersion, type StatementVersionSummary,
} from "@/lib/mappedStatements";

const inputClass = "mt-1 w-full rounded-lg border bg-white p-2 text-sm";
const buttonClass = "rounded-lg border px-3 py-2 text-sm disabled:opacity-50";
const blankLine = () => ({ code: "", label: "", group: "asset" as StatementGroup, note_reference: "", order: 0 });

export default function MappedStatementsPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [engagement, setEngagement] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [balances, setBalances] = useState<TraceTrialBalance[]>([]);
  const [lines, setLines] = useState<StatementLine[]>([]);
  const [mappings, setMappings] = useState<StatementMapping[]>([]);
  const [lineForm, setLineForm] = useState(blankLine);
  const [editLine, setEditLine] = useState<number | null>(null);
  const [current, setCurrent] = useState("");
  const [comparison, setComparison] = useState("");
  const [report, setReport] = useState<MappedStatementReport | null>(null);
  const [version, setVersion] = useState<StatementVersion | null>(null);
  const [history, setHistory] = useState<EvidencePage<StatementVersionSummary> | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getEngagements(), apiRequest<{ authenticated: boolean; user?: AuthUser }>("/auth/me/")]).then(
      ([data, session]) => {
        if (!active) return;
        if (!session.authenticated || !session.user) { setError("Could not verify statement user."); setLoading(false); return; }
        setEngagements(data); setUser(session.user);
        if (data.length) setEngagement(String(data[0].id)); else setLoading(false);
      }, (err: unknown) => { if (active) { setError(err instanceof Error ? err.message : "Could not load engagements."); setLoading(false); } },
    );
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!engagement) return;
    let active = true;
    Promise.all([
      getChartOfAccounts(Number(engagement)), getTraceTrialBalances(Number(engagement)),
      getStatementLines(Number(engagement)), getStatementMappings(Number(engagement)),
      getStatementVersions(Number(engagement), historyPage),
    ]).then(([chart, tbs, definitions, assignments, versions]) => {
      if (active) { setAccounts(chart); setBalances(tbs); setLines(definitions); setMappings(assignments); setHistory(versions); setLoading(false); }
    }, (err: unknown) => { if (active) { setError(err instanceof Error ? err.message : "Could not load statements."); setLoading(false); } });
    return () => { active = false; };
  }, [engagement, historyPage, refresh]);

  async function action(operation: () => Promise<void>) {
    setBusy(true); setError(""); setSuccess("");
    try { await operation(); }
    catch (err) { setError(err instanceof Error ? err.message : "Statement operation failed."); }
    finally { setBusy(false); }
  }
  function refreshMappings() {
    setReport(null); setVersion(null); setLoading(true); setRefresh((value) => value + 1);
  }
  const manager = user?.role === "manager" || user?.role === "admin";
  const preparer = user && ["staff", "auditor", "manager", "admin"].includes(user.role);
  const disabled = busy || loading;
  return <main className="space-y-5 p-6">
    <header><Link className="text-sm text-blue-700" href="/financials">Back to Financials</Link>
      <h1 className="mt-2 text-2xl font-semibold">Mapped & Comparative Statements</h1>
      <p className="mt-2 text-sm text-slate-600">Custom engagement statement lines, explicit account mappings,
        adjusted comparative reporting and independently approved saved versions.</p></header>
    {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-700">{error}</p>}
    {success && <p role="status" className="text-green-800">{success}</p>}
    <label className="block max-w-md text-sm">Engagement<select className={inputClass} value={engagement} disabled={busy}
      onChange={(event) => {
        if (event.target.value === engagement) return;
        setEngagement(event.target.value); setAccounts([]); setBalances([]); setLines([]); setMappings([]);
        setCurrent(""); setComparison(""); setReport(null); setVersion(null); setHistory(null); setHistoryPage(1);
        setLineForm(blankLine()); setEditLine(null); setName(""); setNote(""); setError(""); setSuccess("");
        setLoading(Boolean(event.target.value));
      }}>
      <option value="">Select engagement</option>{engagements.map((item) =>
        <option key={item.id} value={item.id}>{item.engagement_code || item.title}</option>)}
    </select></label>
    <button className={buttonClass} disabled={busy || !engagement} onClick={() => {
      setError(""); setLoading(true); setRefresh((value) => value + 1);
    }}>Reload configuration and history</button>
    {loading && <p role="status">Loading statement configuration...</p>}
    <section className="space-y-3 rounded-xl border bg-white p-5">
      <h2 className="font-semibold">Statement line definitions</h2>
      <p className="text-sm">Managers/admins configure lines and mappings. Note references are labels, not generated
        disclosure notes. Asset/expense amounts display debit-positive; liability/equity/revenue display credit-positive.</p>
      {manager && <form onSubmit={(event) => { event.preventDefault(); void action(async () => {
        await saveStatementLine({ ...lineForm, engagement: Number(engagement) }, editLine || undefined);
        setLineForm(blankLine()); setEditLine(null); refreshMappings(); setSuccess("Statement line saved.");
      }); }}>
        <fieldset disabled={disabled || !engagement} className="grid gap-3 md:grid-cols-3">
          <label className="text-sm">Line code<input className={inputClass} required maxLength={50} value={lineForm.code}
            onChange={(event) => setLineForm({ ...lineForm, code: event.target.value })} /></label>
          <label className="text-sm">Line label<input className={inputClass} required maxLength={200} value={lineForm.label}
            onChange={(event) => setLineForm({ ...lineForm, label: event.target.value })} /></label>
          <label className="text-sm">Statement group<select className={inputClass} value={lineForm.group}
            onChange={(event) => setLineForm({ ...lineForm, group: event.target.value as StatementGroup })}>
            {statementGroups.map((group) => <option key={group} value={group}>{group}</option>)}
          </select></label>
          <label className="text-sm">Note reference<input className={inputClass} maxLength={100} value={lineForm.note_reference}
            onChange={(event) => setLineForm({ ...lineForm, note_reference: event.target.value })} /></label>
          <label className="text-sm">Display order<input className={inputClass} type="number" min={0} required value={lineForm.order}
            onChange={(event) => setLineForm({ ...lineForm, order: Number(event.target.value) })} /></label>
          <button className={buttonClass}>{editLine ? "Update statement line" : "Add statement line"}</button>
          {editLine && <button type="button" className={buttonClass} onClick={() => {
            setEditLine(null); setLineForm(blankLine());
          }}>Cancel line edit</button>}
        </fieldset>
      </form>}
      {lines.map((line) => <div key={line.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm">
        <span>{line.code}: {line.label} - {line.group}; note {line.note_reference || "None"}; order {line.order}</span>
        {manager && <button className={buttonClass} disabled={disabled} onClick={() => {
          setEditLine(line.id); setLineForm({ code: line.code, label: line.label, group: line.group,
            note_reference: line.note_reference, order: line.order });
        }}>Edit line {line.code}</button>}
      </div>)}
    </section>
    <section className="space-y-3 rounded-xl border bg-white p-5">
      <h2 className="font-semibold">Account mappings ({accounts.length})</h2>
      <p className="text-sm">One line per account; only the same account group is allowed. Both periods use this current mapping.
        No mapping is inferred from account names or legacy statement classifications.</p>
      {accounts.map((account) => {
        const mapping = mappings.find((item) => item.account === account.id);
        return <label key={account.id} className="grid gap-2 border-b py-2 text-sm md:grid-cols-2">
          <span>{account.account_code} - {account.account_name} ({account.account_type})</span>
          <select className={inputClass} disabled={!manager || disabled} value={mapping?.line || ""} onChange={(event) => {
            const line = event.target.value;
            void action(async () => {
              if (line) await saveStatementMapping(account.id, Number(line), mapping?.id);
              else if (mapping) await deleteStatementMapping(mapping.id);
              refreshMappings(); setSuccess("Account mapping saved.");
            });
          }}>
            <option value="">Unmapped</option>{lines.filter((line) => line.group === account.account_type).map((line) =>
              <option key={line.id} value={line.id}>{line.code}: {line.label}</option>)}
          </select>
        </label>;
      })}
    </section>
    <section className="space-y-3 rounded-xl border bg-white p-5">
      <h2 className="font-semibold">Prepare a comparative report</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">Current trial balance<select className={inputClass} value={current} disabled={disabled}
          onChange={(event) => { setCurrent(event.target.value); setReport(null); setVersion(null); }}>
          <option value="">Select current TB</option>{balances.map((tb) =>
            <option key={tb.id} value={tb.id}>TB #{tb.id}: {tb.period_start} - {tb.period_end} ({tb.currency})</option>)}
        </select></label>
        <label className="text-sm">Comparative trial balance<select className={inputClass} value={comparison} disabled={disabled}
          onChange={(event) => { setComparison(event.target.value); setReport(null); setVersion(null); }}>
          <option value="">No comparative column</option>{balances.filter((tb) => String(tb.id) !== current).map((tb) =>
            <option key={tb.id} value={tb.id}>TB #{tb.id}: {tb.period_start} - {tb.period_end} ({tb.currency})</option>)}
        </select></label>
      </div>
      <button className={buttonClass} disabled={disabled || !current} onClick={() => void action(async () => {
        setReport(null); setVersion(null);
        setReport(await previewStatements(Number(current), comparison ? Number(comparison) : undefined)); setVersion(null);
      })}>Preview mapped statements</button>
      {preparer && <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
        event.preventDefault(); void action(async () => {
          const data = await saveStatementVersion(Number(current), comparison ? Number(comparison) : undefined, name);
          setVersion(data); setReport(data.results); setNote(""); setHistoryPage(1);
          setLoading(true); setRefresh((value) => value + 1); setSuccess(`Statement version #${data.id} saved.`);
        });
      }}>
        <label className="text-sm">Saved version name<input className={inputClass} required maxLength={200} value={name}
          disabled={disabled} onChange={(event) => setName(event.target.value)} /></label>
        <button className={buttonClass} disabled={disabled || !current || !name.trim()}>Save immutable statement version</button>
      </form>}
    </section>
    <section className="space-y-3 rounded-xl border bg-white p-5">
      <h2 className="font-semibold">Saved statement versions ({history?.count || 0})</h2>
      {history?.results.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm">
        <span>#{item.id}: {item.name}; {item.created_at}; {item.approval ? "Approved" : "Awaiting review"}</span>
        <button className={buttonClass} disabled={disabled} onClick={() => void action(async () => {
          const data = await getStatementVersion(item.id); setVersion(data); setReport(data.results); setNote("");
        })}>Open saved version #{item.id}</button>
      </div>)}
      <div className="flex gap-3">
        <button className={buttonClass} disabled={disabled || !history?.previous} onClick={() => {
          setLoading(true); setHistoryPage((value) => value - 1);
        }}>Previous versions</button>
        <button className={buttonClass} disabled={disabled || !history?.next} onClick={() => {
          setLoading(true); setHistoryPage((value) => value + 1);
        }}>Next versions</button>
      </div>
    </section>
    {report && <ReportDisplay report={report} version={version} />}
    {version && <section className="space-y-3 rounded-xl border bg-white p-5">
      <h2 className="font-semibold">Saved version review</h2>
      <p className="break-all text-xs">Version #{version.id}: {version.name}; SHA-256: {version.fingerprint}</p>
      {version.approval ? <p className="text-sm">Approved by {version.approval.actor_name} at {version.approval.created_at}.
        Note: {version.approval.note}. This approval applies only to this saved version.</p>
        : <p className="text-sm">Approval requires complete mappings, nonempty balanced TBs, and a different manager/admin
          from the preparer. Approval is statement-version review, not an audit opinion.</p>}
      {manager && !version.approval && <form onSubmit={(event) => {
        event.preventDefault(); void action(async () => {
          const data = await approveStatementVersion(version.id, note); setVersion(data);
          setLoading(true); setRefresh((value) => value + 1); setSuccess("Statement version independently approved.");
        });
      }}>
        <label className="block text-sm">Statement review rationale<textarea className={inputClass} required maxLength={5000}
          value={note} disabled={disabled} onChange={(event) => setNote(event.target.value)} /></label>
        <button className={`${buttonClass} mt-3`} disabled={disabled || !note.trim() || !version.results.ready_for_approval
          || version.preparer_identifier === user?.id}>Approve saved statement version</button>
      </form>}
    </section>}
  </main>;
}

function ReportDisplay({ report, version }: { report: MappedStatementReport; version: StatementVersion | null }) {
  function download(format: "json" | "csv") {
    const content = format === "json" ? JSON.stringify(version || report, null, 2) : statementCSV(report, version);
    const url = URL.createObjectURL(new Blob([content], { type: format === "json" ? "application/json" : "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url;
    anchor.download = `mapped-statements-${version ? `version-${version.id}` : `preview-tb-${report.current_tb.id}`}.${format}`;
    anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function accountRows(accounts: StatementAccount[]) {
    return <table className="mt-2 w-full text-left text-xs"><thead><tr className="border-b">
      <th>Account</th><th>Original net</th><th>Posted adjustment net</th><th>Adjusted net</th><th>Prior adjusted net</th><th>Live trace</th>
    </tr></thead><tbody>{accounts.map((account) => <tr key={account.id} className="border-b">
      <td className="py-2">{account.code} - {account.name}</td><td>{account.current.original}</td><td>{account.current.adjustment}</td>
      <td>{account.current.adjusted}</td><td>{account.comparison?.adjusted ?? "Not selected"}</td>
      <td>{([["current", report.current_tb], ["comparison", report.comparison_tb]] as const).map(([period, tb]) =>
        tb && account[period]?.present && <Link key={period} className="mr-2 text-blue-700"
          href={`/financials/audit-trace?engagement=${tb.engagement}&trial_balance=${tb.id}&account=${account.id}`}>
          {period} (live)</Link>)}</td>
    </tr>)}</tbody></table>;
  }
  return <section className="space-y-4 rounded-xl border bg-white p-5">
    <h2 className="font-semibold">{version ? `Saved statement version #${version.id}` : "Live mapped preview"} - {report.current_tb.currency}</h2>
    <p className="text-sm">Current: {report.current_tb.period_start} - {report.current_tb.period_end}; comparative:
      {" "}{report.comparison_tb ? `${report.comparison_tb.period_start} - ${report.comparison_tb.period_end}` : "Not selected"}.</p>
    <p className="text-sm">{report.sign_convention}</p>
    <p className={report.ready_for_approval ? "text-green-700" : "text-amber-800"}>
      {report.ready_for_approval ? "Mapping and balance checks passed; eligible for independent version review." : "Not eligible for approval: inspect unmapped, empty or unbalanced data."}</p>
    <ul className="list-disc pl-5 text-sm text-amber-800">{report.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
    <div className="flex gap-3"><button className={buttonClass} onClick={() => download("json")}>Export report JSON</button>
      <button className={buttonClass} onClick={() => download("csv")}>Export statement lines CSV</button></div>
    <p className="text-xs">Exports exclude evidence files and audit sign-off; live trace may differ from saved balances.
      CSV contains mapped lines, totals and unmapped balances, not full statutory statements.</p>
    {["Statement of Financial Position", "Profit or Loss"].map((statement, index) =>
      <section key={statement} className="space-y-3">
        <h3 className="font-semibold">{statement}</h3>
        {report.lines.filter((line) => index === 0 ? ["asset", "liability", "equity"].includes(line.group) : ["revenue", "expense"].includes(line.group))
          .map((line) => <details key={line.id} className="rounded border p-3 text-sm">
            <summary className="cursor-pointer">{line.code}: {line.label} ({line.group}) - note {line.note_reference || "None"};
              current {line.current}; comparative {line.comparison ?? "Not selected"}</summary>
            <div className="overflow-x-auto">{accountRows(line.accounts)}</div>
          </details>)}
      </section>)}
    {(["current", "comparison"] as const).map((period) => {
      const checks = report.checks[period];
      return checks && <section key={period} className="rounded bg-slate-50 p-3 text-sm">
        <h3 className="font-medium">{period} full-TB reconciliation (including unmapped accounts)</h3>
        <p>{Object.entries(checks.groups).map(([group, amount]) => `${group}: ${amount}`).join("; ")}.</p>
        <p>Profit: {checks.profit}; assets less liabilities, equity and profit: {checks.position_difference};
          adjusted TB difference: {checks.tb_difference}.</p>
        <p>Mapped signed net: {checks.mapped_net}; unmapped signed net: {checks.unmapped_net};
          posted adjustments: {checks.posted_adjustment_count}.</p>
      </section>;
    })}
    <h3 className="font-medium">Unmapped or invalidly mapped accounts ({report.unmapped.length})</h3>
    <div className="overflow-x-auto">{accountRows(report.unmapped)}</div>
  </section>;
}
