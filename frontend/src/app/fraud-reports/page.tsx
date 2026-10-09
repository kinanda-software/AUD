"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";

import {
  getFraudReports,
  triageFraudReport,
  type FraudReport,
} from "@/lib/fraudReports";

const statusStyles: Record<string, string> = {
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  under_review: "bg-purple-50 text-purple-700 border-purple-200",
  investigating: "bg-amber-50 text-amber-700 border-amber-200",
  closed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function FraudReportsPage() {
  const [reports, setReports] = useState<FraudReport[]>([]);
  const [selected, setSelected] = useState<FraudReport | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [triageNotes, setTriageNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getFraudReports(statusFilter || undefined);
        if (active) setReports(data);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Could not load reports."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [statusFilter, reloadKey]);

  function openDetail(report: FraudReport) {
    setSelected(report);
    setTriageNotes(report.triage_notes);
  }

  async function handleTriage(
    decision: "under_review" | "investigating" | "closed"
  ) {
    if (!selected) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await triageFraudReport(
        selected.id,
        decision,
        triageNotes
      );
      setSelected(updated);
      setSuccess(
        `${updated.reference} marked ${updated.status.replace("_", " ")}.`
      );
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Triage failed.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm";

  return (
    <div className="w-full px-6 py-8">
      <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
        <ShieldAlert aria-hidden="true" /> Fraud Reports
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Whistleblowing submissions from the public fraud-report channel.
        Triage each report: review, investigate, and record the outcome.
      </p>

      {error && (
        <div role="alert" className="my-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="my-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="my-6">
        <label className="text-sm font-medium">
          Status
          <select
            className={inputClass}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under review</option>
            <option value="investigating">Investigating</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p role="status" className="mt-6 flex items-center gap-2 text-sm">
          <Loader2 className="animate-spin" /> Loading reports...
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-700">
              <tr>
                {["Ref", "Subject", "Reporter", "Submitted", "Status"].map(
                  (title) => (
                    <th key={title} className="px-4 py-3">{title}</th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reports.map((report) => (
                <tr
                  key={report.id}
                  className="cursor-pointer align-top hover:bg-slate-50"
                  onClick={() => openDetail(report)}
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {report.reference}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {report.subject}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {report.reporter_name || (
                      <span className="italic text-slate-400">Anonymous</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    {new Date(report.created_at).toLocaleString("en-GB")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[report.status]}`}>
                      {report.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!reports.length && (
            <p className="p-6 text-center text-sm text-slate-600">
              No fraud reports found.
            </p>
          )}
        </div>
      )}

      {selected && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">
                {selected.reference} — {selected.subject}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Reporter: {selected.reporter_name || "Anonymous"}
                {selected.reporter_email && ` · ${selected.reporter_email}`}
                {selected.reviewed_by_username &&
                  ` · last triaged by ${selected.reviewed_by_username}`}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close details"
              onClick={() => setSelected(null)}
              className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>

          <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {selected.description}
          </p>

          {selected.status !== "closed" && (
            <div className="mt-4">
              <label className="text-sm font-medium">
                Triage notes
                <textarea
                  rows={2}
                  className={inputClass}
                  value={triageNotes}
                  onChange={(event) => setTriageNotes(event.target.value)}
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-3">
                {selected.status === "submitted" && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleTriage("under_review")}
                    className="rounded-xl border border-purple-300 px-4 py-2.5 text-sm font-semibold text-purple-700"
                  >
                    Mark under review
                  </button>
                )}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleTriage("investigating")}
                  className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  Start investigation
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleTriage("closed")}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Close report
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
