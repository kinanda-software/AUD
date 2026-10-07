import { fetchAllRecords, daysUntil, type DashboardEngagement } from "@/lib/dashboard";

export type AuditEngagement = DashboardEngagement & {
  engagement_type: string;
  financial_year_end: string | null;
  start_date: string;
  lead_auditor_username: string | null;
};

export async function loadAuditPortfolio(signal: AbortSignal): Promise<AuditEngagement[]> {
  const records = await fetchAllRecords<AuditEngagement>("/engagements/", signal);
  for (const record of records) {
    if (!Number.isInteger(record.id) || record.id <= 0
      || typeof record.engagement_code !== "string"
      || typeof record.client_name !== "string"
      || typeof record.title !== "string"
      || typeof record.status !== "string"
      || typeof record.risk_level !== "string"
      || typeof record.current_phase !== "string"
      || typeof record.engagement_type !== "string"
      || !Number.isFinite(record.progress_percentage)
      || record.progress_percentage < 0 || record.progress_percentage > 100) {
      throw new Error("The API returned an invalid engagement record.");
    }
    daysUntil(record.start_date);
    daysUntil(record.planned_end_date);
    daysUntil(record.financial_year_end);
  }
  return records;
}

export function isActiveEngagement(record: AuditEngagement): boolean {
  return record.status !== "completed" && record.status !== "cancelled";
}

export function filterPortfolio(records: AuditEngagement[], search: string, status: string, risk: string) {
  const query = search.trim().toLowerCase();
  return records.filter((record) =>
    (status === "all" || record.status === status)
    && (risk === "all" || record.risk_level === risk)
    && (!query || [
      record.engagement_code, record.title, record.client_name,
      record.engagement_type.replace(/_/g, " "), record.lead_auditor_username ?? "",
    ].some((value) => value.toLowerCase().includes(query))));
}
