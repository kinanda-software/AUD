
const API_URL = "http://localhost:8000";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface Engagement {
  id: number;
  title?: string;
  name?: string;
  engagement_code?: string;
  code?: string;
}

export interface ChartOfAccount {
  id: number;
  engagement: number;
  account_code: string;
  account_name: string;
  account_type: string;
  financial_statement_section: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrialBalanceLine {
  id: number;
  trial_balance: number;
  account: number;
  account_code: string;
  account_name: string;
  debit: string;
  credit: string;
  created_at: string;
  updated_at: string;
}

export interface TrialBalance {
  id: number;
  engagement: number;
  period_start: string;
  period_end: string;
  currency: string;
  status: "draft" | "imported" | "reviewed" | "locked";
  description: string;
  lines: TrialBalanceLine[];
  total_debit: string;
  total_credit: string;
  difference: string;
  is_balanced: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrialBalanceSummary {
  id: number;
  engagement: number;
  period_start: string;
  period_end: string;
  currency: string;
  status: string;
  total_debit: number;
  total_credit: number;
  difference: number;
  is_balanced: boolean;
  line_count: number;
}

interface ApiListResponse<T> {
  results?: T[];
}

/* -------------------------------------------------------------------------- */
/* Cookie helper                                                              */
/* -------------------------------------------------------------------------- */

function getCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie.split("; ");

  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split("=");

    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* API request helper                                                         */
/* -------------------------------------------------------------------------- */

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const csrfToken = getCookie("csrftoken");

  const headers = new Headers(options.headers);

  /*
   * JSON content type.
   *
   * We only need this for requests with a body, but keeping it here
   * is compatible with the current Django REST API.
   */
  headers.set("Content-Type", "application/json");

  /*
   * Django CSRF token.
   *
   * This is required for POST, PATCH and DELETE requests.
   */
  if (csrfToken) {
    headers.set("X-CSRFToken", csrfToken);
  }

  /*
   * Django checks the Referer for CSRF-protected requests.
   */
  if (typeof window !== "undefined") {
    headers.set("Referer", window.location.origin);
  }

  /*
   * Diagnostic information.
   *
   * IMPORTANT:
   * We do NOT print the actual session cookie or CSRF token.
   */
  console.log("========================================");
  console.log("AUD API REQUEST");
  console.log("Endpoint:", endpoint);
  console.log("Full URL:", `${API_URL}${endpoint}`);
  console.log(
    "Browser origin:",
    typeof window !== "undefined"
      ? window.location.origin
      : "server"
  );
  console.log(
    "CSRF cookie available:",
    csrfToken ? "YES" : "NO"
  );
  console.log("Credentials mode: include");
  console.log("========================================");

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  console.log("AUD API RESPONSE");
  console.log("Endpoint:", endpoint);
  console.log("Status:", response.status);
  console.log("OK:", response.ok);

  const contentType =
    response.headers.get("content-type") || "";

  let data: unknown = null;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();

    data = text
      ? {
          detail: text,
        }
      : null;
  }

  /*
   * Handle API errors.
   */
  if (!response.ok) {
    let message =
      `Request failed with status ${response.status}.`;

    if (data && typeof data === "object") {
      const errorData =
        data as Record<string, unknown>;

      /*
       * Django REST Framework commonly returns:
       *
       * {
       *   "detail": "Authentication credentials were not provided."
       * }
       */
      if (typeof errorData.detail === "string") {
        message = errorData.detail;
      } else {
        const firstValue =
          Object.values(errorData)[0];

        if (
          Array.isArray(firstValue) &&
          firstValue.length > 0
        ) {
          message = String(firstValue[0]);
        } else if (
          typeof firstValue === "string"
        ) {
          message = firstValue;
        }
      }
    } else if (
      Array.isArray(data) &&
      data.length > 0
    ) {
      message = String(data[0]);
    }

    console.error(
      "AUD API ERROR:",
      message
    );

    console.error(
      "Response data:",
      data
    );

    throw new Error(message);
  }

  console.log("AUD API REQUEST SUCCESS:", endpoint);

  return data as T;
}

/* -------------------------------------------------------------------------- */
/* List helper                                                                */
/* -------------------------------------------------------------------------- */

function extractList<T>(
  data: T[] | ApiListResponse<T>
): T[] {
  if (Array.isArray(data)) {
    return data;
  }

  return data.results || [];
}

/* -------------------------------------------------------------------------- */
/* Engagements                                                               */
/* -------------------------------------------------------------------------- */

export async function getEngagements(): Promise<
  Engagement[]
> {
  const data =
    await apiRequest<
      Engagement[] | ApiListResponse<Engagement>
    >("/api/engagements/");

  return extractList(data);
}

/* -------------------------------------------------------------------------- */
/* Chart of Accounts                                                         */
/* -------------------------------------------------------------------------- */

export async function getChartOfAccounts(
  engagementId: number
): Promise<ChartOfAccount[]> {
  const data =
    await apiRequest<
      ChartOfAccount[] |
        ApiListResponse<ChartOfAccount>
    >(
      `/api/financials/chart-of-accounts/?engagement=${engagementId}`
    );

  return extractList(data);
}

export async function createChartOfAccount(
  payload: Partial<ChartOfAccount>
): Promise<ChartOfAccount> {
  return apiRequest<ChartOfAccount>(
    "/api/financials/chart-of-accounts/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

/* -------------------------------------------------------------------------- */
/* Trial Balances                                                            */
/* -------------------------------------------------------------------------- */

export async function getTrialBalances(
  engagementId?: number
): Promise<TrialBalance[]> {
  const endpoint = engagementId
    ? `/api/financials/trial-balances/?engagement=${engagementId}`
    : "/api/financials/trial-balances/";

  const data =
    await apiRequest<
      TrialBalance[] |
        ApiListResponse<TrialBalance>
    >(endpoint);

  return extractList(data);
}

export async function getTrialBalance(
  id: number
): Promise<TrialBalance> {
  return apiRequest<TrialBalance>(
    `/api/financials/trial-balances/${id}/`
  );
}

export async function createTrialBalance(payload: {
  engagement: number;
  period_start: string;
  period_end: string;
  currency: string;
  status?: string;
  description?: string;
}): Promise<TrialBalance> {
  return apiRequest<TrialBalance>(
    "/api/financials/trial-balances/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function updateTrialBalance(
  id: number,
  payload: Partial<TrialBalance>
): Promise<TrialBalance> {
  return apiRequest<TrialBalance>(
    `/api/financials/trial-balances/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export async function getTrialBalanceSummary(
  id: number
): Promise<TrialBalanceSummary> {
  return apiRequest<TrialBalanceSummary>(
    `/api/financials/trial-balances/${id}/summary/`
  );
}

export async function lockTrialBalance(
  id: number
): Promise<TrialBalance> {
  return apiRequest<TrialBalance>(
    `/api/financials/trial-balances/${id}/lock/`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
}

/* -------------------------------------------------------------------------- */
/* Trial Balance Lines                                                        */
/* -------------------------------------------------------------------------- */

export async function createTrialBalanceLine(
  payload: {
    trial_balance: number;
    account: number;
    debit: string;
    credit: string;
  }
): Promise<TrialBalanceLine> {
  return apiRequest<TrialBalanceLine>(
    "/api/financials/trial-balance-lines/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function updateTrialBalanceLine(
  id: number,
  payload: {
    account?: number;
    debit?: string;
    credit?: string;
  }
): Promise<TrialBalanceLine> {
  return apiRequest<TrialBalanceLine>(
    `/api/financials/trial-balance-lines/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteTrialBalanceLine(
  id: number
): Promise<void> {
  await apiRequest(
    `/api/financials/trial-balance-lines/${id}/`,
    {
      method: "DELETE",
    }
  );
}

