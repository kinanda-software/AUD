import { apiRequest } from "@/lib/api";
import type { EvidenceTargetKind } from "@/lib/financialEvidence";

export interface TraceTrialBalance {
  id: number; engagement: number; period_start: string; period_end: string; currency: string; status: string;
}
export interface TraceAccount { id: number; code: string; name: string; type: string; financial_statement_section: string }
export interface TraceSource {
  kind: string; id: number; label: string; path: string; relationship: "explicit_journal_link";
  evidence_target_kind: EvidenceTargetKind;
}
export interface TraceLedgerRow {
  id: number; transaction_date: string; reference: string; description: string;
  debit: string; credit: string; source: string; provenance: "missing" | "verified" | "inconsistent";
  journal: {
    id: number; entry_number: string; status: string; transaction_date: string; description: string;
    created_by: string | null; approved_by: string | null; approved_at: string | null;
    journal_line: number; sources: TraceSource[];
  } | null;
}
export interface TraceAdjustment {
  id: number; number: string; description: string; status: string; included: boolean;
  side: "debit" | "credit"; amount: string; debit_account: number; credit_account: number;
}
interface TracePage<T> { count: number; offset: number; page_size: number; next_offset: number | null; rows: T[] }
export interface FinancialTrace {
  trial_balance: TraceTrialBalance;
  account: TraceAccount;
  calculation: {
    original_line: number | null; original_debit: string; original_credit: string; original_net: string;
    adjustment_debit: string; adjustment_credit: string; adjusted_net: string;
    adjusted_debit: string; adjusted_credit: string;
  };
  ledger_scope: {
    date_from: string; date_to: string; includes_opening: boolean; currency_confirmed: boolean;
    relationship: string; debit: string; credit: string; net: string; difference_to_original_tb: string;
    missing_provenance_count: number;
  };
  ledger: TracePage<TraceLedgerRow>;
  adjustments: TracePage<TraceAdjustment>;
  lead_schedules: {
    id: number; name: string; reference: string; status: string;
    opening_balance: string; adjustments: string; adjusted_balance: string;
    difference_to_current_adjusted_tb: string; conclusion: string; auditor_notes: string;
    support_total: string; support_difference: string; support_count: number; support_limit: number;
    support: { id: number; description: string; reference: string; amount: string; status: string; audit_notes: string }[];
  }[];
  warnings: string[];
}
export function getTraceTrialBalances(engagement: number) {
  return apiRequest<TraceTrialBalance[]>(`/financials/trial-balances/?engagement=${engagement}`);
}
export function getFinancialTrace(tb: number, account: number, ledgerOffset = 0, adjustmentOffset = 0) {
  return apiRequest<FinancialTrace>(`/financials/trial-balances/${tb}/trace/?account=${account}&ledger_offset=${ledgerOffset}&adjustment_offset=${adjustmentOffset}`);
}
