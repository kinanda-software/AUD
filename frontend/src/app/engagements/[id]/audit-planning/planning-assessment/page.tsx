"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
      return "border-green-200 bg-green-50 text-green-700";

    case "completed":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "in_progress":
      return "border-amber-200 bg-amber-50 text-amber-700";

    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
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
        <div className="flex min-h-[70vh] w-full items-center justify-center">
          <div className="flex items-center gap-3 text-gray-600">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin" />

            <span className="text-sm">
              Loading planning assessment...
            </span>
          </div>
        </div>

    );
  }

  return (
    <>
    
      {/* =====================================================
          PAGE CONTENT
          IMPORTANT:
          AppLayout already provides the <main>.
          Do NOT add another <main> here.
      ====================================================== */}

      <div className="w-full min-w-0 space-y-6 px-4 pb-8 pt-6 sm:px-6 lg:px-8">

        {/* =====================================================
            PAGE HEADER
        ====================================================== */}

        <section className="w-full min-w-0 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex min-w-0 flex-col gap-5 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">

            <div className="flex min-w-0 items-start gap-3 sm:gap-4">

              <button
                type="button"
                onClick={handleBack}
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
                title="Back to Audit Planning"
                aria-label="Back to Audit Planning"
              >
                <ArrowLeft className="h-5 w-5 shrink-0" />
              </button>

              <div className="min-w-0">

                <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 sm:text-sm">
                  <span>Phase 1</span>
                  <span>/</span>
                  <span>Audit Planning</span>
                  <span>/</span>

                  <span className="font-medium text-gray-700">
                    1.1 Planning Assessment
                  </span>
                </div>

                <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                  1.1 Planning Assessment
                </h1>

                <p className="mt-1.5 max-w-4xl text-sm leading-6 text-gray-500">
                  Document the auditor&apos;s understanding
                  of the entity, environment, risks, and
                  key planning considerations.
                </p>

              </div>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2.5 xl:justify-end">

              <span
                className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-xs font-semibold sm:text-sm ${getStatusClasses(
                  form.status
                )}`}
              >
                {statusLabels[form.status]}
              </span>

              <button
                type="submit"
                form="planning-assessment-form"
                disabled={saving || continuing}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 shrink-0" />
                )}

                <span>
                  {saving
                    ? "Saving..."
                    : "Save Assessment"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleSaveAndContinue}
                disabled={saving || continuing}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {continuing ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 shrink-0" />
                )}

                <span>
                  {continuing
                    ? "Saving..."
                    : "Save & Continue"}
                </span>
              </button>

            </div>
          </div>
        </section>

        {/* =====================================================
            WORKFLOW
        ====================================================== */}

        <section className="w-full min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4 sm:p-5">

            <div className="mb-3 flex items-center justify-between gap-3">

              <p className="text-sm font-semibold text-gray-900">
                Audit Planning Workflow
              </p>

              <p className="shrink-0 text-xs font-medium text-gray-500">
                Step 1 of 6
              </p>

            </div>

            <div className="flex w-full min-w-0 items-center gap-2 overflow-x-auto pb-1">

              <div className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white sm:text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />

                <span>
                  1.1 Planning Assessment
                </span>
              </div>

              <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />

              <div className="inline-flex shrink-0 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 sm:text-sm">
                <span>
                  1.2 Materiality Assessment
                </span>
              </div>

              <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />

              <div className="inline-flex shrink-0 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 sm:text-sm">
                <span>
                  1.3 Audit Scope
                </span>
              </div>

              <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />

              <div className="inline-flex shrink-0 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 sm:text-sm">
                <span>
                  1.4 Audit Team
                </span>
              </div>

            </div>
          </div>
        </section>

        {/* =====================================================
            ENGAGEMENT INFORMATION
        ====================================================== */}

        {engagement && (
          <section className="w-full min-w-0 rounded-xl border border-gray-200 bg-white shadow-sm">

            <div className="grid min-w-0 gap-5 p-5 sm:p-6 md:grid-cols-2 lg:grid-cols-4">

              <InfoItem
                label="Engagement"
                value={engagement.engagement_code}
              />

              <InfoItem
                label="Title"
                value={engagement.title}
              />

              <InfoItem
                label="Risk Level"
                value={engagement.risk_level}
                capitalize
              />

              <InfoItem
                label="Financial Year End"
                value={
                  engagement.financial_year_end ||
                  "Not specified"
                }
              />

            </div>
          </section>
        )}

        {/* =====================================================
            ALERTS
        ====================================================== */}

        {error && (
          <div className="flex w-full min-w-0 items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">

            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="min-w-0">
              <p className="font-semibold">
                Unable to complete request
              </p>

              <p className="mt-1 break-words text-sm leading-6">
                {error}
              </p>
            </div>

          </div>
        )}

        {success && (
          <div className="flex w-full min-w-0 items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">

            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="min-w-0">
              <p className="font-semibold">
                Saved
              </p>

              <p className="mt-1 text-sm leading-6">
                {success}
              </p>
            </div>

          </div>
        )}

        {/* =====================================================
            FORM
        ====================================================== */}

        <form
          id="planning-assessment-form"
          onSubmit={handleSave}
          className="w-full min-w-0 space-y-6"
        >

          {/* =====================================================
              WORKPAPER STATUS
          ====================================================== */}

          <section className="w-full min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

            <SectionHeader
              icon={
                <FileText className="h-5 w-5 shrink-0 text-gray-700" />
              }
              iconClassName="bg-gray-100"
              title="Workpaper Status"
              description="Track the preparation and approval status of this planning assessment."
            />

            <div className="p-5 sm:p-6">

              <label className="block w-full max-w-md">

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

          <section className="w-full min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

            <SectionHeader
              icon={
                <FileText className="h-5 w-5 shrink-0 text-blue-600" />
              }
              iconClassName="bg-blue-50"
              title="A. Understanding the Entity and Its Environment"
              description="Document the information obtained during planning."
            />

            <div className="grid min-w-0 gap-6 p-5 sm:p-6 md:grid-cols-2">

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

          <section className="w-full min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

            <SectionHeader
              icon={
                <CircleAlert className="h-5 w-5 shrink-0 text-amber-600" />
              }
              iconClassName="bg-amber-50"
              title="B. Risk and Planning Considerations"
              description="Record matters that may affect audit risk and planning."
            />

            <div className="grid min-w-0 gap-6 p-5 sm:p-6 md:grid-cols-2">

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

          <section className="w-full min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

            <SectionHeader
              icon={
                <ShieldCheck className="h-5 w-5 shrink-0 text-green-600" />
              }
              iconClassName="bg-green-50"
              title="C. Planning Conclusion"
              description="Summarize the overall planning assessment and implications for the audit strategy."
            />

            <div className="p-5 sm:p-6">

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

          <div className="flex w-full min-w-0 flex-col-reverse gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">

            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />

              <span>
                Back to Audit Planning
              </span>
            </button>

            <div className="flex flex-col gap-3 sm:flex-row">

              <button
                type="submit"
                disabled={saving || continuing}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 shrink-0" />
                )}

                <span>
                  {saving
                    ? "Saving..."
                    : "Save Planning Assessment"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleSaveAndContinue}
                disabled={saving || continuing}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {continuing ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 shrink-0" />
                )}

                <span>
                  {continuing
                    ? "Saving..."
                    : "Save & Continue to 1.2"}
                </span>
              </button>

            </div>
          </div>

        </form>
      </div>
    
      </>
  );
}

/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value?: string | number | null;
  capitalize?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p
        className={`mt-1.5 break-words text-sm font-semibold text-gray-900 sm:text-base ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value || "Not specified"}
      </p>
    </div>
  );
}

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({
  icon,
  iconClassName,
  title,
  description,
}: {
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-gray-200 px-5 py-5 sm:px-6">
      <div className="flex min-w-0 items-start gap-3">

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-6 text-gray-900 sm:text-lg">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-6 text-gray-500">
            {description}
          </p>
        </div>

      </div>
    </div>
  );
}

/* =========================================================
   TEXT AREA
========================================================= */

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
          ? "block w-full min-w-0"
          : "block min-w-0"
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
        className="block w-full min-w-0 resize-y rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
      />
    </label>
  );
}





