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
  Search,
  Database,
  ShieldCheck,
  ClipboardCheck,
  BarChart3,
  AlertTriangle,
  Target,
  Calculator,
} from "lucide-react";

type ProcedureType =
  | "Analytical Procedures"
  | "Key Item Testing"
  | "Sampling"
  | "Confirmation"
  | "Inventory Attendance"
  | "Legal Letter"
  | "Full Population Analytics"
  | "Detailed Testing"
  | "Other";

type ProcedureResult =
  | "Not Started"
  | "In Progress"
  | "Passed"
  | "Exception"
  | "Failed"
  | "Not Applicable";

type Assertion =
  | "Existence"
  | "Completeness"
  | "Accuracy"
  | "Cut-off"
  | "Classification"
  | "Valuation"
  | "Rights & Obligations"
  | "Presentation & Disclosure";

type SubstantiveProcedure = {
  id: number;

  reference: string;

  account: string;

  assertion: Assertion | "";

  risk: string;

  procedureType: ProcedureType | "";

  objective: string;

  population: string;

  populationSize: string;

  sampleSize: string;

  keyItems: string;

  analyticalProcedure: string;

  confirmationDetails: string;

  inventoryDetails: string;

  legalLetterDetails: string;

  evidenceObtained: string;

  result: ProcedureResult;

  exceptions: string;

  exceptionAmount: string;

  exceptionDetails: string;

  conclusion: string;
};

const createEmptyProcedure = (
  id: number
): SubstantiveProcedure => ({
  id,

  reference: "",

  account: "",

  assertion: "",

  risk: "",

  procedureType: "",

  objective: "",

  population: "",

  populationSize: "",

  sampleSize: "",

  keyItems: "",

  analyticalProcedure: "",

  confirmationDetails: "",

  inventoryDetails: "",

  legalLetterDetails: "",

  evidenceObtained: "",

  result: "Not Started",

  exceptions: "",

  exceptionAmount: "",

  exceptionDetails: "",

  conclusion: "",
});

export default function SubstantiveProceduresPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = params.id as string;

  const [procedures, setProcedures] = useState<
    SubstantiveProcedure[]
  >([createEmptyProcedure(1)]);

  const [saved, setSaved] = useState(false);

  const [saving, setSaving] = useState(false);

  const [continuing, setContinuing] = useState(false);

  const [errors, setErrors] = useState<string[]>([]);

  /*
   * ============================================================
   * UPDATE PROCEDURE
   * ============================================================
   */

  const updateProcedure = (
    id: number,
    field: keyof SubstantiveProcedure,
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

    if (errors.length > 0) {
      setErrors([]);
    }
  };

  /*
   * ============================================================
   * ADD PROCEDURE
   * ============================================================
   */

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

  /*
   * ============================================================
   * REMOVE PROCEDURE
   * ============================================================
   */

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

  /*
   * ============================================================
   * VALIDATION
   * ============================================================
   */

  const validateForm = (): boolean => {
    const validationErrors: string[] = [];

    if (procedures.length === 0) {
      validationErrors.push(
        "At least one substantive procedure is required."
      );
    }

    procedures.forEach((procedure, index) => {
      const row = index + 1;

      /*
       * Required identification fields
       */

      if (!procedure.reference.trim()) {
        validationErrors.push(
          `Procedure ${row}: Procedure Reference is required.`
        );
      }

      if (!procedure.account.trim()) {
        validationErrors.push(
          `Procedure ${row}: Account / Disclosure is required.`
        );
      }

      if (!procedure.assertion) {
        validationErrors.push(
          `Procedure ${row}: Assertion is required.`
        );
      }

      if (!procedure.procedureType) {
        validationErrors.push(
          `Procedure ${row}: Procedure Type is required.`
        );
      }

      if (!procedure.risk.trim()) {
        validationErrors.push(
          `Procedure ${row}: Risk Addressed is required.`
        );
      }

      /*
       * Audit objective
       */

      if (!procedure.objective.trim()) {
        validationErrors.push(
          `Procedure ${row}: Audit Objective is required.`
        );
      }

      /*
       * Sample size validation
       */

      if (procedure.sampleSize.trim()) {
        const sampleSize = Number(
          procedure.sampleSize
        );

        if (
          !Number.isFinite(sampleSize) ||
          sampleSize < 0
        ) {
          validationErrors.push(
            `Procedure ${row}: Sample Size must be a valid non-negative number.`
          );
        }
      }

      /*
       * Population size validation
       */

      if (procedure.populationSize.trim()) {
        const populationSize = Number(
          procedure.populationSize
        );

        if (
          !Number.isFinite(populationSize) ||
          populationSize < 0
        ) {
          validationErrors.push(
            `Procedure ${row}: Population Size must be a valid non-negative number.`
          );
        }
      }

      /*
       * Sample cannot exceed population
       */

      if (
        procedure.populationSize.trim() &&
        procedure.sampleSize.trim()
      ) {
        const populationSize = Number(
          procedure.populationSize
        );

        const sampleSize = Number(
          procedure.sampleSize
        );

        if (
          Number.isFinite(populationSize) &&
          Number.isFinite(sampleSize) &&
          populationSize > 0 &&
          sampleSize > populationSize
        ) {
          validationErrors.push(
            `Procedure ${row}: Sample Size cannot be greater than Population Size.`
          );
        }
      }

      /*
       * Audit evidence
       */

      if (!procedure.evidenceObtained.trim()) {
        validationErrors.push(
          `Procedure ${row}: Audit Evidence is required.`
        );
      }

      /*
       * Auditor conclusion
       */

      if (!procedure.conclusion.trim()) {
        validationErrors.push(
          `Procedure ${row}: Auditor Conclusion is required.`
        );
      }

      /*
       * Exception logic
       *
       * If the result is Exception or Failed, the user
       * should document what happened.
       */

      if (
        (procedure.result === "Exception" ||
          procedure.result === "Failed") &&
        !procedure.exceptions.trim()
      ) {
        validationErrors.push(
          `Procedure ${row}: Exceptions Identified is required when the result is ${procedure.result}.`
        );
      }
    });

    setErrors(validationErrors);

    return validationErrors.length === 0;
  };

  /*
   * ============================================================
   * SAVE WORKPAPER
   * ============================================================
   */

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
        section: "2.9",
        title: "Substantive Procedures",
        procedures,
        savedAt: new Date().toISOString(),
      };

      console.log(
        "2.9 Substantive Procedures:",
        workpaperData
      );

      /*
       * Temporary save simulation.
       *
       * Django/PostgreSQL API integration can be connected
       * here once the 2.9 backend model/API is created.
       */

      await new Promise((resolve) =>
        setTimeout(resolve, 400)
      );

      setSaved(true);

      return true;
    } catch (error) {
      console.error(
        "Failed to save 2.9 Substantive Procedures:",
        error
      );

      setSaved(false);

      setErrors([
        "The Substantive Procedures workpaper could not be saved. Please try again.",
      ]);

      return false;
    } finally {
      setSaving(false);
    }
  };

  /*
   * ============================================================
   * CONTINUE TO 2.10
   * ============================================================
   */

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
        `/engagements/${engagementId}/risk-assessment/2.10`
      );
    } finally {
      setContinuing(false);
    }
  };

  /*
   * ============================================================
   * SUMMARY CALCULATIONS
   * ============================================================
   */

  const totalProcedures = procedures.length;

  const completedProcedures = procedures.filter(
    (procedure) =>
      procedure.result === "Passed" ||
      procedure.result === "Exception" ||
      procedure.result === "Failed" ||
      procedure.result === "Not Applicable"
  ).length;

  const passedProcedures = procedures.filter(
    (procedure) =>
      procedure.result === "Passed"
  ).length;

  const exceptionProcedures = procedures.filter(
    (procedure) =>
      procedure.result === "Exception"
  ).length;

  const failedProcedures = procedures.filter(
    (procedure) =>
      procedure.result === "Failed"
  ).length;

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

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

              <span className="font-semibold text-amber-700">
                2.9
              </span>

            </div>

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-600 text-white shadow-sm ring-4 ring-amber-100">
                <ClipboardCheck className="h-6 w-6" />
              </div>

              <div>

                <h1 className="text-2xl font-bold text-gray-900">
                  Substantive Procedures
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  Plan and document substantive audit procedures
                  performed over accounts, balances and disclosures.
                </p>

              </div>

            </div>

          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/engagements/${engagementId}/risk-assessment`
              )
            }
            disabled={saving || continuing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />

            Back to Risk Assessment
          </button>

        </div>


        {/* =====================================================
            PURPOSE BANNER
        ====================================================== */}

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">

          <div className="flex items-start gap-3">

            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 ring-1 ring-amber-200">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>

              <h2 className="font-semibold text-amber-950">
                Purpose of this workpaper
              </h2>

              <p className="mt-1 text-sm leading-6 text-amber-900/80">
                Document the substantive procedures designed and
                performed to obtain sufficient appropriate audit
                evidence. Record the account or disclosure being
                tested, relevant assertion, risk addressed, testing
                approach, population, sample, evidence, exceptions
                and auditor conclusion.
              </p>

            </div>

          </div>

        </div>


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
            label="Passed"
            value={passedProcedures}
            icon={
              <ShieldCheck className="h-5 w-5" />
            }
            variant="emerald"
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
            label="Failed"
            value={failedProcedures}
            icon={
              <AlertTriangle className="h-5 w-5" />
            }
            variant="orange"
          />

        </div>


        {/* =====================================================
            VALIDATION ERRORS
        ====================================================== */}

        {errors.length > 0 && (

          <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">

            <div className="flex items-start gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <CircleAlert className="h-5 w-5" />
              </div>

              <div>

                <h3 className="font-semibold text-red-900">
                  Please complete the required fields
                </h3>

                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-800">

                  {errors.map((error, index) => (
                    <li key={index}>
                      {error}
                    </li>
                  ))}

                </ul>

              </div>

            </div>

          </div>

        )}


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

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600 text-sm font-bold text-white shadow-sm">
                      {index + 1}
                    </div>

                    <div>

                      <h2 className="font-semibold text-gray-900">
                        Substantive Procedure {index + 1}
                      </h2>

                      <p className="text-xs text-gray-600">
                        Account testing and audit evidence
                      </p>

                    </div>

                  </div>


                  {procedures.length > 1 && (

                    <button
                      type="button"
                      onClick={() =>
                        removeProcedure(
                          procedure.id
                        )
                      }
                      disabled={
                        saving || continuing
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                    description="Identify the account, assertion and risk addressed by the substantive procedure."
                  />

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                    <InputField
                      label="Procedure Reference"
                      required
                      placeholder="e.g. SUB-001"
                      value={procedure.reference}
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
                      label="Account / Disclosure"
                      required
                      placeholder="e.g. Revenue"
                      value={procedure.account}
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "account",
                          value
                        )
                      }
                      disabled={
                        saving || continuing
                      }
                    />

                    <SelectField
                      label="Assertion"
                      required
                      value={procedure.assertion}
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "assertion",
                          value
                        )
                      }
                      options={[
                        "Existence",
                        "Completeness",
                        "Accuracy",
                        "Cut-off",
                        "Classification",
                        "Valuation",
                        "Rights & Obligations",
                        "Presentation & Disclosure",
                      ]}
                      disabled={
                        saving || continuing
                      }
                    />

                    <SelectField
                      label="Procedure Type"
                      required
                      value={
                        procedure.procedureType
                      }
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "procedureType",
                          value
                        )
                      }
                      options={[
                        "Analytical Procedures",
                        "Key Item Testing",
                        "Sampling",
                        "Confirmation",
                        "Inventory Attendance",
                        "Legal Letter",
                        "Full Population Analytics",
                        "Detailed Testing",
                        "Other",
                      ]}
                      disabled={
                        saving || continuing
                      }
                    />

                    <TextAreaField
                      label="Risk Addressed"
                      required
                      placeholder="Describe the financial statement risk being addressed..."
                      value={procedure.risk}
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "risk",
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
                      <Target className="h-5 w-5" />
                    }
                    title="2. Audit Objective"
                    description="Define what the substantive procedure is designed to establish."
                  />

                  <TextAreaField
                    label="Audit Objective"
                    required
                    placeholder="Describe what the auditor intends to establish through this procedure..."
                    value={procedure.objective}
                    onChange={(value) =>
                      updateProcedure(
                        procedure.id,
                        "objective",
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
                      <Database className="h-5 w-5" />
                    }
                    title="3. Population & Sampling"
                    description="Document the population, sample and specific items selected for testing."
                  />

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

                    <InputField
                      label="Population Size"
                      placeholder="e.g. 10,000"
                      value={
                        procedure.populationSize
                      }
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "populationSize",
                          value
                        )
                      }
                      disabled={
                        saving || continuing
                      }
                    />

                    <InputField
                      label="Sample Size"
                      placeholder="e.g. 60"
                      value={
                        procedure.sampleSize
                      }
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "sampleSize",
                          value
                        )
                      }
                      disabled={
                        saving || continuing
                      }
                    />

                    <InputField
                      label="Population"
                      placeholder="e.g. All sales invoices"
                      value={
                        procedure.population
                      }
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "population",
                          value
                        )
                      }
                      disabled={
                        saving || continuing
                      }
                    />

                    <TextAreaField
                      label="Key Items / Specific Items Selected"
                      placeholder="Describe individually selected high-value or unusual items..."
                      value={procedure.keyItems}
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "keyItems",
                          value
                        )
                      }
                      className="md:col-span-3"
                      disabled={
                        saving || continuing
                      }
                    />

                  </div>


                  {/* =================================================
                      SECTION 4
                  ================================================== */}

                  <SectionHeader
                    icon={
                      <BarChart3 className="h-5 w-5" />
                    }
                    title="4. Analytical Procedures"
                    description="Document analytical procedures and expectations used as substantive evidence."
                  />

                  <TextAreaField
                    label="Analytical Procedures"
                    placeholder="Describe expectations, ratios, trends, comparisons, thresholds and investigation of significant differences..."
                    value={
                      procedure.analyticalProcedure
                    }
                    onChange={(value) =>
                      updateProcedure(
                        procedure.id,
                        "analyticalProcedure",
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
                      <Search className="h-5 w-5" />
                    }
                    title="5. Specialized Procedures"
                    description="Document confirmations, inventory attendance and legal letters where applicable."
                  />

                  <div className="space-y-5">

                    <TextAreaField
                      label="Confirmations"
                      placeholder="Document confirmation procedures, recipients, responses, exceptions and alternative procedures..."
                      value={
                        procedure.confirmationDetails
                      }
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "confirmationDetails",
                          value
                        )
                      }
                      disabled={
                        saving || continuing
                      }
                    />

                    <TextAreaField
                      label="Inventory Attendance"
                      placeholder="Document inventory count attendance, locations, test counts and observations..."
                      value={
                        procedure.inventoryDetails
                      }
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "inventoryDetails",
                          value
                        )
                      }
                      disabled={
                        saving || continuing
                      }
                    />

                    <TextAreaField
                      label="Legal Letters"
                      placeholder="Document legal confirmations, correspondence with legal counsel and matters identified..."
                      value={
                        procedure.legalLetterDetails
                      }
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "legalLetterDetails",
                          value
                        )
                      }
                      disabled={
                        saving || continuing
                      }
                    />

                  </div>


                  {/* =================================================
                      SECTION 6
                  ================================================== */}

                  <SectionHeader
                    icon={
                      <ClipboardCheck className="h-5 w-5" />
                    }
                    title="6. Audit Evidence & Results"
                    description="Record the evidence obtained and outcome of the substantive procedure."
                  />

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                    <TextAreaField
                      label="Audit Evidence"
                      required
                      placeholder="Describe the audit evidence obtained and where it is retained..."
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
                      label="Procedure Result"
                      value={procedure.result}
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "result",
                          value
                        )
                      }
                      options={[
                        "Not Started",
                        "In Progress",
                        "Passed",
                        "Exception",
                        "Failed",
                        "Not Applicable",
                      ]}
                      disabled={
                        saving || continuing
                      }
                    />

                    <InputField
                      label="Exception Amount"
                      placeholder="e.g. TZS 15,000,000"
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
                      placeholder="Describe exceptions, errors or differences identified..."
                      value={procedure.exceptions}
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "exceptions",
                          value
                        )
                      }
                      className="md:col-span-2"
                      disabled={
                        saving || continuing
                      }
                    />

                    <TextAreaField
                      label="Exception Details / Evaluation"
                      placeholder="Evaluate the nature, cause and significance of identified exceptions..."
                      value={
                        procedure.exceptionDetails
                      }
                      onChange={(value) =>
                        updateProcedure(
                          procedure.id,
                          "exceptionDetails",
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
                      SECTION 7
                  ================================================== */}

                  <SectionHeader
                    icon={
                      <Calculator className="h-5 w-5" />
                    }
                    title="7. Auditor Conclusion"
                    description="Document the conclusion reached based on the substantive procedures performed."
                  />

                  <TextAreaField
                    label="Auditor Conclusion"
                    required
                    placeholder="State whether the procedure achieved its objective and whether additional audit work is required..."
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


                  {/* =================================================
                      PROCEDURE STATUS
                  ================================================== */}

                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">

                    <div className="flex items-start gap-3">

                      <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                        <Target className="h-5 w-5" />
                      </div>

                      <div>

                        <h4 className="font-semibold text-amber-950">
                          Procedure Status
                        </h4>

                        <p className="mt-1 text-sm text-amber-900/80">
                          Current result:{" "}
                          <span className="font-semibold text-amber-950">
                            {procedure.result}
                          </span>
                        </p>

                        {procedure.assertion && (
                          <p className="mt-1 text-sm text-amber-900/80">
                            Assertion:{" "}
                            <span className="font-semibold text-amber-950">
                              {procedure.assertion}
                            </span>
                          </p>
                        )}

                        {procedure.procedureType && (
                          <p className="mt-1 text-sm text-amber-900/80">
                            Procedure type:{" "}
                            <span className="font-semibold text-amber-950">
                              {procedure.procedureType}
                            </span>
                          </p>
                        )}

                      </div>

                    </div>

                  </div>

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
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 px-4 py-4 text-sm font-semibold text-amber-800 transition hover:border-amber-500 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-5 w-5" />

          Add Another Substantive Procedure
        </button>


        {/* =====================================================
            BOTTOM ACTIONS
        ====================================================== */}

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            {/* SAVE STATUS */}

            <div className="flex items-center gap-2">

              {saved ? (

                <>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>

                  <span className="text-sm font-medium text-green-700">
                    Workpaper saved successfully
                  </span>
                </>

              ) : (

                <>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                    <CircleAlert className="h-5 w-5 text-gray-400" />
                  </div>

                  <span className="text-sm text-gray-500">
                    Complete the substantive procedures and
                    save the workpaper.
                  </span>
                </>

              )}

            </div>


            {/* BUTTONS */}

            <div className="flex flex-col gap-3 sm:flex-row">

              {/* BACK */}

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/engagements/${engagementId}/risk-assessment`
                  )
                }
                disabled={
                  saving || continuing
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />

                Back
              </button>


              {/* SAVE */}

              <button
                type="button"
                onClick={handleSave}
                disabled={
                  saving || continuing
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
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
                onClick={handleContinue}
                disabled={
                  saving || continuing
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {continuing ? (

                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />

                    Saving...
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


          {/* NAVIGATION HINT */}

          <div className="mt-4 flex justify-end border-t border-gray-100 pt-4">

            <p className="text-xs text-gray-500">
              Save this workpaper before continuing to Section 2.10.
            </p>

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
    | "emerald"
    | "red"
    | "orange";
}) {
  const styles = {
    amber: {
      wrapper:
        "border-amber-200 bg-amber-50",
      icon:
        "bg-amber-100 text-amber-700",
      value:
        "text-amber-950",
    },

    green: {
      wrapper:
        "border-green-200 bg-green-50",
      icon:
        "bg-green-100 text-green-700",
      value:
        "text-green-900",
    },

    emerald: {
      wrapper:
        "border-emerald-200 bg-emerald-50",
      icon:
        "bg-emerald-100 text-emerald-700",
      value:
        "text-emerald-900",
    },

    red: {
      wrapper:
        "border-red-200 bg-red-50",
      icon:
        "bg-red-100 text-red-600",
      value:
        "text-red-900",
    },

    orange: {
      wrapper:
        "border-orange-200 bg-orange-50",
      icon:
        "bg-orange-100 text-orange-700",
      value:
        "text-orange-900",
    },
  };

  const current = styles[variant];

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${current.wrapper}`}
    >

      <div className="flex items-center justify-between">

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${current.icon}`}
        >
          {icon}
        </div>

        <span
          className={`text-2xl font-bold ${current.value}`}
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

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 ring-1 ring-amber-200">
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
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-gray-100"
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
        className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-gray-100"
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
          className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-10 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:bg-gray-100"
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

        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600" />

      </div>

    </div>
  );
}