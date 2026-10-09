import { apiRequest } from "@/lib/api";

/* =========================================================
   NON-CONFORMANCE (CAPA)
========================================================= */

export type NonConformanceSeverity = "minor" | "major" | "critical";

export type FindingType =
  | "observation"
  | "non_conformity"
  | "major_non_conformity";

export type NonConformanceCategory =
  | "documentation"
  | "controls"
  | "operations"
  | "financial_records"
  | "reporting"
  | "compliance"
  | "it_systems"
  | "other";

export type NonConformanceStatus =
  | "open"
  | "investigation"
  | "capa_in_progress"
  | "verification"
  | "closed";

export interface NonConformance {
  id: number;
  engagement: number;
  engagement_code: string;
  reference: string;
  title: string;
  description: string;
  source:
    | "audit_finding"
    | "internal_review"
    | "external_audit"
    | "client_complaint"
    | "other";
  severity: NonConformanceSeverity;
  finding_type: FindingType;
  category: NonConformanceCategory;
  requirement_reference: string;
  status: NonConformanceStatus;
  investigation_notes: string;
  root_cause: string;
  correction: string;
  corrective_action: string;
  preventive_action: string;
  verification_notes: string;
  management_response: string;
  assigned_to: number | null;
  assigned_to_name: string;
  due_date: string | null;
  raised_by: number | null;
  raised_by_username: string;
  verified_by: number | null;
  verified_by_username: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type NonConformanceInput = {
  engagement: number;
  title: string;
  description: string;
  source?: NonConformance["source"];
  severity?: NonConformanceSeverity;
  finding_type?: FindingType;
  category?: NonConformanceCategory;
  requirement_reference?: string;
  status?: NonConformanceStatus;
  investigation_notes?: string;
  root_cause?: string;
  correction?: string;
  corrective_action?: string;
  preventive_action?: string;
  verification_notes?: string;
  management_response?: string;
  assigned_to?: number | null;
  due_date?: string | null;
};

export interface NcPatternRow {
  category: NonConformanceCategory;
  label: string;
  total: number;
  open: number;
  engagement_count: number;
  systemic: boolean;
}

export interface NcPatterns {
  systemic_count: number;
  categories: NcPatternRow[];
}

export interface SourceComparisonRow {
  engagement: number;
  engagement_code: string;
  internal: number;
  external: number;
  other: number;
}

export interface SourceComparison {
  totals: { internal: number; external: number; other: number };
  engagements: SourceComparisonRow[];
}

export interface NonConformanceSummary {
  total: number;
  by_status: Record<string, { label: string; count: number }>;
  by_severity: Record<string, { label: string; count: number }>;
}

export async function getNonConformances(filters?: {
  engagement?: number;
  status?: NonConformanceStatus;
  severity?: NonConformanceSeverity;
}): Promise<NonConformance[]> {
  const params = new URLSearchParams();
  if (filters?.engagement) {
    params.set("engagement", String(filters.engagement));
  }
  if (filters?.status) params.set("status", filters.status);
  if (filters?.severity) params.set("severity", filters.severity);
  const query = params.toString();
  return apiRequest<NonConformance[]>(
    `/nonconformances/${query ? `?${query}` : ""}`,
  );
}

export async function getNonConformanceSummary(
  engagement?: number,
): Promise<NonConformanceSummary> {
  const query = engagement ? `?engagement=${engagement}` : "";
  return apiRequest<NonConformanceSummary>(
    `/nonconformances/summary/${query}`,
  );
}

export async function createNonConformance(
  data: NonConformanceInput,
): Promise<NonConformance> {
  return apiRequest<NonConformance>("/nonconformances/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateNonConformance(
  id: number,
  data: Partial<NonConformanceInput>,
): Promise<NonConformance> {
  return apiRequest<NonConformance>(`/nonconformances/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function closeNonConformance(
  id: number,
): Promise<NonConformance> {
  return apiRequest<NonConformance>(`/nonconformances/${id}/close/`, {
    method: "POST",
  });
}

export async function reopenNonConformance(
  id: number,
): Promise<NonConformance> {
  return apiRequest<NonConformance>(`/nonconformances/${id}/reopen/`, {
    method: "POST",
  });
}

export async function deleteNonConformance(id: number): Promise<void> {
  await apiRequest(`/nonconformances/${id}/`, { method: "DELETE" });
}

export async function getNcPatterns(
  engagement?: number,
): Promise<NcPatterns> {
  const query = engagement ? `?engagement=${engagement}` : "";
  return apiRequest<NcPatterns>(`/nonconformances/patterns/${query}`);
}

export async function getSourceComparison(
  engagement?: number,
): Promise<SourceComparison> {
  const query = engagement ? `?engagement=${engagement}` : "";
  return apiRequest<SourceComparison>(
    `/nonconformances/source-comparison/${query}`,
  );
}
