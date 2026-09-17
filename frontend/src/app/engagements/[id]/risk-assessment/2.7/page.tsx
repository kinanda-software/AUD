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
  ClipboardCheck,
  ShieldCheck,
  FileText,
  Target,
  BarChart3,
  AlertTriangle,
  Calculator,
} from "lucide-react";

type TestResult =
  | "Not Started"
  | "In Progress"
  | "Passed"
  | "Exception"
  | "Failed"
  | "Not Applicable";

type RelianceDecision =
  | "Rely"
  | "Partially Rely"
  | "Do Not Rely"
  | "To Be Determined";

type Assertion =
  | "Existence"
  | "Completeness"
  | "Accuracy"
  | "Cut-off"
  | "Classification"
  | "Valuation"
  | "Rights & Obligations"
  | "Presentation & Disclosure";

type ControlTest = {
  id: number;
  testReference: string;
  controlId: string;
  controlDescription: string;
  assertion: Assertion | "";
  testingPeriod: string;
  population: string;
  populationSize: string;
  sampleSize: string;
  testingProcedure: string;
  evidenceObtained: string;
  result: TestResult;
  deviations: string;
  deviationRate: string;
  projectedImpact: string;
  relianceDecision: RelianceDecision | "";
  conclusion: string;
};

const assertions: Assertion[] = [
  "Existence",
  "Completeness",
  "Accuracy",
  "Cut-off",
  "Classification",
  "Valuation",
  "Rights & Obligations",
  "Presentation & Disclosure",
];

const results: TestResult[] = [
  "Not Started",
  "In Progress",
  "Passed",
  "Exception",
  "Failed",
  "Not Applicable",
];

const relianceDecisions: RelianceDecision[] = [
  "Rely",
  "Partially Rely",
  "Do Not Rely",
  "To Be Determined",
];

const createEmptyTest = (id: number): ControlTest => ({
  id,
  testReference: "",
  controlId: "",
  controlDescription: "",
  assertion: "",
  testingPeriod: "",
  population: "",
  populationSize: "",
  sampleSize: "",
  testingProcedure: "",
  evidenceObtained: "",
  result: "Not Started",
  deviations: "0",
  deviationRate: "",
  projectedImpact: "",
  relianceDecision: "",
  conclusion: "",
});

export default function TestsOfControlsPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = params.id as string;

  const [tests, setTests] = useState<ControlTest[]>([
    createEmptyTest(1),
  ]);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const updateTest = (
    id: number,
    field: keyof ControlTest,
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

  const addTest = () => {
    const newId =
      tests.length > 0
        ? Math.max(...tests.map((test) => test.id)) + 1
        : 1;

    setTests((current) => [
      ...current,
      createEmptyTest(newId),
    ]);

    setSaved(false);
    setErrors([]);
  };

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
   * Deviation Rate
   *
   * Standard calculation:
   *
   * Deviation Rate =
   * Deviations / Sample Size × 100
   */
  const calculateDeviationRate = (
    test: ControlTest
  ): string => {
    const sampleSize = Number(test.sampleSize);
    const deviations = Number(test.deviations);

    if (!Number.isFinite(sampleSize) || sampleSize <= 0) {
      return "";
    }

    if (!Number.isFinite(deviations) || deviations < 0) {
      return "";
    }

    if (deviations > sampleSize) {
      return "";
    }

    return ((deviations / sampleSize) * 100).toFixed(2);
  };

  const handleCalculateDeviation = (id: number) => {
    setTests((current) =>
      current.map((test) => {
        if (test.id !== id) {
          return test;
        }

        return {
          ...test,
          deviationRate: calculateDeviationRate(test),
        };
      })
    );

    setSaved(false);
  };

  const validateForm = (): boolean => {
    const validationErrors: string[] = [];

    if (tests.length === 0) {
      validationErrors.push(
        "At least one control test is required."
      );
    }

    tests.forEach((test, index) => {
      const row = index + 1;

      if (!test.testReference.trim()) {
        validationErrors.push(
          `Test ${row}: Test Reference is required.`
        );
      }

      if (!test.controlId.trim()) {
        validationErrors.push(
          `Test ${row}: Control ID is required.`
        );
      }

      if (!test.controlDescription.trim()) {
        validationErrors.push(
          `Test ${row}: Control Description is required.`
        );
      }

      if (!test.assertion) {
        validationErrors.push(
          `Test ${row}: Relevant Assertion is required.`
        );
      }

      if (!test.testingPeriod.trim()) {
        validationErrors.push(
          `Test ${row}: Testing Period is required.`
        );
      }

      if (!test.population.trim()) {
        validationErrors.push(
          `Test ${row}: Population is required.`
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

      if (test.populationSize.trim()) {
        const populationSize = Number(
          test.populationSize
        );

        if (
          !Number.isFinite(populationSize) ||
          populationSize < 0
        ) {
          validationErrors.push(
            `Test ${row}: Population Size must be zero or greater.`
          );
        }
      }

      if (test.populationSize.trim() && test.sampleSize.trim()) {
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

      if (!test.testingProcedure.trim()) {
        validationErrors.push(
          `Test ${row}: Testing Procedure is required.`
        );
      }

      if (!test.evidenceObtained.trim()) {
        validationErrors.push(
          `Test ${row}: Evidence Obtained is required.`
        );
      }

      if (test.deviations.trim()) {
        const deviations = Number(test.deviations);
        const sampleSize = Number(test.sampleSize);

        if (
          !Number.isFinite(deviations) ||
          deviations < 0
        ) {
          validationErrors.push(
            `Test ${row}: Deviations must be zero or greater.`
          );
        }

        if (
          Number.isFinite(deviations) &&
          Number.isFinite(sampleSize) &&
          sampleSize > 0 &&
          deviations > sampleSize
        ) {
          validationErrors.push(
            `Test ${row}: Deviations cannot be greater than Sample Size.`
          );
        }
      }

      if (!test.result) {
        validationErrors.push(
          `Test ${row}: Test Result is required.`
        );
      }

      if (!test.relianceDecision) {
        validationErrors.push(
          `Test ${row}: Reliance Decision is required.`
        );
      }

      if (!test.conclusion.trim()) {
        validationErrors.push(
          `Test ${row}: Auditor Conclusion is required.`
        );
      }
    });

    setErrors(validationErrors);

    return validationErrors.length === 0;
  };

  /*
   * Save Workpaper
   *
   * Currently this preserves the existing frontend behavior.
   * Once the 2.7 Django model/API is implemented, this function
   * can be changed to POST/PATCH the data to PostgreSQL.
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
        section: "2.7",
        title: "Tests of Controls",
        tests,
        savedAt: new Date().toISOString(),
      };

      console.log(
        "2.7 Tests of Controls:",
        workpaperData
      );

      /*
       * Simulate the save operation so the UI has a proper
       * saving state. Replace this block with the Django API
       * request when the 2.7 backend endpoint is connected.
       */
      await new Promise((resolve) =>
        setTimeout(resolve, 400)
      );

      setSaved(true);

      return true;
    } catch (error) {
      console.error(
        "Failed to save 2.7 Tests of Controls:",
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

  /*
   * Continue to Phase 2.8
   *
   * Important:
   * Save first.
   * Navigate only when save succeeds.
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
        `/engagements/${engagementId}/risk-assessment/2.8`
      );
    } finally {
      setContinuing(false);
    }
  };

  const totalTests = tests.length;

  const passedTests = tests.filter(
    (test) => test.result === "Passed"
  ).length;

  const exceptionTests = tests.filter(
    (test) => test.result === "Exception"
  ).length;

  const failedTests = tests.filter(
    (test) => test.result === "Failed"
  ).length;

  const relianceCount = tests.filter(
    (test) =>
      test.relianceDecision === "Rely" ||
      test.relianceDecision === "Partially Rely"
  ).length;

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-6">
          <button
            onClick={() =>
              router.push(
                `/engagements/${engagementId}/risk-assessment`
              )
            }
            disabled={saving || continuing}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft size={18} />
            Back to Risk Assessment
          </button>

          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <ClipboardCheck size={23} />
                </div>

                <div>
                  <p className="text-sm font-medium text-blue-600">
                    Phase 2 • Section 2.7
                  </p>

                  <h1 className="text-2xl font-bold text-gray-900">
                    Tests of Controls
                  </h1>
                </div>
              </div>

              <p className="max-w-3xl text-sm leading-6 text-gray-600">
                Document the auditor&apos;s testing of controls,
                including the population, sample, procedures,
                evidence, deviations, reliance decision, and final
                conclusion.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Engagement
              </p>

              <p className="mt-1 text-lg font-semibold text-gray-900">
                #{engagementId}
              </p>
            </div>
          </div>
        </div>

        {/* Information Banner */}
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-blue-600">
              <ShieldCheck size={21} />
            </div>

            <div>
              <h2 className="font-semibold text-blue-900">
                Purpose of this workpaper
              </h2>

              <p className="mt-1 text-sm leading-6 text-blue-800">
                This workpaper documents whether the selected controls
                operated effectively during the period under audit and
                whether the auditor can rely on those controls when
                designing the remaining audit procedures.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {/* Total Tests */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Total Tests
                </p>

                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {totalTests}
                </p>
              </div>

              <div className="rounded-lg bg-gray-100 p-3 text-gray-700">
                <BarChart3 size={21} />
              </div>
            </div>
          </div>

          {/* Passed */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Passed
                </p>

                <p className="mt-1 text-2xl font-bold text-green-600">
                  {passedTests}
                </p>
              </div>

              <div className="rounded-lg bg-green-50 p-3 text-green-600">
                <CheckCircle2 size={21} />
              </div>
            </div>
          </div>

          {/* Exceptions */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Exceptions
                </p>

                <p className="mt-1 text-2xl font-bold text-orange-600">
                  {exceptionTests}
                </p>
              </div>

              <div className="rounded-lg bg-orange-50 p-3 text-orange-600">
                <CircleAlert size={21} />
              </div>
            </div>
          </div>

          {/* Failed */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Failed
                </p>

                <p className="mt-1 text-2xl font-bold text-red-600">
                  {failedTests}
                </p>
              </div>

              <div className="rounded-lg bg-red-50 p-3 text-red-600">
                <AlertTriangle size={21} />
              </div>
            </div>
          </div>

          {/* Reliance */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Reliance Planned
                </p>

                <p className="mt-1 text-2xl font-bold text-blue-600">
                  {relianceCount}
                </p>
              </div>

              <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
                <Target size={21} />
              </div>
            </div>
          </div>
        </div>

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <CircleAlert
                size={21}
                className="mt-0.5 shrink-0 text-red-600"
              />

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

        {/* Tests */}
        <div className="space-y-6">
          {tests.map((test, index) => (
            <div
              key={test.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              {/* Test Header */}
              <div className="flex flex-col justify-between gap-3 border-b border-gray-200 bg-gray-50 px-6 py-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                    {index + 1}
                  </div>

                  <div>
                    <h2 className="font-semibold text-gray-900">
                      Control Test {index + 1}
                    </h2>

                    <p className="text-xs text-gray-500">
                      Test operating effectiveness of a selected
                      control
                    </p>
                  </div>
                </div>

                {tests.length > 1 && (
                  <button
                    onClick={() => removeTest(test.id)}
                    disabled={saving || continuing}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                )}
              </div>

              <div className="space-y-7 p-6">
                {/* Section 1 */}
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <FileText
                      size={18}
                      className="text-blue-600"
                    />

                    <h3 className="font-semibold text-gray-900">
                      Control Identification
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {/* Test Reference */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Test Reference{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <input
                        type="text"
                        value={test.testReference}
                        onChange={(e) =>
                          updateTest(
                            test.id,
                            "testReference",
                            e.target.value
                          )
                        }
                        placeholder="e.g. TOC-001"
                        disabled={saving || continuing}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                      />
                    </div>

                    {/* Control ID */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Control ID{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <input
                        type="text"
                        value={test.controlId}
                        onChange={(e) =>
                          updateTest(
                            test.id,
                            "controlId",
                            e.target.value
                          )
                        }
                        placeholder="e.g. REV-C-001"
                        disabled={saving || continuing}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                      />
                    </div>

                    {/* Testing Period */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Testing Period{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <input
                        type="text"
                        value={test.testingPeriod}
                        onChange={(e) =>
                          updateTest(
                            test.id,
                            "testingPeriod",
                            e.target.value
                          )
                        }
                        placeholder="e.g. Jan 2026 - Dec 2026"
                        disabled={saving || continuing}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                      />
                    </div>

                    {/* Assertion */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Relevant Assertion{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <select
                          value={test.assertion}
                          onChange={(e) =>
                            updateTest(
                              test.id,
                              "assertion",
                              e.target.value
                            )
                          }
                          disabled={saving || continuing}
                          className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                        >
                          <option value="">
                            Select assertion
                          </option>

                          {assertions.map((assertion) => (
                            <option
                              key={assertion}
                              value={assertion}
                            >
                              {assertion}
                            </option>
                          ))}
                        </select>

                        <ChevronDown
                          size={17}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                      </div>
                    </div>

                    {/* Control Description */}
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Control Description{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <textarea
                        value={test.controlDescription}
                        onChange={(e) =>
                          updateTest(
                            test.id,
                            "controlDescription",
                            e.target.value
                          )
                        }
                        rows={3}
                        placeholder="Describe the control being tested and how it is expected to operate."
                        disabled={saving || continuing}
                        className="w-full resize-y rounded-lg border border-gray-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                      />
                    </div>
                  </div>
                </section>

                {/* Section 2 */}
                <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <BarChart3
                      size={18}
                      className="text-purple-600"
                    />

                    <h3 className="font-semibold text-gray-900">
                      Population & Sampling
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                    {/* Population */}
                    <div className="lg:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Population{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <input
                        type="text"
                        value={test.population}
                        onChange={(e) =>
                          updateTest(
                            test.id,
                            "population",
                            e.target.value
                          )
                        }
                        placeholder="Describe the population tested"
                        disabled={saving || continuing}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                      />
                    </div>

                    {/* Population Size */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Population Size
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={test.populationSize}
                        onChange={(e) =>
                          updateTest(
                            test.id,
                            "populationSize",
                            e.target.value
                          )
                        }
                        placeholder="e.g. 250"
                        disabled={saving || continuing}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                      />
                    </div>

                    {/* Sample Size */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Sample Size{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <input
                        type="number"
                        min="1"
                        value={test.sampleSize}
                        onChange={(e) =>
                          updateTest(
                            test.id,
                            "sampleSize",
                            e.target.value
                          )
                        }
                        placeholder="e.g. 25"
                        disabled={saving || continuing}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                      />
                    </div>
                  </div>
                </section>

                {/* Section 3 */}
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <ClipboardCheck
                      size={18}
                      className="text-blue-600"
                    />

                    <h3 className="font-semibold text-gray-900">
                      Testing Procedure & Evidence
                    </h3>
                  </div>

                  <div className="space-y-5">
                    {/* Testing Procedure */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Testing Procedure{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <textarea
                        value={test.testingProcedure}
                        onChange={(e) =>
                          updateTest(
                            test.id,
                            "testingProcedure",
                            e.target.value
                          )
                        }
                        rows={5}
                        placeholder="Describe how the control was tested. Include the procedure performed, selection method, attributes tested, and how operating effectiveness was evaluated."
                        disabled={saving || continuing}
                        className="w-full resize-y rounded-lg border border-gray-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                      />
                    </div>

                    {/* Evidence */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Evidence Obtained{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <textarea
                        value={test.evidenceObtained}
                        onChange={(e) =>
                          updateTest(
                            test.id,
                            "evidenceObtained",
                            e.target.value
                          )
                        }
                        rows={4}
                        placeholder="List the evidence inspected, such as approvals, system reports, reconciliations, invoices, signatures, logs, supporting schedules, or other audit evidence."
                        disabled={saving || continuing}
                        className="w-full resize-y rounded-lg border border-gray-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                      />
                    </div>
                  </div>
                </section>

                {/* Section 4 */}
                <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Calculator
                      size={18}
                      className="text-green-600"
                    />

                    <h3 className="font-semibold text-gray-900">
                      Test Results & Deviations
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                    {/* Result */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Test Result
                      </label>

                      <div className="relative">
                        <select
                          value={test.result}
                          onChange={(e) =>
                            updateTest(
                              test.id,
                              "result",
                              e.target.value
                            )
                          }
                          disabled={saving || continuing}
                          className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                        >
                          {results.map((result) => (
                            <option
                              key={result}
                              value={result}
                            >
                              {result}
                            </option>
                          ))}
                        </select>

                        <ChevronDown
                          size={17}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                      </div>
                    </div>

                    {/* Deviations */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Deviations
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={test.deviations}
                        onChange={(e) =>
                          updateTest(
                            test.id,
                            "deviations",
                            e.target.value
                          )
                        }
                        placeholder="0"
                        disabled={saving || continuing}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                      />
                    </div>

                    {/* Deviation Rate */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Deviation Rate (%)
                      </label>

                      <input
                        type="text"
                        value={test.deviationRate}
                        readOnly
                        placeholder="Calculated"
                        className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-sm text-gray-700 outline-none"
                      />
                    </div>

                    {/* Calculate */}
                    <div className="flex items-end">
                      <button
                        onClick={() =>
                          handleCalculateDeviation(test.id)
                        }
                        disabled={saving || continuing}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Calculator size={17} />
                        Calculate Rate
                      </button>
                    </div>
                  </div>

                  {/* Projected Impact */}
                  <div className="mt-5">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Projected Impact / Evaluation of Deviations
                    </label>

                    <textarea
                      value={test.projectedImpact}
                      onChange={(e) =>
                        updateTest(
                          test.id,
                          "projectedImpact",
                          e.target.value
                        )
                      }
                      rows={4}
                      placeholder="Explain the nature and significance of deviations, whether they are isolated or systemic, and their potential impact on reliance on the control."
                      disabled={saving || continuing}
                      className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                    />
                  </div>
                </section>

                {/* Section 5 */}
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <ShieldCheck
                      size={18}
                      className="text-blue-600"
                    />

                    <h3 className="font-semibold text-gray-900">
                      Control Reliance Decision
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {/* Reliance Decision */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Reliance Decision{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <select
                          value={test.relianceDecision}
                          onChange={(e) =>
                            updateTest(
                              test.id,
                              "relianceDecision",
                              e.target.value
                            )
                          }
                          disabled={saving || continuing}
                          className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                        >
                          <option value="">
                            Select reliance decision
                          </option>

                          {relianceDecisions.map(
                            (decision) => (
                              <option
                                key={decision}
                                value={decision}
                              >
                                {decision}
                              </option>
                            )
                          )}
                        </select>

                        <ChevronDown
                          size={17}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                      </div>
                    </div>

                    {/* Guidance */}
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <p className="text-sm font-semibold text-blue-900">
                        Reliance guidance
                      </p>

                      <p className="mt-1 text-sm leading-6 text-blue-800">
                        Use the test results and deviations to
                        determine whether the control can be relied
                        upon, relied upon partially, or not relied
                        upon when designing the audit response.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Section 6 */}
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <FileText
                      size={18}
                      className="text-green-600"
                    />

                    <h3 className="font-semibold text-gray-900">
                      Auditor Conclusion
                    </h3>
                  </div>

                  <textarea
                    value={test.conclusion}
                    onChange={(e) =>
                      updateTest(
                        test.id,
                        "conclusion",
                        e.target.value
                      )
                    }
                    rows={5}
                    placeholder="Document the auditor's conclusion on whether the control operated effectively during the testing period and how the result affects the planned audit approach."
                    disabled={saving || continuing}
                    className="w-full resize-y rounded-lg border border-gray-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                  />
                </section>

                {/* Test Status */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                      <Target size={19} />
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Test Status
                      </h4>

                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        Current result:{" "}
                        <span className="font-semibold text-gray-900">
                          {test.result}
                        </span>
                      </p>

                      {test.deviationRate && (
                        <p className="mt-1 text-sm text-gray-600">
                          Deviation rate:{" "}
                          <span className="font-semibold">
                            {test.deviationRate}%
                          </span>
                        </p>
                      )}

                      {test.relianceDecision && (
                        <p className="mt-1 text-sm text-gray-600">
                          Reliance decision:{" "}
                          <span className="font-semibold">
                            {test.relianceDecision}
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

        {/* Add Test */}
        <button
          onClick={addTest}
          disabled={saving || continuing}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white px-5 py-4 text-sm font-semibold text-gray-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={19} />
          Add Another Control Test
        </button>

        {/* Bottom Actions */}
        <div className="mt-8 flex flex-col gap-4 border-t border-gray-200 pt-6">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Back */}
            <button
              onClick={() =>
                router.push(
                  `/engagements/${engagementId}/risk-assessment`
                )
              }
              disabled={saving || continuing}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft size={17} />
              Back to Risk Assessment
            </button>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Saved message */}
              {saved && (
                <div className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                  <CheckCircle2 size={18} />
                  Workpaper saved successfully
                </div>
              )}

              {/* Save */}
              <button
                onClick={async () => {
                  await handleSave();
                }}
                disabled={saving || continuing}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={18} />

                {saving ? "Saving..." : "Save Workpaper"}
              </button>

              {/* Continue */}
              <button
                onClick={handleContinue}
                disabled={saving || continuing}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {continuing ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Navigation explanation */}
          <div className="flex items-center justify-end">
            <p className="text-xs text-gray-500">
              Save this workpaper before continuing to Section 2.8.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}