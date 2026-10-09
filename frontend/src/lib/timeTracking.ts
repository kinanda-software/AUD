import { apiRequest } from "@/lib/api";

/* =========================================================
   TIME TRACKING (budget vs actual hours)
========================================================= */

export type TimeEntryPhase =
  | "planning"
  | "risk_assessment"
  | "fieldwork"
  | "review"
  | "completion"
  | "other";

export interface TimeEntry {
  id: number;
  engagement: number;
  engagement_code: string;
  user: number;
  username: string;
  user_name: string;
  entry_date: string;
  hours: string;
  phase: TimeEntryPhase;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface TimeSummaryRow {
  engagement: number;
  budgeted_hours: number;
  actual_hours: number;
  variance_hours: number;
  utilization_percent: number | null;
  by_phase: Record<string, number>;
  by_user: Record<string, number>;
}

export async function getTimeEntries(filters?: {
  engagement?: number;
  user?: number;
  phase?: TimeEntryPhase;
}): Promise<TimeEntry[]> {
  const params = new URLSearchParams();
  if (filters?.engagement) {
    params.set("engagement", String(filters.engagement));
  }
  if (filters?.user) params.set("user", String(filters.user));
  if (filters?.phase) params.set("phase", filters.phase);
  const query = params.toString();
  return apiRequest<TimeEntry[]>(
    `/time-entries/${query ? `?${query}` : ""}`,
  );
}

export async function getTimeSummary(
  engagement?: number,
): Promise<TimeSummaryRow[]> {
  const query = engagement ? `?engagement=${engagement}` : "";
  return apiRequest<TimeSummaryRow[]>(
    `/time-entries/summary/${query}`,
  );
}

export async function createTimeEntry(data: {
  engagement: number;
  entry_date: string;
  hours: number | string;
  phase: TimeEntryPhase;
  description?: string;
}): Promise<TimeEntry> {
  return apiRequest<TimeEntry>("/time-entries/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteTimeEntry(id: number): Promise<void> {
  await apiRequest(`/time-entries/${id}/`, { method: "DELETE" });
}
