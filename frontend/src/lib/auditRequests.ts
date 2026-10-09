import { apiRequest } from "@/lib/api";
import type { Engagement } from "@/lib/api";

/* =========================================================
   AUDIT REQUEST INTAKE PIPELINE
========================================================= */

export type AuditRequestStatus =
  | "submitted"
  | "under_review"
  | "accepted"
  | "rejected"
  | "converted";

export interface AuditRequest {
  id: number;
  reference: string;
  client: number | null;
  client_name: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  audit_type:
    | "financial_statement"
    | "compliance"
    | "internal_control"
    | "it_audit"
    | "other";
  preferred_start_date: string | null;
  preferred_end_date: string | null;
  scope_notes: string;
  status: AuditRequestStatus;
  review_notes: string;
  reviewed_by: number | null;
  reviewed_by_username: string;
  reviewed_at: string | null;
  engagement: number | null;
  engagement_code: string;
  created_by: number | null;
  created_by_username: string;
  created_at: string;
  updated_at: string;
}

export interface AuditRequestSummary {
  total: number;
  awaiting_review: number;
  by_status: Record<string, { label: string; count: number }>;
}

export async function getAuditRequests(filters?: {
  status?: AuditRequestStatus;
  client?: number;
}): Promise<AuditRequest[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.client) params.set("client", String(filters.client));
  const query = params.toString();
  return apiRequest<AuditRequest[]>(
    `/audit-requests/${query ? `?${query}` : ""}`
  );
}

export async function getAuditRequestSummary(): Promise<AuditRequestSummary> {
  return apiRequest<AuditRequestSummary>("/audit-requests/summary/");
}

export async function createAuditRequest(data: {
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  client?: number | null;
  audit_type?: AuditRequest["audit_type"];
  preferred_start_date?: string | null;
  preferred_end_date?: string | null;
  scope_notes?: string;
}): Promise<AuditRequest> {
  return apiRequest<AuditRequest>("/audit-requests/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function reviewAuditRequest(
  id: number,
  decision: "under_review" | "accept" | "reject",
  reviewNotes?: string
): Promise<AuditRequest> {
  return apiRequest<AuditRequest>(`/audit-requests/${id}/review/`, {
    method: "POST",
    body: JSON.stringify({ decision, review_notes: reviewNotes }),
  });
}

export async function convertAuditRequest(
  id: number,
  data: {
    engagement_code: string;
    title?: string;
    start_date: string;
    planned_end_date?: string | null;
    financial_year_end?: string | null;
    lead_auditor?: number | null;
  }
): Promise<AuditRequest> {
  return apiRequest<AuditRequest>(`/audit-requests/${id}/convert/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export type { Engagement };
