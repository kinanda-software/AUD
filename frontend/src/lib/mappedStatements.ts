import { apiRequest } from "@/lib/api";
import type { EvidencePage } from "@/lib/financialEvidence";

export type StatementGroup = "asset" | "liability" | "equity" | "revenue" | "expense";
export interface StatementLine {
  id: number; engagement: number; code: string; label: string; group: StatementGroup; note_reference: string; order: number;
}
export interface StatementMapping { id: number; account: number; line: number }
export interface AccountAmounts { original: string; adjustment: string; adjusted: string; display: string; present: boolean }
export interface StatementAccount {
  id: number; code: string; name: string; group: StatementGroup; current: AccountAmounts;
  comparison: AccountAmounts | null; reason?: string;
}
export interface MappedStatementReport {
  current_tb: { id: number; engagement: number; period_start: string; period_end: string; currency: string };
  comparison_tb: MappedStatementReport["current_tb"] | null;
  lines: (StatementLine & { current: string; comparison: string | null; accounts: StatementAccount[] })[];
  unmapped: StatementAccount[];
  checks: Record<"current" | "comparison", {
    groups: Record<StatementGroup, string>; profit: string; tb_difference: string; position_difference: string;
    mapped_net: string; unmapped_net: string; account_count: number; posted_adjustment_count: number;
  } | null>;
  ready_for_approval: boolean; warnings: string[]; sign_convention: string;
}
export interface StatementVersionSummary {
  id: number; engagement: number; name: string; current_tb_id: number; comparison_tb_id: number | null;
  fingerprint: string; created_by: number | null; preparer_identifier: number; created_at: string;
  approval: { id: number; actor_identifier: number; actor_name: string; note: string; created_at: string } | null;
}
export interface StatementVersion extends StatementVersionSummary { results: MappedStatementReport }
export const statementGroups: StatementGroup[] = ["asset", "liability", "equity", "revenue", "expense"];
export function getStatementLines(engagement: number) {
  return apiRequest<StatementLine[]>(`/financials/statement-lines/?engagement=${engagement}`);
}
export function getStatementMappings(engagement: number) {
  return apiRequest<StatementMapping[]>(`/financials/statement-mappings/?engagement=${engagement}`);
}
export function saveStatementLine(data: Omit<StatementLine, "id">, id?: number) {
  return apiRequest<StatementLine>(`/financials/statement-lines/${id ? `${id}/` : ""}`, {
    method: id ? "PUT" : "POST", body: JSON.stringify(data),
  });
}
export function saveStatementMapping(account: number, line: number, id?: number) {
  return apiRequest<StatementMapping>(`/financials/statement-mappings/${id ? `${id}/` : ""}`, {
    method: id ? "PUT" : "POST", body: JSON.stringify({ account, line }),
  });
}
export function deleteStatementMapping(id: number) {
  return apiRequest<void>(`/financials/statement-mappings/${id}/`, { method: "DELETE" });
}
export function previewStatements(current: number, comparison?: number) {
  return apiRequest<MappedStatementReport>(`/financials/statement-versions/preview/?current=${current}${comparison ? `&comparison=${comparison}` : ""}`);
}
export function saveStatementVersion(current: number, comparison: number | undefined, name: string) {
  return apiRequest<StatementVersion>("/financials/statement-versions/", {
    method: "POST", body: JSON.stringify({ current, comparison, name }),
  });
}
export function getStatementVersions(engagement: number, page = 1) {
  return apiRequest<EvidencePage<StatementVersionSummary>>(`/financials/statement-versions/?engagement=${engagement}&page=${page}`);
}
export function getStatementVersion(id: number) {
  return apiRequest<StatementVersion>(`/financials/statement-versions/${id}/`);
}
export function approveStatementVersion(id: number, note: string) {
  return apiRequest<StatementVersion>(`/financials/statement-versions/${id}/approve/`, {
    method: "POST", body: JSON.stringify({ note }),
  });
}
