import { apiRequest } from "@/lib/api";

export const journalRules = {
  large_journal: "Large journal",
  weekend_date: "Weekend transaction date",
  round_amount: "Round total amount",
  missing_preparer: "Missing recorded preparer",
  missing_recorded_approval: "Missing recorded approval",
  self_approval: "Same preparer and approver",
  potential_duplicate: "Potential duplicate journals",
  unbalanced_journal: "Invalid/unbalanced journal",
  incomplete_ledger_provenance: "Incomplete ledger provenance",
};
export type JournalRule = keyof typeof journalRules;
export interface RunInput {
  engagement: number;
  name: string;
  date_from: string;
  date_to: string;
  source: "all" | "manual" | "import" | "adjustment" | "other";
  sampling_method: "seeded_random" | "high_value";
  sample_size: number;
  seed: string;
  amount_threshold: string;
  round_increment: string;
  rules: JournalRule[];
}
export interface JournalSnapshot {
  id: number; entry_number: string; transaction_date: string; reference: string;
  description: string; source: string; status: string;
  created_by: number | null; preparer: string | null;
  approved_by: number | null; approver: string | null; approved_at: string | null;
  created_at: string; updated_at: string; reversal_of: number | null;
  total_debit: string; total_credit: string;
  lines: {
    id: number; account: number; account_code: string; account_name: string; account_type: string;
    account_engagement: number; debit: string; credit: string; ledger_id: number | null; ledger_consistent: boolean;
    dimensions: { id: number; name: string; type: string }[];
  }[];
}
export interface RunSummary {
  id: number; engagement: number; name: string; algorithm_version: string;
  parameters: Omit<RunInput, "name"> & { base_currency: string | null; approval_required_at_run: boolean };
  population_fingerprint: string; population_count: number; sample_count: number; finding_count: number;
  created_by: number | null; created_at: string;
}
export interface IntelligenceRun extends RunSummary {
  results: {
    population: JournalSnapshot[];
    sampled_journal_ids: number[];
    findings: { rule: JournalRule; journal_ids: number[]; message: string }[];
    population_total_debit: string; sample_total_debit: string;
    warnings: string[];
  };
}
export interface RunList { count: number; next: string | null; previous: string | null; results: RunSummary[] }
export function getIntelligenceRuns(engagement: number, page = 1) {
  return apiRequest<RunList>(`/financials/intelligence-runs/?engagement=${engagement}&page=${page}`);
}
export function getIntelligenceRun(id: number) {
  return apiRequest<IntelligenceRun>(`/financials/intelligence-runs/${id}/`);
}
export function createIntelligenceRun(data: RunInput) {
  return apiRequest<IntelligenceRun>("/financials/intelligence-runs/", {
    method: "POST", body: JSON.stringify(data),
  });
}
