import { apiRequest } from "@/lib/api";
import { API_ORIGIN } from "@/lib/apiConfig";

/* =========================================================
   FRAUD REPORTING (public whistleblowing channel)
========================================================= */

export interface FraudReport {
  id: number;
  reference: string;
  subject: string;
  description: string;
  reporter_name: string;
  reporter_email: string;
  reporter_phone: string;
  status: "submitted" | "under_review" | "investigating" | "closed";
  triage_notes: string;
  reviewed_by: number | null;
  reviewed_by_username: string;
  reviewed_at: string | null;
  created_at: string;
}

/** Public submission — no auth token required. */
export async function submitFraudReport(data: {
  subject: string;
  description: string;
  reporter_name?: string;
  reporter_email?: string;
  reporter_phone?: string;
}): Promise<{ reference: string; message: string }> {
  const response = await fetch(
    `${API_ORIGIN}/api/fraud-reports/submit/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      text || `Submission failed with status ${response.status}`
    );
  }
  return JSON.parse(text);
}

/* ---------------- Staff endpoints (authenticated) -------- */

export async function getFraudReports(
  status?: string
): Promise<FraudReport[]> {
  const query = status ? `?status=${status}` : "";
  return apiRequest<FraudReport[]>(`/fraud-reports/${query}`);
}

export async function triageFraudReport(
  id: number,
  decision: "under_review" | "investigating" | "closed",
  triageNotes?: string
): Promise<FraudReport> {
  return apiRequest<FraudReport>(`/fraud-reports/${id}/triage/`, {
    method: "POST",
    body: JSON.stringify({ decision, triage_notes: triageNotes }),
  });
}
