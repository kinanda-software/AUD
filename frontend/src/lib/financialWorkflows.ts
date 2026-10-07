import { apiRequest } from "@/lib/api";

export interface FinancialDimension {
  id: number;
  engagement: number;
  dimension_type: "class" | "location" | "project";
  name: string;
  code: string;
  is_active: boolean;
}

export interface FinancialBudgetLine {
  id: number;
  budget: number;
  account: number;
  account_code: string;
  account_name: string;
  account_type: "revenue" | "expense";
  period: string;
  amount: string;
  dimensions: number[];
  dimension_values: FinancialDimension[];
}

export interface FinancialBudget {
  id: number;
  engagement: number;
  name: string;
  fiscal_year: number;
  currency: string;
  status: "draft" | "approved";
  lines: FinancialBudgetLine[];
}

export interface BudgetActuals {
  budget_id: number;
  engagement_id: number;
  name: string;
  fiscal_year: number;
  currency: string;
  actual_source: string;
  accounts: {
    account_id: number;
    account_code: string;
    account_name: string;
    account_type: "revenue" | "expense";
    dimensions: Pick<FinancialDimension, "id" | "dimension_type" | "name">[];
    annual_budget: string;
    annual_actual: string;
    annual_variance: string;
    annual_favorable: boolean;
    months: {
      period: string;
      budget: string;
      actual: string;
      variance: string;
      favorable: boolean;
    }[];
  }[];
}

export function getFinancialDimensions(
  engagementId: number,
  includeInactive = false
) {
  return apiRequest<FinancialDimension[]>(
    `/financials/dimensions/?engagement=${engagementId}${
      includeInactive ? "&include_inactive=true" : ""
    }`
  );
}

export function createFinancialDimension(data: {
  engagement: number;
  dimension_type: FinancialDimension["dimension_type"];
  name: string;
  code: string;
}) {
  return apiRequest<FinancialDimension>("/financials/dimensions/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateFinancialDimension(
  id: number,
  data: Partial<Pick<FinancialDimension, "is_active">>
) {
  return apiRequest<FinancialDimension>(`/financials/dimensions/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export interface BankStatement {
  id: number;
  engagement: number;
  account: number;
  account_code: string;
  account_name: string;
  currency: string;
  period_start: string;
  period_end: string;
  opening_balance: string;
  closing_balance: string;
  book_opening_balance: string | null;
  status: "draft" | "reconciled";
  line_count: number;
  matched_line_count: number;
  reconciled_at: string | null;
}

export interface BankStatementLine {
  id: number;
  statement: number;
  row_number: number;
  transaction_date: string;
  description: string;
  reference: string;
  amount: string;
  matched_entry: number | null;
  matched_entry_reference: string | null;
}

export interface BankMatchCandidate {
  id: number;
  date: string;
  reference: string;
  description: string;
  amount: string;
  match_type: "exact" | "near_date";
  date_difference_days: number;
  match_reasons: string[];
}

export interface BankReconciliationSummary {
  statement_id: number;
  currency: string;
  opening_balance: string;
  statement_movement: string;
  calculated_closing_balance: string;
  closing_balance: string;
  statement_difference: string;
  book_opening_balance: string | null;
  posted_ledger_closing_balance: string | null;
  bank_less_ledger_difference: string | null;
  statement_line_count: number;
  matched_statement_line_count: number;
  unmatched_statement_line_count: number;
  posted_ledger_line_count: number;
  unmatched_posted_ledger_line_count: number;
  can_reconcile: boolean;
}

export interface FinancialAuditEvent {
  id: number;
  engagement: number;
  actor_name: string | null;
  action: string;
  object_type: string;
  object_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export function getFinancialBudgets(engagementId?: number) {
  const query = engagementId ? `?engagement=${engagementId}` : "";
  return apiRequest<FinancialBudget[]>(`/financials/budgets/${query}`);
}

export function createFinancialBudget(data: {
  engagement: number;
  name: string;
  fiscal_year: number;
  currency: string;
}) {
  return apiRequest<FinancialBudget>("/financials/budgets/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function approveFinancialBudget(id: number) {
  return apiRequest<FinancialBudget>(`/financials/budgets/${id}/approve/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function getBudgetActuals(id: number) {
  return apiRequest<BudgetActuals>(`/financials/budgets/${id}/actuals/`);
}

export function createFinancialBudgetLine(data: {
  budget: number;
  account: number;
  period: string;
  amount: string;
  dimensions: number[];
}) {
  return apiRequest<FinancialBudgetLine>("/financials/budget-lines/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getBankStatements(engagementId?: number) {
  const query = engagementId ? `?engagement=${engagementId}` : "";
  return apiRequest<BankStatement[]>(`/financials/bank-statements/${query}`);
}

export function createBankStatement(data: {
  engagement: number;
  account: number;
  currency: string;
  period_start: string;
  period_end: string;
  opening_balance: string;
  closing_balance: string;
  book_opening_balance: string;
}) {
  return apiRequest<BankStatement>("/financials/bank-statements/", {
    method: "POST",
    body: JSON.stringify({
      ...data,
      book_opening_balance: data.book_opening_balance || null,
    }),
  });
}

export function importBankStatementCsv(id: number, file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<{ statement_id: number; imported_line_count: number }>(
    `/financials/bank-statements/${id}/import-csv/`,
    { method: "POST", body: form }
  );
}

export function getBankStatementLines(id: number) {
  return apiRequest<BankStatementLine[]>(
    `/financials/bank-statement-lines/?statement=${id}`
  );
}

export async function getBankMatchCandidates(id: number) {
  return apiRequest<{ line_id: number; candidates: BankMatchCandidate[] }[]>(
    `/financials/bank-statements/${id}/match-candidates/`
  );
}

export function matchBankStatementLine(lineId: number, ledgerEntryId: number) {
  return apiRequest<BankStatementLine>(
    `/financials/bank-statement-lines/${lineId}/match/`,
    {
      method: "POST",
      body: JSON.stringify({ ledger_entry_id: ledgerEntryId }),
    }
  );
}

export function unmatchBankStatementLine(lineId: number) {
  return apiRequest<BankStatementLine>(
    `/financials/bank-statement-lines/${lineId}/unmatch/`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

export function getBankReconciliationSummary(id: number) {
  return apiRequest<BankReconciliationSummary>(
    `/financials/bank-statements/${id}/reconciliation/`
  );
}

export function reconcileBankStatement(id: number) {
  return apiRequest<BankReconciliationSummary & {
    status: "reconciled";
    reconciled_by: number;
    reconciled_at: string;
  }>(`/financials/bank-statements/${id}/reconcile/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function getFinancialAuditEvents(engagementId?: number) {
  const query = engagementId ? `?engagement=${engagementId}` : "";
  return apiRequest<FinancialAuditEvent[]>(`/financials/audit-events/${query}`);
}
