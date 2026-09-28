"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileSearch,
  GitBranch,
  ListChecks,
  Settings2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";

const workpapers = [
  {
    number: "2.1",
    title: "Transaction Cycles",
    route: "",
    status: "Current",
    icon: GitBranch,
  },
  {
    number: "2.2",
    title: "Process Flow & Walkthroughs",
    route: "2.2",
    status: "Open",
    icon: FileSearch,
  },
  {
    number: "2.3",
    title: "Risk Points",
    route: "2.3",
    status: "Open",
    icon: ShieldAlert,
  },
  {
    number: "2.4",
    title: "Controls",
    route: "2.4",
    status: "Open",
    icon: ShieldCheck,
  },
  {
    number: "2.5",
    title: "Controls Testing",
    route: "2.5",
    status: "Open",
    icon: ListChecks,
  },
  {
    number: "2.6",
    title: "Combined Risk Assessment",
    route: "2.6",
    status: "Open",
    icon: ClipboardCheck,
  },
  {
    number: "2.7",
    title: "Tests of Controls",
    route: "2.7",
    status: "Open",
    icon: CheckCircle2,
  },
  {
    number: "2.8",
    title: "Management Override",
    route: "2.8",
    status: "Open",
    icon: ShieldAlert,
  },
  {
    number: "2.9",
    title: "Substantive Procedures",
    route: "2.9",
    status: "Open",
    icon: FileSearch,
  },
  {
    number: "2.10",
    title: "General Audit Procedures",
    route: "2.10",
    status: "Open",
    icon: ClipboardCheck,
  },
  {
    number: "2.11",
    title: "Audit Strategy",
    route: "2.11",
    status: "Open",
    icon: Settings2,
  },
];

const transactionCycles = [
  {
    title: "Revenue",
    description:
      "Sales, revenue recognition, receivables and related assertions.",
    route: "revenue",
  },
  {
    title: "Purchasing & Payables",
    description:
      "Purchases, suppliers, payables and expenditure processes.",
    route: "purchasing-payables",
  },
  {
    title: "Payroll",
    description:
      "Employees, salaries, payroll processing and related liabilities.",
    route: "payroll",
  },
  {
    title: "Inventory",
    description:
      "Inventory movements, valuation, counts and related controls.",
    route: "inventory",
  },
  {
    title: "Financial Statement Close",
    description:
      "Period-end close, journals, reconciliations and financial reporting.",
    route: "financial-statement-close",
  },
  {
    title: "Other Significant Processes",
    description:
      "Other processes identified as significant to the engagement.",
    route: "other-significant-processes",
  },
];

const crossCuttingTopics = [
  "Group Audits",
  "Internal Audit",
  "Auditor's Expert",
  "Sampling",
  "Accounting Estimates",
  "Financial Statement Close",
  "Data Analytics",
  "External Confirmations",
  "Sustainability",
  "Written Representations",
  "Selected Items",
  "Service Organizations",
  "Complex Transactions",
];

export default function RiskAssessmentPage() {
  const params = useParams();

  const engagementId = String(params?.id ?? "");

  const baseRoute =
    `/engagements/${engagementId}/risk-assessment`;

  return (
    <AppLayout>
      <div className="w-full">
        {/* HEADER */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                  PHASE 2
                </span>

                <ChevronRight
                  size={14}
                  className="text-slate-300"
                />

                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Risk Assessment & Strategy
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Risk Assessment & Strategy
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                AUD-001 — Financial Statement Audit
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Engagement
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  #{engagementId}
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  Phase Status
                </p>

                <p className="mt-1 text-sm font-bold text-amber-800">
                  In Progress
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 border-t border-slate-200">
            <div className="px-6 py-4">
              <p className="text-xs text-slate-400">
                Workpapers
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                11
              </p>
            </div>

            <div className="border-l border-slate-200 px-6 py-4">
              <p className="text-xs text-slate-400">
                Current
              </p>

              <p className="mt-1 text-lg font-bold text-blue-700">
                2.1
              </p>
            </div>

            <div className="border-l border-slate-200 px-6 py-4">
              <p className="text-xs text-slate-400">
                Assessment Area
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                Transaction Cycles
              </p>
            </div>
          </div>
        </div>

        {/* WORKSPACE */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          {/* WORKPAPER NAVIGATION */}
          <section className="h-fit overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Phase 2
              </p>

              <h2 className="mt-1 text-base font-bold text-slate-900">
                Workpaper Navigation
              </h2>
            </div>

            <div className="p-3">
              <div className="space-y-1">
                {workpapers.map((workpaper) => {
                  const Icon = workpaper.icon;

                  const isCurrent =
                    workpaper.number === "2.1";

                  if (isCurrent) {
                    return (
                      <div
                        key={workpaper.number}
                        className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                            <Icon size={17} />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-blue-600">
                                {workpaper.number}
                              </span>

                              <span className="truncate text-xs font-bold text-blue-950">
                                {workpaper.title}
                              </span>
                            </div>

                            <p className="mt-1 text-[10px] font-semibold text-blue-600">
                              Current workpaper
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={workpaper.number}
                      href={`${baseRoute}/${workpaper.route}`}
                      className="group flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-slate-50"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-600">
                        <Icon size={17} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-400">
                            {workpaper.number}
                          </span>

                          <span className="truncate text-xs font-semibold text-slate-700">
                            {workpaper.title}
                          </span>
                        </div>
                      </div>

                      <ArrowRight
                        size={14}
                        className="shrink-0 text-slate-300 group-hover:text-blue-600"
                      />
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>

          {/* CONTENT */}
          <div className="min-w-0 space-y-6">
            {/* TRANSACTION CYCLES */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-6">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">
                        2.1
                      </span>

                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Current Workpaper
                      </span>
                    </div>

                    <h2 className="mt-3 text-xl font-bold text-slate-900">
                      Transaction Cycles
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Select a transaction cycle to document the
                      relevant processes, risks, controls and audit
                      considerations.
                    </p>
                  </div>

                  <div className="hidden shrink-0 items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 sm:flex">
                    <CheckCircle2
                      size={16}
                      className="text-emerald-600"
                    />

                    <span className="text-xs font-bold text-emerald-700">
                      Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-5">
                  <h3 className="text-sm font-bold text-slate-900">
                    Significant Transaction Cycles
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Open a cycle to continue the assessment.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {transactionCycles.map((cycle) => (
                    <Link
                      key={cycle.route}
                      href={`${baseRoute}/transaction-cycles/${cycle.route}`}
                      className="group flex min-h-[170px] flex-col rounded-xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600">
                          <GitBranch size={18} />
                        </div>

                        <ArrowRight
                          size={17}
                          className="mt-1 text-slate-300 group-hover:translate-x-1 group-hover:text-blue-600"
                        />
                      </div>

                      <div className="mt-5">
                        <h4 className="text-sm font-bold text-slate-900">
                          {cycle.title}
                        </h4>

                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          {cycle.description}
                        </p>
                      </div>

                      <div className="mt-auto pt-5">
                        <span className="text-xs font-bold text-blue-600">
                          Configure cycle
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            {/* CROSS CUTTING */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Cross-Cutting Workpapers
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Additional audit areas relevant to the risk
                  assessment and audit strategy.
                </p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {crossCuttingTopics.map((topic) => (
                    <div
                      key={topic}
                      className="flex min-h-[44px] items-center rounded-lg border border-slate-200 bg-slate-50 px-4"
                    >
                      <span className="mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />

                      <span className="text-xs font-medium text-slate-700">
                        {topic}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* NEXT WORKPAPER */}
            <section className="rounded-2xl bg-slate-900 px-6 py-6 shadow-sm">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Next Workpaper
                  </p>

                  <h2 className="mt-2 text-lg font-bold text-white">
                    2.2 — Process Flow & Walkthroughs
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Continue documenting the processes and walkthroughs
                    after completing the relevant transaction cycles.
                  </p>
                </div>

                <Link
                  href={`${baseRoute}/2.2`}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 hover:bg-slate-100"
                >
                  Open 2.2
                  <ArrowRight size={16} />
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
