"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "../../../../../components/layout/AppLayout";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  CircleAlert,
  ChevronDown,
  FileText,
  Scale,
  Building2,
  Users,
  CalendarCheck,
  ShieldCheck,
  ClipboardCheck,
  AlertTriangle,
  MessageSquare,
  Calculator,
  Search,
  BriefcaseBusiness,
} from "lucide-react";

type ProcedureStatus =
  | "Not Started"
  | "In Progress"
  | "Completed"
  | "Exception"
  | "Not Applicable";

type YesNo = "Yes" | "No";

type GeneralAuditProcedure = {
  id: number;

  reference: string;

  procedureArea: string;

  objective: string;

  legalMatters: string;

  minutesReviewed: string;

  goingConcern: string;

  relatedParties: string;

  subsequentEvents: string;

  writtenRepresentations: string;

  tcwgCommunication: string;

  uncorrectedMisstatements: string;

  otherProcedures: string;

  evidenceObtained: string;

  status: ProcedureStatus;

  exceptionsIdentified: string;

  exceptionAmount: string;

  followUpRequired: YesNo | "";

  followUpAction: string;

  conclusion: string;
};

const createEmptyProcedure = (
  id: number
): GeneralAuditProcedure => ({
  id,

  reference: "",

  procedureArea: "",

  objective: "",

  legalMatters: "",

  minutesReviewed: "",

  goingConcern: "",

  relatedParties: "",

  subsequentEvents: "",

  writtenRepresentations: "",

  tcwgCommunication: "",

  uncorrectedMisstatements: "",

  otherProcedures: "",

  evidenceObtained: "",

  status: "Not Started",

  exceptionsIdentified: "",

  exceptionAmount: "",

  followUpRequired: "",

  followUpAction: "",

  conclusion: "",
});

export default function GeneralAuditProceduresPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = params.id as string;

  const [procedures, setProcedures] = useState<
    GeneralAuditProcedure[]
  >([createEmptyProcedure(1)]);

  const [saved, setSaved] = useState(false);

  const [saving, setSaving] = useState(false);

  const [continuing, setContinuing] = useState(false);

  const [errors, setErrors] = useState<string[]>([]);

  const updateProcedure = (
    id: number,
    field: keyof GeneralAuditProcedure,
    value: string
  ) => {
    setProcedures((current) =>
      current.map((procedure) =>
        procedure.id === id
          ? {
              ...procedure,
              [field]: value,
            }
          : procedure
      )
    );

    setSaved(false);
    setErrors([]);
  };

  const addProcedure = () => {
    const nextId =
      procedures.length > 0
        ? Math.max(
            ...procedures.map(
              (procedure) => procedure.id
            )
          ) + 1
        : 1;

    setProcedures((current) => [
      ...current,
      createEmptyProcedure(nextId),
    ]);

    setSaved(false);
    setErrors([]);
  };

  const removeProcedure = (id: number) => {
    if (procedures.length === 1) {
      return;
    }

    setProcedures((current) =>
      current.filter(
        (procedure) => procedure.id !== id
      )
    );

    setSaved(false);
    setErrors([]);
  };

  const validateForm = (): boolean => {
    const validationErrors: string[] = [];

    procedures.forEach((procedure, index) => {
      const procedureNumber = index + 1;

      if (!procedure.reference.trim()) {
        validationErrors.push(
          `Procedure ${procedureNumber}: Procedure Reference is required.`
        );
      }

      if (!procedure.procedureArea.trim()) {
        validationErrors.push(
          `Procedure ${procedureNumber}: Procedure Area is required.`
        );
      }

      if (!procedure.objective.trim()) {
        validationErrors.push(
          `Procedure ${procedureNumber}: Audit Objective is required.`
        );
      }

      if (!procedure.evidenceObtained.trim()) {
        validationErrors.push(
          `Procedure ${procedureNumber}: Evidence Obtained is required.`
        );
      }

      if (!procedure.followUpRequired) {
        validationErrors.push(
          `Procedure ${procedureNumber}: Follow-Up Required must be selected.`
        );
      }

      if (
        procedure.followUpRequired === "Yes" &&
        !procedure.followUpAction.trim()
      ) {
        validationErrors.push(
          `Procedure ${procedureNumber}: Follow-Up Action is required when Follow-Up Required is Yes.`
        );
      }

      if (!procedure.conclusion.trim()) {
        validationErrors.push(
          `Procedure ${procedureNumber}: Auditor Conclusion is required.`
        );
      }

      if (
        procedure.status === "Exception" &&
        !procedure.exceptionsIdentified.trim()
      ) {
        validationErrors.push(
          `Procedure ${procedureNumber}: Exceptions Identified is required when Procedure Status is Exception.`
        );
      }

      if (procedure.exceptionAmount.trim()) {
        const cleanedAmount =
          procedure.exceptionAmount
            .replace(/TZS/gi, "")
            .replace(/,/g, "")
            .trim();

        const numericAmount =
          Number(cleanedAmount);

        if (
          Number.isNaN(numericAmount) ||
          numericAmount < 0
        ) {
          validationErrors.push(
            `Procedure ${procedureNumber}: Exception Amount must contain a valid non-negative amount.`
          );
        }
      }
    });

    setErrors(validationErrors);

    return validationErrors.length === 0;
  };

  const handleSave = async (): Promise<boolean> => {
    if (saving || continuing) {
      return false;
    }

    const isValid = validateForm();

    if (!isValid) {
      setSaved(false);
      return false;
    }

    setSaving(true);

    try {
      const workpaperData = {
        engagementId,
        phase: "Phase 2",
        section: "2.10",
        title: "General Audit Procedures",
        procedures,
        savedAt: new Date().toISOString(),
      };

      console.log(
        "2.10 General Audit Procedures:",
        workpaperData
      );

      /*
       * Temporary frontend save.
       *
       * This will later be replaced with a Django API request
       * when the Phase 2.10 backend model is implemented.
       */
      await new Promise((resolve) =>
        setTimeout(resolve, 400)
      );

      setSaved(true);

      return true;
    } catch (error) {
      console.error(
        "Failed to save 2.10 General Audit Procedures:",
        error
      );

      setSaved(false);

      setErrors([
        "The workpaper could not be saved. Please try again.",
      ]);

      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (saving || continuing) {
      return;
    }

    setContinuing(true);

    try {
      const didSave = await handleSave();

      if (!didSave) {
        return;
      }

      router.push(
        `/engagements/${engagementId}/risk-assessment/2.11`
      );
    } finally {
      setContinuing(false);
    }
  };

  const totalProcedures = procedures.length;

  const completedProcedures = procedures.filter(
    (procedure) =>
      procedure.status === "Completed" ||
      procedure.status === "Exception" ||
      procedure.status === "Not Applicable"
  ).length;

  const exceptionProcedures = procedures.filter(
    (procedure) =>
      procedure.status === "Exception"
  ).length;

  const followUpProcedures = procedures.filter(
    (procedure) =>
      procedure.followUpRequired === "Yes"
  ).length;

  const notStartedProcedures = procedures.filter(
    (procedure) =>
      procedure.status === "Not Started"
  ).length;

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">

              <span>Phase 2</span>

              <span>/</span>

              <span>Risk Assessment</span>

              <span>/</span>

              <span className="font-medium text-amber-700">
                2.10
              </span>

            </div>

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-600 text-white">
                <BriefcaseBusiness className="h-6 w-6" />
              </div>

              <div>

                <h1 className="text-2xl font-bold text-gray-900">
                  General Audit Procedures
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  Document general audit procedures, legal matters,
                  going concern, related parties, subsequent events
                  and other completion procedures.
                </p>

              </div>

            </div>

          </div>

          <button
            type="button"
            disabled={saving || continuing}
            onClick={() =>
              router.push(
                `/engagements/${engagementId}/risk-assessment`
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowLeft className="h-4 w-4" />

            Back to Risk Assessment
          </button>

        </div>


        {/* =====================================================
            INFORMATION BANNER
        ====================================================== */}

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">

          <div className="flex items-start gap-3">

            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
              <ShieldCheck className="h-5 w-5 text-amber-700" />
            </div>

            <div>

              <h2 className="font-semibold text-gray-900">
                Purpose of this workpaper
              </h2>

              <p className="mt-1 text-sm leading-6 text-gray-600">
                Document general audit procedures performed outside
                the detailed risk-specific testing. These procedures
                include consideration of legal matters, board and
                committee minutes, going concern, related parties,
                subsequent events, written representations,
                communication with those charged with governance,
                uncorrected misstatements and other relevant matters.
              </p>

            </div>

          </div>

        </div>


        {/* =====================================================
            VALIDATION ERRORS
        ====================================================== */}

        {errors.length > 0 && (

          <div className="rounded-xl border border-red-200 bg-red-50 p-5">

            <div className="flex items-start gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100">
                <CircleAlert className="h-5 w-5 text-red-600" />
              </div>

              <div className="min-w-0">

                <h2 className="font-semibold text-red-800">
                  Please complete the required information
                </h2>

                <ul className="mt-2 space-y-1 text-sm text-red-700">

                  {errors.map((error, index) => (
                    <li key={index}>
                      • {error}
                    </li>
                  ))}

                </ul>

              </div>

            </div>

          </div>

        )}


        {/* =====================================================
            SUMMARY CARDS
        ====================================================== */}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">

          <SummaryCard
            label="Total Procedures"
            value={totalProcedures}
            icon={
              <ClipboardCheck className="h-5 w-5" />
            }
            variant="amber"
          />

          <SummaryCard
            label="Completed"
            value={completedProcedures}
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
            variant="green"
          />

          <SummaryCard
            label="Exceptions"
            value={exceptionProcedures}
            icon={
              <CircleAlert className="h-5 w-5" />
            }
            variant="red"
          />

          <SummaryCard
            label="Follow-Up"
            value={followUpProcedures}
            icon={
              <Search className="h-5 w-5" />
            }
            variant="blue"
          />

          <SummaryCard
            label="Not Started"
            value={notStartedProcedures}
            icon={
              <CircleAlert className="h-5 w-5" />
            }
            variant="orange"
          />

        </div>


        {/* =====================================================
            PROCEDURES
        ====================================================== */}

        <div className="space-y-6">

          {procedures.map(
            (procedure, index) => (

              <div
                key={procedure.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
              >

                {/* =================================================
                    PROCEDURE HEADER
                ================================================== */}

                <div className="flex flex-col gap-3 border-b border-amber-200 bg-amber-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-700 text-sm font-bold text-white">
                      {index + 1}
                    </div>

                    <div>

                      <h2 className="font-semibold text-gray-900">
                        General Audit Procedure {index + 1}
                      </h2>

                      <p className="text-xs text-gray-500">
                        General audit and completion procedures
                      </p>

                    </div>

                  </div>


                  {procedures.length > 1 && (

                    <button
                      type="button"
                      disabled={saving || continuing}
                      onClick={() =>
                        removeProcedure(
                          procedure.id
                        )
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />

                      Remove
                    </button>

                  )}

                </div>


                <div className="space-y-8 p-6">


                  {/* =================================================
                      SECTION 1
                  ================================================== */}

                  <SectionHeader
                    icon={
                      <FileText className="h-5 w-5" />
                    }
                    title="1. Procedure Identification"
                    description="Identify the general audit procedure and define its objective."
                  />

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                    <InputField
                      label="Procedure Reference"
                      required
                      placeholder="e.g. GAP-001"
                      value={
                        procedure.reference
                      }
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "reference",
                          value
                        )
                      }
                      disabled={
                        saving || continuing
                      }
                    />

                    <InputField
                      label="Procedure Area"
                      required
                      placeholder="e.g. Going Concern"
                      value={
                        procedure.procedureArea
                      }
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "procedureArea",
                          value
                        )
                      }
                      disabled={
                        saving || continuing
                      }
                    />

                    <TextAreaField
                      label="Audit Objective"
                      required
                      placeholder="Describe the objective of this general audit procedure..."
                      value={
                        procedure.objective
                      }
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "objective",
                          value
                        )
                      }
                      className="md:col-span-2"
                      disabled={
                        saving || continuing
                      }
                    />

                  </div>


                  {/* =================================================
                      SECTION 2
                  ================================================== */}

                  <SectionHeader
                    icon={
                      <Scale className="h-5 w-5" />
                    }
                    title="2. Legal & Regulatory Matters"
                    description="Document legal matters, claims, litigation and regulatory issues relevant to the audit."
                  />

                  <TextAreaField
                    label="Legal Matters"
                    placeholder="Document legal matters, claims, litigation, disputes, regulatory investigations and correspondence reviewed..."
                    value={
                      procedure.legalMatters
                    }
                    onChange={(value) =>
                      updateProcedure(
                        procedure.id,
                        "legalMatters",
                        value
                      )
                    }
                    disabled={
                      saving || continuing
                    }
                  />


                  {/* =================================================
                      SECTION 3
                  ================================================== */}

                  <SectionHeader
                    icon={
                      <Building2 className="h-5 w-5" />
                    }
                    title="3. Minutes & Governance"
                    description="Review minutes and governance records for matters affecting the financial statements or audit."
                  />

                  <TextAreaField
                    label="Minutes Reviewed"
                    placeholder="Document board, audit committee, shareholder and management meeting minutes reviewed and significant matters identified..."
                    value={
                      procedure.minutesReviewed
                    }
                    onChange={(value) =>
                      updateProcedure(
                        procedure.id,
                        "minutesReviewed",
                        value
                      )
                    }
                    disabled={
                      saving || continuing
                    }
                  />


                  {/* =================================================
                      SECTION 4
                  ================================================== */}

                  <SectionHeader
                    icon={
                      <AlertTriangle className="h-5 w-5" />
                    }
                    title="4. Going Concern"
                    description="Document procedures and conclusions regarding the entity's ability to continue as a going concern."
                  />

                  <TextAreaField
                    label="Going Concern Assessment"
                    placeholder="Document indicators considered, management's assessment, forecasts, financing arrangements, covenant compliance and auditor conclusion..."
                    value={
                      procedure.goingConcern
                    }
                    onChange={(value) =>
                      updateProcedure(
                        procedure.id,
                        "goingConcern",
                        value
                      )
                    }
                    disabled={
                      saving || continuing
                    }
                  />


                  {/* =================================================
                      SECTION 5
                  ================================================== */}

                  <SectionHeader
                    icon={
                      <Users className="h-5 w-5" />
                    }
                    title="5. Related Parties"
                    description="Document procedures performed to identify, understand and evaluate related-party relationships and transactions."
                  />

                  <TextAreaField
                    label="Related Parties Procedures"
                    placeholder="Document related-party listings, inquiries, transactions identified, approvals, balances and disclosure considerations..."
                    value={
                      procedure.relatedParties
                    }
                    onChange={(value) =>
                      updateProcedure(
                        procedure.id,
                        "relatedParties",
                        value
                      )
                    }
                    disabled={
                      saving || continuing
                    }
                  />


                  {/* =================================================
                      SECTION 6
                  ================================================== */}

                  <SectionHeader
                    icon={
                      <CalendarCheck className="h-5 w-5" />
                    }
                    title="6. Subsequent Events"
                    description="Document procedures performed to identify events occurring between the reporting date and the auditor's report date."
                  />

                  <TextAreaField
                    label="Subsequent Events Procedures"
                    placeholder="Document inquiries, minutes reviewed, interim financial information, transactions and other subsequent events identified..."
                    value={
                      procedure.subsequentEvents
                    }
                    onChange={(value) =>
                      updateProcedure(
                        procedure.id,
                        "subsequentEvents",
                        value
                      )
                    }
                    disabled={
                      saving || continuing
                    }
                  />


                  {/* =================================================
                      SECTION 7
                  ================================================== */}

                  <SectionHeader
                    icon={
                      <FileText className="h-5 w-5" />
                    }
                    title="7. Written Representations"
                    description="Document the written representations requested and obtained from management."
                  />

                  <TextAreaField
                    label="Written Representations"
                    placeholder="Document representation letter requirements, date obtained, significant representations and any exceptions..."
                    value={
                      procedure.writtenRepresentations
                    }
                    onChange={(value) =>
                      updateProcedure(
                        procedure.id,
                        "writtenRepresentations",
                        value
                      )
                    }
                    disabled={
                      saving || continuing
                    }
                  />


                  {/* =================================================
                      SECTION 8
                  ================================================== */}

                  <SectionHeader
                    icon={
                      <MessageSquare className="h-5 w-5" />
                    }
                    title="8. Communication With Those Charged With Governance"
                    description="Document significant matters communicated to those charged with governance."
                  />

                  <TextAreaField
                    label="Communication With TCWG"
                    placeholder="Document significant audit findings, control deficiencies, independence matters, uncorrected misstatements and other matters communicated..."
                    value={
                      procedure.tcwgCommunication
                    }
                    onChange={(value) =>
                      updateProcedure(
                        procedure.id,
                        "tcwgCommunication",
                        value
                      )
                    }
                    disabled={
                      saving || continuing
                    }
                  />


                  {/* =================================================
                      SECTION 9
                  ================================================== */}

                  <SectionHeader
                    icon={
                      <Calculator className="h-5 w-5" />
                    }
                    title="9. Uncorrected Misstatements"
                    description="Document identified misstatements that remain uncorrected and their evaluation."
                  />

                  <TextAreaField
                    label="Uncorrected Misstatements"
                    placeholder="Document uncorrected misstatements, amounts, nature, management response and evaluation of materiality..."
                    value={
                      procedure.uncorrectedMisstatements
                    }
                    onChange={(value) =>
                      updateProcedure(
                        procedure.id,
                        "uncorrectedMisstatements",
                        value
                      )
                    }
                    disabled={
                      saving || continuing
                    }
                  />


                  {/* =================================================
                      SECTION 10
                  ================================================== */}

                  <SectionHeader
                    icon={
                      <Search className="h-5 w-5" />
                    }
                    title="10. Other General Procedures"
                    description="Document any additional procedures considered necessary to complete the audit."
                  />

                  <TextAreaField
                    label="Other Procedures"
                    placeholder="Document other procedures such as analytical review, final financial statement review, disclosures review, group matters, expert matters or other completion procedures..."
                    value={
                      procedure.otherProcedures
                    }
                    onChange={(value) =>
                      updateProcedure(
                        procedure.id,
                        "otherProcedures",
                        value
                      )
                    }
                    disabled={
                      saving || continuing
                    }
                  />


                  {/* =================================================
                      SECTION 11
                  ================================================== */}

                  <SectionHeader
                    icon={
                      <ClipboardCheck className="h-5 w-5" />
                    }
                    title="11. Evidence & Procedure Status"
                    description="Record evidence obtained and the current status of the procedure."
                  />

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                    <TextAreaField
                      label="Evidence Obtained"
                      required
                      placeholder="Describe documents, correspondence, minutes, confirmations, calculations and other evidence obtained..."
                      value={
                        procedure.evidenceObtained
                      }
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "evidenceObtained",
                          value
                        )
                      }
                      className="md:col-span-2"
                      disabled={
                        saving || continuing
                      }
                    />

                    <SelectField
                      label="Procedure Status"
                      value={
                        procedure.status
                      }
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "status",
                          value
                        )
                      }
                      options={[
                        "Not Started",
                        "In Progress",
                        "Completed",
                        "Exception",
                        "Not Applicable",
                      ]}
                      disabled={
                        saving || continuing
                      }
                    />

                    <InputField
                      label="Exception Amount"
                      placeholder="e.g. TZS 10,000,000"
                      value={
                        procedure.exceptionAmount
                      }
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "exceptionAmount",
                          value
                        )
                      }
                      disabled={
                        saving || continuing
                      }
                    />

                    <TextAreaField
                      label="Exceptions Identified"
                      placeholder="Describe exceptions, unresolved matters, errors or other issues identified..."
                      value={
                        procedure.exceptionsIdentified
                      }
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "exceptionsIdentified",
                          value
                        )
                      }
                      className="md:col-span-2"
                      disabled={
                        saving || continuing
                      }
                    />

                  </div>


                  {/* =================================================
                      SECTION 12
                  ================================================== */}

                  <SectionHeader
                    icon={
                      <Search className="h-5 w-5" />
                    }
                    title="12. Follow-Up"
                    description="Determine whether additional procedures or management follow-up are required."
                  />

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                    <SelectField
                      label="Follow-Up Required"
                      required
                      value={
                        procedure.followUpRequired
                      }
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "followUpRequired",
                          value
                        )
                      }
                      options={[
                        "Yes",
                        "No",
                      ]}
                      disabled={
                        saving || continuing
                      }
                    />

                    <TextAreaField
                      label="Follow-Up Action"
                      placeholder="Describe additional procedures, management actions, escalation or other follow-up required..."
                      value={
                        procedure.followUpAction
                      }
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "followUpAction",
                          value
                        )
                      }
                      disabled={
                        saving || continuing
                      }
                    />

                  </div>


                  {/* =================================================
                      SECTION 13
                  ================================================== */}

                  <SectionHeader
                    icon={
                      <CheckCircle2 className="h-5 w-5" />
                    }
                    title="13. Auditor Conclusion"
                    description="Document the final conclusion reached from the general audit procedures."
                  />

                  <TextAreaField
                    label="Auditor Conclusion"
                    required
                    placeholder="Provide the overall conclusion, including whether the procedure achieved its objective and whether additional audit work is required..."
                    value={
                      procedure.conclusion
                    }
                    onChange={(value) =>
                      updateProcedure(
                        procedure.id,
                        "conclusion",
                        value
                      )
                    }
                    disabled={
                      saving || continuing
                    }
                  />

                </div>

              </div>

            )
          )}

        </div>


        {/* =====================================================
            ADD PROCEDURE
        ====================================================== */}

        <button
          type="button"
          onClick={addProcedure}
          disabled={saving || continuing}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-300 bg-white px-4 py-4 text-sm font-semibold text-amber-700 transition hover:border-amber-500 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-5 w-5" />

          Add Another General Audit Procedure
        </button>


        {/* =====================================================
            PROCEDURE STATUS CARD
        ====================================================== */}

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">

          <div className="flex items-start gap-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
              <ClipboardCheck className="h-5 w-5 text-amber-700" />
            </div>

            <div>

              <h3 className="font-semibold text-gray-900">
                Workpaper Status
              </h3>

              <p className="mt-1 text-sm text-gray-600">
                {completedProcedures === totalProcedures
                  ? "All general audit procedures have a completed status."
                  : `${notStartedProcedures} procedure(s) are still not started.`}
              </p>

            </div>

          </div>

        </div>


        {/* =====================================================
            BOTTOM ACTIONS
        ====================================================== */}

        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-2">

            {saved ? (

              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />

                <span className="text-sm font-medium text-emerald-700">
                  Workpaper saved successfully
                </span>
              </>

            ) : (

              <>
                <CircleAlert className="h-5 w-5 text-gray-400" />

                <span className="text-sm text-gray-500">
                  Complete the procedures and save the workpaper.
                </span>
              </>

            )}

          </div>


          <div className="flex flex-col gap-3 sm:flex-row">

            {/* BACK */}

            <button
              type="button"
              disabled={saving || continuing}
              onClick={() =>
                router.push(
                  `/engagements/${engagementId}/risk-assessment`
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowLeft className="h-4 w-4" />

              Back
            </button>


            {/* SAVE */}

            <button
              type="button"
              disabled={saving || continuing}
              onClick={handleSave}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >

              {saving ? (

                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />

                  Saving...
                </>

              ) : (

                <>
                  <Save className="h-4 w-4" />

                  Save Workpaper
                </>

              )}

            </button>


            {/* CONTINUE */}

            <button
              type="button"
              disabled={saving || continuing}
              onClick={handleContinue}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >

              {continuing ? (

                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />

                  Saving & Continuing...
                </>

              ) : (

                <>
                  Continue

                  <ArrowRight className="h-4 w-4" />
                </>

              )}

            </button>

          </div>

        </div>

      </div>
    </AppLayout>
  );
}


/* =============================================================
   SUMMARY CARD
============================================================= */

function SummaryCard({
  label,
  value,
  icon,
  variant = "amber",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant?:
    | "amber"
    | "green"
    | "red"
    | "blue"
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

    green: {
      container:
        "border-emerald-200 bg-emerald-50",
      icon:
        "bg-emerald-100 text-emerald-700",
      value:
        "text-emerald-800",
    },

    red: {
      container:
        "border-red-200 bg-red-50",
      icon:
        "bg-red-100 text-red-700",
      value:
        "text-red-800",
    },

    blue: {
      container:
        "border-blue-200 bg-blue-50",
      icon:
        "bg-blue-100 text-blue-700",
      value:
        "text-blue-800",
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
      className={`rounded-xl border p-4 shadow-sm ${style.container}`}
    >

      <div className="flex items-center justify-between">

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${style.icon}`}
        >
          {icon}
        </div>

        <span
          className={`text-2xl font-bold ${style.value}`}
        >
          {value}
        </span>

      </div>

      <p className="mt-3 text-xs font-medium text-gray-600">
        {label}
      </p>

    </div>
  );
}


/* =============================================================
   SECTION HEADER
============================================================= */

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-amber-200 pb-4">

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
        {icon}
      </div>

      <div>

        <h3 className="font-semibold text-gray-900">
          {title}
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          {description}
        </p>

      </div>

    </div>
  );
}


/* =============================================================
   INPUT FIELD
============================================================= */

function InputField({
  label,
  required = false,
  placeholder,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
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


/* =============================================================
   TEXTAREA FIELD
============================================================= */

function TextAreaField({
  label,
  required = false,
  placeholder,
  value,
  onChange,
  className = "",
  disabled = false,
}: {
  label: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={className}>

      <label className="mb-2 block text-sm font-medium text-gray-700">

        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}

      </label>

      <textarea
        rows={4}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        disabled={disabled}
        className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
      />

    </div>
  );
}


/* =============================================================
   SELECT FIELD
============================================================= */

function SelectField({
  label,
  required = false,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: string[];
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

          <option value="">
            Select...
          </option>

          {options.map((option) => (

            <option
              key={option}
              value={option}
            >
              {option}
            </option>

          ))}

        </select>

        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

      </div>

    </div>
  );
}