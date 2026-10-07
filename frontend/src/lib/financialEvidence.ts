import { apiRequest, apiResponse } from "@/lib/api";

export type EvidenceTargetKind =
  | "account_trace" | "run" | "run_finding" | "ledger" | "journal" | "adjustment"
  | "lead_schedule" | "supporting_detail" | "document" | "payment"
  | "asset" | "asset_event" | "inventory_item" | "inventory_movement" | "pbc_request";

export interface EvidenceTarget {
  target_kind: EvidenceTargetKind;
  target_id: number;
  selector: number;
  label: string;
}
export interface FinancialEvidence {
  id: number; engagement: number; title: string; description: string; filename: string;
  content_type: string; size: number; sha256: string; uploaded_by: number | null; uploaded_at: string;
}
export interface EvidenceLink {
  id: number; evidence: number; evidence_metadata: FinancialEvidence;
  target_kind: EvidenceTargetKind; target_id: number; selector: number;
  target_snapshot: { label: string; [key: string]: unknown };
  note: string; linked_by: number | null; linked_at: string;
}
export interface EvidencePage<T> {
  count: number; next: string | null; previous: string | null; results: T[];
}
export function evidenceTargetKey(target: EvidenceTarget) {
  return `${target.target_kind}:${target.target_id}:${target.selector}`;
}
export function getEvidence(engagement: number, page = 1) {
  return apiRequest<EvidencePage<FinancialEvidence>>(`/financials/evidence/?engagement=${engagement}&page=${page}`);
}
export function getEvidenceLinks(engagement: number, target: EvidenceTarget, page = 1) {
  const query = new URLSearchParams({
    engagement: String(engagement), page: String(page), target_kind: target.target_kind,
    target_id: String(target.target_id), selector: String(target.selector),
  });
  return apiRequest<EvidencePage<EvidenceLink>>(`/financials/evidence-links/?${query}`);
}
export function uploadEvidence(data: FormData) {
  return apiRequest<FinancialEvidence>("/financials/evidence/", { method: "POST", body: data });
}
export function linkEvidence(evidence: number, target: EvidenceTarget, note: string) {
  return apiRequest<EvidenceLink>("/financials/evidence-links/", {
    method: "POST", body: JSON.stringify({
      evidence, target_kind: target.target_kind, target_id: target.target_id, selector: target.selector, note,
    }),
  });
}
export async function downloadEvidence(evidence: FinancialEvidence) {
  const response = await apiResponse(`/financials/evidence/${evidence.id}/download/`);
  const blob = await response.blob();
  if (blob.size !== evidence.size) throw new Error("Evidence download size verification failed.");
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  const hash = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
  if (hash !== evidence.sha256) throw new Error("Evidence download checksum verification failed.");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = evidence.filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
