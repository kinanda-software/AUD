"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { RecordsRefresh, RecordsStatus } from "@/components/audit/RecordsStatus";
import { formatCalendarDate, recordLabel } from "@/lib/dashboard";
import {
  completionChecks, filterReportingRecords, loadReportingPortfolio, reportingState,
  type ReportingRow,
} from "@/lib/reportingPortfolio";
import { useAuditRecords } from "@/lib/useAuditRecords";

export default function ReportsPage() {
  const { data, loading, error, retrievedAt, refresh } = useAuditRecords(loadReportingPortfolio);
  const [search, setSearch] = useState("");
  const [state, setState] = useState("all");
  const [selected, setSelected] = useState<number | null>(null);
  const filtered = data ? filterReportingRecords(data, search, state) : [];
  const detail: ReportingRow | undefined = data?.find((row) => row.engagement.id === selected);
  const completion = detail?.completion;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-700">IFS / Conclusion and reporting</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Reports</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Engagement reporting workspaces and saved completion-review records. This directory does not represent approved or issued auditor reports.</p>
        </div>
        <RecordsRefresh loading={loading} onRefresh={refresh} />
      </section>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <strong>Reporting status is not report approval.</strong> A completed review record or engagement does not establish an audit opinion, partner authorization, or report issuance. No report numbers, opinions, issue dates or downloads are inferred here.
      </div>
      <RecordsStatus loading={loading} error={error} hasData={data !== null} retrievedAt={retrievedAt} returnPath="/reports" />
      {data && <>
        <section aria-label="Reporting metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Engagement workspaces", value: data.length },
            { label: "No review record", value: data.filter((row) => !row.completion).length },
            { label: "Reviews not completed", value: data.filter((row) => row.completion && row.completion.status !== "Completed").length },
            { label: "Recorded completed reviews", value: data.filter((row) => row.completion?.status === "Completed").length },
          ].map(({ label, value }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-sm text-slate-600">{label}</h2><p className="mt-2 text-3xl font-bold">{value}</p></article>)}
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="space-y-4 p-5 sm:p-6">
            <h2 className="text-lg font-bold">Reporting workspace directory</h2>
            <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
              <label className="text-xs font-semibold text-slate-700">Search reporting workspaces<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Engagement code, title or client" className="mt-2 w-full rounded-lg border border-slate-400 p-3 text-sm font-normal placeholder:text-slate-500" /></label>
              <label className="text-xs font-semibold text-slate-700">Completion review status<select aria-label="Completion review status" value={state} onChange={(event) => setState(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-400 p-3 text-sm font-normal">
                <option value="all">All review states</option>
                {["No review record", "Not Started", "In Progress", "Completed"].map((value) => <option key={value} value={value}>{value}</option>)}
              </select></label>
            </div>
            <p className="text-xs text-slate-600">Showing {filtered.length} of {data.length} engagement workspaces, including completed and cancelled engagements. Metrics describe the full directory.</p>
          </div>
          {filtered.length ? <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <caption className="sr-only">Real engagements and their recorded completion reviews</caption>
              <thead className="border-y border-slate-200 bg-slate-50 text-xs text-slate-700"><tr>{["Engagement / Client", "Period end", "Engagement status", "Completion review", "Review completion date", "Actions"].map((title) => <th key={title} scope="col" className="px-5 py-3">{title}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-200">{filtered.map((row) => <tr key={row.engagement.id}>
                <td className="px-5 py-4"><Link href={`/engagements/${row.engagement.id}`} className="font-semibold text-blue-800 hover:underline">{row.engagement.engagement_code}</Link><p className="mt-1 text-xs text-slate-600">{row.engagement.client_name}</p></td>
                <td className="px-5 py-4">{formatCalendarDate(row.engagement.financial_year_end)}</td>
                <td className="px-5 py-4">{recordLabel(row.engagement.status)}</td>
                <td className="px-5 py-4"><span className={`rounded-lg px-2 py-1 text-xs font-semibold ${row.completion?.status === "Completed" ? "bg-emerald-50 text-emerald-800" : row.completion ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{reportingState(row)}</span></td>
                <td className="px-5 py-4">{formatCalendarDate(row.completion?.completion_date ?? null)}</td>
                <td className="px-5 py-4"><div className="flex flex-col gap-3">
                  <button type="button" onClick={() => setSelected(row.engagement.id)} aria-expanded={selected === row.engagement.id} aria-controls="completion-record-details" className="text-left text-xs font-semibold text-blue-800 hover:underline">View saved review<span className="sr-only"> for {row.engagement.engagement_code}</span></button>
                  <Link href={`/engagements/${row.engagement.id}/conclusion-reporting/summary-review`} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 hover:underline">Summary workpaper <ArrowRight size={14} aria-hidden="true" /><span className="sr-only"> for {row.engagement.engagement_code}</span></Link>
                </div></td>
              </tr>)}</tbody>
            </table>
          </div> : <div className="border-t border-slate-200 p-8 text-center">
            <h3 className="font-semibold">{data.length ? "No workspaces match your filters" : "No reporting workspaces recorded"}</h3>
            <p className="mt-2 text-sm text-slate-600">{data.length ? "Change your search or review-status filter." : "Create an engagement before preparing reporting work."}</p>
            {data.length ? <button type="button" onClick={() => { setSearch(""); setState("all"); }} className="mt-4 text-sm font-semibold text-blue-800 underline">Clear filters</button> : <Link href="/engagements/new" className="mt-4 inline-block text-sm font-semibold text-blue-800 underline">Create an engagement</Link>}
          </div>}
        </section>
        {detail && <section id="completion-record-details" aria-labelledby="completion-details-heading" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><h2 id="completion-details-heading" className="text-lg font-bold">Saved completion review / {detail.engagement.engagement_code}</h2><p className="mt-1 text-sm text-slate-600">{detail.engagement.client_name}</p></div><button type="button" aria-label="Close saved review details" onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"><X size={19} aria-hidden="true" /></button></div>
          {completion ? <>
            <p className="mt-5 text-sm text-slate-700">Recorded state: <strong>{completion.status}</strong> / Review completed: {formatCalendarDate(completion.completion_date)}</p>
            <p className="mt-2 text-xs leading-5 text-slate-600">These are saved checklist values, not independently verified approvals. A false value means not marked complete; applicability must be assessed by the auditor.</p>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">{completionChecks.map(({ key, label }) => <div key={key} className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-50 p-3 text-sm"><dt className="text-slate-700">{label}</dt><dd className={`font-semibold ${completion[key] ? "text-emerald-800" : "text-slate-600"}`}>{completion[key] ? "Marked complete" : "Not marked complete"}</dd></div>)}</dl>
            <h3 className="mt-5 text-sm font-bold">Recorded outstanding matters</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{completion.outstanding_matters.trim() || "No outstanding-matter text recorded; this does not establish that all matters are cleared."}</p>
            <h3 className="mt-5 text-sm font-bold">Saved final review notes</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{completion.final_review_notes.trim() || "No final review notes recorded."}</p>
            <h3 className="mt-5 text-sm font-bold">Saved completion conclusion</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{completion.completion_conclusion.trim() || "No completion conclusion recorded."}</p>
            <p className="mt-4 text-xs text-slate-600">Recorded completed-by user: {completion.completed_by_name ?? "Not recorded"}. This is a saved field, not a verified approval signature.</p>
            <p className="mt-4 text-xs text-slate-600">Last saved: <time dateTime={completion.updated_at}>{new Date(completion.updated_at).toLocaleString("en-GB")}</time></p>
          </> : <p className="mt-5 text-sm leading-6 text-slate-600">No saved completion-review record was returned for this engagement. Absence is not approval, completion or a draft report.</p>}
        </section>}
      </>}
    </div>
  );
}
