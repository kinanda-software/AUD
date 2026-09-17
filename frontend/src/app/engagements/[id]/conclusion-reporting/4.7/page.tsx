"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "../../../../../components/layout/AppLayout";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileCheck2,
  Save,
  ShieldCheck,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000/api";

type CompletionStatus =
  | "Not Started"
  | "In Progress"
  | "Completed";

type CompletionReview = {
  id?: number;
  engagement: number;
  engagement_name?: string;
  status: CompletionStatus;

  financial_statements_finalized: boolean;
  audit_adjustments_reviewed: boolean;
  subsequent_events_reviewed: boolean;
  going_concern_reviewed: boolean;
  legal_matters_reviewed: boolean;
  related_parties_reviewed: boolean;
  audit_documentation_completed: boolean;
  review_points_cleared: boolean;
  partner_review_completed: boolean;
  eqr_completed: boolean;

  outstanding_matters: string;
  final_review_notes: string;
  completion_conclusion: string;

  completed_by?: number | null;
  completed_by_name?: string | null;
  completion_date?: string | null;

  created_at?: string;
  updated_at?: string;
};

type ChecklistItem = {
  key: keyof Pick<
    CompletionReview,
    | "financial_statements_finalized"
    | "audit_adjustments_reviewed"
    | "subsequent_events_reviewed"
    | "going_concern_reviewed"
    | "legal_matters_reviewed"
    | "related_parties_reviewed"
    | "audit_documentation_completed"
    | "review_points_cleared"
    | "partner_review_completed"
    | "eqr_completed"
  >;
  title: string;
  description: string;
};

const checklist: ChecklistItem[] = [
  {
    key: "financial_statements_finalized",
    title: "Financial statements finalized",
    description:
      "Confirm that the final financial statements and disclosures have been received and reviewed.",
  },
  {
    key: "audit_adjustments_reviewed",
    title: "Audit adjustments reviewed",
    description:
      "Confirm that identified misstatements and management adjustments have been evaluated.",
  },
  {
    key: "subsequent_events_reviewed",
    title: "Subsequent events reviewed",
    description:
      "Confirm that subsequent events procedures have been completed through the appropriate date.",
  },
  {
    key: "going_concern_reviewed",
    title: "Going concern assessment reviewed",
    description:
      "Confirm that going concern considerations and related disclosures have been evaluated.",
  },
  {
    key: "legal_matters_reviewed",
    title: "Legal matters reviewed",
    description:
      "Confirm that significant legal claims, litigation and correspondence have been considered.",
  },
  {
    key: "related_parties_reviewed",
    title: "Related parties reviewed",
    description:
      "Confirm that related-party relationships and transactions have been evaluated.",
  },
  {
    key: "audit_documentation_completed",
    title: "Audit documentation completed",
    description:
      "Confirm that required audit workpapers contain sufficient evidence and conclusions.",
  },
  {
    key: "review_points_cleared",
    title: "Review points cleared",
    description:
      "Confirm that outstanding review notes and review points have been resolved.",
  },
  {
    key: "partner_review_completed",
    title: "Partner review completed",
    description:
      "Confirm that the engagement partner has completed the final review.",
  },
  {
    key: "eqr_completed",
    title: "Engagement quality review completed",
    description:
      "Confirm that the engagement quality review has been completed where applicable.",
  },
];

function createDefaultReview(
  engagementId: number
): CompletionReview {
  return {
    engagement: engagementId,
    status: "Not Started",

    financial_statements_finalized: false,
    audit_adjustments_reviewed: false,
    subsequent_events_reviewed: false,
    going_concern_reviewed: false,
    legal_matters_reviewed: false,
    related_parties_reviewed: false,
    audit_documentation_completed: false,
    review_points_cleared: false,
    partner_review_completed: false,
    eqr_completed: false,

    outstanding_matters: "",
    final_review_notes: "",
    completion_conclusion: "",
    completed_by: null,
    completed_by_name: null,
    completion_date: null,
  };
}

export default function ConclusionReporting47Page() {
  const params = useParams();
  const router = useRouter();

  const engagementId = Number(params.id);

  const [review, setReview] = useState<CompletionReview>(
    createDefaultReview(engagementId)
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const completedCount = useMemo(() => {
    return checklist.filter((item) => review[item.key]).length;
  }, [review]);

  const completionPercentage = Math.round(
    (completedCount / checklist.length) * 100
  );

  useEffect(() => {
    if (!engagementId || Number.isNaN(engagementId)) {
      setError("Invalid engagement ID.");
      setLoading(false);
      return;
    }

    const loadReview = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/completion-reviews/?engagement=${engagementId}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `Unable to load completion review (${response.status}).`
          );
        }

        const data = await response.json();

        const records = Array.isArray(data)
          ? data
          : data.results || [];

        if (records.length > 0) {
          setReview(records[0]);
        } else {
          setReview(createDefaultReview(engagementId));
        }
      } catch (err) {
        console.error(err);

        setError(
          "Unable to load the final completion review from the server."
        );
      } finally {
        setLoading(false);
      }
    };

    loadReview();
  }, [engagementId]);

  const updateChecklist = (
    key: ChecklistItem["key"],
    value: boolean
  ) => {
    setReview((current) => ({
      ...current,
      [key]: value,
      status:
        value || completedCount > 0
          ? "In Progress"
          : "Not Started",
    }));

    setMessage("");
    setError("");
  };

  const updateField = (
    field:
      | "outstanding_matters"
      | "final_review_notes"
      | "completion_conclusion",
    value: string
  ) => {
    setReview((current) => ({
      ...current,
      [field]: value,
      status:
        current.status === "Completed"
          ? "In Progress"
          : current.status,
    }));

    setMessage("");
    setError("");
  };

  const saveReview = async (): Promise<boolean> => {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        engagement: engagementId,
        status: review.status,

        financial_statements_finalized:
          review.financial_statements_finalized,

        audit_adjustments_reviewed:
          review.audit_adjustments_reviewed,

        subsequent_events_reviewed:
          review.subsequent_events_reviewed,

        going_concern_reviewed:
          review.going_concern_reviewed,

        legal_matters_reviewed:
          review.legal_matters_reviewed,

        related_parties_reviewed:
          review.related_parties_reviewed,

        audit_documentation_completed:
          review.audit_documentation_completed,

        review_points_cleared:
          review.review_points_cleared,

        partner_review_completed:
          review.partner_review_completed,

        eqr_completed:
          review.eqr_completed,

        outstanding_matters:
          review.outstanding_matters,

        final_review_notes:
          review.final_review_notes,

        completion_conclusion:
          review.completion_conclusion,

        completed_by:
          review.completed_by ?? null,

        completion_date:
          review.completion_date ?? null,
      };

      let response: Response;

      if (review.id) {
        response = await fetch(
          `${API_URL}/completion-reviews/${review.id}/`,
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      } else {
        response = await fetch(
          `${API_URL}/completion-reviews/`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      }

      if (!response.ok) {
        const responseText = await response.text();

        console.error(
          "Completion review save failed:",
          response.status,
          responseText
        );

        throw new Error(
          `Save failed with status ${response.status}.`
        );
      }

      const savedReview =
        (await response.json()) as CompletionReview;

      setReview(savedReview);

      setMessage(
        "Workpaper 4.7 saved successfully."
      );

      return true;
    } catch (err) {
      console.error(err);

      setError(
        "Unable to save Workpaper 4.7. Check that Django is running."
      );

      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    await saveReview();
  };

  const handleComplete = async () => {
    setError("");
    setMessage("");

    if (completedCount < checklist.length) {
      setError(
        "Complete all final completion checklist items before completing Workpaper 4.7."
      );
      return;
    }

    if (!review.completion_conclusion.trim()) {
      setError(
        "Enter the final completion conclusion before completing Workpaper 4.7."
      );
      return;
    }

    setCompleting(true);

    try {
      const payload = {
        ...review,
        engagement: engagementId,
        status: "Completed" as CompletionStatus,
        completion_date:
          review.completion_date ||
          new Date().toISOString().split("T")[0],
      };

      let response: Response;

      if (review.id) {
        response = await fetch(
          `${API_URL}/completion-reviews/${review.id}/`,
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      } else {
        response = await fetch(
          `${API_URL}/completion-reviews/`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      }

      if (!response.ok) {
        const responseText = await response.text();

        console.error(
          "Completion failed:",
          response.status,
          responseText
        );

        throw new Error(
          `Completion failed with status ${response.status}.`
        );
      }

      const completedReview =
        (await response.json()) as CompletionReview;

      setReview(completedReview);

      setMessage(
        "Workpaper 4.7 completed successfully."
      );

      setTimeout(() => {
        router.push(
          `/engagements/${engagementId}/conclusion-reporting`
        );
      }, 700);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to complete Workpaper 4.7."
      );
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="mt-4 text-sm text-slate-500">
              Loading final completion review...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/engagements/${engagementId}/conclusion-reporting`
                )
              }
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft size={18} />
              Back to Phase 4
            </button>

            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  review.status === "Completed"
                    ? "bg-emerald-100 text-emerald-700"
                    : review.status === "In Progress"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {review.status}
              </span>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <ShieldCheck size={25} />
              </div>

              <div>
                <p className="text-sm font-semibold text-blue-600">
                  PHASE 4 · WORKPAPER 4.7
                </p>

                <h1 className="mt-1 text-3xl font-bold text-slate-950">
                  Final Completion and Review
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Perform the final engagement completion procedures,
                  confirm that outstanding matters have been resolved,
                  and document the final engagement conclusion.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
              <p className="text-sm font-medium text-red-700">
                {error}
              </p>
            </div>
          )}

          {message && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
              <p className="text-sm font-medium text-emerald-700">
                {message}
              </p>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <ClipboardCheck
                      size={21}
                      className="text-blue-600"
                    />

                    <div>
                      <h2 className="font-bold text-slate-950">
                        Final Completion Checklist
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Confirm each required completion procedure.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {checklist.map((item) => {
                    const checked = Boolean(
                      review[item.key]
                    );

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() =>
                          updateChecklist(
                            item.key,
                            !checked
                          )
                        }
                        className="flex w-full items-start gap-4 px-6 py-5 text-left transition hover:bg-slate-50"
                      >
                        <div className="mt-0.5 shrink-0">
                          {checked ? (
                            <CheckCircle2
                              size={22}
                              className="text-emerald-600"
                            />
                          ) : (
                            <Circle
                              size={22}
                              className="text-slate-300"
                            />
                          )}
                        </div>

                        <div className="flex-1">
                          <p
                            className={`text-sm font-semibold ${
                              checked
                                ? "text-emerald-700"
                                : "text-slate-800"
                            }`}
                          >
                            {item.title}
                          </p>

                          <p className="mt-1 text-sm leading-5 text-slate-500">
                            {item.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <FileCheck2
                    size={21}
                    className="text-blue-600"
                  />

                  <div>
                    <h2 className="font-bold text-slate-950">
                      Outstanding Matters
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Document any remaining matters or explain that none remain.
                    </p>
                  </div>
                </div>

                <textarea
                  value={review.outstanding_matters}
                  onChange={(event) =>
                    updateField(
                      "outstanding_matters",
                      event.target.value
                    )
                  }
                  rows={5}
                  placeholder="Describe any outstanding matters, unresolved review points, or state that there are none."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-950">
                  Final Review Notes
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Document the final review performed by the engagement team.
                </p>

                <textarea
                  value={review.final_review_notes}
                  onChange={(event) =>
                    updateField(
                      "final_review_notes",
                      event.target.value
                    )
                  }
                  rows={6}
                  placeholder="Enter final review observations and supporting notes."
                  className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </section>

              <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
                <h2 className="font-bold text-slate-950">
                  Final Completion Conclusion
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  State the final conclusion regarding completion of the engagement.
                </p>

                <textarea
                  value={review.completion_conclusion}
                  onChange={(event) =>
                    updateField(
                      "completion_conclusion",
                      event.target.value
                    )
                  }
                  rows={6}
                  placeholder="Enter the final completion conclusion..."
                  className="mt-5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-950">
                  Completion Progress
                </h2>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">
                      Checklist
                    </span>

                    <span className="text-sm font-bold text-slate-900">
                      {completedCount}/{checklist.length}
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{
                        width: `${completionPercentage}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    {completionPercentage}% complete
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-950">
                  Completion Details
                </h2>

                <label className="mt-5 block text-sm font-semibold text-slate-700">
                  Completion date
                </label>

                <input
                  type="date"
                  value={review.completion_date || ""}
                  onChange={(event) =>
                    setReview((current) => ({
                      ...current,
                      completion_date:
                        event.target.value || null,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />

                {review.completed_by_name && (
                  <div className="mt-5 rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Completed by
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {review.completed_by_name}
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-950">
                  Workpaper Actions
                </h2>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || completing}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={18} />

                  {saving
                    ? "Saving..."
                    : "Save Workpaper"}
                </button>

                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={saving || completing}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle2 size={18} />

                  {completing
                    ? "Completing..."
                    : "Complete Workpaper"}
                </button>
              </section>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/engagements/${engagementId}/conclusion-reporting`
                  )
                }
                className="flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Phase 4 Overview
              </button>
            </aside>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}