"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { RecordsRefresh, RecordsStatus } from "@/components/audit/RecordsStatus";
import { filterPortfolio, isActiveEngagement, loadAuditPortfolio } from "@/lib/auditPortfolio";
import { auditPhases, formatCalendarDate, recordLabel } from "@/lib/dashboard";
import { useAuditRecords } from "@/lib/useAuditRecords";

export default function AuditsPage() {
  const { data, loading, error, retrievedAt, refresh } = useAuditRecords(loadAuditPortfolio);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [risk, setRisk] = useState("all");
  const filtered = data ? filterPortfolio(data, search, status, risk) : [];
  const active = data?.filter(isActiveEngagement) ?? [];
  const clearFilters = () => { setSearch(""); setStatus("all"); setRisk("all"); };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-700">IFS / Audit management</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Audits</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Your recorded engagement portfolio, using the same engagement records as the dashboard. Open an engagement to access its audit workpapers.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <RecordsRefresh loading={loading} onRefresh={refresh} />
          <Link href="/engagements/new" className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"><Plus size={17} aria-hidden="true" />New audit engagement</Link>
        </div>
      </section>
      <RecordsStatus loading={loading} error={error} hasData={data !== null} retrievedAt={retrievedAt} returnPath="/audits" />
      {data && <>
        <section aria-label="Audit metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total engagements", value: data.length, description: "All recorded engagements" },
            { label: "Active engagements", value: active.length, description: "Excludes completed and cancelled" },
            { label: "High-risk active", value: active.filter((item) => item.risk_level === "high").length, description: "Recorded risk on active engagements" },
            { label: "Completed engagements", value: data.filter((item) => item.status === "completed").length, description: "Recorded completion status; not report issuance" },
          ].map(({ label, value, description }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-medium text-slate-600">{label}</h2><p className="mt-2 text-3xl font-bold">{value}</p><p className="mt-2 text-xs leading-5 text-slate-600">{description}</p>
          </article>)}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold">Audit lifecycle</h2>
          <p className="mt-1 text-sm text-slate-600">Select an engagement below before opening a stage. These counts describe recorded phases, not signed-off work.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {auditPhases.map((phase, index) => <article key={phase.key} className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold text-blue-700">PHASE 0{index + 1}</p><h3 className="mt-2 font-semibold">{phase.title}</h3><p className="mt-3 text-sm text-slate-600">{active.filter((item) => item.current_phase === phase.key).length} active engagements</p>
            </article>)}
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="space-y-4 p-5 sm:p-6">
            <h2 className="text-lg font-bold">Audit engagement directory</h2>
            <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
              <label className="text-xs font-semibold text-slate-700">Search engagements<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Code, client, title or lead auditor" className="mt-2 w-full rounded-lg border border-slate-400 p-3 text-sm font-normal placeholder:text-slate-500" /></label>
              <label className="text-xs font-semibold text-slate-700">Engagement status<select aria-label="Engagement status" value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-400 p-3 text-sm font-normal">
                <option value="all">All statuses</option>
                {Array.from(new Set(data.map((item) => item.status))).sort().map((value) => <option key={value} value={value}>{recordLabel(value)}</option>)}
              </select></label>
              <label className="text-xs font-semibold text-slate-700">Risk level<select aria-label="Risk level" value={risk} onChange={(event) => setRisk(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-400 p-3 text-sm font-normal">
                <option value="all">All risk levels</option>
                {Array.from(new Set(data.map((item) => item.risk_level))).sort().map((value) => <option key={value} value={value}>{recordLabel(value)}</option>)}
              </select></label>
            </div>
            <p className="text-xs text-slate-600">Showing {filtered.length} of {data.length} engagements. Metrics above describe the full portfolio.</p>
          </div>
          {filtered.length > 0 ? <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <caption className="sr-only">Recorded audit engagements matching the current filters</caption>
              <thead className="border-y border-slate-200 bg-slate-50 text-xs text-slate-700"><tr>{["Engagement / Client", "Type / Period end", "Status / Phase", "Risk", "Progress", "Lead auditor", "Planned end", "Action"].map((title) => <th key={title} scope="col" className="px-5 py-3">{title}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-200">{filtered.map((item) => <tr key={item.id}>
                <td className="px-5 py-4"><Link href={`/engagements/${item.id}`} className="font-semibold text-blue-800 hover:underline">{item.engagement_code}</Link><p className="mt-1 text-xs text-slate-600">{item.client_name}</p><p className="mt-1 text-xs text-slate-600">{item.title}</p></td>
                <td className="px-5 py-4">{recordLabel(item.engagement_type)}<p className="mt-1 text-xs text-slate-600">{formatCalendarDate(item.financial_year_end)}</p></td>
                <td className="px-5 py-4">{recordLabel(item.status)}<p className="mt-1 text-xs text-slate-600">{auditPhases.find((phase) => phase.key === item.current_phase)?.title ?? recordLabel(item.current_phase)}</p></td>
                <td className="px-5 py-4"><span className={`rounded-lg px-2 py-1 text-xs font-semibold ${item.risk_level === "high" ? "bg-red-50 text-red-800" : item.risk_level === "medium" ? "bg-amber-50 text-amber-800" : item.risk_level === "low" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{recordLabel(item.risk_level)}</span></td>
                <td className="px-5 py-4">{item.progress_percentage}%</td>
                <td className="px-5 py-4">{item.lead_auditor_username ?? "Unassigned"}</td>
                <td className="px-5 py-4">{formatCalendarDate(item.planned_end_date)}</td>
                <td className="px-5 py-4"><Link href={`/engagements/${item.id}`} className="inline-flex items-center gap-1 font-semibold text-blue-800 hover:underline">Open <ArrowRight size={15} aria-hidden="true" /><span className="sr-only"> {item.engagement_code}</span></Link></td>
              </tr>)}</tbody>
            </table>
          </div> : <div className="border-t border-slate-200 p-8 text-center">
            <h3 className="font-semibold">{data.length ? "No engagements match your filters" : "No audit engagements recorded"}</h3>
            <p className="mt-2 text-sm text-slate-600">{data.length ? "Change your search or clear the filters." : "Create an engagement to begin planning your audit."}</p>
            {data.length ? <button type="button" onClick={clearFilters} className="mt-4 text-sm font-semibold text-blue-800 underline">Clear filters</button> : <Link href="/engagements/new" className="mt-4 inline-block text-sm font-semibold text-blue-800 underline">Create an engagement</Link>}
          </div>}
        </section>
      </>}
    </div>
  );
}
