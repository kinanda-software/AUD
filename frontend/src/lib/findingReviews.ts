import { apiRequest } from "@/lib/api";
import type { EvidencePage } from "@/lib/financialEvidence";

export const reviewOutcomes = {
  explained: "Explained / no exception identified",
  exception: "Exception confirmed",
  follow_up: "Further work required",
};
export const reviewStates = {
  unreviewed: "Unreviewed", reviewed: "Awaiting independent sign-off",
  signed_off: "Signed off", returned: "Returned for further work", reopened: "Reopened",
};
export type ReviewOutcome = keyof typeof reviewOutcomes;
export type ReviewState = keyof typeof reviewStates;
export type ReviewAction = "review" | "sign_off" | "return" | "reopen";
export interface FindingReview {
  id: number; run: number; finding_index: number; action: ReviewAction; state: ReviewState;
  outcome: ReviewOutcome; conclusion: string; note: string; evidence_link_ids: number[];
  previous: number | null; actor: number | null; actor_identifier: number;
  actor_name: string; actor_role: string; created_at: string;
}
export interface ReviewStatus {
  run: number; finding_count: number; counts: Record<ReviewState, number>;
  offset: number; next_offset: number | null;
  results: { finding_index: number; state: ReviewState; latest: FindingReview | null }[];
}
export interface ReviewInput {
  run: number; finding_index: number; action: ReviewAction;
  expected_previous: number | null; note: string; outcome?: ReviewOutcome; conclusion?: string;
}
export function getReviewStatus(run: number, offset: number) {
  return apiRequest<ReviewStatus>(`/financials/finding-reviews/status/?run=${run}&offset=${offset}`);
}
export function getReviewHistory(run: number, index: number, page = 1) {
  return apiRequest<EvidencePage<FindingReview>>(`/financials/finding-reviews/?run=${run}&finding_index=${index}&page=${page}`);
}
export function recordReview(data: ReviewInput) {
  return apiRequest<FindingReview>("/financials/finding-reviews/", { method: "POST", body: JSON.stringify(data) });
}
