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
  AlertTriangle,
  Target,
  UserCheck,
  Scale,
} from "lucide-react";

type RiskLevel =
  | "Low"
  | "Moderate"
  | "High"
  | "Significant";

type YesNo = "Yes" | "No";

type OverrideResult =
  | "Not Started"
  | "In Progress"
  | "No Exception"
  | "Exception"
  | "Potential Fraud"
  | "Not Applicable";

type ManagementOverrideTest = {
  id: number;
  testReference: string;
  journalEntryPopulation: string;
  dataSource: string;
  selectionCriteria: string;
  periodCovered: string;
  populationSize: string;
  sampleSize: string;
  unusualTransactions: string;
  managementEstimates: string;
  biasIndicators: string;
  overrideRisk: RiskLevel | "";
  fraudIndicators: YesNo | "";
  testingProcedures: string;
  evidenceObtained: string;
  result: OverrideResult;
  findings: string;
  exceptionAmount: string;
  evaluation: string;
  followUpRequired: YesNo | "";
  followUpAction: string;
  auditorConclusion: string;
};

const createEmptyTest = (
  id: number
): ManagementOverrideTest => ({
  id,
  testReference: "",
  journalEntryPopulation: "",
  dataSource: "",
  selectionCriteria: "",
  periodCovered: "",
  populationSize: "",
  sampleSize: "",
  unusualTransactions: "",
  managementEstimates: "",
  biasIndicators: "",
  overrideRisk: "",
  fraudIndicators: "",
  testingProcedures: "",
  evidenceObtained: "",
  result: "Not Started",
  findings: "",
  exceptionAmount: "",
  evaluation: "",
  followUpRequired: "",
  followUpAction: "",
  auditorConclusion: "",
});

export default function ManagementOverridePage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = params.id as string;

  const [tests, setTests] = useState<
    ManagementOverrideTest[]
  >([createEmptyTest(1)]);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  /*
   * Update test
   */
  const updateTest = (
    id: number,
    field: keyof ManagementOverrideTest,
    value: string
  ) => {
    setTests((current) =>
      current.map((test) =>
        test.id === id
          ? {
              ...test,
              [field]: value,
            }
          : test
      )
    );

    setSaved(false);

    if (errors.length > 0) {
      setErrors([]);
    }
  };

  /*
   * Add another test
   */
  const addTest = () => {
    const nextId =
      tests.length > 0
        ? Math.max(...tests.map((test) => test.id)) + 1
        : 1;

    setTests((current) => [
      ...current,
      createEmptyTest(nextId),
    ]);

    setSaved(false);
    setErrors([]);
  };

  /*
   * Remove test
   */
  const removeTest = (id: number) => {
    if (tests.length === 1) {
      return;
    }

    setTests((current) =>
      current.filter((test) => test.id !== id)
    );

    setSaved(false);
    setErrors([]);
  };

  /*
   * Validate workpaper
   */
  const validateForm = (): boolean => {
    const validationErrors: string[] = [];

    if (tests.length === 0) {
      validationErrors.push(
        "At least one management override test is required."
      );
    }

    tests.forEach((test, index) => {
      const row = index + 1;

      if (!test.testReference.trim()) {
        validationErrors.push(
          `Test ${row}: Test Reference is required.`
        );
      }

      if (!test.periodCovered.trim()) {
        validationErrors.push(
          `Test ${row}: Period Covered is required.`
        );
      }

      if (!test.journalEntryPopulation.trim()) {
        validationErrors.push(
          `Test ${row}: Journal Entry Population is required.`
        );
      }

      if (!test.dataSource.trim()) {
        validationErrors.push(
          `Test ${row}: Data Source is required.`
        );
      }

      if (!test.sampleSize.trim()) {
        validationErrors.push(
          `Test ${row}: Sample Size is required.`
        );
      } else {
        const sampleSize = Number(test.sampleSize);

        if (
          !Number.isFinite(sampleSize) ||
          sampleSize <= 0
        ) {
          validationErrors.push(
            `Test ${row}: Sample Size must be greater than zero.`
          );
        }
      }

      if (
        test.populationSize.trim() &&
        test.sampleSize.trim()
      ) {
        const populationSize = Number(
          test.populationSize
        );

        const sampleSize = Number(test.sampleSize);

        if (
          Number.isFinite(populationSize) &&
          Number.isFinite(sampleSize) &&
          populationSize > 0 &&
          sampleSize > populationSize
        ) {
          validationErrors.push(
            `Test ${row}: Sample Size cannot be greater than Population Size.`
          );
        }
      }

      if (!test.selectionCriteria.trim()) {
        validationErrors.push(
          `Test ${row}: Selection Criteria is required.`
        );
      }

      if (!test.overrideRisk) {
        validationErrors.push(
          `Test ${row}: Management Override Risk is required.`
        );
      }

      if (!test.fraudIndicators) {
        validationErrors.push(
          `Test ${row}: Fraud Indicators Identified is required.`
        );
      }

      if (!test.testingProcedures.trim()) {
        validationErrors.push(
          `Test ${row}: Journal Entry Testing Procedures are required.`
        );
      }

      if (!test.evidenceObtained.trim()) {
        validationErrors.push(
          `Test ${row}: Evidence Obtained is required.`
        );
      }

      if (!test.followUpRequired) {
        validationErrors.push(
          `Test ${row}: Follow-Up Required is required.`
        );
      }

      if (!test.auditorConclusion.trim()) {
        validationErrors.push(
          `Test ${row}: Auditor Conclusion is required.`
        );
      }

      if (
        test.followUpRequired === "Yes" &&
        !test.followUpAction.trim()
      ) {
        validationErrors.push(
          `Test ${row}: Follow-Up Action is required when Follow-Up Required is Yes.`
        );
      }
    });

    setErrors(validationErrors);

    return validationErrors.length === 0;
  };

  /*
   * Save workpaper
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
        section: "2.8",
        title: "Management Override",
        tests,
        savedAt: new Date().toISOString(),
      };

      console.log(
        "2.8 Management Override:",
        workpaperData
      );

      /*
       * Temporary frontend save simulation.
       * Django/PostgreSQL connection can be added here.
       */
      await new Promise((resolve) =>
        setTimeout(resolve, 400)
      );

      setSaved(true);

      return true;
    } catch (error) {
      console.error(
        "Failed to save 2.8 Management Override:",
        error
      );

      setSaved(false);

      setErrors([
        "The Management Override workpaper could not be saved. Please try again.",
      ]);

      return false;
    } finally {
      setSaving(false);
    }
  };

  /*
   * Continue to 2.9
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
        `/engagements/${engagementId}/risk-assessment/2.9`
      );
    } finally {
      setContinuing(false);
    }
  };

  /*
   * Summary calculations
   */
  const totalTests = tests.length;

  const completedTests = tests.filter(
    (test) =>
      test.result === "No Exception" ||
      test.result === "Exception" ||
      test.result === "Potential Fraud" ||
      test.result === "Not Applicable"
  ).length;

  const exceptionTests = tests.filter(
    (test) => test.result === "Exception"
  ).length;

  const potentialFraudTests = tests.filter(
    (test) =>
      test.result === "Potential Fraud" ||
      test.fraudIndicators === "Yes"
  ).length;

  const highRiskTests = tests.filter(
    (test) =>
      test.overrideRisk === "High" ||
      test.overrideRisk === "Significant"
  ).length;

  const followUpTests = tests.filter(
    (test) => test.followUpRequired === "Yes"
  ).length;

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6">

        {/* =====================================================
            HEADER
        ===================================================== */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <span>Phase 2</span>
              <span>/</span>
              <span>Risk Assessment</span>
              <span>/</span>

              <span className="font-semibold text-amber-700">
                2.8
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                <UserCheck className="h-6 w-6" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Management Override
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  Journal entry testing, management estimates,
                  unusual transactions and override risk assessment.
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
        ===================================================== */}
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
                Document the auditor&apos;s procedures for addressing
                the risk of management override of controls. Record
                the journal entry population, selection methodology,
                unusual transactions, management estimates, indicators
                of bias or fraud, evidence obtained, exceptions and
                the final conclusion.
              </p>
            </div>
          </div>
        </div>

        {/* =====================================================
            SUMMARY CARDS
        ===================================================== */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          <SummaryCard
            label="Total Tests"
            value={totalTests}
            icon={
              <ClipboardCheck className="h-5 w-5" />
            }
          />

          <SummaryCard
            label="Completed"
            value={completedTests}
            icon={
              <CheckCircle2 className="h-5 w-5" />
            }
          />

          <SummaryCard
            label="Exceptions"
            value={exceptionTests}
            icon={
              <CircleAlert className="h-5 w-5" />
            }
            variant="red"
          />

          <SummaryCard
            label="Potential Fraud"
            value={potentialFraudTests}
            icon={
              <AlertTriangle className="h-5 w-5" />
            }
            variant="orange"
          />

          <SummaryCard
            label="High Risk"
            value={highRiskTests}
            icon={
              <Target className="h-5 w-5" />
            }
            variant="amber"
          />

          <SummaryCard
            label="Follow-Up"
            value={followUpTests}
            icon={
              <Search className="h-5 w-5" />
            }
            variant="blue"
          />
        </div>

        {/* =====================================================
            VALIDATION ERRORS
        ===================================================== */}
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
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            TESTS
        ===================================================== */}
        <div className="space-y-6">
          {tests.map((test, index) => (
            <div
              key={test.id}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >

              {/* TEST HEADER */}
              <div className="flex flex-col gap-3 border-b border-amber-200 bg-amber-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600 text-sm font-bold text-white shadow-sm">
                    {index + 1}
                  </div>

                  <div>
                    <h2 className="font-semibold text-gray-900">
                      Management Override Test {index + 1}
                    </h2>

                    <p className="text-xs text-gray-600">
                      Journal entries, estimates and unusual
                      transactions
                    </p>
                  </div>
                </div>

                {tests.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTest(test.id)}
                    disabled={saving || continuing}
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
                ================================================= */}
                <SectionHeader
                  icon={<FileText className="h-5 w-5" />}
                  title="1. Test Identification"
                  description="Identify the management override test and period under review."
                />

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <InputField
                    label="Test Reference"
                    required
                    placeholder="e.g. MO-001"
                    value={test.testReference}
                    onChange={(value) =>
                      updateTest(
                        test.id,
                        "testReference",
                        value
                      )
                    }
                    disabled={saving || continuing}
                  />

                  <InputField
                    label="Period Covered"
                    required
                    placeholder="e.g. 01 Jan 2026 - 31 Dec 2026"
                    value={test.periodCovered}
                    onChange={(value) =>
                      updateTest(
                        test.id,
                        "periodCovered",
                        value
                      )
                    }
                    disabled={saving || continuing}
                  />

                  <TextAreaField
                    label="Journal Entry Population"
                    required
                    placeholder="Describe the journal entry population being tested..."
                    value={test.journalEntryPopulation}
                    onChange={(value) =>
                      updateTest(
                        test.id,
                        "journalEntryPopulation",
                        value
                      )
                    }
                    className="md:col-span-2"
                    disabled={saving || continuing}
                  />

                  <InputField
                    label="Data Source"
                    required
                    placeholder="e.g. ERP general ledger / SAP / Oracle"
                    value={test.dataSource}
                    onChange={(value) =>
                      updateTest(
                        test.id,
                        "dataSource",
                        value
                      )
                    }
                    disabled={saving || continuing}
                  />

                  <InputField
                    label="Population Size"
                    placeholder="e.g. 12,500"
                    value={test.populationSize}
                    onChange={(value) =>
                      updateTest(
                        test.id,
                        "populationSize",
                        value
                      )
                    }
                    disabled={saving || continuing}
                  />

                  <InputField
                    label="Sample Size"
                    required
                    placeholder="e.g. 60"
                    value={test.sampleSize}
                    onChange={(value) =>
                      updateTest(
                        test.id,
                        "sampleSize",
                        value
                      )
                    }
                    disabled={saving || continuing}
                  />

                  <TextAreaField
                    label="Selection Criteria"
                    required
                    placeholder="Describe how journal entries or transactions were selected..."
                    value={test.selectionCriteria}
                    onChange={(value) =>
                      updateTest(
                        test.id,
                        "selectionCriteria",
                        value
                      )
                    }
                    className="md:col-span-2"
                    disabled={saving || continuing}
                  />
                </div>

                {/* =================================================
                    SECTION 2
                ================================================= */}
                <SectionHeader
                  icon={<Database className="h-5 w-5" />}
                  title="2. Journal Entry & Transaction Risk"
                  description="Document unusual or higher-risk transactions identified during the assessment."
                />

                <div className="space-y-5">
                  <TextAreaField
                    label="Unusual / Non-Routine Transactions"
                    placeholder="Describe unusual, complex, non-routine or year-end transactions..."
                    value={test.unusualTransactions}
                    onChange={(value) =>
                      updateTest(
                        test.id,
                        "unusualTransactions",
                        value
                      )
                    }
                    disabled={saving || continuing}
                  />

                  <TextAreaField
                    label="Management Estimates"
                    placeholder="Describe significant estimates, assumptions or adjustments that may be susceptible to management bias..."
                    value={test.managementEstimates}
                    onChange={(value) =>
                      updateTest(
                        test.id,
                        "managementEstimates",
                        value
                      )
                    }
                    disabled={saving || continuing}
                  />

                  <TextAreaField
                    label="Management Bias Indicators"
                    placeholder="Document indicators such as aggressive assumptions, unexpected adjustments, unusual trends or pressure to achieve targets..."
                    value={test.biasIndicators}
                    onChange={(value) =>
                      updateTest(
                        test.id,
                        "biasIndicators",
                        value
                      )
                    }
                    disabled={saving || continuing}
                  />
                </div>

                {/* =================================================
                    SECTION 3
                ================================================= */}
                <SectionHeader
                  icon={<Scale className="h-5 w-5" />}
                  title="3. Override & Fraud Risk Assessment"
                  description="Evaluate the risk that management may override established controls."
                />

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <SelectField
                    label="Management Override Risk"
                    required
                    value={test.overrideRisk}
                    onChange={(value) =>
                      updateTest(
                        test.id,
                        "overrideRisk",
                        value
                      )
                    }
                    options={[
                      "Low",
                      "Moderate",
                      "High",
                      "Significant",
                    ]}
                    disabled={saving || continuing}
                  />

                  <SelectField
                    label="Fraud Indicators Identified"
                    required
                    value={test.fraudIndicators}
                    onChange={(value) =>
                      updateTest(
                        test.id,
                        "fraudIndicators",
                        value
                      )
                    }
                    options={["Yes", "No"]}
                    disabled={saving || continuing}
                  />

                  <SelectField
                    label="Test Result"
                    value={test.result}
                    onChange={(value) =>
                      updateTest(
                        test.id,
                        "result",
                        value
                      )
                    }
                    options={[
                      "Not Started",
                      "In Progress",
                      "No Exception",
                      "Exception",
                      "Potential Fraud",
                      "Not Applicable",
                    ]}
                    disabled={saving || continuing}
                  />
                </div>

                {/* =================================================
                    SECTION 4
                ================================================= */}
                <SectionHeader
                  icon={
                    <ClipboardCheck className="h-5 w-5" />
                  }
                  title="4. Audit Procedures"
                  description="Document the procedures performed to address management override risk."
                />

                <div className="space-y-5">
                  <TextAreaField
                    label="Journal Entry Testing Procedures"
                    required
                    placeholder="Describe the procedures performed, including selection criteria, testing approach and evaluation..."
                    value={test.testingProcedures}
                    onChange={(value) =>
                      updateTest(
                        test.id,
                        "testingProcedures",
                        value
                      )
                    }
                    disabled={saving || continuing}
                  />

                  <TextAreaField
                    label="Evidence Obtained"
                    required
                    placeholder="Describe supporting documentation, reports, journal entry listings, approvals and other evidence obtained..."
                    value={test.evidenceObtained}
                    onChange={(value) =>
                      updateTest(
                        test.id,
                        "evidenceObtained",
                        value
                      )
                    }
                    disabled={saving || continuing}
                  />
                </div>

                {/* =================================================
                    SECTION 5
                ================================================= */}
                <SectionHeader
                  icon={
                    <AlertTriangle className="h-5 w-5" />
                  }
                  title="5. Findings & Exceptions"
                  description="Record exceptions, potential fraud indicators and their evaluation."
                />

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <TextAreaField
                    label="Findings / Exceptions"
                    placeholder="Describe any exceptions, unusual entries or findings..."
                    value={test.findings}
                    onChange={(value) =>
                      updateTest(
                        test.id,
                        "findings",
                        value
                      )
                    }
                    disabled={saving || continuing}
                  />

                  <InputField
                    label="Exception Amount"
                    placeholder="e.g. TZS 25,000,000"
                    value={test.exceptionAmount}
                    onChange={(value) =>
                      updateTest(
                        test.id,
                        "exceptionAmount",
                        value
                      )
                    }
                    disabled={saving || continuing}
                  />

                  <TextAreaField
                    label="Evaluation of Findings"
                    placeholder="Evaluate the nature, cause and significance of the findings..."
                    value={test.evaluation}
                    onChange={(value) =>
                      updateTest(
                        test.id,
                        "evaluation",
                        value
                      )
                    }
                    className="md:col-span-2"
                    disabled={saving || continuing}
                  />
                </div>

                {/* =================================================
                    SECTION 6
                ================================================= */}
                <SectionHeader
                  icon={<Search className="h-5 w-5" />}
                  title="6. Follow-Up & Conclusion"
                  description="Determine whether additional audit procedures or follow-up actions are required."
                />

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <SelectField
                    label="Follow-Up Required"
                    required
                    value={test.followUpRequired}
                    onChange={(value) =>
                      updateTest(
                        test.id,
                        "followUpRequired",
                        value
                      )
                    }
                    options={["Yes", "No"]}
                    disabled={saving || continuing}
                  />

                  <TextAreaField
                    label="Follow-Up Action"
                    placeholder="Describe additional procedures, escalation, expanded testing or other required action..."
                    value={test.followUpAction}
                    onChange={(value) =>
                      updateTest(
                        test.id,
                        "followUpAction",
                        value
                      )
                    }
                    disabled={saving || continuing}
                  />

                  <TextAreaField
                    label="Auditor Conclusion"
                    required
                    placeholder="Provide the overall conclusion on management override risk and the results of procedures performed..."
                    value={test.auditorConclusion}
                    onChange={(value) =>
                      updateTest(
                        test.id,
                        "auditorConclusion",
                        value
                      )
                    }
                    className="md:col-span-2"
                    disabled={saving || continuing}
                  />
                </div>

                {/* =================================================
                    TEST STATUS
                ================================================= */}
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                      <Target className="h-5 w-5" />
                    </div>

                    <div>
                      <h4 className="font-semibold text-amber-950">
                        Test Status
                      </h4>

                      <p className="mt-1 text-sm text-amber-900/80">
                        Current result:{" "}
                        <span className="font-semibold text-amber-950">
                          {test.result}
                        </span>
                      </p>

                      {test.overrideRisk && (
                        <p className="mt-1 text-sm text-amber-900/80">
                          Override risk:{" "}
                          <span className="font-semibold text-amber-950">
                            {test.overrideRisk}
                          </span>
                        </p>
                      )}

                      {test.fraudIndicators && (
                        <p className="mt-1 text-sm text-amber-900/80">
                          Fraud indicators:{" "}
                          <span className="font-semibold text-amber-950">
                            {test.fraudIndicators}
                          </span>
                        </p>
                      )}

                      {test.followUpRequired && (
                        <p className="mt-1 text-sm text-amber-900/80">
                          Follow-up required:{" "}
                          <span className="font-semibold text-amber-950">
                            {test.followUpRequired}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* =====================================================
            ADD TEST
        ===================================================== */}
        <button
          type="button"
          onClick={addTest}
          disabled={saving || continuing}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 px-4 py-4 text-sm font-semibold text-amber-800 transition hover:border-amber-500 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-5 w-5" />
          Add Another Management Override Test
        </button>

        {/* =====================================================
            BOTTOM ACTIONS
        ===================================================== */}
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
                    Remember to save your workpaper after completing
                    the tests.
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
                disabled={saving || continuing}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              {/* SAVE */}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || continuing}
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
                onClick={handleContinue}
                disabled={saving || continuing}
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
              Save this workpaper before continuing to Section 2.9.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  label,
  value,
  icon,
  variant = "amber",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant?: "amber" | "red" | "orange" | "blue";
}) {
  const styles = {
    amber: {
      wrapper: "bg-amber-50 border-amber-200",
      icon: "bg-amber-100 text-amber-700",
      value: "text-amber-950",
    },

    red: {
      wrapper: "bg-red-50 border-red-200",
      icon: "bg-red-100 text-red-600",
      value: "text-red-900",
    },

    orange: {
      wrapper: "bg-orange-50 border-orange-200",
      icon: "bg-orange-100 text-orange-700",
      value: "text-orange-900",
    },

    blue: {
      wrapper: "bg-blue-50 border-blue-200",
      icon: "bg-blue-100 text-blue-700",
      value: "text-blue-900",
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

/* =========================================================
   SECTION HEADER
========================================================= */

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

/* =========================================================
   INPUT FIELD
========================================================= */

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
          <span className="ml-1 text-red-500">*</span>
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

/* =========================================================
   TEXTAREA FIELD
========================================================= */

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
          <span className="ml-1 text-red-500">*</span>
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

/* =========================================================
   SELECT FIELD
========================================================= */

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
          <span className="ml-1 text-red-500">*</span>
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
          <option value="">Select...</option>

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