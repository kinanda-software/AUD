"use client";

import { useEffect, useRef, useState } from "react";
import type { AuthUser } from "@/components/layout/AppLayout";
import { apiRequest } from "@/lib/api";
import { journalRules, type IntelligenceRun } from "@/lib/auditIntelligence";
import type { EvidencePage } from "@/lib/financialEvidence";
import {
  getReviewHistory, getReviewStatus, recordReview, reviewOutcomes, reviewStates,
  type FindingReview, type ReviewAction, type ReviewOutcome, type ReviewStatus,
} from "@/lib/findingReviews";

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm";
const buttonClass = "rounded-lg border px-3 py-2 text-sm disabled:opacity-50";

export default function FindingReviewPanel({ run, offset }: { run: IntelligenceRun; offset: number }) {
  const [status, setStatus] = useState<ReviewStatus | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [selected, setSelected] = useState(offset);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      getReviewStatus(run.id, offset),
      apiRequest<{ authenticated: boolean; user?: AuthUser }>("/auth/me/"),
    ]).then(([data, session]) => {
      if (!active) return;
      if (!session.authenticated || !session.user) {
        setError("Could not verify the current review user."); setLoading(false); return;
      }
      setStatus(data); setUser(session.user); setLoading(false);
    }, (err: unknown) => {
      if (active) { setError(err instanceof Error ? err.message : "Could not load finding reviews."); setLoading(false); }
    });
    return () => { active = false; };
  }, [run.id, offset, refresh]);

  function reload() {
    setLoading(true); setError(""); setStatus(null); setRefresh((value) => value + 1);
  }
  const current = status?.results.find((item) => item.finding_index === selected);
  return <section className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
    <h2 className="font-semibold">Finding review and independent sign-off</h2>
    <p className="text-sm">Record your investigation and conclusion. A different manager/admin must sign off.
      Confirmed exceptions can be signed off as reviewed exceptions, not as corrected transactions or an audit opinion.
      Further-work outcomes cannot be signed off. Every action is retained.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {success && <p role="status" className="text-sm text-green-800">{success}</p>}
    <button className={buttonClass} disabled={busy || loading} onClick={reload}>Refresh review status</button>
    {loading && <p role="status" className="text-sm">Loading finding review status...</p>}
    {status && <p className="text-sm">Entire run: {Object.entries(status.counts).map(([state, count]) =>
      `${reviewStates[state as keyof typeof reviewStates]}: ${count}`).join("; ")}.</p>}
    {status && user && <>
      <label className="block text-sm">Finding to review (current findings page)
        <select className={inputClass} disabled={busy || loading} value={selected} onChange={(event) => {
          setSelected(Number(event.target.value)); setSuccess(""); setError("");
        }}>
          {status.results.map((item) => <option key={item.finding_index} value={item.finding_index}>
            #{item.finding_index + 1}: {journalRules[run.results.findings[item.finding_index].rule]} - {reviewStates[item.state]}
          </option>)}
        </select>
      </label>
      {current && <ReviewDetail key={`${run.id}:${selected}:${current.latest?.id || 0}`}
        run={run} index={selected} latest={current.latest} user={user}
        onBusy={setBusy} onSaved={() => { setSuccess("Review action saved to the immutable history."); reload(); }} />}
    </>}
  </section>;
}

function ReviewDetail({ run, index, latest, user, onBusy, onSaved }: {
  run: IntelligenceRun; index: number; latest: FindingReview | null; user: AuthUser;
  onBusy: (value: boolean) => void; onSaved: () => void;
}) {
  const [history, setHistory] = useState<EvidencePage<FindingReview> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [outcome, setOutcome] = useState<ReviewOutcome>(latest?.outcome || "follow_up");
  const [conclusion, setConclusion] = useState(latest?.conclusion || "");
  const [note, setNote] = useState("");
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    let active = true;
    getReviewHistory(run.id, index, page).then((data) => {
      if (active) { setHistory(data); setLoading(false); }
    }, (err: unknown) => {
      if (active) { setError(err instanceof Error ? err.message : "Could not load review history."); setLoading(false); }
    });
    return () => { active = false; };
  }, [run.id, index, page, retry]);

  async function save(action: ReviewAction) {
    setBusy(true); onBusy(true); setError("");
    try {
      await recordReview({
        run: run.id, finding_index: index, action, expected_previous: latest?.id || null, note,
        ...(action === "review" ? { outcome, conclusion } : {}),
      });
      if (mounted.current) { onBusy(false); onSaved(); }
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : "Could not save review action.");
    } finally {
      if (mounted.current) { setBusy(false); onBusy(false); }
    }
  }
  const manager = user.role === "manager" || user.role === "admin";
  const canReview = ["staff", "auditor", "manager", "admin"].includes(user.role);
  const signed = latest?.state === "signed_off";
  const reviewed = latest?.state === "reviewed";
  const canSign = manager && reviewed && latest.actor_identifier !== user.id && latest.outcome !== "follow_up";
  const disabled = busy || loading;
  const finding = run.results.findings[index];
  return <div className="space-y-3">
    <p className="text-sm font-medium">Finding #{index + 1}: {finding.message}</p>
    {latest && <div className="space-y-1 rounded bg-white p-3 text-sm">
      <p>{reviewStates[latest.state]} - {reviewOutcomes[latest.outcome]}</p>
      <p>Current conclusion: {latest.conclusion}</p>
      <p>Latest action #{latest.id}: {latest.action} by {latest.actor_name} ({latest.actor_role}) at {latest.created_at}.</p>
      <p>Evidence link IDs captured for this outcome: {latest.evidence_link_ids.join(", ") || "None"}.
        New attachments do not automatically become part of an existing outcome/sign-off.</p>
    </div>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {loading && <p role="status" className="text-sm">Loading review history...</p>}
    {canReview ? <form onSubmit={(event) => { event.preventDefault(); void save("review"); }}>
      <fieldset disabled={disabled} className="space-y-3">
        {!signed && <>
          <label className="block text-sm">Review outcome<select className={inputClass} value={outcome}
            onChange={(event) => setOutcome(event.target.value as ReviewOutcome)}>
            {Object.entries(reviewOutcomes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label className="block text-sm">Investigation and conclusion<textarea className={inputClass} maxLength={5000}
            required value={conclusion} onChange={(event) => setConclusion(event.target.value)} /></label>
        </>}
        <label className="block text-sm">Action rationale / reviewer note<textarea className={inputClass} maxLength={5000}
          required value={note} onChange={(event) => setNote(event.target.value)} /></label>
        <div className="flex flex-wrap gap-3">
          {!signed && <button className={buttonClass} disabled={!conclusion.trim() || !note.trim()}>Record review outcome</button>}
          {manager && reviewed && <>
            <button className={buttonClass} type="button" disabled={!canSign || !note.trim()}
              onClick={() => void save("sign_off")}>Independent sign-off</button>
            <button className={buttonClass} type="button" disabled={!note.trim()}
              onClick={() => void save("return")}>Return for further work</button>
          </>}
          {manager && signed && <button className={buttonClass} type="button" disabled={!note.trim()}
            onClick={() => void save("reopen")}>Reopen signed-off finding</button>}
        </div>
        {reviewed && manager && <p className="text-sm">Sign-off and return apply to the saved conclusion above,
          not unsaved changes in the outcome fields. Record a new outcome first to revise the conclusion.</p>}
        {reviewed && !canSign && <p className="text-sm text-slate-600">Sign-off requires a resolved outcome
          and a manager/admin other than the outcome preparer.</p>}
        {signed && <p className="text-sm">A manager/admin must reopen this finding before a new outcome can be recorded.</p>}
      </fieldset>
    </form> : <p className="text-sm">Your role has read-only finding review access.</p>}
    <details className="rounded border bg-white p-3 text-sm">
      <summary className="cursor-pointer font-medium">Immutable review history ({history?.count || 0})</summary>
      <div className="mt-3 space-y-3">
        {history?.results.map((record) => <article className="space-y-1 border-b pb-3" key={record.id}>
          <p>#{record.id}: {record.action} - {reviewStates[record.state]} - {reviewOutcomes[record.outcome]}</p>
          <p>{record.actor_name} ({record.actor_role}, user #{record.actor_identifier}), {record.created_at};
            previous action: {record.previous || "None"}.</p>
          <p>Conclusion: {record.conclusion}</p><p>Action note: {record.note}</p>
          <p>Captured evidence link IDs: {record.evidence_link_ids.join(", ") || "None"}</p>
        </article>)}
        {!loading && history?.count === 0 && <p>No review outcomes recorded.</p>}
        <div className="flex flex-wrap gap-3">
          <button className={buttonClass} disabled={disabled} onClick={() => {
            setLoading(true); setError(""); setRetry((value) => value + 1);
          }}>Reload history</button>
          <button className={buttonClass} disabled={disabled || !history?.previous} onClick={() => {
            setLoading(true); setHistory(null); setPage((value) => value - 1);
          }}>Previous review actions</button>
          <button className={buttonClass} disabled={disabled || !history?.next} onClick={() => {
            setLoading(true); setHistory(null); setPage((value) => value + 1);
          }}>Next review actions</button>
        </div>
      </div>
    </details>
  </div>;
}
