import { API_ORIGIN } from "@/lib/apiConfig";
const API_URL = `${API_ORIGIN}/api`;

/* =========================================================
   TYPES
========================================================= */

export interface Engagement {
  id: number;

  engagement_code: string;
  title: string;
  engagement_type: string;
  current_phase: string;
  risk_level: string;

  financial_year_end: string | null;

  client?: number;
  client_name?: string;
  client_code?: string;

  lead_auditor?: number | null;

  status?: string;

  start_date?: string | null;
  planned_end_date?: string | null;
  actual_end_date?: string | null;

  description?: string;

  progress_percentage?: number;

  created_at?: string;
  updated_at?: string;

  [key: string]: unknown;
}

export interface ClientRecord {
  id: number;
  client_code: string;
  legal_name: string;
  trading_name: string;
  client_type: "company" | "government" | "ngo" | "bank" | "insurance" | "other";
  registration_number: string;
  tax_identification_number: string;
  industry: string;
  address: string;
  city: string;
  country: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  status: "prospect" | "onboarding" | "active" | "inactive";
  risk_level: "low" | "medium" | "high";
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface PlanningAssessment {
  id: number;
  engagement: number;
  engagement_code: string;
  status: string;

  business_understanding: string;
  industry_understanding: string;
  regulatory_environment: string;
  accounting_framework: string;
  reporting_requirements: string;
  significant_changes: string;
  significant_risks_identified: string;
  fraud_risk_considerations: string;
  going_concern_considerations: string;
  related_parties_considerations: string;
  internal_audit_considerations: string;
  previous_auditor_considerations: string;
  planning_conclusion: string;

  prepared_by: number | null;
  approved_by: number | null;
  prepared_at: string | null;
  approved_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface MaterialityAssessment {
  id: number;
  engagement: number;
  engagement_code: string;

  benchmark: string;
  benchmark_amount: number | string;
  benchmark_percentage: number | string;

  overall_materiality: number | string;
  performance_materiality: number | string;
  clearly_trivial_threshold: number | string;

  rationale: string;
  qualitative_factors: string;

  reassessment_required: boolean;
  reassessment_reason: string;

  prepared_by: number | null;
  prepared_by_username?: string;

  created_at: string;
  updated_at: string;
}

export interface AuditScope {
  id: number;
  engagement: number;
  engagement_code: string;

  entities_in_scope: string;
  locations_in_scope: string;
  reporting_period: string;
  financial_statement_areas: string;
  significant_accounts: string;
  significant_disclosures: string;
  systems_in_scope: string;
  processes_in_scope: string;
  areas_out_of_scope: string;

  component_auditor_involvement: boolean;
  component_auditor_details: string;

  scope_conclusion: string;

  created_at: string;
  updated_at: string;
}

export interface AuditTeamMember {
  id: number;
  engagement: number;
  engagement_code: string;

  user: number;
  username?: string;

  role: string;
  responsibilities: string;
  budgeted_hours: string;
  is_key_member: boolean;

  created_at: string;
}

export interface PlanningMatter {
  id: number;
  engagement: number;
  engagement_code?: string;

  matter_type: string;
  title: string;
  description: string;

  severity: string;

  response_required: boolean;
  planned_response: string;

  resolved: boolean;

  created_at?: string;
  updated_at?: string;
}

export interface PlanningProcedure {
  id: number;
  engagement: number;
  engagement_code?: string;

  procedure_code: string;
  title: string;
  objective: string;
  procedure_description: string;

  status: string;
  conclusion: string;

  performed_by: number | null;
  performed_by_username?: string;

  performed_at: string | null;

  created_at: string;
  updated_at: string;
}

/* =========================================================
   CSRF HELPER
========================================================= */

function getCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie.split(";");

  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.trim().split("=");

    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
}

async function ensureCsrfToken(): Promise<string | null> {
  let csrfToken = getCookie("csrftoken");

  if (csrfToken) {
    return csrfToken;
  }

  await fetch(`${API_URL}/auth/csrf-token/`, {
    method: "GET",
    credentials: "include",
  });

  csrfToken = getCookie("csrftoken");

  return csrfToken;
}

/* =========================================================
   GENERIC API HELPER
========================================================= */

export async function apiResponse(
  endpoint: string,
  options?: RequestInit
): Promise<Response> {
  const method =
    options?.method?.toUpperCase() ?? "GET";

  const headers = new Headers(options?.headers);

  /*
   * Most AUD API requests use JSON.
   */
  const isFormData =
    typeof FormData !== "undefined" &&
    options?.body instanceof FormData;

  if (isFormData) {
    headers.delete("Content-Type");
  } else {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  /*
   * =======================================================
   * DRF TOKEN AUTHENTICATION
   * =======================================================
   *
   * The login page stores the DRF token in:
   *
   * localStorage["audit-token"]
   *
   * Protected Django REST Framework endpoints expect:
   *
   * Authorization: Token <token>
   */
  if (typeof window !== "undefined") {
    const token =
      localStorage.getItem("audit-token");

    if (token) {
      headers.set(
        "Authorization",
        `Token ${token}`
      );
    }
  }

  /*
   * Keep Django session cookies enabled as well.
   *
   * This allows endpoints using SessionAuthentication
   * to continue working.
   */
  const requestOptions: RequestInit = {
    ...options,
    method,
    headers,
    credentials: "include",
  };

  /*
   * Django CSRF protection is required for
   * write operations.
   */
  const requiresCsrf = [
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
  ].includes(method);

  if (requiresCsrf) {
    const csrfToken =
      await ensureCsrfToken();

    if (csrfToken) {
      headers.set(
        "X-CSRFToken",
        csrfToken
      );
    }
  }

  /*
   * Send API request.
   */
  const response = await fetch(
    `${API_URL}${endpoint}`,
    requestOptions
  );

  /*
   * Handle API errors.
   */
  if (!response.ok) {
    const errorText =
      await response.text();

    /*
     * If Django reports an invalid token,
     * remove the stale browser token.
     */
    if (
      typeof window !== "undefined" &&
      (response.status === 401 ||
        response.status === 403) &&
      errorText
        .toLowerCase()
        .includes("invalid token")
    ) {
      localStorage.removeItem(
        "audit-token"
      );
    }

    throw new Error(
      errorText ||
        `API request failed with status ${response.status}`
    );
  }

  return response;
}

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await apiResponse(endpoint, options);
  /*
   * DELETE requests commonly return HTTP 204
   * with no response body.
   */
  if (response.status === 204) {
    return undefined as T;
  }

  /*
   * Read JSON responses.
   */
  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    return response.json();
  }

  return undefined as T;
}

/* =========================================================
   AUDITS
========================================================= */

export async function getAudits() {
  return apiRequest("/audits/");
}

/* =========================================================
   ENGAGEMENTS
========================================================= */

export async function getEngagements(): Promise<
  Engagement[]
> {
  return apiRequest<Engagement[]>(
    "/engagements/"
  );
}

export async function getEngagement(
  id: number | string
): Promise<Engagement> {
  return apiRequest<Engagement>(
    `/engagements/${id}/`
  );
}

export async function rollForwardEngagement(
  id: number,
  data: {
    engagement_code: string;
    title?: string;
    start_date: string;
    planned_end_date?: string;
    financial_year_end?: string;
  }
): Promise<Engagement> {
  return apiRequest<Engagement>(
    `/engagements/${id}/roll_forward/`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

/* =========================================================
   CLIENTS
========================================================= */

export async function getClients(): Promise<ClientRecord[]> {
  return apiRequest<ClientRecord[]>("/clients/", { cache: "no-store" });
}

export async function getClient(
  id: number | string
) : Promise<ClientRecord> {
  return apiRequest<ClientRecord>(
    `/clients/${id}/`,
    { cache: "no-store" }
  );
}

export async function createClient(
  data: Partial<Omit<ClientRecord, "id" | "created_at" | "updated_at">>
): Promise<ClientRecord> {
  return apiRequest<ClientRecord>("/clients/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateClient(
  id: number | string,
  data: Partial<Omit<ClientRecord, "id" | "created_at" | "updated_at">>
): Promise<ClientRecord> {
  return apiRequest<ClientRecord>(`/clients/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/* =========================================================
   PHASE 1 — PLANNING ASSESSMENT
========================================================= */

export async function getPlanningAssessments() {
  return apiRequest<
    PlanningAssessment[]
  >("/planning-assessments/");
}

export async function getPlanningAssessment(
  id: number | string
) {
  return apiRequest<PlanningAssessment>(
    `/planning-assessments/${id}/`
  );
}

export async function getPlanningAssessmentByEngagement(
  engagementId: number | string
) {
  const assessments =
    await getPlanningAssessments();

  return (
    assessments.find(
      (assessment) =>
        assessment.engagement ===
        Number(engagementId)
    ) ?? null
  );
}

export async function createPlanningAssessment(
  data: Partial<PlanningAssessment>
) {
  return apiRequest<PlanningAssessment>(
    "/planning-assessments/",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function updatePlanningAssessment(
  id: number | string,
  data: Partial<PlanningAssessment>
) {
  return apiRequest<PlanningAssessment>(
    `/planning-assessments/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

/* =========================================================
   PHASE 1 — MATERIALITY
========================================================= */

export async function getMaterialityAssessments() {
  return apiRequest<
    MaterialityAssessment[]
  >("/materiality-assessments/");
}

export async function getMaterialityAssessment(
  id: number | string
) {
  return apiRequest<MaterialityAssessment>(
    `/materiality-assessments/${id}/`
  );
}

export async function getMaterialityAssessmentByEngagement(
  engagementId: number | string
) {
  const assessments =
    await getMaterialityAssessments();

  return (
    assessments.find(
      (assessment) =>
        assessment.engagement ===
        Number(engagementId)
    ) ?? null
  );
}

export async function createMaterialityAssessment(
  data: Partial<MaterialityAssessment>
) {
  return apiRequest<MaterialityAssessment>(
    "/materiality-assessments/",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function updateMaterialityAssessment(
  id: number | string,
  data: Partial<MaterialityAssessment>
) {
  return apiRequest<MaterialityAssessment>(
    `/materiality-assessments/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

/* =========================================================
   PHASE 1 — AUDIT SCOPE
========================================================= */

export async function getAuditScopes() {
  return apiRequest<AuditScope[]>(
    "/audit-scopes/"
  );
}

export async function getAuditScope(
  id: number | string
) {
  return apiRequest<AuditScope>(
    `/audit-scopes/${id}/`
  );
}

export async function getAuditScopeByEngagement(
  engagementId: number | string
) {
  const scopes =
    await getAuditScopes();

  return (
    scopes.find(
      (scope) =>
        scope.engagement ===
        Number(engagementId)
    ) ?? null
  );
}

export async function createAuditScope(
  data: Partial<AuditScope>
) {
  return apiRequest<AuditScope>(
    "/audit-scopes/",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function updateAuditScope(
  id: number | string,
  data: Partial<AuditScope>
) {
  return apiRequest<AuditScope>(
    `/audit-scopes/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

/* =========================================================
   PHASE 1 — AUDIT TEAM
========================================================= */

export interface AuditTeamUser {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  is_active?: boolean;
}

export async function getAuditTeamUsers(): Promise<AuditTeamUser[]> {
  const data = await apiRequest<unknown>("/auth/audit-team-users/");
  const users = Array.isArray(data)
    ? data
    : data !== null && typeof data === "object" && "users" in data
      ? data.users
      : undefined;

  if (!Array.isArray(users) || !users.every(
    (user): user is AuditTeamUser =>
      user !== null &&
      typeof user === "object" &&
      Number.isInteger(user.id) &&
      user.id > 0 &&
      typeof user.username === "string" &&
      ["first_name", "last_name", "email", "role"].every(
        (key) => user[key] === undefined || typeof user[key] === "string"
      ) &&
      (user.is_active === undefined || typeof user.is_active === "boolean")
  )) {
    throw new Error("Invalid audit team users response.");
  }

  return users;
}

export async function getAuditTeamMembers() {
  return apiRequest<
    AuditTeamMember[]
  >("/audit-team-members/");
}

export async function getAuditTeamMember(
  id: number | string
) {
  return apiRequest<AuditTeamMember>(
    `/audit-team-members/${id}/`
  );
}

export async function getAuditTeamByEngagement(
  engagementId: number | string
) {
  const members =
    await getAuditTeamMembers();

  return members.filter(
    (member) =>
      member.engagement ===
      Number(engagementId)
  );
}

export async function createAuditTeamMember(
  data: Partial<AuditTeamMember>
) {
  return apiRequest<AuditTeamMember>(
    "/audit-team-members/",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function updateAuditTeamMember(
  id: number | string,
  data: Partial<AuditTeamMember>
) {
  return apiRequest<AuditTeamMember>(
    `/audit-team-members/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

export async function deleteAuditTeamMember(
  id: number | string
) {
  return apiRequest<void>(
    `/audit-team-members/${id}/`,
    {
      method: "DELETE",
    }
  );
}

/* =========================================================
   PHASE 1 — PLANNING MATTERS
========================================================= */

export async function getPlanningMatters() {
  return apiRequest<PlanningMatter[]>(
    "/planning-matters/"
  );
}

export async function getPlanningMatter(
  id: number | string
) {
  return apiRequest<PlanningMatter>(
    `/planning-matters/${id}/`
  );
}

export async function getPlanningMattersByEngagement(
  engagementId: number | string
) {
  const matters =
    await getPlanningMatters();

  return matters.filter(
    (matter) =>
      matter.engagement ===
      Number(engagementId)
  );
}

export async function createPlanningMatter(
  data: Partial<PlanningMatter>
) {
  return apiRequest<PlanningMatter>(
    "/planning-matters/",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function updatePlanningMatter(
  id: number | string,
  data: Partial<PlanningMatter>
) {
  return apiRequest<PlanningMatter>(
    `/planning-matters/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

export async function deletePlanningMatter(
  id: number | string
) {
  return apiRequest<void>(
    `/planning-matters/${id}/`,
    {
      method: "DELETE",
    }
  );
}

/* =========================================================
   PHASE 1 — PLANNING PROCEDURES
========================================================= */

export async function getPlanningProcedures() {
  return apiRequest<PlanningProcedure[]>(
    "/planning-procedures/"
  );
}

export async function getPlanningProcedure(
  id: number | string
) {
  return apiRequest<PlanningProcedure>(
    `/planning-procedures/${id}/`
  );
}

export async function getPlanningProceduresByEngagement(
  engagementId: number | string
) {
  const procedures =
    await getPlanningProcedures();

  return procedures.filter(
    (procedure) =>
      procedure.engagement ===
      Number(engagementId)
  );
}

export async function createPlanningProcedure(
  data: Partial<PlanningProcedure>
) {
  return apiRequest<PlanningProcedure>(
    "/planning-procedures/",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function updatePlanningProcedure(
  id: number | string,
  data: Partial<PlanningProcedure>
) {
  return apiRequest<PlanningProcedure>(
    `/planning-procedures/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

export async function deletePlanningProcedure(
  id: number | string
) {
  return apiRequest<void>(
    `/planning-procedures/${id}/`,
    {
      method: "DELETE",
    }
  );
}

/* =========================================================
   FINANCIALS — ADJUSTED TRIAL BALANCE
========================================================= */

export interface AdjustedTrialBalance {
  trial_balance: {
    id: number;
    engagement: number;
    period_start: string;
    period_end: string;
    currency: string;
    status: string;
    description: string;
  };

  summary: {
    total_original_debit: number;
    total_original_credit: number;
    total_adjustment_debit: number;
    total_adjustment_credit: number;
    total_adjusted_debit: number;
    total_adjusted_credit: number;
    difference: number;
    is_balanced: boolean;
    line_count: number;
    posted_adjustment_count: number;
  };

  lines: {
    account_id: number;
    account_code: string;
    account_name: string;
    original_debit: number;
    original_credit: number;
    adjustment_debit: number;
    adjustment_credit: number;
    adjusted_debit: number;
    adjusted_credit: number;
  }[];
}

export async function getAdjustedTrialBalance(
  trialBalanceId: number | string
): Promise<AdjustedTrialBalance> {
  return apiRequest<AdjustedTrialBalance>(
    `/financials/trial-balances/${trialBalanceId}/adjusted/`
  );
}

/* =========================================================
   FINANCIALS — FINANCIAL STATEMENTS
========================================================= */

export interface FinancialStatementAccount {
  account_id: number;
  account_code: string;
  account_name: string;
  financial_statement_section: string;

  debit: number | string;
  credit: number | string;
  balance: number | string;
}

export interface FinancialStatements {
  trial_balance: {
    id: number;
    engagement: number;
    period_start: string;
    period_end: string;
    currency: string;
    status: string;
    description: string;
  };

  source: {
    original_trial_balance: boolean;
    posted_adjustments_only: boolean;
    posted_adjustment_count: number;
    adjusted_trial_balance_balanced: boolean;
  };

  profit_or_loss: {
    revenue: FinancialStatementAccount[];
    expenses: FinancialStatementAccount[];

    total_revenue: number | string;
    total_expenses: number | string;

    profit_before_tax: number | string;
    net_profit_or_loss: number | string;
  };

  statement_of_financial_position: {
    assets: FinancialStatementAccount[];
    liabilities: FinancialStatementAccount[];
    equity: FinancialStatementAccount[];

    current_period_profit_or_loss:
      number | string;

    total_assets: number | string;
    total_liabilities: number | string;
    total_equity: number | string;

    total_equity_including_profit:
      number | string;

    total_liabilities_and_equity:
      number | string;

    difference: number | string;

    is_balanced: boolean;
  };

  other_accounts:
    FinancialStatementAccount[];

  control: {
    adjusted_total_debit:
      number | string;

    adjusted_total_credit:
      number | string;

    adjusted_difference:
      number | string;

    adjusted_trial_balance_balanced:
      boolean;
  };
}

/**
 * Get Financial Statements generated from:
 *
 * Original Trial Balance
 *        +
 * Posted Audit Adjustments
 *        ↓
 * Adjusted Trial Balance
 *        ↓
 * Chart of Accounts Classification
 *        ↓
 * Financial Statements
 */
export async function getFinancialStatements(
  trialBalanceId: number | string
): Promise<FinancialStatements> {
  return apiRequest<FinancialStatements>(
    `/financials/trial-balances/${trialBalanceId}/financial-statements/`
  );
}

// ============================================================
// PHASE 2.1 — TRANSACTION CYCLE ASSESSMENTS
// ============================================================

export type TransactionCycleType =
  | "revenue"
  | "purchasing_payables"
  | "payroll"
  | "inventory"
  | "financial_statement_close"
  | "other_significant_processes";

export type TransactionCycleStatus =
  | "not_assessed"
  | "assessed";

export interface TransactionCycleAssessment {
  id: number;

  engagement: number;

  engagement_code?: string;

  cycle_type: TransactionCycleType;

  description: string;

  significant_accounts: string;

  disclosure_processes: string;

  it_applications: string;

  it_dependencies: string;

  assertions: string[];

  status: TransactionCycleStatus;

  created_at?: string;

  updated_at?: string;
}

/**
 * Get all transaction cycle assessments.
 */
export async function getTransactionCycleAssessments(): Promise<
  TransactionCycleAssessment[]
> {
  return apiRequest<TransactionCycleAssessment[]>(
    "/transaction-cycle-assessments/"
  );
}

/**
 * Get one transaction cycle assessment.
 */
export async function getTransactionCycleAssessment(
  id: number | string
): Promise<TransactionCycleAssessment> {
  return apiRequest<TransactionCycleAssessment>(
    `/transaction-cycle-assessments/${id}/`
  );
}

/**
 * Get transaction cycle assessments
 * belonging to one engagement.
 *
 * The backend currently returns all records,
 * therefore we filter by engagement on the frontend.
 */
export async function getTransactionCycleAssessmentsByEngagement(
  engagementId: number | string
): Promise<TransactionCycleAssessment[]> {
  const assessments =
    await getTransactionCycleAssessments();

  const numericEngagementId =
    Number(engagementId);

  return assessments.filter(
    (assessment) =>
      Number(assessment.engagement) ===
      numericEngagementId
  );
}

/**
 * Create a transaction cycle assessment.
 */
export async function createTransactionCycleAssessment(
  data: Partial<TransactionCycleAssessment>
): Promise<TransactionCycleAssessment> {
  return apiRequest<TransactionCycleAssessment>(
    "/transaction-cycle-assessments/",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

/**
 * Update a transaction cycle assessment.
 */
export async function updateTransactionCycleAssessment(
  id: number | string,
  data: Partial<TransactionCycleAssessment>
): Promise<TransactionCycleAssessment> {
  return apiRequest<TransactionCycleAssessment>(
    `/transaction-cycle-assessments/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

/**
 * Delete a transaction cycle assessment.
 */
export async function deleteTransactionCycleAssessment(
  id: number | string
): Promise<void> {
  return apiRequest<void>(
    `/transaction-cycle-assessments/${id}/`,
    {
      method: "DELETE",
    }
  );
}

/* =========================================================
   FINANCIALS — GENERAL LEDGER
========================================================= */

export type GeneralLedgerSource =
  | "manual"
  | "import"
  | "trial_balance"
  | "adjustment"
  | "other";

export type GeneralLedgerStatus =
  | "draft"
  | "posted"
  | "void";

export interface GeneralLedgerEntry {
  id: number;

  engagement: number;
  account: number;

  account_code: string;
  account_name: string;
  account_type: string;
  financial_statement_section: string;
  dimensions: number[];
  dimension_values: {
    id: number;
    dimension_type: "class" | "location" | "project";
    name: string;
  }[];

  transaction_date: string;

  reference: string;
  description: string;

  debit: number | string;
  credit: number | string;
  amount: number | string;

  source: GeneralLedgerSource;
  status: GeneralLedgerStatus;

  created_at: string;
  updated_at: string;
}

/**
 * Get all General Ledger entries.
 *
 * Optional filters:
 * - engagement
 * - account
 * - status
 * - source
 * - date_from
 * - date_to
 */
export async function getGeneralLedger(
  params?: {
    engagement?: number | string;
    account?: number | string;
    status?: GeneralLedgerStatus | "";
    source?: GeneralLedgerSource | "";
    date_from?: string;
    date_to?: string;
  }
): Promise<GeneralLedgerEntry[]> {
  const searchParams = new URLSearchParams();

  if (params?.engagement !== undefined && params.engagement !== "") {
    searchParams.set(
      "engagement",
      String(params.engagement)
    );
  }

  if (params?.account !== undefined && params.account !== "") {
    searchParams.set(
      "account",
      String(params.account)
    );
  }

  if (params?.status) {
    searchParams.set(
      "status",
      params.status
    );
  }

  if (params?.source) {
    searchParams.set(
      "source",
      params.source
    );
  }

  if (params?.date_from) {
    searchParams.set(
      "date_from",
      params.date_from
    );
  }

  if (params?.date_to) {
    searchParams.set(
      "date_to",
      params.date_to
    );
  }

  const query = searchParams.toString();

  return apiRequest<GeneralLedgerEntry[]>(
    `/financials/general-ledger/${
      query ? `?${query}` : ""
    }`
  );
}

/**
 * Get one General Ledger entry.
 */
export async function getGeneralLedgerEntry(
  id: number | string
): Promise<GeneralLedgerEntry> {
  return apiRequest<GeneralLedgerEntry>(
    `/financials/general-ledger/${id}/`
  );
}

/**
 * Create a General Ledger entry.
 */
export async function createGeneralLedgerEntry(
  data: Partial<GeneralLedgerEntry>
): Promise<GeneralLedgerEntry> {
  return apiRequest<GeneralLedgerEntry>(
    "/financials/general-ledger/",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

/**
 * Update a General Ledger entry.
 */
export async function updateGeneralLedgerEntry(
  id: number | string,
  data: Partial<GeneralLedgerEntry>
): Promise<GeneralLedgerEntry> {
  return apiRequest<GeneralLedgerEntry>(
    `/financials/general-ledger/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

/**
 * Delete a General Ledger entry.
 */
export async function deleteGeneralLedgerEntry(
  id: number | string
): Promise<void> {
  return apiRequest<void>(
    `/financials/general-ledger/${id}/`,
    {
      method: "DELETE",
    }
  );
}

/* =========================================================
   FINANCIALS — JOURNAL ENTRIES
========================================================= */

export type JournalEntrySource =
  | "manual"
  | "import"
  | "adjustment"
  | "other";

export type JournalEntryStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "posted"
  | "void";

export interface JournalLine {
  id?: number;

  journal_entry?: number;

  account: number;
  account_code?: string;
  account_name?: string;
  dimensions?: number[];
  dimension_values?: {
    id: number;
    dimension_type: "class" | "location" | "project";
    name: string;
  }[];

  debit: number | string;
  credit: number | string;
  amount?: number | string;

  created_at?: string;
  updated_at?: string;
}

export interface JournalEntry {
  id: number;

  engagement: number;

  entry_number: string;
  transaction_date: string;
  reference: string;
  description: string;

  source: JournalEntrySource;
  status: JournalEntryStatus;
  created_by: number | null;
  approved_by: number | null;
  approved_at: string | null;
  reversal_of: number | null;
  reversal_id: number | null;
  requires_approval: boolean;
  can_manage: boolean;
  can_approve: boolean;
  source_document: boolean;

  lines: JournalLine[];

  total_debit: number | string;
  total_credit: number | string;
  difference: number | string;

  is_balanced: boolean;
  line_count: number;

  created_at: string;
  updated_at: string;
}

/**
 * Get all Journal Entries.
 */
export async function getJournalEntries(
  params?: {
    engagement?: number | string;
    status?: JournalEntryStatus | "";
    source?: JournalEntrySource | "";
    date_from?: string;
    date_to?: string;
  }
): Promise<JournalEntry[]> {
  const searchParams = new URLSearchParams();

  if (
    params?.engagement !== undefined &&
    params.engagement !== ""
  ) {
    searchParams.set(
      "engagement",
      String(params.engagement)
    );
  }

  if (params?.status) {
    searchParams.set(
      "status",
      params.status
    );
  }

  if (params?.source) {
    searchParams.set(
      "source",
      params.source
    );
  }

  if (params?.date_from) {
    searchParams.set(
      "date_from",
      params.date_from
    );
  }

  if (params?.date_to) {
    searchParams.set(
      "date_to",
      params.date_to
    );
  }

  const query = searchParams.toString();

  return apiRequest<JournalEntry[]>(
    `/financials/journal-entries/${
      query ? `?${query}` : ""
    }`
  );
}

/**
 * Get one Journal Entry.
 */
export async function getJournalEntry(
  id: number | string
): Promise<JournalEntry> {
  return apiRequest<JournalEntry>(
    `/financials/journal-entries/${id}/`
  );
}

/**
 * Create a Journal Entry.
 */
export async function createJournalEntry(
  data: Partial<JournalEntry>
): Promise<JournalEntry> {
  return apiRequest<JournalEntry>(
    "/financials/journal-entries/",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

/**
 * Update a Journal Entry.
 */
export async function updateJournalEntry(
  id: number | string,
  data: Partial<JournalEntry>
): Promise<JournalEntry> {
  return apiRequest<JournalEntry>(
    `/financials/journal-entries/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

/**
 * Delete a Journal Entry.
 */
export async function deleteJournalEntry(
  id: number | string
): Promise<void> {
  return apiRequest<void>(
    `/financials/journal-entries/${id}/`,
    {
      method: "DELETE",
    }
  );
}

/**
 * Post a Journal Entry.
 *
 * This triggers the backend posting workflow:
 *
 * Journal Entry
 *      ↓
 * Validation
 *      ↓
 * General Ledger
 *      ↓
 * Journal status = posted
 */
export async function postJournalEntry(
  id: number | string
): Promise<JournalEntry> {
  return apiRequest<JournalEntry>(
    `/financials/journal-entries/${id}/post/`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
}


/* =========================================================
   FINANCIALS — JOURNAL LINES
========================================================= */

/**
 * Get all Journal Lines.
 */
export async function getJournalLines(
  params?: {
    journal_entry?: number | string;
    account?: number | string;
  }
): Promise<JournalLine[]> {
  const searchParams = new URLSearchParams();

  if (
    params?.journal_entry !== undefined &&
    params.journal_entry !== ""
  ) {
    searchParams.set(
      "journal_entry",
      String(params.journal_entry)
    );
  }

  if (
    params?.account !== undefined &&
    params.account !== ""
  ) {
    searchParams.set(
      "account",
      String(params.account)
    );
  }

  const query = searchParams.toString();

  return apiRequest<JournalLine[]>(
    `/financials/journal-lines/${
      query ? `?${query}` : ""
    }`
  );
}

/**
 * Get one Journal Line.
 */
export async function getJournalLine(
  id: number | string
): Promise<JournalLine> {
  return apiRequest<JournalLine>(
    `/financials/journal-lines/${id}/`
  );
}

/**
 * Create a Journal Line.
 */
export async function createJournalLine(
  data: Partial<JournalLine>
): Promise<JournalLine> {
  return apiRequest<JournalLine>(
    "/financials/journal-lines/",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

/**
 * Update a Journal Line.
 */
export async function updateJournalLine(
  id: number | string,
  data: Partial<JournalLine>
): Promise<JournalLine> {
  return apiRequest<JournalLine>(
    `/financials/journal-lines/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

/**
 * Delete a Journal Line.
 */
export async function deleteJournalLine(
  id: number | string
): Promise<void> {
  return apiRequest<void>(
    `/financials/journal-lines/${id}/`,
    {
      method: "DELETE",
    }
  );
}