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
  ShieldCheck,
  Target,
  AlertTriangle,
  FileText,
  BarChart3,
  Scale,
  ClipboardCheck,
  TrendingUp,
} from "lucide-react";

type RiskLevel = "Low" | "Moderate" | "High" | "Significant";

type YesNo = "Yes" | "No";

type Assertion =
  | "Existence"
  | "Completeness"
  | "Accuracy"
  | "Cut-off"
  | "Classification"
  | "Valuation"
  | "Rights & Obligations"
  | "Presentation & Disclosure";

type RiskAssessment = {
  id: number;
  accountDisclosure: string;
  assertion: Assertion | "";
  inherentRisk: RiskLevel | "";
  controlRisk: RiskLevel | "";
  combinedRisk: RiskLevel | "";
  likelihood: "Low" | "Medium" | "High" | "";
  magnitude: "Low" | "Medium" | "High" | "";
  significantRisk: YesNo | "";
  fraudRisk: YesNo | "";
  rationale: string;
  plannedResponse: string;
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

const riskLevels: RiskLevel[] = [
  "Low",
  "Moderate",
  "High",
  "Significant",
];

const initialAssessment: RiskAssessment = {
  id: 1,
  accountDisclosure: "",
  assertion: "",
  inherentRisk: "",
  controlRisk: "",
  combinedRisk: "",
  likelihood: "",
  magnitude: "",
  significantRisk: "",
  fraudRisk: "",
  rationale: "",
  plannedResponse: "",
};

export default function CombinedRiskAssessmentPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = params.id as string;

  const [assessments, setAssessments] = useState<RiskAssessment[]>([
    initialAssessment,
  ]);

  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [continuing, setContinuing] = useState(false);

  /*
   * ---------------------------------------------------------
   * UPDATE ASSESSMENT
   * ---------------------------------------------------------
   */
  const updateAssessment = (
    id: number,
    field: keyof RiskAssessment,
    value: string
  ) => {
    setAssessments((current) =>
      current.map((assessment) =>
        assessment.id === id
          ? {
              ...assessment,
              [field]: value,
            }
          : assessment
      )
    );

    setSaved(false);
    setErrors([]);
  };

  /*
   * ---------------------------------------------------------
   * ADD ASSESSMENT
   * ---------------------------------------------------------
   */
  const addAssessment = () => {
    const newId =
      assessments.length > 0
        ? Math.max(...assessments.map((assessment) => assessment.id)) + 1
        : 1;

    setAssessments((current) => [
      ...current,
      {
        id: newId,
        accountDisclosure: "",
        assertion: "",
        inherentRisk: "",
        controlRisk: "",
        combinedRisk: "",
        likelihood: "",
        magnitude: "",
        significantRisk: "",
        fraudRisk: "",
        rationale: "",
        plannedResponse: "",
      },
    ]);

    setSaved(false);
    setErrors([]);
  };

  /*
   * ---------------------------------------------------------
   * REMOVE ASSESSMENT
   * ---------------------------------------------------------
   */
  const removeAssessment = (id: number) => {
    if (assessments.length === 1) {
      return;
    }

    setAssessments((current) =>
      current.filter((assessment) => assessment.id !== id)
    );

    setSaved(false);
    setErrors([]);
  };

  /*
   * ---------------------------------------------------------
   * VALIDATE FORM
   * ---------------------------------------------------------
   */
  const validateForm = () => {
    const validationErrors: string[] = [];

    assessments.forEach((assessment, index) => {
      const rowNumber = index + 1;

      if (!assessment.accountDisclosure.trim()) {
        validationErrors.push(
          `Risk ${rowNumber}: Account / Disclosure is required.`
        );
      }

      if (!assessment.assertion) {
        validationErrors.push(
          `Risk ${rowNumber}: Assertion is required.`
        );
      }

      if (!assessment.inherentRisk) {
        validationErrors.push(
          `Risk ${rowNumber}: Inherent Risk is required.`
        );
      }

      if (!assessment.controlRisk) {
        validationErrors.push(
          `Risk ${rowNumber}: Control Risk is required.`
        );
      }

      if (!assessment.combinedRisk) {
        validationErrors.push(
          `Risk ${rowNumber}: Combined Risk is required.`
        );
      }

      if (!assessment.likelihood) {
        validationErrors.push(
          `Risk ${rowNumber}: Likelihood is required.`
        );
      }

      if (!assessment.magnitude) {
        validationErrors.push(
          `Risk ${rowNumber}: Magnitude is required.`
        );
      }

      if (!assessment.significantRisk) {
        validationErrors.push(
          `Risk ${rowNumber}: Significant Risk selection is required.`
        );
      }

      if (!assessment.fraudRisk) {
        validationErrors.push(
          `Risk ${rowNumber}: Fraud Risk selection is required.`
        );
      }

      if (!assessment.rationale.trim()) {
        validationErrors.push(
          `Risk ${rowNumber}: Risk Rationale is required.`
        );
      }

      if (!assessment.plannedResponse.trim()) {
        validationErrors.push(
          `Risk ${rowNumber}: Planned Audit Response is required.`
        );
      }
    });

    setErrors(validationErrors);

    return validationErrors.length === 0;
  };

  /*
   * ---------------------------------------------------------
   * SAVE WORKPAPER
   * ---------------------------------------------------------
   *
   * IMPORTANT:
   * This is currently the same local save behaviour your
   * original page used. We are not inventing a 2.6 backend
   * endpoint here because the backend model/API for 2.6 was
   * not included in the code you provided.
   *
   * Once the 2.6 Django model is connected, this function can
   * be changed to POST/PATCH the real API.
   */
  const handleSave = async (): Promise<boolean> => {
    if (saving || continuing) {
      return false;
    }

    if (!validateForm()) {
      setSaved(false);
      return false;
    }

    setSaving(true);

    try {
      const workpaperData = {
        engagementId,
        phase: "Phase 2",
        section: "2.6",
        title: "Combined Risk Assessment",
        assessments,
        savedAt: new Date().toISOString(),
      };

      console.log(
        "2.6 Combined Risk Assessment:",
        workpaperData
      );

      /*
       * Simulate completion of the current save operation.
       *
       * The existing page was already using local state +
       * console.log for Save Workpaper, so this preserves that
       * behaviour instead of pretending there is a backend
       * endpoint that has not been provided.
       */
      await new Promise((resolve) => setTimeout(resolve, 300));

      setSaved(true);

      return true;
    } catch (error) {
      console.error(
        "Failed to save 2.6 Combined Risk Assessment:",
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
   * ---------------------------------------------------------
   * CONTINUE TO SECTION 2.7
   * ---------------------------------------------------------
   *
   * This is the important missing functionality.
   *
   * 1. Validate 2.6
   * 2. Save 2.6
   * 3. Only after successful save, navigate to 2.7
   */
  const handleContinue = async () => {
    if (saving || continuing) {
      return;
    }

    setContinuing(true);
    setErrors([]);

    try {
      const saveSuccessful = await handleSave();

      if (!saveSuccessful) {
        setContinuing(false);
        return;
      }

      router.push(
        `/engagements/${engagementId}/risk-assessment/2.7`
      );
    } catch (error) {
      console.error(
        "Failed to continue from Section 2.6:",
        error
      );

      setContinuing(false);

      setErrors([
        "The workpaper could not be saved. You cannot continue until it is saved successfully.",
      ]);
    }
  };

  /*
   * ---------------------------------------------------------
   * RISK BADGE
   * ---------------------------------------------------------
   */
  const getRiskBadgeClass = (risk: RiskLevel | "") => {
    switch (risk) {
      case "Low":
        return "bg-green-100 text-green-700 border-green-200";

      case "Moderate":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";

      case "High":
        return "bg-orange-100 text-orange-700 border-orange-200";

      case "Significant":
        return "bg-red-100 text-red-700 border-red-200";

      default:
        return "bg-gray-100 text-gray-500 border-gray-200";
    }
  };

  /*
   * ---------------------------------------------------------
   * SUMMARY COUNTS
   * ---------------------------------------------------------
   */
  const totalRisks = assessments.length;

  const significantRisks = assessments.filter(
    (assessment) => assessment.significantRisk === "Yes"
  ).length;

  const fraudRisks = assessments.filter(
    (assessment) => assessment.fraudRisk === "Yes"
  ).length;

  const highRisks = assessments.filter(
    (assessment) =>
      assessment.combinedRisk === "High" ||
      assessment.combinedRisk === "Significant"
  ).length;

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */
  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() =>
              router.push(
                `/engagements/${engagementId}/risk-assessment`
              )
            }
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            <ArrowLeft size={18} />
            Back to Risk Assessment
          </button>

          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Scale size={23} />
                </div>

                <div>
                  <p className="text-sm font-medium text-blue-600">
                    Phase 2 • Section 2.6
                  </p>

                  <h1 className="text-2xl font-bold text-gray-900">
                    Combined Risk Assessment
                  </h1>
                </div>
              </div>

              <p className="max-w-3xl text-sm text-gray-600">
                Combine inherent risk and control risk to determine the
                overall assessed risk for each account, disclosure, or
                assertion and establish the appropriate audit response.
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

        {/* Information banner */}
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-blue-600">
              <ClipboardCheck size={21} />
            </div>

            <div>
              <h2 className="font-semibold text-blue-900">
                Purpose of this workpaper
              </h2>

              <p className="mt-1 text-sm leading-6 text-blue-800">
                This section documents the auditor&apos;s overall risk
                assessment after considering inherent risk, control risk,
                likelihood, magnitude, fraud risk, and whether the risk
                should be treated as significant.
              </p>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Total Risks
                </p>

                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {totalRisks}
                </p>
              </div>

              <div className="rounded-lg bg-gray-100 p-3 text-gray-700">
                <BarChart3 size={21} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  High / Significant
                </p>

                <p className="mt-1 text-2xl font-bold text-red-600">
                  {highRisks}
                </p>
              </div>

              <div className="rounded-lg bg-red-50 p-3 text-red-600">
                <AlertTriangle size={21} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Significant Risks
                </p>

                <p className="mt-1 text-2xl font-bold text-orange-600">
                  {significantRisks}
                </p>
              </div>

              <div className="rounded-lg bg-orange-50 p-3 text-orange-600">
                <Target size={21} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Fraud Risks
                </p>

                <p className="mt-1 text-2xl font-bold text-purple-600">
                  {fraudRisks}
                </p>
              </div>

              <div className="rounded-lg bg-purple-50 p-3 text-purple-600">
                <ShieldCheck size={21} />
              </div>
            </div>
          </div>
        </div>

        {/* Errors */}
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

        {/* Risk assessments */}
        <div className="space-y-6">
          {assessments.map((assessment, index) => (
            <div
              key={assessment.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              {/* Card header */}
              <div className="flex flex-col justify-between gap-3 border-b border-gray-200 bg-gray-50 px-6 py-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                    {index + 1}
                  </div>

                  <div>
                    <h2 className="font-semibold text-gray-900">
                      Risk Assessment {index + 1}
                    </h2>

                    <p className="text-xs text-gray-500">
                      Combined assessment of inherent and control risk
                    </p>
                  </div>
                </div>

                {assessments.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      removeAssessment(assessment.id)
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                )}
              </div>

              <div className="space-y-6 p-6">
                {/* Account / Assertion */}
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <FileText
                      size={18}
                      className="text-blue-600"
                    />

                    <h3 className="font-semibold text-gray-900">
                      Risk Identification
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Account / Disclosure{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <input
                        type="text"
                        value={assessment.accountDisclosure}
                        onChange={(e) =>
                          updateAssessment(
                            assessment.id,
                            "accountDisclosure",
                            e.target.value
                          )
                        }
                        placeholder="e.g. Revenue, Inventory, Trade Receivables"
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Assertion{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <select
                          value={assessment.assertion}
                          onChange={(e) =>
                            updateAssessment(
                              assessment.id,
                              "assertion",
                              e.target.value
                            )
                          }
                          className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                  </div>
                </section>

                {/* Risk assessment */}
                <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <TrendingUp
                      size={18}
                      className="text-orange-600"
                    />

                    <h3 className="font-semibold text-gray-900">
                      Risk Assessment
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {/* Inherent risk */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Inherent Risk{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <select
                          value={assessment.inherentRisk}
                          onChange={(e) =>
                            updateAssessment(
                              assessment.id,
                              "inherentRisk",
                              e.target.value
                            )
                          }
                          className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="">
                            Select inherent risk
                          </option>

                          {riskLevels.map((level) => (
                            <option key={level} value={level}>
                              {level}
                            </option>
                          ))}
                        </select>

                        <ChevronDown
                          size={17}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                      </div>

                      {assessment.inherentRisk && (
                        <span
                          className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getRiskBadgeClass(
                            assessment.inherentRisk
                          )}`}
                        >
                          {assessment.inherentRisk}
                        </span>
                      )}
                    </div>

                    {/* Control risk */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Control Risk{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <select
                          value={assessment.controlRisk}
                          onChange={(e) =>
                            updateAssessment(
                              assessment.id,
                              "controlRisk",
                              e.target.value
                            )
                          }
                          className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="">
                            Select control risk
                          </option>

                          {riskLevels.map((level) => (
                            <option key={level} value={level}>
                              {level}
                            </option>
                          ))}
                        </select>

                        <ChevronDown
                          size={17}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                      </div>

                      {assessment.controlRisk && (
                        <span
                          className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getRiskBadgeClass(
                            assessment.controlRisk
                          )}`}
                        >
                          {assessment.controlRisk}
                        </span>
                      )}
                    </div>

                    {/* Combined risk */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Combined Risk{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <select
                          value={assessment.combinedRisk}
                          onChange={(e) =>
                            updateAssessment(
                              assessment.id,
                              "combinedRisk",
                              e.target.value
                            )
                          }
                          className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="">
                            Select combined risk
                          </option>

                          {riskLevels.map((level) => (
                            <option key={level} value={level}>
                              {level}
                            </option>
                          ))}
                        </select>

                        <ChevronDown
                          size={17}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                      </div>

                      {assessment.combinedRisk && (
                        <span
                          className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getRiskBadgeClass(
                            assessment.combinedRisk
                          )}`}
                        >
                          {assessment.combinedRisk}
                        </span>
                      )}
                    </div>

                    {/* Likelihood */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Likelihood{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <select
                          value={assessment.likelihood}
                          onChange={(e) =>
                            updateAssessment(
                              assessment.id,
                              "likelihood",
                              e.target.value
                            )
                          }
                          className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="">
                            Select likelihood
                          </option>

                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>

                        <ChevronDown
                          size={17}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                      </div>
                    </div>

                    {/* Magnitude */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Magnitude{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <select
                          value={assessment.magnitude}
                          onChange={(e) =>
                            updateAssessment(
                              assessment.id,
                              "magnitude",
                              e.target.value
                            )
                          }
                          className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="">
                            Select magnitude
                          </option>

                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>

                        <ChevronDown
                          size={17}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                      </div>
                    </div>

                    {/* Significant risk */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Significant Risk{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <select
                          value={assessment.significantRisk}
                          onChange={(e) =>
                            updateAssessment(
                              assessment.id,
                              "significantRisk",
                              e.target.value
                            )
                          }
                          className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="">
                            Select option
                          </option>

                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>

                        <ChevronDown
                          size={17}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                      </div>
                    </div>

                    {/* Fraud risk */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Fraud Risk{" "}
                        <span className="text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <select
                          value={assessment.fraudRisk}
                          onChange={(e) =>
                            updateAssessment(
                              assessment.id,
                              "fraudRisk",
                              e.target.value
                            )
                          }
                          className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="">
                            Select option
                          </option>

                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>

                        <ChevronDown
                          size={17}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Rationale */}
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <CircleAlert
                      size={18}
                      className="text-amber-600"
                    />

                    <h3 className="font-semibold text-gray-900">
                      Risk Rationale
                    </h3>
                  </div>

                  <textarea
                    value={assessment.rationale}
                    onChange={(e) =>
                      updateAssessment(
                        assessment.id,
                        "rationale",
                        e.target.value
                      )
                    }
                    rows={5}
                    placeholder="Explain why the risk was assessed at this level. Consider complexity, subjectivity, uncertainty, susceptibility to fraud, prior findings, changes in the business, control deficiencies, and other relevant factors."
                    className="w-full resize-y rounded-lg border border-gray-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </section>

                {/* Planned response */}
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <ShieldCheck
                      size={18}
                      className="text-green-600"
                    />

                    <h3 className="font-semibold text-gray-900">
                      Planned Audit Response
                    </h3>
                  </div>

                  <textarea
                    value={assessment.plannedResponse}
                    onChange={(e) =>
                      updateAssessment(
                        assessment.id,
                        "plannedResponse",
                        e.target.value
                      )
                    }
                    rows={5}
                    placeholder="Describe the planned audit response, including controls reliance, substantive procedures, additional testing, specialist involvement, timing, sample approach, confirmations, analytics, or other procedures."
                    className="w-full resize-y rounded-lg border border-gray-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </section>

                {/* Assessment conclusion */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                      <Target size={19} />
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Assessment Summary
                      </h4>

                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        {assessment.combinedRisk
                          ? `The assessed combined risk for this area is ${assessment.combinedRisk}.`
                          : "Select the combined risk level to display the assessment summary."}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {assessment.significantRisk && (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              assessment.significantRisk === "Yes"
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            Significant Risk:{" "}
                            {assessment.significantRisk}
                          </span>
                        )}

                        {assessment.fraudRisk && (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              assessment.fraudRisk === "Yes"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            Fraud Risk: {assessment.fraudRisk}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add another */}
        <button
          type="button"
          onClick={addAssessment}
          disabled={saving || continuing}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white px-5 py-4 text-sm font-semibold text-gray-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={19} />
          Add Another Risk Assessment
        </button>

        {/* Bottom actions */}
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {/* Back */}
          <button
            type="button"
            disabled={saving || continuing}
            onClick={() =>
              router.push(
                `/engagements/${engagementId}/risk-assessment`
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft size={17} />
            Back to Risk Assessment
          </button>

          {/* Right actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Saved message */}
            {saved && !saving && (
              <div className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                <CheckCircle2 size={18} />
                Workpaper saved successfully
              </div>
            )}

            {/* Save */}
            <button
              type="button"
              disabled={saving || continuing}
              onClick={handleSave}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={18} />

              {saving ? "Saving..." : "Save Workpaper"}
            </button>

            {/* Continue */}
            <button
              type="button"
              disabled={saving || continuing}
              onClick={handleContinue}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {continuing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Continuing...
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