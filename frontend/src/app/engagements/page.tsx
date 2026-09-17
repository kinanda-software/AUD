
"use client";

import Link from "next/link";
import AppLayout from "../../components/layout/AppLayout";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Plus,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getEngagements } from "@/lib/api";

type EngagementStatus =
  | "Planning"
  | "In Progress"
  | "Fieldwork"
  | "Reporting"
  | "Completed";

type RiskLevel = "Low" | "Medium" | "High";

type Engagement = {
  id: string;
  code: string;
  client: string;
  entityType: string;
  period: string;
  partner: string;
  manager: string;
  status: EngagementStatus;
  risk: RiskLevel;
  progress: number;
  teamSize: number;
  startDate: string;
  dueDate: string;
  phase: string;
};

type BackendEngagement = {
  id: number;
  engagement_code: string;
  client_name?: string;
  title: string;
  engagement_type: string;
  status: string;
  current_phase: string;
  risk_level: string;
  start_date: string;
  planned_end_date: string | null;
  financial_year_end: string | null;
  progress_percentage: number;
};

const statusOptions: Array<"All" | EngagementStatus> = [
  "All",
  "Planning",
  "In Progress",
  "Fieldwork",
  "Reporting",
  "Completed",
];

const riskOptions: Array<"All" | RiskLevel> = [
  "All",
  "Low",
  "Medium",
  "High",
];

function getStatusClasses(status: EngagementStatus) {
  switch (status) {
    case "Planning":
      return "bg-slate-100 text-slate-700";
    case "In Progress":
      return "bg-blue-50 text-blue-700";
    case "Fieldwork":
      return "bg-amber-50 text-amber-700";
    case "Reporting":
      return "bg-purple-50 text-purple-700";
    case "Completed":
      return "bg-emerald-50 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getRiskClasses(risk: RiskLevel) {
  switch (risk) {
    case "Low":
      return "bg-emerald-50 text-emerald-700";
    case "Medium":
      return "bg-amber-50 text-amber-700";
    case "High":
      return "bg-red-50 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function mapStatus(status: string): EngagementStatus {
  switch (status.toLowerCase()) {
    case "planning":
      return "Planning";
    case "in_progress":
      return "In Progress";
    case "fieldwork":
      return "Fieldwork";
    case "reporting":
      return "Reporting";
    case "completed":
      return "Completed";
    default:
      return "Planning";
  }
}

function mapRisk(risk: string): RiskLevel {
  switch (risk.toLowerCase()) {
    case "low":
      return "Low";
    case "high":
      return "High";
    default:
      return "Medium";
  }
}

function formatEntityType(type: string) {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(date: string | null) {
  if (!date) return "Not set";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getPhaseLabel(phase: string) {
  switch (phase) {
    case "phase_1":
      return "Phase 1 — Engagement Planning";
    case "phase_2":
      return "Phase 2 — Risk Assessment";
    case "phase_3":
      return "Phase 3 — Risk Response";
    case "phase_4":
      return "Phase 4 — Conclusion & Reporting";
    default:
      return phase || "Not started";
  }
}

export default function EngagementsPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    "All" | EngagementStatus
  >("All");

  const [riskFilter, setRiskFilter] = useState<"All" | RiskLevel>("All");

  useEffect(() => {
    async function loadEngagements() {
      try {
        setLoading(true);
        setLoadError("");

        const data =
          (await getEngagements()) as unknown as BackendEngagement[];

        const mapped: Engagement[] = data.map((engagement) => ({
          id: String(engagement.id),

          code: engagement.engagement_code,

          client:
            engagement.client_name ||
            engagement.title ||
            `Engagement ${engagement.id}`,

          entityType: formatEntityType(engagement.engagement_type),

          period: engagement.financial_year_end
            ? `Year ended ${formatDate(engagement.financial_year_end)}`
            : "Financial year end not set",

          partner: "Not assigned",

          manager: "Not assigned",

          status: mapStatus(engagement.status),

          risk: mapRisk(engagement.risk_level),

          progress: Number(engagement.progress_percentage ?? 0),

          teamSize: 0,

          startDate: formatDate(engagement.start_date),

          dueDate: formatDate(engagement.planned_end_date),

          phase: getPhaseLabel(engagement.current_phase),
        }));

        setEngagements(mapped);
      } catch (error) {
        console.error("Failed to load engagements:", error);
        setLoadError(
          "Unable to load engagements from the server. Please check that the backend is running."
        );
      } finally {
        setLoading(false);
      }
    }

    loadEngagements();
  }, []);

  const filteredEngagements = useMemo(() => {
    const query = search.toLowerCase().trim();

    return engagements.filter((engagement) => {
      const matchesSearch =
        !query ||
        engagement.client.toLowerCase().includes(query) ||
        engagement.code.toLowerCase().includes(query) ||
        engagement.partner.toLowerCase().includes(query) ||
        engagement.manager.toLowerCase().includes(query) ||
        engagement.entityType.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || engagement.status === statusFilter;

      const matchesRisk =
        riskFilter === "All" || engagement.risk === riskFilter;

      return matchesSearch && matchesStatus && matchesRisk;
    });
  }, [engagements, search, statusFilter, riskFilter]);

  const totalEngagements = engagements.length;

  const activeEngagements = engagements.filter(
    (engagement) => engagement.status !== "Completed"
  ).length;

  const highRiskEngagements = engagements.filter(
    (engagement) => engagement.risk === "High"
  ).length;

  const reportingEngagements = engagements.filter(
    (engagement) => engagement.status === "Reporting"
  ).length;

  const completedEngagements = engagements.filter(
    (engagement) => engagement.status === "Completed"
  ).length;

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <BriefcaseBusiness size={23} />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Engagements
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Manage audit engagements, assignments, progress, and
                  reporting status.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/engagements/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={18} />
            New Engagement
          </Link>
        </div>

        {/* Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <BriefcaseBusiness size={20} />
              </div>

              <span className="text-xs font-medium text-slate-400">
                Portfolio
              </span>
            </div>

            <p className="mt-4 text-2xl font-bold text-slate-900">
              {loading ? "..." : totalEngagements}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Total engagements
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Clock3 size={20} />
              </div>

              <span className="text-xs font-medium text-emerald-600">
                Active
              </span>
            </div>

            <p className="mt-4 text-2xl font-bold text-slate-900">
              {loading ? "..." : activeEngagements}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Active engagements
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <AlertTriangle size={20} />
              </div>

              <span className="text-xs font-medium text-red-600">
                Attention
              </span>
            </div>

            <p className="mt-4 text-2xl font-bold text-slate-900">
              {loading ? "..." : highRiskEngagements}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              High-risk engagements
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <FileText size={20} />
              </div>

              <span className="text-xs font-medium text-purple-600">
                Final stage
              </span>
            </div>

            <p className="mt-4 text-2xl font-bold text-slate-900">
              {loading ? "..." : reportingEngagements}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              In reporting
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <CheckCircle2 size={20} />
              </div>

              <span className="text-xs font-medium text-slate-400">
                Closed
              </span>
            </div>

            <p className="mt-4 text-2xl font-bold text-slate-900">
              {loading ? "..." : completedEngagements}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Completed
            </p>
          </div>
        </div>

        {/* Workflow overview */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Engagement Workflow
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Each engagement moves through the audit methodology from
                planning to conclusion and reporting.
              </p>
            </div>

            <Link
              href="/audits"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              View audit methodology
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                  1
                </div>

                <div>
                  <p className="font-semibold text-slate-900">Planning</p>
                  <p className="text-xs text-slate-500">
                    Accept & plan engagement
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600 text-sm font-bold text-white">
                  2
                </div>

                <div>
                  <p className="font-semibold text-slate-900">
                    Risk Assessment
                  </p>
                  <p className="text-xs text-slate-500">
                    Identify & assess risks
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600 text-sm font-bold text-white">
                  3
                </div>

                <div>
                  <p className="font-semibold text-slate-900">
                    Risk Response
                  </p>
                  <p className="text-xs text-slate-500">
                    Execute audit procedures
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
                  4
                </div>

                <div>
                  <p className="font-semibold text-slate-900">
                    Conclusion
                  </p>
                  <p className="text-xs text-slate-500">
                    Conclude & issue report
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Directory */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Engagement Directory
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Search and filter the firm's current audit engagements.
                </p>
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search engagements..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:w-64"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as "All" | EngagementStatus
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      Status: {status}
                    </option>
                  ))}
                </select>

                <select
                  value={riskFilter}
                  onChange={(event) =>
                    setRiskFilter(
                      event.target.value as "All" | RiskLevel
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {riskOptions.map((risk) => (
                    <option key={risk} value={risk}>
                      Risk: {risk}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loadError && (
            <div className="border-b border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700">
              {loadError}
            </div>
          )}

          {/* Desktop table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Engagement
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Period
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Team
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Risk
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Progress
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-16 text-center text-sm text-slate-500"
                    >
                      Loading engagements...
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredEngagements.map((engagement) => (
                      <tr
                        key={engagement.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-6 py-5">
                          <div>
                            <Link
                              href={`/engagements/${engagement.id}`}
                              className="font-semibold text-slate-900 hover:text-blue-600"
                            >
                              {engagement.client}
                            </Link>

                            <p className="mt-1 text-xs font-medium text-blue-600">
                              {engagement.code}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {engagement.entityType}
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-start gap-2">
                            <CalendarDays
                              size={16}
                              className="mt-0.5 text-slate-400"
                            />

                            <div>
                              <p className="text-sm font-medium text-slate-700">
                                {engagement.period}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                Due {engagement.dueDate}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-start gap-2">
                            <Users
                              size={16}
                              className="mt-0.5 text-slate-400"
                            />

                            <div>
                              <p className="text-sm font-medium text-slate-700">
                                {engagement.manager}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {engagement.teamSize} team members
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                              engagement.status
                            )}`}
                          >
                            {engagement.status}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getRiskClasses(
                              engagement.risk
                            )}`}
                          >
                            {engagement.risk}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div className="w-32">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-xs font-medium text-slate-500">
                                {engagement.progress}%
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-blue-600 transition-all"
                                style={{
                                  width: `${engagement.progress}%`,
                                }}
                              />
                            </div>

                            <p className="mt-1 text-[11px] text-slate-400">
                              {engagement.phase}
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-5 text-right">
                          <Link
                            href={`/engagements/${engagement.id}`}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            Open
                            <ArrowRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}

                    {filteredEngagements.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center">
                          <Search
                            size={32}
                            className="mx-auto text-slate-300"
                          />

                          <p className="mt-3 font-semibold text-slate-700">
                            No engagements found
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Try changing your search or filters.
                          </p>
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-4 p-4 lg:hidden">
            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500">
                Loading engagements...
              </div>
            ) : (
              <>
                {filteredEngagements.map((engagement) => (
                  <div
                    key={engagement.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/engagements/${engagement.id}`}
                          className="font-semibold text-slate-900 hover:text-blue-600"
                        >
                          {engagement.client}
                        </Link>

                        <p className="mt-1 text-xs font-medium text-blue-600">
                          {engagement.code}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${getRiskClasses(
                          engagement.risk
                        )}`}
                      >
                        {engagement.risk} Risk
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Status</span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                            engagement.status
                          )}`}
                        >
                          {engagement.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Period</span>

                        <span className="font-medium text-slate-700">
                          {engagement.period}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Manager</span>

                        <span className="font-medium text-slate-700">
                          {engagement.manager}
                        </span>
                      </div>

                      <div>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-slate-500">Progress</span>

                          <span className="font-semibold text-slate-700">
                            {engagement.progress}%
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{
                              width: `${engagement.progress}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/engagements/${engagement.id}`}
                      className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Open Engagement
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                ))}

                {filteredEngagements.length === 0 && (
                  <div className="py-12 text-center">
                    <Search
                      size={32}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-3 font-semibold text-slate-700">
                      No engagements found
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Try changing your search or filters.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Management areas */}
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Engagement Management
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Supporting areas used throughout the engagement lifecycle.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Link
              href="/engagements"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <ShieldCheck size={20} />
              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                Engagement Control
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Monitor engagement status, risk, responsibility, and
                completion.
              </p>

              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-600">
                Current portfolio
                <ArrowRight size={14} />
              </div>
            </Link>

            <Link
              href="/audits"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <BarChart3 size={20} />
              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                Audit Workflow
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Access the firm's four-phase audit methodology and
                workflow.
              </p>

              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-purple-600">
                Open methodology
                <ArrowRight size={14} />
              </div>
            </Link>

            <Link
              href="/clients"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Users size={20} />
              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                Client Portfolio
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Review clients associated with the firm's audit
                engagements.
              </p>

              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                View clients
                <ArrowRight size={14} />
              </div>
            </Link>

            <Link
              href="/reports"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <FileText size={20} />
              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                Reports
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Review engagement outputs, reporting status, and final
                deliverables.
              </p>

              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-amber-600">
                View reports
                <ArrowRight size={14} />
              </div>
            </Link>
          </div>
        </div>

        {/* Information banner */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <ShieldCheck size={20} />
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                Engagement workflow control
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                The Engagements module controls the portfolio-level view.
                Opening an engagement takes the audit team into its detailed
                Phase 1–4 workflow, including planning, risk assessment,
                risk response, conclusion, reporting, and documentation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

