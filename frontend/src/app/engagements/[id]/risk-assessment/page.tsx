
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

const workpapers = [
  {
    number: "2.1",
    title: "Transaction Cycles",
    route: "",
    icon: GitBranch,
  },
  {
    number: "2.2",
    title: "Process Flow & Walkthroughs",
    route: "2.2",
    icon: FileSearch,
  },
  {
    number: "2.3",
    title: "Risk Points",
    route: "2.3",
    icon: ShieldAlert,
  },
  {
    number: "2.4",
    title: "Controls",
    route: "2.4",
    icon: ShieldCheck,
  },
  {
    number: "2.5",
    title: "Controls Testing",
    route: "2.5",
    icon: ListChecks,
  },
  {
    number: "2.6",
    title: "Combined Risk Assessment",
    route: "2.6",
    icon: ClipboardCheck,
  },
  {
    number: "2.7",
    title: "Tests of Controls",
    route: "2.7",
    icon: CheckCircle2,
  },
  {
    number: "2.8",
    title: "Management Override",
    route: "2.8",
    icon: ShieldAlert,
  },
  {
    number: "2.9",
    title: "Substantive Procedures",
    route: "2.9",
    icon: FileSearch,
  },
  {
    number: "2.10",
    title: "General Audit Procedures",
    route: "2.10",
    icon: ClipboardCheck,
  },
  {
    number: "2.11",
    title: "Audit Strategy",
    route: "2.11",
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

  const baseRoute = `/engagements/${engagementId}/risk-assessment`;

  return (
    <div className="w-full min-w-0">
        {/* =========================================================
            PAGE HEADER
        ========================================================== */}
        <section className="mb-5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="px-5 py-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">
                    Phase 2
                  </span>

                  <ChevronRight
                    size={14}
                    className="shrink-0 text-slate-300"
                  />

                  <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Risk Assessment & Strategy
                  </span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Risk Assessment & Strategy
                </h1>

                <p className="mt-1.5 text-sm text-slate-500">
                  AUD-001 — Financial Statement Audit
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Engagement
                  </p>

                  <p className="mt-0.5 text-sm font-bold text-slate-900">
                    #{engagementId}
                  </p>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                    Phase Status
                  </p>

                  <p className="mt-0.5 text-sm font-bold text-amber-800">
                    In Progress
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-1 border-t border-slate-200 sm:grid-cols-3">
            <div className="px-5 py-3.5">
              <p className="text-[11px] font-medium text-slate-400">
                Workpapers
              </p>

              <p className="mt-0.5 text-base font-bold text-slate-900">
                11
              </p>
            </div>

            <div className="border-t border-slate-200 px-5 py-3.5 sm:border-l sm:border-t-0">
              <p className="text-[11px] font-medium text-slate-400">
                Current Workpaper
              </p>

              <p className="mt-0.5 text-base font-bold text-blue-700">
                2.1
              </p>
            </div>

            <div className="border-t border-slate-200 px-5 py-3.5 sm:border-l sm:border-t-0">
              <p className="text-[11px] font-medium text-slate-400">
                Assessment Area
              </p>

              <p className="mt-0.5 text-base font-bold text-slate-900">
                Transaction Cycles
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================
            MAIN WORKSPACE
        ========================================================== */}
        <div className="grid w-full min-w-0 grid-cols-1 gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
          {/* =======================================================
              WORKPAPER SIDEBAR
          ======================================================== */}
          <aside className="h-fit min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Phase 2
              </p>

              <h2 className="mt-1 text-sm font-bold text-slate-900">
                Workpaper Navigation
              </h2>
            </div>

            <div className="p-2.5">
              <div className="space-y-0.5">
                {workpapers.map((workpaper) => {
                  const Icon = workpaper.icon;
                  const isCurrent = workpaper.number === "2.1";

                  if (isCurrent) {
                    return (
                      <div
                        key={workpaper.number}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
                            <Icon size={15} />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-blue-600">
                                {workpaper.number}
                              </span>

                              <span className="truncate text-[11px] font-bold text-blue-950">
                                {workpaper.title}
                              </span>
                            </div>

                            <p className="mt-0.5 text-[9px] font-semibold text-blue-600">
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
                      className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 transition-colors group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-600">
                        <Icon size={15} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400">
                            {workpaper.number}
                          </span>

                          <span className="truncate text-[11px] font-semibold text-slate-700">
                            {workpaper.title}
                          </span>
                        </div>
                      </div>

                      <ArrowRight
                        size={13}
                        className="shrink-0 text-slate-300 transition-colors group-hover:text-blue-600"
                      />
                    </Link>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* =======================================================
              MAIN CONTENT
          ======================================================== */}
          <main className="min-w-0 space-y-5">
            {/* =====================================================
                TRANSACTION CYCLES
            ====================================================== */}
            <section className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-blue-100 px-2 py-1 text-[11px] font-bold text-blue-700">
                        2.1
                      </span>

                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Current Workpaper
                      </span>
                    </div>

                    <h2 className="mt-2.5 text-xl font-bold text-slate-900">
                      Transaction Cycles
                    </h2>

                    <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">
                      Select a transaction cycle to document the
                      relevant processes, risks, controls and audit
                      considerations.
                    </p>
                  </div>

                  <div className="hidden shrink-0 items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 sm:flex">
                    <CheckCircle2
                      size={15}
                      className="text-emerald-600"
                    />

                    <span className="text-[11px] font-bold text-emerald-700">
                      Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    Significant Transaction Cycles
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Open a cycle to continue the assessment.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {transactionCycles.map((cycle) => (
                    <Link
                      key={cycle.route}
                      href={`${baseRoute}/transaction-cycles/${cycle.route}`}
                      className="group flex min-h-[155px] min-w-0 flex-col rounded-lg border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
                          <GitBranch size={17} />
                        </div>

                        <ArrowRight
                          size={16}
                          className="mt-1 shrink-0 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-blue-600"
                        />
                      </div>

                      <div className="mt-4 min-w-0">
                        <h4 className="truncate text-sm font-bold text-slate-900">
                          {cycle.title}
                        </h4>

                        <p className="mt-1.5 text-xs leading-5 text-slate-500">
                          {cycle.description}
                        </p>
                      </div>

                      <div className="mt-auto pt-4">
                        <span className="text-[11px] font-bold text-blue-600">
                          Configure cycle
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            {/* =====================================================
                CROSS-CUTTING
            ====================================================== */}
            <section className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-5">
                <h2 className="text-lg font-bold text-slate-900">
                  Cross-Cutting Workpapers
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Additional audit areas relevant to the risk
                  assessment and audit strategy.
                </p>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {crossCuttingTopics.map((topic) => (
                    <div
                      key={topic}
                      className="flex min-h-[42px] min-w-0 items-center rounded-lg border border-slate-200 bg-slate-50 px-3.5"
                    >
                      <span className="mr-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />

                      <span className="truncate text-xs font-medium text-slate-700">
                        {topic}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* =====================================================
                NEXT WORKPAPER
            ====================================================== */}
            <section className="w-full overflow-hidden rounded-xl bg-slate-900 shadow-sm">
              <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Next Workpaper
                  </p>

                  <h2 className="mt-1.5 text-base font-bold text-white">
                    2.2 — Process Flow & Walkthroughs
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Continue documenting the processes and walkthroughs
                    after completing the relevant transaction cycles.
                  </p>
                </div>

                <Link
                  href={`${baseRoute}/2.2`}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-slate-900 transition-colors hover:bg-slate-100"
                >
                  Open 2.2
                  <ArrowRight size={15} />
                </Link>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }



