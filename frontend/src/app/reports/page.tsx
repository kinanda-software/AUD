"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";

type ReportStatus =
  | "Draft"
  | "Under Review"
  | "Approved"
  | "Issued";

type OpinionType =
  | "Unmodified"
  | "Qualified"
  | "Adverse"
  | "Disclaimer"
  | "Pending";

type AuditReport = {
  id: string;
  reportNumber: string;
  client: string;
  engagement: string;
  period: string;
  opinion: OpinionType;
  status: ReportStatus;
  partner: string;
  manager: string;
  reportDate: string;
};

const reports: AuditReport[] = [
  {
    id: "rep-001",
    reportNumber: "REP-2026-001",
    client: "ABC Manufacturing Ltd",
    engagement: "AUD-2026-001",
    period: "Year ended 30 June 2026",
    opinion: "Pending",
    status: "Under Review",
    partner: "James M.",
    manager: "Sarah K.",
    reportDate: "30 Sep 2026",
  },
  {
    id: "rep-002",
    reportNumber: "REP-2026-002",
    client: "Tanzania Commercial Bank",
    engagement: "AUD-2026-002",
    period: "Year ended 31 December 2025",
    opinion: "Unmodified",
    status: "Approved",
    partner: "Michael R.",
    manager: "David P.",
    reportDate: "20 Sep 2026",
  },
  {
    id: "rep-003",
    reportNumber: "REP-2026-003",
    client: "Greenfield Agro Ltd",
    engagement: "AUD-2026-003",
    period: "Year ended 30 June 2026",
    opinion: "Pending",
    status: "Draft",
    partner: "James M.",
    manager: "Sarah K.",
    reportDate: "15 Oct 2026",
  },
  {
    id: "rep-004",
    reportNumber: "REP-2026-004",
    client: "Kilimanjaro Logistics Ltd",
    engagement: "AUD-2026-004",
    period: "Year ended 31 March 2026",
    opinion: "Pending",
    status: "Draft",
    partner: "Robert T.",
    manager: "Grace N.",
    reportDate: "30 Nov 2026",
  },
  {
    id: "rep-005",
    reportNumber: "REP-2026-005",
    client: "East Africa Holdings PLC",
    engagement: "AUD-2026-005",
    period: "Year ended 31 December 2025",
    opinion: "Unmodified",
    status: "Issued",
    partner: "Michael R.",
    manager: "David P.",
    reportDate: "31 May 2026",
  },
];

const statusOptions: Array<"All" | ReportStatus> = [
  "All",
  "Draft",
  "Under Review",
  "Approved",
  "Issued",
];

const opinionOptions: Array<"All" | OpinionType> = [
  "All",
  "Unmodified",
  "Qualified",
  "Adverse",
  "Disclaimer",
  "Pending",
];

function getStatusClasses(status: ReportStatus) {
  switch (status) {
    case "Draft":
      return "bg-slate-100 text-slate-700";

    case "Under Review":
      return "bg-amber-50 text-amber-700";

    case "Approved":
      return "bg-blue-50 text-blue-700";

    case "Issued":
      return "bg-emerald-50 text-emerald-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getOpinionClasses(opinion: OpinionType) {
  switch (opinion) {
    case "Unmodified":
      return "bg-emerald-50 text-emerald-700";

    case "Qualified":
      return "bg-amber-50 text-amber-700";

    case "Adverse":
      return "bg-red-50 text-red-700";

    case "Disclaimer":
      return "bg-purple-50 text-purple-700";

    case "Pending":
      return "bg-slate-100 text-slate-600";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function ReportsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"All" | ReportStatus>("All");
  const [opinionFilter, setOpinionFilter] =
    useState<"All" | OpinionType>("All");

  const filteredReports = useMemo(() => {
    const query = search.toLowerCase().trim();

    return reports.filter((report) => {
      const matchesSearch =
        !query ||
        report.client.toLowerCase().includes(query) ||
        report.reportNumber.toLowerCase().includes(query) ||
        report.engagement.toLowerCase().includes(query) ||
        report.partner.toLowerCase().includes(query) ||
        report.manager.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        report.status === statusFilter;

      const matchesOpinion =
        opinionFilter === "All" ||
        report.opinion === opinionFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesOpinion
      );
    });
  }, [search, statusFilter, opinionFilter]);

  const totalReports = reports.length;

  const issuedReports = reports.filter(
    (report) => report.status === "Issued"
  ).length;

  const reviewReports = reports.filter(
    (report) => report.status === "Under Review"
  ).length;

  const approvedReports = reports.filter(
    (report) => report.status === "Approved"
  ).length;

  return (
    <AppLayout>
      <div className="space-y-8">

        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileText size={23} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Reports
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage audit reports, opinions, approvals, and issued
                deliverables.
              </p>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FileText size={20} />
              </div>

              <span className="text-xs text-slate-400">
                Portfolio
              </span>
            </div>

            <p className="mt-4 text-2xl font-bold text-slate-900">
              {totalReports}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Total reports
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock3 size={20} />
              </div>

              <span className="text-xs text-amber-600">
                Review
              </span>
            </div>

            <p className="mt-4 text-2xl font-bold text-slate-900">
              {reviewReports}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Under review
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <FileCheck2 size={20} />
              </div>

              <span className="text-xs text-purple-600">
                Approval
              </span>
            </div>

            <p className="mt-4 text-2xl font-bold text-slate-900">
              {approvedReports}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Approved reports
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={20} />
              </div>

              <span className="text-xs text-emerald-600">
                Final
              </span>
            </div>

            <p className="mt-4 text-2xl font-bold text-slate-900">
              {issuedReports}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Issued reports
            </p>
          </div>
        </div>

        {/* Reporting workflow */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Reporting Workflow
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Reports progress through review, approval, and final
              issuance.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-700 text-sm font-bold text-white">
                  1
                </div>

                <div>
                  <p className="font-semibold text-slate-900">
                    Draft
                  </p>

                  <p className="text-xs text-slate-500">
                    Prepare auditor report
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600 text-sm font-bold text-white">
                  2
                </div>

                <div>
                  <p className="font-semibold text-slate-900">
                    Review
                  </p>

                  <p className="text-xs text-slate-500">
                    Leadership review
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                  3
                </div>

                <div>
                  <p className="font-semibold text-slate-900">
                    Approval
                  </p>

                  <p className="text-xs text-slate-500">
                    Final approval
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
                    Issued
                  </p>

                  <p className="text-xs text-slate-500">
                    Deliver final report
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Reports directory */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Report Directory
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Search and filter audit reports.
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
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search reports..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:w-64"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as
                        | "All"
                        | ReportStatus
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      Status: {status}
                    </option>
                  ))}
                </select>

                <select
                  value={opinionFilter}
                  onChange={(event) =>
                    setOpinionFilter(
                      event.target.value as
                        | "All"
                        | OpinionType
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
                >
                  {opinionOptions.map((opinion) => (
                    <option key={opinion} value={opinion}>
                      Opinion: {opinion}
                    </option>
                  ))}
                </select>

              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">

              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Report
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Client
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Period
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Opinion
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Report Date
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Action
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    className="transition hover:bg-slate-50"
                  >

                    <td className="px-6 py-5">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {report.reportNumber}
                        </p>

                        <p className="mt-1 text-xs text-blue-600">
                          {report.engagement}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <p className="text-sm font-semibold text-slate-800">
                        {report.client}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Partner: {report.partner}
                      </p>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-start gap-2">
                        <CalendarDays
                          size={16}
                          className="mt-0.5 text-slate-400"
                        />

                        <span className="text-sm text-slate-700">
                          {report.period}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getOpinionClasses(
                          report.opinion
                        )}`}
                      >
                        {report.opinion}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                          report.status
                        )}`}
                      >
                        {report.status}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <span className="text-sm text-slate-700">
                        {report.reportDate}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-right">
                      <Link
                        href={`/engagements/${report.engagement}/conclusion-reporting/opinion-report`}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Eye size={14} />
                        Open
                      </Link>
                    </td>

                  </tr>
                ))}

                {filteredReports.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-16 text-center"
                    >
                      <Search
                        size={32}
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-3 font-semibold text-slate-700">
                        No reports found
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Try changing your search or filters.
                      </p>
                    </td>
                  </tr>
                )}

              </tbody>
            </table>
          </div>
        </div>

        {/* Quality and reporting controls */}
        <div className="grid gap-4 md:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ShieldCheck size={20} />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              Report Quality
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Review reporting requirements, opinion decisions, and
              final engagement conclusions.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={20} />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              Approval Control
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Monitor management and engagement leadership approval
              before reports are issued.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Download size={20} />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              Final Deliverables
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Manage final audit reports and engagement reporting
              deliverables.
            </p>
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
                Audit reporting
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                The Reports module provides the portfolio-level view
                of audit reporting. Detailed opinion formation and
                report preparation remain inside each engagement's
                Phase 4 — Conclusion & Reporting workflow.
              </p>
            </div>

          </div>
        </div>

      </div>
    </AppLayout>
  );
}