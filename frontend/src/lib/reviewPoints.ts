import { apiRequest } from "@/lib/api";

/* =========================================================
   REVIEW POINTS (clearance notes)
========================================================= */

export type ReviewPointStatus = "open" | "responded" | "cleared";

export interface ReviewPoint {
  id: number;
  engagement: number;
  engagement_code: string;
  reference: string;
  section: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: ReviewPointStatus;
  raised_by: number | null;
  raised_by_name: string;
  assigned_to: number | null;
  assigned_to_name: string;
  response: string;
  responded_by: number | null;
  responded_by_username: string;
  responded_at: string | null;
  cleared_by: number | null;
  cleared_by_username: string;
  cleared_at: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export type ReviewPointInput = {
  engagement: number;
  title: string;
  description: string;
  section?: string;
  priority?: ReviewPoint["priority"];
  assigned_to?: number | null;
  due_date?: string | null;
};

export interface ReviewPointSummary {
  total: number;
  open: number;
  by_status: Record<string, { label: string; count: number }>;
}

export async function getReviewPoints(filters?: {
  engagement?: number;
  status?: ReviewPointStatus;
  assignedTo?: number;
  section?: string;
}): Promise<ReviewPoint[]> {
  const params = new URLSearchParams();
  if (filters?.engagement) {
    params.set("engagement", String(filters.engagement));
  }
  if (filters?.status) params.set("status", filters.status);
  if (filters?.assignedTo) {
    params.set("assigned_to", String(filters.assignedTo));
  }
  if (filters?.section) params.set("section", filters.section);
  const query = params.toString();
  return apiRequest<ReviewPoint[]>(
    `/review-points/${query ? `?${query}` : ""}`,
  );
}

export async function getReviewPointSummary(
  engagement?: number,
): Promise<ReviewPointSummary> {
  const query = engagement ? `?engagement=${engagement}` : "";
  return apiRequest<ReviewPointSummary>(
    `/review-points/summary/${query}`,
  );
}

export async function createReviewPoint(
  data: ReviewPointInput,
): Promise<ReviewPoint> {
  return apiRequest<ReviewPoint>("/review-points/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateReviewPoint(
  id: number,
  data: Partial<ReviewPointInput>,
): Promise<ReviewPoint> {
  return apiRequest<ReviewPoint>(`/review-points/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function respondToReviewPoint(
  id: number,
  response: string,
): Promise<ReviewPoint> {
  return apiRequest<ReviewPoint>(`/review-points/${id}/respond/`, {
    method: "POST",
    body: JSON.stringify({ response }),
  });
}

export async function clearReviewPoint(id: number): Promise<ReviewPoint> {
  return apiRequest<ReviewPoint>(`/review-points/${id}/clear/`, {
    method: "POST",
  });
}

export async function reopenReviewPoint(id: number): Promise<ReviewPoint> {
  return apiRequest<ReviewPoint>(`/review-points/${id}/reopen/`, {
    method: "POST",
  });
}

export async function deleteReviewPoint(id: number): Promise<void> {
  await apiRequest(`/review-points/${id}/`, { method: "DELETE" });
}
