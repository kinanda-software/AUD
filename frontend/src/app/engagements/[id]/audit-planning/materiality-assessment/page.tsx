"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
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
} from "lucide-react";

import {
  createMaterialityAssessment,
  getEngagement,
  getMaterialityAssessmentByEngagement,
  updateMaterialityAssessment,
  type Engagement,
  type MaterialityAssessment,
} from "@/lib/api";

type FormData = {
  benchmark: string;
  benchmark_amount: string;
  benchmark_percentage: string;
  overall_materiality: string;
  performance_materiality: string;
  clearly_trivial_threshold: string;
  rationale: string;
  qualitative_factors: string;
  reassessment_required: boolean;
  reassessment_reason: string;
};

const initialForm: FormData = {
  benchmark: "profit_before_tax",
  benchmark_amount: "",
  benchmark_percentage: "",
  overall_materiality: "",
  performance_materiality: "",
  clearly_trivial_threshold: "",
  rationale: "",
  qualitative_factors: "",
  reassessment_required: false,
  reassessment_reason: "",
};

const benchmarkOptions = [
  {
    value: "revenue",
    label: "Revenue",
  },
  {
    value: "profit_before_tax",
    label: "Profit Before Tax",
  },
  {
    value: "total_assets",
    label: "Total Assets",
  },
  {
    value: "equity",
    label: "Equity",
  },
  {
    value: "expenses",
    label: "Expenses",
  },
  {
    value: "other",
    label: "Other",
  },
];

export default function MaterialityAssessmentPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = params.id as string;

  const [engagement, setEngagement] =
    useState<Engagement | null>(null);

  const [assessment, setAssessment] =
    useState<MaterialityAssessment | null>(null);

  const [form, setForm] =
    useState<FormData>(initialForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const [
          engagementData,
          assessmentData,
        ] = await Promise.all([
          getEngagement(engagementId),
          getMaterialityAssessmentByEngagement(
            engagementId
          ),
        ]);

        setEngagement(engagementData);

        if (assessmentData) {
          setAssessment(assessmentData);

          setForm({
            benchmark:
              assessmentData.benchmark ||
              "profit_before_tax",

            benchmark_amount:
              assessmentData.benchmark_amount?.toString() ||
              "",

            benchmark_percentage:
              assessmentData.benchmark_percentage?.toString() ||
              "",

            overall_materiality:
              assessmentData.overall_materiality?.toString() ||
              "",

            performance_materiality:
              assessmentData.performance_materiality?.toString() ||
              "",

            clearly_trivial_threshold:
              assessmentData.clearly_trivial_threshold?.toString() ||
              "",

            rationale:
              assessmentData.rationale || "",

            qualitative_factors:
              assessmentData.qualitative_factors || "",

            reassessment_required:
              assessmentData.reassessment_required ||
              false,

            reassessment_reason:
              assessmentData.reassessment_reason ||
              "",
          });
        }
      } catch (err) {
        console.error(
          "Failed to load materiality assessment:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load materiality assessment."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [engagementId]);

  function updateField<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  }

  function calculateOverallMateriality() {
    setError("");
    setSuccess("");
    setCalculating(true);

    const amountText =
      form.benchmark_amount.trim();

    const percentageText =
      form.benchmark_percentage.trim();

    if (!amountText) {
      setError(
        "Please enter the Benchmark Amount first."
      );
      setCalculating(false);
      return;
    }

    if (!percentageText) {
      setError(
        "Please enter the Benchmark Percentage first."
      );
      setCalculating(false);
      return;
    }

    const amount = Number(amountText);
    const percentage = Number(percentageText);

    if (!Number.isFinite(amount) || amount < 0) {
      setError(
        "Benchmark Amount must be a valid positive number."
      );
      setCalculating(false);
      return;
    }

    if (
      !Number.isFinite(percentage) ||
      percentage < 0
    ) {
      setError(
        "Benchmark Percentage must be a valid positive number."
      );
      setCalculating(false);
      return;
    }

    const calculated =
      (amount * percentage) / 100;

    const formattedResult =
      calculated.toFixed(2);

    setForm((current) => ({
      ...current,
      overall_materiality: formattedResult,
    }));

    setSuccess(
      `Overall materiality calculated successfully: ${Number(
        formattedResult
      ).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    );

    setCalculating(false);
  }

  /*
   * Save the materiality assessment.
   *
   * When continueToNext = false:
   *     Save and remain on 1.2.
   *
   * When continueToNext = true:
   *     Save 1.2 first, then move to 1.3.
   */
  async function saveMaterialityAssessment(
    continueToNext: boolean
  ) {
    setError("");
    setSuccess("");

    if (continueToNext) {
      setContinuing(true);
    } else {
      setSaving(true);
    }

    try {
      const payload = {
        engagement: Number(engagementId),

        benchmark: form.benchmark,

        benchmark_amount:
          form.benchmark_amount || "0",

        benchmark_percentage:
          form.benchmark_percentage || "0",

        overall_materiality:
          form.overall_materiality || "0",

        performance_materiality:
          form.performance_materiality || "0",

        clearly_trivial_threshold:
          form.clearly_trivial_threshold || "0",

        rationale:
          form.rationale,

        qualitative_factors:
          form.qualitative_factors,

        reassessment_required:
          form.reassessment_required,

        reassessment_reason:
          form.reassessment_reason,
      };

      let savedAssessment: MaterialityAssessment;

      if (assessment) {
        savedAssessment =
          await updateMaterialityAssessment(
            assessment.id,
            payload
          );
      } else {
        savedAssessment =
          await createMaterialityAssessment(
            payload
          );
      }

      /*
       * Keep the newly saved record in state.
       */
      setAssessment(savedAssessment);

      /*
       * If the user selected Save & Continue,
       * move to Workpaper 1.3 only AFTER the
       * backend confirms the save succeeded.
       */
      if (continueToNext) {
        router.push(
          `/engagements/${engagementId}/audit-planning/audit-scope`
        );

        return;
      }

      setSuccess(
        assessment
          ? "Materiality assessment updated successfully."
          : "Materiality assessment saved successfully."
      );
    } catch (err) {
      console.error(
        "Materiality assessment save error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save materiality assessment."
      );
    } finally {
      setSaving(false);
      setContinuing(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    await saveMaterialityAssessment(false);
  }

  async function handleSaveAndContinue() {
    await saveMaterialityAssessment(true);
  }

  function handleBack() {
    router.push(
      `/engagements/${engagementId}/audit-planning`
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <main className="min-h-screen bg-gray-50 p-6">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-xl bg-white p-8 shadow-sm">
              <div className="flex items-center gap-3 text-gray-600">
                <Loader2 className="h-5 w-5 animate-spin" />

                <p>
                  Loading materiality assessment...
                </p>
              </div>
            </div>
          </div>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="mx-auto max-w-6xl">

          {/* ==================================================
              HEADER
          ================================================== */}

          <div className="mb-6">

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

                  <div className="mb-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    <span>Phase 1</span>
                    <span>/</span>
                    <span>Audit Planning</span>
                    <span>/</span>

                    <span className="font-medium text-gray-700">
                      1.2 Materiality Assessment
                    </span>
                  </div>

                  <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                    1.2 Materiality Assessment
                  </h1>

                  {engagement && (
                    <p className="mt-2 text-sm text-gray-600">
                      {engagement.engagement_code} —{" "}
                      {engagement.title}
                    </p>
                  )}

                </div>
              </div>

              <div className="flex flex-wrap gap-3">

                {/* Save only */}
                <button
                  type="submit"
                  form="materiality-assessment-form"
                  disabled={
                    saving || continuing
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                  onClick={
                    handleSaveAndContinue
                  }
                  disabled={
                    saving || continuing
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
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
          </div>

          {/* ==================================================
              WORKFLOW INDICATOR
          ================================================== */}

          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-2 overflow-x-auto">

                {/* 1.1 */}
                <div className="flex shrink-0 items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                  <CheckCircle2 className="h-4 w-4" />

                  <span>
                    1.1 Planning Assessment
                  </span>
                </div>

                <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />

                {/* 1.2 */}
                <div className="flex shrink-0 items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white">
                  <FileText className="h-4 w-4" />

                  <span>
                    1.2 Materiality Assessment
                  </span>
                </div>

                <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />

                {/* 1.3 */}
                <div className="flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600">
                  <span>
                    1.3 Audit Scope
                  </span>
                </div>

                <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />

                {/* 1.4 */}
                <div className="hidden shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-500 md:flex">
                  <span>
                    1.4 Audit Team
                  </span>
                </div>

              </div>

              <p className="shrink-0 text-xs text-gray-500">
                Step 2 of 6
              </p>

            </div>
          </div>

          {/* ==================================================
              ERROR
          ================================================== */}

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">

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

          {/* ==================================================
              SUCCESS
          ================================================== */}

          {success && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">

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
            id="materiality-assessment-form"
            onSubmit={handleSubmit}
          >

            {/* ==================================================
                SECTION 1
            ================================================== */}

            <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

              <div className="mb-5 flex items-start gap-3">

                <div className="rounded-lg bg-blue-50 p-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    1. Materiality Benchmark
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Select the financial benchmark used as the
                    basis for determining overall materiality.
                  </p>
                </div>

              </div>

              <div className="grid gap-5 md:grid-cols-2">

                {/* Benchmark */}
                <div>
                  <label
                    htmlFor="benchmark"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Benchmark
                  </label>

                  <select
                    id="benchmark"
                    value={form.benchmark}
                    onChange={(event) =>
                      updateField(
                        "benchmark",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {benchmarkOptions.map(
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
                </div>

                {/* Benchmark Amount */}
                <div>
                  <label
                    htmlFor="benchmark_amount"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Benchmark Amount
                  </label>

                  <input
                    id="benchmark_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.benchmark_amount}
                    onChange={(event) =>
                      updateField(
                        "benchmark_amount",
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Percentage */}
                <div>
                  <label
                    htmlFor="benchmark_percentage"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Benchmark Percentage (%)
                  </label>

                  <input
                    id="benchmark_percentage"
                    type="number"
                    min="0"
                    step="0.0001"
                    value={form.benchmark_percentage}
                    onChange={(event) =>
                      updateField(
                        "benchmark_percentage",
                        event.target.value
                      )
                    }
                    placeholder="0.0000"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

              </div>

              {/* Calculation box */}
              <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4">

                <p className="text-sm text-blue-800">
                  Overall materiality can be calculated as:
                </p>

                <p className="mt-1 font-mono text-sm font-semibold text-blue-900">
                  Benchmark Amount × Benchmark Percentage ÷ 100
                </p>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">

                  <button
                    type="button"
                    onClick={
                      calculateOverallMateriality
                    }
                    disabled={calculating}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {calculating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}

                    {calculating
                      ? "Calculating..."
                      : "Calculate Overall Materiality"}
                  </button>

                  {form.overall_materiality && (
                    <span className="text-sm font-semibold text-blue-900">
                      Result:{" "}
                      {Number(
                        form.overall_materiality
                      ).toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </span>
                  )}

                </div>
              </div>
            </section>

            {/* ==================================================
                SECTION 2
            ================================================== */}

            <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

              <div className="mb-5">
                <h2 className="text-lg font-semibold text-gray-900">
                  2. Materiality Levels
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Record the materiality thresholds determined
                  for the engagement.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-3">

                {/* Overall */}
                <div>
                  <label
                    htmlFor="overall_materiality"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Overall Materiality
                  </label>

                  <input
                    id="overall_materiality"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.overall_materiality}
                    onChange={(event) =>
                      updateField(
                        "overall_materiality",
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Performance */}
                <div>
                  <label
                    htmlFor="performance_materiality"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Performance Materiality
                  </label>

                  <input
                    id="performance_materiality"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.performance_materiality}
                    onChange={(event) =>
                      updateField(
                        "performance_materiality",
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Clearly trivial */}
                <div>
                  <label
                    htmlFor="clearly_trivial_threshold"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Clearly Trivial Threshold
                  </label>

                  <input
                    id="clearly_trivial_threshold"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.clearly_trivial_threshold
                    }
                    onChange={(event) =>
                      updateField(
                        "clearly_trivial_threshold",
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

              </div>
            </section>

            {/* ==================================================
                SECTION 3
            ================================================== */}

            <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

              <div className="mb-5">
                <h2 className="text-lg font-semibold text-gray-900">
                  3. Basis and Rationale
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Explain why the selected benchmark and
                  materiality levels are appropriate.
                </p>
              </div>

              <div className="space-y-5">

                {/* Rationale */}
                <div>
                  <label
                    htmlFor="rationale"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Rationale
                  </label>

                  <textarea
                    id="rationale"
                    rows={5}
                    value={form.rationale}
                    onChange={(event) =>
                      updateField(
                        "rationale",
                        event.target.value
                      )
                    }
                    placeholder="Explain the basis for selecting the benchmark and materiality levels..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Qualitative factors */}
                <div>
                  <label
                    htmlFor="qualitative_factors"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Qualitative Factors
                  </label>

                  <textarea
                    id="qualitative_factors"
                    rows={5}
                    value={
                      form.qualitative_factors
                    }
                    onChange={(event) =>
                      updateField(
                        "qualitative_factors",
                        event.target.value
                      )
                    }
                    placeholder="Document qualitative factors that may influence materiality..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

              </div>
            </section>

            {/* ==================================================
                SECTION 4
            ================================================== */}

            <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">

              <div className="mb-5">
                <h2 className="text-lg font-semibold text-gray-900">
                  4. Reassessment
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Indicate whether materiality may need to be
                  reassessed during the engagement.
                </p>
              </div>

              <label className="flex cursor-pointer items-start gap-3">

                <input
                  type="checkbox"
                  checked={
                    form.reassessment_required
                  }
                  onChange={(event) =>
                    updateField(
                      "reassessment_required",
                      event.target.checked
                    )
                  }
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />

                <span>
                  <span className="block text-sm font-medium text-gray-900">
                    Reassessment Required
                  </span>

                  <span className="mt-1 block text-sm text-gray-500">
                    Select this if changes in circumstances may
                    require the materiality assessment to be
                    reconsidered.
                  </span>
                </span>

              </label>

              {form.reassessment_required && (
                <div className="mt-5">

                  <label
                    htmlFor="reassessment_reason"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Reassessment Reason
                  </label>

                  <textarea
                    id="reassessment_reason"
                    rows={4}
                    value={
                      form.reassessment_reason
                    }
                    onChange={(event) =>
                      updateField(
                        "reassessment_reason",
                        event.target.value
                      )
                    }
                    placeholder="Explain why reassessment is required..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>
              )}

            </section>

            {/* ==================================================
                ACTIONS
            ================================================== */}

            <div className="flex flex-col-reverse gap-3 pb-8 sm:flex-row sm:items-center sm:justify-between">

              <Link
                href={`/engagements/${engagementId}/audit-planning`}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />

                Back to Audit Planning
              </Link>

              <div className="flex flex-col gap-3 sm:flex-row">

                {/* Save only */}
                <button
                  type="submit"
                  disabled={
                    saving || continuing
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  {saving
                    ? "Saving..."
                    : assessment
                      ? "Update Materiality Assessment"
                      : "Save Materiality Assessment"}
                </button>

                {/* Save & Continue */}
                <button
                  type="button"
                  onClick={
                    handleSaveAndContinue
                  }
                  disabled={
                    saving || continuing
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {continuing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}

                  {continuing
                    ? "Saving..."
                    : "Save & Continue to 1.3"}
                </button>

              </div>
            </div>

          </form>
        </div>
      </main>
    </AppLayout>
  );
}