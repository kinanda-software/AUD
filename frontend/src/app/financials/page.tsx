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
} from "lucide-react";

const financialModules = [
  {
    title: "Chart of Accounts",
    description:
      "Manage account codes, account names, account types, and financial statement classifications.",
    href: "/financials/chart-of-accounts",
    icon: BookOpen,
  },
  {
    title: "Trial Balance",
    description:
      "Create, review, balance, and lock the original trial balance for the audit engagement.",
    href: "/financials/trial-balance",
    icon: Scale,
  },
  {
    title: "Adjustments",
    description:
      "Record, review, post, or reject audit adjustments affecting the adjusted trial balance.",
    href: "/financials/adjustments",
    icon: ListChecks,
  },
  {
    title: "Adjusted Trial Balance",
    description:
      "Select a Trial Balance and review the adjusted balances after posted audit adjustments.",
    href: "/financials/trial-balance",
    icon: FileSpreadsheet,
  },
  {
    title: "Lead Schedules",
    description:
      "Select a Trial Balance and organize account-level audit schedules and supporting balances.",
    href: "/financials/trial-balance",
    icon: Layers3,
  },
  {
    title: "Financial Statements",
    description:
      "Select a Trial Balance and generate financial statements from the adjusted balances.",
    href: "/financials/trial-balance",
    icon: FileText,
  },
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
                Manage the financial data used throughout the audit, from the
                original trial balance through adjustments and financial
                statement generation.
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

            <div className="grid gap-3 md:grid-cols-5">
              <WorkflowStep number="1" title="Chart of Accounts" />
              <WorkflowStep number="2" title="Trial Balance" />
              <WorkflowStep number="3" title="Adjustments" />
              <WorkflowStep number="4" title="Adjusted Trial Balance" />
              <WorkflowStep number="5" title="Financial Statements" />
            </div>
          </div>

          {/* Module Cards */}
          <div className="mb-8">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-slate-900">
                Financial Modules
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select a module to continue working on the engagement
                financials.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {financialModules.map((module) => {
                const Icon = module.icon;

                return (
                  <Link
                    key={module.title}
                    href={module.href}
                    className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="mb-5 flex items-start justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                        <Icon className="h-5 w-5 text-slate-700" />
                      </div>

                      <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700" />
                    </div>

                    <h3 className="text-base font-semibold text-slate-900">
                      {module.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {module.description}
                    </p>

                    <div className="mt-5 text-sm font-medium text-slate-700">
                      Open module â†’
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Control Section */}
          <div className="grid gap-5 lg:grid-cols-3">
            <ControlCard
              title="Trial Balance Control"
              description="Debit and credit totals should agree before the trial balance is locked and downstream reporting is finalized."
            />

            <ControlCard
              title="Adjustment Control"
              description="Only posted audit adjustments should affect the adjusted trial balance and financial statements."
            />

            <ControlCard
              title="Financial Statement Control"
              description="The Statement of Financial Position should reconcile assets against liabilities and equity."
            />
          </div>

          {/* Source note */}
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex gap-3">
              <div className="mt-0.5">
                <BarChart3 className="h-5 w-5 text-slate-500" />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Financial Data Architecture
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  The original trial balance is preserved as the source
                  financial data. Posted audit adjustments are applied
                  dynamically to produce the adjusted trial balance used by
                  lead schedules and financial statements.
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
}: {
  number: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
        {number}
      </div>

      <span className="text-sm font-medium text-slate-700">{title}</span>
    </div>
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
