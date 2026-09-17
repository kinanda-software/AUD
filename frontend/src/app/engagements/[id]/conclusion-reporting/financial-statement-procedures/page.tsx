"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AppLayout from "../../../../../components/layout/AppLayout";

type ReviewStatus = "Not Started" | "In Progress" | "Completed";

type ChecklistStatus =
  | "Not Reviewed"
  | "Reviewed"
  | "Issue Identified";

type DisclosureItem = {
  id: number;
  reference: string;
  area: string;
  requirement: string;
  status: ChecklistStatus;
  comments: string;
};

type SubsequentEvent = {
  id: number;
  reference: string;
  eventDate: string;
  description: string;
  financialImpact: string;
  treatment:
    | "No Adjustment"
    | "Adjustment Required"
    | "Disclosure Required";
  conclusion: string;
};

type ComparativeReview = {
  period: string;
  reviewed: boolean;
  agreesToPriorFS: boolean;
  consistencyConfirmed: boolean;
  comments: string;
};

const initialDisclosureItems: DisclosureItem[] = [
  {
    id: 1,
    reference: "DISC-001",
    area: "Presentation",
    requirement:
      "Financial statements are appropriately presented and classified.",
    status: "Not Reviewed",
    comments: "",
  },
  {
    id: 2,
    reference: "DISC-002",
    area: "Accounting Policies",
    requirement:
      "Significant accounting policies are appropriately disclosed.",
    status: "Not Reviewed",
    comments: "",
  },
  {
    id: 3,
    reference: "DISC-003",
    area: "Estimates",
    requirement:
      "Significant accounting estimates and related judgments are appropriately disclosed.",
    status: "Not Reviewed",
    comments: "",
  },
  {
    id: 4,
    reference: "DISC-004",
    area: "Related Parties",
    requirement:
      "Related-party relationships and transactions are appropriately disclosed.",
    status: "Not Reviewed",
    comments: "",
  },
  {
    id: 5,
    reference: "DISC-005",
    area: "Commitments",
    requirement:
      "Material commitments, contingencies and obligations are appropriately disclosed.",
    status: "Not Reviewed",
    comments: "",
  },
  {
    id: 6,
    reference: "DISC-006",
    area: "Going Concern",
    requirement:
      "Going-concern matters and relevant disclosures have been appropriately evaluated.",
    status: "Not Reviewed",
    comments: "",
  },
  {
    id: 7,
    reference: "DISC-007",
    area: "Events After Reporting Period",
    requirement:
      "Events after the reporting period are appropriately reflected or disclosed.",
    status: "Not Reviewed",
    comments: "",
  },
  {
    id: 8,
    reference: "DISC-008",
    area: "Other Disclosures",
    requirement:
      "Other applicable financial statement disclosures have been reviewed for completeness and accuracy.",
    status: "Not Reviewed",
    comments: "",
  },
];

const initialSubsequentEvents: SubsequentEvent[] = [
  {
    id: 1,
    reference: "SE-001",
    eventDate: "",
    description: "",
    financialImpact: "",
    treatment: "No Adjustment",
    conclusion: "",
  },
];

const initialComparativeReview: ComparativeReview = {
  period: "Prior Period",
  reviewed: false,
  agreesToPriorFS: false,
  consistencyConfirmed: false,
  comments: "",
};

function getStatusClasses(status: ChecklistStatus): string {
  if (status === "Reviewed") {
    return "border-green-200 bg-green-100 text-green-700";
  }

  if (status === "Issue Identified") {
    return "border-red-200 bg-red-100 text-red-700";
  }

  return "border-gray-200 bg-gray-100 text-gray-600";
}

function getReviewStatusClasses(status: ReviewStatus): string {
  if (status === "Completed") {
    return "border-green-200 bg-green-100 text-green-700";
  }

  if (status === "In Progress") {
    return "border-blue-200 bg-blue-100 text-blue-700";
  }

  return "border-gray-200 bg-gray-100 text-gray-600";
}

export default function FinancialStatementProceduresPage() {
  const params = useParams();

  const engagementId = String(params.id ?? "");

  const [completionStatus, setCompletionStatus] =
    useState<ReviewStatus>("Not Started");

  const [saved, setSaved] = useState(false);

  const [disclosureItems, setDisclosureItems] =
    useState<DisclosureItem[]>(initialDisclosureItems);

  const [subsequentEvents, setSubsequentEvents] =
    useState<SubsequentEvent[]>(initialSubsequentEvents);

  const [comparativeReview, setComparativeReview] =
    useState<ComparativeReview>(initialComparativeReview);

  const [analyticalReview, setAnalyticalReview] = useState({
    performed: false,
    overallReasonableness: "",
    unexpectedRelationships: "",
    unusualFluctuations: "",
    consistencyWithUnderstanding: "",
    conclusion: "",
  });

  const [issuesIdentified, setIssuesIdentified] = useState("");

  const [overallConclusion, setOverallConclusion] =
    useState("");

  const disclosureReviewedCount = useMemo(() => {
    return disclosureItems.filter(
      (item) => item.status === "Reviewed"
    ).length;
  }, [disclosureItems]);

  const disclosureIssuesCount = useMemo(() => {
    return disclosureItems.filter(
      (item) => item.status === "Issue Identified"
    ).length;
  }, [disclosureItems]);

  const subsequentEventsCount = useMemo(() => {
    return subsequentEvents.filter(
      (item) =>
        item.description.trim() !== "" ||
        item.eventDate.trim() !== ""
    ).length;
  }, [subsequentEvents]);

  const subsequentEventIssuesCount = useMemo(() => {
    return subsequentEvents.filter(
      (item) =>
        item.treatment === "Adjustment Required" ||
        item.treatment === "Disclosure Required"
    ).length;
  }, [subsequentEvents]);

  const analyticalReviewComplete =
    analyticalReview.performed &&
    analyticalReview.overallReasonableness.trim() !== "" &&
    analyticalReview.conclusion.trim() !== "";

  function markInProgress() {
    setCompletionStatus((current) =>
      current === "Completed" ? current : "In Progress"
    );

    setSaved(false);
  }

  function updateDisclosure(
    id: number,
    field: keyof DisclosureItem,
    value: string | ChecklistStatus
  ) {
    setDisclosureItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );

    markInProgress();
  }

  function addSubsequentEvent() {
    const nextId =
      subsequentEvents.length > 0
        ? Math.max(
            ...subsequentEvents.map((item) => item.id)
          ) + 1
        : 1;

    const referenceNumber = String(nextId).padStart(3, "0");

    setSubsequentEvents((current) => [
      ...current,
      {
        id: nextId,
        reference: `SE-${referenceNumber}`,
        eventDate: "",
        description: "",
        financialImpact: "",
        treatment: "No Adjustment",
        conclusion: "",
      },
    ]);

    markInProgress();
  }

  function removeSubsequentEvent(id: number) {
    if (subsequentEvents.length === 1) {
      return;
    }

    setSubsequentEvents((current) =>
      current.filter((item) => item.id !== id)
    );

    markInProgress();
  }

  function updateSubsequentEvent(
    id: number,
    field: keyof SubsequentEvent,
    value: string
  ) {
    setSubsequentEvents((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );

    markInProgress();
  }

  function updateComparativeReview(
    field: keyof ComparativeReview,
    value: string | boolean
  ) {
    setComparativeReview((current) => ({
      ...current,
      [field]: value,
    }));

    markInProgress();
  }

  function updateAnalyticalReview(
    field: keyof typeof analyticalReview,
    value: string | boolean
  ) {
    setAnalyticalReview((current) => ({
      ...current,
      [field]: value,
    }));

    markInProgress();
  }

  function handleSave() {
    setSaved(true);

    if (
      disclosureReviewedCount > 0 ||
      subsequentEventsCount > 0 ||
      comparativeReview.reviewed ||
      analyticalReview.performed ||
      issuesIdentified.trim() !== "" ||
      overallConclusion.trim() !== ""
    ) {
      setCompletionStatus("In Progress");
    }
  }

  function handleComplete() {
    setCompletionStatus("Completed");
    setSaved(true);
  }

  function goBack() {
    window.history.back();
  }

  function goToPhase4Overview() {
    if (!engagementId) {
      return;
    }

    window.location.href =
      `/engagements/${engagementId}/conclusion-reporting`;
  }

  function continueToSummaryReview() {
    if (!engagementId) {
      return;
    }

    window.location.href =
      `/engagements/${engagementId}/conclusion-reporting/summary-review`;
  }

  return (
    <AppLayout>
      <main className="min-w-0 flex-1 bg-gray-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Page Header */}
          <header className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="px-6 py-5">
              <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <button
                    type="button"
                    onClick={goBack}
                    className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    aria-label="Go back"
                  >
                    ←
                  </button>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                        4.2
                      </span>

                      <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        ISA 520
                      </span>

                      <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        ISA 560
                      </span>

                      <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        ISA 710
                      </span>
                    </div>

                    <h1 className="mt-2 text-2xl font-bold text-gray-900">
                      Perform Financial Statement Procedures
                    </h1>

                    <p className="mt-1 max-w-4xl text-sm leading-6 text-gray-600">
                      Perform the final financial statement procedures,
                      including disclosure review, subsequent events
                      procedures, comparative information procedures, and
                      the overall analytical review.
                    </p>
                  </div>
                </div>

                <StatusBadge status={completionStatus} />
              </div>
            </div>
          </header>

          {/* Top Actions */}
          <div className="mb-6 mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={goToPhase4Overview}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              ← Phase 4 Overview
            </button>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {saved ? "Saved" : "Save Workpaper"}
              </button>

              <button
                type="button"
                onClick={handleComplete}
                className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
              >
                Mark Completed
              </button>
            </div>
          </div>

          {/* Procedure Summary */}
          <section className="mb-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Disclosure Items Reviewed"
                value={`${disclosureReviewedCount}/${disclosureItems.length}`}
                detail={
                  disclosureIssuesCount > 0
                    ? `${disclosureIssuesCount} issue(s)`
                    : "No issues recorded"
                }
                danger={disclosureIssuesCount > 0}
              />

              <MetricCard
                label="Subsequent Events"
                value={String(subsequentEventsCount)}
                detail={
                  subsequentEventIssuesCount > 0
                    ? `${subsequentEventIssuesCount} requiring action`
                    : "No action required"
                }
                danger={subsequentEventIssuesCount > 0}
              />

              <MetricCard
                label="Comparative Information"
                value={
                  comparativeReview.reviewed
                    ? "Reviewed"
                    : "Not Reviewed"
                }
                detail={
                  comparativeReview.consistencyConfirmed
                    ? "Consistency confirmed"
                    : "Consistency not confirmed"
                }
              />

              <MetricCard
                label="Overall Analytical Review"
                value={
                  analyticalReviewComplete
                    ? "Complete"
                    : analyticalReview.performed
                      ? "In Progress"
                      : "Not Started"
                }
                detail={
                  analyticalReview.unusualFluctuations.trim()
                    ? "Fluctuations documented"
                    : "No fluctuations recorded"
                }
              />
            </div>
          </section>

          {/* Section 1 */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="1"
              title="Financial Statement Disclosure Checklist"
              description="Review the financial statements and disclosures for completeness, accuracy, consistency, and compliance with the applicable reporting framework."
            />

            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Reference
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Area
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Requirement
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Comments
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {disclosureItems.map((item) => (
                    <tr
                      key={item.id}
                      className="align-top"
                    >
                      <td className="px-5 py-4">
                        <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">
                          {item.reference}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-gray-900">
                          {item.area}
                        </p>
                      </td>

                      <td className="max-w-md px-5 py-4">
                        <p className="text-sm leading-5 text-gray-700">
                          {item.requirement}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={item.status}
                          onChange={(event) =>
                            updateDisclosure(
                              item.id,
                              "status",
                              event.target.value as ChecklistStatus
                            )
                          }
                          className={`rounded-lg border px-3 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${getStatusClasses(
                            item.status
                          )}`}
                        >
                          <option value="Not Reviewed">
                            Not Reviewed
                          </option>

                          <option value="Reviewed">
                            Reviewed
                          </option>

                          <option value="Issue Identified">
                            Issue Identified
                          </option>
                        </select>
                      </td>

                      <td className="px-5 py-4">
                        <textarea
                          rows={2}
                          value={item.comments}
                          onChange={(event) =>
                            updateDisclosure(
                              item.id,
                              "comments",
                              event.target.value
                            )
                          }
                          placeholder="Review notes..."
                          className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">
                    {disclosureReviewedCount}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-900">
                    {disclosureItems.length}
                  </span>{" "}
                  disclosure areas reviewed.
                </p>

                {disclosureIssuesCount > 0 && (
                  <span className="rounded-full border border-red-200 bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                    {disclosureIssuesCount} issue(s) identified
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="2"
              title="Subsequent Events — ISA 560"
              description="Document procedures performed to identify events occurring between the financial statement date and the date of the auditor's report."
            />

            <div className="p-6">
              <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-800">
                  Subsequent events procedures
                </p>

                <p className="mt-1 text-xs leading-5 text-blue-700">
                  Consider management inquiries, minutes of meetings,
                  latest interim financial information, legal
                  correspondence, major transactions, financing
                  arrangements, and other available information relevant
                  to events after the reporting period.
                </p>
              </div>

              <div className="space-y-5">
                {subsequentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-xl border border-gray-200 p-5"
                  >
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                          {event.reference}
                        </span>

                        <p className="mt-2 text-sm font-semibold text-gray-900">
                          Subsequent Event
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeSubsequentEvent(event.id)
                        }
                        disabled={subsequentEvents.length === 1}
                        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-gray-800">
                          Event Date
                        </label>

                        <input
                          type="date"
                          value={event.eventDate}
                          onChange={(e) =>
                            updateSubsequentEvent(
                              event.id,
                              "eventDate",
                              e.target.value
                            )
                          }
                          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-800">
                          Financial Impact
                        </label>

                        <input
                          type="text"
                          value={event.financialImpact}
                          onChange={(e) =>
                            updateSubsequentEvent(
                              event.id,
                              "financialImpact",
                              e.target.value
                            )
                          }
                          placeholder="Amount or qualitative impact"
                          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </div>

                    <div className="mt-5">
                      <label className="block text-sm font-semibold text-gray-800">
                        Description of Event
                      </label>

                      <textarea
                        rows={4}
                        value={event.description}
                        onChange={(e) =>
                          updateSubsequentEvent(
                            event.id,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Describe the event and the evidence reviewed..."
                        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div className="mt-5">
                      <label className="block text-sm font-semibold text-gray-800">
                        Required Treatment
                      </label>

                      <select
                        value={event.treatment}
                        onChange={(e) =>
                          updateSubsequentEvent(
                            event.id,
                            "treatment",
                            e.target.value
                          )
                        }
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="No Adjustment">
                          No Adjustment
                        </option>

                        <option value="Adjustment Required">
                          Adjustment Required
                        </option>

                        <option value="Disclosure Required">
                          Disclosure Required
                        </option>
                      </select>
                    </div>

                    <div className="mt-5">
                      <label className="block text-sm font-semibold text-gray-800">
                        Auditor Conclusion
                      </label>

                      <textarea
                        rows={3}
                        value={event.conclusion}
                        onChange={(e) =>
                          updateSubsequentEvent(
                            event.id,
                            "conclusion",
                            e.target.value
                          )
                        }
                        placeholder="Document the conclusion reached..."
                        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addSubsequentEvent}
                className="mt-5 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                + Add Subsequent Event
              </button>
            </div>
          </section>

          {/* Section 3 */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="3"
              title="Comparative Information — ISA 710"
              description="Evaluate whether comparative information is appropriately presented and agrees with the prior-period financial statements."
            />

            <div className="p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-800">
                    Comparative Period
                  </label>

                  <input
                    type="text"
                    value={comparativeReview.period}
                    onChange={(e) =>
                      updateComparativeReview(
                        "period",
                        e.target.value
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-800">
                    Review status
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Confirm each required comparative information procedure.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <BooleanCheck
                  label="Comparative information has been reviewed."
                  checked={comparativeReview.reviewed}
                  onChange={(checked) =>
                    updateComparativeReview(
                      "reviewed",
                      checked
                    )
                  }
                />

                <BooleanCheck
                  label="Comparative amounts agree to the prior-period financial statements or appropriately restated amounts."
                  checked={comparativeReview.agreesToPriorFS}
                  onChange={(checked) =>
                    updateComparativeReview(
                      "agreesToPriorFS",
                      checked
                    )
                  }
                />

                <BooleanCheck
                  label="Consistency of accounting policies and presentation has been confirmed."
                  checked={comparativeReview.consistencyConfirmed}
                  onChange={(checked) =>
                    updateComparativeReview(
                      "consistencyConfirmed",
                      checked
                    )
                  }
                />
              </div>

              <div className="mt-6">
                <label className="block text-sm font-semibold text-gray-800">
                  Comparative Information Comments
                </label>

                <textarea
                  rows={5}
                  value={comparativeReview.comments}
                  onChange={(e) =>
                    updateComparativeReview(
                      "comments",
                      e.target.value
                    )
                  }
                  placeholder="Document any restatements, reclassifications, consistency issues, or other matters..."
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="4"
              title="Overall Financial Statement Analytical Review — ISA 520"
              description="Perform a final analytical review to determine whether the financial statements are consistent with the auditor's understanding of the entity and whether unexpected relationships or fluctuations remain."
            />

            <div className="p-6">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <BooleanCheck
                  label="Overall analytical review has been performed."
                  checked={analyticalReview.performed}
                  onChange={(checked) =>
                    updateAnalyticalReview(
                      "performed",
                      checked
                    )
                  }
                />
              </div>

              <div className="mt-6 space-y-5">
                <TextAreaField
                  label="Overall Reasonableness"
                  value={analyticalReview.overallReasonableness}
                  onChange={(value) =>
                    updateAnalyticalReview(
                      "overallReasonableness",
                      value
                    )
                  }
                  placeholder="Describe whether the financial statements are consistent with your understanding of the entity, its business, and the audit evidence obtained..."
                />

                <TextAreaField
                  label="Unexpected Relationships"
                  value={analyticalReview.unexpectedRelationships}
                  onChange={(value) =>
                    updateAnalyticalReview(
                      "unexpectedRelationships",
                      value
                    )
                  }
                  placeholder="Document any unexpected relationships identified and the procedures performed in response..."
                />

                <TextAreaField
                  label="Unusual Fluctuations"
                  value={analyticalReview.unusualFluctuations}
                  onChange={(value) =>
                    updateAnalyticalReview(
                      "unusualFluctuations",
                      value
                    )
                  }
                  placeholder="Document significant or unusual fluctuations in balances, ratios, trends, or relationships..."
                />

                <TextAreaField
                  label="Consistency With Audit Understanding"
                  value={
                    analyticalReview.consistencyWithUnderstanding
                  }
                  onChange={(value) =>
                    updateAnalyticalReview(
                      "consistencyWithUnderstanding",
                      value
                    )
                  }
                  placeholder="Explain whether the final financial statement results are consistent with the auditor's understanding obtained throughout the engagement..."
                />

                <TextAreaField
                  label="Analytical Review Conclusion"
                  value={analyticalReview.conclusion}
                  onChange={(value) =>
                    updateAnalyticalReview(
                      "conclusion",
                      value
                    )
                  }
                  placeholder="Document the overall conclusion from the final analytical review..."
                />
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="5"
              title="Issues Identified From Final Procedures"
              description="Summarize any matters identified during disclosure, subsequent events, comparative information, or analytical review procedures."
            />

            <div className="p-6">
              <textarea
                rows={7}
                value={issuesIdentified}
                onChange={(e) => {
                  setIssuesIdentified(e.target.value);
                  markInProgress();
                }}
                placeholder="Document any unresolved disclosure issues, subsequent events, comparative information matters, unusual fluctuations, or other matters requiring follow-up..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">
                  Follow-up reminder
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-700">
                  Any unresolved matter should be evaluated for its effect
                  on the financial statements, audit evidence, management
                  representations, audit opinion, and subsequent reporting
                  procedures.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="6"
              title="Overall Auditor Conclusion"
              description="Document the final conclusion reached after completing the financial statement procedures."
            />

            <div className="p-6">
              <div
                className={`mb-5 rounded-lg border p-4 ${
                  disclosureIssuesCount > 0 ||
                  subsequentEventIssuesCount > 0 ||
                  !comparativeReview.reviewed ||
                  !analyticalReviewComplete
                    ? "border-amber-200 bg-amber-50"
                    : "border-green-200 bg-green-50"
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    disclosureIssuesCount > 0 ||
                    subsequentEventIssuesCount > 0 ||
                    !comparativeReview.reviewed ||
                    !analyticalReviewComplete
                      ? "text-amber-800"
                      : "text-green-800"
                  }`}
                >
                  {disclosureIssuesCount > 0 ||
                  subsequentEventIssuesCount > 0
                    ? "Follow-up matters remain from the final procedures."
                    : !comparativeReview.reviewed ||
                        !analyticalReviewComplete
                      ? "Some final procedures are not yet fully documented."
                      : "Final financial statement procedures are currently documented."}
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-600">
                  This indicator is a workflow aid. The engagement team
                  must apply professional judgment and document the actual
                  audit conclusion.
                </p>
              </div>

              <textarea
                rows={8}
                value={overallConclusion}
                onChange={(e) => {
                  setOverallConclusion(e.target.value);
                  markInProgress();
                }}
                placeholder="Document the overall conclusion on the financial statements after completion of the disclosure review, subsequent events procedures, comparative information procedures, and final analytical review..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </section>

          {/* Completion Checklist */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="7"
              title="Completion Checklist"
              description="Confirm that the key final financial statement procedures have been addressed."
            />

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <CompletionItem
                label="Disclosure checklist reviewed"
                completed={
                  disclosureReviewedCount ===
                  disclosureItems.length
                }
              />

              <CompletionItem
                label="Subsequent events procedures addressed"
                completed={
                  subsequentEvents.every(
                    (event) =>
                      event.description.trim() !== "" &&
                      event.conclusion.trim() !== ""
                  ) || subsequentEventsCount === 0
                }
              />

              <CompletionItem
                label="Comparative information reviewed"
                completed={
                  comparativeReview.reviewed &&
                  comparativeReview.agreesToPriorFS &&
                  comparativeReview.consistencyConfirmed
                }
              />

              <CompletionItem
                label="Overall analytical review completed"
                completed={analyticalReviewComplete}
              />

              <CompletionItem
                label="Issues identified and documented"
                completed={issuesIdentified.trim() !== ""}
                allowEmpty
              />

              <CompletionItem
                label="Overall auditor conclusion documented"
                completed={overallConclusion.trim() !== ""}
              />
            </div>
          </section>

          {/* Bottom Actions */}
          <section className="mt-6 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                4.2 Financial Statement Procedures
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Complete this workpaper before proceeding to 4.3 Summary
                Review and Overall Review &amp; Approval.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Save
              </button>

              <button
                type="button"
                onClick={continueToSummaryReview}
                disabled={!engagementId}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Continue to 4.3 →
              </button>
            </div>
          </section>
        </div>
      </main>
    </AppLayout>
  );
}

/* -------------------------------------------------------------------------- */
/* Helper Components                                                          */
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
    <div className="border-b border-gray-100 px-6 py-5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-blue-700">
          {number}
        </div>

        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-5 text-gray-500">
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
  status: ReviewStatus;
}) {
  return (
    <span
      className={`w-fit shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${getReviewStatusClasses(
        status
      )}`}
    >
      {status}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
  danger = false,
}: {
  label: string;
  value: string;
  detail: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm ${
        danger
          ? "border-red-200"
          : "border-gray-200"
      }`}
    >
      <p className="text-xs font-medium text-gray-500">
        {label}
      </p>

      <p
        className={`mt-2 text-xl font-bold ${
          danger
            ? "text-red-700"
            : "text-gray-900"
        }`}
      >
        {value}
      </p>

      <p
        className={`mt-1 text-xs ${
          danger
            ? "text-red-600"
            : "text-gray-500"
        }`}
      >
        {detail}
      </p>
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
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="mt-0.5 h-4 w-4 rounded border-gray-300"
      />

      <span className="text-sm leading-5 text-gray-700">
        {label}
      </span>
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-800">
        {label}
      </label>

      <textarea
        rows={5}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function CompletionItem({
  label,
  completed,
  allowEmpty = false,
}: {
  label: string;
  completed: boolean;
  allowEmpty?: boolean;
}) {
  const displayCompleted = allowEmpty
    ? true
    : completed;

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-lg border p-4 ${
        displayCompleted
          ? "border-green-200 bg-green-50"
          : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            displayCompleted
              ? "bg-green-600 text-white"
              : "bg-gray-200 text-gray-500"
          }`}
        >
          {displayCompleted ? "✓" : "•"}
        </div>

        <span className="text-sm font-medium text-gray-800">
          {label}
        </span>
      </div>

      <span
        className={`shrink-0 text-xs font-semibold ${
          displayCompleted
            ? "text-green-700"
            : "text-gray-500"
        }`}
      >
        {displayCompleted
          ? "Addressed"
          : "Pending"}
      </span>
    </div>
  );
}