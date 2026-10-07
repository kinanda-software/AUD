import { apiRequest } from "@/lib/api";
import { API_ORIGIN } from "@/lib/apiConfig";

export type DashboardEngagement = {
  id: number;
  engagement_code: string;
  client_name: string;
  title: string;
  status: string;
  current_phase: string;
  risk_level: string;
  planned_end_date: string | null;
  progress_percentage: number;
  updated_at: string;
};

export type DashboardReview = {
  id: number;
  engagement: number;
  reviewer: number;
  reviewer_name: string;
  review_area: string;
  due_date: string | null;
  status: string;
  updated_at: string;
};

export type DashboardData = {
  engagements: DashboardEngagement[];
  reviews: DashboardReview[];
};

type Page<T> = { results: T[]; next: string | null };

export async function fetchAllRecords<T>(
  endpoint: string,
  signal?: AbortSignal,
): Promise<T[]> {
  const records: T[] = [];
  const visited = new Set<string>();
  let current: string | null = endpoint;
  const base = new URL(`${API_ORIGIN}/api${endpoint}`);
  while (current) {
    if (visited.has(current)) {
      throw new Error("The API returned a repeated pagination link.");
    }
    visited.add(current);
    const data: T[] | Page<T> = await apiRequest<T[] | Page<T>>(current, {
      cache: "no-store",
      signal,
    });
    if (Array.isArray(data)) {
      records.push(...data);
      break;
    }
    if (!data || !Array.isArray(data.results)
      || !(data.next === null || typeof data.next === "string")) {
      throw new Error(`Invalid list response from ${endpoint}.`);
    }
    records.push(...data.results);
    if (data.next) {
      const next: URL = new URL(data.next, base);
      if (next.origin !== base.origin || next.pathname !== base.pathname) {
        throw new Error("The API returned an unexpected pagination destination.");
      }
      current = `${endpoint.split("?")[0]}${next.search}`;
    } else {
      current = null;
    }
  }
  return records;
}

export async function loadDashboard(signal?: AbortSignal): Promise<DashboardData> {
  const [engagements, reviews] = await Promise.all([
    fetchAllRecords<DashboardEngagement>("/engagements/", signal),
    fetchAllRecords<DashboardReview>("/review-assignments/", signal),
  ]);
  for (const engagement of engagements) {
    if (!Number.isFinite(engagement.progress_percentage)
      || engagement.progress_percentage < 0 || engagement.progress_percentage > 100) {
      throw new Error(`Invalid recorded progress for ${engagement.engagement_code}.`);
    }
    daysUntil(engagement.planned_end_date);
  }
  for (const review of reviews) {
    daysUntil(review.due_date);
  }
  return { engagements, reviews };
}

const millisecondsPerDay = 86_400_000;

function dateOrdinal(value: string): number {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) throw new Error(`Invalid calendar date: ${value}.`);
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day) {
    throw new Error(`Invalid calendar date: ${value}.`);
  }
  return date.getTime() / millisecondsPerDay;
}

export function daysUntil(value: string | null, now = new Date()): number | null {
  if (value === null) return null;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return dateOrdinal(value) - dateOrdinal(today);
}

export function deadlineLabel(days: number | null): string {
  if (days === null) return "No deadline";
  if (days < 0) return `${Math.abs(days)} day${days === -1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

export function formatCalendarDate(value: string | null): string {
  if (value === null) return "Not set";
  return new Date(dateOrdinal(value) * millisecondsPerDay).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  });
}

export function recordLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function greeting(now: Date): string {
  const hour = now.getHours();
  return hour >= 5 && hour < 12 ? "Good morning"
    : hour >= 12 && hour < 17 ? "Good afternoon" : "Good evening";
}

export const auditPhases = [
  { key: "phase_1", title: "Planning" },
  { key: "phase_2", title: "Risk Assessment" },
  { key: "phase_3", title: "Risk Response" },
  { key: "phase_4", title: "Conclusion & Reporting" },
];

export function summarizeDashboard(data: DashboardData, now: Date) {
  const active = data.engagements.filter((item) =>
    item.status !== "completed" && item.status !== "cancelled");
  const activeIds = new Set(active.map((item) => item.id));
  const openReviews = data.reviews.filter((item) =>
    activeIds.has(item.engagement) && item.status !== "Completed");
  const deadlines = active
    .flatMap((item) => {
      const days = daysUntil(item.planned_end_date, now);
      return days === null ? [] : [{ engagement: item, days }];
    })
    .sort((a, b) => a.days - b.days || a.engagement.id - b.engagement.id);
  const risks = ["high", "medium", "low"].map((risk) => ({
    risk, count: active.filter((item) => item.risk_level === risk).length,
  }));
  const phases = auditPhases.map((phase) => {
    const items = active.filter((item) => item.current_phase === phase.key);
    return {
      ...phase,
      count: items.length,
      averageProgress: items.length
        ? Math.round(items.reduce((sum, item) => sum + item.progress_percentage, 0) / items.length)
        : null,
    };
  });
  return {
    total: data.engagements.length,
    active,
    completed: data.engagements.filter((item) => item.status === "completed").length,
    cancelled: data.engagements.filter((item) => item.status === "cancelled").length,
    highRisk: risks[0].count,
    overdue: deadlines.filter((item) => item.days < 0).length,
    dueSoon: deadlines.filter((item) => item.days >= 0 && item.days <= 14).length,
    noDeadline: active.filter((item) => item.planned_end_date === null).length,
    openReviews,
    deadlines,
    risks,
    phases,
    unassignedPhase: active.filter((item) =>
      !auditPhases.some((phase) => phase.key === item.current_phase)).length,
    unclassifiedRisk: active.filter((item) =>
      !risks.some((risk) => risk.risk === item.risk_level)).length,
  };
}
