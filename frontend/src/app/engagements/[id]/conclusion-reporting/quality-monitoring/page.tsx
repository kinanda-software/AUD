"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";

type CompletionStatus = "Not Started" | "In Progress" | "Completed";

type InspectionStatus =
  | "Not Started"
  | "In Progress"
  | "Completed"
  | "Not Applicable";

type Severity = "Low" | "Moderate" | "Significant" | "Severe";

type DeficiencyStatus =
  | "Open"
  | "Under Investigation"
  | "Remediated"
  | "Accepted"
  | "Not Applicable";

type RemediationStatus =
  | "Not Started"
  | "In Progress"
  | "Completed"
  | "Monitoring";

type QualityFinding = {
  id: number;
  reference: string;
  area: string;
  description: string;
  severity: Severity;
  status: DeficiencyStatus;
  rootCause: string;
  correctiveAction: string;
  responsiblePerson: string;
  targetDate: string;
};

type RemediationAction = {
  id: number;
  reference: string;
  action: string;
  owner: string;
  targetDate: string;
  status: RemediationStatus;
  effectiveness: string;
};

type QualityMonitoringRecord = {
  id?: number;
  engagement?: number;
  engagement_id?: number;

  completion_status?: CompletionStatus;
  inspection_status?: InspectionStatus;
  inspection_date?: string;
  inspector_name?: string;
  monitoring_period?: string;
  next_monitoring_date?: string;
  inspection_scope?: string;
  inspection_methodology?: string;
  inspection_conclusion?: string;

  findings?: QualityFinding[];
  remediation_actions?: RemediationAction[];

  firm_methodology_feedback?: string;
  training_feedback?: string;
  staffing_feedback?: string;
  supervision_feedback?: string;

  engagement_performance_conclusion?: string;
  overall_quality_conclusion?: string;

  leadership_review_completed?: boolean;
  findings_communicated?: boolean;
  root_cause_completed?: boolean;
  remediation_plan_approved?: boolean;
  effectiveness_monitoring_completed?: boolean;
  quality_leadership_notified?: boolean;
};

const API_BASE = "http://127.0.0.1:8000/api";

const initialFindings: QualityFinding[] = [
  {
    id: 1,
    reference: "QM-001",
    area: "Audit Documentation",
    description: "",
    severity: "Moderate",
    status: "Open",
    rootCause: "",
    correctiveAction: "",
    responsiblePerson: "",
    targetDate: "",
  },
];

const initialRemediationActions: RemediationAction[] = [
  {
    id: 1,
    reference: "REM-001",
    action: "",
    owner: "",
    targetDate: "",
    status: "Not Started",
    effectiveness: "",
  },
];

export default function QualityMonitoringPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = String(params.id ?? "");

  const [recordId, setRecordId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [completionStatus, setCompletionStatus] =
    useState<CompletionStatus>("Not Started");

  const [inspectionStatus, setInspectionStatus] =
    useState<InspectionStatus>("Not Started");

  const [inspectionDate, setInspectionDate] = useState("");
  const [inspectorName, setInspectorName] = useState("");
  const [inspectionScope, setInspectionScope] = useState("");
  const [inspectionMethodology, setInspectionMethodology] = useState("");
  const [inspectionConclusion, setInspectionConclusion] = useState("");

  const [findings, setFindings] =
    useState<QualityFinding[]>(initialFindings);

  const [remediationActions, setRemediationActions] =
    useState<RemediationAction[]>(initialRemediationActions);

  const [firmMethodologyFeedback, setFirmMethodologyFeedback] = useState("");
  const [trainingFeedback, setTrainingFeedback] = useState("");
  const [staffingFeedback, setStaffingFeedback] = useState("");
  const [supervisionFeedback, setSupervisionFeedback] = useState("");

  const [engagementPerformanceConclusion, setEngagementPerformanceConclusion] =
    useState("");

  const [overallQualityConclusion, setOverallQualityConclusion] = useState("");

  const [monitoringPeriod, setMonitoringPeriod] = useState("");
  const [nextMonitoringDate, setNextMonitoringDate] = useState("");

  const [leadershipReviewCompleted, setLeadershipReviewCompleted] =
    useState(false);

  const [findingsCommunicated, setFindingsCommunicated] = useState(false);

  const [rootCauseCompleted, setRootCauseCompleted] = useState(false);

  const [remediationPlanApproved, setRemediationPlanApproved] =
    useState(false);

  const [
    effectivenessMonitoringCompleted,
    setEffectivenessMonitoringCompleted,
  ] = useState(false);

  const [qualityLeadershipNotified, setQualityLeadershipNotified] =
    useState(false);

  /*
   * --------------------------------------------------------------------------
   * LOAD EXISTING WORKPAPER
   * --------------------------------------------------------------------------
   */

  useEffect(() => {
    if (!engagementId) {
      setLoading(false);
      return;
    }

    async function loadWorkpaper() {
      try {
        setLoading(true);
        setErrorMessage("");

        const response = await fetch(
          `${API_BASE}/quality-monitorings/`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Unable to load Quality Monitoring workpaper (${response.status}).`
          );
        }

        const data = await response.json();

        const records: QualityMonitoringRecord[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : [];

        const existing = records.find((item) => {
          const itemEngagementId =
            item.engagement_id ?? item.engagement;

          return String(itemEngagementId) === engagementId;
        });

        if (!existing) {
          setLoading(false);
          return;
        }

        if (existing.id !== undefined) {
          setRecordId(Number(existing.id));
        }

        setCompletionStatus(
          existing.completion_status ?? "Not Started"
        );

        setInspectionStatus(
          existing.inspection_status ?? "Not Started"
        );

        setInspectionDate(existing.inspection_date ?? "");
        setInspectorName(existing.inspector_name ?? "");
        setMonitoringPeriod(existing.monitoring_period ?? "");
        setNextMonitoringDate(existing.next_monitoring_date ?? "");

        setInspectionScope(existing.inspection_scope ?? "");
        setInspectionMethodology(existing.inspection_methodology ?? "");
        setInspectionConclusion(existing.inspection_conclusion ?? "");

        if (
          Array.isArray(existing.findings) &&
          existing.findings.length > 0
        ) {
          setFindings(existing.findings);
        }

        if (
          Array.isArray(existing.remediation_actions) &&
          existing.remediation_actions.length > 0
        ) {
          setRemediationActions(existing.remediation_actions);
        }

        setFirmMethodologyFeedback(
          existing.firm_methodology_feedback ?? ""
        );

        setTrainingFeedback(
          existing.training_feedback ?? ""
        );

        setStaffingFeedback(
          existing.staffing_feedback ?? ""
        );

        setSupervisionFeedback(
          existing.supervision_feedback ?? ""
        );

        setEngagementPerformanceConclusion(
          existing.engagement_performance_conclusion ?? ""
        );

        setOverallQualityConclusion(
          existing.overall_quality_conclusion ?? ""
        );

        setLeadershipReviewCompleted(
          Boolean(existing.leadership_review_completed)
        );

        setFindingsCommunicated(
          Boolean(existing.findings_communicated)
        );

        setRootCauseCompleted(
          Boolean(existing.root_cause_completed)
        );

        setRemediationPlanApproved(
          Boolean(existing.remediation_plan_approved)
        );

        setEffectivenessMonitoringCompleted(
          Boolean(existing.effectiveness_monitoring_completed)
        );

        setQualityLeadershipNotified(
          Boolean(existing.quality_leadership_notified)
        );

        setSaved(true);
      } catch (error) {
        console.error("Quality Monitoring load error:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load Quality Monitoring workpaper."
        );
      } finally {
        setLoading(false);
      }
    }

    loadWorkpaper();
  }, [engagementId]);

  /*
   * --------------------------------------------------------------------------
   * METRICS
   * --------------------------------------------------------------------------
   */

  const completedFindings = useMemo(
    () =>
      findings.filter(
        (finding) =>
          finding.status === "Remediated" ||
          finding.status === "Accepted" ||
          finding.status === "Not Applicable"
      ).length,
    [findings]
  );

  const openFindings = useMemo(
    () =>
      findings.filter(
        (finding) =>
          finding.status === "Open" ||
          finding.status === "Under Investigation"
      ).length,
    [findings]
  );

  const significantFindings = useMemo(
    () =>
      findings.filter(
        (finding) =>
          finding.severity === "Significant" ||
          finding.severity === "Severe"
      ).length,
    [findings]
  );

  const completedRemediationActions = useMemo(
    () =>
      remediationActions.filter(
        (action) =>
          action.status === "Completed" ||
          action.status === "Monitoring"
      ).length,
    [remediationActions]
  );

  const remediationProgress = useMemo(() => {
    if (remediationActions.length === 0) {
      return 0;
    }

    return Math.round(
      (completedRemediationActions / remediationActions.length) * 100
    );
  }, [completedRemediationActions, remediationActions.length]);

  const qualityReady = useMemo(() => {
    return (
      inspectionStatus === "Completed" &&
      inspectionDate.trim() !== "" &&
      inspectorName.trim() !== "" &&
      inspectionScope.trim() !== "" &&
      inspectionMethodology.trim() !== "" &&
      inspectionConclusion.trim() !== "" &&
      leadershipReviewCompleted &&
      findingsCommunicated &&
      rootCauseCompleted &&
      remediationPlanApproved &&
      effectivenessMonitoringCompleted &&
      qualityLeadershipNotified &&
      openFindings === 0 &&
      overallQualityConclusion.trim() !== "" &&
      engagementPerformanceConclusion.trim() !== "" &&
      monitoringPeriod.trim() !== ""
    );
  }, [
    inspectionStatus,
    inspectionDate,
    inspectorName,
    inspectionScope,
    inspectionMethodology,
    inspectionConclusion,
    leadershipReviewCompleted,
    findingsCommunicated,
    rootCauseCompleted,
    remediationPlanApproved,
    effectivenessMonitoringCompleted,
    qualityLeadershipNotified,
    openFindings,
    overallQualityConclusion,
    engagementPerformanceConclusion,
    monitoringPeriod,
  ]);

  /*
   * --------------------------------------------------------------------------
   * STATUS
   * --------------------------------------------------------------------------
   */

  function markInProgress() {
    setCompletionStatus((current) =>
      current === "Completed" ? current : "In Progress"
    );

    setSaved(false);
    setSuccessMessage("");
  }

  /*
   * --------------------------------------------------------------------------
   * FINDINGS
   * --------------------------------------------------------------------------
   */

  function updateFinding(
    id: number,
    field: keyof QualityFinding,
    value: string
  ) {
    setFindings((current) =>
      current.map((finding) =>
        finding.id === id
          ? {
              ...finding,
              [field]: value,
            }
          : finding
      )
    );

    markInProgress();
  }

  function addFinding() {
    const nextId =
      findings.length > 0
        ? Math.max(...findings.map((finding) => finding.id)) + 1
        : 1;

    const referenceNumber = String(nextId).padStart(3, "0");

    setFindings((current) => [
      ...current,
      {
        id: nextId,
        reference: `QM-${referenceNumber}`,
        area: "",
        description: "",
        severity: "Moderate",
        status: "Open",
        rootCause: "",
        correctiveAction: "",
        responsiblePerson: "",
        targetDate: "",
      },
    ]);

    markInProgress();
  }

  function removeFinding(id: number) {
    if (findings.length === 1) {
      return;
    }

    setFindings((current) =>
      current.filter((finding) => finding.id !== id)
    );

    markInProgress();
  }

  /*
   * --------------------------------------------------------------------------
   * REMEDIATION
   * --------------------------------------------------------------------------
   */

  function updateRemediationAction(
    id: number,
    field: keyof RemediationAction,
    value: string
  ) {
    setRemediationActions((current) =>
      current.map((action) =>
        action.id === id
          ? {
              ...action,
              [field]: value,
            }
          : action
      )
    );

    markInProgress();
  }

  function addRemediationAction() {
    const nextId =
      remediationActions.length > 0
        ? Math.max(
            ...remediationActions.map((action) => action.id)
          ) + 1
        : 1;

    const referenceNumber = String(nextId).padStart(3, "0");

    setRemediationActions((current) => [
      ...current,
      {
        id: nextId,
        reference: `REM-${referenceNumber}`,
        action: "",
        owner: "",
        targetDate: "",
        status: "Not Started",
        effectiveness: "",
      },
    ]);

    markInProgress();
  }

  function removeRemediationAction(id: number) {
    if (remediationActions.length === 1) {
      return;
    }

    setRemediationActions((current) =>
      current.filter((action) => action.id !== id)
    );

    markInProgress();
  }

  /*
   * --------------------------------------------------------------------------
   * BUILD API PAYLOAD
   * --------------------------------------------------------------------------
   */

  function buildPayload(
    status: CompletionStatus
  ): QualityMonitoringRecord {
    return {
      engagement: Number(engagementId),

      completion_status: status,

      inspection_status: inspectionStatus,
      inspection_date: inspectionDate,
      inspector_name: inspectorName,
      monitoring_period: monitoringPeriod,
      next_monitoring_date: nextMonitoringDate,

      inspection_scope: inspectionScope,
      inspection_methodology: inspectionMethodology,
      inspection_conclusion: inspectionConclusion,

      findings,

      remediation_actions: remediationActions,

      firm_methodology_feedback: firmMethodologyFeedback,
      training_feedback: trainingFeedback,
      staffing_feedback: staffingFeedback,
      supervision_feedback: supervisionFeedback,

      engagement_performance_conclusion:
        engagementPerformanceConclusion,

      overall_quality_conclusion:
        overallQualityConclusion,

      leadership_review_completed:
        leadershipReviewCompleted,

      findings_communicated:
        findingsCommunicated,

      root_cause_completed:
        rootCauseCompleted,

      remediation_plan_approved:
        remediationPlanApproved,

      effectiveness_monitoring_completed:
        effectivenessMonitoringCompleted,

      quality_leadership_notified:
        qualityLeadershipNotified,
    };
  }

  /*
   * --------------------------------------------------------------------------
   * SAVE TO DATABASE
   * --------------------------------------------------------------------------
   */

  async function saveWorkpaper(
    status: CompletionStatus = completionStatus
  ): Promise<boolean> {
    if (!engagementId) {
      setErrorMessage("Engagement ID is missing.");
      return false;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const payload = buildPayload(status);

      let response: Response;

      if (recordId) {
        response = await fetch(
          `${API_BASE}/quality-monitorings/${recordId}/`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      } else {
        response = await fetch(
          `${API_BASE}/quality-monitorings/`,
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

      const responseText = await response.text();

      let responseData: any = null;

      try {
        responseData = responseText
          ? JSON.parse(responseText)
          : null;
      } catch {
        responseData = responseText;
      }

      if (!response.ok) {
        console.error(
          "Quality Monitoring API error:",
          response.status,
          responseData
        );

        throw new Error(
          typeof responseData === "object"
            ? JSON.stringify(responseData)
            : String(
                responseData ||
                  `HTTP ${response.status}`
              )
        );
      }

      if (responseData?.id) {
        setRecordId(Number(responseData.id));
      }

      setCompletionStatus(status);
      setSaved(true);

      setSuccessMessage(
        status === "Completed"
          ? "4.7 Quality Monitoring has been completed and saved."
          : "4.7 Quality Monitoring has been saved successfully."
      );

      return true;
    } catch (error) {
      console.error(
        "Quality Monitoring save error:",
        error
      );

      setSaved(false);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save Quality Monitoring workpaper."
      );

      return false;
    } finally {
      setSaving(false);
    }
  }

  /*
   * --------------------------------------------------------------------------
   * SAVE BUTTON
   * --------------------------------------------------------------------------
   */

  async function handleSave() {
    await saveWorkpaper(
      completionStatus === "Completed"
        ? "Completed"
        : "In Progress"
    );
  }

  /*
   * --------------------------------------------------------------------------
   * COMPLETE BUTTON
   * --------------------------------------------------------------------------
   */

  async function handleComplete() {
    setErrorMessage("");
    setSuccessMessage("");

    /*
     * Do not allow completion until all requirements are satisfied.
     */
    if (!qualityReady) {
      setCompletionStatus("In Progress");
      setSaved(false);

      setErrorMessage(
        "4.7 cannot be completed yet. Complete all required quality-monitoring requirements first."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    /*
     * Save the completed workpaper to the database.
     *
     * IMPORTANT:
     * saveWorkpaper returns true only when the API successfully
     * saves the record.
     */
    const success = await saveWorkpaper("Completed");

    /*
     * Only navigate when the database save succeeded.
     */
    if (success) {
      /*
       * Give the user a short confirmation before leaving.
       */
      setSuccessMessage(
        "4.7 completed successfully. Returning to Phase 4..."
      );

      /*
       * Navigate to Phase 4 Conclusion & Reporting overview.
       */
      setTimeout(() => {
        router.push(
          `/engagements/${engagementId}/conclusion-reporting`
        );
      }, 700);
    }
  }

  /*
   * --------------------------------------------------------------------------
   * NAVIGATION
   * --------------------------------------------------------------------------
   */

  function goBack() {
    router.back();
  }

  function goToPhase4Overview() {
    if (!engagementId) {
      return;
    }

    router.push(
      `/engagements/${engagementId}/conclusion-reporting`
    );
  }

  /*
   * --------------------------------------------------------------------------
   * LOADING
   * --------------------------------------------------------------------------
   */

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[70vh] items-center justify-center bg-gray-50">
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-700">
              Loading Quality Monitoring workpaper...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="bg-gray-50">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
                      4.7
                    </span>

                    <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                      ISQM 1
                    </span>

                    <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                      Quality Monitoring
                    </span>

                    <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                      Root Cause Analysis
                    </span>

                    {engagementId && (
                      <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        Engagement: {engagementId}
                      </span>
                    )}
                  </div>

                  <h1 className="mt-2 text-xl font-bold leading-7 text-gray-900 sm:text-2xl">
                    Firm-Level Quality Monitoring and Root Cause Analysis
                  </h1>

                  <p className="mt-1 max-w-4xl text-sm leading-6 text-gray-600">
                    Evaluate engagement quality, identify deficiencies,
                    perform root-cause analysis, establish remediation actions,
                    and provide feedback to the firm's methodology, training,
                    staffing and supervision processes.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
                <span
                  className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    completionStatus === "Completed"
                      ? "border-green-200 bg-green-100 text-green-700"
                      : completionStatus === "In Progress"
                        ? "border-blue-200 bg-blue-100 text-blue-700"
                        : "border-gray-200 bg-gray-100 text-gray-600"
                  }`}
                >
                  {completionStatus}
                </span>

                <span
                  className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    qualityReady
                      ? "border-green-200 bg-green-100 text-green-700"
                      : "border-amber-200 bg-amber-100 text-amber-700"
                  }`}
                >
                  {qualityReady
                    ? "Quality Review Ready"
                    : "Requirements Pending"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Messages */}
          {errorMessage && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">
                Save / Workflow Error
              </p>

              <p className="mt-1 break-words text-sm text-red-700">
                {errorMessage}
              </p>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-800">
                {successMessage}
              </p>
            </div>
          )}

          {/* Top Actions */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={goToPhase4Overview}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:w-auto"
            >
              ← Phase 4 Overview
            </button>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {saving
                  ? "Saving..."
                  : saved
                    ? "Saved"
                    : "Save Workpaper"}
              </button>

              <button
                type="button"
                onClick={handleComplete}
                disabled={saving}
                className="w-full rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {saving ? "Saving..." : "Complete 4.7"}
              </button>
            </div>
          </div>

          {/* Metrics */}
          <section className="mb-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <MetricCard
                label="Inspection"
                value={inspectionStatus}
                detail="Quality monitoring status"
              />

              <MetricCard
                label="Findings"
                value={String(findings.length)}
                detail={`${openFindings} open`}
                danger={openFindings > 0}
              />

              <MetricCard
                label="Significant Findings"
                value={String(significantFindings)}
                detail="Significant / severe"
                danger={significantFindings > 0}
              />

              <MetricCard
                label="Remediation"
                value={`${remediationProgress}%`}
                detail={`${completedRemediationActions}/${remediationActions.length} actions complete`}
                danger={remediationProgress < 100}
              />

              <MetricCard
                label="Overall Status"
                value={completionStatus}
                detail="Phase 4.7 status"
              />
            </div>
          </section>

          {/* Section 1 */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="1"
              title="Quality Monitoring / Post-Engagement Inspection"
              description="Document the firm's monitoring or inspection of the completed engagement and evaluate whether the engagement was performed and documented in accordance with professional standards and the firm's methodology."
            />

            <div className="p-4 sm:p-6">
              <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-800">
                  ISQM 1 monitoring principle
                </p>

                <p className="mt-1 text-xs leading-5 text-blue-700">
                  Monitoring activities should provide information about
                  whether the firm's system of quality management is designed,
                  implemented and operating effectively, including whether
                  engagement teams comply with applicable professional
                  standards and the firm's policies and procedures.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <SelectField
                  label="Inspection Status"
                  value={inspectionStatus}
                  onChange={(value) => {
                    setInspectionStatus(value as InspectionStatus);
                    markInProgress();
                  }}
                  options={[
                    "Not Started",
                    "In Progress",
                    "Completed",
                    "Not Applicable",
                  ]}
                />

                <TextField
                  label="Inspection Date"
                  type="date"
                  value={inspectionDate}
                  onChange={(value) => {
                    setInspectionDate(value);
                    markInProgress();
                  }}
                />

                <TextField
                  label="Inspector / Reviewer"
                  value={inspectorName}
                  onChange={(value) => {
                    setInspectorName(value);
                    markInProgress();
                  }}
                  placeholder="Inspector name"
                />

                <TextField
                  label="Monitoring Period"
                  value={monitoringPeriod}
                  onChange={(value) => {
                    setMonitoringPeriod(value);
                    markInProgress();
                  }}
                  placeholder="e.g. 2026 Annual Monitoring Cycle"
                />

                <TextField
                  label="Next Monitoring Date"
                  type="date"
                  value={nextMonitoringDate}
                  onChange={(value) => {
                    setNextMonitoringDate(value);
                    markInProgress();
                  }}
                />
              </div>

              <div className="mt-5">
                <TextAreaField
                  label="Inspection Scope"
                  value={inspectionScope}
                  onChange={(value) => {
                    setInspectionScope(value);
                    markInProgress();
                  }}
                  placeholder="Define the engagement, workpapers, audit areas, personnel or other matters included in the inspection..."
                />
              </div>

              <div className="mt-5">
                <TextAreaField
                  label="Inspection Methodology"
                  value={inspectionMethodology}
                  onChange={(value) => {
                    setInspectionMethodology(value);
                    markInProgress();
                  }}
                  placeholder="Describe the inspection procedures, sample selection, review approach and criteria used..."
                />
              </div>

              <div className="mt-5">
                <TextAreaField
                  label="Inspection Conclusion"
                  value={inspectionConclusion}
                  onChange={(value) => {
                    setInspectionConclusion(value);
                    markInProgress();
                  }}
                  placeholder="Summarize the overall results of the quality inspection..."
                />
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="2"
              title="Quality Findings and Deficiencies"
              description="Record deficiencies identified through monitoring, inspection, engagement review, complaints, consultations, or other sources of quality information."
            />

            <div className="p-4 sm:p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Quality findings
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Each deficiency should be evaluated for significance and
                    addressed through appropriate corrective action.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-red-200 bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700">
                    {openFindings} Open
                  </span>

                  <span className="rounded-full border border-purple-200 bg-purple-100 px-3 py-1.5 text-xs font-bold text-purple-700">
                    {significantFindings} Significant
                  </span>

                  <span className="rounded-full border border-green-200 bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700">
                    {completedFindings} Resolved
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                {findings.map((finding) => (
                  <div
                    key={finding.id}
                    className="rounded-xl border border-gray-200 p-4 sm:p-5"
                  >
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                          {finding.reference}
                        </span>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getSeverityClasses(
                            finding.severity
                          )}`}
                        >
                          {finding.severity}
                        </span>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getDeficiencyClasses(
                            finding.status
                          )}`}
                        >
                          {finding.status}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFinding(finding.id)}
                        disabled={findings.length === 1}
                        className="w-full rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <TextField
                        label="Quality Area"
                        value={finding.area}
                        onChange={(value) =>
                          updateFinding(
                            finding.id,
                            "area",
                            value
                          )
                        }
                        placeholder="e.g. Documentation, Risk Assessment, Supervision"
                      />

                      <SelectField
                        label="Severity"
                        value={finding.severity}
                        onChange={(value) =>
                          updateFinding(
                            finding.id,
                            "severity",
                            value
                          )
                        }
                        options={[
                          "Low",
                          "Moderate",
                          "Significant",
                          "Severe",
                        ]}
                      />

                      <SelectField
                        label="Finding Status"
                        value={finding.status}
                        onChange={(value) =>
                          updateFinding(
                            finding.id,
                            "status",
                            value
                          )
                        }
                        options={[
                          "Open",
                          "Under Investigation",
                          "Remediated",
                          "Accepted",
                          "Not Applicable",
                        ]}
                      />

                      <TextField
                        label="Responsible Person"
                        value={finding.responsiblePerson}
                        onChange={(value) =>
                          updateFinding(
                            finding.id,
                            "responsiblePerson",
                            value
                          )
                        }
                        placeholder="Person responsible"
                      />

                      <TextField
                        label="Target Date"
                        type="date"
                        value={finding.targetDate}
                        onChange={(value) =>
                          updateFinding(
                            finding.id,
                            "targetDate",
                            value
                          )
                        }
                      />

                      <div className="sm:col-span-2">
                        <TextAreaField
                          label="Description of Deficiency"
                          value={finding.description}
                          onChange={(value) =>
                            updateFinding(
                              finding.id,
                              "description",
                              value
                            )
                          }
                          placeholder="Describe the identified deficiency, the requirement involved, and the evidence supporting the finding..."
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <TextAreaField
                          label="Root Cause"
                          value={finding.rootCause}
                          onChange={(value) =>
                            updateFinding(
                              finding.id,
                              "rootCause",
                              value
                            )
                          }
                          placeholder="Identify the underlying cause rather than only describing the immediate error..."
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <TextAreaField
                          label="Corrective Action"
                          value={finding.correctiveAction}
                          onChange={(value) =>
                            updateFinding(
                              finding.id,
                              "correctiveAction",
                              value
                            )
                          }
                          placeholder="Describe the corrective action required to address the deficiency..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addFinding}
                className="mt-5 w-full rounded-lg border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 sm:w-auto"
              >
                + Add Quality Finding
              </button>
            </div>
          </section>

          {/* Section 3 */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="3"
              title="Root Cause Analysis"
              description="Determine why deficiencies occurred and whether the issue indicates an isolated engagement problem or a broader deficiency in the firm's system of quality management."
            />

            <div className="p-4 sm:p-6">
              <div className="mb-6 grid gap-4 sm:grid-cols-2">
                <BooleanCheck
                  label="Root-cause analysis has been completed for identified deficiencies."
                  checked={rootCauseCompleted}
                  onChange={(value) => {
                    setRootCauseCompleted(value);
                    markInProgress();
                  }}
                />

                <BooleanCheck
                  label="Quality leadership has been notified of relevant deficiencies."
                  checked={qualityLeadershipNotified}
                  onChange={(value) => {
                    setQualityLeadershipNotified(value);
                    markInProgress();
                  }}
                />
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 sm:p-5">
                <p className="text-sm font-semibold text-gray-900">
                  Root-cause considerations
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <ConsiderationItem text="Methodology or policy weakness" />
                  <ConsiderationItem text="Insufficient technical knowledge or training" />
                  <ConsiderationItem text="Inadequate staffing or competence" />
                  <ConsiderationItem text="Insufficient supervision or review" />
                  <ConsiderationItem text="Time or resource constraints" />
                  <ConsiderationItem text="Communication or consultation failure" />
                  <ConsiderationItem text="Technology or audit-tool limitation" />
                  <ConsiderationItem text="Isolated engagement execution issue" />
                </div>
              </div>

              <div className="mt-6">
                <TextAreaField
                  label="Overall Root-Cause Analysis"
                  value={engagementPerformanceConclusion}
                  onChange={(value) => {
                    setEngagementPerformanceConclusion(value);
                    markInProgress();
                  }}
                  placeholder="Explain the underlying causes identified across the engagement and whether they indicate an isolated matter or a broader system-level issue..."
                />
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="4"
              title="Remediation and Corrective Actions"
              description="Document actions designed to address identified deficiencies and prevent recurrence. Remediation should be assigned, monitored and evaluated for effectiveness."
            />

            <div className="p-4 sm:p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Remediation plan
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Track corrective actions from identification through
                    implementation and effectiveness monitoring.
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full border px-3 py-1.5 text-xs font-bold ${
                    remediationProgress === 100
                      ? "border-green-200 bg-green-100 text-green-700"
                      : "border-amber-200 bg-amber-100 text-amber-700"
                  }`}
                >
                  {remediationProgress}% Complete
                </span>
              </div>

              <div className="space-y-5">
                {remediationActions.map((action) => (
                  <div
                    key={action.id}
                    className="rounded-xl border border-gray-200 p-4 sm:p-5"
                  >
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="w-fit rounded-md bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                        {action.reference}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          removeRemediationAction(action.id)
                        }
                        disabled={remediationActions.length === 1}
                        className="w-full rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="sm:col-span-2 lg:col-span-3">
                        <TextAreaField
                          label="Corrective / Remediation Action"
                          value={action.action}
                          onChange={(value) =>
                            updateRemediationAction(
                              action.id,
                              "action",
                              value
                            )
                          }
                          placeholder="Describe the specific action that will address the identified root cause..."
                        />
                      </div>

                      <TextField
                        label="Action Owner"
                        value={action.owner}
                        onChange={(value) =>
                          updateRemediationAction(
                            action.id,
                            "owner",
                            value
                          )
                        }
                        placeholder="Responsible owner"
                      />

                      <TextField
                        label="Target Date"
                        type="date"
                        value={action.targetDate}
                        onChange={(value) =>
                          updateRemediationAction(
                            action.id,
                            "targetDate",
                            value
                          )
                        }
                      />

                      <SelectField
                        label="Status"
                        value={action.status}
                        onChange={(value) =>
                          updateRemediationAction(
                            action.id,
                            "status",
                            value
                          )
                        }
                        options={[
                          "Not Started",
                          "In Progress",
                          "Completed",
                          "Monitoring",
                        ]}
                      />

                      <div className="sm:col-span-2 lg:col-span-3">
                        <TextAreaField
                          label="Effectiveness Monitoring"
                          value={action.effectiveness}
                          onChange={(value) =>
                            updateRemediationAction(
                              action.id,
                              "effectiveness",
                              value
                            )
                          }
                          placeholder="Document how the firm will determine whether the corrective action has been effective..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addRemediationAction}
                className="mt-5 w-full rounded-lg border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 sm:w-auto"
              >
                + Add Remediation Action
              </button>

              <div className="mt-6">
                <BooleanCheck
                  label="The remediation plan has been reviewed and approved by appropriate quality leadership."
                  checked={remediationPlanApproved}
                  onChange={(value) => {
                    setRemediationPlanApproved(value);
                    markInProgress();
                  }}
                />
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="5"
              title="Firm-Level Feedback"
              description="Translate engagement-level quality findings into improvements to the firm's system of quality management."
            />

            <div className="grid gap-6 p-4 sm:p-6">
              <TextAreaField
                label="Methodology Feedback"
                value={firmMethodologyFeedback}
                onChange={(value) => {
                  setFirmMethodologyFeedback(value);
                  markInProgress();
                }}
                placeholder="Identify changes needed to audit methodology, policies, templates, guidance or technical resources..."
              />

              <TextAreaField
                label="Training and Competence Feedback"
                value={trainingFeedback}
                onChange={(value) => {
                  setTrainingFeedback(value);
                  markInProgress();
                }}
                placeholder="Identify training, technical development or competence gaps that should be addressed..."
              />

              <TextAreaField
                label="Staffing and Resource Feedback"
                value={staffingFeedback}
                onChange={(value) => {
                  setStaffingFeedback(value);
                  markInProgress();
                }}
                placeholder="Identify staffing, workload, resource or competency allocation issues..."
              />

              <TextAreaField
                label="Supervision and Review Feedback"
                value={supervisionFeedback}
                onChange={(value) => {
                  setSupervisionFeedback(value);
                  markInProgress();
                }}
                placeholder="Identify improvements needed in supervision, consultation, engagement quality review or partner review..."
              />
            </div>
          </section>

          {/* Section 6 */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="6"
              title="Monitoring, Communication and Follow-Up"
              description="Confirm that quality findings have been communicated to appropriate personnel and that remediation will be monitored for effectiveness."
            />

            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
              <BooleanCheck
                label="Quality findings have been communicated to appropriate engagement or firm personnel."
                checked={findingsCommunicated}
                onChange={(value) => {
                  setFindingsCommunicated(value);
                  markInProgress();
                }}
              />

              <BooleanCheck
                label="Effectiveness of remediation actions has been or will be monitored."
                checked={effectivenessMonitoringCompleted}
                onChange={(value) => {
                  setEffectivenessMonitoringCompleted(value);
                  markInProgress();
                }}
              />

              <BooleanCheck
                label="Quality leadership has reviewed the monitoring results and completed the required quality review."
                checked={leadershipReviewCompleted}
                onChange={(value) => {
                  setLeadershipReviewCompleted(value);
                  markInProgress();
                }}
              />

              <BooleanCheck
                label="Quality leadership has been notified of relevant deficiencies and required follow-up actions."
                checked={qualityLeadershipNotified}
                onChange={(value) => {
                  setQualityLeadershipNotified(value);
                  markInProgress();
                }}
              />
            </div>
          </section>

          {/* Section 7 */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <SectionHeader
              number="7"
              title="Overall Quality Monitoring Conclusion"
              description="Conclude whether the engagement met applicable professional standards and firm methodology and whether any deficiencies indicate a broader quality-management issue."
            />

            <div className="p-4 sm:p-6">
              <TextAreaField
                label="Overall Quality Conclusion"
                value={overallQualityConclusion}
                onChange={(value) => {
                  setOverallQualityConclusion(value);
                  markInProgress();
                }}
                placeholder="Provide the final quality-monitoring conclusion, including significant deficiencies, remediation requirements, broader implications and follow-up monitoring..."
              />

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <CompletionItem
                  label="Quality inspection completed"
                  completed={
                    inspectionStatus === "Completed"
                  }
                />

                <CompletionItem
                  label="Quality findings evaluated"
                  completed={findings.length > 0}
                />

                <CompletionItem
                  label="Root-cause analysis completed"
                  completed={rootCauseCompleted}
                />

                <CompletionItem
                  label="Remediation plan approved"
                  completed={remediationPlanApproved}
                />

                <CompletionItem
                  label="Findings communicated"
                  completed={findingsCommunicated}
                />

                <CompletionItem
                  label="Quality leadership review completed"
                  completed={leadershipReviewCompleted}
                />

                <CompletionItem
                  label="Effectiveness monitoring completed"
                  completed={
                    effectivenessMonitoringCompleted
                  }
                />

                <CompletionItem
                  label="Quality leadership notified"
                  completed={qualityLeadershipNotified}
                />

                <CompletionItem
                  label="No open quality findings"
                  completed={openFindings === 0}
                />

                <CompletionItem
                  label="Overall quality conclusion recorded"
                  completed={
                    overallQualityConclusion.trim() !== ""
                  }
                />
              </div>
            </div>
          </section>

          {/* Readiness */}
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div
              className={`rounded-xl border p-4 sm:p-5 ${
                qualityReady
                  ? "border-green-200 bg-green-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p
                    className={`text-base font-bold ${
                      qualityReady
                        ? "text-green-800"
                        : "text-amber-800"
                    }`}
                  >
                    {qualityReady
                      ? "Phase 4 is complete"
                      : "Phase 4.7 still has requirements"}
                  </p>

                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    {qualityReady
                      ? "The quality-monitoring workpaper is complete and the Phase 4 conclusion-reporting workflow can be closed."
                      : "Complete the inspection, findings, root-cause, remediation, communication, leadership review and final quality-conclusion requirements before closing Phase 4.7."}
                  </p>
                </div>

                <span
                  className={`w-fit shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
                    qualityReady
                      ? "border-green-300 bg-white text-green-700"
                      : "border-amber-300 bg-white text-amber-700"
                  }`}
                >
                  {qualityReady
                    ? "READY TO COMPLETE"
                    : "PENDING"}
                </span>
              </div>
            </div>
          </section>

          {/* Bottom Actions */}
          <section className="mt-6 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                4.7 Firm-Level Quality Monitoring and Root Cause Analysis
              </p>

              <p className="mt-1 text-xs text-gray-500">
                This is the final workpaper in the Phase 4 Conclusion and
                Reporting workflow.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {saving ? "Saving..." : "Save"}
              </button>

              <button
                type="button"
                onClick={handleComplete}
                disabled={saving}
                className="w-full rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {saving
                  ? "Saving..."
                  : "Complete Phase 4"}
              </button>
            </div>
          </section>
        </div>
      </div>
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
    <div className="border-b border-gray-100 px-4 py-5 sm:px-6">
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
        className={`mt-2 break-words text-xl font-bold ${
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

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "date";
}) {
  return (
    <div className="min-w-0">
      <label className="block text-sm font-semibold text-gray-800">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="mt-2 w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
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
    <div className="min-w-0">
      <label className="block text-sm font-semibold text-gray-800">
        {label}
      </label>

      <textarea
        rows={4}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="mt-2 w-full min-w-0 resize-y rounded-lg border border-gray-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
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
    <div className="min-w-0">
      <label className="block text-sm font-semibold text-gray-800">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
      />

      <span className="text-sm leading-5 text-gray-700">
        {label}
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
    <div
      className={`flex items-center justify-between gap-4 rounded-lg border p-4 ${
        completed
          ? "border-green-200 bg-green-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            completed
              ? "bg-green-600 text-white"
              : "bg-amber-200 text-amber-700"
          }`}
        >
          {completed ? "✓" : "!"}
        </div>

        <span className="text-sm font-medium text-gray-800">
          {label}
        </span>
      </div>

      <span
        className={`shrink-0 text-xs font-semibold ${
          completed
            ? "text-green-700"
            : "text-amber-700"
        }`}
      >
        {completed ? "Complete" : "Pending"}
      </span>
    </div>
  );
}

function ConsiderationItem({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
      {text}
    </div>
  );
}

function getSeverityClasses(
  severity: Severity
): string {
  if (severity === "Severe") {
    return "border-red-300 bg-red-100 text-red-800";
  }

  if (severity === "Significant") {
    return "border-orange-200 bg-orange-100 text-orange-700";
  }

  if (severity === "Moderate") {
    return "border-amber-200 bg-amber-100 text-amber-700";
  }

  return "border-gray-200 bg-gray-100 text-gray-600";
}

function getDeficiencyClasses(
  status: DeficiencyStatus
): string {
  if (status === "Remediated") {
    return "border-green-200 bg-green-100 text-green-700";
  }

  if (status === "Accepted") {
    return "border-blue-200 bg-blue-100 text-blue-700";
  }

  if (status === "Not Applicable") {
    return "border-gray-200 bg-gray-100 text-gray-600";
  }

  if (status === "Under Investigation") {
    return "border-amber-200 bg-amber-100 text-amber-700";
  }

  return "border-red-200 bg-red-100 text-red-700";
}