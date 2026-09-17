"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  ClipboardCheck,
  FileArchive,
  FileCheck2,
  FileText,
  MessageSquare,
  Scale,
  ShieldCheck,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

const sections = [
  {
    title: "Evaluate Misstatements",
    description:
      "Evaluate identified misstatements and determine their effect on the financial statements.",
    href: "evaluate-misstatements",
    icon: ClipboardCheck,
  },
  {
    title: "Financial Statement Procedures",
    description:
      "Perform final financial statement review and completion procedures.",
    href: "financial-statement-procedures",
    icon: FileCheck2,
  },
  {
    title: "Summary Review",
    description:
      "Perform the final audit summary and overall engagement review.",
    href: "summary-review",
    icon: FileText,
  },
  {
    title: "Opinion & Report",
    description:
      "Determine the audit opinion and prepare the audit report.",
    href: "opinion-report",
    icon: Scale,
  },
  {
    title: "Client Communications",
    description:
      "Document required communications with management and those charged with governance.",
    href: "client-communications",
    icon: MessageSquare,
  },
  {
    title: "Documentation Archive",
    description:
      "Complete and organize the final audit documentation and archive.",
    href: "documentation-archive",
    icon: FileArchive,
  },
  {
    title: "Quality Monitoring",
    description:
      "Complete engagement quality and final monitoring procedures.",
    href: "quality-monitoring",
    icon: ShieldCheck,
  },
];

export default function ConclusionReportingPage() {
  const params = useParams();

  const engagementId = String(params.id ?? "");

  return (
    <AppLayout>
      <main className="min-w-0 flex-1 bg-gray-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

          {/* HEADER */}
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="shrink-0 rounded-lg bg-blue-100 p-2">
                <FileCheck2 className="h-6 w-6 text-blue-600" />
              </div>

              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                  Conclusion & Reporting
                </h1>

                <p className="text-sm text-gray-500">
                  Phase 4 — Conclusion and Reporting
                </p>
              </div>
            </div>

            {/* CURRENT ENGAGEMENT */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">
                Current Engagement
              </p>

              <p className="mt-1 text-lg font-semibold text-gray-900">
                Engagement #{engagementId}
              </p>
            </div>
          </div>

          {/* INTRODUCTION */}
          <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Phase 4 — Conclusion & Reporting
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              Complete the final audit procedures, evaluate
              misstatements, perform the overall engagement review,
              determine the audit opinion, communicate required
              matters, and finalize the engagement documentation.
            </p>
          </section>

          {/* WORKPAPERS */}
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Conclusion & Reporting Workpapers
              </h2>

              <p className="text-sm text-gray-500">
                Select a workpaper below to continue the engagement.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {sections.map((section) => {
                const Icon = section.icon;

                return (
                  <Link
                    key={section.href}
                    href={`/engagements/${engagementId}/conclusion-reporting/${section.href}`}
                    className="group flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="shrink-0 rounded-lg bg-gray-100 p-3 transition group-hover:bg-blue-100">
                        <Icon className="h-6 w-6 text-gray-600 group-hover:text-blue-600" />
                      </div>

                      <ArrowRight className="h-5 w-5 shrink-0 text-gray-400 transition group-hover:translate-x-1 group-hover:text-blue-600" />
                    </div>

                    <h3 className="mt-5 break-words text-base font-semibold text-gray-900">
                      {section.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      {section.description}
                    </p>

                    <div className="mt-auto pt-5 text-sm font-medium text-blue-600">
                      Open workpaper
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* FOOTER */}
          <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
            <p className="text-sm leading-6 text-blue-900">
              <span className="font-semibold">
                Engagement #{engagementId}
              </span>{" "}
              is currently in the Conclusion & Reporting phase.
              Complete all applicable workpapers before finalizing
              the engagement.
            </p>
          </div>

        </div>
      </main>
    </AppLayout>
  );
}