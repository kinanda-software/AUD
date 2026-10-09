"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Loader2,
  MessageSquareText,
  Plus,
  RotateCcw,
  Send,
  X,
} from "lucide-react";

import {
  getAuditTeamUsers,
  getEngagements,
  type AuditTeamUser,
  type Engagement,
} from "@/lib/api";
import {
  clearReviewPoint,
  createReviewPoint,
  getReviewPoints,
  getReviewPointSummary,
  reopenReviewPoint,
  respondToReviewPoint,
  updateReviewPoint,
  type ReviewPoint,
  type ReviewPointSummary,
} from "@/lib/reviewPoints";

const statusStyles: Record<string, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  responded: "bg-amber-50 text-amber-700 border-amber-200",
  cleared: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const priorityStyles: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 border-slate-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-red-50 text-red-700 border-red-200",
};

const SECTION_OPTIONS = [
  "planning-assessment",
  "materiality-assessment",
  "audit-scope",
  "risk-assessment",
  "controls-testing",
  "substantive-procedures",
  "trial-balance",
  "completion-review",
  "summary-review",
  "general",
];

export default function ReviewPointsPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [users, setUsers] = useState<AuditTeamUser[]>([]);
  const [points, setPoints] = useState<ReviewPoint[]>([]);
  const [summary, setSummary] = useState<ReviewPointSummary | null>(null);
  const [selected, setSelected] = useState<ReviewPoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [engagementFilter, setEngagementFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [form, setForm] = useState({
    engagement: "",
    title: "",
    description: "",
    section: "general",
    priority: "medium",
    assigned_to: "",
    due_date: "",
  });

  const [responseText, setResponseText] = useState("");
  const [editAssignee, setEditAssignee] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [engagementData, userData] = await Promise.all([
          getEngagements(),
          getAuditTeamUsers(),
        ]);
        if (!active) return;
        setEngagements(engagementData);
        setUsers(userData.filter((user) => user.is_active !== false));
        const engagement = engagementFilter
          ? Number(engagementFilter)
          : undefined;
        const [pointData, summaryData] = await Promise.all([
          getReviewPoints({
            engagement,
            status: (statusFilter || undefined) as
              | ReviewPoint["status"]
              | undefined,
          }),
          getReviewPointSummary(engagement),
        ]);
        if (!active) return;
        setPoints(pointData);
        setSummary(summaryData);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load review points."
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
  }, [engagementFilter, statusFilter, reloadKey]);

  function openDetail(point: ReviewPoint) {
    setSelected(point);
    setResponseText(point.response);
    setEditAssignee(point.assigned_to ? String(point.assigned_to) : "");
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await createReviewPoint({
        engagement: Number(form.engagement),
        title: form.title,
        description: form.description,
        section: form.section,
        priority: form.priority as ReviewPoint["priority"],
        assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
        due_date: form.due_date || null,
      });
      setSuccess("Review point raised and assignee notified.");
      setShowForm(false);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not raise the review point.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReassign() {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateReviewPoint(selected.id, {
        assigned_to: editAssignee ? Number(editAssignee) : null,
      });
      setSelected(updated);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reassignment failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRespond() {
    if (!selected || !responseText.trim()) {
      setError("Write a response before submitting.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await respondToReviewPoint(
        selected.id,
        responseText.trim()
      );
      setSelected(updated);
      setSuccess(`${updated.reference} response recorded.`);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Response failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const updated = await clearReviewPoint(selected.id);
      setSelected(updated);
      setSuccess(`${updated.reference} cleared.`);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clear failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReopen() {
    if (!selected) return;
    setError("");
    try {
      const updated = await reopenReviewPoint(selected.id);
      setSelected(updated);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reopen failed.");
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm";

  return (
    <div className="w-full px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
            <MessageSquareText aria-hidden="true" /> Review Points
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Partners and managers raise review points on workpapers, assign
            them to team members, and clear them once the response is
            accepted — the clearance trail for the engagement review.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={16} /> Raise review point
        </button>
      </div>

      {summary && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-600">Total raised</p>
            <p className="mt-2 text-3xl font-bold">{summary.total}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-600">Outstanding</p>
            <p className="mt-2 text-3xl font-bold text-amber-700">
              {summary.open}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-600">Cleared</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {summary.by_status.cleared?.count ?? 0}
            </p>
          </div>
        </div>
      )}

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
          <h2 className="text-lg font-semibold">Raise a review point</h2>
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
              Workpaper section
              <select
                className={inputClass}
                value={form.section}
                onChange={(event) =>
                  setForm({ ...form, section: event.target.value })
                }
              >
                {SECTION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.replaceAll("-", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium md:col-span-2">
              Title
              <input
                required
                className={inputClass}
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="e.g. Confirm receivables cut-off evidence"
              />
            </label>
            <label className="text-sm font-medium">
              Priority
              <select
                className={inputClass}
                value={form.priority}
                onChange={(event) =>
                  setForm({ ...form, priority: event.target.value })
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Assign to
              <select
                className={inputClass}
                value={form.assigned_to}
                onChange={(event) =>
                  setForm({ ...form, assigned_to: event.target.value })
                }
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name || user.last_name
                      ? `${user.first_name} ${user.last_name}`.trim()
                      : user.username}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Due date
              <input
                type="date"
                className={inputClass}
                value={form.due_date}
                onChange={(event) =>
                  setForm({ ...form, due_date: event.target.value })
                }
              />
            </label>
            <label className="text-sm font-medium md:col-span-2">
              Description
              <textarea
                required
                rows={3}
                className={inputClass}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
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
              Raise point
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

      <div className="my-6 flex flex-wrap gap-4">
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
        <label className="text-sm font-medium">
          Status
          <select
            className={inputClass}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="responded">Responded</option>
            <option value="cleared">Cleared</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p role="status" className="mt-6 flex items-center gap-2 text-sm">
          <Loader2 className="animate-spin" /> Loading review points...
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-700">
              <tr>
                {["Ref", "Point", "Engagement", "Section", "Priority", "Status", "Assigned"].map(
                  (title) => (
                    <th key={title} className="px-4 py-3">{title}</th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {points.map((point) => (
                <tr
                  key={point.id}
                  className="cursor-pointer align-top hover:bg-slate-50"
                  onClick={() => openDetail(point)}
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {point.reference}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{point.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      raised by {point.raised_by_name || "unknown"}
                    </p>
                  </td>
                  <td className="px-4 py-3">{point.engagement_code}</td>
                  <td className="px-4 py-3 text-xs capitalize">
                    {(point.section || "general").replaceAll("-", " ")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${priorityStyles[point.priority]}`}>
                      {point.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[point.status]}`}>
                      {point.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {point.assigned_to_name || (
                      <span className="text-slate-400">Unassigned</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!points.length && (
            <p className="p-6 text-center text-sm text-slate-600">
              No review points raised yet.
            </p>
          )}
        </div>
      )}

      {selected && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">
                {selected.reference} — {selected.title}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {selected.engagement_code} · raised by{" "}
                {selected.raised_by_name || "unknown"} ·{" "}
                {selected.description}
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

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Assigned to
              <select
                className={inputClass}
                value={editAssignee}
                onChange={(event) => setEditAssignee(event.target.value)}
                disabled={selected.status === "cleared"}
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name || user.last_name
                      ? `${user.first_name} ${user.last_name}`.trim()
                      : user.username}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                disabled={saving || selected.status === "cleared"}
                onClick={handleReassign}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Reassign
              </button>
            </div>
            <label className="text-sm font-medium md:col-span-2">
              Response / disposition
              <textarea
                rows={3}
                className={inputClass}
                value={responseText}
                onChange={(event) => setResponseText(event.target.value)}
                disabled={selected.status === "cleared"}
                placeholder="Answer the review point, referencing supporting evidence..."
              />
              {selected.responded_by_username && (
                <span className="mt-1 block text-xs text-slate-500">
                  Last response by {selected.responded_by_username}
                  {selected.responded_at &&
                    ` on ${new Date(selected.responded_at).toLocaleString("en-GB")}`}
                </span>
              )}
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {selected.status !== "cleared" && (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleRespond}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  Submit response
                </button>
                <button
                  type="button"
                  disabled={saving || !selected.response.trim()}
                  onClick={handleClear}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} /> Clear point
                </button>
              </>
            )}
            {selected.status === "cleared" && (
              <>
                <p className="text-sm text-emerald-700">
                  Cleared by {selected.cleared_by_username || "unknown"}
                  {selected.cleared_at &&
                    ` on ${new Date(selected.cleared_at).toLocaleString("en-GB")}`}
                  .
                </p>
                <button
                  type="button"
                  onClick={handleReopen}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
                >
                  <RotateCcw size={16} /> Reopen
                </button>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
