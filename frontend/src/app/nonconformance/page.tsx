"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Flag,
  Loader2,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";

import {
  getAuditTeamUsers,
  getEngagements,
  type AuditTeamUser,
  type Engagement,
} from "@/lib/api";
import {
  closeNonConformance,
  createNonConformance,
  getNcPatterns,
  getNonConformanceSummary,
  getNonConformances,
  getSourceComparison,
  reopenNonConformance,
  updateNonConformance,
  type NcPatterns,
  type NonConformance,
  type NonConformanceSummary,
  type SourceComparison,
} from "@/lib/nonconformance";
import { downloadConsolidatedPdf } from "@/lib/reportExport";

const severityStyles: Record<string, string> = {
  minor: "bg-slate-100 text-slate-700 border-slate-200",
  major: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

const statusStyles: Record<string, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  investigation: "bg-purple-50 text-purple-700 border-purple-200",
  capa_in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  verification: "bg-indigo-50 text-indigo-700 border-indigo-200",
  closed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function NonConformancePage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [users, setUsers] = useState<AuditTeamUser[]>([]);
  const [records, setRecords] = useState<NonConformance[]>([]);
  const [summary, setSummary] = useState<NonConformanceSummary | null>(null);
  const [patterns, setPatterns] = useState<NcPatterns | null>(null);
  const [comparison, setComparison] = useState<SourceComparison | null>(null);
  const [selected, setSelected] = useState<NonConformance | null>(null);
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
    source: "audit_finding",
    severity: "minor",
    finding_type: "non_conformity",
    category: "other",
    requirement_reference: "",
    due_date: "",
  });

  const [edit, setEdit] = useState({
    investigation_notes: "",
    root_cause: "",
    correction: "",
    corrective_action: "",
    preventive_action: "",
    verification_notes: "",
    management_response: "",
    status: "",
    assigned_to: "",
  });

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
        const [recordData, summaryData, patternData, comparisonData] =
          await Promise.all([
            getNonConformances({
              engagement,
              status: (statusFilter || undefined) as
                | NonConformance["status"]
                | undefined,
            }),
            getNonConformanceSummary(engagement),
            getNcPatterns(engagement),
            getSourceComparison(engagement),
          ]);
        if (!active) return;
        setRecords(recordData);
        setSummary(summaryData);
        setPatterns(patternData);
        setComparison(comparisonData);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load non-conformances."
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

  function openDetail(record: NonConformance) {
    setSelected(record);
    setEdit({
      investigation_notes: record.investigation_notes,
      root_cause: record.root_cause,
      correction: record.correction,
      corrective_action: record.corrective_action,
      preventive_action: record.preventive_action,
      verification_notes: record.verification_notes,
      management_response: record.management_response,
      status: record.status,
      assigned_to: record.assigned_to ? String(record.assigned_to) : "",
    });
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await createNonConformance({
        engagement: Number(form.engagement),
        title: form.title,
        description: form.description,
        source: form.source as NonConformance["source"],
        severity: form.severity as NonConformance["severity"],
        finding_type: form.finding_type as NonConformance["finding_type"],
        category: form.category as NonConformance["category"],
        requirement_reference: form.requirement_reference,
        due_date: form.due_date || null,
      });
      setSuccess("Non-conformance recorded.");
      setShowForm(false);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the record.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDetail() {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateNonConformance(selected.id, {
        investigation_notes: edit.investigation_notes,
        root_cause: edit.root_cause,
        correction: edit.correction,
        corrective_action: edit.corrective_action,
        preventive_action: edit.preventive_action,
        verification_notes: edit.verification_notes,
        management_response: edit.management_response,
        status: edit.status as NonConformance["status"],
        assigned_to: edit.assigned_to ? Number(edit.assigned_to) : null,
      });
      setSelected(updated);
      setSuccess("Non-conformance updated.");
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClose(id: number) {
    setError("");
    try {
      const updated = await closeNonConformance(id);
      setSelected(updated);
      setSuccess(`${updated.reference} verified and closed.`);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Close failed.");
    }
  }

  async function handleReopen(id: number) {
    setError("");
    try {
      const updated = await reopenNonConformance(id);
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
            <Flag aria-hidden="true" /> Non-Conformance (CAPA)
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Identify, investigate, and resolve non-conformances through
            root-cause analysis and corrective/preventive actions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={16} /> Record non-conformance
        </button>
      </div>

      {summary && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-600">Total recorded</p>
            <p className="mt-2 text-3xl font-bold">{summary.total}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-600">Open</p>
            <p className="mt-2 text-3xl font-bold text-blue-700">
              {summary.by_status.open?.count ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-600">In CAPA / verification</p>
            <p className="mt-2 text-3xl font-bold text-amber-700">
              {(summary.by_status.capa_in_progress?.count ?? 0) +
                (summary.by_status.verification?.count ?? 0) +
                (summary.by_status.investigation?.count ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-600">Closed</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {summary.by_status.closed?.count ?? 0}
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
          <h2 className="text-lg font-semibold">New non-conformance</h2>
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
                placeholder="e.g. Unapproved journal entries posted"
              />
            </label>
            <label className="text-sm font-medium">
              Source
              <select
                className={inputClass}
                value={form.source}
                onChange={(event) =>
                  setForm({ ...form, source: event.target.value })
                }
              >
                <option value="audit_finding">Audit finding</option>
                <option value="internal_review">Internal review</option>
                <option value="external_audit">External audit</option>
                <option value="client_complaint">Client complaint</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Severity
              <select
                className={inputClass}
                value={form.severity}
                onChange={(event) =>
                  setForm({ ...form, severity: event.target.value })
                }
              >
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Finding type
              <select
                className={inputClass}
                value={form.finding_type}
                onChange={(event) =>
                  setForm({ ...form, finding_type: event.target.value })
                }
              >
                <option value="observation">Observation (no breach yet)</option>
                <option value="non_conformity">Non-conformity</option>
                <option value="major_non_conformity">Major non-conformity</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Category
              <select
                className={inputClass}
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
              >
                <option value="documentation">Documentation</option>
                <option value="controls">Internal controls</option>
                <option value="operations">Operations</option>
                <option value="financial_records">Financial records</option>
                <option value="reporting">Reporting</option>
                <option value="compliance">Compliance</option>
                <option value="it_systems">IT systems</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="text-sm font-medium md:col-span-2">
              Requirement it fails (clause / standard / manual section)
              <input
                className={inputClass}
                value={form.requirement_reference}
                onChange={(event) =>
                  setForm({ ...form, requirement_reference: event.target.value })
                }
                placeholder="e.g. ISA 505, IFRS 15 §31, Manual §4.2"
              />
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
              Save record
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
            <option value="investigation">Under investigation</option>
            <option value="capa_in_progress">CAPA in progress</option>
            <option value="verification">Awaiting verification</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p role="status" className="mt-6 flex items-center gap-2 text-sm">
          <Loader2 className="animate-spin" /> Loading register...
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-700">
              <tr>
                {["Ref", "Title", "Engagement", "Severity", "Status", "Assigned", "Due"].map(
                  (title) => (
                    <th key={title} className="px-4 py-3">{title}</th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {records.map((record) => (
                <tr
                  key={record.id}
                  className="cursor-pointer align-top hover:bg-slate-50"
                  onClick={() => openDetail(record)}
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {record.reference}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {record.title}
                  </td>
                  <td className="px-4 py-3">{record.engagement_code}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${severityStyles[record.severity]}`}>
                      {record.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[record.status]}`}>
                      {record.status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {record.assigned_to_name || (
                      <span className="text-slate-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {record.due_date || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!records.length && (
            <p className="p-6 text-center text-sm text-slate-600">
              No non-conformances recorded.
            </p>
          )}
        </div>
      )}

      {!loading && (patterns || comparison) && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Cross-engagement insights
            </h2>
            <button
              type="button"
              onClick={() => {
                setError("");
                downloadConsolidatedPdf().catch((err) =>
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Consolidated report download failed."
                  )
                );
              }}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Consolidated findings report (PDF)
            </button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
          {patterns && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold">
                Systemic patterns
                {patterns.systemic_count > 0 && (
                  <span className="ml-2 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                    {patterns.systemic_count} systemic
                  </span>
                )}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                A category found on two or more engagements is one systemic
                pattern, not separate closures. Observations are excluded.
              </p>
              <ul className="mt-3 divide-y divide-slate-100 text-sm">
                {patterns.categories.map((row) => (
                  <li key={row.category} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      {row.label}
                      {row.systemic && (
                        <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-700">
                          systemic
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-slate-600">
                      {row.total} findings · {row.open} open ·{" "}
                      {row.engagement_count} engagement{row.engagement_count === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
                {!patterns.categories.length && (
                  <li className="py-2 text-sm text-slate-500">
                    No findings recorded yet.
                  </li>
                )}
              </ul>
            </div>
          )}
          {comparison && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold">
                Internal vs external findings
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                If external audits find more than internal ones, the internal
                programme is the finding.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-2xl font-bold text-emerald-700">
                    {comparison.totals.internal}
                  </p>
                  <p className="text-xs text-slate-600">Found internally</p>
                </div>
                <div className="rounded-xl bg-red-50 p-3">
                  <p className="text-2xl font-bold text-red-700">
                    {comparison.totals.external}
                  </p>
                  <p className="text-xs text-slate-600">Found externally</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-2xl font-bold text-slate-700">
                    {comparison.totals.other}
                  </p>
                  <p className="text-xs text-slate-600">Other sources</p>
                </div>
              </div>
              <ul className="mt-3 divide-y divide-slate-100 text-sm">
                {comparison.engagements.map((row) => (
                  <li key={row.engagement} className="flex items-center justify-between gap-3 py-2">
                    <span className="font-medium">{row.engagement_code}</span>
                    <span className="text-xs text-slate-600">
                      {row.internal} internal · {row.external} external
                      {row.other ? ` · ${row.other} other` : ""}
                    </span>
                  </li>
                ))}
                {!comparison.engagements.length && (
                  <li className="py-2 text-sm text-slate-500">
                    No findings recorded yet.
                  </li>
                )}
              </ul>
            </div>
          )}
          </div>
        </section>
      )}

      {selected && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">
                {selected.reference} — {selected.title}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {selected.engagement_code} ·{" "}
                {selected.finding_type.replaceAll("_", " ")} ·{" "}
                {selected.category.replaceAll("_", " ")} · raised by{" "}
                {selected.raised_by_username || "unknown"} ·{" "}
                {selected.description}
              </p>
              {selected.requirement_reference && (
                <p className="mt-2 inline-block rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">
                  Requirement: {selected.requirement_reference}
                </p>
              )}
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
              Status
              <select
                className={inputClass}
                value={edit.status}
                onChange={(event) =>
                  setEdit({ ...edit, status: event.target.value })
                }
                disabled={selected.status === "closed"}
              >
                <option value="open">Open</option>
                <option value="investigation">Under investigation</option>
                <option value="capa_in_progress">CAPA in progress</option>
                <option value="verification">Awaiting verification</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Assigned to
              <select
                className={inputClass}
                value={edit.assigned_to}
                onChange={(event) =>
                  setEdit({ ...edit, assigned_to: event.target.value })
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
            <label className="text-sm font-medium md:col-span-2">
              Investigation notes
              <textarea
                rows={2}
                className={inputClass}
                value={edit.investigation_notes}
                onChange={(event) =>
                  setEdit({ ...edit, investigation_notes: event.target.value })
                }
              />
            </label>
            <label className="text-sm font-medium">
              Root cause
              <textarea
                rows={3}
                className={inputClass}
                value={edit.root_cause}
                onChange={(event) =>
                  setEdit({ ...edit, root_cause: event.target.value })
                }
              />
            </label>
            <label className="text-sm font-medium">
              Correction (immediate fix)
              <textarea
                rows={3}
                className={inputClass}
                value={edit.correction}
                onChange={(event) =>
                  setEdit({ ...edit, correction: event.target.value })
                }
                placeholder="The instance found was fixed by..."
              />
            </label>
            <label className="text-sm font-medium">
              Corrective action (against the root cause)
              <textarea
                rows={3}
                className={inputClass}
                value={edit.corrective_action}
                onChange={(event) =>
                  setEdit({ ...edit, corrective_action: event.target.value })
                }
                placeholder="What changed so this cannot recur..."
              />
            </label>
            <label className="text-sm font-medium md:col-span-2">
              Preventive action
              <textarea
                rows={2}
                className={inputClass}
                value={edit.preventive_action}
                onChange={(event) =>
                  setEdit({ ...edit, preventive_action: event.target.value })
                }
              />
            </label>
            <label className="text-sm font-medium md:col-span-2">
              Verification notes (evidence the change held)
              <textarea
                rows={2}
                className={inputClass}
                value={edit.verification_notes}
                onChange={(event) =>
                  setEdit({ ...edit, verification_notes: event.target.value })
                }
                placeholder="Recorded at a later date: how the fix was verified..."
              />
            </label>
            <label className="text-sm font-medium md:col-span-2">
              Management response (for the management letter)
              <textarea
                rows={2}
                className={inputClass}
                value={edit.management_response}
                onChange={(event) =>
                  setEdit({ ...edit, management_response: event.target.value })
                }
                placeholder="The entity's formal response and committed actions..."
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {selected.status !== "closed" && (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveDetail}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Save changes
                </button>
                <button
                  type="button"
                  onClick={() => handleClose(selected.id)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 size={16} /> Verify &amp; close
                </button>
              </>
            )}
            {selected.status === "closed" && (
              <>
                <p className="text-sm text-emerald-700">
                  Closed by {selected.verified_by_username || "unknown"}{" "}
                  {selected.closed_at &&
                    `on ${new Date(selected.closed_at).toLocaleString("en-GB")}`}
                  .
                </p>
                <button
                  type="button"
                  onClick={() => handleReopen(selected.id)}
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
