import { apiRequest, type JournalEntry } from "@/lib/api";

export interface AccountingControl {
  engagement: number;
  require_journal_approval: boolean;
  base_currency: string;
  supported_currencies: string[];
  closed_through: string | null;
  opening_journal: number | null;
  opening_journal_status: string | null;
  can_manage: boolean;
}

export function getAccountingControl(engagementId: number) {
  return apiRequest<AccountingControl>(`/financials/accounting-controls/${engagementId}/`);
}

export function configureAccountingControl(
  engagementId: number,
  requireApproval: boolean,
  currency?: { base_currency: string; confirm_legacy_currency: boolean }
) {
  return apiRequest<AccountingControl>(
    `/financials/accounting-controls/${engagementId}/configure/`,
    { method: "POST", body: JSON.stringify({ require_journal_approval: requireApproval, ...currency }) }
  );
}

export function closeAccountingPeriod(engagementId: number, closedThrough: string, reason: string) {
  return apiRequest<AccountingControl>(
    `/financials/accounting-controls/${engagementId}/close/`,
    { method: "POST", body: JSON.stringify({ closed_through: closedThrough, reason }) }
  );
}

export function reopenAccountingPeriod(engagementId: number, reason: string) {
  return apiRequest<AccountingControl>(
    `/financials/accounting-controls/${engagementId}/reopen/`,
    { method: "POST", body: JSON.stringify({ reason }) }
  );
}

export function createOpeningBalances(
  engagementId: number,
  data: {
    entry_number: string;
    transaction_date: string;
    description: string;
    lines: { account: number; debit: string; credit: string }[];
  }
) {
  return apiRequest<JournalEntry>(
    `/financials/accounting-controls/${engagementId}/opening-balances/`,
    { method: "POST", body: JSON.stringify(data) }
  );
}

export function journalWorkflowAction(
  journalId: number,
  action: "submit" | "approve" | "return-to-draft" | "reverse",
  data: { reason?: string; transaction_date?: string; entry_number?: string } = {}
) {
  return apiRequest<JournalEntry>(`/financials/journal-entries/${journalId}/${action}/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
