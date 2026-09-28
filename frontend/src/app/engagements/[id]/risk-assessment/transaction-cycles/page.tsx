"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Calculator,
  CheckCircle2,
  CircleAlert,
  FileText,
  Loader2,
  Package,
  RefreshCw,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";

import {
  getEngagement,
  getTransactionCycleAssessmentsByEngagement,
  type TransactionCycleAssessment,
} from "@/lib/api";

type CycleStatus =
  | "not_assessed"
  | "assessed";

type TransactionCycle = {
  id: string;
  backendType: TransactionCycleAssessment["cycle_type"];
  title: string;
  description: string;
  icon: typeof Wallet;
};

const transactionCycles: TransactionCycle[] = [
  {
    id: "revenue",
    backendType: "revenue",
    title: "Revenue",
    description:
      "Assess revenue streams, significant accounts, assertions, risks, billing, receivables, collections, revenue recognition, and supporting applications.",
    icon: Wallet,
  },
  {
    id: "purchasing-payables",
    backendType: "purchasing_payables",
    title: "Purchasing & Payables",
    description:
      "Assess procurement, purchases, goods and services received, supplier invoices, trade payables, expenses, approvals, and supporting applications.",
    icon: ShoppingCart,
  },
  {
    id: "payroll",
    backendType: "payroll",
    title: "Payroll",
    description:
      "Assess payroll processes, employee costs, deductions, approvals, payments, payroll reconciliations, and supporting applications.",
    icon: Users,
  },
  {
    id: "inventory",
    backendType: "inventory",
    title: "Inventory",
    description:
      "Assess inventory movements, stock balances, valuation, existence, counts, controls, and supporting applications.",
    icon: Package,
  },
  {
    id: "financial-statement-close",
    backendType: "financial_statement_close",
    title: "Financial Statement Close",
    description:
      "Assess the financial close process, journal entries, reconciliations, adjustments, review procedures, and financial reporting.",
    icon: Calculator,
  },
  {
    id: "other-significant-processes",
    backendType: "other_significant_processes",
    title: "Other Significant Processes",
    description:
      "Document and assess other significant processes that may affect the financial statements or audit risk.",
    icon: Boxes,
  },
];

function getStatusLabel(
  status: CycleStatus
): string {
  return status === "assessed"
    ? "Assessed"
    : "Not Assessed";
}

export default function TransactionCyclesPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = String(params.id);

  const [engagement, setEngagement] =
    useState<any>(null);

  const [assessments, setAssessments] =
    useState<TransactionCycleAssessment[]>(
      []
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        engagementData,
        assessmentData,
      ] = await Promise.all([
        getEngagement(engagementId),
        getTransactionCycleAssessmentsByEngagement(
          engagementId
        ),
      ]);

      setEngagement(engagementData);
      setAssessments(assessmentData);
    } catch (err) {
      console.error(
        "Failed to load transaction cycles:",
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : "Failed to load transaction cycle assessments.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [engagementId]);

  const assessmentMap = useMemo(() => {
    const map = new Map<
      string,
      TransactionCycleAssessment
    >();

    assessments.forEach((assessment) => {
      map.set(
        assessment.cycle_type,
        assessment
      );
    });

    return map;
  }, [assessments]);

  const cycleStatuses = useMemo(() => {
    return transactionCycles.map((cycle) => {
      const assessment =
        assessmentMap.get(
          cycle.backendType
        );

      const status: CycleStatus =
        assessment?.status === "assessed"
          ? "assessed"
          : "not_assessed";

      return {
        cycle,
        assessment,
        status,
      };
    });
  }, [assessmentMap]);

  const assessedCount =
    cycleStatuses.filter(
      (item) =>
        item.status === "assessed"
    ).length;

  const notAssessedCount =
    transactionCycles.length -
    assessedCount;

  const engagementCode =
    engagement?.engagement_code ??
    engagement?.code ??
    `AUD-${engagementId}`;

  const engagementName =
    engagement?.name ??
    engagement?.client_name ??
    engagement?.client?.name ??
    "Financial Statement Audit";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <Link
                  href={`/engagements/${engagementId}/risk-assessment`}
                  className="transition-colors hover:text-blue-600"
                >
                  Risk Assessment
                </Link>

                <span>/</span>

                <span className="font-medium text-slate-700">
                  Transaction Cycles
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Transaction Cycles
              </h1>

              <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">
                Identify significant accounts,
                transaction cycles, disclosure
                processes and IT applications
                supporting the financial reporting
                process.
              </p>
            </div>

            <div className="hidden shrink-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 md:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <FileText size={19} />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Audit Area
                </p>

                <p className="text-sm font-semibold text-slate-800">
                  Risk Assessment
                </p>
              </div>
            </div>
          </div>

          {/* Engagement information */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <span className="text-xs text-slate-500">
                Engagement
              </span>

              <span className="ml-2 text-sm font-semibold text-slate-800">
                {engagementCode}
              </span>

              <span className="ml-2 text-sm text-slate-500">
                — {engagementName}
              </span>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
              <span className="text-xs font-medium text-blue-600">
                Phase
              </span>

              <span className="ml-2 text-sm font-semibold text-blue-800">
                2 — Risk Assessment & Strategy
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Loading */}
        {loading && (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <Loader2
                size={30}
                className="animate-spin text-blue-600"
              />

              <p className="text-sm">
                Loading transaction cycle assessments...
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <CircleAlert size={21} />
              </div>

              <div className="flex-1">
                <h2 className="font-semibold text-red-900">
                  Unable to load transaction cycles
                </h2>

                <p className="mt-1 text-sm leading-6 text-red-700">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={loadData}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  <RefreshCw size={15} />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Summary */}
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Total Cycles
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {transactionCycles.length}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Significant transaction cycles
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                  Assessed
                </p>

                <p className="mt-2 text-2xl font-bold text-emerald-800">
                  {assessedCount}
                </p>

                <p className="mt-1 text-sm text-emerald-700">
                  Cycle assessments completed
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                  Not Assessed
                </p>

                <p className="mt-2 text-2xl font-bold text-amber-800">
                  {notAssessedCount}
                </p>

                <p className="mt-1 text-sm text-amber-700">
                  Cycle assessments remaining
                </p>
              </div>
            </div>

            {/* Intro */}
            <div className="mb-8 rounded-2xl border border-blue-100 bg-blue-50 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <CheckCircle2 size={22} />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Significant Transaction Cycles
                  </h2>

                  <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">
                    Review each significant process
                    relevant to this engagement. Open
                    each cycle to document significant
                    accounts, assertions, disclosure
                    processes, IT applications,
                    dependencies, and other audit
                    considerations.
                  </p>
                </div>
              </div>
            </div>

            {/* Cards */}
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {cycleStatuses.map(
                ({
                  cycle,
                  assessment,
                  status,
                }) => {
                  const Icon = cycle.icon;

                  const href =
                    `/engagements/${engagementId}` +
                    `/risk-assessment/transaction-cycles/` +
                    cycle.id;

                  const isAssessed =
                    status === "assessed";

                  return (
                    <Link
                      key={cycle.id}
                      href={href}
                      className={`group rounded-2xl border bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                        isAssessed
                          ? "border-emerald-200 hover:border-emerald-300"
                          : "border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                            isAssessed
                              ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600"
                          }`}
                        >
                          <Icon size={23} />
                        </div>

                        <div
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isAssessed
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {isAssessed ? (
                            <CheckCircle2 size={13} />
                          ) : (
                            <CircleAlert size={13} />
                          )}

                          {getStatusLabel(status)}
                        </div>
                      </div>

                      <h3 className="mt-5 text-base font-semibold text-slate-900">
                        {cycle.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {cycle.description}
                      </p>

                      {assessment?.updated_at && (
                        <p className="mt-3 text-xs text-slate-400">
                          Last updated:{" "}
                          {new Date(
                            assessment.updated_at
                          ).toLocaleDateString()}
                        </p>
                      )}

                      <div
                        className={`mt-5 flex items-center gap-2 text-xs font-semibold ${
                          isAssessed
                            ? "text-emerald-600"
                            : "text-blue-600"
                        }`}
                      >
                        <span>
                          {isAssessed
                            ? "Open assessment"
                            : "Configure assessment"}
                        </span>

                        <ArrowRight
                          size={14}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      </div>
                    </Link>
                  );
                }
              )}
            </div>

            {/* Additional audit areas */}
            <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cross-Cutting Workpapers
                </p>

                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  Additional Audit Areas
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  These areas support the wider risk
                  assessment and audit strategy and are
                  documented separately.
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  "Group Audits",
                  "Internal Audits",
                  "Auditor's Experts",
                  "Sampling",
                  "Accounting Estimates",
                  "Financial Statement Close",
                  "Data Analytics",
                  "External Confirmations",
                  "Sustainability",
                  "Written Representations",
                  "Selected Items",
                  "Service Organizations",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/engagements/${engagementId}/risk-assessment`
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <ArrowLeft size={17} />

                <span>
                  Back to Risk Assessment
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const firstCycle =
                    transactionCycles[0];

                  router.push(
                    `/engagements/${engagementId}/risk-assessment/transaction-cycles/${firstCycle.id}`
                  );
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                <span>
                  Start Assessment
                </span>

                <ArrowRight size={17} />
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}