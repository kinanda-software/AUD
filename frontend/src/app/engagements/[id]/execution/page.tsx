"use client";

import { useParams, useRouter } from "next/navigation";
import AppLayout from "../../../../components/layout/AppLayout";

import {
  ArrowLeft,
  ClipboardCheck,
  RefreshCw,
  ShieldAlert,
  FileSearch,
  FileText,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

const executionSections = [
  {
    number: "3.1",
    title: "Execute Tests of Controls",
    description:
      "Test selected controls, document exceptions, evaluate their nature and cause, and determine whether reliance remains appropriate.",
    icon: ClipboardCheck,
  },
  {
    number: "3.2",
    title: "Interim-to-Year-End Considerations",
    description:
      "Roll forward interim controls testing to cover the remaining period and evaluate changes in the control.",
    icon: RefreshCw,
  },
  {
    number: "3.3",
    title: "Execute Fraud / Journal Entry Procedures",
    description:
      "Perform journal entry testing and management override procedures and evaluate anomalies for possible fraud indicators.",
    icon: ShieldAlert,
  },
  {
    number: "3.4",
    title: "Perform Substantive Procedures",
    description:
      "Execute analytics, key-item testing, sampling, confirmations and other substantive audit procedures.",
    icon: FileSearch,
  },
  {
    number: "3.5",
    title: "Perform General Audit Procedures",
    description:
      "Execute cross-cutting audit procedures including group, expert, estimates, FSCP, sustainability and service organization work.",
    icon: FileText,
  },
  {
    number: "3.6",
    title: "Reassess Combined Risk Assessments",
    description:
      "Revisit risk assessments based on control exceptions, misstatements, confirmation exceptions and unexpected results.",
    icon: AlertTriangle,
  },
];

export default function ExecutionPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = params.id as string;

  const handleBack = () => {
    router.push(
      `/engagements/${engagementId}/risk-assessment`
    );
  };

  const openSection = (section: string) => {
    router.push(
      `/engagements/${engagementId}/execution/${section}`
    );
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">

        {/* PAGE HEADER */}

        <div className="mb-6 flex items-center justify-between">

          <div className="flex items-center gap-4">

            <button
              type="button"
              onClick={handleBack}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100"
            >
              <ArrowLeft size={19} />
            </button>

            <div>

              <div className="flex items-center gap-2">

                <span className="text-sm font-semibold text-blue-600">
                  Phase 3
                </span>

                <span className="text-gray-400">
                  /
                </span>

                <span className="text-sm text-gray-500">
                  Execution
                </span>

              </div>

              <h1 className="mt-1 text-2xl font-bold text-gray-900">
                Audit Execution
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Execute planned audit procedures, document evidence,
                evaluate exceptions and update risk assessments.
              </p>

            </div>

          </div>

          {/* STATUS */}

          <div className="hidden items-center gap-2 rounded-full bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-700 md:flex">

            <span className="h-2 w-2 rounded-full bg-yellow-500" />

            In Progress

          </div>

        </div>

        {/* ENGAGEMENT SUMMARY */}

        <section className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-6">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Current Engagement
              </p>

              <h2 className="mt-1 text-xl font-bold text-gray-900">
                Engagement #{engagementId}
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Phase 3 execution workpapers and audit procedures
              </p>

            </div>

            <div className="hidden h-12 w-12 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm md:flex">
              <ClipboardCheck size={23} />
            </div>

          </div>

        </section>

        {/* PROGRESS */}

        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="font-semibold text-gray-900">
                Execution Progress
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Complete each execution section as audit procedures are performed.
              </p>

            </div>

            <span className="text-sm font-semibold text-gray-600">
              0 / 6 completed
            </span>

          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">

            <div
              className="h-full rounded-full bg-blue-600"
              style={{ width: "0%" }}
            />

          </div>

        </section>

        {/* EXECUTION SECTIONS */}

        <div className="grid gap-5 md:grid-cols-2">

          {executionSections.map((section) => {

            const Icon = section.icon;

            return (
              <button
                key={section.number}
                type="button"
                onClick={() => openSection(section.number)}
                className="group rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              >

                <div className="flex items-start justify-between">

                  <div className="flex items-center gap-4">

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Icon size={22} />
                    </div>

                    <div>

                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                        {section.number}
                      </p>

                      <h2 className="mt-1 text-base font-semibold text-gray-900">
                        {section.title}
                      </h2>

                    </div>

                  </div>

                  <ChevronRight
                    size={20}
                    className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-blue-600"
                  />

                </div>

                <p className="mt-5 text-sm leading-6 text-gray-500">
                  {section.description}
                </p>

                <div className="mt-5 flex items-center gap-2 border-t border-gray-100 pt-4 text-xs font-medium text-gray-400">

                  <CheckCircle2 size={15} />

                  Not Started

                </div>

              </button>
            );

          })}

        </div>

      </div>
    </AppLayout>
  );
}