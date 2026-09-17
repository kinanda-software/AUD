"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "../../../../../components/layout/AppLayout";

const API_BASE_URL = "http://127.0.0.1:8000/api";

const DEFAULT_REVIEWER_ID = 3;

type ReviewStatus = "Not Reviewed" | "Reviewed" | "Follow-up Required";
type AreaStatus = "Open" | "Reviewed" | "Follow-up Required";
type CommentStatus = "Open" | "Cleared";

type ReviewArea = {
  id: string;
  area: string;
  description: string;
  status: AreaStatus;
  reviewer: string;
  reviewDate: string;
  comments: string;
};

type JudgmentReview = {
  id: string;
  judgment: string;
  description: string;
  conclusion: string;
  status: ReviewStatus;
  reviewer: string;
};

type ReviewComment = {
  id: string;
  reference: string;
  comment: string;
  response: string;
  status: CommentStatus;
  reviewer: string;
};

type ReviewAssignmentApi = {
  id: number;
  engagement: number;
  engagement_name?: string;
  reviewer: number;
  reviewer_name?: string | null;
  review_area: string;
  assigned_date: string;
  due_date: string | null;
  status: "Pending" | "In Progress" | "Completed" | "Returned";
  review_notes: string;
  completed_date: string | null;
  created_at: string;
  updated_at: string;
};

const initialReviewAreas: ReviewArea[] = [
  {
    id: "RA-001",
    area: "Risk Assessment",
    description:
      "Review whether identified risks of material misstatement remain appropriate and whether the audit response addresses those risks.",
    status: "Reviewed",
    reviewer: "Engagement Manager",
    reviewDate: "2026-09-04",
    comments: "",
  },
  {
    id: "RA-002",
    area: "Materiality",
    description:
      "Review overall materiality, performance materiality and clearly trivial threshold, including changes made during the audit.",
    status: "Reviewed",
    reviewer: "Engagement Manager",
    reviewDate: "2026-09-04",
    comments: "",
  },
  {
    id: "RA-003",
    area: "Significant Audit Areas",
    description:
      "Review significant risks, significant account balances, assertions and the audit procedures performed.",
    status: "Reviewed",
    reviewer: "Engagement Manager",
    reviewDate: "2026-09-04",
    comments: "",
  },
  {
    id: "RA-004",
    area: "Going Concern",
    description:
      "Review management's going concern assessment, supporting evidence and the auditor's conclusion.",
    status: "Open",
    reviewer: "",
    reviewDate: "",
    comments: "",
  },
  {
    id: "RA-005",
    area: "Fraud Considerations",
    description:
      "Review fraud risk assessment, management override considerations and responses to identified fraud risks.",
    status: "Reviewed",
    reviewer: "Engagement Manager",
    reviewDate: "2026-09-04",
    comments: "",
  },
  {
    id: "RA-006",
    area: "Estimates and Judgments",
    description:
      "Review significant accounting estimates, assumptions, estimation uncertainty and auditor judgments.",
    status: "Follow-up Required",
    reviewer: "Engagement Partner",
    reviewDate: "2026-09-04",
    comments:
      "Additional documentation required for the impairment estimate.",
  },
  {
    id: "RA-007",
    area: "Uncorrected Misstatements",
    description:
      "Review identified misstatements and management's decision regarding corrected and uncorrected amounts.",
    status: "Open",
    reviewer: "",
    reviewDate: "",
    comments: "",
  },
  {
    id: "RA-008",
    area: "Financial Statement Procedures",
    description:
      "Review final financial statement procedures, disclosures, subsequent events and comparative information.",
    status: "Reviewed",
    reviewer: "Engagement Manager",
    reviewDate: "2026-09-04",
    comments: "",
  },
  {
    id: "RA-009",
    area: "Audit Documentation",
    description:
      "Review whether sufficient appropriate audit evidence and documentation support the significant conclusions reached.",
    status: "Open",
    reviewer: "",
    reviewDate: "",
    comments: "",
  },
];

const initialJudgments: JudgmentReview[] = [
  {
    id: "J-001",
    judgment: "Revenue Recognition",
    description:
      "Assessment of revenue recognition risks, timing of recognition and relevant audit evidence.",
    conclusion:
      "Revenue recognition conclusion is consistent with the audit evidence obtained.",
    status: "Reviewed",
    reviewer: "Engagement Manager",
  },
  {
    id: "J-002",
    judgment: "Management Estimates",
    description:
      "Review of significant estimates, assumptions and estimation uncertainty.",
    conclusion: "",
    status: "Follow-up Required",
    reviewer: "Engagement Partner",
  },
  {
    id: "J-003",
    judgment: "Going Concern",
    description:
      "Review of management's assessment and the auditor's conclusion regarding going concern.",
    conclusion: "",
    status: "Not Reviewed",
    reviewer: "",
  },
];

const initialComments: ReviewComment[] = [
  {
    id: "RC-001",
    reference: "Review Note 001",
    comment:
      "Provide additional support for the significant impairment estimate.",
    response: "",
    status: "Open",
    reviewer: "Engagement Partner",
  },
];

function frontendStatusToBackend(
  status: AreaStatus
): ReviewAssignmentApi["status"] {
  if (status === "Reviewed") {
    return "Completed";
  }

  if (status === "Follow-up Required") {
    return "Returned";
  }

  return "Pending";
}

function backendStatusToFrontend(
  status: ReviewAssignmentApi["status"]
): AreaStatus {
  if (status === "Completed") {
    return "Reviewed";
  }

  if (status === "Returned") {
    return "Follow-up Required";
  }

  return "Open";
}

function extractDateFromNotes(notes: string): string {
  const match = notes.match(/\[Review Date:\s*(\d{4}-\d{2}-\d{2})\]/);

  return match?.[1] ?? "";
}

function cleanReviewNotes(notes: string): string {
  return notes
    .replace(/\[Review Date:\s*\d{4}-\d{2}-\d{2}\]\s*/g, "")
    .trim();
}

export default function SummaryReviewPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = String(params.id ?? "");

  const [completionStatus, setCompletionStatus] =
    useState<"In Progress" | "Completed">("In Progress");

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [reviewAreas, setReviewAreas] =
    useState<ReviewArea[]>(initialReviewAreas);

  const [judgments, setJudgments] =
    useState<JudgmentReview[]>(initialJudgments);

  const [reviewComments, setReviewComments] =
    useState<ReviewComment[]>(initialComments);

  const [engagementTeamReview, setEngagementTeamReview] = useState({
    completed: true,
    reviewer: "Engagement Manager",
    date: "2026-09-04",
    comments:
      "Engagement team review performed over significant audit areas and conclusions.",
  });

  const [partnerReview, setPartnerReview] = useState({
    completed: false,
    reviewer: "",
    date: "",
    comments: "",
  });

  const [eqrReview, setEqrReview] = useState({
    required: true,
    completed: false,
    reviewer: "",
    date: "",
    comments: "",
  });

  const [overallConclusion, setOverallConclusion] = useState(
    "The overall review is in progress. Outstanding review matters must be resolved before final approval."
  );

  const [approvalComments, setApprovalComments] = useState("");

  /*
   * ------------------------------------------------------------------------
   * LOAD REVIEW ASSIGNMENTS FROM DJANGO
   * ------------------------------------------------------------------------
   */
  useEffect(() => {
    if (!engagementId) {
      return;
    }

    const loadReviewAssignments = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/review-assignments/`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load review assignments. HTTP ${response.status}`
          );
        }

        const data: ReviewAssignmentApi[] = await response.json();

        const engagementAssignments = data.filter(
          (item) => item.engagement === Number(engagementId)
        );

        if (engagementAssignments.length > 0) {
          setReviewAreas((currentAreas) =>
            currentAreas.map((area) => {
              const assignment = engagementAssignments.find(
                (item) => item.review_area === area.area
              );

              if (!assignment) {
                return area;
              }

              const reviewDate =
                extractDateFromNotes(assignment.review_notes) ||
                assignment.completed_date ||
                assignment.assigned_date ||
                "";

              const comments = cleanReviewNotes(
                assignment.review_notes || ""
              );

              return {
                ...area,
                status: backendStatusToFrontend(assignment.status),
                reviewer:
                  assignment.reviewer_name ||
                  area.reviewer ||
                  "Engagement Manager",
                reviewDate,
                comments,
              };
            })
          );
        }

        setSaved(engagementAssignments.length > 0);
      } catch (err) {
        console.error("Review assignment load error:", err);

        setError(
          "Unable to load review data from the backend. Make sure Django is running on http://127.0.0.1:8000."
        );
      } finally {
        setLoading(false);
      }
    };

    loadReviewAssignments();
  }, [engagementId]);

  /*
   * ------------------------------------------------------------------------
   * SAVE REVIEW AREAS TO DJANGO
   * ------------------------------------------------------------------------
   */
  const saveReviewAreasToBackend = async () => {
    if (!engagementId) {
      throw new Error("Engagement ID is missing.");
    }

    const existingResponse = await fetch(
      `${API_BASE_URL}/review-assignments/`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!existingResponse.ok) {
      throw new Error(
        `Unable to retrieve existing review assignments. HTTP ${existingResponse.status}`
      );
    }

    const existingAssignments: ReviewAssignmentApi[] =
      await existingResponse.json();

    const engagementAssignments = existingAssignments.filter(
      (item) => item.engagement === Number(engagementId)
    );

    for (const area of reviewAreas) {
      const existingAssignment = engagementAssignments.find(
        (item) => item.review_area === area.area
      );

      const backendStatus = frontendStatusToBackend(area.status);

      const reviewNotes = [
        area.reviewDate
          ? `[Review Date: ${area.reviewDate}]`
          : "",
        area.comments.trim(),
      ]
        .filter(Boolean)
        .join("\n\n");

      const payload = {
        engagement: Number(engagementId),
        reviewer: DEFAULT_REVIEWER_ID,
        review_area: area.area,
        assigned_date:
          area.reviewDate ||
          new Date().toISOString().split("T")[0],
        due_date: null,
        status: backendStatus,
        review_notes: reviewNotes,
        completed_date:
          area.status === "Reviewed"
            ? area.reviewDate ||
              new Date().toISOString().split("T")[0]
            : null,
      };

      let response: Response;

      if (existingAssignment) {
        response = await fetch(
          `${API_BASE_URL}/review-assignments/${existingAssignment.id}/`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      } else {
        response = await fetch(
          `${API_BASE_URL}/review-assignments/`,
          {
            method: "POST",
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

        throw new Error(
          `Failed to save "${area.area}". HTTP ${response.status}. ${responseText}`
        );
      }
    }
  };

  const reviewedAreas = useMemo(
    () => reviewAreas.filter((item) => item.status === "Reviewed").length,
    [reviewAreas]
  );

  const followUpAreas = useMemo(
    () =>
      reviewAreas.filter((item) => item.status === "Follow-up Required")
        .length,
    [reviewAreas]
  );

  const openAreas = useMemo(
    () => reviewAreas.filter((item) => item.status === "Open").length,
    [reviewAreas]
  );

  const reviewedJudgments = useMemo(
    () => judgments.filter((item) => item.status === "Reviewed").length,
    [judgments]
  );

  const judgmentFollowUps = useMemo(
    () =>
      judgments.filter((item) => item.status === "Follow-up Required").length,
    [judgments]
  );

  const openComments = useMemo(
    () => reviewComments.filter((item) => item.status === "Open").length,
    [reviewComments]
  );

  const clearedComments = useMemo(
    () => reviewComments.filter((item) => item.status === "Cleared").length,
    [reviewComments]
  );

  const reviewReadiness = useMemo(() => {
    return {
      areasComplete: openAreas === 0 && followUpAreas === 0,
      judgmentsComplete: judgmentFollowUps === 0,
      commentsComplete: openComments === 0,
      teamComplete: engagementTeamReview.completed,
      partnerComplete: partnerReview.completed,
      eqrComplete: !eqrReview.required || eqrReview.completed,
    };
  }, [
    openAreas,
    followUpAreas,
    judgmentFollowUps,
    openComments,
    engagementTeamReview.completed,
    partnerReview.completed,
    eqrReview.required,
    eqrReview.completed,
  ]);

  const reviewReady = Object.values(reviewReadiness).every(Boolean);

  const updateReviewArea = (
    id: string,
    field: keyof ReviewArea,
    value: string
  ) => {
    setReviewAreas((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );

    setSaved(false);
    setError("");
  };

  const updateJudgment = (
    id: string,
    field: keyof JudgmentReview,
    value: string
  ) => {
    setJudgments((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );

    setSaved(false);
  };

  const updateComment = (
    id: string,
    field: keyof ReviewComment,
    value: string
  ) => {
    setReviewComments((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );

    setSaved(false);
  };

  const addReviewComment = () => {
    const newComment: ReviewComment = {
      id: `RC-${String(reviewComments.length + 1).padStart(3, "0")}`,
      reference: `Review Note ${String(reviewComments.length + 1).padStart(
        3,
        "0"
      )}`,
      comment: "",
      response: "",
      status: "Open",
      reviewer: "",
    };

    setReviewComments((current) => [...current, newComment]);
    setSaved(false);
  };

  const removeReviewComment = (id: string) => {
    setReviewComments((current) =>
      current.filter((item) => item.id !== id)
    );

    setSaved(false);
  };

  const saveWorkpaper = async () => {
    setSaving(true);
    setError("");

    try {
      await saveReviewAreasToBackend();

      setSaved(true);

      alert("Review workpaper saved successfully to the database.");
    } catch (err) {
      console.error("Save workpaper error:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Unable to save the review workpaper.";

      setError(message);
      setSaved(false);

      alert(`Save failed.\n\n${message}`);
    } finally {
      setSaving(false);
    }
  };

  const completeWorkpaper = async () => {
    if (!reviewReady) {
      alert(
        "The review cannot be completed. Resolve all open review areas, follow-up items, review comments, partner review and required EQR review."
      );
      return;
    }

    if (!overallConclusion.trim()) {
      alert("Enter the overall review conclusion before completing.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await saveReviewAreasToBackend();

      setCompletionStatus("Completed");
      setSaved(true);

      alert("Review workpaper completed successfully.");
    } catch (err) {
      console.error("Complete workpaper error:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Unable to complete the review workpaper.";

      setError(message);

      alert(`Completion failed.\n\n${message}`);
    } finally {
      setSaving(false);
    }
  };

  const goToOverview = () => {
    router.push(`/engagements/${engagementId}/conclusion-reporting`);
  };

  const goBack = () => {
    router.push(
      `/engagements/${engagementId}/conclusion-reporting/financial-statement-procedures`
    );
  };

  const continueToClientCommunications = () => {
    router.push(
      `/engagements/${engagementId}/conclusion-reporting/client-communications`
    );
  };

  return (
    <AppLayout>
      <main className="min-w-0 flex-1 bg-slate-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="px-6 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <span>Phase 4</span>
                    <span>/</span>
                    <span>Conclusion & Reporting</span>
                    <span>/</span>
                    <span>4.3</span>
                  </div>

                  <h1 className="text-2xl font-bold text-slate-900">
                    Summary Review & Overall Review / Approval
                  </h1>

                  <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                    Perform leadership review of significant audit areas,
                    significant judgments, uncorrected misstatements, financial
                    statement procedures and audit documentation before final
                    approval.
                  </p>
                </div>

                <div className="shrink-0">
                  <StatusBadge status={completionStatus} />
                </div>
              </div>
            </div>
          </header>

          {/* Backend status */}
          <div className="mt-4">
            {loading && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-800">
                Loading review data from the database...
              </div>
            )}

            {!loading && error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
                <p className="font-bold">Backend connection error</p>
                <p className="mt-1">{error}</p>
              </div>
            )}

            {!loading && !error && saved && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800">
                ✓ Review data is connected to the database.
              </div>
            )}
          </div>

          {/* Standards */}
          <div className="mt-6 mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-bold text-white">
                ISA 220
              </span>

              <span className="rounded-md bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-800">
                ISQM 2
              </span>

              <span className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                Engagement Quality Review
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-blue-950">
              The review should determine whether the engagement team has
              obtained sufficient appropriate audit evidence and whether the
              significant judgments and conclusions are appropriate before the
              auditor&apos;s report is finalized.
            </p>
          </div>

          {/* Metrics */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard
              label="Areas Reviewed"
              value={`${reviewedAreas}/${reviewAreas.length}`}
              detail="Significant areas"
            />

            <MetricCard
              label="Follow-ups"
              value={String(followUpAreas)}
              detail="Areas requiring action"
              warning={followUpAreas > 0}
            />

            <MetricCard
              label="Judgments Reviewed"
              value={`${reviewedJudgments}/${judgments.length}`}
              detail="Significant judgments"
            />

            <MetricCard
              label="Open Comments"
              value={String(openComments)}
              detail={`${clearedComments} cleared`}
              warning={openComments > 0}
            />

            <MetricCard
              label="Review Ready"
              value={reviewReady ? "YES" : "NO"}
              detail="Final approval status"
              success={reviewReady}
              warning={!reviewReady}
            />
          </div>

          {/* 4.3.1 Significant Audit Areas */}
          <section className="mb-8">
            <SectionHeader
              number="4.3.1"
              title="Summary Review of Significant Audit Areas"
              description="Review the key audit areas and confirm that conclusions are supported by sufficient appropriate audit evidence."
            />

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="hidden border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 lg:grid lg:grid-cols-12 lg:gap-4">
                <div className="col-span-3">Audit Area</div>
                <div className="col-span-4">Description</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-3">Reviewer / Date</div>
              </div>

              {reviewAreas.map((item) => (
                <div
                  key={item.id}
                  className="border-b border-slate-200 p-5 last:border-b-0"
                >
                  <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
                    <div className="lg:col-span-3">
                      <p className="font-semibold text-slate-900">
                        {item.area}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">{item.id}</p>
                    </div>

                    <div className="lg:col-span-4">
                      <p className="text-sm leading-6 text-slate-600">
                        {item.description}
                      </p>
                    </div>

                    <div className="lg:col-span-2">
                      <SelectField
                        value={item.status}
                        onChange={(value) =>
                          updateReviewArea(item.id, "status", value)
                        }
                        options={[
                          "Open",
                          "Reviewed",
                          "Follow-up Required",
                        ]}
                      />
                    </div>

                    <div className="lg:col-span-3">
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                        <TextField
                          value={item.reviewer}
                          placeholder="Reviewer"
                          onChange={(value) =>
                            updateReviewArea(item.id, "reviewer", value)
                          }
                        />

                        <TextField
                          type="date"
                          value={item.reviewDate}
                          onChange={(value) =>
                            updateReviewArea(item.id, "reviewDate", value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <TextAreaField
                      label="Review comments / follow-up"
                      value={item.comments}
                      placeholder="Document review comments, follow-up requirements or conclusion..."
                      onChange={(value) =>
                        updateReviewArea(item.id, "comments", value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4.3.2 Significant Judgments */}
          <section className="mb-8">
            <SectionHeader
              number="4.3.2"
              title="Review of Significant Judgments"
              description="Evaluate significant accounting and audit judgments, including estimates, revenue recognition and going concern."
            />

            <div className="space-y-4">
              {judgments.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="grid gap-5 lg:grid-cols-12">
                    <div className="lg:col-span-3">
                      <p className="font-semibold text-slate-900">
                        {item.judgment}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">{item.id}</p>

                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {item.description}
                      </p>
                    </div>

                    <div className="lg:col-span-3">
                      <label className="mb-2 block text-xs font-semibold text-slate-600">
                        Review Status
                      </label>

                      <SelectField
                        value={item.status}
                        onChange={(value) =>
                          updateJudgment(item.id, "status", value)
                        }
                        options={[
                          "Not Reviewed",
                          "Reviewed",
                          "Follow-up Required",
                        ]}
                      />
                    </div>

                    <div className="lg:col-span-3">
                      <label className="mb-2 block text-xs font-semibold text-slate-600">
                        Reviewer
                      </label>

                      <TextField
                        value={item.reviewer}
                        placeholder="Reviewer name"
                        onChange={(value) =>
                          updateJudgment(item.id, "reviewer", value)
                        }
                      />
                    </div>

                    <div className="lg:col-span-3">
                      <TextAreaField
                        label="Conclusion"
                        value={item.conclusion}
                        placeholder="Document review conclusion..."
                        onChange={(value) =>
                          updateJudgment(item.id, "conclusion", value)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4.3.3 Uncorrected Misstatements */}
          <section className="mb-8">
            <SectionHeader
              number="4.3.3"
              title="Review of Uncorrected Misstatements"
              description="Confirm that identified uncorrected misstatements have been evaluated individually and in aggregate and appropriately communicated."
            />

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="font-semibold text-amber-950">
                Required review considerations
              </h3>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <ConsiderationItem text="Review current-period uncorrected misstatements." />
                <ConsiderationItem text="Review prior-period uncorrected misstatements." />
                <ConsiderationItem text="Consider aggregate effect against materiality." />
                <ConsiderationItem text="Consider qualitative factors." />
                <ConsiderationItem text="Confirm management communication." />
                <ConsiderationItem text="Confirm written representation requirements." />
              </div>

              <div className="mt-5">
                <TextAreaField
                  label="Uncorrected Misstatements Review Conclusion"
                  value={overallConclusion}
                  placeholder="Document the overall conclusion on uncorrected misstatements..."
                  onChange={(value) => {
                    setOverallConclusion(value);
                    setSaved(false);
                  }}
                />
              </div>
            </div>
          </section>

          {/* 4.3.4 Financial Statement Procedures */}
          <section className="mb-8">
            <SectionHeader
              number="4.3.4"
              title="Review of Financial Statement Procedures"
              description="Confirm completion and appropriate review of final financial statement procedures."
            />

            <div className="grid gap-4 md:grid-cols-2">
              <ReviewConfirmation
                title="Disclosure Review"
                description="Financial statement disclosures have been reviewed."
              />

              <ReviewConfirmation
                title="Subsequent Events"
                description="Subsequent events procedures have been completed."
              />

              <ReviewConfirmation
                title="Comparative Information"
                description="Comparative information has been appropriately reviewed."
              />

              <ReviewConfirmation
                title="Overall Analytical Review"
                description="Overall financial statement analytical review has been completed."
              />
            </div>
          </section>

          {/* 4.3.5 Team Review */}
          <section className="mb-8">
            <SectionHeader
              number="4.3.5"
              title="Engagement Team Review"
              description="Document the engagement team's overall review of the audit work and significant conclusions."
            />

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <BooleanCheck
                label="Engagement team review completed"
                checked={engagementTeamReview.completed}
                onChange={(value) => {
                  setEngagementTeamReview((current) => ({
                    ...current,
                    completed: value,
                  }));
                  setSaved(false);
                }}
              />

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <TextField
                  label="Reviewer"
                  value={engagementTeamReview.reviewer}
                  placeholder="Engagement manager / senior"
                  onChange={(value) => {
                    setEngagementTeamReview((current) => ({
                      ...current,
                      reviewer: value,
                    }));
                    setSaved(false);
                  }}
                />

                <TextField
                  label="Review Date"
                  type="date"
                  value={engagementTeamReview.date}
                  onChange={(value) => {
                    setEngagementTeamReview((current) => ({
                      ...current,
                      date: value,
                    }));
                    setSaved(false);
                  }}
                />
              </div>

              <div className="mt-4">
                <TextAreaField
                  label="Team Review Comments"
                  value={engagementTeamReview.comments}
                  placeholder="Document engagement team review comments..."
                  onChange={(value) => {
                    setEngagementTeamReview((current) => ({
                      ...current,
                      comments: value,
                    }));
                    setSaved(false);
                  }}
                />
              </div>
            </div>
          </section>

          {/* 4.3.6 Partner Review */}
          <section className="mb-8">
            <SectionHeader
              number="4.3.6"
              title="Engagement Partner Review & Approval"
              description="The engagement partner should review significant matters, judgments and conclusions before approving the engagement."
            />

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <BooleanCheck
                label="Engagement partner review completed"
                checked={partnerReview.completed}
                onChange={(value) => {
                  setPartnerReview((current) => ({
                    ...current,
                    completed: value,
                  }));
                  setSaved(false);
                }}
              />

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <TextField
                  label="Engagement Partner"
                  value={partnerReview.reviewer}
                  placeholder="Partner name"
                  onChange={(value) => {
                    setPartnerReview((current) => ({
                      ...current,
                      reviewer: value,
                    }));
                    setSaved(false);
                  }}
                />

                <TextField
                  label="Review Date"
                  type="date"
                  value={partnerReview.date}
                  onChange={(value) => {
                    setPartnerReview((current) => ({
                      ...current,
                      date: value,
                    }));
                    setSaved(false);
                  }}
                />
              </div>

              <div className="mt-4">
                <TextAreaField
                  label="Partner Review Comments"
                  value={partnerReview.comments}
                  placeholder="Document partner review comments and approval considerations..."
                  onChange={(value) => {
                    setPartnerReview((current) => ({
                      ...current,
                      comments: value,
                    }));
                    setSaved(false);
                  }}
                />
              </div>
            </div>
          </section>

          {/* 4.3.7 EQR */}
          <section className="mb-8">
            <SectionHeader
              number="4.3.7"
              title="Engagement Quality Review (EQR)"
              description="Where required, document the engagement quality review in accordance with applicable firm policies and ISQM 2."
            />

            <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
              <BooleanCheck
                label="Engagement Quality Review is required"
                checked={eqrReview.required}
                onChange={(value) => {
                  setEqrReview((current) => ({
                    ...current,
                    required: value,
                  }));
                  setSaved(false);
                }}
              />

              <div className="mt-5 rounded-xl border border-white bg-white p-4">
                <BooleanCheck
                  label="EQR completed"
                  checked={eqrReview.completed}
                  onChange={(value) => {
                    setEqrReview((current) => ({
                      ...current,
                      completed: value,
                    }));
                    setSaved(false);
                  }}
                />

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <TextField
                    label="EQR Reviewer"
                    value={eqrReview.reviewer}
                    placeholder="EQR reviewer name"
                    onChange={(value) => {
                      setEqrReview((current) => ({
                        ...current,
                        reviewer: value,
                      }));
                      setSaved(false);
                    }}
                  />

                  <TextField
                    label="EQR Date"
                    type="date"
                    value={eqrReview.date}
                    onChange={(value) => {
                      setEqrReview((current) => ({
                        ...current,
                        date: value,
                      }));
                      setSaved(false);
                    }}
                  />
                </div>

                <div className="mt-4">
                  <TextAreaField
                    label="EQR Comments"
                    value={eqrReview.comments}
                    placeholder="Document EQR review comments..."
                    onChange={(value) => {
                      setEqrReview((current) => ({
                        ...current,
                        comments: value,
                      }));
                      setSaved(false);
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 4.3.8 Review Comments */}
          <section className="mb-8">
            <SectionHeader
              number="4.3.8"
              title="Review Comments & Clearance"
              description="Track review notes, responses and clearance of outstanding matters."
            />

            <div className="space-y-4">
              {reviewComments.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {item.reference}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">{item.id}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeReviewComment(item.id)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <TextAreaField
                      label="Review Comment"
                      value={item.comment}
                      placeholder="Enter review comment..."
                      onChange={(value) =>
                        updateComment(item.id, "comment", value)
                      }
                    />

                    <TextAreaField
                      label="Response / Clearance"
                      value={item.response}
                      placeholder="Enter response and clearance..."
                      onChange={(value) =>
                        updateComment(item.id, "response", value)
                      }
                    />
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <SelectField
                      label="Status"
                      value={item.status}
                      onChange={(value) =>
                        updateComment(item.id, "status", value)
                      }
                      options={["Open", "Cleared"]}
                    />

                    <TextField
                      label="Reviewer"
                      value={item.reviewer}
                      placeholder="Reviewer"
                      onChange={(value) =>
                        updateComment(item.id, "reviewer", value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addReviewComment}
              className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              + Add Review Comment
            </button>
          </section>

          {/* 4.3.9 Overall Conclusion */}
          <section className="mb-8">
            <SectionHeader
              number="4.3.9"
              title="Overall Review Conclusion"
              description="Document the final conclusion reached by the engagement leadership team."
            />

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <TextAreaField
                label="Overall Conclusion"
                value={overallConclusion}
                placeholder="Document the overall review conclusion..."
                onChange={(value) => {
                  setOverallConclusion(value);
                  setSaved(false);
                }}
              />

              <div className="mt-5">
                <TextAreaField
                  label="Final Approval Comments"
                  value={approvalComments}
                  placeholder="Document final approval comments..."
                  onChange={(value) => {
                    setApprovalComments(value);
                    setSaved(false);
                  }}
                />
              </div>
            </div>
          </section>

          {/* 4.3.10 Completion Checklist */}
          <section className="mb-8">
            <SectionHeader
              number="4.3.10"
              title="Final Completion Checklist"
              description="All applicable review requirements should be completed before this workpaper is marked complete."
            />

            <div className="grid gap-3 md:grid-cols-2">
              <CompletionItem
                label="All significant audit areas reviewed"
                completed={reviewReadiness.areasComplete}
              />

              <CompletionItem
                label="Significant judgments reviewed"
                completed={reviewReadiness.judgmentsComplete}
              />

              <CompletionItem
                label="Review comments cleared"
                completed={reviewReadiness.commentsComplete}
              />

              <CompletionItem
                label="Engagement team review completed"
                completed={reviewReadiness.teamComplete}
              />

              <CompletionItem
                label="Engagement partner review completed"
                completed={reviewReadiness.partnerComplete}
              />

              <CompletionItem
                label="Required EQR completed"
                completed={reviewReadiness.eqrComplete}
              />
            </div>
          </section>

          {/* Readiness */}
          <section
            className={`mb-8 rounded-xl border p-6 ${
              reviewReady
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p
                  className={`text-sm font-bold ${
                    reviewReady ? "text-emerald-800" : "text-amber-800"
                  }`}
                >
                  {reviewReady
                    ? "✓ REVIEW READY FOR COMPLETION"
                    : "⚠ REVIEW NOT READY"}
                </p>

                <p
                  className={`mt-1 text-sm ${
                    reviewReady ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {reviewReady
                    ? "All required review activities have been completed."
                    : "Outstanding review areas, comments or approvals must be resolved."}
                </p>
              </div>

              <div className="shrink-0 text-left md:text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </p>

                <p className="mt-1 text-lg font-bold text-slate-900">
                  {completionStatus}
                </p>
              </div>
            </div>
          </section>

          {/* Navigation */}
          <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={goBack}
                className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                ← 4.2 Financial Statement Procedures
              </button>

              <button
                type="button"
                onClick={goToOverview}
                className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Phase 4 Overview
              </button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={saveWorkpaper}
                disabled={saving || loading}
                className={`rounded-lg border px-5 py-3 text-sm font-semibold transition ${
                  saving || loading
                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                    : "border-blue-300 bg-white text-blue-700 hover:bg-blue-50"
                }`}
              >
                {saving
                  ? "Saving..."
                  : saved
                  ? "✓ Saved"
                  : "Save Workpaper"}
              </button>

              <button
                type="button"
                onClick={completeWorkpaper}
                disabled={!reviewReady || saving || loading}
                className={`rounded-lg px-5 py-3 text-sm font-semibold text-white transition ${
                  reviewReady && !saving && !loading
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "cursor-not-allowed bg-slate-300"
                }`}
              >
                {saving ? "Saving..." : "Complete 4.3"}
              </button>

              <button
                type="button"
                onClick={continueToClientCommunications}
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Continue to 4.4 →
              </button>
            </div>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}

/* -------------------------------------------------------------------------- */
/* Reusable Components                                                        */
/* -------------------------------------------------------------------------- */

function SectionHeader({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-start gap-3">
        <span className="shrink-0 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">
          {number}
        </span>

        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "In Progress" | "Completed";
}) {
  const classes =
    status === "Completed"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : "bg-amber-100 text-amber-700 border-amber-200";

  return (
    <span
      className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-bold ${classes}`}
    >
      {status}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
  warning = false,
  success = false,
}: {
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
  success?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-bold ${
          success
            ? "text-emerald-600"
            : warning
            ? "text-amber-600"
            : "text-slate-900"
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function TextField({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
}: {
  label?: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      {label && (
        <label className="mb-2 block text-xs font-semibold text-slate-600">
          {label}
        </label>
      )}

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-xs font-semibold text-slate-600">
        {label}
      </label>

      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      {label && (
        <label className="mb-2 block text-xs font-semibold text-slate-600">
          {label}
        </label>
      )}

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function BooleanCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />

      <span className="text-sm font-semibold text-slate-800">{label}</span>
    </label>
  );
}

function ReviewConfirmation({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <BooleanCheck
        label={title}
        checked={checked}
        onChange={setChecked}
      />

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {description}
      </p>

      <span
        className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
          checked
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {checked ? "Confirmed" : "Not Confirmed"}
      </span>
    </div>
  );
}

function CompletionItem({
  label,
  completed,
}: {
  label: string;
  completed: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-4 ${
        completed
          ? "border-emerald-200 bg-emerald-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          completed
            ? "bg-emerald-600 text-white"
            : "bg-amber-500 text-white"
        }`}
      >
        {completed ? "✓" : "!"}
      </div>

      <span
        className={`text-sm font-semibold ${
          completed ? "text-emerald-800" : "text-amber-800"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function ConsiderationItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-white p-3">
      <span className="mt-0.5 shrink-0 font-bold text-amber-600">✓</span>

      <span className="text-sm text-slate-700">{text}</span>
    </div>
  );
}