"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

import AppLayout from "../../../../../components/layout/AppLayout";

import {
  ArrowLeft,
  TestTube,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  CircleAlert,
  ChevronDown,
  ClipboardCheck,
  FileText,
  Target,
  Database,
  Search,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";

type TestResult =
  | "Not Started"
  | "In Progress"
  | "Passed"
  | "Exception"
  | "Failed"
  | "Not Applicable";

type SelectionMethod =
  | "Random"
  | "Systematic"
  | "Haphazard"
  | "Judgmental"
  | "Key Items"
  | "Full Population";

type Assertion =
  | "Existence"
  | "Completeness"
  | "Accuracy"
  | "Cut-off"
  | "Classification"
  | "Valuation"
  | "Rights & Obligations"
  | "Presentation & Disclosure";

type RelianceDecision =
  | "Rely"
  | "Partially Rely"
  | "Do Not Rely"
  | "To Be Determined";

type ControlTest = {
  id: number;
  testReference: string;
  controlId: string;
  controlName: string;
  controlObjective: string;
  assertion: Assertion[];
  testingPeriod: string;
  population: string;
  populationSize: string;
  frequency: string;
  sampleSize: string;
  selectionMethod: SelectionMethod;
  testProcedure: string;
  evidenceObtained: string;
  result: TestResult;
  exceptionsFound: string;
  exceptionNature: string;
  deviationRate: string;
  relianceDecision: RelianceDecision;
  conclusion: string;
  followUpRequired: boolean;
  followUpAction: string;
};

const ASSERTIONS: Assertion[] = [
  "Existence",
  "Completeness",
  "Accuracy",
  "Cut-off",
  "Classification",
  "Valuation",
  "Rights & Obligations",
  "Presentation & Disclosure",
];

const SELECTION_METHODS: SelectionMethod[] = [
  "Random",
  "Systematic",
  "Haphazard",
  "Judgmental",
  "Key Items",
  "Full Population",
];

const TEST_RESULTS: TestResult[] = [
  "Not Started",
  "In Progress",
  "Passed",
  "Exception",
  "Failed",
  "Not Applicable",
];

const RELIANCE_DECISIONS: RelianceDecision[] = [
  "Rely",
  "Partially Rely",
  "Do Not Rely",
  "To Be Determined",
];

const createEmptyTest = (id: number): ControlTest => ({
  id,
  testReference: `CT-${String(id).padStart(3, "0")}`,
  controlId: "",
  controlName: "",
  controlObjective: "",
  assertion: [],
  testingPeriod: "",
  population: "",
  populationSize: "",
  frequency: "",
  sampleSize: "",
  selectionMethod: "Random",
  testProcedure: "",
  evidenceObtained: "",
  result: "Not Started",
  exceptionsFound: "0",
  exceptionNature: "",
  deviationRate: "",
  relianceDecision: "To Be Determined",
  conclusion: "",
  followUpRequired: false,
  followUpAction: "",
});

export default function ControlsTestingPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = String(params.id);

  const [tests, setTests] = useState<ControlTest[]>([
    createEmptyTest(1),
  ]);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateTest = (
    id: number,
    field: keyof ControlTest,
    value: string | boolean | Assertion[]
  ) => {
    setTests((currentTests) =>
      currentTests.map((test) =>
        test.id === id
          ? {
              ...test,
              [field]: value,
            }
          : test
      )
    );

    setSaved(false);
  };

  const toggleAssertion = (
    testId: number,
    assertion: Assertion
  ) => {
    setTests((currentTests) =>
      currentTests.map((test) => {
        if (test.id !== testId) {
          return test;
        }

        const exists = test.assertion.includes(assertion);

        return {
          ...test,
          assertion: exists
            ? test.assertion.filter(
                (item) => item !== assertion
              )
            : [...test.assertion, assertion],
        };
      })
    );

    setSaved(false);
  };

  const addTest = () => {
    const nextId =
      tests.length > 0
        ? Math.max(...tests.map((test) => test.id)) + 1
        : 1;

    setTests((currentTests) => [
      ...currentTests,
      createEmptyTest(nextId),
    ]);

    setSaved(false);
  };

  const removeTest = (id: number) => {
    if (tests.length === 1) {
      alert("At least one control test is required.");
      return;
    }

    setTests((currentTests) =>
      currentTests.filter((test) => test.id !== id)
    );

    setSaved(false);
  };

  /*
   * Validate and save the current workpaper.
   *
   * NOTE:
   * At this stage the page stores the workpaper in React state only.
   * The Continue functionality is implemented below.
   *
   * Once the ControlTest Django API is created, this function can
   * be changed to POST/PATCH the tests to the backend.
   */
  const handleSave = (): boolean => {
    const incompleteTest = tests.some(
      (test) =>
        !test.testReference.trim() ||
        !test.controlId.trim() ||
        !test.controlName.trim() ||
        !test.controlObjective.trim() ||
        test.assertion.length === 0 ||
        !test.testingPeriod.trim() ||
        !test.population.trim() ||
        !test.sampleSize.trim() ||
        !test.testProcedure.trim() ||
        !test.evidenceObtained.trim() ||
        !test.conclusion.trim()
    );

    if (incompleteTest) {
      alert(
        "Please complete Test Reference, Control ID, Control Name, Control Objective, at least one Assertion, Testing Period, Population, Sample Size, Test Procedure, Evidence Obtained, and Conclusion for every test."
      );

      return false;
    }

    const workpaperData = {
      engagementId,
      phase: "Phase 2",
      section: "2.5",
      title: "Controls Testing",
      tests,
      savedAt: new Date().toISOString(),
    };

    console.log(
      "Controls Testing Workpaper:",
      workpaperData
    );

    setSaved(true);

    return true;
  };

  /*
   * Save first.
   * Only navigate to Phase 2.6 if validation succeeds.
   */
  const handleContinue = () => {
    const saveSuccessful = handleSave();

    if (!saveSuccessful) {
      return;
    }

    router.push(
      `/engagements/${engagementId}/risk-assessment/2.6`
    );
  };

  const handleBack = () => {
    router.push(
      `/engagements/${engagementId}/risk-assessment`
    );
  };

  const getResultClass = (result: TestResult) => {
    switch (result) {
      case "Passed":
        return "bg-green-50 text-green-700 border-green-200";

      case "Exception":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";

      case "Failed":
        return "bg-red-50 text-red-700 border-red-200";

      case "In Progress":
        return "bg-blue-50 text-blue-700 border-blue-200";

      case "Not Applicable":
        return "bg-gray-50 text-gray-700 border-gray-200";

      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
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

  const relianceTests = tests.filter(
    (test) =>
      test.relianceDecision === "Rely" ||
      test.relianceDecision === "Partially Rely"
  ).length;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                  <span>AUD-001</span>
                  <span>—</span>
                  <span>Financial Statement Audit</span>
                </div>

                <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
                  <TestTube
                    size={27}
                    className="text-blue-600"
                  />
                  Controls Testing
                </h1>

                <p className="mt-1 text-sm text-gray-600">
                  Select controls to test where reliance is
                  planned and document the testing performed.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${
                    saved
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-gray-200 bg-gray-50 text-gray-600"
                  }`}
                >
                  {saved ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <CircleAlert size={16} />
                  )}

                  {saved ? "Saved" : "Draft"}
                </div>

                <div className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
                  Phase 2 / 2.5
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-6 py-8">
          {/* Guidance */}
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex gap-4">
              <div className="mt-0.5 rounded-xl bg-blue-100 p-2 text-blue-700">
                <ClipboardCheck size={21} />
              </div>

              <div>
                <h2 className="font-semibold text-blue-900">
                  Controls Testing Guidance
                </h2>

                <p className="mt-1 text-sm leading-6 text-blue-800">
                  Test controls where reliance is planned.
                  Document the population, sampling approach,
                  test procedures, evidence inspected,
                  exceptions identified, and conclusion.
                  Results should support the planned control
                  reliance decision.
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Total Tests
                  </p>

                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {totalTests}
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                  <TestTube size={20} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Passed
                  </p>

                  <p className="mt-1 text-2xl font-bold text-green-600">
                    {passedTests}
                  </p>
                </div>

                <div className="rounded-xl bg-green-50 p-3 text-green-600">
                  <CheckCircle2 size={20} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Exceptions
                  </p>

                  <p className="mt-1 text-2xl font-bold text-yellow-600">
                    {exceptionTests}
                  </p>
                </div>

                <div className="rounded-xl bg-yellow-50 p-3 text-yellow-600">
                  <AlertTriangle size={20} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Failed
                  </p>

                  <p className="mt-1 text-2xl font-bold text-red-600">
                    {failedTests}
                  </p>
                </div>

                <div className="rounded-xl bg-red-50 p-3 text-red-600">
                  <CircleAlert size={20} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Reliance
                  </p>

                  <p className="mt-1 text-2xl font-bold text-purple-600">
                    {relianceTests}
                  </p>
                </div>

                <div className="rounded-xl bg-purple-50 p-3 text-purple-600">
                  <ShieldCheck size={20} />
                </div>
              </div>
            </div>
          </div>

          {/* Tests */}
          <div className="space-y-6">
            {tests.map((test, index) => (
              <section
                key={test.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                {/* Test Header */}
                <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 font-semibold text-blue-700">
                        {index + 1}
                      </div>

                      <div>
                        <h2 className="font-semibold text-gray-900">
                          Control Test {index + 1}
                        </h2>

                        <p className="text-xs text-gray-500">
                          {test.testReference || "New Test"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={test.result}
                        onChange={(event) =>
                          updateTest(
                            test.id,
                            "result",
                            event.target.value
                          )
                        }
                        className={`rounded-xl border px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 ${getResultClass(
                          test.result
                        )}`}
                      >
                        {TEST_RESULTS.map((result) => (
                          <option
                            key={result}
                            value={result}
                          >
                            {result}
                          </option>
                        ))}
                      </select>

                      {tests.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeTest(test.id)
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-8 p-6">
                  {/* Basic Information */}
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <FileText
                        size={19}
                        className="text-blue-600"
                      />

                      <h3 className="font-semibold text-gray-900">
                        Test Information
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Test Reference *
                        </label>

                        <input
                          type="text"
                          value={test.testReference}
                          onChange={(event) =>
                            updateTest(
                              test.id,
                              "testReference",
                              event.target.value
                            )
                          }
                          placeholder="CT-001"
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Control ID *
                        </label>

                        <input
                          type="text"
                          value={test.controlId}
                          onChange={(event) =>
                            updateTest(
                              test.id,
                              "controlId",
                              event.target.value
                            )
                          }
                          placeholder="CTRL-001"
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Control Name *
                        </label>

                        <input
                          type="text"
                          value={test.controlName}
                          onChange={(event) =>
                            updateTest(
                              test.id,
                              "controlName",
                              event.target.value
                            )
                          }
                          placeholder="Monthly bank reconciliation"
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Testing Period *
                        </label>

                        <input
                          type="text"
                          value={test.testingPeriod}
                          onChange={(event) =>
                            updateTest(
                              test.id,
                              "testingPeriod",
                              event.target.value
                            )
                          }
                          placeholder="January 2026 – December 2026"
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="mt-5">
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Control Objective *
                      </label>

                      <textarea
                        value={test.controlObjective}
                        onChange={(event) =>
                          updateTest(
                            test.id,
                            "controlObjective",
                            event.target.value
                          )
                        }
                        rows={3}
                        placeholder="Describe what the control is designed to achieve."
                        className="w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Assertions */}
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <Target
                        size={19}
                        className="text-blue-600"
                      />

                      <h3 className="font-semibold text-gray-900">
                        Relevant Assertions *
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                      {ASSERTIONS.map((assertion) => {
                        const selected =
                          test.assertion.includes(
                            assertion
                          );

                        return (
                          <label
                            key={assertion}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${
                              selected
                                ? "border-blue-300 bg-blue-50 text-blue-800"
                                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() =>
                                toggleAssertion(
                                  test.id,
                                  assertion
                                )
                              }
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />

                            <span>{assertion}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Population and Sampling */}
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <Database
                        size={19}
                        className="text-blue-600"
                      />

                      <h3 className="font-semibold text-gray-900">
                        Population & Sampling
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Population *
                        </label>

                        <input
                          type="text"
                          value={test.population}
                          onChange={(event) =>
                            updateTest(
                              test.id,
                              "population",
                              event.target.value
                            )
                          }
                          placeholder="All monthly bank reconciliations"
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Population Size
                        </label>

                        <input
                          type="text"
                          value={test.populationSize}
                          onChange={(event) =>
                            updateTest(
                              test.id,
                              "populationSize",
                              event.target.value
                            )
                          }
                          placeholder="12"
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Frequency
                        </label>

                        <select
                          value={test.frequency}
                          onChange={(event) =>
                            updateTest(
                              test.id,
                              "frequency",
                              event.target.value
                            )
                          }
                          className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">
                            Select frequency
                          </option>
                          <option value="Continuous">
                            Continuous
                          </option>
                          <option value="Daily">Daily</option>
                          <option value="Weekly">
                            Weekly
                          </option>
                          <option value="Monthly">
                            Monthly
                          </option>
                          <option value="Quarterly">
                            Quarterly
                          </option>
                          <option value="Annually">
                            Annually
                          </option>
                          <option value="As Needed">
                            As Needed
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Sample Size *
                        </label>

                        <input
                          type="text"
                          value={test.sampleSize}
                          onChange={(event) =>
                            updateTest(
                              test.id,
                              "sampleSize",
                              event.target.value
                            )
                          }
                          placeholder="3"
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Selection Method
                        </label>

                        <div className="relative">
                          <select
                            value={test.selectionMethod}
                            onChange={(event) =>
                              updateTest(
                                test.id,
                                "selectionMethod",
                                event.target.value
                              )
                            }
                            className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          >
                            {SELECTION_METHODS.map(
                              (method) => (
                                <option
                                  key={method}
                                  value={method}
                                >
                                  {method}
                                </option>
                              )
                            )}
                          </select>

                          <ChevronDown
                            size={17}
                            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Testing Procedure */}
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <Search
                        size={19}
                        className="text-blue-600"
                      />

                      <h3 className="font-semibold text-gray-900">
                        Testing Procedures
                      </h3>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Test Procedure *
                        </label>

                        <textarea
                          value={test.testProcedure}
                          onChange={(event) =>
                            updateTest(
                              test.id,
                              "testProcedure",
                              event.target.value
                            )
                          }
                          rows={5}
                          placeholder="Describe the procedures performed to test the control."
                          className="w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Evidence Obtained *
                        </label>

                        <textarea
                          value={test.evidenceObtained}
                          onChange={(event) =>
                            updateTest(
                              test.id,
                              "evidenceObtained",
                              event.target.value
                            )
                          }
                          rows={4}
                          placeholder="Describe the evidence inspected or obtained."
                          className="w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Exceptions */}
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <AlertTriangle
                        size={19}
                        className="text-yellow-600"
                      />

                      <h3 className="font-semibold text-gray-900">
                        Exceptions & Deviations
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Exceptions Found
                        </label>

                        <input
                          type="text"
                          value={test.exceptionsFound}
                          onChange={(event) =>
                            updateTest(
                              test.id,
                              "exceptionsFound",
                              event.target.value
                            )
                          }
                          placeholder="0"
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Deviation Rate
                        </label>

                        <input
                          type="text"
                          value={test.deviationRate}
                          onChange={(event) =>
                            updateTest(
                              test.id,
                              "deviationRate",
                              event.target.value
                            )
                          }
                          placeholder="0%"
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Exception Nature
                        </label>

                        <input
                          type="text"
                          value={test.exceptionNature}
                          onChange={(event) =>
                            updateTest(
                              test.id,
                              "exceptionNature",
                              event.target.value
                            )
                          }
                          placeholder="Describe exceptions if any"
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reliance */}
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <ShieldCheck
                        size={19}
                        className="text-blue-600"
                      />

                      <h3 className="font-semibold text-gray-900">
                        Reliance Assessment
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Reliance Decision
                        </label>

                        <select
                          value={test.relianceDecision}
                          onChange={(event) =>
                            updateTest(
                              test.id,
                              "relianceDecision",
                              event.target.value
                            )
                          }
                          className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        >
                          {RELIANCE_DECISIONS.map(
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
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Test Result
                        </label>

                        <select
                          value={test.result}
                          onChange={(event) =>
                            updateTest(
                              test.id,
                              "result",
                              event.target.value
                            )
                          }
                          className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        >
                          {TEST_RESULTS.map((result) => (
                            <option
                              key={result}
                              value={result}
                            >
                              {result}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Conclusion */}
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <ClipboardCheck
                        size={19}
                        className="text-blue-600"
                      />

                      <h3 className="font-semibold text-gray-900">
                        Conclusion & Follow-up
                      </h3>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Auditor Conclusion *
                        </label>

                        <textarea
                          value={test.conclusion}
                          onChange={(event) =>
                            updateTest(
                              test.id,
                              "conclusion",
                              event.target.value
                            )
                          }
                          rows={4}
                          placeholder="State the auditor's conclusion regarding the operating effectiveness of the control."
                          className="w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <input
                          type="checkbox"
                          checked={test.followUpRequired}
                          onChange={(event) =>
                            updateTest(
                              test.id,
                              "followUpRequired",
                              event.target.checked
                            )
                          }
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />

                        <span className="text-sm font-medium text-gray-700">
                          Follow-up action required
                        </span>
                      </label>

                      {test.followUpRequired && (
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Follow-up Action
                          </label>

                          <textarea
                            value={test.followUpAction}
                            onChange={(event) =>
                              updateTest(
                                test.id,
                                "followUpAction",
                                event.target.value
                              )
                            }
                            rows={3}
                            placeholder="Describe the required follow-up action."
                            className="w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>

          {/* Add Another Test */}
          <button
            type="button"
            onClick={addTest}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-white px-5 py-4 text-sm font-semibold text-gray-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
          >
            <Plus size={18} />
            Add Another Control Test
          </button>
        </main>

        {/* Bottom Action Bar */}
        <div className="sticky bottom-0 z-20 border-t border-gray-200 bg-white/95 shadow-lg backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <ArrowLeft size={17} />
              Back
            </button>

            <div className="flex items-center gap-3">
              {saved && (
                <div className="hidden items-center gap-2 text-sm font-medium text-green-700 md:flex">
                  <CheckCircle2 size={17} />
                  Workpaper saved
                </div>
              )}

              {/* Save */}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={17} />

                {saving
                  ? "Saving..."
                  : "Save Workpaper"}
              </button>

              {/* Continue */}
              <button
                type="button"
                onClick={handleContinue}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
                <span className="text-lg leading-none">
                  →
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}