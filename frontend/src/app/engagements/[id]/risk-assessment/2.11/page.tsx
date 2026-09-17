"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "../../../../../components/layout/AppLayout";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  CircleAlert,
  ChevronDown,
  FileText,
  Target,
  Calculator,
  Users,
  Clock,
  ShieldCheck,
  Building2,
  MessageSquare,
  BarChart3,
  UserCheck,
  Plus,
  Trash2,
  MapPin,
  BriefcaseBusiness,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type YesNo = "Yes" | "No";

type RiskLevel =
  | "Low"
  | "Moderate"
  | "High"
  | "Significant";

type StrategyStatus =
  | "Draft"
  | "In Progress"
  | "Completed"
  | "Approved";

type AuditStrategy = {
  id: number;

  overallStrategy: string;
  auditScope: string;

  materiality: string;
  performanceMateriality: string;
  clearlyTrivialThreshold: string;

  significantRisks: string;

  staffingPlan: string;

  specialistsRequired: YesNo | "";
  specialistDetails: string;

  timingApproach: string;
  interimTesting: string;
  yearEndTesting: string;

  controlReliance: string;
  substantiveApproach: string;

  analyticsApproach: string;

  locationsComponents: string;
  groupAuditConsiderations: string;

  internalAuditReliance: string;

  communicationPlan: string;
  engagementTeamCommunication: string;

  independenceConsiderations: string;
  technologyConsiderations: string;

  riskLevel: RiskLevel | "";

  status: StrategyStatus;

  additionalConsiderations: string;

  auditorConclusion: string;
};

/* =========================================================
   EMPTY STRATEGY
========================================================= */

const createEmptyStrategy = (
  id: number
): AuditStrategy => ({
  id,

  overallStrategy: "",
  auditScope: "",

  materiality: "",
  performanceMateriality: "",
  clearlyTrivialThreshold: "",

  significantRisks: "",

  staffingPlan: "",

  specialistsRequired: "",
  specialistDetails: "",

  timingApproach: "",
  interimTesting: "",
  yearEndTesting: "",

  controlReliance: "",
  substantiveApproach: "",

  analyticsApproach: "",

  locationsComponents: "",
  groupAuditConsiderations: "",

  internalAuditReliance: "",

  communicationPlan: "",
  engagementTeamCommunication: "",

  independenceConsiderations: "",
  technologyConsiderations: "",

  riskLevel: "",

  status: "Draft",

  additionalConsiderations: "",

  auditorConclusion: "",
});

/* =========================================================
   PAGE
========================================================= */

export default function AuditStrategyPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = params.id as string;

  const [strategies, setStrategies] = useState<
    AuditStrategy[]
  >([createEmptyStrategy(1)]);

  const [saved, setSaved] = useState(false);

  const [saving, setSaving] = useState(false);

  const [errors, setErrors] = useState<string[]>([]);

  /* =======================================================
     UPDATE STRATEGY
  ======================================================= */

  const updateStrategy = (
    id: number,
    field: keyof AuditStrategy,
    value: string
  ) => {
    setStrategies((current) =>
      current.map((strategy) =>
        strategy.id === id
          ? {
              ...strategy,
              [field]: value,
            }
          : strategy
      )
    );

    setSaved(false);
    setErrors([]);
  };

  /* =======================================================
     ADD STRATEGY
  ======================================================= */

  const addStrategy = () => {
    if (saving) {
      return;
    }

    const nextId =
      strategies.length > 0
        ? Math.max(
            ...strategies.map(
              (strategy) => strategy.id
            )
          ) + 1
        : 1;

    setStrategies((current) => [
      ...current,
      createEmptyStrategy(nextId),
    ]);

    setSaved(false);
    setErrors([]);
  };

  /* =======================================================
     REMOVE STRATEGY
  ======================================================= */

  const removeStrategy = (id: number) => {
    if (saving) {
      return;
    }

    if (strategies.length === 1) {
      return;
    }

    setStrategies((current) =>
      current.filter(
        (strategy) => strategy.id !== id
      )
    );

    setSaved(false);
    setErrors([]);
  };

  /* =======================================================
     VALIDATE FORM
  ======================================================= */

  const validateForm = (): boolean => {
    const validationErrors: string[] = [];

    strategies.forEach((strategy, index) => {
      const strategyNumber = index + 1;

      if (!strategy.overallStrategy.trim()) {
        validationErrors.push(
          `Strategy ${strategyNumber}: Overall Audit Strategy is required.`
        );
      }

      if (!strategy.auditScope.trim()) {
        validationErrors.push(
          `Strategy ${strategyNumber}: Audit Scope is required.`
        );
      }

      if (!strategy.significantRisks.trim()) {
        validationErrors.push(
          `Strategy ${strategyNumber}: Identified Significant Risks is required.`
        );
      }

      if (
        strategy.specialistsRequired === ""
      ) {
        validationErrors.push(
          `Strategy ${strategyNumber}: Specialists Required? must be selected.`
        );
      }

      if (
        strategy.specialistsRequired === "Yes" &&
        !strategy.specialistDetails.trim()
      ) {
        validationErrors.push(
          `Strategy ${strategyNumber}: Specialist Details are required when specialists are required.`
        );
      }

      if (!strategy.riskLevel) {
        validationErrors.push(
          `Strategy ${strategyNumber}: Overall Engagement Risk Level is required.`
        );
      }

      if (!strategy.auditorConclusion.trim()) {
        validationErrors.push(
          `Strategy ${strategyNumber}: Auditor Conclusion is required.`
        );
      }
    });

    setErrors(validationErrors);

    return validationErrors.length === 0;
  };

  /* =======================================================
     SAVE WORKPAPER
     
     FINAL PHASE 2 STEP
     
     Save
       ↓
     Complete Strategy
       ↓
     Complete Phase 2
       ↓
     Open Phase 3
  ======================================================= */

  const handleSave = async () => {
    if (saving) {
      return;
    }

    const isValid = validateForm();

    if (!isValid) {
      setSaved(false);
      return;
    }

    setSaving(true);

    try {
      const completedStrategies =
        strategies.map((strategy) => ({
          ...strategy,
          status:
            "Completed" as StrategyStatus,
        }));

      const workpaperData = {
        engagementId,

        phase: "Phase 2",

        section: "2.11",

        title: "Audit Strategy",

        strategies: completedStrategies,

        status: "Completed",

        savedAt:
          new Date().toISOString(),
      };

      console.log(
        "2.11 Audit Strategy completed:",
        workpaperData
      );

      /*
       * Temporary frontend persistence.
       *
       * This will later be replaced by the Django API
       * when the Phase 2.11 backend model is implemented.
       */

      localStorage.setItem(
        `audit-phase-2-2.11-${engagementId}`,
        JSON.stringify(workpaperData)
      );

      /*
       * Mark Phase 2 as completed.
       */

      localStorage.setItem(
        `audit-phase-2-completed-${engagementId}`,
        "true"
      );

      /*
       * Store Phase 2 status.
       */

      localStorage.setItem(
        `audit-phase-2-status-${engagementId}`,
        "Completed"
      );

      /*
       * Update the displayed strategy status.
       */

      setStrategies(
        completedStrategies
      );

      setSaved(true);

      /*
       * Short delay so the user can see
       * the completion message.
       */

      await new Promise((resolve) =>
        setTimeout(resolve, 700)
      );

      /*
       * Phase 3 route already used
       * by your current application.
       */

      router.push(
        `/engagements/${engagementId}/execution`
      );
    } catch (error) {
      console.error(
        "Failed to complete Phase 2:",
        error
      );

      setSaved(false);

      setErrors([
        "The final Phase 2 workpaper could not be saved. Please try again.",
      ]);
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     BACK
  ======================================================= */

  const handleBack = () => {
    if (saving) {
      return;
    }

    router.push(
      `/engagements/${engagementId}/risk-assessment`
    );
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="border-b border-amber-200 bg-white">

          <div className="mx-auto max-w-7xl px-6 py-5">

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex items-center gap-4">

                <button
                  type="button"
                  onClick={handleBack}
                  disabled={saving}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <div>

                  <div className="mb-1 flex items-center gap-2 text-sm text-gray-500">

                    <span>
                      Phase 2
                    </span>

                    <span>/</span>

                    <span>
                      Risk Assessment
                    </span>

                    <span>/</span>

                    <span className="font-medium text-amber-700">
                      2.11
                    </span>

                  </div>

                  <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                    Audit Strategy
                  </h1>

                  <p className="mt-1 text-sm text-gray-500">
                    Final Phase 2 workpaper — establish
                    the overall audit strategy and approach.
                  </p>

                </div>

              </div>

              <div className="flex items-center gap-3">

                {saved && (

                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">

                    <CheckCircle2 className="h-4 w-4" />

                    Phase 2 Completed

                  </div>

                )}

                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                  2.11
                </div>

              </div>

            </div>

          </div>

        </div>


        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <main className="mx-auto max-w-7xl px-6 py-8">

          {/* =================================================
              INFORMATION BANNER
          ================================================= */}

          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-5">

            <div className="flex gap-4">

              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <FileText className="h-5 w-5" />
              </div>

              <div>

                <h2 className="font-semibold text-amber-900">
                  Final Phase 2 Workpaper
                </h2>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Complete the audit strategy below.
                  When you click{" "}
                  <strong>
                    Save Workpaper
                  </strong>
                  , Phase 2 will be marked as
                  completed and the system will
                  automatically open Phase 3.
                </p>

              </div>

            </div>

          </div>


          {/* =================================================
              VALIDATION ERRORS
          ================================================= */}

          {errors.length > 0 && (

            <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-5">

              <div className="flex items-start gap-3">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100">

                  <CircleAlert className="h-5 w-5 text-red-600" />

                </div>

                <div>

                  <h2 className="font-semibold text-red-800">
                    Please complete the required information
                  </h2>

                  <ul className="mt-2 space-y-1 text-sm text-red-700">

                    {errors.map(
                      (error, index) => (
                        <li key={index}>
                          • {error}
                        </li>
                      )
                    )}

                  </ul>

                </div>

              </div>

            </div>

          )}


          {/* =================================================
              STRATEGY CARDS
          ================================================= */}

          <div className="space-y-8">

            {strategies.map(
              (strategy, index) => (

                <div
                  key={strategy.id}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                >

                  {/* ===========================================
                      STRATEGY HEADER
                  =========================================== */}

                  <div className="flex flex-col gap-3 border-b border-amber-200 bg-amber-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-700 text-sm font-bold text-white">
                        {index + 1}
                      </div>

                      <div>

                        <h2 className="font-semibold text-gray-900">
                          Audit Strategy {index + 1}
                        </h2>

                        <p className="text-sm text-gray-500">
                          Overall strategy and audit approach
                        </p>

                      </div>

                    </div>

                    {strategies.length > 1 && (

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          removeStrategy(
                            strategy.id
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >

                        <Trash2 className="h-4 w-4" />

                        Remove

                      </button>

                    )}

                  </div>


                  <div className="p-6">

                    {/* =========================================
                        1. OVERALL AUDIT STRATEGY
                    ========================================== */}

                    <SectionHeader
                      icon={
                        <Target className="h-5 w-5" />
                      }
                      number="1"
                      title="Overall Audit Strategy"
                      description="Establish the overall strategy and define the scope of the audit engagement."
                    />

                    <div className="grid gap-6 md:grid-cols-2">

                      <TextAreaField
                        label="Overall Audit Strategy"
                        value={
                          strategy.overallStrategy
                        }
                        onChange={(value) =>
                          updateStrategy(
                            strategy.id,
                            "overallStrategy",
                            value
                          )
                        }
                        placeholder="Describe the overall strategy for the audit engagement..."
                        required
                        disabled={saving}
                      />

                      <TextAreaField
                        label="Audit Scope"
                        value={
                          strategy.auditScope
                        }
                        onChange={(value) =>
                          updateStrategy(
                            strategy.id,
                            "auditScope",
                            value
                          )
                        }
                        placeholder="Describe the scope, entities, accounts and periods covered by the audit..."
                        required
                        disabled={saving}
                      />

                    </div>


                    {/* =========================================
                        2. MATERIALITY
                    ========================================== */}

                    <SectionHeader
                      icon={
                        <Calculator className="h-5 w-5" />
                      }
                      number="2"
                      title="Materiality"
                      description="Document the materiality thresholds established for the audit."
                    />

                    <div className="grid gap-6 md:grid-cols-3">

                      <InputField
                        label="Overall Materiality"
                        value={
                          strategy.materiality
                        }
                        onChange={(value) =>
                          updateStrategy(
                            strategy.id,
                            "materiality",
                            value
                          )
                        }
                        placeholder="e.g. TZS 50,000,000"
                        disabled={saving}
                      />

                      <InputField
                        label="Performance Materiality"
                        value={
                          strategy.performanceMateriality
                        }
                        onChange={(value) =>
                          updateStrategy(
                            strategy.id,
                            "performanceMateriality",
                            value
                          )
                        }
                        placeholder="e.g. TZS 35,000,000"
                        disabled={saving}
                      />

                      <InputField
                        label="Clearly Trivial Threshold"
                        value={
                          strategy.clearlyTrivialThreshold
                        }
                        onChange={(value) =>
                          updateStrategy(
                            strategy.id,
                            "clearlyTrivialThreshold",
                            value
                          )
                        }
                        placeholder="e.g. TZS 2,500,000"
                        disabled={saving}
                      />

                    </div>


                    {/* =========================================
                        3. SIGNIFICANT RISKS
                    ========================================== */}

                    <SectionHeader
                      icon={
                        <CircleAlert className="h-5 w-5" />
                      }
                      number="3"
                      title="Significant Risks"
                      description="Identify significant risks and explain how they affect the audit strategy."
                    />

                    <TextAreaField
                      label="Identified Significant Risks"
                      value={
                        strategy.significantRisks
                      }
                      onChange={(value) =>
                        updateStrategy(
                          strategy.id,
                          "significantRisks",
                          value
                        )
                      }
                      placeholder="Describe significant risks identified and how they will influence the audit strategy..."
                      required
                      disabled={saving}
                    />


                    {/* =========================================
                        4. STAFFING & RESOURCES
                    ========================================== */}

                    <SectionHeader
                      icon={
                        <Users className="h-5 w-5" />
                      }
                      number="4"
                      title="Staffing & Resources"
                      description="Document the engagement team, responsibilities, resources and specialist requirements."
                    />

                    <TextAreaField
                      label="Staffing Plan"
                      value={
                        strategy.staffingPlan
                      }
                      onChange={(value) =>
                        updateStrategy(
                          strategy.id,
                          "staffingPlan",
                          value
                        )
                      }
                      placeholder="Describe engagement team composition, responsibilities, experience and allocation of resources..."
                      disabled={saving}
                    />

                    <div className="mt-6 grid gap-6 md:grid-cols-2">

                      <SelectField
                        label="Specialists Required?"
                        value={
                          strategy.specialistsRequired
                        }
                        onChange={(value) =>
                          updateStrategy(
                            strategy.id,
                            "specialistsRequired",
                            value
                          )
                        }
                        options={[
                          {
                            label: "Select",
                            value: "",
                          },
                          {
                            label: "Yes",
                            value: "Yes",
                          },
                          {
                            label: "No",
                            value: "No",
                          },
                        ]}
                        required
                        disabled={saving}
                      />

                      <TextAreaField
                        label="Specialist Details"
                        value={
                          strategy.specialistDetails
                        }
                        onChange={(value) =>
                          updateStrategy(
                            strategy.id,
                            "specialistDetails",
                            value
                          )
                        }
                        placeholder="If specialists are required, describe the specialist, purpose and expected involvement..."
                        disabled={saving}
                      />

                    </div>


                    {/* =========================================
                        5. TIMING
                    ========================================== */}

                    <SectionHeader
                      icon={
                        <Clock className="h-5 w-5" />
                      }
                      number="5"
                      title="Timing"
                      description="Establish the timing and phasing of audit procedures."
                    />

                    <TextAreaField
                      label="Timing Approach"
                      value={
                        strategy.timingApproach
                      }
                      onChange={(value) =>
                        updateStrategy(
                          strategy.id,
                          "timingApproach",
                          value
                        )
                      }
                      placeholder="Describe the overall timing of the engagement..."
                      disabled={saving}
                    />

                    <div className="mt-6 grid gap-6 md:grid-cols-2">

                      <TextAreaField
                        label="Interim Testing"
                        value={
                          strategy.interimTesting
                        }
                        onChange={(value) =>
                          updateStrategy(
                            strategy.id,
                            "interimTesting",
                            value
                          )
                        }
                        placeholder="Describe procedures planned during interim testing..."
                        disabled={saving}
                      />

                      <TextAreaField
                        label="Year-End Testing"
                        value={
                          strategy.yearEndTesting
                        }
                        onChange={(value) =>
                          updateStrategy(
                            strategy.id,
                            "yearEndTesting",
                            value
                          )
                        }
                        placeholder="Describe procedures planned at year-end..."
                        disabled={saving}
                      />

                    </div>


                    {/* =========================================
                        6. CONTROL RELIANCE
                    ========================================== */}

                    <SectionHeader
                      icon={
                        <ShieldCheck className="h-5 w-5" />
                      }
                      number="6"
                      title="Control Reliance & Substantive Approach"
                      description="Document the planned balance between reliance on controls and substantive audit procedures."
                    />

                    <div className="grid gap-6 md:grid-cols-2">

                      <TextAreaField
                        label="Control Reliance"
                        value={
                          strategy.controlReliance
                        }
                        onChange={(value) =>
                          updateStrategy(
                            strategy.id,
                            "controlReliance",
                            value
                          )
                        }
                        placeholder="Describe the planned reliance on internal controls..."
                        disabled={saving}
                      />

                      <TextAreaField
                        label="Substantive Approach"
                        value={
                          strategy.substantiveApproach
                        }
                        onChange={(value) =>
                          updateStrategy(
                            strategy.id,
                            "substantiveApproach",
                            value
                          )
                        }
                        placeholder="Describe the substantive audit approach..."
                        disabled={saving}
                      />

                    </div>


                    {/* =========================================
                        7. ANALYTICS
                    ========================================== */}

                    <SectionHeader
                      icon={
                        <BarChart3 className="h-5 w-5" />
                      }
                      number="7"
                      title="Use of Analytics"
                      description="Document the planned use of analytical procedures and audit data analytics."
                    />

                    <TextAreaField
                      label="Analytics Approach"
                      value={
                        strategy.analyticsApproach
                      }
                      onChange={(value) =>
                        updateStrategy(
                          strategy.id,
                          "analyticsApproach",
                          value
                        )
                      }
                      placeholder="Describe planned use of analytical procedures, data analytics, trend analysis or other automated procedures..."
                      disabled={saving}
                    />


                    {/* =========================================
                        8. LOCATIONS & COMPONENTS
                    ========================================== */}

                    <SectionHeader
                      icon={
                        <MapPin className="h-5 w-5" />
                      }
                      number="8"
                      title="Locations & Components"
                      description="Identify locations, branches, subsidiaries and group audit considerations."
                    />

                    <div className="grid gap-6 md:grid-cols-2">

                      <TextAreaField
                        label="Locations / Components"
                        value={
                          strategy.locationsComponents
                        }
                        onChange={(value) =>
                          updateStrategy(
                            strategy.id,
                            "locationsComponents",
                            value
                          )
                        }
                        placeholder="List locations, branches, subsidiaries or components included in the audit..."
                        disabled={saving}
                      />

                      <TextAreaField
                        label="Group Audit Considerations"
                        value={
                          strategy.groupAuditConsiderations
                        }
                        onChange={(value) =>
                          updateStrategy(
                            strategy.id,
                            "groupAuditConsiderations",
                            value
                          )
                        }
                        placeholder="Describe group audit considerations, component auditors and consolidation procedures..."
                        disabled={saving}
                      />

                    </div>


                    {/* =========================================
                        9. INTERNAL AUDIT
                    ========================================== */}

                    <SectionHeader
                      icon={
                        <UserCheck className="h-5 w-5" />
                      }
                      number="9"
                      title="Reliance on Internal Audit"
                      description="Document whether and how the external audit will use internal audit work."
                    />

                    <TextAreaField
                      label="Internal Audit Reliance"
                      value={
                        strategy.internalAuditReliance
                      }
                      onChange={(value) =>
                        updateStrategy(
                          strategy.id,
                          "internalAuditReliance",
                          value
                        )
                      }
                      placeholder="Describe whether and how the external audit will use the work of internal audit..."
                      disabled={saving}
                    />


                    {/* =========================================
                        10. COMMUNICATION
                    ========================================== */}

                    <SectionHeader
                      icon={
                        <MessageSquare className="h-5 w-5" />
                      }
                      number="10"
                      title="Communication Plan"
                      description="Establish the planned communication approach for management, governance and the engagement team."
                    />

                    <div className="grid gap-6 md:grid-cols-2">

                      <TextAreaField
                        label="Communication Plan"
                        value={
                          strategy.communicationPlan
                        }
                        onChange={(value) =>
                          updateStrategy(
                            strategy.id,
                            "communicationPlan",
                            value
                          )
                        }
                        placeholder="Describe planned communication with management, those charged with governance and other stakeholders..."
                        disabled={saving}
                      />

                      <TextAreaField
                        label="Engagement Team Communication"
                        value={
                          strategy.engagementTeamCommunication
                        }
                        onChange={(value) =>
                          updateStrategy(
                            strategy.id,
                            "engagementTeamCommunication",
                            value
                          )
                        }
                        placeholder="Describe how the engagement team will communicate significant matters, risks and audit findings..."
                        disabled={saving}
                      />

                    </div>


                    {/* =========================================
                        11. INDEPENDENCE & TECHNOLOGY
                    ========================================== */}

                    <SectionHeader
                      icon={
                        <BriefcaseBusiness className="h-5 w-5" />
                      }
                      number="11"
                      title="Independence & Technology"
                      description="Document independence considerations, technology dependencies and the overall engagement risk."
                    />

                    <div className="grid gap-6 md:grid-cols-2">

                      <TextAreaField
                        label="Independence Considerations"
                        value={
                          strategy.independenceConsiderations
                        }
                        onChange={(value) =>
                          updateStrategy(
                            strategy.id,
                            "independenceConsiderations",
                            value
                          )
                        }
                        placeholder="Describe independence considerations, threats, safeguards and relevant ethical requirements..."
                        disabled={saving}
                      />

                      <TextAreaField
                        label="Technology Considerations"
                        value={
                          strategy.technologyConsiderations
                        }
                        onChange={(value) =>
                          updateStrategy(
                            strategy.id,
                            "technologyConsiderations",
                            value
                          )
                        }
                        placeholder="Describe audit technology, information systems, automated tools and IT considerations..."
                        disabled={saving}
                      />

                    </div>

                    <div className="mt-6 grid gap-6 md:grid-cols-2">

                      <SelectField
                        label="Overall Engagement Risk Level"
                        value={
                          strategy.riskLevel
                        }
                        onChange={(value) =>
                          updateStrategy(
                            strategy.id,
                            "riskLevel",
                            value
                          )
                        }
                        options={[
                          {
                            label: "Select Risk Level",
                            value: "",
                          },
                          {
                            label: "Low",
                            value: "Low",
                          },
                          {
                            label: "Moderate",
                            value: "Moderate",
                          },
                          {
                            label: "High",
                            value: "High",
                          },
                          {
                            label: "Significant",
                            value: "Significant",
                          },
                        ]}
                        required
                        disabled={saving}
                      />

                      <SelectField
                        label="Workpaper Status"
                        value={
                          strategy.status
                        }
                        onChange={(value) =>
                          updateStrategy(
                            strategy.id,
                            "status",
                            value
                          )
                        }
                        options={[
                          {
                            label: "Draft",
                            value: "Draft",
                          },
                          {
                            label: "In Progress",
                            value: "In Progress",
                          },
                          {
                            label: "Completed",
                            value: "Completed",
                          },
                          {
                            label: "Approved",
                            value: "Approved",
                          },
                        ]}
                        disabled={saving}
                      />

                    </div>


                    {/* =========================================
                        12. ADDITIONAL CONSIDERATIONS
                    ========================================== */}

                    <SectionHeader
                      icon={
                        <Building2 className="h-5 w-5" />
                      }
                      number="12"
                      title="Additional Considerations"
                      description="Document any other matters that may affect the audit strategy."
                    />

                    <TextAreaField
                      label="Additional Considerations"
                      value={
                        strategy.additionalConsiderations
                      }
                      onChange={(value) =>
                        updateStrategy(
                          strategy.id,
                          "additionalConsiderations",
                          value
                        )
                      }
                      placeholder="Document any other matters that may affect the audit strategy..."
                      disabled={saving}
                    />


                    {/* =========================================
                        13. AUDITOR CONCLUSION
                    ========================================== */}

                    <SectionHeader
                      icon={
                        <CheckCircle2 className="h-5 w-5" />
                      }
                      number="13"
                      title="Overall Auditor Conclusion"
                      description="Document the final conclusion regarding the overall audit strategy."
                    />

                    <TextAreaField
                      label="Auditor Conclusion"
                      value={
                        strategy.auditorConclusion
                      }
                      onChange={(value) =>
                        updateStrategy(
                          strategy.id,
                          "auditorConclusion",
                          value
                        )
                      }
                      placeholder="Document the auditor's overall conclusion regarding the planned audit strategy..."
                      required
                      disabled={saving}
                    />

                  </div>

                </div>

              )
            )}

          </div>


          {/* =================================================
              ADD STRATEGY
          ================================================= */}

          <div className="mt-6">

            <button
              type="button"
              onClick={addStrategy}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:border-amber-500 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
            >

              <Plus className="h-4 w-4" />

              Add Audit Strategy

            </button>

          </div>


          {/* =================================================
              SUMMARY
          ================================================= */}

          <div className="mt-8 grid gap-4 md:grid-cols-4">

            <SummaryCard
              icon={
                <FileText className="h-5 w-5" />
              }
              label="Workpaper"
              value="2.11"
              variant="amber"
            />

            <SummaryCard
              icon={
                <Target className="h-5 w-5" />
              }
              label="Strategies"
              value={String(
                strategies.length
              )}
              variant="blue"
            />

            <SummaryCard
              icon={
                <ShieldCheck className="h-5 w-5" />
              }
              label="Phase"
              value="Phase 2"
              variant="purple"
            />

            <SummaryCard
              icon={
                <CheckCircle2 className="h-5 w-5" />
              }
              label="Status"
              value={
                saved
                  ? "Completed"
                  : "Draft"
              }
              variant={
                saved
                  ? "green"
                  : "orange"
              }
            />

          </div>


          {/* =================================================
              FINAL ACTION
          ================================================= */}

          <div className="mt-8 flex flex-col gap-5 rounded-xl border border-amber-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">

            <div>

              <div className="flex items-center gap-2">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">

                  <CheckCircle2 className="h-5 w-5 text-amber-700" />

                </div>

                <p className="font-semibold text-gray-900">
                  Complete Phase 2
                </p>

              </div>

              <p className="mt-2 text-sm text-gray-500">
                Saving this final workpaper will
                complete Phase 2 and automatically
                open Phase 3.
              </p>

            </div>


            <div className="flex flex-col gap-3 sm:flex-row">

              <button
                type="button"
                onClick={handleBack}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >

                <ArrowLeft className="h-4 w-4" />

                Back

              </button>


              <button
                type="button"
                onClick={handleSave}
                disabled={saving || saved}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {saving ? (

                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />

                    Completing Phase 2...
                  </>

                ) : saved ? (

                  <>
                    <CheckCircle2 className="h-4 w-4" />

                    Completed
                  </>

                ) : (

                  <>
                    <Save className="h-4 w-4" />

                    Save Workpaper
                  </>

                )}

              </button>

            </div>

          </div>


          {/* =================================================
              COMPLETION MESSAGE
          ================================================= */}

          {saved && (

            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5">

              <div className="flex items-center gap-3">

                <CheckCircle2 className="h-6 w-6 text-emerald-600" />

                <div>

                  <p className="font-semibold text-emerald-900">
                    Phase 2 completed successfully.
                  </p>

                  <p className="text-sm text-emerald-700">
                    Your final Audit Strategy workpaper
                    has been completed. Opening Phase 3...
                  </p>

                </div>

              </div>

            </div>

          )}

        </main>

      </div>
    </AppLayout>
  );
}


/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({
  icon,
  number,
  title,
  description,
}: {
  icon: React.ReactNode;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 mt-8">

      <div className="flex items-start gap-3 border-b border-amber-200 pb-3">

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          {icon}
        </div>

        <div>

          <div className="flex items-center gap-2">

            <span className="text-sm font-bold text-amber-600">
              {number}.
            </span>

            <h3 className="font-semibold text-gray-900">
              {title}
            </h3>

          </div>

          <p className="mt-1 text-sm text-gray-500">
            {description}
          </p>

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   INPUT FIELD
========================================================= */

function InputField({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <input
        type="text"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
      />

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
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-medium text-gray-700">

        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}

      </label>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        rows={5}
        disabled={disabled}
        className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
      />

    </div>
  );
}


/* =========================================================
   SELECT FIELD
========================================================= */

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    label: string;
    value: string;
  }[];
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-medium text-gray-700">

        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}

      </label>

      <div className="relative">

        <select
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          disabled={disabled}
          className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-10 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
        >

          {options.map(
            (option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            )
          )}

        </select>

        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />

      </div>

    </div>
  );
}


/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  icon,
  label,
  value,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  variant:
    | "amber"
    | "blue"
    | "purple"
    | "green"
    | "orange";
}) {
  const styles = {
    amber: {
      container:
        "border-amber-200 bg-amber-50",
      icon:
        "bg-amber-100 text-amber-700",
      value:
        "text-amber-800",
    },

    blue: {
      container:
        "border-blue-200 bg-blue-50",
      icon:
        "bg-blue-100 text-blue-700",
      value:
        "text-blue-800",
    },

    purple: {
      container:
        "border-purple-200 bg-purple-50",
      icon:
        "bg-purple-100 text-purple-700",
      value:
        "text-purple-800",
    },

    green: {
      container:
        "border-emerald-200 bg-emerald-50",
      icon:
        "bg-emerald-100 text-emerald-700",
      value:
        "text-emerald-800",
    },

    orange: {
      container:
        "border-orange-200 bg-orange-50",
      icon:
        "bg-orange-100 text-orange-700",
      value:
        "text-orange-800",
    },
  };

  const style = styles[variant];

  return (
    <div
      className={`rounded-xl border p-5 shadow-sm ${style.container}`}
    >

      <div className="flex items-center gap-3">

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${style.icon}`}
        >
          {icon}
        </div>

        <div>

          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {label}
          </p>

          <p
            className={`mt-1 text-lg font-bold ${style.value}`}
          >
            {value}
          </p>

        </div>

      </div>

    </div>
  );
}