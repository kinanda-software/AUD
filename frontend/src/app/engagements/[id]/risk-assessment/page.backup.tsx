"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "../../../../components/layout/AppLayout";

import {
  ArrowLeft,
  ClipboardCheck,
  ShieldAlert,
  Workflow,
  AlertTriangle,
  ShieldCheck,
  TestTube,
  Scale,
  FileSearch,
  FileText,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

/*
 * ==========================================
 * PHASE 2 WORKPAPER SECTIONS
 * ==========================================
 */

const sections = [
  {
    id: "transaction-cycles",
    number: "2.1",
    title: "Transaction Cycles",
    description:
      "Identify significant transaction cycles and disclosure processes.",
    icon: Workflow,
  },
  {
    id: "process-flow",
    number: "2.2",
    title: "Process Flow & Walkthroughs",
    description:
      "Map processes, controls, IT dependencies and walkthroughs.",
    icon: ClipboardCheck,
  },
  {
    id: "risk-points",
    number: "2.3",
    title: "Risk Points",
    description:
      "Identify what could go wrong and related assertions.",
    icon: AlertTriangle,
  },
  {
    id: "controls",
    number: "2.4",
    title: "Controls",
    description:
      "Identify and evaluate manual, ITDM and automated controls.",
    icon: ShieldCheck,
  },
  {
    id: "control-testing",
    number: "2.5",
    title: "Controls Testing",
    description:
      "Select controls to test where reliance is planned.",
    icon: TestTube,
  },
  {
    id: "risk-assessment",
    number: "2.6",
    title: "Combined Risk Assessment",
    description:
      "Assess inherent risk and control risk by assertion.",
    icon: Scale,
  },
  {
    id: "tests-of-controls",
    number: "2.7",
    title: "Tests of Controls",
    description:
      "Design tests of operating effectiveness.",
    icon: TestTube,
  },
  {
    id: "management-override",
    number: "2.8",
    title: "Management Override",
    description:
      "Address journal entries, unusual transactions and estimates.",
    icon: ShieldAlert,
  },
  {
    id: "substantive-procedures",
    number: "2.9",
    title: "Substantive Procedures",
    description:
      "Design substantive responses for relevant assertions.",
    icon: FileSearch,
  },
  {
    id: "general-procedures",
    number: "2.10",
    title: "General Audit Procedures",
    description:
      "Cover legal matters, minutes, going concern and representations.",
    icon: ClipboardCheck,
  },
  {
    id: "audit-strategy",
    number: "2.11",
    title: "Audit Strategy",
    description:
      "Document the overall audit strategy and approach.",
    icon: FileText,
  },
];

/*
 * ==========================================
 * CROSS-CUTTING WORKPAPERS
 * ==========================================
 */

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

/*
 * ==========================================
 * TRANSACTION CYCLE ROUTES
 * ==========================================
 *
 * Each transaction cycle has its own workpaper.
 */

const transactionCycleRoutes: Record<string, string> = {
  Revenue: "revenue",
  "Purchasing & Payables": "purchasing-payables",
  Payroll: "payroll",
  Inventory: "inventory",
  "Financial Statement Close": "financial-statement-close",
  "Other Significant Processes": "other-significant-processes",
};

/*
 * ==========================================
 * TRANSACTION CYCLE DESCRIPTIONS
 * ==========================================
 */

const transactionCycleDescriptions: Record<string, string> = {
  Revenue:
    "Configure revenue streams, significant accounts, assertions, risks and supporting applications.",

  "Purchasing & Payables":
    "Configure procurement, purchases, trade payables, expenses, assertions and supporting applications.",

  Payroll:
    "Configure payroll processes, employee costs, deductions, assertions and supporting applications.",

  Inventory:
    "Configure inventory movements, stock balances, valuation, existence and supporting applications.",

  "Financial Statement Close":
    "Configure the financial close process, journal entries, reconciliations, adjustments and reporting.",

  "Other Significant Processes":
    "Configure other significant processes that may affect the financial statements or audit risk.",
};

/*
 * ==========================================
 * MAIN PAGE
 * ==========================================
 */

export default function RiskAssessmentPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = params.id as string;

  /*
   * Default active Phase 2 section
   */

  const [activeSection, setActiveSection] =
    useState("transaction-cycles");

  /*
   * ==========================================
   * HANDLE PHASE 2 SECTION CLICK
   * ==========================================
   *
   * 2.1 stays on this page.
   *
   * 2.2 - 2.11 navigate to their
   * individual workpaper pages.
   */

  const handleSectionClick = (
    section: (typeof sections)[number]
  ) => {
    if (section.number === "2.1") {
      setActiveSection(section.id);
      return;
    }

    router.push(
      `/engagements/${engagementId}/risk-assessment/${section.number}`
    );
  };

  /*
   * Find currently active section
   */

  const activeSectionData = sections.find(
    (section) => section.id === activeSection
  );

  /*
   * Icon for active section
   */

  const ActiveIcon =
    activeSectionData?.icon || ClipboardCheck;

  return (
    <AppLayout>
      <div className="min-h-screen">

        {/* =========================================
            PAGE HEADER
        ========================================== */}

        <div className="mb-8">

          {/* Back button */}

          <Link
            href="/engagements"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={17} />

            Back to Engagements
          </Link>

          {/* Header information */}

          <div className="flex items-start justify-between">

            <div>

              <div className="mb-2 flex items-center gap-2">

                <span className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                  PHASE 2
                </span>

                <span className="text-sm text-slate-400">
                  Risk Assessment & Strategy
                </span>

              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Risk Assessment & Strategy
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                AUD-001 — Financial Statement Audit
              </p>

            </div>

            {/* Phase Status */}

            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:flex">

              <CheckCircle2
                size={18}
                className="text-emerald-500"
              />

              <div>

                <p className="text-xs text-slate-400">
                  Phase Status
                </p>

                <p className="text-sm font-semibold text-slate-700">
                  In Progress
                </p>

              </div>

            </div>

          </div>
        </div>


        {/* =========================================
            MAIN CONTENT
        ========================================== */}

        <div className="grid grid-cols-12 gap-6">

          {/* =========================================
              LEFT SIDEBAR
          ========================================== */}

          <aside className="col-span-12 lg:col-span-4 xl:col-span-3">

            <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">

              <div className="px-3 pb-3 pt-2">

                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Phase 2 Workpapers
                </p>

              </div>

              <div className="space-y-1">

                {sections.map((section) => {

                  const Icon = section.icon;

                  const active =
                    activeSection === section.id;

                  return (

                    <button
                      key={section.id}
                      type="button"
                      onClick={() =>
                        handleSectionClick(section)
                      }
                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                        active
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >

                      {/* Icon */}

                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          active
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >

                        <Icon size={17} />

                      </div>


                      {/* Section information */}

                      <div className="min-w-0 flex-1">

                        <p
                          className={`text-xs font-bold ${
                            active
                              ? "text-blue-600"
                              : "text-slate-400"
                          }`}
                        >
                          {section.number}
                        </p>

                        <p
                          className={`truncate text-sm font-semibold ${
                            active
                              ? "text-blue-900"
                              : "text-slate-700"
                          }`}
                        >
                          {section.title}
                        </p>

                      </div>


                      {/* Arrow */}

                      <ChevronRight
                        size={16}
                        className={
                          active
                            ? "text-blue-500"
                            : "text-slate-300"
                        }
                      />

                    </button>

                  );
                })}

              </div>

            </div>

          </aside>


          {/* =========================================
              RIGHT CONTENT
          ========================================== */}

          <section className="col-span-12 lg:col-span-8 xl:col-span-9">

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

              {/* Content Header */}

              <div className="border-b border-slate-200 px-6 py-5">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">

                    <ActiveIcon size={21} />

                  </div>

                  <div>

                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                      {activeSectionData?.number}
                    </p>

                    <h2 className="text-xl font-bold text-slate-900">
                      {activeSectionData?.title}
                    </h2>

                  </div>

                </div>

              </div>


              {/* =========================================
                  2.1 TRANSACTION CYCLES
              ========================================== */}

              <div className="p-6">

                {activeSection === "transaction-cycles" ? (

                  <div>

                    {/* Section heading */}

                    <h3 className="text-lg font-semibold text-slate-900">
                      Significant Transaction Cycles
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Identify significant accounts, transaction
                      cycles, disclosure processes and IT
                      applications supporting the financial
                      reporting process.
                    </p>


                    {/* =====================================
                        TRANSACTION CYCLE CARDS
                    ====================================== */}

                    <div className="mt-6 grid gap-4 md:grid-cols-2">

                      {[
                        "Revenue",
                        "Purchasing & Payables",
                        "Payroll",
                        "Inventory",
                        "Financial Statement Close",
                        "Other Significant Processes",
                      ].map((cycle) => {

                        /*
                         * Get route for this cycle.
                         */

                        const cycleRoute =
                          transactionCycleRoutes[cycle];

                        /*
                         * Get description for this cycle.
                         */

                        const cycleDescription =
                          transactionCycleDescriptions[cycle];

                        return (

                          <div
                            key={cycle}
                            className="rounded-xl border border-slate-200 p-5 transition hover:border-blue-300 hover:shadow-sm"
                          >

                            {/* Card header */}

                            <div className="flex items-center justify-between gap-3">

                              <h4 className="font-semibold text-slate-800">
                                {cycle}
                              </h4>

                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                                Not assessed
                              </span>

                            </div>


                            {/* Card description */}

                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              {cycleDescription}
                            </p>


                            {/* =================================
                                CONFIGURE CYCLE LINK
                            ================================== */}

                            <Link
                              href={`/engagements/${engagementId}/risk-assessment/transaction-cycles/${cycleRoute}`}
                              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
                            >
                              Configure cycle

                              <ChevronRight size={16} />

                            </Link>

                          </div>

                        );

                      })}

                    </div>

                  </div>

                ) : (

                  /* =========================================
                     FALLBACK FOR 2.2 - 2.11
                  ========================================== */

                  <div className="flex min-h-[420px] flex-col items-center justify-center text-center">

                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">

                      <ClipboardCheck
                        size={30}
                        className="text-slate-400"
                      />

                    </div>

                    <h3 className="mt-5 text-lg font-semibold text-slate-900">
                      {activeSectionData?.title}
                    </h3>

                    <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
                      {activeSectionData?.description}
                    </p>

                    <div className="mt-6 rounded-xl bg-amber-50 px-5 py-3 text-sm text-amber-700">
                      This workpaper will be implemented in
                      the next step.
                    </div>

                  </div>

                )}

              </div>

            </div>

          </section>

        </div>


        {/* =========================================
            CROSS-CUTTING WORKPAPERS
        ========================================== */}

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          {/* Heading */}

          <div className="mb-5">

            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Cross-Cutting Workpapers
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Additional Audit Areas
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              These areas support the risk assessment and audit
              strategy but are maintained as separate workpapers.
            </p>

          </div>


          {/* Cross-cutting cards */}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

            {crossCuttingTopics.map((topic) => (

              <button
                key={topic}
                type="button"
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >

                <span>
                  {topic}
                </span>

                <ChevronRight
                  size={16}
                  className="text-slate-300"
                />

              </button>

            ))}

          </div>

        </div>

      </div>
    </AppLayout>
  );
}