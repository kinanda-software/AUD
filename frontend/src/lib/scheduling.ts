import { apiRequest } from "@/lib/api";

/* =========================================================
   AUDIT SCHEDULING
========================================================= */

export type ScheduleStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface AuditSchedule {
  id: number;
  engagement: number;
  engagement_code: string;
  client_name: string;
  title: string;
  audit_type: "internal" | "external";
  scheduled_start: string;
  scheduled_end: string;
  location: string;
  status: ScheduleStatus;
  assigned_auditors: number[];
  assigned_auditor_names: string[];
  auditee_name: string;
  auditee_email: string;
  reminder_days: number;
  reminder_sent: boolean;
  recurrence_months: number | null;
  next_occurrence: string | null;
  notes: string;
  created_by: number | null;
  created_by_username: string;
  created_at: string;
  updated_at: string;
}

export type AuditScheduleInput = {
  engagement: number;
  title: string;
  audit_type: "internal" | "external";
  scheduled_start: string;
  scheduled_end: string;
  location?: string;
  assigned_auditors?: number[];
  auditee_name?: string;
  auditee_email?: string;
  reminder_days?: number;
  recurrence_months?: number | null;
  notes?: string;
};

export async function getSchedules(
  engagementId?: number,
  status?: ScheduleStatus,
): Promise<AuditSchedule[]> {
  const params = new URLSearchParams();
  if (engagementId) params.set("engagement", String(engagementId));
  if (status) params.set("status", status);
  const query = params.toString();
  return apiRequest<AuditSchedule[]>(
    `/schedules/${query ? `?${query}` : ""}`,
  );
}

export async function getUpcomingSchedules(
  days?: number,
): Promise<AuditSchedule[]> {
  const query = days ? `?days=${days}` : "";
  return apiRequest<AuditSchedule[]>(`/schedules/upcoming/${query}`);
}

export async function createSchedule(
  data: AuditScheduleInput,
): Promise<AuditSchedule> {
  return apiRequest<AuditSchedule>("/schedules/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSchedule(
  id: number,
  data: Partial<AuditScheduleInput & { status: ScheduleStatus }>,
): Promise<AuditSchedule> {
  return apiRequest<AuditSchedule>(`/schedules/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteSchedule(id: number): Promise<void> {
  await apiRequest(`/schedules/${id}/`, { method: "DELETE" });
}

export async function scheduleNextOccurrence(
  id: number,
): Promise<AuditSchedule> {
  return apiRequest<AuditSchedule>(`/schedules/${id}/schedule-next/`, {
    method: "POST",
  });
}
