"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getEngagements, type Engagement } from "@/lib/financials";
import {
  getFinancialAuditEvents,
  type FinancialAuditEvent,
} from "@/lib/financialWorkflows";

export default function FinancialActivityLogPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [events, setEvents] = useState<FinancialAuditEvent[]>([]);
  const [engagementId, setEngagementId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [engagementData, eventData] = await Promise.all([
          getEngagements(),
          getFinancialAuditEvents(engagementId ? Number(engagementId) : undefined),
        ]);
        if (!active) return;
        setEngagements(engagementData);
        setEvents(eventData);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load activity history.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [engagementId]);

  return (
    <div className="w-full px-6 py-8">
      <Link href="/financials" className="text-sm text-blue-700">Back to Financials</Link>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">Financial Workflow Activity</h1>
      <p className="mt-2 text-sm text-slate-600">
        Review financial API changes, journal approvals and reversals, accounting-period controls,
        and budget and bank workflows. Core records include before/after snapshots.
        Changes made before history tracking was enabled are not backfilled.
      </p>
      <label className="mt-5 block max-w-lg text-sm font-medium">Engagement
        <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm" value={engagementId} onChange={(event) => setEngagementId(event.target.value)}>
          <option value="">All engagements</option>
          {engagements.map((item) => <option key={item.id} value={item.id}>{item.engagement_code || item.title || `Engagement #${item.id}`}</option>)}
        </select>
      </label>
      {error && <div role="alert" className="my-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
      {loading ? <p role="status" className="mt-5">Loading activity...</p> : (
        <div className="mt-5 overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50"><tr><th className="p-3">When</th><th className="p-3">Who</th><th className="p-3">Action</th><th className="p-3">Record</th><th className="p-3">Details</th></tr></thead>
            <tbody>{events.map((event) => (
              <tr key={event.id} className="border-t align-top">
                <td className="whitespace-nowrap p-3">{new Date(event.created_at).toLocaleString()}</td>
                <td className="p-3">{event.actor_name || "System"}</td>
                <td className="p-3">{event.action.replaceAll("_", " ")}</td>
                <td className="p-3">{event.object_type.replaceAll("_", " ")} #{event.object_id}</td>
                <td className="max-w-xl whitespace-pre-wrap p-3 text-xs">{JSON.stringify(event.details, null, 2)}</td>
              </tr>
            ))}</tbody>
          </table>
          {!events.length && <p className="p-4 text-sm text-slate-600">No workflow activity recorded.</p>}
        </div>
      )}
    </div>
  );
}
