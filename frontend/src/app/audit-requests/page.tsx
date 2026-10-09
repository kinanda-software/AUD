"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Inbox,
  Loader2,
  Plus,
  X,
  XCircle,
} from "lucide-react";

import {
  getAuditTeamUsers,
  getClients,
  type AuditTeamUser,
  type ClientRecord,
} from "@/lib/api";
import {
  convertAuditRequest,
  createAuditRequest,
  getAuditRequests,
  getAuditRequestSummary,
  reviewAuditRequest,
  type AuditRequest,
  type AuditRequestSummary,
} from "@/lib/auditRequests";

const statusStyles: Record<string, string> = {
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  under_review: "bg-purple-50 text-purple-700 border-purple-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  converted: "bg-slate-100 text-slate-700 border-slate-200",
};

const AUDIT_TYPE_LABELS: Record<string, string> = {
  financial_statement: "Financial statement audit",
  compliance: "Compliance audit",
  internal_control: "Internal controls review",
  it_audit: "IT audit",
  other: "Other",
};

export default function AuditRequestsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [users, setUsers] = useState<AuditTeamUser[]>([]);
  const [requests, setRequests] = useState<AuditRequest[]>([]);
  const [summary, setSummary] = useState<AuditRequestSummary | null>(null);
  const [selected, setSelected] = useState<AuditRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");

  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    client: "",
    audit_type: "financial_statement",
    preferred_start_date: "",
    scope_notes: "",
  });

  const [reviewNotes, setReviewNotes] = useState("");
  const [convertForm, setConvertForm] = useState({
    engagement_code: "",
    start_date: "",
    planned_end_date: "",
    financial_year_end: "",
    lead_auditor: "",
  });

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [clientData, userData, requestData, summaryData] =
          await Promise.all([
            getClients(),
            getAuditTeamUsers(),
            getAuditRequests({
              status: (statusFilter || undefined) as
                | AuditRequest["status"]
                | undefined,
            }),
            getAuditRequestSummary(),
          ]);
        if (!active) return;
        setClients(clientData);
        setUsers(userData.filter((user) => user.is_active !== false));
        setRequests(requestData);
        setSummary(summaryData);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load audit requests."
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

  function openDetail(record: AuditRequest) {
    setSelected(record);
    setReviewNotes(record.review_notes);
    setConvertForm({
      engagement_code: "",
      start_date: record.preferred_start_date ?? "",
      planned_end_date: record.preferred_end_date ?? "",
      financial_year_end: "",
      lead_auditor: "",
    });
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await createAuditRequest({
        company_name: form.company_name,
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        client: form.client ? Number(form.client) : null,
        audit_type: form.audit_type as AuditRequest["audit_type"],
        preferred_start_date: form.preferred_start_date || null,
        scope_notes: form.scope_notes,
      });
      setSuccess("Audit request submitted.");
      setShowForm(false);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReview(decision: "under_review" | "accept" | "reject") {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const updated = await reviewAuditRequest(
        selected.id,
        decision,
        reviewNotes
      );
      setSelected(updated);
      setSuccess(
        decision === "accept"
          ? `${updated.reference} accepted — ready to convert.`
          : decision === "reject"
            ? `${updated.reference} rejected.`
            : `${updated.reference} marked under review.`
      );
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConvert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await convertAuditRequest(selected.id, {
        engagement_code: convertForm.engagement_code.trim(),
        start_date: convertForm.start_date,
        planned_end_date: convertForm.planned_end_date || null,
        financial_year_end: convertForm.financial_year_end || null,
        lead_auditor: convertForm.lead_auditor
          ? Number(convertForm.lead_auditor)
          : null,
      });
      setSelected(updated);
      setSuccess(
        `Engagement ${updated.engagement_code} created from ${updated.reference}.`
      );
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm";

  return (
    <div className="w-full px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
            <Inbox aria-hidden="true" /> Audit Requests
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Intake pipeline for incoming audit requests: review, accept, and
            convert approved requests into engagements.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={16} /> Log request
        </button>
      </div>

      {summary && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-600">Total requests</p>
            <p className="mt-2 text-3xl font-bold">{summary.total}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-600">Awaiting review</p>
            <p className="mt-2 text-3xl font-bold text-amber-700">
              {summary.awaiting_review}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-600">Converted</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {summary.by_status.converted?.count ?? 0}
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
          <h2 className="text-lg font-semibold">Log an audit request</h2>
          <fieldset disabled={saving} className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Company name
              <input
                required
                className={inputClass}
                value={form.company_name}
                onChange={(event) =>
                  setForm({ ...form, company_name: event.target.value })
                }
              />
            </label>
            <label className="text-sm font-medium">
              Existing client (optional)
              <select
                className={inputClass}
                value={form.client}
                onChange={(event) =>
                  setForm({ ...form, client: event.target.value })
                }
              >
                <option value="">Not a registered client</option>
                {clients.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.client_code} — {item.legal_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Contact name
              <input
                required
                className={inputClass}
                value={form.contact_name}
                onChange={(event) =>
                  setForm({ ...form, contact_name: event.target.value })
                }
              />
            </label>
            <label className="text-sm font-medium">
              Contact email
              <input
                required
                type="email"
                className={inputClass}
                value={form.contact_email}
                onChange={(event) =>
                  setForm({ ...form, contact_email: event.target.value })
                }
              />
            </label>
            <label className="text-sm font-medium">
              Contact phone
              <input
                className={inputClass}
                value={form.contact_phone}
                onChange={(event) =>
                  setForm({ ...form, contact_phone: event.target.value })
                }
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
                {Object.entries(AUDIT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Preferred start date
              <input
                type="date"
                className={inputClass}
                value={form.preferred_start_date}
                onChange={(event) =>
                  setForm({ ...form, preferred_start_date: event.target.value })
                }
              />
            </label>
            <label className="text-sm font-medium md:col-span-2">
              Scope notes
              <textarea
                rows={3}
                className={inputClass}
                value={form.scope_notes}
                onChange={(event) =>
                  setForm({ ...form, scope_notes: event.target.value })
                }
                placeholder="Scope, locations, periods, special requirements..."
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
              Submit request
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
          Status
          <select
            className={inputClass}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under review</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="converted">Converted</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p role="status" className="mt-6 flex items-center gap-2 text-sm">
          <Loader2 className="animate-spin" /> Loading requests...
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-700">
              <tr>
                {["Ref", "Company", "Type", "Preferred start", "Status", "Reviewed by"].map(
                  (title) => (
                    <th key={title} className="px-4 py-3">{title}</th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {requests.map((record) => (
                <tr
                  key={record.id}
                  className="cursor-pointer align-top hover:bg-slate-50"
                  onClick={() => openDetail(record)}
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {record.reference}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {record.company_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {record.contact_name} · {record.contact_email}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {AUDIT_TYPE_LABELS[record.audit_type] || record.audit_type}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {record.preferred_start_date || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[record.status]}`}>
                      {record.status.replaceAll("_", " ")}
                    </span>
                    {record.status === "converted" && record.engagement && (
                      <Link
                        href={`/engagements/${record.engagement}`}
                        onClick={(event) => event.stopPropagation()}
                        className="mt-1 block text-xs font-semibold text-blue-700 hover:underline"
                      >
                        {record.engagement_code}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {record.reviewed_by_username || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!requests.length && (
            <p className="p-6 text-center text-sm text-slate-600">
              No audit requests found.
            </p>
          )}
        </div>
      )}

      {selected && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">
                {selected.reference} — {selected.company_name}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {AUDIT_TYPE_LABELS[selected.audit_type]} ·{" "}
                {selected.contact_name} ({selected.contact_email})
              </p>
              {selected.scope_notes && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                  {selected.scope_notes}
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

          {selected.status !== "converted" && selected.status !== "rejected" && (
            <div className="mt-4">
              <label className="text-sm font-medium">
                Review notes
                <textarea
                  rows={2}
                  className={inputClass}
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-3">
                {selected.status === "submitted" && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleReview("under_review")}
                    className="rounded-xl border border-purple-300 px-4 py-2.5 text-sm font-semibold text-purple-700"
                  >
                    Mark under review
                  </button>
                )}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleReview("accept")}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} /> Accept
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleReview("reject")}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle size={16} /> Reject
                </button>
              </div>
            </div>
          )}

          {selected.status === "accepted" && (
            <form
              onSubmit={handleConvert}
              className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
            >
              <h3 className="text-sm font-semibold text-emerald-900">
                Convert to engagement
              </h3>
              <fieldset disabled={saving} className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-slate-700">
                  Engagement code
                  <input
                    required
                    className={inputClass}
                    value={convertForm.engagement_code}
                    onChange={(event) =>
                      setConvertForm({ ...convertForm, engagement_code: event.target.value })
                    }
                  />
                </label>
                <label className="text-xs font-medium text-slate-700">
                  Lead auditor (optional)
                  <select
                    className={inputClass}
                    value={convertForm.lead_auditor}
                    onChange={(event) =>
                      setConvertForm({ ...convertForm, lead_auditor: event.target.value })
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
                <label className="text-xs font-medium text-slate-700">
                  Start date
                  <input
                    required
                    type="date"
                    className={inputClass}
                    value={convertForm.start_date}
                    onChange={(event) =>
                      setConvertForm({ ...convertForm, start_date: event.target.value })
                    }
                  />
                </label>
                <label className="text-xs font-medium text-slate-700">
                  Planned end date
                  <input
                    type="date"
                    className={inputClass}
                    value={convertForm.planned_end_date}
                    onChange={(event) =>
                      setConvertForm({ ...convertForm, planned_end_date: event.target.value })
                    }
                  />
                </label>
                <label className="text-xs font-medium text-slate-700 sm:col-span-2">
                  Financial year end
                  <input
                    type="date"
                    className={inputClass}
                    value={convertForm.financial_year_end}
                    onChange={(event) =>
                      setConvertForm({ ...convertForm, financial_year_end: event.target.value })
                    }
                  />
                </label>
              </fieldset>
              <button
                type="submit"
                disabled={saving}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ArrowRight size={16} />
                )}
                Create engagement
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
