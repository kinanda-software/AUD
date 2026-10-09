"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { getEngagements, type Engagement } from "@/lib/financials";
import {
  getFinancialAuditEvents,
  type FinancialAuditEvent,
} from "@/lib/financialWorkflows";

/* =========================================================
   READABLE EVENT DETAILS
========================================================= */

const MONEY_FIELDS = new Set([
  "debit", "credit", "amount", "base_amount", "base_net", "base_tax",
  "net_amount", "tax_amount", "total_debit", "total_credit", "cost",
  "residual_value", "opening_depreciation", "budgeted_hours", "hours",
  "weight", "fx_difference", "control_base_amount",
]);

const SKIP_FIELDS = new Set(["updated_at"]);

function isDateField(key: string) {
  return key.endsWith("_at") || key.endsWith("_date") || key === "closed_through";
}

function humanize(key: string) {
  return key
    .replace(/_id$/, " ID")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" || typeof value === "string") {
    if (MONEY_FIELDS.has(key)) {
      const numeric = Number(value);
      if (!Number.isNaN(numeric)) {
        return numeric.toLocaleString("en-TZ", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }
    }
    if (isDateField(key)) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          ...(key.endsWith("_at")
            ? { hour: "2-digit", minute: "2-digit" as const }
            : {}),
        });
      }
    }
    return String(value);
  }
  return JSON.stringify(value);
}

type Snapshot = Record<string, unknown>;

function SnapshotRows({ snapshot }: { snapshot: Snapshot }) {
  const entries = Object.entries(snapshot).filter(
    ([key]) => !SKIP_FIELDS.has(key)
  );
  return (
    <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-0.5">
      {entries.map(([key, value]) => (
        <Fragment key={key}>
          <dt className="whitespace-nowrap text-slate-500">{humanize(key)}</dt>
          <dd className="break-words font-medium text-slate-800">
            {formatValue(key, value)}
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}

function DiffRows({ before, after }: { before: Snapshot; after: Snapshot }) {
  const keys = Array.from(
    new Set([...Object.keys(before), ...Object.keys(after)])
  ).filter(
    (key) =>
      !SKIP_FIELDS.has(key) &&
      JSON.stringify(before[key]) !== JSON.stringify(after[key])
  );
  if (!keys.length) {
    return <p className="text-slate-500">No field values changed.</p>;
  }
  return (
    <dl className="space-y-1">
      {keys.map((key) => (
        <div key={key} className="break-words">
          <dt className="inline font-medium text-slate-700">{humanize(key)}: </dt>
          <dd className="inline">
            <span className="text-red-700 line-through">
              {formatValue(key, before[key])}
            </span>{" "}
            <span aria-hidden="true">→</span>{" "}
            <span className="font-medium text-emerald-700">
              {formatValue(key, after[key])}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function EventDetails({ event }: { event: FinancialAuditEvent }) {
  const details = (event.details ?? {}) as {
    operation?: string;
    reason?: string | null;
    before?: Snapshot | null;
    after?: Snapshot | null;
    before_dimension_ids?: number[];
    dimension_ids?: number[];
  };

  const operation = details.operation
    ? details.operation.replaceAll("_", " ")
    : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {operation && (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold capitalize text-slate-700">
            {operation}
          </span>
        )}
        {details.reason && (
          <span className="text-slate-600">Reason: {details.reason}</span>
        )}
      </div>

      {event.action === "created" && details.after && (
        <SnapshotRows snapshot={details.after} />
      )}
      {event.action === "deleted" && details.before && (
        <SnapshotRows snapshot={details.before} />
      )}
      {event.action === "updated" && details.before && details.after && (
        <DiffRows before={details.before} after={details.after} />
      )}
      {event.action === "dimensions_changed" && (
        <p className="text-slate-700">
          Dimensions: {(details.before_dimension_ids ?? []).join(", ") || "none"} →{" "}
          {(details.dimension_ids ?? []).join(", ") || "none"}
        </p>
      )}
      {!details.after && !details.before && !details.dimension_ids && (
        <p className="text-slate-500">No snapshot recorded.</p>
      )}
    </div>
  );
}

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
                <td className="max-w-xl p-3 text-xs"><EventDetails event={event} /></td>
              </tr>
            ))}</tbody>
          </table>
          {!events.length && <p className="p-4 text-sm text-slate-600">No workflow activity recorded.</p>}
        </div>
      )}
    </div>
  );
}
