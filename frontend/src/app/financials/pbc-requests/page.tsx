"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AuthUser } from "@/components/layout/AppLayout";
import FinancialEvidencePanel from "@/components/financials/FinancialEvidencePanel";
import { apiRequest, getEngagements, type Engagement } from "@/lib/api";
import { getEvidenceLinks, type EvidenceLink, type EvidencePage } from "@/lib/financialEvidence";
import {
  createPBCRequest, getPBCEvents, getPBCRequest, getPBCRequests, getPBCSummary, pbcStates, recordPBCEvent,
  type PBCAction, type PBCEvent, type PBCInput, type PBCRequest, type PBCSummary,
} from "@/lib/pbc";

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm";
const buttonClass = "rounded-lg border px-3 py-2 text-sm disabled:opacity-50";
const primaryClass = `${buttonClass} bg-slate-900 text-white`;
const blankRequest = (): Omit<PBCInput, "engagement"> => ({
  title: "", description: "", requested_from: "", responsible_name: "", due_date: "", priority: "normal",
});

export default function PBCRequestsPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [engagement, setEngagement] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [requests, setRequests] = useState<EvidencePage<PBCRequest> | null>(null);
  const [summary, setSummary] = useState<PBCSummary | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [overdue, setOverdue] = useState(false);
  const [form, setForm] = useState(blankRequest);
  const [selected, setSelected] = useState<PBCRequest | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getEngagements(), apiRequest<{ authenticated: boolean; user?: AuthUser }>("/auth/me/")]).then(
      ([data, session]) => {
        if (!active) return;
        if (!session.authenticated || !session.user) {
          setError("Could not verify the current PBC user."); setLoading(false); return;
        }
        setUser(session.user); setEngagements(data);
        if (data.length) setEngagement(String(data[0].id));
        else setLoading(false);
      }, (err: unknown) => {
        if (active) { setError(err instanceof Error ? err.message : "Could not load engagements."); setLoading(false); }
      },
    );
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!engagement) return;
    let active = true;
    Promise.all([getPBCRequests(Number(engagement), page, filter, overdue), getPBCSummary(Number(engagement))]).then(
      ([list, totals]) => { if (active) { setRequests(list); setSummary(totals); setLoading(false); } },
      (err: unknown) => { if (active) { setError(err instanceof Error ? err.message : "Could not load PBC requests."); setLoading(false); } },
    );
    return () => { active = false; };
  }, [engagement, page, filter, overdue, refresh]);

  async function create() {
    setBusy(true); setError(""); setSuccess("");
    try {
      const data = await createPBCRequest({ ...form, engagement: Number(engagement) });
      setSelected(data); setForm(blankRequest()); setPage(1); setFilter(""); setOverdue(false);
      setLoading(true); setRefresh((value) => value + 1); setSuccess(`PBC request #${data.id} created.`);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create the request."); }
    finally { setBusy(false); }
  }
  async function open(id: number) {
    setBusy(true); setError(""); setSuccess("");
    try { setSelected(await getPBCRequest(id)); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load the request."); }
    finally { setBusy(false); }
  }
  const canWrite = user && ["staff", "auditor", "manager", "admin"].includes(user.role);
  const disabled = busy || detailBusy;
  return <main className="space-y-5 p-6">
    <header>
      <Link className="text-sm text-blue-700" href="/financials">Back to Financials</Link>
      <h1 className="mt-2 text-2xl font-semibold">PBC Document Requests</h1>
      <p className="mt-2 text-sm text-slate-600">Track prepared-by-client documents internally: request, collect private evidence,
        submit a document package, then accept or return it for further work. No client portal or automatic email is provided.</p>
    </header>
    {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-700">{error}</p>}
    {success && <p role="status" className="text-green-800">{success}</p>}
    <label className="block max-w-md text-sm">Engagement<select className={inputClass} value={engagement} disabled={disabled}
      onChange={(event) => {
        setEngagement(event.target.value); setSelected(null); setRequests(null); setSummary(null); setForm(blankRequest());
        setPage(1); setFilter(""); setOverdue(false); setLoading(Boolean(event.target.value)); setError(""); setSuccess("");
      }}>
      <option value="">Select engagement</option>{engagements.map((item) =>
        <option key={item.id} value={item.id}>{item.engagement_code || item.title}</option>)}
    </select></label>
    {summary && <section className="rounded-xl border bg-white p-4 text-sm">
      <h2 className="font-semibold">Entire engagement register ({summary.total})</h2>
      <p className="mt-2">{Object.entries(summary.counts).map(([state, count]) =>
        `${pbcStates[state as keyof typeof pbcStates]}: ${count}`).join("; ")}.</p>
      <p className="mt-1">Overdue unresolved requests: {summary.overdue}; as of {summary.as_of}.
        Accepted and cancelled requests are not overdue.</p>
    </section>}
    {canWrite && <section className="rounded-xl border bg-white p-5">
      <h2 className="font-semibold">Create a document request</h2>
      <p className="mt-2 text-sm">Request details are retained unchanged. A manager/admin can cancel an incorrect request;
        create a replacement for a changed deadline or scope. Responsible person is recorded text, not a user assignment or notification.</p>
      <form onSubmit={(event) => { event.preventDefault(); void create(); }}>
        <fieldset className="mt-4 grid gap-3 md:grid-cols-2" disabled={disabled || loading || !engagement}>
          <label className="text-sm">Request title<input className={inputClass} required maxLength={200}
            value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label className="text-sm">Due date<input className={inputClass} type="date" required value={form.due_date}
            onChange={(event) => setForm({ ...form, due_date: event.target.value })} /></label>
          <label className="text-sm">Requested from (client contact)<input className={inputClass} required maxLength={200}
            value={form.requested_from} onChange={(event) => setForm({ ...form, requested_from: event.target.value })} /></label>
          <label className="text-sm">Internal responsible person<input className={inputClass} required maxLength={200}
            value={form.responsible_name} onChange={(event) => setForm({ ...form, responsible_name: event.target.value })} /></label>
          <label className="text-sm">Required documents and period<textarea className={inputClass} required maxLength={5000}
            value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="text-sm">Priority<select className={inputClass} value={form.priority}
            onChange={(event) => setForm({ ...form, priority: event.target.value as PBCInput["priority"] })}>
            <option value="normal">Normal</option><option value="high">High</option><option value="low">Low</option>
          </select></label>
          <button className={primaryClass}>Create PBC request</button>
        </fieldset>
      </form>
    </section>}
    <section className="space-y-3 rounded-xl border bg-white p-5">
      <h2 className="font-semibold">Request register ({requests?.count || 0} matching requests)</h2>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">Request status<select className={inputClass} value={filter} disabled={disabled}
          onChange={(event) => { setFilter(event.target.value); setPage(1); setRequests(null); setLoading(true); }}>
          <option value="">All statuses</option>{Object.entries(pbcStates).map(([value, label]) =>
            <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label className="text-sm"><input type="checkbox" checked={overdue} disabled={disabled}
          onChange={(event) => { setOverdue(event.target.checked); setPage(1); setRequests(null); setLoading(true); }} />
          {" "}Overdue only</label>
        <button className={buttonClass} disabled={disabled || !engagement} onClick={() => {
          setLoading(true); setError(""); setRefresh((value) => value + 1);
        }}>Refresh register</button>
      </div>
      {loading && <p role="status">Loading PBC requests...</p>}
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead><tr className="border-b"><th className="p-2">Request</th><th>Client contact</th><th>Responsible</th><th>Due</th><th>Priority</th><th>Status</th><th /></tr></thead>
        <tbody>{requests?.results.map((item) => <tr key={item.id} className="border-b">
          <td className="p-2">#{item.id}: {item.title}</td><td>{item.requested_from}</td><td>{item.responsible_name}</td>
          <td className={item.overdue ? "text-red-700" : ""}>{item.due_date}{item.overdue ? " - Overdue" : ""}</td>
          <td>{item.priority}</td><td>{pbcStates[item.state]}</td><td className="p-2">
            <button className={buttonClass} disabled={disabled} onClick={() => void open(item.id)}>Open request</button>
          </td>
        </tr>)}</tbody>
      </table></div>
      {!loading && requests?.count === 0 && <p className="text-sm">No requests match these filters.</p>}
      <div className="flex gap-3">
        <button className={buttonClass} disabled={disabled || loading || !requests?.previous} onClick={() => {
          setLoading(true); setRequests(null); setPage((value) => value - 1);
        }}>Previous requests</button>
        <button className={buttonClass} disabled={disabled || loading || !requests?.next} onClick={() => {
          setLoading(true); setRequests(null); setPage((value) => value + 1);
        }}>Next requests</button>
      </div>
    </section>
    {selected && user && <PBCDetail key={`${selected.id}:${selected.latest_event || 0}`} request={selected} user={user}
      onBusy={setDetailBusy} onChanged={(data) => {
        setSelected(data); setLoading(true); setRefresh((value) => value + 1);
      }} />}
  </main>;
}

function PBCDetail({ request, user, onBusy, onChanged }: {
  request: PBCRequest; user: AuthUser; onBusy: (value: boolean) => void; onChanged: (data: PBCRequest) => void;
}) {
  const [links, setLinks] = useState<EvidencePage<EvidenceLink> | null>(null);
  const [history, setHistory] = useState<EvidencePage<PBCEvent> | null>(null);
  const [linkPage, setLinkPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedLinks, setSelectedLinks] = useState<number[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const mounted = useRef(false);
  const target = { target_kind: "pbc_request" as const, target_id: request.id, selector: -1, label: `PBC #${request.id}: ${request.title}` };
  const canWrite = ["staff", "auditor", "manager", "admin"].includes(user.role);
  const manager = user.role === "manager" || user.role === "admin";
  const canSubmit = request.state === "open" || request.state === "returned";
  const disabled = busy || loading || saved;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    let active = true;
    Promise.all([
      getEvidenceLinks(request.engagement, {
        target_kind: "pbc_request", target_id: request.id, selector: -1, label: "",
      }, linkPage),
      getPBCEvents(request.id, historyPage),
    ]).then(([evidence, events]) => {
      if (active) { setLinks(evidence); setHistory(events); setLoading(false); }
    }, (err: unknown) => {
      if (active) { setError(err instanceof Error ? err.message : "Could not load request support."); setLoading(false); }
    });
    return () => { active = false; };
  }, [request.id, request.engagement, linkPage, historyPage, refresh]);

  async function reload() {
    setBusy(true); onBusy(true); setError("");
    try {
      const data = await getPBCRequest(request.id);
      if (!mounted.current) return;
      setNote(""); setSelectedLinks([]); setSaved(false); setLoading(true); setRefresh((value) => value + 1);
      onBusy(false);
      onChanged(data);
    } catch (err) { if (mounted.current) setError(err instanceof Error ? err.message : "Could not refresh the request."); }
    finally { if (mounted.current) { setBusy(false); onBusy(false); } }
  }
  async function act(action: PBCAction) {
    setBusy(true); onBusy(true); setError("");
    try {
      await recordPBCEvent({
        request: request.id, action, expected_previous: request.latest_event, note,
        ...(action === "submit" ? { evidence_link_ids: selectedLinks } : {}),
      });
      if (!mounted.current) return;
      setSaved(true); setNote(""); setSelectedLinks([]);
      try {
        const data = await getPBCRequest(request.id);
        if (mounted.current) { onBusy(false); onChanged(data); }
      } catch (err) {
        if (mounted.current) setError(`Action was saved, but refreshing failed. Refresh before any further action. ${err instanceof Error ? err.message : ""}`);
      }
    } catch (err) { if (mounted.current) setError(err instanceof Error ? err.message : "Could not save the PBC action."); }
    finally { if (mounted.current) { setBusy(false); onBusy(false); } }
  }
  return <section className="space-y-4 rounded-xl border border-blue-200 bg-white p-5">
    <h2 className="font-semibold">PBC #{request.id}: {request.title}</h2>
    <p className="text-sm">{request.description}</p>
    <p className="text-sm">Requested from: {request.requested_from}; responsible: {request.responsible_name};
      due: {request.due_date}; priority: {request.priority}; {pbcStates[request.state]}{request.overdue ? " - Overdue" : ""}.</p>
    <p className="text-sm">Acceptance confirms this specific submitted package was reviewed, not audit assurance,
      finding sign-off or completeness of all engagement evidence. Uploading alone does not submit or accept documents.</p>
    {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {saved && <p role="status" className="text-sm text-green-800">Action saved. Refreshing the request; further actions require the latest status.</p>}
    <button className={buttonClass} disabled={busy} onClick={() => void reload()}>Refresh selected request</button>
    <FinancialEvidencePanel engagement={request.engagement} targets={[target]} readOnly={!canWrite || !canSubmit || busy || saved}
      onLinked={() => { setLoading(true); setRefresh((value) => value + 1); }} />
    {loading && <p role="status" className="text-sm">Loading request support and history...</p>}
    {canWrite && canSubmit && <fieldset className="space-y-2 rounded bg-slate-50 p-3" disabled={disabled}>
      <legend className="text-sm font-medium">Select linked documents for this submission ({selectedLinks.length} selected, max 100)</legend>
      {links?.results.map((link) => <label key={link.id} className="block text-sm">
        <input type="checkbox" checked={selectedLinks.includes(link.id)} onChange={(event) => {
          if (event.target.checked && selectedLinks.length >= 100) { setError("Select at most 100 evidence links per submission."); return; }
          setSelectedLinks(event.target.checked ? [...selectedLinks, link.id] : selectedLinks.filter((id) => id !== link.id));
        }} />{" "}Link #{link.id}: {link.evidence_metadata.title} ({link.evidence_metadata.filename})
      </label>)}
      {!links?.count && <p className="text-sm">Upload or reuse an attachment above before submitting.</p>}
      <div className="flex gap-3">
        <button className={buttonClass} disabled={!links?.previous} onClick={() => {
          setLoading(true); setLinks(null); setLinkPage((value) => value - 1);
        }}>Previous submission documents</button>
        <button className={buttonClass} disabled={!links?.next} onClick={() => {
          setLoading(true); setLinks(null); setLinkPage((value) => value + 1);
        }}>Next submission documents</button>
      </div>
      <p className="text-xs">Selections persist across document pages. Only selected link IDs enter the saved package.</p>
    </fieldset>}
    {canWrite && request.state !== "cancelled" && <div className="space-y-3">
      <label className="block text-sm">Submission / decision rationale<textarea className={inputClass} disabled={disabled}
        maxLength={5000} value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <div className="flex flex-wrap gap-3">
        {canSubmit && <button className={primaryClass} disabled={disabled || !note.trim() || !selectedLinks.length}
          onClick={() => void act("submit")}>Submit selected documents</button>}
        {manager && request.state === "submitted" && <>
          <button className={buttonClass} disabled={disabled || !note.trim()} onClick={() => void act("accept")}>Accept document package</button>
          <button className={buttonClass} disabled={disabled || !note.trim()} onClick={() => void act("return")}>Return for documents</button>
        </>}
        {manager && request.state === "accepted" && <button className={buttonClass} disabled={disabled || !note.trim()}
          onClick={() => void act("reopen")}>Reopen accepted request</button>}
        {manager && <button className={buttonClass} disabled={disabled || !note.trim()}
          onClick={() => void act("cancel")}>Cancel request</button>}
      </div>
    </div>}
    <h3 className="font-medium">Immutable submission and decision history ({history?.count || 0})</h3>
    {history?.results.map((event) => <article key={event.id} className="space-y-1 rounded border p-3 text-sm">
      <p>Action #{event.id}: {event.action} - {pbcStates[event.state]}; {event.created_at}.</p>
      <p>By {event.actor_name} ({event.actor_role}, user #{event.actor_identifier}); previous action: {event.previous || "None"}.</p>
      <p>{event.note}</p><p>Package evidence link IDs: {event.evidence_link_ids.join(", ") || "None"}.</p>
    </article>)}
    {!loading && history?.count === 0 && <p className="text-sm">No document package has been submitted.</p>}
    <div className="flex gap-3">
      <button className={buttonClass} disabled={disabled || !history?.previous} onClick={() => {
        setLoading(true); setHistory(null); setHistoryPage((value) => value - 1);
      }}>Previous PBC actions</button>
      <button className={buttonClass} disabled={disabled || !history?.next} onClick={() => {
        setLoading(true); setHistory(null); setHistoryPage((value) => value + 1);
      }}>Next PBC actions</button>
    </div>
  </section>;
}
