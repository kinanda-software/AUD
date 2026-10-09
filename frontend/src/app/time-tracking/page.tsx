"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Clock, Loader2, Plus, Trash2 } from "lucide-react";

import { getEngagements, type Engagement } from "@/lib/api";
import {
  createTimeEntry,
  deleteTimeEntry,
  getTimeEntries,
  getTimeSummary,
  type TimeEntry,
  type TimeEntryPhase,
  type TimeSummaryRow,
} from "@/lib/timeTracking";

const PHASE_LABELS: Record<TimeEntryPhase, string> = {
  planning: "Planning",
  risk_assessment: "Risk assessment",
  fieldwork: "Fieldwork",
  review: "Review",
  completion: "Completion & reporting",
  other: "Other",
};

function todayString() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export default function TimeTrackingPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [summary, setSummary] = useState<TimeSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [engagementFilter, setEngagementFilter] = useState("");

  const [form, setForm] = useState({
    engagement: "",
    entry_date: "",
    hours: "",
    phase: "fieldwork",
    description: "",
  });

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const engagement = engagementFilter
          ? Number(engagementFilter)
          : undefined;
        const [engagementData, entryData, summaryData] =
          await Promise.all([
            getEngagements(),
            getTimeEntries({ engagement }),
            getTimeSummary(engagement),
          ]);
        if (!active) return;
        setEngagements(engagementData);
        setEntries(entryData);
        setSummary(summaryData);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load time entries."
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
  }, [engagementFilter, reloadKey]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await createTimeEntry({
        engagement: Number(form.engagement),
        entry_date: form.entry_date,
        hours: Number(form.hours),
        phase: form.phase as TimeEntryPhase,
        description: form.description,
      });
      setSuccess(`Logged ${form.hours} hours.`);
      setShowForm(false);
      setForm({
        engagement: "",
        entry_date: "",
        hours: "",
        phase: "fieldwork",
        description: "",
      });
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log time.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this time entry?")) return;
    setError("");
    try {
      await deleteTimeEntry(id);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  function engagementLabel(id: number) {
    const found = engagements.find((item) => item.id === id);
    return found
      ? found.engagement_code
      : `Engagement #${id}`;
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm";

  return (
    <div className="w-full px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
            <Clock aria-hidden="true" /> Time Tracking
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Log actual hours per engagement phase and compare them against
            the budgeted hours set in the audit team workpaper.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!showForm && !form.entry_date) {
              setForm((current) => ({
                ...current,
                entry_date: todayString(),
              }));
            }
            setShowForm((value) => !value);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={16} /> Log time
        </button>
      </div>

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

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="my-6 rounded-2xl border border-slate-200 bg-white p-5"
        >
          <h2 className="text-lg font-semibold">Log time</h2>
          <fieldset disabled={saving} className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Engagement
              <select
                required
                className={inputClass}
                value={form.engagement}
                onChange={(event) =>
                  setForm({ ...form, engagement: event.target.value })
                }
              >
                <option value="">Select an engagement</option>
                {engagements.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.engagement_code} — {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Date
              <input
                required
                type="date"
                className={inputClass}
                value={form.entry_date}
                onChange={(event) =>
                  setForm({ ...form, entry_date: event.target.value })
                }
              />
            </label>
            <label className="text-sm font-medium">
              Hours
              <input
                required
                type="number"
                min="0.25"
                max="24"
                step="0.25"
                className={inputClass}
                value={form.hours}
                onChange={(event) =>
                  setForm({ ...form, hours: event.target.value })
                }
                placeholder="e.g. 3.5"
              />
            </label>
            <label className="text-sm font-medium">
              Phase
              <select
                className={inputClass}
                value={form.phase}
                onChange={(event) =>
                  setForm({ ...form, phase: event.target.value })
                }
              >
                {Object.entries(PHASE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium md:col-span-2">
              Description
              <textarea
                rows={2}
                className={inputClass}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="What work was performed?"
              />
            </label>
          </fieldset>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              Save entry
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="my-6">
        <label className="text-sm font-medium">
          Engagement
          <select
            className={inputClass}
            value={engagementFilter}
            onChange={(event) => setEngagementFilter(event.target.value)}
          >
            <option value="">All engagements</option>
            {engagements.map((item) => (
              <option key={item.id} value={item.id}>
                {item.engagement_code}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p role="status" className="mt-6 flex items-center gap-2 text-sm">
          <Loader2 className="animate-spin" /> Loading time data...
        </p>
      ) : (
        <>
          <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <h2 className="border-b border-slate-200 p-4 text-lg font-semibold">
              Budget vs actual hours
            </h2>
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-700">
                <tr>
                  {["Engagement", "Budgeted", "Actual", "Variance", "Utilisation"].map(
                    (title) => (
                      <th key={title} className="px-4 py-3">{title}</th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {summary.map((row) => (
                  <tr key={row.engagement}>
                    <td className="px-4 py-3 font-medium">
                      {engagementLabel(row.engagement)}
                    </td>
                    <td className="px-4 py-3">
                      {row.budgeted_hours.toFixed(1)} h
                    </td>
                    <td className="px-4 py-3">
                      {row.actual_hours.toFixed(1)} h
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold ${
                        row.variance_hours < 0
                          ? "text-red-700"
                          : "text-emerald-700"
                      }`}
                    >
                      {row.variance_hours.toFixed(1)} h
                    </td>
                    <td className="px-4 py-3">
                      {row.utilization_percent !== null ? (
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                            <span
                              className={`block h-full ${
                                row.utilization_percent > 100
                                  ? "bg-red-500"
                                  : "bg-blue-600"
                              }`}
                              style={{
                                width: `${Math.min(row.utilization_percent, 100)}%`,
                              }}
                            />
                          </span>
                          {row.utilization_percent}%
                        </span>
                      ) : (
                        <span className="text-slate-400">No budget</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!summary.length && (
              <p className="p-6 text-center text-sm text-slate-600">
                No time entries or budgeted hours recorded yet.
              </p>
            )}
          </section>

          <section className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <h2 className="border-b border-slate-200 p-4 text-lg font-semibold">
              Time entries
            </h2>
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-700">
                <tr>
                  {["Date", "Engagement", "Team member", "Phase", "Hours", "Description", ""].map(
                    (title) => (
                      <th key={title} className="px-4 py-3">{title}</th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap px-4 py-3">
                      {entry.entry_date}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {entry.engagement_code}
                    </td>
                    <td className="px-4 py-3">{entry.user_name}</td>
                    <td className="px-4 py-3">
                      {PHASE_LABELS[entry.phase as TimeEntryPhase] ||
                        entry.phase}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {Number(entry.hours).toFixed(2)}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-xs text-slate-500">
                      {entry.description || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!entries.length && (
              <p className="p-6 text-center text-sm text-slate-600">
                No time entries recorded.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
