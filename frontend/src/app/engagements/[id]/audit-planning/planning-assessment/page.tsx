"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  FileText,
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react";

import {
  createPlanningAssessment,
  getEngagement,
  getPlanningAssessmentByEngagement,
  updatePlanningAssessment,
  type Engagement,
  type PlanningAssessment,
} from "@/lib/api";

type AssessmentStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "approved";

interface FormData {
  status: AssessmentStatus;

  business_understanding: string;
  industry_understanding: string;
  regulatory_environment: string;
  accounting_framework: string;
  reporting_requirements: string;
  significant_changes: string;

  significant_risks_identified: string;
  fraud_risk_considerations: string;
  going_concern_considerations: string;
  related_parties_considerations: string;
  internal_audit_considerations: string;
  previous_auditor_considerations: string;

  planning_conclusion: string;
}

const emptyForm: FormData = {
  status: "not_started",

  business_understanding: "",
  industry_understanding: "",
  regulatory_environment: "",
  accounting_framework: "",
  reporting_requirements: "",
  significant_changes: "",

  significant_risks_identified: "",
  fraud_risk_considerations: "",
  going_concern_considerations: "",
  related_parties_considerations: "",
  internal_audit_considerations: "",
  previous_auditor_considerations: "",

  planning_conclusion: "",
};

const statusLabels: Record<AssessmentStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  approved: "Approved",
};

function normalizeStatus(status: string): AssessmentStatus {
  if (
    status === "not_started" ||
    status === "in_progress" ||
    status === "completed" ||
    status === "approved"
  ) {
    return status;
  }

  return "not_started";
}

function getStatusClasses(status: AssessmentStatus) {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-700 border-green-200";

    case "completed":
      return "bg-blue-100 text-blue-700 border-blue-200";

    case "in_progress":
      return "bg-amber-100 text-amber-700 border-amber-200";

    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function assessmentToForm(
  assessment: PlanningAssessment
): FormData {
  return {
    status: normalizeStatus(assessment.status),

    business_understanding:
      assessment.business_understanding || "",

    industry_understanding:
      assessment.industry_understanding || "",

    regulatory_environment:
      assessment.regulatory_environment || "",

    accounting_framework:
      assessment.accounting_framework || "",

    reporting_requirements:
      assessment.reporting_requirements || "",

    significant_changes:
      assessment.significant_changes || "",

    significant_risks_identified:
      assessment.significant_risks_identified || "",

    fraud_risk_considerations:
      assessment.fraud_risk_considerations || "",

    going_concern_considerations:
      assessment.going_concern_considerations || "",

    related_parties_considerations:
      assessment.related_parties_considerations || "",

    internal_audit_considerations:
      assessment.internal_audit_considerations || "",

    previous_auditor_considerations:
      assessment.previous_auditor_considerations || "",

    planning_conclusion:
      assessment.planning_conclusion || "",
  };
}

export default function PlanningAssessmentPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = Number(params.id);

  const [engagement, setEngagement] =
    useState<Engagement | null>(null);

  const [assessment, setAssessment] =
    useState<PlanningAssessment | null>(null);

  const [form, setForm] =
    useState<FormData>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [continuing, setContinuing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!engagementId) {
      setError("Invalid engagement ID.");
      setLoading(false);
      return;
    }

    async function loadPage() {
      try {
        setLoading(true);
        setError("");

        const engagementData =
          (await getEngagement(engagementId)) as Engagement;

        setEngagement(engagementData);

        try {
          const assessmentData =
            await getPlanningAssessmentByEngagement(
              engagementId
            );

          if (assessmentData) {
            setAssessment(assessmentData);
            setForm(assessmentToForm(assessmentData));
          } else {
            setAssessment(null);
            setForm(emptyForm);
          }
        } catch (assessmentError) {
          console.error(
            "Planning assessment lookup error:",
            assessmentError
          );

          setAssessment(null);
          setForm(emptyForm);
        }
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load the engagement."
        );
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [engagementId]);

  function updateField<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setSuccess("");
  }

  /*
   * This is the common save function.
   *
   * It saves 1.1 first.
   * If the save succeeds and continueToNext is true,
   * it moves to 1.2 using the same engagement ID.
   */
  async function saveAssessment(
    continueToNext: boolean
  ) {
    try {
      setError("");
      setSuccess("");

      if (continueToNext) {
        setContinuing(true);
      } else {
        setSaving(true);
      }

      let savedAssessment: PlanningAssessment;

      if (assessment) {
        savedAssessment =
          await updatePlanningAssessment(
            assessment.id,
            {
              engagement: engagementId,
              ...form,
            }
          );
      } else {
        savedAssessment =
          await createPlanningAssessment({
            engagement: engagementId,
            ...form,
          });
      }

      setAssessment(savedAssessment);
      setForm(assessmentToForm(savedAssessment));

      if (continueToNext) {
        /*
         * The 1.1 workpaper has now been successfully saved.
         *
         * Move to:
         * Phase 1 → 1.2 Materiality Assessment
         *
         * The engagement ID remains the same.
         */
        router.push(
          `/engagements/${engagementId}/audit-planning/materiality-assessment`
        );

        return;
      }

      setSuccess(
        "Planning assessment saved successfully."
      );
    } catch (err) {
      console.error(
        "Planning assessment save error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save planning assessment."
      );
    } finally {
      setSaving(false);
      setContinuing(false);
    }
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    await saveAssessment(false);
  }

  async function handleSaveAndContinue() {
    await saveAssessment(true);
  }

  function handleBack() {
    router.push(
      `/engagements/${engagementId}/audit-planning`
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex items-center gap-3 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />

            <span>
              Loading planning assessment...
            </span>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6">

        {/* =====================================================
            PAGE HEADER
        ====================================================== */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">

            <button
              type="button"
              onClick={handleBack}
              className="mt-1 rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
              title="Back to Audit Planning"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div>
              <div className="mb-1 flex items-center gap-2 text-sm text-gray-500">
                <span>Phase 1</span>
                <span>/</span>
                <span>Audit Planning</span>
                <span>/</span>

                <span className="font-medium text-gray-700">
                  1.1 Planning Assessment
                </span>
              </div>

              <h1 className="text-2xl font-bold text-gray-900">
                1.1 Planning Assessment
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Document the auditor&apos;s understanding
                of the entity, environment, risks, and
                key planning considerations.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">

            <span
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${getStatusClasses(
                form.status
              )}`}
            >
              {statusLabels[form.status]}
            </span>

            {/* Save only */}
            <button
              type="submit"
              form="planning-assessment-form"
              disabled={saving || continuing}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {saving
                ? "Saving..."
                : "Save Assessment"}
            </button>

            {/* Save & Continue */}
            <button
              type="button"
              onClick={handleSaveAndContinue}
              disabled={saving || continuing}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {continuing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}

              {continuing
                ? "Saving..."
                : "Save & Continue"}
            </button>
          </div>
        </div>

        {/* =====================================================
            WORKFLOW INDICATOR
        ====================================================== */}

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-2 overflow-x-auto">

              <div className="flex shrink-0 items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white">
                <CheckCircle2 className="h-4 w-4" />
                <span>1.1 Planning Assessment</span>
              </div>

              <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />

              <div className="flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600">
                <span>1.2 Materiality Assessment</span>
              </div>

              <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />

              <div className="flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-500">
                <span>1.3 Audit Scope</span>
              </div>

              <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />

              <div className="flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-500">
                <span>1.4 Audit Team</span>
              </div>
            </div>

            <p className="shrink-0 text-xs text-gray-500">
              Step 1 of 6
            </p>
          </div>
        </div>

        {/* =====================================================
            ENGAGEMENT INFORMATION
        ====================================================== */}

        {engagement && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Engagement
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {engagement.engagement_code}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Title
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {engagement.title}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Risk Level
                </p>

                <p className="mt-1 font-semibold capitalize text-gray-900">
                  {engagement.risk_level}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Financial Year End
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {engagement.financial_year_end ||
                    "Not specified"}
                </p>
              </div>

            </div>
          </div>
        )}

        {/* =====================================================
            ALERTS
        ====================================================== */}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">

            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Unable to complete request
              </p>

              <p className="mt-1 text-sm">
                {error}
              </p>
            </div>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">

            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Saved
              </p>

              <p className="mt-1 text-sm">
                {success}
              </p>
            </div>
          </div>
        )}

        <form
          id="planning-assessment-form"
          onSubmit={handleSave}
          className="space-y-6"
        >

          {/* =====================================================
              WORKPAPER STATUS
          ====================================================== */}

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">

            <div className="border-b border-gray-200 px-6 py-5">
              <div className="flex items-center gap-3">

                <div className="rounded-lg bg-gray-100 p-2">
                  <FileText className="h-5 w-5 text-gray-700" />
                </div>

                <div>
                  <h2 className="font-semibold text-gray-900">
                    Workpaper Status
                  </h2>

                  <p className="text-sm text-gray-500">
                    Track the preparation and approval
                    status of this planning assessment.
                  </p>
                </div>

              </div>
            </div>

            <div className="p-6">

              <label className="block max-w-md">

                <span className="mb-2 block text-sm font-medium text-gray-700">
                  Assessment Status
                </span>

                <select
                  value={form.status}
                  onChange={(event) =>
                    updateField(
                      "status",
                      event.target.value as AssessmentStatus
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
                >
                  <option value="not_started">
                    Not Started
                  </option>

                  <option value="in_progress">
                    In Progress
                  </option>

                  <option value="completed">
                    Completed
                  </option>

                  <option value="approved">
                    Approved
                  </option>
                </select>

              </label>
            </div>
          </section>

          {/* =====================================================
              A. UNDERSTANDING ENTITY
          ====================================================== */}

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">

            <div className="border-b border-gray-200 px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="rounded-lg bg-blue-50 p-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>

                <div>
                  <h2 className="font-semibold text-gray-900">
                    A. Understanding the Entity and Its
                    Environment
                  </h2>

                  <p className="text-sm text-gray-500">
                    Document the information obtained
                    during planning.
                  </p>
                </div>

              </div>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-2">

              <TextAreaField
                label="Business Understanding"
                value={form.business_understanding}
                onChange={(value) =>
                  updateField(
                    "business_understanding",
                    value
                  )
                }
                placeholder="Describe the entity's business model, ownership, operations, objectives, and major activities..."
              />

              <TextAreaField
                label="Industry Understanding"
                value={form.industry_understanding}
                onChange={(value) =>
                  updateField(
                    "industry_understanding",
                    value
                  )
                }
                placeholder="Describe the industry, competitive environment, market conditions, and relevant industry risks..."
              />

              <TextAreaField
                label="Regulatory Environment"
                value={form.regulatory_environment}
                onChange={(value) =>
                  updateField(
                    "regulatory_environment",
                    value
                  )
                }
                placeholder="Document relevant laws, regulations, regulatory bodies, licensing requirements, and compliance matters..."
              />

              <TextAreaField
                label="Accounting Framework"
                value={form.accounting_framework}
                onChange={(value) =>
                  updateField(
                    "accounting_framework",
                    value
                  )
                }
                placeholder="State the applicable financial reporting framework and significant accounting requirements..."
              />

              <TextAreaField
                label="Reporting Requirements"
                value={form.reporting_requirements}
                onChange={(value) =>
                  updateField(
                    "reporting_requirements",
                    value
                  )
                }
                placeholder="Document statutory, regulatory, contractual, group, or other reporting requirements..."
              />

              <TextAreaField
                label="Significant Changes"
                value={form.significant_changes}
                onChange={(value) =>
                  updateField(
                    "significant_changes",
                    value
                  )
                }
                placeholder="Describe significant changes during the period, including management, systems, operations, structure, financing, or accounting changes..."
              />

            </div>
          </section>

          {/* =====================================================
              B. RISK CONSIDERATIONS
          ====================================================== */}

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">

            <div className="border-b border-gray-200 px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="rounded-lg bg-amber-50 p-2">
                  <CircleAlert className="h-5 w-5 text-amber-600" />
                </div>

                <div>
                  <h2 className="font-semibold text-gray-900">
                    B. Risk and Planning Considerations
                  </h2>

                  <p className="text-sm text-gray-500">
                    Record matters that may affect audit
                    risk and planning.
                  </p>
                </div>

              </div>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-2">

              <TextAreaField
                label="Significant Risks Identified"
                value={form.significant_risks_identified}
                onChange={(value) =>
                  updateField(
                    "significant_risks_identified",
                    value
                  )
                }
                placeholder="Identify significant risks of material misstatement and explain the basis for identifying them..."
              />

              <TextAreaField
                label="Fraud Risk Considerations"
                value={form.fraud_risk_considerations}
                onChange={(value) =>
                  updateField(
                    "fraud_risk_considerations",
                    value
                  )
                }
                placeholder="Document fraud risk factors, management override considerations, incentives, pressures, opportunities, and responses..."
              />

              <TextAreaField
                label="Going Concern Considerations"
                value={form.going_concern_considerations}
                onChange={(value) =>
                  updateField(
                    "going_concern_considerations",
                    value
                  )
                }
                placeholder="Document indicators of financial difficulty, liquidity issues, financing dependence, or other going concern matters..."
              />

              <TextAreaField
                label="Related Parties Considerations"
                value={form.related_parties_considerations}
                onChange={(value) =>
                  updateField(
                    "related_parties_considerations",
                    value
                  )
                }
                placeholder="Document identified related parties, relationships, transactions, and related-party risks..."
              />

              <TextAreaField
                label="Internal Audit Considerations"
                value={form.internal_audit_considerations}
                onChange={(value) =>
                  updateField(
                    "internal_audit_considerations",
                    value
                  )
                }
                placeholder="Document whether internal audit exists, its role, competence, objectivity, and whether its work may be relevant to the external audit..."
              />

              <TextAreaField
                label="Previous Auditor Considerations"
                value={form.previous_auditor_considerations}
                onChange={(value) =>
                  updateField(
                    "previous_auditor_considerations",
                    value
                  )
                }
                placeholder="Document predecessor auditor matters, opening balances, prior findings, disagreements, modified opinions, and other relevant information..."
              />

            </div>
          </section>

          {/* =====================================================
              C. PLANNING CONCLUSION
          ====================================================== */}

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">

            <div className="border-b border-gray-200 px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="rounded-lg bg-green-50 p-2">
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                </div>

                <div>
                  <h2 className="font-semibold text-gray-900">
                    C. Planning Conclusion
                  </h2>

                  <p className="text-sm text-gray-500">
                    Summarize the overall planning assessment
                    and implications for the audit strategy.
                  </p>
                </div>

              </div>
            </div>

            <div className="p-6">

              <TextAreaField
                label="Overall Planning Conclusion"
                value={form.planning_conclusion}
                onChange={(value) =>
                  updateField(
                    "planning_conclusion",
                    value
                  )
                }
                placeholder="Summarize the auditor's overall understanding, key planning matters, identified risks, and implications for the audit..."
                rows={8}
                fullWidth
              />

            </div>
          </section>

          {/* =====================================================
              ACTIONS
          ====================================================== */}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">

            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />

              Back to Audit Planning
            </button>

            <div className="flex flex-col gap-3 sm:flex-row">

              {/* Save only */}
              <button
                type="submit"
                disabled={saving || continuing}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}

                {saving
                  ? "Saving..."
                  : "Save Planning Assessment"}
              </button>

              {/* Save & Continue */}
              <button
                type="button"
                onClick={handleSaveAndContinue}
                disabled={saving || continuing}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {continuing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}

                {continuing
                  ? "Saving..."
                  : "Save & Continue to 1.2"}
              </button>

            </div>
          </div>

        </form>
      </div>
    </AppLayout>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 6,
  fullWidth = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  fullWidth?: boolean;
}) {
  return (
    <label
      className={
        fullWidth
          ? "block w-full"
          : "block"
      }
    >
      <span className="mb-2 block text-sm font-medium text-gray-800">
        {label}
      </span>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
      />
    </label>
  );
}