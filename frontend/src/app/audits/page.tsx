"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileCheck2,
  FileText,
  Filter,
  FolderOpen,
  ListChecks,
  Plus,
  Search,
  ShieldCheck,
  Target,
  Users,
  X,
} from "lucide-react";

type AuditStatus =
  | "Planning"
  | "Risk Assessment"
  | "Execution"
  | "Conclusion & Reporting"
  | "Completed";

type AuditType =
  | "Financial Audit"
  | "Internal Audit"
  | "Compliance Audit"
  | "Operational Audit"
  | "IT Audit";

type RiskLevel = "Low" | "Moderate" | "High" | "Significant";

type Audit = {
  id: string;
  name: string;
  client: string;
  period: string;
  type: AuditType;
  status: AuditStatus;
  risk: RiskLevel;
  progress: number;
  partner: string;
  manager: string;
  startDate: string;
  dueDate: string;
};

const audits: Audit[] = [
  {
    id: "AUD-2026-001",
    name: "Annual Financial Statement Audit",
    client: "ABC Manufacturing Ltd",
    period: "Year ended 31 December 2025",
    type: "Financial Audit",
    status: "Conclusion & Reporting",
    risk: "High",
    progress: 88,
    partner: "J. Mwakalinga",
    manager: "S. Kinanda",
    startDate: "05 Jan 2026",
    dueDate: "30 Sep 2026",
  },
  {
    id: "AUD-2026-002",
    name: "Internal Controls Review",
    client: "Tanzania Trading Company",
    period: "FY 2025/2026",
    type: "Internal Audit",
    status: "Execution",
    risk: "Moderate",
    progress: 68,
    partner: "A. Mushi",
    manager: "S. Kinanda",
    startDate: "10 Feb 2026",
    dueDate: "15 Oct 2026",
  },
  {
    id: "AUD-2026-003",
    name: "Regulatory Compliance Audit",
    client: "Eastern Logistics Ltd",
    period: "Year ended 30 June 2026",
    type: "Compliance Audit",
    status: "Risk Assessment",
    risk: "Significant",
    progress: 42,
    partner: "P. Joseph",
    manager: "M. Charles",
    startDate: "01 Jul 2026",
    dueDate: "31 Oct 2026",
  },
  {
    id: "AUD-2026-004",
    name: "Operational Effectiveness Review",
    client: "Greenfield Agriculture Ltd",
    period: "FY 2025/2026",
    type: "Operational Audit",
    status: "Planning",
    risk: "Moderate",
    progress: 22,
    partner: "J. Mwakalinga",
    manager: "A. Peter",
    startDate: "15 Aug 2026",
    dueDate: "30 Nov 2026",
  },
  {
    id: "AUD-2026-005",
    name: "Information Technology General Controls",
    client: "Digital Services Tanzania",
    period: "Year ended 30 June 2026",
    type: "IT Audit",
    status: "Completed",
    risk: "Low",
    progress: 100,
    partner: "P. Joseph",
    manager: "M. Charles",
    startDate: "02 May 2026",
    dueDate: "31 Jul 2026",
  },
];

const workflowSteps = [
  {
    number: "01",
    title: "Audit Planning",
    description:
      "Establish the engagement scope, objectives, team, timetable and overall audit strategy.",
    icon: ClipboardList,
    href: "/engagements",
  },
  {
    number: "02",
    title: "Risk Assessment",
    description:
      "Identify and assess risks of material misstatement at financial statement and assertion levels.",
    icon: ShieldCheck,
    href: "/engagements",
  },
  {
    number: "03",
    title: "Audit Execution",
    description:
      "Perform control testing, substantive procedures, sampling, confirmations and audit evidence work.",
    icon: ClipboardCheck,
    href: "/engagements",
  },
  {
    number: "04",
    title: "Conclusion & Reporting",
    description:
      "Evaluate misstatements, complete final procedures, form the opinion and finalize the audit file.",
    icon: FileCheck2,
    href: "/engagements",
  },
];

const methodologyItems = [
  {
    title: "Audit Planning",
    description: "Engagement acceptance, materiality, strategy and team planning.",
    icon: CalendarDays,
  },
  {
    title: "Risk Assessment",
    description: "Risk identification, controls, assertions and fraud considerations.",
    icon: ShieldCheck,
  },
  {
    title: "Audit Procedures",
    description: "Walkthroughs, tests of controls and substantive audit procedures.",
    icon: ListChecks,
  },
  {
    title: "Audit Documentation",
    description: "Workpapers, evidence, review notes and audit file completion.",
    icon: FolderOpen,
  },
  {
    title: "Conclusion & Reporting",
    description: "Misstatements, final review, opinion and auditor reporting.",
    icon: FileText,
  },
  {
    title: "Quality Monitoring",
    description: "Engagement quality, inspection, root cause and remediation feedback.",
    icon: BarChart3,
  },
];

const statusOptions: Array<"All" | AuditStatus> = [
  "All",
  "Planning",
  "Risk Assessment",
  "Execution",
  "Conclusion & Reporting",
  "Completed",
];

const riskOptions: Array<"All" | RiskLevel> = [
  "All",
  "Low",
  "Moderate",
  "High",
  "Significant",
];

function getStatusClasses(status: AuditStatus) {
  switch (status) {
    case "Planning":
      return "bg-slate-100 text-slate-700 border-slate-200";

    case "Risk Assessment":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "Execution":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "Conclusion & Reporting":
      return "bg-purple-50 text-purple-700 border-purple-200";

    case "Completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getRiskClasses(risk: RiskLevel) {
  switch (risk) {
    case "Low":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "Moderate":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "High":
      return "bg-orange-50 text-orange-700 border-orange-200";

    case "Significant":
      return "bg-red-50 text-red-700 border-red-200";

    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getProgressClasses(progress: number) {
  if (progress === 100) {
    return "bg-emerald-500";
  }

  if (progress >= 75) {
    return "bg-purple-500";
  }

  if (progress >= 50) {
    return "bg-blue-500";
  }

  return "bg-amber-500";
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: typeof ClipboardList;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      {eyebrow && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
          {eyebrow}
        </p>
      )}

      <h2 className="text-xl font-bold tracking-tight text-slate-900">
        {title}
      </h2>

      {description && (
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

function EmptyState({
  onClear,
}: {
  onClear: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
        <Search size={22} />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-900">
        No audits found
      </h3>

      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        No audit engagements match the current search and filter criteria.
      </p>

      <button
        type="button"
        onClick={onClear}
        className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <X size={16} />
        Clear filters
      </button>
    </div>
  );
}

export default function AuditsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<(typeof statusOptions)[number]>("All");
  const [riskFilter, setRiskFilter] =
    useState<(typeof riskOptions)[number]>("All");
  const [showFilters, setShowFilters] = useState(false);

  const auditStats = useMemo(() => {
    const active = audits.filter((audit) => audit.status !== "Completed");

    return {
      total: audits.length,
      active: active.length,
      planning: audits.filter((audit) => audit.status === "Planning").length,
      execution: audits.filter((audit) => audit.status === "Execution").length,
      reporting: audits.filter(
        (audit) => audit.status === "Conclusion & Reporting"
      ).length,
      completed: audits.filter((audit) => audit.status === "Completed").length,
      highRisk: audits.filter(
        (audit) =>
          audit.risk === "High" || audit.risk === "Significant"
      ).length,
      averageProgress:
        audits.length === 0
          ? 0
          : Math.round(
              audits.reduce((sum, audit) => sum + audit.progress, 0) /
                audits.length
            ),
    };
  }, []);

  const filteredAudits = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return audits.filter((audit) => {
      const matchesSearch =
        query === "" ||
        audit.id.toLowerCase().includes(query) ||
        audit.name.toLowerCase().includes(query) ||
        audit.client.toLowerCase().includes(query) ||
        audit.type.toLowerCase().includes(query) ||
        audit.manager.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || audit.status === statusFilter;

      const matchesRisk =
        riskFilter === "All" || audit.risk === riskFilter;

      return matchesSearch && matchesStatus && matchesRisk;
    });
  }, [searchQuery, statusFilter, riskFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("All");
    setRiskFilter("All");
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1600px] space-y-8">
        {/* Page Header */}
        <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-7 py-8 text-white shadow-xl">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-300">
                <ClipboardList size={17} />
                Audit Management
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Audits
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Manage audit methodology, monitor engagement progress and
                access the complete audit lifecycle from planning through
                conclusion and reporting.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/engagements"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                <BriefcaseIcon />
                View Engagements
              </Link>

              <Link
                href="/engagements"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
              >
                <Plus size={18} />
                Start New Audit
              </Link>
            </div>
          </div>
        </section>

        {/* KPI Cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total Audits"
            value={auditStats.total}
            description="All audit engagements"
            icon={ClipboardList}
          />

          <MetricCard
            label="Active Audits"
            value={auditStats.active}
            description="Currently in progress"
            icon={Clock3}
          />

          <MetricCard
            label="High-Risk Audits"
            value={auditStats.highRisk}
            description="High or significant risk"
            icon={ShieldCheck}
          />

          <MetricCard
            label="Average Progress"
            value={`${auditStats.averageProgress}%`}
            description={`${auditStats.completed} completed engagement${
              auditStats.completed === 1 ? "" : "s"
            }`}
            icon={BarChart3}
          />
        </section>

        {/* Workflow */}
        <section>
          <SectionHeader
            eyebrow="Audit Lifecycle"
            title="Audit Workflow"
            description="The standard audit lifecycle used to move an engagement from initial planning through final reporting."
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <Link
                  key={step.number}
                  href={step.href}
                  className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  {index < workflowSteps.length - 1 && (
                    <div className="absolute right-[-17px] top-1/2 z-10 hidden -translate-y-1/2 text-slate-300 xl:block">
                      <ChevronRight size={20} />
                    </div>
                  )}

                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                      <Icon size={21} />
                    </div>

                    <span className="text-xs font-bold tracking-widest text-slate-300">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="mt-5 text-base font-bold text-slate-900">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {step.description}
                  </p>

                  <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-blue-600">
                    Open workflow
                    <ArrowRight
                      size={14}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Audit Portfolio */}
        <section>
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeader
              eyebrow="Audit Portfolio"
              title="Current Audits"
              description="Monitor active audit engagements, risk levels, responsibilities and completion progress."
            />

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[260px]">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search audits..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowFilters((value) => !value)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                  showFilters ||
                  statusFilter !== "All" ||
                  riskFilter !== "All"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Filter size={17} />
                Filters
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="w-full sm:max-w-xs">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Audit Status
                  </label>

                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(
                        event.target.value as (typeof statusOptions)[number]
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:max-w-xs">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Risk Level
                  </label>

                  <select
                    value={riskFilter}
                    onChange={(event) =>
                      setRiskFilter(
                        event.target.value as (typeof riskOptions)[number]
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {riskOptions.map((risk) => (
                      <option key={risk} value={risk}>
                        {risk}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  <X size={16} />
                  Clear
                </button>
              </div>
            </div>
          )}

          {filteredAudits.length === 0 ? (
            <EmptyState onClear={clearFilters} />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Audit
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Type
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Risk
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Progress
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Due Date
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredAudits.map((audit) => (
                      <tr
                        key={audit.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-5">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                              <FileCheck2 size={19} />
                            </div>

                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">
                                {audit.name}
                              </p>

                              <p className="mt-1 text-sm text-slate-600">
                                {audit.client}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {audit.id} • {audit.period}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <span className="text-sm font-medium text-slate-700">
                            {audit.type}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                              audit.status
                            )}`}
                          >
                            {audit.status}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getRiskClasses(
                              audit.risk
                            )}`}
                          >
                            {audit.risk}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <div className="w-36">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs font-medium text-slate-500">
                                Completion
                              </span>

                              <span className="text-xs font-bold text-slate-700">
                                {audit.progress}%
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full transition-all ${getProgressClasses(
                                  audit.progress
                                )}`}
                                style={{ width: `${audit.progress}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <CalendarDays
                              size={15}
                              className="text-slate-400"
                            />
                            {audit.dueDate}
                          </div>
                        </td>

                        <td className="px-5 py-5 text-right">
                          <Link
                            href={`/engagements/${audit.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            Open
                            <ArrowRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing{" "}
                  <strong className="text-slate-700">
                    {filteredAudits.length}
                  </strong>{" "}
                  of{" "}
                  <strong className="text-slate-700">{audits.length}</strong>{" "}
                  audits
                </span>

                <Link
                  href="/engagements"
                  className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700"
                >
                  View all engagements
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Audit Methodology */}
        <section>
          <SectionHeader
            eyebrow="Methodology"
            title="Audit Work Areas"
            description="Core areas that support a complete and properly documented audit engagement."
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {methodologyItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.title}
                  href="/engagements"
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-blue-50 group-hover:text-blue-600">
                      <Icon size={20} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end text-slate-300 transition group-hover:text-blue-600">
                    <ArrowRight size={17} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Portfolio Summary */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Target size={20} />
              </div>

              <div>
                <h3 className="font-bold text-slate-900">
                  Portfolio Progress
                </h3>
                <p className="text-xs text-slate-500">
                  Overall engagement completion
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-slate-900">
                  {auditStats.averageProgress}%
                </span>

                <span className="text-xs font-medium text-slate-500">
                  Average
                </span>
              </div>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${auditStats.averageProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <ShieldCheck size={20} />
              </div>

              <div>
                <h3 className="font-bold text-slate-900">
                  Risk Focus
                </h3>
                <p className="text-xs text-slate-500">
                  Audits requiring attention
                </p>
              </div>
            </div>

            <p className="mt-6 text-3xl font-bold text-slate-900">
              {auditStats.highRisk}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              high or significant risk audit
              {auditStats.highRisk === 1 ? "" : "s"} in the portfolio
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={20} />
              </div>

              <div>
                <h3 className="font-bold text-slate-900">
                  Completed
                </h3>
                <p className="text-xs text-slate-500">
                  Fully completed engagements
                </p>
              </div>
            </div>

            <p className="mt-6 text-3xl font-bold text-slate-900">
              {auditStats.completed}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              engagement
              {auditStats.completed === 1 ? "" : "s"} completed in the
              current portfolio
            </p>
          </div>
        </section>

        {/* Bottom Information */}
        <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                <BookOpen size={21} />
              </div>

              <div>
                <h3 className="font-bold text-slate-900">
                  Audit Methodology
                </h3>

                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  Use the engagement workspace to perform the detailed audit
                  procedures. Each engagement contains its own planning,
                  risk assessment, execution, conclusion and reporting
                  workpapers.
                </p>
              </div>
            </div>

            <Link
              href="/engagements"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Open Engagement Workspace
              <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function BriefcaseIcon() {
  return <Users size={17} />;
}