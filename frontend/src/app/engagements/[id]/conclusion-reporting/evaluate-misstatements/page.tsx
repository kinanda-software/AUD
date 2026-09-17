"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AppLayout from "../../../../../components/layout/AppLayout";

type MisstatementStatus = "Corrected" | "Uncorrected";

type Misstatement = {
  id: number;
  reference: string;
  description: string;
  financialStatementArea: string;
  account: string;
  amount: number;
  status: MisstatementStatus;
  qualitative: boolean;
  managementResponse: string;
};

type ConclusionStatus = "Not Started" | "In Progress" | "Completed";

const initialMisstatements: Misstatement[] = [
  {
    id: 1,
    reference: "M-001",
    description: "",
    financialStatementArea: "",
    account: "",
    amount: 0,
    status: "Uncorrected",
    qualitative: false,
    managementResponse: "",
  },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parseAmount(value: string): number {
  const cleaned = value.replace(/,/g, "").trim();

  if (!cleaned) {
    return 0;
  }

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : 0;
}

function getVariance(amount: number, threshold: number): number {
  return amount - threshold;
}

export default function EvaluateMisstatementsPage() {
  const params = useParams();

  const engagementId = String(params.id ?? "");

  const [overallMateriality, setOverallMateriality] = useState<number>(0);
  const [performanceMateriality, setPerformanceMateriality] =
    useState<number>(0);
  const [clearlyTrivialThreshold, setClearlyTrivialThreshold] =
    useState<number>(0);

  const [priorPeriodUncorrected, setPriorPeriodUncorrected] =
    useState<number>(0);

  const [misstatements, setMisstatements] =
    useState<Misstatement[]>(initialMisstatements);

  const [qualitativeConsiderations, setQualitativeConsiderations] =
    useState("");

  const [managementConclusion, setManagementConclusion] =
    useState("");

  const [auditorConclusion, setAuditorConclusion] =
    useState("");

  const [completionStatus, setCompletionStatus] =
    useState<ConclusionStatus>("Not Started");

  const [saved, setSaved] = useState(false);

  const currentPeriodTotal = useMemo(() => {
    return misstatements.reduce(
      (total, item) => total + Math.max(item.amount, 0),
      0
    );
  }, [misstatements]);

  const currentPeriodCorrected = useMemo(() => {
    return misstatements
      .filter((item) => item.status === "Corrected")
      .reduce(
        (total, item) => total + Math.max(item.amount, 0),
        0
      );
  }, [misstatements]);

  const currentPeriodUncorrected = useMemo(() => {
    return misstatements
      .filter((item) => item.status === "Uncorrected")
      .reduce(
        (total, item) => total + Math.max(item.amount, 0),
        0
      );
  }, [misstatements]);

  const aggregateUncorrected =
    currentPeriodUncorrected + Math.max(priorPeriodUncorrected, 0);

  const aboveClearlyTrivial = useMemo(() => {
    return misstatements
      .filter(
        (item) =>
          Math.abs(item.amount) > clearlyTrivialThreshold
      )
      .reduce(
        (total, item) => total + Math.max(item.amount, 0),
        0
      );
  }, [misstatements, clearlyTrivialThreshold]);

  const performanceMaterialityVariance = getVariance(
    aggregateUncorrected,
    performanceMateriality
  );

  const overallMaterialityVariance = getVariance(
    aggregateUncorrected,
    overallMateriality
  );

  const exceedsPerformanceMateriality =
    performanceMateriality > 0 &&
    aggregateUncorrected > performanceMateriality;

  const exceedsOverallMateriality =
    overallMateriality > 0 &&
    aggregateUncorrected > overallMateriality;

  const hasQualitativeRisk = misstatements.some(
    (item) => item.qualitative
  );

  function addMisstatement() {
    const nextId =
      misstatements.length > 0
        ? Math.max(...misstatements.map((item) => item.id)) + 1
        : 1;

    const referenceNumber = String(nextId).padStart(3, "0");

    setMisstatements((current) => [
      ...current,
      {
        id: nextId,
        reference: `M-${referenceNumber}`,
        description: "",
        financialStatementArea: "",
        account: "",
        amount: 0,
        status: "Uncorrected",
        qualitative: false,
        managementResponse: "",
      },
    ]);

    setCompletionStatus("In Progress");
    setSaved(false);
  }

  function removeMisstatement(id: number) {
    setMisstatements((current) =>
      current.filter((item) => item.id !== id)
    );

    setCompletionStatus("In Progress");
    setSaved(false);
  }

  function updateMisstatement(
    id: number,
    field: keyof Misstatement,
    value: string | number | boolean
  ) {
    setMisstatements((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );

    setCompletionStatus("In Progress");
    setSaved(false);
  }

  function handleSave() {
    setSaved(true);

    if (
      overallMateriality > 0 ||
      performanceMateriality > 0 ||
      clearlyTrivialThreshold > 0 ||
      priorPeriodUncorrected > 0 ||
      currentPeriodTotal > 0 ||
      qualitativeConsiderations.trim() ||
      managementConclusion.trim() ||
      auditorConclusion.trim()
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

  function continueToFinancialStatementProcedures() {
    if (!engagementId) {
      return;
    }

    window.location.href = `/engagements/${engagementId}/conclusion-reporting/financial-statement-procedures`;
  }

  function returnToPhase4() {
    if (!engagementId) {
      return;
    }

    window.location.href = `/engagements/${engagementId}/conclusion-reporting`;
  }

  return (
    <AppLayout>
      <main className="min-w-0 flex-1 bg-gray-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="px-6 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <button
                    type="button"
                    onClick={goBack}
                    className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    aria-label="Go back"
                  >
                    <span className="text-xl">←</span>
                  </button>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                        4.1
                      </span>

                      <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        ISA 450
                      </span>

                      {engagementId && (
                        <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                          Engagement: {engagementId}
                        </span>
                      )}
                    </div>

                    <h1 className="mt-2 text-2xl font-bold text-gray-900">
                      Evaluate Misstatements
                    </h1>

                    <p className="mt-1 max-w-4xl text-sm text-gray-600">
                      Accumulate current-period misstatements above the clearly
                      trivial threshold, incorporate prior-period uncorrected
                      misstatements, evaluate quantitative and qualitative
                      effects, and document the auditor&apos;s conclusion.
                    </p>
                  </div>
                </div>

                <StatusBadge status={completionStatus} />
              </div>
            </div>
          </header>

          {/* Navigation */}
          <div className="mb-6 mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={returnToPhase4}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
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

          {/* Materiality Section */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="1"
              title="Materiality Parameters"
              description="Enter the approved materiality thresholds for the engagement."
            />

            <div className="grid gap-5 p-6 md:grid-cols-3">
              <NumberField
                label="Overall Materiality"
                value={overallMateriality}
                onChange={(value) => {
                  setOverallMateriality(value);
                  setSaved(false);
                  setCompletionStatus("In Progress");
                }}
                helper="Overall materiality for the financial statements."
              />

              <NumberField
                label="Performance Materiality"
                value={performanceMateriality}
                onChange={(value) => {
                  setPerformanceMateriality(value);
                  setSaved(false);
                  setCompletionStatus("In Progress");
                }}
                helper="Threshold used to reduce aggregation risk."
              />

              <NumberField
                label="Clearly Trivial Threshold"
                value={clearlyTrivialThreshold}
                onChange={(value) => {
                  setClearlyTrivialThreshold(value);
                  setSaved(false);
                  setCompletionStatus("In Progress");
                }}
                helper="Misstatements below this threshold are clearly trivial."
              />
            </div>

            <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
              <p className="text-xs leading-5 text-gray-600">
                The clearly trivial threshold should be separately documented
                from performance materiality and overall materiality. Prior
                period uncorrected misstatements are captured separately below
                and are not re-derived from the current-period schedule.
              </p>
            </div>
          </section>

          {/* Summary */}
          <section className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <MetricCard
                label="Current Period Total"
                value={currentPeriodTotal}
              />

              <MetricCard
                label="Current Corrected"
                value={currentPeriodCorrected}
              />

              <MetricCard
                label="Current Uncorrected"
                value={currentPeriodUncorrected}
              />

              <MetricCard
                label="Prior Period Uncorrected"
                value={priorPeriodUncorrected}
              />

              <MetricCard
                label="Aggregate Uncorrected"
                value={aggregateUncorrected}
                emphasized
              />
            </div>
          </section>

          {/* Prior Period */}
          <section className="mt-6 rounded-xl border border-amber-200 bg-white shadow-sm">
            <SectionHeader
              number="2"
              title="Prior-Period Uncorrected Misstatements"
              description="Enter the amount of prior-period uncorrected misstatements carried into the current engagement."
              warning
            />

            <div className="p-6">
              <div className="max-w-md">
                <NumberField
                  label="Prior-Period Uncorrected Misstatements"
                  value={priorPeriodUncorrected}
                  onChange={(value) => {
                    setPriorPeriodUncorrected(value);
                    setSaved(false);
                    setCompletionStatus("In Progress");
                  }}
                  helper="This is a distinct input and should be supported by the prior-period audit documentation."
                />
              </div>
            </div>
          </section>

          {/* Current Period Misstatements */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="3"
              title="Current-Period Misstatements"
              description="Record identified misstatements and classify them as corrected or uncorrected."
            />

            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Ref
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Description
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      FS Area
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Account
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Amount
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Qualitative
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {misstatements.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="px-4 py-4">
                        <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">
                          {item.reference}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(event) =>
                            updateMisstatement(
                              item.id,
                              "description",
                              event.target.value
                            )
                          }
                          placeholder="Describe the misstatement"
                          className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <input
                          type="text"
                          value={item.financialStatementArea}
                          onChange={(event) =>
                            updateMisstatement(
                              item.id,
                              "financialStatementArea",
                              event.target.value
                            )
                          }
                          placeholder="e.g. Assets"
                          className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <input
                          type="text"
                          value={item.account}
                          onChange={(event) =>
                            updateMisstatement(
                              item.id,
                              "account",
                              event.target.value
                            )
                          }
                          placeholder="Account"
                          className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amount === 0 ? "" : item.amount}
                          onChange={(event) =>
                            updateMisstatement(
                              item.id,
                              "amount",
                              parseAmount(event.target.value)
                            )
                          }
                          placeholder="0.00"
                          className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <select
                          value={item.status}
                          onChange={(event) =>
                            updateMisstatement(
                              item.id,
                              "status",
                              event.target.value as MisstatementStatus
                            )
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="Uncorrected">
                            Uncorrected
                          </option>

                          <option value="Corrected">
                            Corrected
                          </option>
                        </select>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={item.qualitative}
                          onChange={(event) =>
                            updateMisstatement(
                              item.id,
                              "qualitative",
                              event.target.checked
                            )
                          }
                          className="h-4 w-4"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            removeMisstatement(item.id)
                          }
                          disabled={misstatements.length === 1}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-100 p-5">
              <button
                type="button"
                onClick={addMisstatement}
                className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                + Add Misstatement
              </button>
            </div>
          </section>

          {/* Management Responses */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="4"
              title="Management Response"
              description="Document management's response to identified uncorrected misstatements."
            />

            <div className="space-y-5 p-6">
              {misstatements
                .filter((item) => item.status === "Uncorrected")
                .map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-semibold text-gray-900">
                          {item.reference}
                        </span>

                        <span className="ml-3 text-sm text-gray-500">
                          {item.description || "No description entered"}
                        </span>
                      </div>

                      <span className="text-sm font-semibold text-gray-700">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>

                    <textarea
                      value={item.managementResponse}
                      onChange={(event) =>
                        updateMisstatement(
                          item.id,
                          "managementResponse",
                          event.target.value
                        )
                      }
                      rows={3}
                      placeholder="Enter management's response, proposed correction, or reason for not correcting..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                ))}

              {misstatements.filter(
                (item) => item.status === "Uncorrected"
              ).length === 0 && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800">
                    There are currently no uncorrected current-period
                    misstatements.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Quantitative Evaluation */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="5"
              title="Quantitative Evaluation"
              description="Compare aggregate uncorrected misstatements against performance materiality and overall materiality."
            />

            <div className="grid gap-5 p-6 md:grid-cols-2">
              <EvaluationCard
                title="Performance Materiality"
                aggregate={aggregateUncorrected}
                threshold={performanceMateriality}
                exceeds={exceedsPerformanceMateriality}
                variance={performanceMaterialityVariance}
              />

              <EvaluationCard
                title="Overall Materiality"
                aggregate={aggregateUncorrected}
                threshold={overallMateriality}
                exceeds={exceedsOverallMateriality}
                variance={overallMaterialityVariance}
              />
            </div>

            <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
              <div className="grid gap-4 md:grid-cols-3">
                <SummaryLine
                  label="Above Clearly Trivial"
                  value={aboveClearlyTrivial}
                />

                <SummaryLine
                  label="Aggregate Uncorrected"
                  value={aggregateUncorrected}
                />

                <SummaryLine
                  label="Qualitative Items"
                  value={
                    misstatements.filter(
                      (item) => item.qualitative
                    ).length
                  }
                  textValue={misstatements
                    .filter((item) => item.qualitative)
                    .length.toString()}
                />
              </div>
            </div>
          </section>

          {/* Qualitative Considerations */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="6"
              title="Qualitative Considerations"
              description="Document factors that may make a misstatement material by nature, even where the quantitative amount is below overall materiality."
              warning={hasQualitativeRisk}
            />

            <div className="p-6">
              <textarea
                value={qualitativeConsiderations}
                onChange={(event) => {
                  setQualitativeConsiderations(event.target.value);
                  setSaved(false);
                  setCompletionStatus("In Progress");
                }}
                rows={6}
                placeholder="Consider fraud indicators, management bias, compliance or regulatory matters, covenant implications, changes in trends, segment reporting, related parties, sensitive disclosures, or other qualitative factors..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </section>

          {/* Management Overall Conclusion */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="7"
              title="Management's Overall Conclusion"
              description="Document management's response regarding the identified uncorrected misstatements."
            />

            <div className="p-6">
              <textarea
                value={managementConclusion}
                onChange={(event) => {
                  setManagementConclusion(event.target.value);
                  setSaved(false);
                  setCompletionStatus("In Progress");
                }}
                rows={5}
                placeholder="Summarize whether management will correct the identified misstatements and explain any remaining uncorrected amounts..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </section>

          {/* Auditor Conclusion */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="8"
              title="Auditor's Conclusion"
              description="Document the final auditor assessment of whether uncorrected misstatements, individually or in aggregate, are material."
            />

            <div className="p-6">
              <div
                className={`mb-5 rounded-lg border p-4 ${
                  exceedsOverallMateriality
                    ? "border-red-200 bg-red-50"
                    : hasQualitativeRisk
                      ? "border-amber-200 bg-amber-50"
                      : "border-green-200 bg-green-50"
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    exceedsOverallMateriality
                      ? "text-red-800"
                      : hasQualitativeRisk
                        ? "text-amber-800"
                        : "text-green-800"
                  }`}
                >
                  {exceedsOverallMateriality
                    ? "Aggregate uncorrected misstatements exceed overall materiality."
                    : hasQualitativeRisk
                      ? "Qualitative considerations require additional auditor evaluation."
                      : "No quantitative excess over overall materiality is currently indicated."}
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-600">
                  This system indicator supports the auditor&apos;s assessment
                  but does not replace professional judgment or the engagement
                  team&apos;s documented conclusion.
                </p>
              </div>

              <textarea
                value={auditorConclusion}
                onChange={(event) => {
                  setAuditorConclusion(event.target.value);
                  setSaved(false);
                  setCompletionStatus("In Progress");
                }}
                rows={7}
                placeholder="Document the auditor's conclusion, including whether uncorrected misstatements are material individually or in aggregate, qualitative considerations, management's response, and implications for the audit opinion..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </section>

          {/* Final summary */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="9"
              title="Workpaper Summary"
              description="Final quantitative summary for review."
            />

            <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-4">
              <FinalMetric
                label="Current Corrected"
                value={currentPeriodCorrected}
              />

              <FinalMetric
                label="Current Uncorrected"
                value={currentPeriodUncorrected}
              />

              <FinalMetric
                label="Prior Uncorrected"
                value={priorPeriodUncorrected}
              />

              <FinalMetric
                label="Aggregate Uncorrected"
                value={aggregateUncorrected}
              />
            </div>
          </section>

          {/* Bottom actions */}
          <section className="mt-6 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                4.1 Evaluate Misstatements
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Complete this workpaper before proceeding to the financial
                statement procedures.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Save
              </button>

              <button
                type="button"
                onClick={continueToFinancialStatementProcedures}
                disabled={!engagementId}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Continue to 4.2 →
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
  warning = false,
}: {
  number: string;
  title: string;
  description: string;
  warning?: boolean;
}) {
  return (
    <div className="border-b border-gray-100 px-6 py-5">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
            warning
              ? "bg-amber-100 text-amber-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {number}
        </div>

        <div>
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

function NumberField({
  label,
  value,
  onChange,
  helper,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  helper: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-800">
        {label}
      </label>

      <input
        type="number"
        min="0"
        step="0.01"
        value={value === 0 ? "" : value}
        onChange={(event) =>
          onChange(parseAmount(event.target.value))
        }
        placeholder="0.00"
        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

      <p className="mt-1.5 text-xs leading-5 text-gray-500">
        {helper}
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: number;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        emphasized
          ? "border-blue-200 bg-blue-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <p className="text-xs font-medium text-gray-500">
        {label}
      </p>

      <p
        className={`mt-2 text-xl font-bold ${
          emphasized ? "text-blue-700" : "text-gray-900"
        }`}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function EvaluationCard({
  title,
  aggregate,
  threshold,
  exceeds,
  variance,
}: {
  title: string;
  aggregate: number;
  threshold: number;
  exceeds: boolean;
  variance: number;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        exceeds
          ? "border-red-200 bg-red-50"
          : "border-green-200 bg-green-50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900">
          {title}
        </h3>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            exceeds
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {exceeds ? "Exceeded" : "Within"}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex justify-between gap-4 text-sm">
          <span className="text-gray-600">
            Aggregate uncorrected
          </span>

          <span className="font-semibold text-gray-900">
            {formatCurrency(aggregate)}
          </span>
        </div>

        <div className="flex justify-between gap-4 text-sm">
          <span className="text-gray-600">
            Threshold
          </span>

          <span className="font-semibold text-gray-900">
            {formatCurrency(threshold)}
          </span>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <div className="flex justify-between gap-4 text-sm">
            <span className="font-medium text-gray-700">
              Variance
            </span>

            <span
              className={`font-bold ${
                variance > 0
                  ? "text-red-700"
                  : "text-green-700"
              }`}
            >
              {formatCurrency(variance)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  textValue,
}: {
  label: string;
  value: number;
  textValue?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-gray-900">
        {textValue ?? formatCurrency(value)}
      </p>
    </div>
  );
}

function FinalMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <p className="text-xs font-medium text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-gray-900">
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: ConclusionStatus;
}) {
  const classes =
    status === "Completed"
      ? "bg-green-100 text-green-700 border-green-200"
      : status === "In Progress"
        ? "bg-blue-100 text-blue-700 border-blue-200"
        : "bg-gray-100 text-gray-600 border-gray-200";

  return (
    <span
      className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${classes}`}
    >
      {status}
    </span>
  );
}
