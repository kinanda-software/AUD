"use client";
import { fetchAllRecords } from "@/lib/dashboard";
import { isRecord } from "@/lib/typeGuards";
import { useWorkpaper } from "@/lib/useWorkpaper";
import { WorkpaperNotice } from "@/components/WorkpaperNotice";


import { useEffect, useEffectEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type ReviewStatus = "Not Reviewed" | "Reviewed" | "Follow-up Required";
type AreaStatus = "Open" | "Reviewed" | "Follow-up Required";
type CommentStatus = "Open" | "Cleared";

interface ReviewArea {
  id: string;
  area: string;
  description: string;
  status: AreaStatus;
  reviewer: string;
  reviewDate: string;
  comments: string;
}

interface JudgmentReview {
  id: string;
  judgment: string;
  description: string;
  status: ReviewStatus;
  reviewer: string;
  comments: string;
}

interface ReviewComment {
  id: string;
  area: string;
  comment: string;
  reviewer: string;
  status: CommentStatus;
  response: string;
}

interface EngagementTeamReview {
  completed: boolean;
  completedBy: string;
  completedDate: string;
  comments: string;
}

interface PartnerReview {
  completed: boolean;
  partnerName: string;
  reviewDate: string;
  approvalComments: string;
}

interface EQRReview {
  required: boolean;
  completed: boolean;
  reviewerName: string;
  reviewDate: string;
  comments: string;
}

interface ReviewAssignment {
  id: number;
  engagement: number;
  review_area: string;
  status: "Pending" | "In Progress" | "Completed" | "Returned";
  reviewer: number;
  reviewer_name?: string | null;
  assigned_date?: string | null;
  review_notes?: string | null;
  completed_date?: string | null;
}

const initialReviewAreas: ReviewArea[] = [
  {
    id: "RA001",
    area: "Revenue Recognition",
    description:
      "Review significant revenue recognition risks, audit procedures performed, conclusions reached, and supporting audit evidence.",
    status: "Open",
    reviewer: "",
    reviewDate: "",
    comments: "",
  },
  {
    id: "RA002",
    area: "Receivables and Expected Credit Losses",
    description:
      "Review trade receivables, aging analysis, impairment assessment, subsequent receipts, and related audit evidence.",
    status: "Open",
    reviewer: "",
    reviewDate: "",
    comments: "",
  },
  {
    id: "RA003",
    area: "Inventory",
    description:
      "Review inventory valuation, existence, completeness, count procedures, and obsolescence assessment.",
    status: "Open",
    reviewer: "",
    reviewDate: "",
    comments: "",
  },
  {
    id: "RA004",
    area: "Property, Plant and Equipment",
    description:
      "Review additions, disposals, depreciation, impairment indicators, and supporting documentation.",
    status: "Open",
    reviewer: "",
    reviewDate: "",
    comments: "",
  },
  {
    id: "RA005",
    area: "Cash and Bank",
    description:
      "Review bank confirmations, reconciliations, cash balances, and unusual transactions.",
    status: "Open",
    reviewer: "",
    reviewDate: "",
    comments: "",
  },
  {
    id: "RA006",
    area: "Payables and Accruals",
    description:
      "Review completeness procedures, supplier balances, subsequent payments, and unrecorded liabilities.",
    status: "Open",
    reviewer: "",
    reviewDate: "",
    comments: "",
  },
  {
    id: "RA007",
    area: "Payroll and Employee Benefits",
    description:
      "Review payroll testing, employee existence, statutory deductions, and employee benefit liabilities.",
    status: "Open",
    reviewer: "",
    reviewDate: "",
    comments: "",
  },
  {
    id: "RA008",
    area: "Taxation",
    description:
      "Review current and deferred taxation, tax exposures, correspondence, and compliance matters.",
    status: "Open",
    reviewer: "",
    reviewDate: "",
    comments: "",
  },
  {
    id: "RA009",
    area: "Financial Statement Presentation and Disclosure",
    description:
      "Review financial statement presentation, accounting policies, disclosures, and compliance with the applicable framework.",
    status: "Open",
    reviewer: "",
    reviewDate: "",
    comments: "",
  },
];

const initialJudgments: JudgmentReview[] = [
  {
    id: "J001",
    judgment: "Going Concern Assessment",
    description:
      "Review management's going concern assessment, assumptions, forecasts, available financing, and related disclosures.",
    status: "Not Reviewed",
    reviewer: "",
    comments: "",
  },
  {
    id: "J002",
    judgment: "Expected Credit Loss Estimate",
    description:
      "Review assumptions, historical loss information, forward-looking information, and management overlays.",
    status: "Not Reviewed",
    reviewer: "",
    comments: "",
  },
  {
    id: "J003",
    judgment: "Asset Impairment Assessment",
    description:
      "Review impairment indicators, valuation assumptions, cash generating units, and sensitivity analysis.",
    status: "Not Reviewed",
    reviewer: "",
    comments: "",
  },
];

const initialComments: ReviewComment[] = [];

function extractDateFromNotes(notes: string): string {
  const match = notes.match(
    /\[Review Date:\s*(\d{4}-\d{2}-\d{2})\]/
  );

  return match?.[1] ?? "";
}

function cleanReviewNotes(notes: string): string {
  return notes
    .replace(/\[Review Date:\s*\d{4}-\d{2}-\d{2}\]\s*/g, "")
    .trim();
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles: Record<string, string> = {
    Reviewed: "bg-green-100 text-green-700 border-green-200",
    "Follow-up Required":
      "bg-amber-100 text-amber-700 border-amber-200",
    Open: "bg-red-100 text-red-700 border-red-200",
    Cleared: "bg-green-100 text-green-700 border-green-200",
    "Not Reviewed":
      "bg-gray-100 text-gray-700 border-gray-200",
    Completed:
      "bg-green-100 text-green-700 border-green-200",
    Pending:
      "bg-amber-100 text-amber-700 border-amber-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
        styles[status] ??
        "bg-gray-100 text-gray-700 border-gray-200"
      }`}
    >
      {status}
    </span>
  );
}

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
    <div className="border-b border-gray-200 bg-gray-50 px-6 py-5">
      <div className="flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-blue-700">
          {number}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-6 text-gray-600">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </span>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function ReviewConfirmation({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 transition hover:border-blue-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />

      <span>
        <span className="block text-sm font-medium text-gray-900">
          {label}
        </span>

        <span className="mt-1 block text-sm leading-5 text-gray-600">
          {description}
        </span>
      </span>
    </label>
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
    <div className="flex items-center gap-3">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
          completed
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-400"
        }`}
      >
        <span className="sr-only">{completed ? "Completed" : "Pending"}</span>
      </div>

      <span
        className={`text-sm ${
          completed
            ? "text-gray-800"
            : "text-gray-500"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export default function SummaryReviewPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = Array.isArray(params?.id)
    ? params.id[0]
    : params?.id;
  const workpaper = useWorkpaper(String(engagementId ?? ""), "summary-review");

  const [reviewAreas, setReviewAreas] =
    workpaper.field<ReviewArea[]>("reviewAreas", initialReviewAreas);

  const [judgments, setJudgments] =
    workpaper.field<JudgmentReview[]>("judgments", initialJudgments);

  const [reviewComments, setReviewComments] =
    workpaper.field<ReviewComment[]>("reviewComments", initialComments);

  const [engagementTeamReview, setEngagementTeamReview] =
    workpaper.field<EngagementTeamReview>("engagementTeamReview", {
      completed: false,
      completedBy: "",
      completedDate: "",
      comments: "",
    });

  const [partnerReview, setPartnerReview] =
    workpaper.field<PartnerReview>("partnerReview", {
      completed: false,
      partnerName: "",
      reviewDate: "",
      approvalComments: "",
    });

  const [eqrReview, setEqrReview] =
    workpaper.field<EQRReview>("eqrReview", {
      required: false,
      completed: false,
      reviewerName: "",
      reviewDate: "",
      comments: "",
    });

  const [financialStatementProcedures, setFinancialStatementProcedures] =
    workpaper.field("financialStatementProcedures", {
      completed: false,
      reviewer: "",
      reviewDate: "",
      comments: "",
    });

  const [overallConclusion, setOverallConclusion] =
    workpaper.field("overallConclusion", "");

  const completionStatus = workpaper.status;
  const saved = workpaper.saved;
  const setSaved = workpaper.setSaved;
  const saving = workpaper.saving;
  const [uncorrectedMisstatements, setUncorrectedMisstatements] = workpaper.field(
    "uncorrectedMisstatements",
    { reviewed: false, aggregateEvaluated: false, representationsObtained: false },
  );
  workpaper.field("approvalComments", "");
  workpaper.field<Record<string, unknown>>("completionChecklist", {});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);
  const [assignmentAttempt, setAssignmentAttempt] = useState(0);
  const addAssignments = useEffectEvent((assignments: ReviewAssignment[]) => {
    if (assignments.every((assignment) =>
      reviewAreas.some((area) => area.id === `assignment-${assignment.id}`))) return;
    setReviewAreas((current) => {
      const additions: ReviewArea[] = assignments.filter((assignment) =>
        !current.some((area) => area.id === `assignment-${assignment.id}`))
        .map((assignment) => ({
          id: `assignment-${assignment.id}`,
          area: assignment.review_area,
          description: "Engagement review assignment",
          status: assignment.status === "Completed" ? "Reviewed"
            : assignment.status === "Returned" ? "Follow-up Required" : "Open",
          reviewer: assignment.reviewer_name || "",
          reviewDate: assignment.completed_date || extractDateFromNotes(assignment.review_notes ?? ""),
          comments: cleanReviewNotes(assignment.review_notes ?? ""),
        }));
      return [...current, ...additions];
    });
  });

  useEffect(() => {
    if (!engagementId || workpaper.loading) {
      return;
    }

    const controller = new AbortController();
    const loadReviewAssignments = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await fetchAllRecords<unknown>("/review-assignments/", controller.signal);
        if (!data.every((item): item is ReviewAssignment => isRecord(item)
          && typeof item.id === "number" && Number.isInteger(item.id) && item.id > 0
          && typeof item.engagement === "number" && Number.isInteger(item.engagement)
          && typeof item.reviewer === "number" && Number.isInteger(item.reviewer)
          && typeof item.review_area === "string" && typeof item.status === "string"
          && ["Pending", "In Progress", "Completed", "Returned"].includes(item.status)
          && (item.reviewer_name == null || typeof item.reviewer_name === "string")
          && (item.completed_date == null || typeof item.completed_date === "string")
          && (item.review_notes == null || typeof item.review_notes === "string"))) {
          throw new Error("Invalid review assignment data.");
        }
        if (controller.signal.aborted) return;

        const engagementAssignments = data.filter(
          (assignment) =>
            String(assignment.engagement) ===
            String(engagementId)
        );

        if (engagementAssignments.length) addAssignments(engagementAssignments);
        setAssignmentsLoaded(true);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error ? err.message : "Unable to load review data from the database."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadReviewAssignments();
    return () => controller.abort();
  }, [engagementId, workpaper.loading, assignmentAttempt]);

  const updateReviewArea = <
    K extends keyof ReviewArea
  >(
    id: string,
    field: K,
    value: ReviewArea[K]
  ) => {
    setReviewAreas((current) =>
      current.map((area) =>
        area.id === id
          ? {
              ...area,
              [field]: value,
            }
          : area
      )
    );

    setSaved(false);
  };

  const updateJudgment = <
    K extends keyof JudgmentReview
  >(
    id: string,
    field: K,
    value: JudgmentReview[K]
  ) => {
    setJudgments((current) =>
      current.map((judgment) =>
        judgment.id === id
          ? {
              ...judgment,
              [field]: value,
            }
          : judgment
      )
    );

    setSaved(false);
  };

  const updateComment = <
    K extends keyof ReviewComment
  >(
    id: string,
    field: K,
    value: ReviewComment[K]
  ) => {
    setReviewComments((current) =>
      current.map((comment) =>
        comment.id === id
          ? {
              ...comment,
              [field]: value,
            }
          : comment
      )
    );

    setSaved(false);
  };

  const metrics = (() => {
    const reviewedAreas = reviewAreas.filter(
      (area) => area.status === "Reviewed"
    ).length;

    const followUpAreas = reviewAreas.filter(
      (area) => area.status === "Follow-up Required"
    ).length;

    const reviewedJudgments = judgments.filter(
      (judgment) => judgment.status === "Reviewed"
    ).length;

    const openComments = reviewComments.filter(
      (comment) => comment.status === "Open"
    ).length;

    return {
      totalAreas: reviewAreas.length,
      reviewedAreas,
      followUpAreas,
      reviewedJudgments,
      totalJudgments: judgments.length,
      openComments,
    };
  })();

  const reviewReady = (() => {
    const allAreasReviewed =
      reviewAreas.length > 0 &&
      reviewAreas.every(
        (area) => area.status === "Reviewed"
      );

    const allJudgmentsReviewed =
      judgments.length > 0 &&
      judgments.every(
        (judgment) => judgment.status === "Reviewed"
      );

    const noOpenComments =
      reviewComments.every(
        (comment) => comment.status === "Cleared"
      );

    const teamComplete =
      engagementTeamReview.completed;

    const partnerComplete =
      partnerReview.completed;

    const eqrComplete =
      !eqrReview.required || eqrReview.completed;

    const financialStatementsComplete =
      financialStatementProcedures.completed;

    return (
      allAreasReviewed &&
      allJudgmentsReviewed &&
      noOpenComments &&
      teamComplete &&
      partnerComplete &&
      eqrComplete &&
      financialStatementsComplete
    );
  })();

  const saveWorkpaper = () => { void workpaper.save(); };

  return (

      <main className="w-full bg-gray-50">
        <WorkpaperNotice {...workpaper} />
        {error && <div role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error} <button type="button" onClick={() => setAssignmentAttempt((current) => current + 1)} className="font-semibold underline">Retry loading assignments</button>
        </div>}
        <fieldset disabled={workpaper.blocked || loading || !assignmentsLoaded}>
        {/* Header */}
        <div className="border-b border-gray-200 bg-white">
          <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/engagements/${engagementId}/conclusion-reporting/financial-statement-procedures`
                      )
                    }
                    className="transition hover:text-blue-600"
                  >
                    ← 4.2 Financial Statement Procedures
                  </button>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                  4.3 Summary Review & Overall Review / Approval
                </h1>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Perform leadership review of significant audit
                  areas, significant judgments, uncorrected
                  misstatements, financial statement procedures,
                  and audit documentation before final approval.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    ISA 220
                  </span>

                  <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                    ISQM 2
                  </span>

                  <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                    Engagement Quality Review
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-stretch gap-2 sm:flex-row lg:flex-col">
                <button
                  type="button"
                  onClick={saveWorkpaper}
                  disabled={saving || loading}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : saved
                    ? "Saved"
                    : "Save Workpaper"}
                </button>

                <button
                  type="button"
                  onClick={() => void workpaper.save(true)}
                  disabled={workpaper.blocked || loading || !assignmentsLoaded}
                  className="rounded-lg border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Complete Review
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Connection status */}
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-green-800">
                {loading ? "Loading review area assignments..."
                  : assignmentsLoaded ? "Review area assignments loaded from the database."
                  : "Review area assignments could not be loaded."}
              </p>

              <p className="mt-1 text-xs text-green-700">
                Area and judgment headings are blank checklist templates, not recorded findings.
                All sections and confirmations are saved to the database. Workpaper completion
                requires documented review evidence and does not issue an audit opinion.
              </p>
            </div>

            <StatusBadge status={completionStatus} />
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Areas Reviewed
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {metrics.reviewedAreas}/
                {metrics.totalAreas}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Follow-ups
              </p>

              <p className="mt-2 text-2xl font-bold text-amber-600">
                {metrics.followUpAreas}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Judgments Reviewed
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {metrics.reviewedJudgments}/
                {metrics.totalJudgments}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Open Comments
              </p>

              <p className="mt-2 text-2xl font-bold text-red-600">
                {metrics.openComments}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Working Checklist Ready
              </p>

              <p
                className={`mt-2 text-sm font-bold ${
                  reviewReady
                    ? "text-green-600"
                    : "text-amber-600"
                }`}
              >
                {reviewReady
                  ? "READY"
                  : "NOT READY"}
              </p>
            </div>
          </div>

          {/* 4.3.1 */}
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="4.3.1"
              title="Summary Review of Significant Audit Areas"
              description="Review significant audit areas, conclusions, unresolved matters, and supporting audit documentation."
            />

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Audit Area
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Reviewer
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Review Date
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Comments
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {reviewAreas.map((area) => (
                    <tr key={area.id}>
                      <td className="px-6 py-4 align-top">
                        <p className="text-sm font-semibold text-gray-900">
                          {area.area}
                        </p>

                        <p className="mt-1 max-w-md text-xs leading-5 text-gray-500">
                          {area.description}
                        </p>
                      </td>

                      <td className="px-6 py-4 align-top">
                        <select
                          value={area.status}
                          onChange={(event) =>
                            updateReviewArea(
                              area.id,
                              "status",
                              event.target.value as AreaStatus
                            )
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="Open">
                            Open
                          </option>

                          <option value="Reviewed">
                            Reviewed
                          </option>

                          <option value="Follow-up Required">
                            Follow-up Required
                          </option>
                        </select>
                      </td>

                      <td className="px-6 py-4 align-top">
                        <input
                          value={area.reviewer || ""}
                          readOnly
                          placeholder="Unassigned"
                          title="Existing reviewer assignments are preserved. New areas are assigned to the signed-in user when saved."
                          className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </td>

                      <td className="px-6 py-4 align-top">
                        <input
                          type="date"
                          value={area.reviewDate}
                          onChange={(event) =>
                            updateReviewArea(
                              area.id,
                              "reviewDate",
                              event.target.value
                            )
                          }
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </td>

                      <td className="px-6 py-4 align-top">
                        <textarea
                          value={area.comments}
                          onChange={(event) =>
                            updateReviewArea(
                              area.id,
                              "comments",
                              event.target.value
                            )
                          }
                          rows={3}
                          className="min-w-[280px] rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          placeholder="Enter review comments..."
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 4.3.2 */}
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="4.3.2"
              title="Review of Significant Judgments"
              description="Review significant professional judgments made by the engagement team and determine whether they are adequately supported."
            />

            <div className="space-y-5 p-6">
              {judgments.map((judgment) => (
                <div
                  key={judgment.id}
                  className="rounded-xl border border-gray-200 p-5"
                >
                  <div className="grid gap-5 lg:grid-cols-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {judgment.judgment}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        {judgment.description}
                      </p>
                    </div>

                    <SelectField
                      label="Review Status"
                      value={judgment.status}
                      onChange={(value) =>
                        updateJudgment(
                          judgment.id,
                          "status",
                          value as ReviewStatus
                        )
                      }
                      options={[
                        "Not Reviewed",
                        "Reviewed",
                        "Follow-up Required",
                      ]}
                    />

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-gray-700">
                        Reviewer
                      </span>

                      <input
                        value={judgment.reviewer}
                        onChange={(event) =>
                          updateJudgment(
                            judgment.id,
                            "reviewer",
                            event.target.value
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  </div>

                  <div className="mt-5">
                    <TextAreaField
                      label="Review Comments"
                      value={judgment.comments}
                      onChange={(value) =>
                        updateJudgment(
                          judgment.id,
                          "comments",
                          value
                        )
                      }
                      placeholder="Document the review conclusion and any follow-up required..."
                    />
                  </div>

                  <div className="mt-4">
                    <StatusBadge status={judgment.status} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4.3.3 */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="4.3.3"
              title="Review of Uncorrected Misstatements"
              description="Review identified misstatements that remain uncorrected and assess their effect individually and in aggregate."
            />

            <div className="space-y-4 p-6">
              <ReviewConfirmation
                checked={uncorrectedMisstatements.reviewed}
                onChange={(reviewed) => setUncorrectedMisstatements((current) => ({ ...current, reviewed }))}
                label="All identified uncorrected misstatements have been reviewed."
                description="Confirm that the engagement team has communicated identified uncorrected misstatements to those charged with governance where required."
              />

              <ReviewConfirmation
                checked={uncorrectedMisstatements.aggregateEvaluated}
                onChange={(aggregateEvaluated) => setUncorrectedMisstatements((current) => ({ ...current, aggregateEvaluated }))}
                label="The aggregate effect of uncorrected misstatements has been evaluated."
                description="Consider whether uncorrected misstatements, individually or in aggregate, could affect the financial statements."
              />

              <ReviewConfirmation
                checked={uncorrectedMisstatements.representationsObtained}
                onChange={(representationsObtained) => setUncorrectedMisstatements((current) => ({ ...current, representationsObtained }))}
                label="Management representations regarding uncorrected misstatements have been obtained."
                description="Confirm that appropriate representations have been considered as part of the final review."
              />
            </div>
          </section>

          {/* 4.3.4 */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="4.3.4"
              title="Review of Financial Statement Procedures"
              description="Confirm that final financial statement procedures and disclosure reviews have been completed."
            />

            <div className="grid gap-5 p-6 lg:grid-cols-3">
              <SelectField
                label="Completion Status"
                value={
                  financialStatementProcedures.completed
                    ? "Completed"
                    : "Pending"
                }
                onChange={(value) =>
                  setFinancialStatementProcedures(
                    (current) => ({
                      ...current,
                      completed:
                        value === "Completed",
                    })
                  )
                }
                options={[
                  "Pending",
                  "Completed",
                ]}
              />

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Reviewer
                </span>

                <input
                  value={
                    financialStatementProcedures.reviewer
                  }
                  onChange={(event) =>
                    setFinancialStatementProcedures(
                      (current) => ({
                        ...current,
                        reviewer:
                          event.target.value,
                      })
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Review Date
                </span>

                <input
                  type="date"
                  value={
                    financialStatementProcedures.reviewDate
                  }
                  onChange={(event) =>
                    setFinancialStatementProcedures(
                      (current) => ({
                        ...current,
                        reviewDate:
                          event.target.value,
                      })
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <div className="lg:col-span-3">
                <TextAreaField
                  label="Review Comments"
                  value={
                    financialStatementProcedures.comments
                  }
                  onChange={(value) =>
                    setFinancialStatementProcedures(
                      (current) => ({
                        ...current,
                        comments: value,
                      })
                    )
                  }
                  placeholder="Document the final financial statement procedures review conclusion..."
                />
              </div>
            </div>
          </section>

          {/* 4.3.5 */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="4.3.5"
              title="Engagement Team Review"
              description="Document completion of the engagement team's review of audit documentation and significant matters."
            />

            <div className="grid gap-5 p-6 lg:grid-cols-3">
              <SelectField
                label="Review Status"
                value={
                  engagementTeamReview.completed
                    ? "Completed"
                    : "Pending"
                }
                onChange={(value) =>
                  setEngagementTeamReview(
                    (current) => ({
                      ...current,
                      completed:
                        value === "Completed",
                    })
                  )
                }
                options={[
                  "Pending",
                  "Completed",
                ]}
              />

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Completed By
                </span>

                <input
                  value={
                    engagementTeamReview.completedBy
                  }
                  onChange={(event) =>
                    setEngagementTeamReview(
                      (current) => ({
                        ...current,
                        completedBy:
                          event.target.value,
                      })
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Completion Date
                </span>

                <input
                  type="date"
                  value={
                    engagementTeamReview.completedDate
                  }
                  onChange={(event) =>
                    setEngagementTeamReview(
                      (current) => ({
                        ...current,
                        completedDate:
                          event.target.value,
                      })
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <div className="lg:col-span-3">
                <TextAreaField
                  label="Team Review Comments"
                  value={
                    engagementTeamReview.comments
                  }
                  onChange={(value) =>
                    setEngagementTeamReview(
                      (current) => ({
                        ...current,
                        comments: value,
                      })
                    )
                  }
                  placeholder="Document engagement team review comments..."
                />
              </div>
            </div>
          </section>

          {/* 4.3.6 */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="4.3.6"
              title="Engagement Partner Review & Approval"
              description="Document the engagement partner's final review, significant matters considered, and approval conclusion."
            />

            <div className="grid gap-5 p-6 lg:grid-cols-3">
              <SelectField
                label="Partner Review Status"
                value={
                  partnerReview.completed
                    ? "Completed"
                    : "Pending"
                }
                onChange={(value) =>
                  setPartnerReview(
                    (current) => ({
                      ...current,
                      completed:
                        value === "Completed",
                    })
                  )
                }
                options={[
                  "Pending",
                  "Completed",
                ]}
              />

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Engagement Partner
                </span>

                <input
                  value={partnerReview.partnerName}
                  onChange={(event) =>
                    setPartnerReview(
                      (current) => ({
                        ...current,
                        partnerName:
                          event.target.value,
                      })
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Enter partner name"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  Review Date
                </span>

                <input
                  type="date"
                  value={partnerReview.reviewDate}
                  onChange={(event) =>
                    setPartnerReview(
                      (current) => ({
                        ...current,
                        reviewDate:
                          event.target.value,
                      })
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <div className="lg:col-span-3">
                <TextAreaField
                  label="Approval Comments"
                  value={
                    partnerReview.approvalComments
                  }
                  onChange={(value) =>
                    setPartnerReview(
                      (current) => ({
                        ...current,
                        approvalComments: value,
                      })
                    )
                  }
                  placeholder="Document engagement partner review and approval comments..."
                />
              </div>
            </div>
          </section>

          {/* 4.3.7 */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="4.3.7"
              title="Engagement Quality Review (EQR)"
              description="Document the engagement quality review where required, including significant judgments and conclusions."
            />

            <div className="space-y-5 p-6">
              <div className="grid gap-5 lg:grid-cols-3">
                <SelectField
                  label="EQR Required"
                  value={
                    eqrReview.required
                      ? "Required"
                      : "Not Required"
                  }
                  onChange={(value) =>
                    setEqrReview(
                      (current) => ({
                        ...current,
                        required:
                          value === "Required",
                      })
                    )
                  }
                  options={[
                    "Required",
                    "Not Required",
                  ]}
                />

                <SelectField
                  label="EQR Status"
                  value={
                    eqrReview.completed
                      ? "Completed"
                      : "Pending"
                  }
                  onChange={(value) =>
                    setEqrReview(
                      (current) => ({
                        ...current,
                        completed:
                          value === "Completed",
                      })
                    )
                  }
                  options={[
                    "Pending",
                    "Completed",
                  ]}
                />

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    EQR Reviewer
                  </span>

                  <input
                    value={eqrReview.reviewerName}
                    onChange={(event) =>
                      setEqrReview(
                        (current) => ({
                          ...current,
                          reviewerName:
                            event.target.value,
                        })
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Enter EQR reviewer"
                  />
                </label>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    EQR Review Date
                  </span>

                  <input
                    type="date"
                    value={eqrReview.reviewDate}
                    onChange={(event) =>
                      setEqrReview(
                        (current) => ({
                          ...current,
                          reviewDate:
                            event.target.value,
                        })
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <TextAreaField
                  label="EQR Comments"
                  value={eqrReview.comments}
                  onChange={(value) =>
                    setEqrReview(
                      (current) => ({
                        ...current,
                        comments: value,
                      })
                    )
                  }
                  placeholder="Document EQR conclusions..."
                />
              </div>
            </div>
          </section>

          {/* 4.3.8 */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="4.3.8"
              title="Review Comments & Clearance"
              description="Track review comments raised during the engagement review and document their clearance."
            />

            <div className="space-y-5 p-6">
              {reviewComments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-xl border border-gray-200 p-5"
                >
                  <div className="grid gap-5 lg:grid-cols-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {comment.area}
                      </p>

                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {comment.comment}
                      </p>
                    </div>

                    <SelectField
                      label="Status"
                      value={comment.status}
                      onChange={(value) =>
                        updateComment(
                          comment.id,
                          "status",
                          value as CommentStatus
                        )
                      }
                      options={[
                        "Open",
                        "Cleared",
                      ]}
                    />

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-gray-700">
                        Reviewer
                      </span>

                      <input
                        value={comment.reviewer}
                        onChange={(event) =>
                          updateComment(
                            comment.id,
                            "reviewer",
                            event.target.value
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  </div>

                  <div className="mt-5">
                    <TextAreaField
                      label="Response / Clearance"
                      value={comment.response}
                      onChange={(value) =>
                        updateComment(
                          comment.id,
                          "response",
                          value
                        )
                      }
                      placeholder="Document how the review comment was addressed..."
                    />
                  </div>

                  <div className="mt-4">
                    <StatusBadge status={comment.status} />
                  </div>
                </div>
              ))}

              {reviewComments.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
                  No review comment records are loaded by this page.
                </div>
              )}
            </div>
          </section>

          {/* 4.3.9 */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="4.3.9"
              title="Overall Review Conclusion"
              description="Document the overall conclusion reached after completing the summary review and resolving outstanding matters."
            />

            <div className="p-6">
              <TextAreaField
                label="Overall Review Conclusion"
                value={overallConclusion}
                onChange={(value) => {
                  setOverallConclusion(value);
                  setSaved(false);
                }}
                rows={7}
                placeholder="Enter the overall review conclusion..."
              />
            </div>
          </section>

          {/* 4.3.10 */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="4.3.10"
              title="Final Completion Checklist"
              description="Confirm that the key review activities have been completed before final approval."
            />

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <CompletionItem
                label="All significant audit areas reviewed"
                completed={
                  reviewAreas.length > 0 &&
                  reviewAreas.every(
                    (area) =>
                      area.status === "Reviewed"
                  )
                }
              />

              <CompletionItem
                label="Significant judgments reviewed"
                completed={
                  judgments.length > 0 &&
                  judgments.every(
                    (judgment) =>
                      judgment.status === "Reviewed"
                  )
                }
              />

              <CompletionItem
                label="Uncorrected misstatements evaluated"
                completed={true}
              />

              <CompletionItem
                label="Financial statement procedures completed"
                completed={
                  financialStatementProcedures.completed
                }
              />

              <CompletionItem
                label="Engagement team review completed"
                completed={
                  engagementTeamReview.completed
                }
              />

              <CompletionItem
                label="Engagement partner review completed"
                completed={partnerReview.completed}
              />

              <CompletionItem
                label="EQR completed where required"
                completed={
                  !eqrReview.required ||
                  eqrReview.completed
                }
              />

              <CompletionItem
                label="All review comments cleared"
                completed={reviewComments.every(
                  (comment) =>
                    comment.status === "Cleared"
                )}
              />
            </div>

            <div className="border-t border-gray-200 bg-gray-50 p-6">
              <div
                className={`rounded-xl border p-5 ${
                  reviewReady
                    ? "border-green-200 bg-green-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                      reviewReady
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {reviewReady ? <span className="sr-only">Ready</span> : "!"}
                  </div>

                  <div>
                    <h3
                      className={`font-semibold ${
                        reviewReady
                          ? "text-green-900"
                          : "text-amber-900"
                      }`}
                    >
                      {reviewReady
                        ? "WORKING CHECKLIST READY"
                        : "WORKING CHECKLIST NOT READY"}
                    </h3>

                    <p
                      className={`mt-1 text-sm leading-6 ${
                        reviewReady
                          ? "text-green-800"
                          : "text-amber-800"
                      }`}
                    >
                      {reviewReady
                        ? "The working checklist is marked complete. This is not a persisted review sign-off or partner approval."
                        : "One or more working checklist items remain unmarked. This page does not establish final approval."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Bottom navigation */}
          <div className="flex flex-col gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/engagements/${engagementId}/conclusion-reporting`
                )
              }
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Back to Phase 4
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  `/engagements/${engagementId}/conclusion-reporting/client-communications`
                )
              }
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Continue to 4.4 →
            </button>
          </div>
        </div>
        </fieldset>
      </main>

  );
}
