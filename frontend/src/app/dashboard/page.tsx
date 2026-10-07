"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight, BriefcaseBusiness, CalendarDays, CheckCircle2,
  ClipboardCheck, Plus, RefreshCw, ShieldAlert, Users,
} from "lucide-react";
import { useAuthUser } from "@/components/layout/AuthContext";
import {
  deadlineLabel, daysUntil, formatCalendarDate, greeting, loadDashboard,
  recordLabel, summarizeDashboard, type DashboardData,
} from "@/lib/dashboard";

function riskClasses(risk: string) {
  return risk === "high" ? "bg-red-50 text-red-800"
    : risk === "medium" ? "bg-amber-50 text-amber-800"
    : risk === "low" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700";
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-slate-200">
      <div className="h-full rounded-full bg-blue-700" style={{ width: `${value}%` }} />
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadController = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    const signal = controller.signal;
    return loadDashboard(signal).then((result) => {
      if (signal?.aborted) return;
      setData(result);
      setError("");
      const timestamp = new Date();
      setNow(timestamp);
      setUpdatedAt(timestamp);
    }).catch((failure: unknown) => {
      if (signal?.aborted) return;
      console.error("Dashboard load failed:", failure);
      setError("Unable to load current audit information. Check your connection or sign in again, then retry.");
    }).finally(() => {
      if (!signal?.aborted) setLoading(false);
    });
  }, []);

  const requestRefresh = () => {
    setLoading(true);
    setError("");
    void refresh();
  };

  useEffect(() => {
    void refresh();
    const clock = window.setInterval(() => setNow(new Date()), 60_000);
    return () => {
      loadController.current?.abort();
      window.clearInterval(clock);
    };
  }, [refresh]);

  const name = user.first_name.trim() || user.username;
  const summary = data ? summarizeDashboard(data, now) : null;
  const myReviewCount = summary?.openReviews.filter((item) => item.reviewer === user.id).length ?? 0;
  const reviewItems = summary ? [...summary.openReviews].sort((a, b) =>
    Number(b.reviewer === user.id) - Number(a.reviewer === user.id)
    || (daysUntil(a.due_date, now) ?? Infinity) - (daysUntil(b.due_date, now) ?? Infinity)
    || a.id - b.id) : [];
  const recordUpdates = data ? [
    ...data.engagements.map((item) => ({
      key: `engagement-${item.id}`, title: item.engagement_code,
      description: `${item.client_name} / ${recordLabel(item.status)}`,
      date: item.updated_at, href: `/engagements/${item.id}`,
    })),
    ...data.reviews.map((item) => ({
      key: `review-${item.id}`, title: item.review_area,
      description: `Review assignment / ${item.status}`,
      date: item.updated_at, href: `/engagements/${item.engagement}/conclusion-reporting/summary-review`,
    })),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 5) : [];
  const portfolio = summary ? [...summary.active].sort((a, b) =>
    Number(b.risk_level === "high") - Number(a.risk_level === "high")
    || (daysUntil(a.planned_end_date, now) ?? Infinity) - (daysUntil(b.planned_end_date, now) ?? Infinity)
    || a.id - b.id).slice(0, 8) : [];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-700">IFS / Audit portfolio</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{greeting(now)}, {name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Your engagement portfolio, deadlines and review priorities in one place.</p>
          <p className="mt-2 text-xs text-slate-600">
            {updatedAt ? `Retrieved ${updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} / All engagements available to your account` : loading ? "Loading records available to your account" : "Audit information unavailable"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={requestRefresh} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden="true" />{loading ? "Loading..." : "Refresh"}
          </button>
          <Link href="/engagements/new" className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"><Plus size={18} aria-hidden="true" />New Engagement</Link>
        </div>
      </section>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
        {error} {data && "The figures below are from the last successful load and may be out of date."}
        <Link href="/login?next=%2Fdashboard" className="ml-2 font-semibold underline">Sign in</Link>
      </div>}
      {!data && loading && <div role="status" className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-600">Loading your audit dashboard...</div>}
      {!data && !loading && error && <button type="button" onClick={requestRefresh} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Try Again</button>}

      {data && summary && <>
        <section aria-label="Portfolio metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { title: "Total engagements", value: summary.total, detail: `${summary.completed} completed / ${summary.cancelled} cancelled`, icon: BriefcaseBusiness, color: "bg-blue-50 text-blue-700" },
            { title: "Active engagements", value: summary.active.length, detail: "Excludes completed and cancelled", icon: CalendarDays, color: "bg-blue-50 text-blue-700" },
            { title: "High-risk active", value: summary.highRisk, detail: "Recorded engagement risk", icon: ShieldAlert, color: "bg-red-50 text-red-700" },
            { title: "Due within 14 days", value: summary.dueSoon, detail: `${summary.overdue} overdue / ${summary.noDeadline} without a deadline`, icon: CalendarDays, color: "bg-amber-50 text-amber-800" },
            { title: "Open reviews", value: summary.openReviews.length, detail: `${myReviewCount} assigned to you / Active engagements`, icon: ClipboardCheck, color: "bg-blue-50 text-blue-700" },
          ].map(({ title, value, detail, icon: Icon, color }) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon size={20} aria-hidden="true" /></span>
              <h2 className="mt-4 text-sm font-medium text-slate-600">{title}</h2>
              <p className="mt-1 text-3xl font-bold text-slate-950">{value}</p>
              <p className="mt-2 text-xs leading-5 text-slate-600">{detail}</p>
            </article>
          ))}
        </section>

        {data.engagements.length === 0 && <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="font-bold text-slate-900">Start your audit portfolio</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">No engagements are available to your account. Create an engagement to begin planning; your metrics will appear as records are added.</p>
          <Link href="/engagements/new" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-800">Create an engagement <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>}

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold">Review priorities</h2>
            <p className="mt-1 text-sm text-slate-600">Open assignments on active engagements; your assignments appear first.</p>
            <ul className="mt-5 divide-y divide-slate-200">
              {reviewItems.slice(0, 5).map((review) => {
                const engagement = data.engagements.find((item) => item.id === review.engagement)!;
                const days = daysUntil(review.due_date, now);
                return <li key={review.id} className="py-4 first:pt-0">
                  <Link href={`/engagements/${review.engagement}/conclusion-reporting/summary-review`} className="text-sm font-semibold text-blue-800 hover:underline">{review.review_area}</Link>
                  <p className="mt-1 text-sm text-slate-600">{engagement.engagement_code} / {engagement.client_name}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{review.status} / {review.reviewer === user.id ? "Assigned to you" : review.reviewer_name} / <span className={days !== null && days < 0 ? "font-semibold text-red-700" : ""}>{deadlineLabel(days)}</span></p>
                </li>;
              })}
            </ul>
            {reviewItems.length === 0 && <p className="mt-5 text-sm text-slate-600">No open review assignments on active engagements.</p>}
            {reviewItems.length > 5 && <p className="mt-3 text-xs text-slate-600">Showing 5 of {reviewItems.length} open assignments. Open an engagement&apos;s summary review for its full list.</p>}
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold">Deadlines & overdue work</h2>
            <p className="mt-1 text-sm text-slate-600">Planned engagement end dates; overdue work appears first.</p>
            <ul className="mt-5 divide-y divide-slate-200">
              {summary.deadlines.slice(0, 5).map(({ engagement, days }) => (
                <li key={engagement.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0">
                  <div className="min-w-0">
                    <Link href={`/engagements/${engagement.id}`} className="text-sm font-semibold text-blue-800 hover:underline">{engagement.client_name}</Link>
                    <p className="mt-1 text-xs text-slate-600">{engagement.engagement_code} / {formatCalendarDate(engagement.planned_end_date)}</p>
                  </div>
                  <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${days < 0 ? "bg-red-50 text-red-800" : days <= 14 ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{deadlineLabel(days)}</span>
                </li>
              ))}
            </ul>
            {!summary.deadlines.length && <p className="mt-5 text-sm text-slate-600">No planned deadlines on active engagements.</p>}
            {summary.noDeadline > 0 && <Link href="/engagements" className="mt-4 block text-sm font-semibold text-blue-800 hover:underline">{summary.noDeadline} active engagement{summary.noDeadline === 1 ? "" : "s"} need a planned end date.</Link>}
            {summary.deadlines.length > 5 && <p className="mt-3 text-xs text-slate-600">Showing the 5 earliest of {summary.deadlines.length} planned deadlines.</p>}
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold">Audit workflow</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Active engagements grouped by recorded phase. Progress is the average recorded engagement progress, not approval or assurance.</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {summary.phases.map((phase, index) => (
              <article key={phase.key} className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-bold text-blue-700">PHASE 0{index + 1}</p>
                <h3 className="mt-2 font-semibold">{phase.title}</h3>
                <p className="mt-3 text-sm text-slate-600">{phase.count} active engagement{phase.count === 1 ? "" : "s"}</p>
                {phase.averageProgress === null ? <p className="mt-4 text-xs text-slate-600">No active engagements in this phase.</p> : <>
                  <p className="mb-2 mt-4 text-xs text-slate-600">Average recorded progress: {phase.averageProgress}%</p>
                  <ProgressBar value={phase.averageProgress} label={`${phase.title}: average recorded progress`} />
                </>}
              </article>
            ))}
          </div>
          {summary.unassignedPhase > 0 && <p className="mt-4 text-sm text-amber-800">{summary.unassignedPhase} active engagement{summary.unassignedPhase === 1 ? "" : "s"} have no recognized active phase; review their records.</p>}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
            <div><h2 className="text-lg font-bold">Active engagements</h2><p className="mt-1 text-sm text-slate-600">High-risk engagements first, then earliest planned deadline.</p></div>
            <Link href="/engagements" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-800 hover:underline">View all <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          {portfolio.length ? <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <caption className="sr-only">Up to eight active engagements prioritized by risk and deadline</caption>
              <thead className="border-y border-slate-200 bg-slate-50 text-xs text-slate-700"><tr>{["Engagement / Client", "Status", "Risk", "Recorded progress", "Deadline"].map((title) => <th key={title} scope="col" className="px-5 py-3 font-semibold">{title}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-200">{portfolio.map((engagement) => <tr key={engagement.id}>
                <td className="px-5 py-4"><Link href={`/engagements/${engagement.id}`} className="font-semibold text-blue-800 hover:underline">{engagement.engagement_code}</Link><p className="mt-1 text-xs text-slate-600">{engagement.client_name}</p></td>
                <td className="px-5 py-4">{recordLabel(engagement.status)}</td>
                <td className="px-5 py-4"><span className={`rounded-lg px-2 py-1 text-xs font-semibold ${riskClasses(engagement.risk_level)}`}>{recordLabel(engagement.risk_level)}</span></td>
                <td className="px-5 py-4"><p className="mb-2 text-xs text-slate-700">{engagement.progress_percentage}%</p><ProgressBar value={engagement.progress_percentage} label={`${engagement.engagement_code} recorded progress`} /></td>
                <td className="px-5 py-4"><p>{formatCalendarDate(engagement.planned_end_date)}</p><p className="mt-1 text-xs text-slate-600">{deadlineLabel(daysUntil(engagement.planned_end_date, now))}</p></td>
              </tr>)}</tbody>
            </table>
          </div> : <p className="px-6 pb-6 text-sm text-slate-600">No active engagements.</p>}
          {summary.active.length > 8 && <p className="p-5 text-xs text-slate-600">Showing 8 of {summary.active.length} active engagements.</p>}
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold">Active portfolio risk</h2>
            <p className="mt-1 text-sm text-slate-600">The same active population used by the high-risk metric above.</p>
            <div className="mt-5 space-y-5">
              {summary.risks.map(({ risk, count }) => {
                const percent = summary.active.length ? Math.round(count / summary.active.length * 100) : 0;
                return <div key={risk}>
                  <div className="mb-2 flex justify-between text-sm"><span>{recordLabel(risk)} risk</span><span className="font-semibold">{count} / {percent}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true"><div className={`h-full rounded-full ${risk === "high" ? "bg-red-600" : risk === "medium" ? "bg-amber-600" : "bg-emerald-600"}`} style={{ width: `${percent}%` }} /></div>
                </div>;
              })}
            </div>
            {summary.unclassifiedRisk > 0 && <p className="mt-4 text-sm text-amber-800">{summary.unclassifiedRisk} active engagements have an unrecognized risk classification.</p>}
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold">Recent record updates</h2>
            <p className="mt-1 text-sm text-slate-600">Latest saved engagement and review records; not a complete audit activity log.</p>
            <ul className="mt-5 divide-y divide-slate-200">{recordUpdates.map((item) => <li key={item.key} className="py-3 first:pt-0">
              <Link href={item.href} className="text-sm font-semibold text-blue-800 hover:underline">{item.title}</Link>
              <p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p>
              <time dateTime={item.date} className="mt-1 block text-xs text-slate-600">{new Date(item.date).toLocaleString("en-GB")}</time>
            </li>)}</ul>
            {!recordUpdates.length && <p className="mt-5 text-sm text-slate-600">No record updates to display.</p>}
          </section>
        </div>

        <section aria-labelledby="quick-access-heading">
          <h2 id="quick-access-heading" className="text-lg font-bold">Quick access</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[{ href: "/clients", title: "Clients", description: "Manage your client directory", icon: Users }, { href: "/engagements", title: "Engagements", description: "Plan and review audit work", icon: BriefcaseBusiness }, { href: "/financials", title: "Financial audit workspace", description: "Trial balances, adjustments and evidence", icon: CheckCircle2 }].map(({ href, title, description, icon: Icon }) => (
              <Link key={href} href={href} className="rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-400">
                <Icon size={20} className="text-blue-700" aria-hidden="true" /><p className="mt-3 text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
              </Link>
            ))}
          </div>
        </section>
      </>}
    </div>
  );
}
