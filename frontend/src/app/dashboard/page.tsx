"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Plus,
  ShieldAlert,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

type RiskLevel = "High" | "Medium" | "Low";

type Engagement = {
  id: string;
  code: string;
  client: string;
  status: string;
  risk: RiskLevel;
  progress: number;
  phase: string;
  dueDate: string;
};

const engagements: Engagement[] = [
  {
    id: "eng-001",
    code: "AUD-2026-001",
    client: "ABC Manufacturing Ltd",
    status: "Fieldwork",
    risk: "High",
    progress: 62,
    phase: "Phase 3",
    dueDate: "12 Sep 2026",
  },
  {
    id: "eng-002",
    code: "AUD-2026-002",
    client: "Tanzania Commercial Bank",
    status: "Reporting",
    risk: "High",
    progress: 88,
    phase: "Phase 4",
    dueDate: "18 Sep 2026",
  },
  {
    id: "eng-003",
    code: "AUD-2026-003",
    client: "Greenfield Agro Ltd",
    status: "In Progress",
    risk: "Medium",
    progress: 41,
    phase: "Phase 2",
    dueDate: "25 Sep 2026",
  },
  {
    id: "eng-004",
    code: "AUD-2026-004",
    client: "Kilimanjaro Logistics Ltd",
    status: "Planning",
    risk: "Medium",
    progress: 18,
    phase: "Phase 1",
    dueDate: "30 Sep 2026",
  },
  {
    id: "eng-005",
    code: "AUD-2026-005",
    client: "East Africa Holdings PLC",
    status: "Completed",
    risk: "Low",
    progress: 100,
    phase: "Completed",
    dueDate: "Completed",
  },
];

const workflow = [
  {
    number: "01",
    title: "Planning",
    description: "Engagement acceptance, materiality and planning",
    count: 6,
    progress: 76,
  },
  {
    number: "02",
    title: "Risk Assessment",
    description: "Identify and assess risks of material misstatement",
    count: 5,
    progress: 61,
  },
  {
    number: "03",
    title: "Risk Response",
    description: "Controls testing and substantive procedures",
    count: 9,
    progress: 68,
  },
  {
    number: "04",
    title: "Conclusion & Reporting",
    description: "Final review, opinion and reporting",
    count: 4,
    progress: 84,
  },
];

const deadlines = [
  {
    client: "ABC Manufacturing Ltd",
    task: "Complete risk response workpapers",
    date: "12 Sep",
    days: "8 days",
    urgent: true,
  },
  {
    client: "Tanzania Commercial Bank",
    task: "Finalize audit opinion",
    date: "18 Sep",
    days: "14 days",
    urgent: false,
  },
  {
    client: "Greenfield Agro Ltd",
    task: "Complete risk assessment",
    date: "25 Sep",
    days: "21 days",
    urgent: false,
  },
  {
    client: "Kilimanjaro Logistics Ltd",
    task: "Approve audit planning",
    date: "30 Sep",
    days: "26 days",
    urgent: false,
  },
];

const attentionItems = [
  {
    title: "High-risk engagement requires review",
    description: "ABC Manufacturing Ltd",
    type: "High Risk",
    icon: ShieldAlert,
  },
  {
    title: "Workpapers pending manager review",
    description: "2 workpapers require approval",
    type: "Review",
    icon: FileText,
  },
  {
    title: "Materiality approval pending",
    description: "Kilimanjaro Logistics Ltd",
    type: "Approval",
    icon: Target,
  },
  {
    title: "EQR review pending",
    description: "Tanzania Commercial Bank",
    type: "Quality",
    icon: CheckCircle2,
  },
];

const recentActivity = [
  {
    title: "Risk assessment completed",
    description: "Greenfield Agro Ltd",
    time: "32 minutes ago",
    icon: CheckCircle2,
  },
  {
    title: "Workpaper submitted for review",
    description: "ABC Manufacturing Ltd",
    time: "1 hour ago",
    icon: FileText,
  },
  {
    title: "Management representation received",
    description: "Tanzania Commercial Bank",
    time: "3 hours ago",
    icon: Users,
  },
  {
    title: "Audit report submitted for review",
    description: "Tanzania Commercial Bank",
    time: "Yesterday",
    icon: BarChart3,
  },
];

function getRiskStyle(risk: RiskLevel) {
  switch (risk) {
    case "High":
      return "bg-red-50 text-red-700 border-red-100";
    case "Medium":
      return "bg-amber-50 text-amber-700 border-amber-100";
    case "Low":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    default:
      return "bg-slate-50 text-slate-700 border-slate-100";
  }
}

function getStatusStyle(status: string) {
  switch (status) {
    case "Planning":
      return "bg-slate-100 text-slate-700";
    case "In Progress":
      return "bg-blue-50 text-blue-700";
    case "Fieldwork":
      return "bg-violet-50 text-violet-700";
    case "Reporting":
      return "bg-amber-50 text-amber-700";
    case "Completed":
      return "bg-emerald-50 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-blue-600 transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export default function DashboardPage() {
  /*
   * Automatic greeting based on the user's current local time.
   *
   * 05:00 - 11:59  → Good morning
   * 12:00 - 16:59  → Good afternoon
   * 17:00 - 04:59  → Good evening
   */
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();

      if (hour >= 5 && hour < 12) {
        setGreeting("Good morning");
      } else if (hour >= 12 && hour < 17) {
        setGreeting("Good afternoon");
      } else {
        setGreeting("Good evening");
      }
    };

    // Set the correct greeting immediately when the page loads.
    updateGreeting();

    // Check every minute so the greeting changes automatically
    // even if the dashboard remains open for many hours.
    const interval = setInterval(updateGreeting, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const activeEngagements = engagements.filter(
    (engagement) => engagement.status !== "Completed"
  ).length;

  const highRiskEngagements = engagements.filter(
    (engagement) => engagement.risk === "High"
  ).length;

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600">
              <Activity size={16} />
              <span>Audit Management Dashboard</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              {greeting}, Samweli
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Executive overview of your audit portfolio, risk position,
              deadlines, workflow progress and reporting status.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/reports"
              className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:flex"
            >
              <FileText size={17} />
              Reports
            </Link>

            <Link
              href="/engagements/new"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
            >
              <Plus size={18} />
              New Engagement
            </Link>
          </div>
        </section>

        {/* KPI Cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <BriefcaseBusiness size={20} />
              </div>
              <TrendingUp size={17} className="text-emerald-500" />
            </div>

            <p className="mt-5 text-sm font-medium text-slate-500">
              Total Engagements
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-950">24</p>

            <p className="mt-1 text-xs text-emerald-600">
              +3 from last period
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Clock3 size={20} />
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {activeEngagements} active
              </span>
            </div>

            <p className="mt-5 text-sm font-medium text-slate-500">
              Active Engagements
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-950">18</p>

            <p className="mt-1 text-xs text-slate-400">
              Currently in progress
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <ShieldAlert size={20} />
              </div>
              <AlertTriangle size={17} className="text-red-500" />
            </div>

            <p className="mt-5 text-sm font-medium text-slate-500">
              High Risk
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-950">05</p>

            <p className="mt-1 text-xs text-red-600">
              Requires close monitoring
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <CalendarDays size={20} />
              </div>
              <Bell size={17} className="text-amber-500" />
            </div>

            <p className="mt-5 text-sm font-medium text-slate-500">
              Due Soon
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-950">04</p>

            <p className="mt-1 text-xs text-slate-400">
              Within the next 14 days
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={20} />
              </div>
              <span className="text-xs font-semibold text-emerald-600">
                Ready
              </span>
            </div>

            <p className="mt-5 text-sm font-medium text-slate-500">
              Reports Ready
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-950">03</p>

            <p className="mt-1 text-xs text-slate-400">
              Awaiting final action
            </p>
          </div>
        </section>

        {/* Portfolio + Deadlines */}
        <section className="grid gap-6 xl:grid-cols-3">
          {/* Engagement Portfolio */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="font-semibold text-slate-950">
                  Engagement Portfolio
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Current distribution across the audit lifecycle
                </p>
              </div>

              <Link
                href="/engagements"
                className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                View all
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="space-y-6 p-6">
              {[
                {
                  label: "Planning",
                  count: 6,
                  percentage: 25,
                  description: "Engagements being planned",
                },
                {
                  label: "Risk Assessment",
                  count: 5,
                  percentage: 21,
                  description: "Risk assessment in progress",
                },
                {
                  label: "Risk Response",
                  count: 9,
                  percentage: 38,
                  description: "Fieldwork and testing",
                },
                {
                  label: "Reporting",
                  count: 4,
                  percentage: 16,
                  description: "Conclusion and reporting",
                },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {item.label}
                      </p>
                      <p className="text-xs text-slate-400">
                        {item.description}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-bold text-slate-900">
                        {item.count}
                      </span>
                      <span className="ml-1 text-xs text-slate-400">
                        engagements
                      </span>
                    </div>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deadlines */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="font-semibold text-slate-950">
                  Upcoming Deadlines
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Key dates requiring attention
                </p>
              </div>

              <CalendarDays size={19} className="text-slate-400" />
            </div>

            <div className="divide-y divide-slate-100">
              {deadlines.map((deadline) => (
                <div key={deadline.client} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {deadline.client}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {deadline.task}
                      </p>
                    </div>

                    {deadline.urgent && (
                      <span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold uppercase text-red-600">
                        Urgent
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <CalendarDays size={13} />
                      {deadline.date}
                    </div>

                    <span className="text-xs font-semibold text-slate-600">
                      {deadline.days}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Audit Workflow */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-950">
                  Audit Workflow
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Engagement progress across the four-stage audit methodology
                </p>
              </div>

              <Link
                href="/engagements"
                className="hidden items-center gap-1 text-sm font-semibold text-blue-600 sm:flex"
              >
                Engagements
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div className="grid divide-y divide-slate-100 md:grid-cols-4 md:divide-x md:divide-y-0">
            {workflow.map((step) => (
              <div key={step.number} className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider text-blue-600">
                    PHASE {step.number}
                  </span>

                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                    {step.count}
                  </span>
                </div>

                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {step.title}
                </h3>

                <p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">
                  {step.description}
                </p>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Progress</span>
                    <span className="text-xs font-bold text-slate-700">
                      {step.progress}%
                    </span>
                  </div>

                  <ProgressBar value={step.progress} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Engagements + Attention */}
        <section className="grid gap-6 xl:grid-cols-3">
          {/* Recent Engagements */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="font-semibold text-slate-950">
                  Recent Engagements
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Latest activity across your audit portfolio
                </p>
              </div>

              <Link
                href="/engagements"
                className="flex items-center gap-1 text-sm font-semibold text-blue-600"
              >
                View all
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Engagement
                    </th>
                    <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Risk
                    </th>
                    <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Progress
                    </th>
                    <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {engagements.slice(0, 4).map((engagement) => (
                    <tr
                      key={engagement.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {engagement.client}
                        </p>
                        <p className="mt-0.5 text-xs text-blue-600">
                          {engagement.code}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyle(
                            engagement.status
                          )}`}
                        >
                          {engagement.status}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getRiskStyle(
                            engagement.risk
                          )}`}
                        >
                          {engagement.risk}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-20">
                            <ProgressBar value={engagement.progress} />
                          </div>
                          <span className="text-xs font-semibold text-slate-600">
                            {engagement.progress}%
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/engagements/${engagement.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          Open
                          <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Attention Required */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="font-semibold text-slate-950">
                  Attention Required
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Items requiring action or review
                </p>
              </div>

              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-red-50 px-2 text-xs font-bold text-red-600">
                04
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {attentionItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.title} className="flex gap-3 px-6 py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Icon size={17} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-5 text-slate-800">
                        {item.title}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {item.description}
                      </p>

                      <span className="mt-2 inline-flex rounded-full bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500">
                        {item.type}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-semibold text-slate-950">
                Recent Activity
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Latest actions across the platform
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {recentActivity.map((activity) => {
                const Icon = activity.icon;

                return (
                  <div
                    key={activity.title}
                    className="flex items-center gap-4 px-6 py-4"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <Icon size={17} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">
                        {activity.title}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {activity.description}
                      </p>
                    </div>

                    <span className="shrink-0 text-xs text-slate-400">
                      {activity.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Risk Overview */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-semibold text-slate-950">
                Risk Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current engagement risk distribution
              </p>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-8">
                <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full border-[14px] border-red-100">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-950">
                      {highRiskEngagements}
                    </p>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      High Risk
                    </p>
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <div className="mb-1.5 flex justify-between">
                      <span className="text-xs font-medium text-slate-600">
                        High Risk
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        5
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-[21%] rounded-full bg-red-500" />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex justify-between">
                      <span className="text-xs font-medium text-slate-600">
                        Medium Risk
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        11
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-[46%] rounded-full bg-amber-400" />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex justify-between">
                      <span className="text-xs font-medium text-slate-600">
                        Low Risk
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        8
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-[33%] rounded-full bg-emerald-500" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 rounded-xl bg-slate-50 p-4">
                <AlertTriangle
                  size={17}
                  className="shrink-0 text-amber-500"
                />

                <p className="text-xs leading-5 text-slate-600">
                  High-risk engagements should receive increased management
                  attention and review.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Access */}
        <section>
          <div className="mb-4">
            <h2 className="font-semibold text-slate-950">Quick Access</h2>
            <p className="mt-1 text-sm text-slate-500">
              Navigate directly to frequently used areas
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                title: "Audits",
                description: "Audit portfolio",
                href: "/audits",
                icon: BriefcaseBusiness,
              },
              {
                title: "Clients",
                description: "Client directory",
                href: "/clients",
                icon: Users,
              },
              {
                title: "Engagements",
                description: "Audit engagements",
                href: "/engagements",
                icon: ClipboardListIcon,
              },
              {
                title: "Reports",
                description: "Audit reports",
                href: "/reports",
                icon: FileText,
              },
              {
                title: "Settings",
                description: "System configuration",
                href: "/settings",
                icon: Target,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 transition group-hover:bg-blue-50 group-hover:text-blue-600">
                      <Icon size={19} />
                    </div>

                    <ArrowRight
                      size={17}
                      className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
                    />
                  </div>

                  <p className="mt-4 text-sm font-semibold text-slate-900">
                    {item.title}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {item.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Footer information */}
        <div className="flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>AUD Platform • Audit Management System</p>

          <div className="flex items-center gap-2">
            <span>FY 2026</span>
            <span>•</span>
            <span>All systems operational</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/*
 * Local alias used for the Quick Access icon.
 * Keeping it separate avoids changing the visual structure above.
 */
function ClipboardListIcon({
  size,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return <BriefcaseBusiness size={size} className={className} />;
}