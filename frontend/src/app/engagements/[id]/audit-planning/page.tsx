
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "../../../../components/layout/AppLayout";

import {
  ArrowLeft,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileSearch,
  Loader2,
  Users,
  Workflow,
  AlertTriangle,
  Clock,
} from "lucide-react";

import { getEngagement } from "@/lib/api";

/* =========================================================
   TYPES
========================================================= */

interface Engagement {
  id: number;
  engagement_code: string;
  title: string;
  engagement_type: string;
  description: string;
  status: string;
  current_phase: string;
  risk_level: string;
  start_date: string;
  planned_end_date: string | null;
  actual_end_date: string | null;
  financial_year_end: string | null;
  progress_percentage: number;
}

/* =========================================================
   WORKPAPER CONFIGURATION
========================================================= */

const workpapers = [
  {
    number: "1.1",
    title: "Planning Assessment",
    description:
      "Document the auditor's understanding of the entity, industry, regulatory environment, accounting framework, reporting requirements, significant changes, fraud considerations, going concern, related parties and other planning matters.",
    icon: ClipboardCheck,
    route: "planning-assessment",
  },
  {
    number: "1.2",
    title: "Materiality Assessment",
    description:
      "Determine overall materiality, performance materiality and clearly trivial threshold using an appropriate benchmark and document the rationale and qualitative factors.",
    icon: Calculator,
    route: "materiality-assessment",
  },
  {
    number: "1.3",
    title: "Audit Scope",
    description:
      "Define entities, locations, reporting periods, financial statement areas, significant accounts, disclosures, systems, processes and areas outside the scope of the engagement.",
    icon: FileSearch,
    route: "audit-scope",
  },
  {
    number: "1.4",
    title: "Audit Team",
    description:
      "Identify engagement team members, their roles and responsibilities, budgeted hours and key team members required to execute the audit effectively.",
    icon: Users,
    route: "audit-team",
  },
  {
    number: "1.5",
    title: "Planning Matters",
    description:
      "Capture significant risks, fraud risks, related parties, going concern, accounting estimates, IT matters, regulatory matters, litigation and other matters requiring specific audit responses.",
    icon: AlertTriangle,
    route: "planning-matters",
  },
  {
    number: "1.6",
    title: "Planning Procedures",
    description:
      "Track the planning procedures required before fieldwork, including objectives, procedures performed, status, conclusions and responsible team members.",
    icon: Workflow,
    route: "planning-procedures",
  },
];

/* =========================================================
   HELPERS
========================================================= */

function formatDate(date: string | null) {
  if (!date) {
    return "Not specified";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatLabel(value: string | null | undefined) {
  if (!value) {
    return "Not specified";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getRiskBadgeClasses(risk: string) {
  switch (risk) {
    case "low":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "high":
      return "bg-red-50 text-red-700 border-red-200";

    case "medium":
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

function getStatusBadgeClasses(status: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "risk_assessment":
      return "bg-purple-50 text-purple-700 border-purple-200";

    case "fieldwork":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "reporting":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";

    case "cancelled":
      return "bg-red-50 text-red-700 border-red-200";

    case "planning":
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

/* =========================================================
   PAGE
========================================================= */

export default function AuditPlanningPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = params.id as string;

  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =======================================================
     LOAD ENGAGEMENT
  ======================================================= */

  useEffect(() => {
    async function loadEngagement() {
      try {
        setLoading(true);
        setError("");

        const data = await getEngagement(engagementId);

        setEngagement(data as unknown as Engagement);
      } catch (err) {
        console.error("Failed to load engagement:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load engagement."
        );
      } finally {
        setLoading(false);
      }
    }

    if (engagementId) {
      loadEngagement();
    }
  }, [engagementId]);

  /* =======================================================
     NAVIGATION
  ======================================================= */

  function openWorkpaper(route: string) {
    router.push(
      `/engagements/${engagementId}/audit-planning/${route}`
    );
  }

  function goBack() {
    router.push(`/engagements/${engagementId}`);
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />

            <p className="text-sm font-medium text-gray-600">
              Loading audit planning...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error || !engagement) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={goBack}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Engagement
          </button>

          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <h2 className="font-semibold text-red-900">
                  Unable to load engagement
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {error || "The requested engagement could not be found."}
                </p>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  /* =======================================================
     MAIN PAGE
  ======================================================= */

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* =================================================
            TOP NAVIGATION
        ================================================= */}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Engagement
          </button>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Engagement</span>

            <ChevronRight className="h-4 w-4" />

            <span className="font-medium text-gray-900">
              Phase 1
            </span>
          </div>
        </div>

        {/* =================================================
            HEADER
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  <BookOpen className="h-3.5 w-3.5" />
                  Phase 1
                </div>

                <h1 className="text-2xl font-bold text-white sm:text-3xl">
                  Audit Planning
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Establish the foundation of the audit through planning,
                  materiality, scope, team composition, significant matters
                  and planning procedures.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/10 px-5 py-4 lg:min-w-[260px]">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Engagement
                </p>

                <p className="mt-1 text-lg font-bold text-white">
                  {engagement.engagement_code}
                </p>

                <p className="mt-1 text-sm text-slate-300">
                  {engagement.title}
                </p>
              </div>
            </div>
          </div>

          {/* =================================================
              ENGAGEMENT INFORMATION
          ================================================= */}

          <div className="grid grid-cols-1 divide-y divide-gray-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            <div className="px-6 py-5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Status
              </p>

              <span
                className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClasses(
                  engagement.status
                )}`}
              >
                {formatLabel(engagement.status)}
              </span>
            </div>

            <div className="px-6 py-5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Risk Level
              </p>

              <span
                className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getRiskBadgeClasses(
                  engagement.risk_level
                )}`}
              >
                {formatLabel(engagement.risk_level)}
              </span>
            </div>

            <div className="px-6 py-5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Financial Year End
              </p>

              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Clock className="h-4 w-4 text-gray-400" />
                {formatDate(engagement.financial_year_end)}
              </div>
            </div>

            <div className="px-6 py-5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Planning Progress
              </p>

              <div className="mt-2 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{
                      width: `${Math.min(
                        Math.max(engagement.progress_percentage || 0, 0),
                        100
                      )}%`,
                    }}
                  />
                </div>

                <span className="text-sm font-bold text-gray-900">
                  {engagement.progress_percentage || 0}%
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            INTRODUCTION
        ================================================= */}

        <section className="rounded-xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <BookOpen className="h-5 w-5 text-blue-700" />
            </div>

            <div>
              <h2 className="font-semibold text-blue-900">
                Phase 1 Planning Workpapers
              </h2>

              <p className="mt-1 text-sm leading-6 text-blue-800">
                Complete each planning workpaper before proceeding to the
                detailed risk assessment and audit execution phases. The
                information documented here forms the basis for the overall
                audit strategy.
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            WORKPAPERS
        ================================================= */}

        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Planning Workpapers
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Select a workpaper to review or complete its documentation.
              </p>
            </div>

            <div className="hidden rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 sm:block">
              {workpapers.length} Workpapers
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {workpapers.map((workpaper) => {
              const Icon = workpaper.icon;

              return (
                <button
                  key={workpaper.number}
                  type="button"
                  onClick={() => openWorkpaper(workpaper.route)}
                  className="group text-left"
                >
                  <div className="h-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="rounded-xl bg-blue-50 p-3 transition group-hover:bg-blue-100">
                          <Icon className="h-6 w-6 text-blue-600" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wide text-blue-600">
                              {workpaper.number}
                            </span>

                            <span className="text-gray-300">
                              •
                            </span>

                            <span className="text-xs font-medium text-gray-400">
                              Planning
                            </span>
                          </div>

                          <h3 className="mt-1 text-lg font-bold text-gray-900 group-hover:text-blue-700">
                            {workpaper.title}
                          </h3>
                        </div>
                      </div>

                      <ChevronRight className="h-5 w-5 shrink-0 text-gray-300 transition group-hover:translate-x-1 group-hover:text-blue-600" />
                    </div>

                    <p className="mt-5 text-sm leading-6 text-gray-600">
                      {workpaper.description}
                    </p>

                    <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                        <CheckCircle2 className="h-4 w-4 text-gray-300" />
                        Workpaper
                      </div>

                      <span className="text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                        Open workpaper
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* =================================================
            AUDIT PLANNING NOTE
        ================================================= */}

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-gray-100 p-2.5">
              <ClipboardCheck className="h-5 w-5 text-gray-600" />
            </div>

            <div>
              <h2 className="font-semibold text-gray-900">
                Planning Completion
              </h2>

              <p className="mt-1 text-sm leading-6 text-gray-600">
                The planning phase should establish the audit strategy,
                identify significant matters and determine the resources and
                procedures necessary to obtain sufficient appropriate audit
                evidence.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
                  Engagement: {engagement.engagement_code}
                </div>

                <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
                  Type: {formatLabel(engagement.engagement_type)}
                </div>

                <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
                  Start: {formatDate(engagement.start_date)}
                </div>

                {engagement.planned_end_date && (
                  <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
                    Planned End: {formatDate(engagement.planned_end_date)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

