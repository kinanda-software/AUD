"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarDays,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  Users,
} from "lucide-react";

import {
  getEngagements,
  getAuditTeamUsers,
  type AuditTeamUser,
  type Engagement,
} from "@/lib/api";
import {
  createSchedule,
  deleteSchedule,
  getSchedules,
  scheduleNextOccurrence,
  updateSchedule,
  type AuditSchedule,
  type ScheduleStatus,
} from "@/lib/scheduling";

const statusStyles: Record<ScheduleStatus, string> = {
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function SchedulingPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [users, setUsers] = useState<AuditTeamUser[]>([]);
  const [schedules, setSchedules] = useState<AuditSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [engagementFilter, setEngagementFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState({
    engagement: "",
    title: "",
    audit_type: "internal",
    scheduled_start: "",
    scheduled_end: "",
    location: "",
    auditee_name: "",
    auditee_email: "",
    recurrence_months: "",
    notes: "",
  });
  const [auditorIds, setAuditorIds] = useState<number[]>([]);

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
        const scheduleData = await getSchedules(
          engagementFilter ? Number(engagementFilter) : undefined,
          (statusFilter || undefined) as ScheduleStatus | undefined,
        );
        if (!active) return;
        setSchedules(scheduleData);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Could not load schedules."
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

  const grouped = useMemo(() => {
    const upcoming = schedules.filter(
      (item) =>
        item.status === "scheduled" || item.status === "in_progress"
    );
    const finished = schedules.filter(
      (item) =>
        item.status === "completed" || item.status === "cancelled"
    );
    return { upcoming, finished };
  }, [schedules]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await createSchedule({
        engagement: Number(form.engagement),
        title: form.title,
        audit_type: form.audit_type as "internal" | "external",
        scheduled_start: new Date(form.scheduled_start).toISOString(),
        scheduled_end: new Date(form.scheduled_end).toISOString(),
        location: form.location,
        auditee_name: form.auditee_name,
        auditee_email: form.auditee_email,
        notes: form.notes,
        recurrence_months: form.recurrence_months
          ? Number(form.recurrence_months)
          : null,
        assigned_auditors: auditorIds,
      });
      setSuccess("Audit scheduled. Assigned auditors have been notified.");
      setShowForm(false);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the schedule.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(id: number, status: ScheduleStatus) {
    setError("");
    try {
      await updateSchedule(id, { status });
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed.");
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this scheduled audit?")) return;
    setError("");
    try {
      await deleteSchedule(id);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  async function handleScheduleNext(id: number) {
    setError("");
    setSuccess("");
    try {
      const created = await scheduleNextOccurrence(id);
      setSuccess(
        `Next occurrence scheduled: ${created.title} on ${formatDateTime(created.scheduled_start)}.`
      );
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not schedule next occurrence."
      );
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm";

  function renderTable(rows: AuditSchedule[]) {
    if (!rows.length) {
      return (
        <p className="p-4 text-sm text-slate-600">
          No scheduled audits found.
        </p>
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-700">
            <tr>
              {["Audit", "Engagement", "Window", "Auditors", "Status", "Actions"].map(
                (title) => (
                  <th key={title} className="px-4 py-3">{title}</th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs capitalize text-slate-500">
                    {item.audit_type} audit
                    {item.location && (
                      <span className="ml-2 inline-flex items-center gap-1">
                        <MapPin size={12} /> {item.location}
                      </span>
                    )}
                  </p>
                  {item.auditee_name && (
                    <p className="mt-1 text-xs text-slate-500">
                      Auditee: {item.auditee_name}
                    </p>
                  )}
                  {item.recurrence_months && (
                    <p className="mt-1 text-xs font-medium text-blue-700">
                      Recurs every {item.recurrence_months} month
                      {item.recurrence_months === 1 ? "" : "s"}
                      {item.next_occurrence &&
                        ` · next ${formatDateTime(item.next_occurrence)}`}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{item.engagement_code}</p>
                  <p className="text-xs text-slate-500">{item.client_name}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs">
                  <p>{formatDateTime(item.scheduled_start)}</p>
                  <p className="text-slate-500">
                    to {formatDateTime(item.scheduled_end)}
                  </p>
                </td>
                <td className="px-4 py-3 text-xs">
                  {item.assigned_auditor_names.length ? (
                    <span className="inline-flex items-start gap-1">
                      <Users size={13} className="mt-0.5 shrink-0" />
                      {item.assigned_auditor_names.join(", ")}
                    </span>
                  ) : (
                    <span className="text-slate-400">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[item.status]}`}
                  >
                    {item.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    {item.status === "scheduled" && (
                      <button
                        type="button"
                        onClick={() => handleStatus(item.id, "in_progress")}
                        className="text-amber-700 hover:underline"
                      >
                        Start
                      </button>
                    )}
                    {(item.status === "scheduled" ||
                      item.status === "in_progress") && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStatus(item.id, "completed")}
                          className="text-emerald-700 hover:underline"
                        >
                          Complete
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatus(item.id, "cancelled")}
                          className="text-slate-600 hover:underline"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="inline-flex items-center gap-1 text-red-700 hover:underline"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                    {item.recurrence_months && (
                      <button
                        type="button"
                        onClick={() => handleScheduleNext(item.id)}
                        className="text-blue-700 hover:underline"
                      >
                        Schedule next
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
            <CalendarDays aria-hidden="true" /> Audit Scheduling
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Schedule internal and external audits, assign auditors and
            auditees, and track execution. New assignments automatically
            notify the assigned auditors.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!showForm && !form.scheduled_start) {
              const start = new Date();
              setForm((current) => ({
                ...current,
                scheduled_start: toInputValue(start),
                scheduled_end: toInputValue(
                  new Date(start.getTime() + 2 * 60 * 60 * 1000)
                ),
              }));
            }
            setShowForm((value) => !value);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={16} /> Schedule audit
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
          <h2 className="text-lg font-semibold">New scheduled audit</h2>
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
              Title
              <input
                required
                className={inputClass}
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="e.g. Inventory count observation"
              />
            </label>
            <label className="text-sm font-medium">
              Audit type
              <select
                className={inputClass}
                value={form.audit_type}
                onChange={(event) =>
                  setForm({ ...form, audit_type: event.target.value })
                }
              >
                <option value="internal">Internal audit</option>
                <option value="external">External audit</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Location
              <input
                className={inputClass}
                value={form.location}
                onChange={(event) =>
                  setForm({ ...form, location: event.target.value })
                }
                placeholder="Client head office, Dar es Salaam"
              />
            </label>
            <label className="text-sm font-medium">
              Starts
              <input
                required
                type="datetime-local"
                className={inputClass}
                value={form.scheduled_start}
                onChange={(event) =>
                  setForm({ ...form, scheduled_start: event.target.value })
                }
              />
            </label>
            <label className="text-sm font-medium">
              Ends
              <input
                required
                type="datetime-local"
                className={inputClass}
                value={form.scheduled_end}
                onChange={(event) =>
                  setForm({ ...form, scheduled_end: event.target.value })
                }
              />
            </label>
            <label className="text-sm font-medium">
              Recurrence
              <select
                className={inputClass}
                value={form.recurrence_months}
                onChange={(event) =>
                  setForm({ ...form, recurrence_months: event.target.value })
                }
              >
                <option value="">One-off audit</option>
                <option value="1">Every month</option>
                <option value="3">Every quarter</option>
                <option value="6">Every 6 months</option>
                <option value="12">Every 12 months (annual cycle)</option>
              </select>
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Recurring audits can be rolled to the next occurrence once the
                current window passes.
              </span>
            </label>
            <label className="text-sm font-medium">
              Auditee name
              <input
                className={inputClass}
                value={form.auditee_name}
                onChange={(event) =>
                  setForm({ ...form, auditee_name: event.target.value })
                }
              />
            </label>
            <label className="text-sm font-medium">
              Auditee email
              <input
                type="email"
                className={inputClass}
                value={form.auditee_email}
                onChange={(event) =>
                  setForm({ ...form, auditee_email: event.target.value })
                }
              />
            </label>
            <label className="text-sm font-medium md:col-span-2">
              Assigned auditors (hold Ctrl/Cmd to select several)
              <select
                multiple
                className={`${inputClass} h-28`}
                value={auditorIds.map(String)}
                onChange={(event) =>
                  setAuditorIds(
                    Array.from(event.target.selectedOptions).map((option) =>
                      Number(option.value)
                    )
                  )
                }
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name || user.last_name
                      ? `${user.first_name} ${user.last_name}`.trim()
                      : user.username}
                    {user.role ? ` — ${user.role}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium md:col-span-2">
              Notes
              <textarea
                rows={3}
                className={inputClass}
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
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
              Save schedule
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
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p role="status" className="mt-6 flex items-center gap-2 text-sm">
          <Loader2 className="animate-spin" /> Loading schedules...
        </p>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white">
            <h2 className="border-b border-slate-200 p-4 text-lg font-semibold">
              Upcoming &amp; active ({grouped.upcoming.length})
            </h2>
            {renderTable(grouped.upcoming)}
          </section>
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white">
            <h2 className="border-b border-slate-200 p-4 text-lg font-semibold">
              Completed &amp; cancelled ({grouped.finished.length})
            </h2>
            {renderTable(grouped.finished)}
          </section>
        </>
      )}
    </div>
  );
}
