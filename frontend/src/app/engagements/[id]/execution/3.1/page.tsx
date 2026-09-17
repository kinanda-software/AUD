"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "../../../../../components/layout/AppLayout";

import {
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  FileText,
  Target,
  Database,
  TestTube,
  AlertTriangle,
  CheckCircle2,
  Save,
  Loader2,
} from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:8000/api";

interface ControlTestExecution {
  id?: number;
  engagement: number;
  engagement_code?: string;

  control_name: string;
  control_reference: string;
  assertion: string;
  control_type: string;

  testing_objective: string;
  test_procedure: string;

  population: string;
  sample_size: number | null;
  sampling_method: string;

  audit_evidence: string;

  result: string;
  exceptions_found: number;

  exception_nature: string;
  exception_effect: string;

  reliance_decision: string;
  auditor_conclusion: string;

  created_at?: string;
  updated_at?: string;
}

export default function ExecuteControlsPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = params.id as string;

  // ==========================================================
  // FORM STATE
  // ==========================================================

  const [testId, setTestId] = useState<number | null>(null);

  const [controlName, setControlName] = useState("");
  const [controlReference, setControlReference] = useState("");
  const [assertion, setAssertion] = useState("");
  const [controlType, setControlType] = useState("");

  const [testingObjective, setTestingObjective] = useState("");
  const [testProcedure, setTestProcedure] = useState("");

  const [population, setPopulation] = useState("");
  const [sampleSize, setSampleSize] = useState("");
  const [samplingMethod, setSamplingMethod] = useState("");

  const [auditEvidence, setAuditEvidence] = useState("");

  const [result, setResult] = useState("Not Started");
  const [exceptionsFound, setExceptionsFound] = useState("0");

  const [exceptionNature, setExceptionNature] = useState("");
  const [exceptionEffect, setExceptionEffect] = useState("");

  const [relianceDecision, setRelianceDecision] = useState("");
  const [auditorConclusion, setAuditorConclusion] = useState("");

  // ==========================================================
  // UI STATE
  // ==========================================================

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ==========================================================
  // LOAD EXISTING TEST
  // ==========================================================

  useEffect(() => {
    if (!engagementId) {
      setLoading(false);
      return;
    }

    const loadTest = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE_URL}/control-test-executions/?engagement=${engagementId}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load control test (${response.status})`
          );
        }

        const data: ControlTestExecution[] =
          await response.json();

        if (data.length > 0) {
          const existing = data[0];

          setTestId(existing.id ?? null);

          setControlName(existing.control_name || "");
          setControlReference(
            existing.control_reference || ""
          );
          setAssertion(existing.assertion || "");
          setControlType(existing.control_type || "");

          setTestingObjective(
            existing.testing_objective || ""
          );

          setTestProcedure(
            existing.test_procedure || ""
          );

          setPopulation(existing.population || "");

          setSampleSize(
            existing.sample_size !== null &&
              existing.sample_size !== undefined
              ? String(existing.sample_size)
              : ""
          );

          setSamplingMethod(
            existing.sampling_method || ""
          );

          setAuditEvidence(
            existing.audit_evidence || ""
          );

          setResult(
            existing.result || "Not Started"
          );

          setExceptionsFound(
            String(existing.exceptions_found ?? 0)
          );

          setExceptionNature(
            existing.exception_nature || ""
          );

          setExceptionEffect(
            existing.exception_effect || ""
          );

          setRelianceDecision(
            existing.reliance_decision || ""
          );

          setAuditorConclusion(
            existing.auditor_conclusion || ""
          );

          setSaved(true);
        }
      } catch (err) {
        console.error(
          "Error loading 3.1 control test:",
          err
        );

        setError(
          "Unable to load the existing control test. Make sure the Django API is running."
        );
      } finally {
        setLoading(false);
      }
    };

    loadTest();
  }, [engagementId]);

  // ==========================================================
  // CLEAR MESSAGES
  // ==========================================================

  const clearMessages = () => {
    setSaved(false);
    setSuccessMessage("");
    setError("");
  };

  // ==========================================================
  // VALIDATION
  // ==========================================================

  const validateForm = () => {
    if (!controlName.trim()) {
      setError("Control Name is required.");
      return false;
    }

    if (!controlReference.trim()) {
      setError("Control Reference is required.");
      return false;
    }

    if (!assertion) {
      setError("Please select an assertion.");
      return false;
    }

    if (!controlType) {
      setError("Please select a control type.");
      return false;
    }

    if (!testingObjective.trim()) {
      setError("Testing Objective is required.");
      return false;
    }

    if (!testProcedure.trim()) {
      setError("Test Procedure is required.");
      return false;
    }

    if (!auditEvidence.trim()) {
      setError("Audit Evidence is required.");
      return false;
    }

    if (!relianceDecision) {
      setError("Please select a Reliance Decision.");
      return false;
    }

    if (!auditorConclusion.trim()) {
      setError("Auditor Conclusion is required.");
      return false;
    }

    if (
      sampleSize !== "" &&
      Number(sampleSize) < 0
    ) {
      setError("Sample Size cannot be negative.");
      return false;
    }

    if (
      exceptionsFound === "" ||
      Number(exceptionsFound) < 0
    ) {
      setError("Exceptions Found cannot be negative.");
      return false;
    }

    if (
      (result === "Exception" ||
        result === "Failed") &&
      !exceptionNature.trim()
    ) {
      setError(
        "Exception Nature is required when the test result is Exception or Failed."
      );
      return false;
    }

    return true;
  };

  // ==========================================================
  // BUILD PAYLOAD
  // ==========================================================

  const buildPayload = () => {
    return {
      engagement: Number(engagementId),

      control_name: controlName.trim(),

      control_reference:
        controlReference.trim(),

      assertion,

      control_type: controlType,

      testing_objective:
        testingObjective.trim(),

      test_procedure:
        testProcedure.trim(),

      population:
        population.trim(),

      sample_size:
        sampleSize === ""
          ? null
          : Number(sampleSize),

      sampling_method:

        samplingMethod,

      audit_evidence:
        auditEvidence.trim(),

      result,

      exceptions_found:
        Number(exceptionsFound || 0),

      exception_nature:
        exceptionNature.trim(),

      exception_effect:
        exceptionEffect.trim(),

      reliance_decision:
        relianceDecision,

      auditor_conclusion:
        auditorConclusion.trim(),
    };
  };

  // ==========================================================
  // SAVE TEST
  // ==========================================================

  const saveTest = async () => {
    if (!validateForm()) {
      return false;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const payload = buildPayload();

      const isUpdating = testId !== null;

      const url = isUpdating
        ? `${API_BASE_URL}/control-test-executions/${testId}/`
        : `${API_BASE_URL}/control-test-executions/`;

      const response = await fetch(url, {
        method: isUpdating ? "PATCH" : "POST",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error(
          "3.1 API error:",
          responseData
        );

        throw new Error(
          JSON.stringify(responseData)
        );
      }

      setTestId(responseData.id);

      setSaved(true);

      setSuccessMessage(
        isUpdating
          ? "Control test updated successfully."
          : "Control test saved successfully."
      );

      return true;
    } catch (err) {
      console.error(
        "Error saving control test:",
        err
      );

      setError(
        "Failed to save the control test. Check that the Django backend is running and the API is available."
      );

      return false;
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // SAVE AND CONTINUE
  // ==========================================================

  const handleContinue = async () => {
    const success = await saveTest();

    if (!success) {
      return;
    }

    router.push(
      `/engagements/${engagementId}/execution/3.2`
    );
  };

  // ==========================================================
  // LOADING SCREEN
  // ==========================================================

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="flex min-h-[500px] items-center justify-center">

            <div className="flex items-center gap-3 rounded-xl border bg-white px-6 py-5 shadow-sm">

              <Loader2
                size={22}
                className="animate-spin text-blue-600"
              />

              <span className="text-sm font-medium text-gray-600">
                Loading control test...
              </span>

            </div>

          </div>
        </div>
      </AppLayout>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="mb-6 flex items-center gap-4">

          <button
            type="button"
            onClick={() =>
              router.push(
                `/engagements/${engagementId}/execution`
              )
            }
            disabled={saving}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
          >
            <ArrowLeft size={19} />
          </button>

          <div>

            <div className="flex items-center gap-2">

              <span className="text-sm font-semibold text-blue-600">
                Phase 3
              </span>

              <span className="text-gray-400">
                /
              </span>

              <span className="text-sm text-gray-500">
                3.1 Execute Tests of Controls
              </span>

            </div>

            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              Execute Tests of Controls
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Test selected controls, document evidence,
              evaluate exceptions and determine whether
              reliance remains appropriate.
            </p>

          </div>

        </div>

        {/* ==================================================
            ENGAGEMENT
        ================================================== */}

        <section className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-6">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Engagement
              </p>

              <h2 className="mt-1 text-xl font-bold text-gray-900">
                Engagement #{engagementId}
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Control testing workpaper
              </p>

            </div>

            <div className="hidden h-12 w-12 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm md:flex">
              <ClipboardCheck size={23} />
            </div>

          </div>

        </section>

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">

            <div className="flex items-start gap-3">

              <AlertTriangle
                size={20}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div>

                <p className="font-semibold text-red-800">
                  Unable to save control test
                </p>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>

              </div>

            </div>

          </div>
        )}

        {/* ==================================================
            SUCCESS
        ================================================== */}

        {successMessage && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">

            <div className="flex items-center gap-3">

              <CheckCircle2
                size={20}
                className="text-green-600"
              />

              <p className="text-sm font-medium text-green-800">
                {successMessage}
              </p>

            </div>

          </div>
        )}

        {/* ==================================================
            CONTROL INFORMATION
        ================================================== */}

        <section className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Target size={20} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900">
                  Control Information
                </h2>

                <p className="text-sm text-gray-500">
                  Identify the control selected for testing.
                </p>

              </div>

            </div>

          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2">

            {/* CONTROL NAME */}

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Control Name *
              </label>

              <input
                type="text"
                value={controlName}
                onChange={(e) => {
                  setControlName(e.target.value);
                  clearMessages();
                }}
                placeholder="e.g. Revenue Invoice Approval"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            {/* CONTROL REFERENCE */}

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Control Reference *
              </label>

              <input
                type="text"
                value={controlReference}
                onChange={(e) => {
                  setControlReference(e.target.value);
                  clearMessages();
                }}
                placeholder="e.g. CTRL-REV-001"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            {/* ASSERTION */}

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Assertion *
              </label>

              <select
                value={assertion}
                onChange={(e) => {
                  setAssertion(e.target.value);
                  clearMessages();
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >

                <option value="" disabled>
                  Select assertion
                </option>

                <option value="Existence">
                  Existence
                </option>

                <option value="Completeness">
                  Completeness
                </option>

                <option value="Accuracy">
                  Accuracy
                </option>

                <option value="Cut-off">
                  Cut-off
                </option>

                <option value="Occurrence">
                  Occurrence
                </option>

                <option value="Classification">
                  Classification
                </option>

                <option value="Valuation">
                  Valuation
                </option>

                <option value="Rights & Obligations">
                  Rights & Obligations
                </option>

                <option value="Presentation & Disclosure">
                  Presentation & Disclosure
                </option>

              </select>

            </div>

            {/* CONTROL TYPE */}

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Control Type *
              </label>

              <select
                value={controlType}
                onChange={(e) => {
                  setControlType(e.target.value);
                  clearMessages();
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >

                <option value="" disabled>
                  Select control type
                </option>

                <option value="Manual">
                  Manual
                </option>

                <option value="IT Dependent Manual">
                  IT Dependent Manual
                </option>

                <option value="Automated">
                  Automated
                </option>

                <option value="IT General Control">
                  IT General Control
                </option>

              </select>

            </div>

          </div>

        </section>

        {/* ==================================================
            TESTING OBJECTIVE
        ================================================== */}

        <section className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <FileText size={20} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900">
                  Testing Objective
                </h2>

                <p className="text-sm text-gray-500">
                  Define what the control test is intended to establish.
                </p>

              </div>

            </div>

          </div>

          <div className="p-6">

            <textarea
              rows={4}
              value={testingObjective}
              onChange={(e) => {
                setTestingObjective(e.target.value);
                clearMessages();
              }}
              placeholder="Describe the objective of testing this control..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

          </div>

        </section>

        {/* ==================================================
            TEST PROCEDURE
        ================================================== */}

        <section className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <TestTube size={20} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900">
                  Test Procedure
                </h2>

                <p className="text-sm text-gray-500">
                  Document the procedure performed by the auditor.
                </p>

              </div>

            </div>

          </div>

          <div className="p-6">

            <textarea
              rows={5}
              value={testProcedure}
              onChange={(e) => {
                setTestProcedure(e.target.value);
                clearMessages();
              }}
              placeholder="Describe the control testing procedure performed..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

          </div>

        </section>

        {/* ==================================================
            POPULATION AND SAMPLING
        ================================================== */}

        <section className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                <Database size={20} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900">
                  Population & Sampling
                </h2>

                <p className="text-sm text-gray-500">
                  Document the population and sample selected for testing.
                </p>

              </div>

            </div>

          </div>

          <div className="grid gap-5 p-6 md:grid-cols-3">

            {/* POPULATION */}

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Population
              </label>

              <input
                type="text"
                value={population}
                onChange={(e) => {
                  setPopulation(e.target.value);
                  clearMessages();
                }}
                placeholder="e.g. 1,250 transactions"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            {/* SAMPLE SIZE */}

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Sample Size
              </label>

              <input
                type="number"
                min="0"
                value={sampleSize}
                onChange={(e) => {
                  setSampleSize(e.target.value);
                  clearMessages();
                }}
                placeholder="e.g. 25"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            {/* SAMPLING METHOD */}

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Sampling Method
              </label>

              <select
                value={samplingMethod}
                onChange={(e) => {
                  setSamplingMethod(e.target.value);
                  clearMessages();
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >

                <option value="" disabled>
                  Select method
                </option>

                <option value="Random">
                  Random
                </option>

                <option value="Systematic">
                  Systematic
                </option>

                <option value="Judgmental">
                  Judgmental
                </option>

                <option value="Stratified">
                  Stratified
                </option>

                <option value="Full Population">
                  Full Population
                </option>

              </select>

            </div>

          </div>

        </section>

        {/* ==================================================
            AUDIT EVIDENCE
        ================================================== */}

        <section className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">

            <h2 className="font-semibold text-gray-900">
              Audit Evidence *
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Reference the evidence inspected during the control test.
            </p>

          </div>

          <div className="p-6">

            <textarea
              rows={4}
              value={auditEvidence}
              onChange={(e) => {
                setAuditEvidence(e.target.value);
                clearMessages();
              }}
              placeholder="Describe evidence obtained and workpaper references..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

          </div>

        </section>

        {/* ==================================================
            TEST RESULT
        ================================================== */}

        <section className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">

            <h2 className="font-semibold text-gray-900">
              Test Result
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Record the outcome of the control test.
            </p>

          </div>

          <div className="grid gap-5 p-6 md:grid-cols-2">

            {/* RESULT */}

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Result
              </label>

              <select
                value={result}
                onChange={(e) => {
                  setResult(e.target.value);
                  clearMessages();
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >

                <option value="Not Started">
                  Not Started
                </option>

                <option value="Passed">
                  Passed
                </option>

                <option value="Exception">
                  Exception
                </option>

                <option value="Failed">
                  Failed
                </option>

                <option value="Not Applicable">
                  Not Applicable
                </option>

              </select>

            </div>

            {/* EXCEPTIONS FOUND */}

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Exceptions Found
              </label>

              <input
                type="number"
                min="0"
                value={exceptionsFound}
                onChange={(e) => {
                  setExceptionsFound(e.target.value);
                  clearMessages();
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

          </div>

        </section>

        {/* ==================================================
            EXCEPTION EVALUATION
        ================================================== */}

        <section className="mb-6 rounded-xl border border-orange-200 bg-orange-50 shadow-sm">

          <div className="border-b border-orange-200 px-6 py-5">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-orange-600">
                <AlertTriangle size={20} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900">
                  Exception Evaluation
                </h2>

                <p className="text-sm text-gray-600">
                  Evaluate the nature and cause of exceptions identified.
                </p>

              </div>

            </div>

          </div>

          <div className="space-y-5 p-6">

            <textarea
              rows={4}
              value={exceptionNature}
              onChange={(e) => {
                setExceptionNature(e.target.value);
                clearMessages();
              }}
              placeholder="Describe the nature and cause of exceptions..."
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <textarea
              rows={4}
              value={exceptionEffect}
              onChange={(e) => {
                setExceptionEffect(e.target.value);
                clearMessages();
              }}
              placeholder="Describe the effect of the exceptions on control reliance..."
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

          </div>

        </section>

        {/* ==================================================
            CONCLUSION
        ================================================== */}

        <section className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">

            <h2 className="font-semibold text-gray-900">
              Auditor Conclusion
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Document the final conclusion and audit response.
            </p>

          </div>

          <div className="space-y-5 p-6">

            {/* RELIANCE */}

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Reliance Decision *
              </label>

              <select
                value={relianceDecision}
                onChange={(e) => {
                  setRelianceDecision(e.target.value);
                  clearMessages();
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >

                <option value="" disabled>
                  Select decision
                </option>

                <option value="Rely in Full">
                  Rely in Full
                </option>

                <option value="Rely in Part">
                  Rely in Part
                </option>

                <option value="Do Not Rely">
                  Do Not Rely
                </option>

                <option value="Substantive Approach Required">
                  Substantive Approach Required
                </option>

              </select>

            </div>

            {/* CONCLUSION */}

            <textarea
              rows={5}
              value={auditorConclusion}
              onChange={(e) => {
                setAuditorConclusion(e.target.value);
                clearMessages();
              }}
              placeholder="Document the auditor's conclusion..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

          </div>

        </section>

        {/* ==================================================
            ACTIONS
        ================================================== */}

        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">

          {/* CANCEL */}

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              router.push(
                `/engagements/${engagementId}/execution`
              )
            }
            className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">

            {/* SAVE TEST */}

            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                await saveTest();
              }}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >

              {saving ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <CheckCircle2 size={18} />
                  Saved
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Test
                </>
              )}

            </button>

            {/* CONTINUE */}

            <button
              type="button"
              disabled={saving}
              onClick={handleContinue}
              className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >

              {saving ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
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

      </div>
    </AppLayout>
  );
}