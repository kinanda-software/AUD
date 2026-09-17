const API_URL = "http://localhost:8000/api";

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

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const method = options?.method?.toUpperCase() ?? "GET";

  const headers = new Headers(options?.headers);

  headers.set("Content-Type", "application/json");

  const requiresCsrf = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (requiresCsrf) {
    const csrfToken = await ensureCsrfToken();

    if (csrfToken) {
      headers.set("X-CSRFToken", csrfToken);
    }
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      errorText || `API request failed with status ${response.status}`
    );
  }

  /*
   * DELETE requests commonly return HTTP 204
   * with no JSON body.
   */
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
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

export async function getEngagements(): Promise<Engagement[]> {
  return apiRequest<Engagement[]>("/engagements/");
}

export async function getEngagement(
  id: number | string
): Promise<Engagement> {
  return apiRequest<Engagement>(`/engagements/${id}/`);
}

/* =========================================================
   CLIENTS
========================================================= */

export async function getClients() {
  return apiRequest("/clients/");
}

export async function getClient(id: number | string) {
  return apiRequest(`/clients/${id}/`);
}

/* =========================================================
   PHASE 1 — PLANNING ASSESSMENT
========================================================= */

export async function getPlanningAssessments() {
  return apiRequest<PlanningAssessment[]>(
    "/planning-assessments/"
  );
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
  const assessments = await getPlanningAssessments();

  return (
    assessments.find(
      (assessment) =>
        assessment.engagement === Number(engagementId)
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
  return apiRequest<MaterialityAssessment[]>(
    "/materiality-assessments/"
  );
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
  const assessments = await getMaterialityAssessments();

  return (
    assessments.find(
      (assessment) =>
        assessment.engagement === Number(engagementId)
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
  const scopes = await getAuditScopes();

  return (
    scopes.find(
      (scope) =>
        scope.engagement === Number(engagementId)
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

export async function getAuditTeamMembers() {
  return apiRequest<AuditTeamMember[]>(
    "/audit-team-members/"
  );
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
  const members = await getAuditTeamMembers();

  return members.filter(
    (member) =>
      member.engagement === Number(engagementId)
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
  const matters = await getPlanningMatters();

  return matters.filter(
    (matter) =>
      matter.engagement === Number(engagementId)
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
  const procedures = await getPlanningProcedures();

  return procedures.filter(
    (procedure) =>
      procedure.engagement === Number(engagementId)
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