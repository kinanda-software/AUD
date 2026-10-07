"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  FileSpreadsheet,
  FileText,
  Layers3,
  ListChecks,
  Scale,
  ShieldCheck,
  CalendarDays,
  Wallet,
  Database,
  ClipboardCheck,
  SearchCheck,
} from "lucide-react";

const moduleGroups = [
  {
    number: "01",
    title: "Financial data",
    description: "Set up the account structure and bring together the client’s financial records.",
    icon: Database,
    modules: [
      {
        title: "Chart of Accounts",
        description: "Review account codes, types, and financial-statement classifications.",
        href: "/financials/chart-of-accounts",
        icon: BookOpen,
      },
      {
        title: "Trial Balance",
        description: "Import or enter the original balances, review totals, and lock the source.",
        href: "/financials/trial-balance",
        icon: Scale,
      },
      {
        title: "General Ledger",
        description: "Inspect transaction-level postings by account, date, reference, and source.",
        href: "/financials/general-ledger",
        icon: BarChart3,
      },
      {
        title: "Bank Reconciliation",
        description: "Match bank statement activity to posted cash-ledger transactions.",
        href: "/financials/bank-reconciliation",
        icon: Wallet,
      },
    ],
  },
  {
    number: "02",
    title: "Adjust and report",
    description: "Document audit adjustments, validate adjusted balances, and prepare reporting outputs.",
    icon: FileSpreadsheet,
    modules: [
      {
        title: "Adjustments",
        description: "Prepare, review, post, or reject proposed audit adjustments.",
        href: "/financials/adjustments",
        icon: ListChecks,
      },
      {
        title: "Adjusted Trial Balance",
        description: "Review the source trial balance after posted audit adjustments.",
        href: "/financials/adjusted-trial-balance",
        icon: Scale,
      },
      {
        title: "Lead Schedules",
        description: "Organize account-level audit work, supporting balances, and conclusions.",
        href: "/financials/lead-schedules",
        icon: Layers3,
      },
      {
        title: "Financial Statements",
        description: "Generate financial statements from the adjusted trial balance.",
        href: "/financials/financial-statements",
        icon: FileText,
      },
      {
        title: "Mapped & Comparative Statements",
        description: "Map accounts, compare periods, and review saved statement versions.",
        href: "/financials/mapped-statements",
        icon: FileText,
      },
    ],
  },
  {
    number: "03",
    title: "Account support",
    description: "Inspect supporting schedules and source transactions for significant balances.",
    icon: Layers3,
    modules: [
      {
        title: "Invoices, Bills & Tax",
        description: "Review customer and supplier documents, settlements, ageing, and tax summaries.",
        href: "/financials/invoices-bills",
        icon: FileText,
      },
      {
        title: "Fixed Assets",
        description: "Review asset records, depreciation, acquisition journals, and disposals.",
        href: "/financials/fixed-assets",
        icon: Layers3,
      },
      {
        title: "Inventory",
        description: "Review stock receipts, issues, adjustments, and weighted-average costing.",
        href: "/financials/inventory",
        icon: Layers3,
      },
      {
        title: "Budgets vs Actuals",
        description: "Compare approved monthly budgets with posted activity and dimensions.",
        href: "/financials/budgets",
        icon: CalendarDays,
      },
    ],
  },
  {
    number: "04",
    title: "Audit analysis and evidence",
    description: "Investigate exceptions, trace balances, and manage client-provided support.",
    icon: SearchCheck,
    modules: [
      {
        title: "Financial Audit Trace",
        description: "Trace account balances through adjustments, schedules, journals, and linked sources.",
        href: "/financials/audit-trace",
        icon: ListChecks,
      },
      {
        title: "Comparisons & Smart Audit",
        description: "Compare periods and review explainable ledger and journal exceptions.",
        href: "/financials/smart-audit",
        icon: BarChart3,
      },
      {
        title: "Audit Intelligence",
        description: "Save journal-testing samples, investigate screening findings, and record review.",
        href: "/financials/audit-intelligence",
        icon: SearchCheck,
      },
      {
        title: "PBC Document Requests",
        description: "Track requested client documents, evidence packages, and review outcomes.",
        href: "/financials/pbc-requests",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    number: "05",
    title: "Controls and history",
    description: "Manage posting controls and review the financial workflow’s recorded activity.",
    icon: ShieldCheck,
    modules: [
      {
        title: "Accounting Controls",
        description: "Set opening balances, close periods, and configure journal approval.",
        href: "/financials/accounting-controls",
        icon: ShieldCheck,
      },
      {
        title: "Journal Entries",
        description: "Prepare, submit, approve, post, and reverse balanced journal entries.",
        href: "/financials/journal-entries",
        icon: BookOpen,
      },
      {
        title: "Financial Workflow Activity",
        description: "Review financial record changes, approvals, period controls, and reconciliation activity.",
        href: "/financials/activity-log",
        icon: ShieldCheck,
      },
    ],
  },
];

const reportingWorkflow = [
  { number: "1", title: "Chart of Accounts", href: "/financials/chart-of-accounts" },
  { number: "2", title: "Trial Balance", href: "/financials/trial-balance" },
  { number: "3", title: "General Ledger", href: "/financials/general-ledger" },
  { number: "4", title: "Adjustments", href: "/financials/adjustments" },
  { number: "5", title: "Adjusted Trial Balance", href: "/financials/adjusted-trial-balance" },
  { number: "6", title: "Lead Schedules", href: "/financials/lead-schedules" },
  { number: "7", title: "Financial Statements", href: "/financials/financial-statements" },
];

export default function FinancialsDashboardPage() {
  return (

      <div className="w-full">
        <div className="w-full px-6 py-8">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                <BarChart3 className="h-4 w-4" />
                <span>Audit Financials</span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Financials Dashboard
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                A guided workspace for client financial data, audit adjustments,
                supporting schedules, analysis, and reporting.
              </p>
            </div>
          </div>

          {/* Process Flow */}
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Financial Reporting Workflow
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Follow the financial reporting process in sequence.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {reportingWorkflow.map((step) => (
                <WorkflowStep key={step.number} {...step} />
              ))}
            </div>
          </div>

          <div className="space-y-8">
            {moduleGroups.map((group) => {
              const GroupIcon = group.icon;

              return (
                <section key={group.number} aria-labelledby={`module-group-${group.number}`}>
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      <GroupIcon className="h-5 w-5 text-slate-700" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold tracking-wider text-slate-400">
                          {group.number}
                        </span>
                        <h2 id={`module-group-${group.number}`} className="text-xl font-semibold text-slate-900">
                          {group.title}
                        </h2>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{group.description}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {group.modules.map((module) => {
                      const Icon = module.icon;

                      return (
                        <Link
                          key={module.href}
                          href={module.href}
                          className="group flex min-h-40 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                        >
                          <div className="mb-4 flex items-center justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                              <Icon className="h-5 w-5 text-slate-700" aria-hidden="true" />
                            </div>
                            <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700" aria-hidden="true" />
                          </div>
                          <h3 className="text-base font-semibold text-slate-900">{module.title}</h3>
                          <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{module.description}</p>
                          <span className="mt-4 text-sm font-medium text-slate-700">Open module</span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <section className="mt-10" aria-labelledby="financial-controls-title">
            <div className="mb-4">
              <h2 id="financial-controls-title" className="text-xl font-semibold text-slate-900">
                Key review checks
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Keep these core reconciliations in view as you complete the financial work.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <ControlCard
                title="Trial balance"
                description="Confirm debit and credit totals agree before locking the source trial balance."
              />
              <ControlCard
                title="Audit adjustments"
                description="Confirm only posted adjustments flow into the adjusted trial balance and statements."
              />
              <ControlCard
                title="Financial statements"
                description="Review that the statement of financial position reconciles assets to liabilities and equity."
              />
            </div>
          </section>

          {/* Source note */}
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex gap-3">
              <div className="mt-0.5">
                <BarChart3 className="h-5 w-5 text-slate-500" aria-hidden="true" />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  How financial data flows through the audit
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  The original trial balance remains the source financial data.
                  Posted audit adjustments produce the adjusted trial balance,
                  which supports lead schedules and financial statements.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

  );
}

function WorkflowStep({
  number,
  title,
  href,
}: {
  number: string;
  title: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-slate-400 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
        {number}
      </div>

      <span className="text-sm font-medium leading-5 text-slate-700">{title}</span>
      <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-400 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" />
    </Link>
  );
}

function ControlCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
        <Scale className="h-4 w-4 text-slate-700" />
      </div>

      <h3 className="font-semibold text-slate-900">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
