"use client";

import { useEffect, useRef, useState } from "react";
import {
  downloadEvidence, evidenceTargetKey, getEvidence, getEvidenceLinks, linkEvidence, uploadEvidence,
  type EvidenceLink, type EvidencePage, type EvidenceTarget, type FinancialEvidence,
} from "@/lib/financialEvidence";

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm";
const buttonClass = "rounded-lg border px-3 py-2 text-sm disabled:opacity-50";

export default function FinancialEvidencePanel({ engagement, targets, readOnly = false, onLinked }: {
  engagement: number; targets: EvidenceTarget[]; readOnly?: boolean; onLinked?: () => void;
}) {
  const [selection, setSelection] = useState("");
  const uniqueTargets = [...new Map(targets.map((target) => [evidenceTargetKey(target), target])).values()];
  const target = uniqueTargets.find((item) => evidenceTargetKey(item) === selection) || uniqueTargets[0];
  if (!target) return null;
  return <section className="space-y-4 rounded-xl border bg-white p-5">
    <h2 className="font-semibold">Private financial evidence</h2>
    <p className="text-sm text-slate-600">Immutable attachments and links. Linking evidence records support, not review sign-off
      or proof of completeness. Saved run results and fingerprints stay unchanged.</p>
    <label className="block text-sm">Evidence target (records on the displayed page)
      <select className={inputClass} value={evidenceTargetKey(target)} onChange={(event) => setSelection(event.target.value)}>
        {uniqueTargets.map((item) => <option key={evidenceTargetKey(item)} value={evidenceTargetKey(item)}>{item.label}</option>)}
      </select>
    </label>
    <EvidenceContent key={`${engagement}:${evidenceTargetKey(target)}`} engagement={engagement} target={target}
      readOnly={readOnly} onLinked={onLinked} />
  </section>;
}

function EvidenceContent({ engagement, target, readOnly, onLinked }: {
  engagement: number; target: EvidenceTarget; readOnly: boolean; onLinked?: () => void;
}) {
  const [links, setLinks] = useState<EvidencePage<EvidenceLink> | null>(null);
  const [library, setLibrary] = useState<EvidencePage<FinancialEvidence> | null>(null);
  const [linkPage, setLinkPage] = useState(1);
  const [libraryPage, setLibraryPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [existing, setExisting] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  const { target_kind, target_id, selector } = target;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    let active = true;
    Promise.all([
      getEvidenceLinks(engagement, { target_kind, target_id, selector, label: "" }, linkPage),
      getEvidence(engagement, libraryPage),
    ]).then(([linked, available]) => {
      if (active) { setLinks(linked); setLibrary(available); setLoading(false); }
    }, (err: unknown) => {
      if (active) { setError(err instanceof Error ? err.message : "Could not load evidence."); setLoading(false); }
    });
    return () => { active = false; };
  }, [engagement, target_kind, target_id, selector, linkPage, libraryPage, refresh]);

  async function save(isUpload: boolean) {
    setBusy(true); setError(""); setSuccess("");
    try {
      if (isUpload) {
        if (!file) throw new Error("Select an evidence file.");
        if (!file.size || file.size > 10 * 1024 * 1024) throw new Error("Select a nonempty file no larger than 10 MB.");
        const data = new FormData();
        data.set("engagement", String(engagement)); data.set("title", title);
        data.set("description", description); data.set("file", file); data.set("note", note);
        data.set("target_kind", target.target_kind); data.set("target_id", String(target.target_id));
        data.set("selector", String(target.selector));
        await uploadEvidence(data);
      } else {
        await linkEvidence(Number(existing), target, note);
      }
      if (!mounted.current) return;
      setSuccess(isUpload ? "Evidence uploaded and linked." : "Existing evidence linked.");
      setTitle(""); setDescription(""); setNote(""); setFile(null); setExisting("");
      if (fileInput.current) fileInput.current.value = "";
      setLoading(true); setLinks(null); setLinkPage(1); setLibraryPage(1); setRefresh((value) => value + 1);
      onLinked?.();
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : "Could not save evidence.");
    } finally { if (mounted.current) setBusy(false); }
  }
  async function download(evidence: FinancialEvidence) {
    setBusy(true); setError(""); setSuccess("");
    try { await downloadEvidence(evidence); }
    catch (err) { if (mounted.current) setError(err instanceof Error ? err.message : "Evidence download failed."); }
    finally { if (mounted.current) setBusy(false); }
  }
  const disabled = busy || loading;
  return <div className="space-y-4">
    {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}
      <button className={`${buttonClass} ml-3`} disabled={busy} onClick={() => {
        setLoading(true); setError(""); setRefresh((value) => value + 1);
      }}>Retry loading</button></p>}
    {success && <p role="status" className="text-sm text-green-800">{success}</p>}
    {loading && <p role="status" className="text-sm">Loading evidence...</p>}
    <p className="text-sm">PDF, PNG, JPEG, UTF-8 CSV/TXT; maximum 10 MB per file. Authenticated downloads only.
      Uploaded bytes and link notes cannot be edited or deleted. Check the target before saving.</p>
    <form onSubmit={(event) => { event.preventDefault(); void save(true); }}>
      <fieldset disabled={disabled || readOnly} className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">Evidence title<input className={inputClass} required maxLength={200}
          value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="text-sm">Evidence file<input ref={fileInput} className={inputClass} type="file" required
          accept=".pdf,.png,.jpg,.jpeg,.csv,.txt" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
        <label className="text-sm">Evidence description<textarea className={inputClass} maxLength={5000} value={description}
          onChange={(event) => setDescription(event.target.value)} /></label>
        <label className="text-sm">Link purpose / support note<textarea className={inputClass} required maxLength={1000} value={note}
          onChange={(event) => setNote(event.target.value)} /></label>
        <button className={buttonClass} disabled={!file || !title.trim() || !note.trim()}>Upload and link evidence</button>
      </fieldset>
    </form>
    <form onSubmit={(event) => { event.preventDefault(); void save(false); }} className="space-y-3 rounded-lg bg-slate-50 p-3">
      <fieldset disabled={disabled || readOnly} className="space-y-3">
        <label className="block text-sm">Reuse an existing engagement attachment<select className={inputClass}
          value={existing} required onChange={(event) => setExisting(event.target.value)}>
          <option value="">Select attachment</option>{library?.results.map((item) =>
            <option key={item.id} value={item.id}>#{item.id}: {item.title} ({item.filename})</option>)}
        </select></label>
        <label className="block text-sm">Reuse link note<textarea className={inputClass} required maxLength={1000}
          value={note} onChange={(event) => setNote(event.target.value)} /></label>
        <div className="flex flex-wrap gap-3">
          <button className={buttonClass} disabled={!existing || !note.trim()}>Link existing evidence</button>
          <button type="button" className={buttonClass} disabled={!library?.previous} onClick={() => {
            setLoading(true); setLibrary(null); setExisting(""); setLibraryPage((value) => value - 1);
          }}>Previous attachments</button>
          <button type="button" className={buttonClass} disabled={!library?.next} onClick={() => {
            setLoading(true); setLibrary(null); setExisting(""); setLibraryPage((value) => value + 1);
          }}>Next attachments</button>
          <span className="text-sm">{library?.count || 0} engagement attachments; page {libraryPage}</span>
        </div>
      </fieldset>
    </form>
    <h3 className="font-medium">Linked attachments ({links?.count || 0})</h3>
    {!loading && links?.count === 0 && <p className="text-sm">No evidence explicitly linked to this target.</p>}
    {links?.results.map((link) => <article key={link.id} className="space-y-2 rounded-lg border p-3 text-sm">
      <p className="font-medium">Evidence #{link.evidence}: {link.evidence_metadata.title} - {link.evidence_metadata.filename}
        {" "} (link #{link.id})</p>
      <p>{link.evidence_metadata.description}</p>
      <p>{link.evidence_metadata.size.toLocaleString()} bytes; {link.evidence_metadata.content_type};
        uploaded {link.evidence_metadata.uploaded_at} by user #{link.evidence_metadata.uploaded_by ?? "deleted"}.</p>
      <p className="break-all font-mono text-xs">SHA-256: {link.evidence_metadata.sha256}</p>
      <p>Target at linking: {link.target_snapshot.label}; note: {link.note}</p>
      <p>Linked {link.linked_at} by user #{link.linked_by ?? "deleted"}.</p>
      <button className={buttonClass} disabled={busy} onClick={() => void download(link.evidence_metadata)}>Download evidence</button>
    </article>)}
    <div className="flex gap-3">
      <button className={buttonClass} disabled={disabled || !links?.previous} onClick={() => {
        setLoading(true); setLinks(null); setLinkPage((value) => value - 1);
      }}>Previous linked evidence</button>
      <button className={buttonClass} disabled={disabled || !links?.next} onClick={() => {
        setLoading(true); setLinks(null); setLinkPage((value) => value + 1);
      }}>Next linked evidence</button>
    </div>
  </div>;
}
