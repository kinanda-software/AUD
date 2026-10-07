import { loadAuditPortfolio, type AuditEngagement } from "@/lib/auditPortfolio";
import { daysUntil, fetchAllRecords } from "@/lib/dashboard";
import { isRecord } from "@/lib/typeGuards";

export type CompletionRecord = {
  id: number;
  engagement: number;
  status: "Not Started" | "In Progress" | "Completed";
  financial_statements_finalized: boolean;
  audit_adjustments_reviewed: boolean;
  subsequent_events_reviewed: boolean;
  going_concern_reviewed: boolean;
  legal_matters_reviewed: boolean;
  related_parties_reviewed: boolean;
  audit_documentation_completed: boolean;
  review_points_cleared: boolean;
  partner_review_completed: boolean;
  eqr_completed: boolean;
  outstanding_matters: string;
  final_review_notes: string;
  completion_conclusion: string;
  completed_by_name: string | null;
  completion_date: string | null;
  updated_at: string;
};

export const completionChecks = [
  { key: "financial_statements_finalized", label: "Financial statements finalized" },
  { key: "audit_adjustments_reviewed", label: "Audit adjustments reviewed" },
  { key: "subsequent_events_reviewed", label: "Subsequent events reviewed" },
  { key: "going_concern_reviewed", label: "Going concern reviewed" },
  { key: "legal_matters_reviewed", label: "Legal matters reviewed" },
  { key: "related_parties_reviewed", label: "Related parties reviewed" },
  { key: "audit_documentation_completed", label: "Audit documentation completed" },
  { key: "review_points_cleared", label: "Review points cleared" },
  { key: "partner_review_completed", label: "Partner review completed" },
  { key: "eqr_completed", label: "EQR completed" },
] as const;

export type ReportingRow = {
  engagement: AuditEngagement;
  completion: CompletionRecord | null;
};

export function joinReportingRecords(engagements: AuditEngagement[], completions: CompletionRecord[]): ReportingRow[] {
  const byEngagement = new Map<number, CompletionRecord>();
  for (const completion of completions) {
    if (byEngagement.has(completion.engagement)) {
      throw new Error("Multiple completion-review records were returned for one engagement.");
    }
    byEngagement.set(completion.engagement, completion);
  }
  return engagements.map((engagement) => ({
    engagement,
    completion: byEngagement.get(engagement.id) ?? null,
  }));
}

export async function loadReportingPortfolio(signal: AbortSignal): Promise<ReportingRow[]> {
  const [engagements, completions] = await Promise.all([
    loadAuditPortfolio(signal),
    fetchAllRecords<unknown>("/completion-reviews/", signal),
  ]);
  const validated: CompletionRecord[] = [];
  for (const record of completions) {
    if (!isRecord(record) || typeof record.id !== "number" || record.id <= 0
      || !Number.isInteger(record.id) || typeof record.engagement !== "number"
      || record.engagement <= 0 || !Number.isInteger(record.engagement)
      || typeof record.status !== "string"
      || !["Not Started", "In Progress", "Completed"].includes(record.status)
      || typeof record.outstanding_matters !== "string"
      || typeof record.final_review_notes !== "string"
      || typeof record.completion_conclusion !== "string"
      || !(record.completed_by_name === null || typeof record.completed_by_name === "string")
      || !(record.completion_date === null || typeof record.completion_date === "string")
      || !completionChecks.every(({ key }) => typeof record[key] === "boolean")) {
      throw new Error("The API returned an invalid completion-review record.");
    }
    daysUntil(record.completion_date);
    if (typeof record.updated_at !== "string" || !Number.isFinite(Date.parse(record.updated_at))) {
      throw new Error("The API returned an invalid completion-review save date.");
    }
    validated.push(record as CompletionRecord);
  }
  return joinReportingRecords(engagements, validated);
}

export function reportingState(row: ReportingRow): string {
  return row.completion?.status ?? "No review record";
}

export function filterReportingRecords(rows: ReportingRow[], search: string, state: string) {
  const query = search.trim().toLowerCase();
  return rows.filter((row) =>
    (state === "all" || reportingState(row) === state)
    && (!query || [
      row.engagement.engagement_code,
      row.engagement.client_name,
      row.engagement.title,
    ].some((value) => value.toLowerCase().includes(query))));
}
