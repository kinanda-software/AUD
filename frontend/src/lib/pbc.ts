import { apiRequest } from "@/lib/api";
import type { EvidencePage } from "@/lib/financialEvidence";

export const pbcStates = {
  open: "Open", submitted: "Submitted for review", returned: "Returned for documents",
  accepted: "Accepted", cancelled: "Cancelled",
};
export type PBCState = keyof typeof pbcStates;
export type PBCAction = "submit" | "accept" | "return" | "reopen" | "cancel";
export interface PBCInput {
  engagement: number; title: string; description: string; requested_from: string;
  responsible_name: string; due_date: string; priority: "normal" | "high" | "low";
}
export interface PBCRequest extends PBCInput {
  id: number; created_by: number | null; created_at: string; state: PBCState;
  overdue: boolean; latest_event: number | null;
}
export interface PBCEvent {
  id: number; request: number; action: PBCAction; state: PBCState; note: string;
  evidence_link_ids: number[]; previous: number | null; actor: number | null;
  actor_identifier: number; actor_name: string; actor_role: string; created_at: string;
}
export interface PBCSummary {
  counts: Record<PBCState, number>; total: number; overdue: number; as_of: string;
}
export function getPBCRequests(engagement: number, page = 1, state = "", overdue = false) {
  const query = new URLSearchParams({ engagement: String(engagement), page: String(page) });
  if (state) query.set("state", state);
  if (overdue) query.set("overdue", "true");
  return apiRequest<EvidencePage<PBCRequest>>(`/financials/pbc-requests/?${query}`);
}
export function getPBCSummary(engagement: number) {
  return apiRequest<PBCSummary>(`/financials/pbc-requests/summary/?engagement=${engagement}`);
}
export function getPBCRequest(id: number) {
  return apiRequest<PBCRequest>(`/financials/pbc-requests/${id}/`);
}
export function createPBCRequest(data: PBCInput) {
  return apiRequest<PBCRequest>("/financials/pbc-requests/", { method: "POST", body: JSON.stringify(data) });
}
export function getPBCEvents(request: number, page = 1) {
  return apiRequest<EvidencePage<PBCEvent>>(`/financials/pbc-events/?request=${request}&page=${page}`);
}
export function recordPBCEvent(data: {
  request: number; action: PBCAction; expected_previous: number | null; note: string; evidence_link_ids?: number[];
}) {
  return apiRequest<PBCEvent>("/financials/pbc-events/", { method: "POST", body: JSON.stringify(data) });
}
