import { apiRequest } from "@/lib/api";

/* =========================================================
   CONTINUOUS CONTROLS MONITORING
========================================================= */

export type MonitoringRuleType =
  | "large_amount"
  | "round_number"
  | "off_hours"
  | "backdated";

export type MonitoringSeverity = "info" | "low" | "medium" | "high";

export interface MonitoringRule {
  id: number;
  engagement: number | null;
  engagement_code: string;
  name: string;
  rule_type: MonitoringRuleType;
  rule_type_label: string;
  parameters: Record<string, number>;
  severity: MonitoringSeverity;
  is_active: boolean;
  alert_count: number;
  created_by: number | null;
  created_at: string;
}

export type AlertStatus = "open" | "acknowledged" | "dismissed";

export interface MonitoringAlert {
  id: number;
  rule: number;
  rule_name: string;
  rule_type: MonitoringRuleType;
  engagement: number;
  engagement_code: string;
  title: string;
  object_type: string;
  object_id: string;
  severity: MonitoringSeverity;
  details: {
    evidence?: string;
    operation?: string;
    snapshot?: Record<string, unknown>;
  };
  status: AlertStatus;
  acknowledged_by: number | null;
  acknowledged_by_username: string;
  acknowledged_at: string | null;
  created_at: string;
}

export interface MonitoringSummary {
  open: number;
  acknowledged: number;
  dismissed: number;
  by_severity: Record<string, { label: string; count: number }>;
}

export async function getMonitoringRules(
  engagement?: number
): Promise<MonitoringRule[]> {
  const query = engagement ? `?engagement=${engagement}` : "";
  return apiRequest<MonitoringRule[]>(`/monitoring-rules/${query}`);
}

export async function createMonitoringRule(data: {
  name: string;
  rule_type: MonitoringRuleType;
  parameters?: Record<string, number>;
  severity?: MonitoringSeverity;
  engagement?: number | null;
}): Promise<MonitoringRule> {
  return apiRequest<MonitoringRule>("/monitoring-rules/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function toggleMonitoringRule(
  id: number
): Promise<MonitoringRule> {
  return apiRequest<MonitoringRule>(`/monitoring-rules/${id}/toggle/`, {
    method: "POST",
  });
}

export async function deleteMonitoringRule(id: number): Promise<void> {
  await apiRequest(`/monitoring-rules/${id}/`, { method: "DELETE" });
}

export async function getMonitoringAlerts(filters?: {
  engagement?: number;
  status?: AlertStatus;
  severity?: MonitoringSeverity;
}): Promise<MonitoringAlert[]> {
  const params = new URLSearchParams();
  if (filters?.engagement) {
    params.set("engagement", String(filters.engagement));
  }
  if (filters?.status) params.set("status", filters.status);
  if (filters?.severity) params.set("severity", filters.severity);
  const query = params.toString();
  return apiRequest<MonitoringAlert[]>(
    `/monitoring-alerts/${query ? `?${query}` : ""}`
  );
}

export async function getMonitoringSummary(
  engagement?: number
): Promise<MonitoringSummary> {
  const query = engagement ? `?engagement=${engagement}` : "";
  return apiRequest<MonitoringSummary>(
    `/monitoring-alerts/summary/${query}`
  );
}

export async function acknowledgeAlert(
  id: number
): Promise<MonitoringAlert> {
  return apiRequest<MonitoringAlert>(
    `/monitoring-alerts/${id}/acknowledge/`,
    { method: "POST" }
  );
}

export async function dismissAlert(id: number): Promise<MonitoringAlert> {
  return apiRequest<MonitoringAlert>(
    `/monitoring-alerts/${id}/dismiss/`,
    { method: "POST" }
  );
}
