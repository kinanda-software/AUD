"use client";

import { ReactNode, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Loader2,
  Save,
  ShieldCheck,
  Target,
  AlertTriangle,
  BookOpenCheck,
  Calculator,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";

type TabType = "overview" | "risk" | "controls" | "procedures";

interface RiskItem {
  id: number;
  area: string;
  assertions: string;
  riskLevel: "Low" | "Medium" | "High";
  description: string;
}

interface FocusItemProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

const initialRisks: RiskItem[] = [
  {
    id: 1,
    area: "Journal Entries",
    assertions: "Accuracy / Authorization",
    riskLevel: "High",
    description:
      "Risk of inappropriate, unauthorized, or inaccurate journal entries being posted during the financial statement close.",
  },
  {
    id: 2,
    area: "Account Reconciliations",
    assertions: "Accuracy / Completeness",
    riskLevel: "Medium",
    description:
      "Risk that balance sheet accounts are not completely or accurately reconciled and reviewed.",
  },
  {
    id: 3,
    area: "Financial Statement Cut-off",
    assertions: "Cut-off",
    riskLevel: "High",
    description:
      "Risk that transactions are recorded in the wrong accounting period around year-end.",
  },
  {
    id: 4,
    area: "Management Estimates",
    assertions: "Valuation",
    riskLevel: "High",
    description:
      "Risk that significant accounting estimates contain inappropriate assumptions or calculations.",
  },
  {
    id: 5,
    area: "Financial Statement Presentation",
    assertions: "Presentation",
    riskLevel: "Medium",
    description:
      "Risk that financial statement classifications and presentations do not comply with the applicable reporting framework.",
  },
  {
    id: 6,
    area: "Consolidation",
    assertions: "Completeness / Accuracy",
    riskLevel: "Medium",
    description:
      "Risk that consolidation entries, eliminations, or subsidiary information are incomplete or inaccurate.",
  },
  {
    id: 7,
    area: "Closing Adjustments",
    assertions: "Completeness / Accuracy",
    riskLevel: "Medium",
    description:
      "Risk that required closing adjustments are omitted, incorrectly calculated, or improperly authorized.",
  },
  {
    id: 8,
    area: "Disclosure Information",
    assertions: "Completeness / Presentation",
    riskLevel: "Medium",
    description:
      "Risk that required disclosures are incomplete, inaccurate, or inconsistent with the financial statements.",
  },
];

const keyControls = [
  {
    title: "Month-end / Year-end Closing Checklist",
    description:
      "A formal closing checklist is used to track completion of required closing activities.",
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
  {
    title: "Journal Entry Approval",
    description:
      "Manual and significant journal entries are reviewed and approved by authorized personnel.",
    icon: <BookOpenCheck className="h-5 w-5" />,
  },
  {
    title: "Account Reconciliation",
    description:
      "Balance sheet and significant general ledger accounts are reconciled and reviewed.",
    icon: <Calculator className="h-5 w-5" />,
  },
  {
    title: "Management Review",
    description:
      "Management performs review of significant balances, adjustments, and unusual transactions.",
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    title: "Financial Statement Review",
    description:
      "Draft financial statements are reviewed before finalization and issuance.",
    icon: <FileCheck2 className="h-5 w-5" />,
  },
  {
    title: "Disclosure Checklist",
    description:
      "Required disclosures are identified, prepared, reviewed, and agreed to supporting information.",
    icon: <FileText className="h-5 w-5" />,
  },
];

const auditProcedures = [
  "Obtain an understanding of the financial statement close process.",
  "Review the month-end and year-end closing timetable.",
  "Inspect account reconciliation procedures and supporting documentation.",
  "Test selected journal entries for authorization, accuracy, and appropriate support.",
  "Test unusual, significant, or manual journal entries posted near period end.",
  "Evaluate controls over manual journal entry preparation and approval.",
  "Perform cut-off testing around the reporting date.",
  "Review significant closing adjustments and determine whether they are properly supported.",
  "Evaluate significant management estimates and related assumptions.",
  "Assess financial statement classification and presentation.",
  "Review consolidation entries and elimination adjustments where applicable.",
  "Review the completeness and accuracy of financial statement disclosures.",
  "Perform analytical procedures over significant balances and movements.",
];

const focusAreas = [
  {
    title: "Journal Entries",
    description:
      "Focus on unusual, manual, late, or significant journal entries and their authorization.",
    icon: <BookOpenCheck className="h-5 w-5" />,
  },
  {
    title: "Account Reconciliations",
    description:
      "Confirm significant accounts are reconciled, reviewed, and supported by appropriate evidence.",
    icon: <Calculator className="h-5 w-5" />,
  },
  {
    title: "Cut-off",
    description:
      "Pay particular attention to transactions recorded immediately before and after the reporting date.",
    icon: <Target className="h-5 w-5" />,
  },
  {
    title: "Estimates",
    description:
      "Assess significant estimates, assumptions, calculations, and management judgments.",
    icon: <AlertTriangle className="h-5 w-5" />,
  },
  {
    title: "Presentation & Disclosure",
    description:
      "Check whether financial statements and disclosures are complete, accurate, and appropriately presented.",
    icon: <FileText className="h-5 w-5" />,
  },
];

export default function FinancialStatementClosePage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = String(params.id);

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [risks, setRisks] = useState<RiskItem[]>(initialRisks);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleRiskChange = (
    id: number,
    riskLevel: "Low" | "Medium" | "High"
  ) => {
    setRisks((currentRisks) =>
      currentRisks.map((risk) =>
        risk.id === id ? { ...risk, riskLevel } : risk
      )
    );

    setSaved(false);
  };

  const handleSave = () => {
    setSaving(true);
    setSaved(false);

    setTimeout(() => {
      setSaving(false);
      setSaved(true);
    }, 600);
  };

  const handleSaveAndContinue = () => {
    setSaving(true);
    setSaved(false);

    setTimeout(() => {
      setSaving(false);
      setSaved(true);

      router.push(
        `/engagements/${engagementId}/risk-assessment/transaction-cycles/other-significant-processes`
      );
    }, 600);
  };

  const handleBack = () => {
    router.push(
      `/engagements/${engagementId}/risk-assessment`
    );
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              type="button"
              onClick={handleBack}
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Transaction Cycles
            </button>

            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700">
                <FileCheck2 className="h-7 w-7" />
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
                  Phase 2.1
                </p>

                <h1 className="mt-1 text-3xl font-bold text-slate-900">
                  Financial Statement Close
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Assess the financial statement closing process, related risks,
                  key controls, and audit procedures.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Current Cycle
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              5 of 6
            </p>
            <p className="text-xs text-slate-500">
              Transaction Cycles
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">
                Transaction Cycle Progress
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Financial Statement Close is the fifth cycle.
              </p>
            </div>

            <div className="text-sm font-semibold text-indigo-600">
              5 / 6
            </div>
          </div>

          <div className="p-6">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{ width: "83.33%" }}
              />
            </div>

            <div className="mt-3 flex justify-between text-xs text-slate-500">
              <span>Revenue</span>
              <span>Purchasing</span>
              <span>Payroll</span>
              <span>Inventory</span>
              <span className="font-semibold text-indigo-600">
                Financial Close
              </span>
              <span>Other Processes</span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            title="Risk Areas"
            value={risks.length}
            description="Identified areas"
            icon={<AlertTriangle className="h-5 w-5" />}
          />

          <SummaryCard
            title="High Risk"
            value={risks.filter((risk) => risk.riskLevel === "High").length}
            description="Areas requiring attention"
            icon={<Target className="h-5 w-5" />}
          />

          <SummaryCard
            title="Key Controls"
            value={keyControls.length}
            description="Control areas"
            icon={<ShieldCheck className="h-5 w-5" />}
          />

          <SummaryCard
            title="Procedures"
            value={auditProcedures.length}
            description="Suggested procedures"
            icon={<ClipboardCheck className="h-5 w-5" />}
          />
        </div>

        {/* Tabs */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex overflow-x-auto border-b border-slate-200">
            <TabButton
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
              icon={<FileText className="h-4 w-4" />}
            >
              Overview
            </TabButton>

            <TabButton
              active={activeTab === "risk"}
              onClick={() => setActiveTab("risk")}
              icon={<AlertTriangle className="h-4 w-4" />}
            >
              Risk Assessment
            </TabButton>

            <TabButton
              active={activeTab === "controls"}
              onClick={() => setActiveTab("controls")}
              icon={<ShieldCheck className="h-4 w-4" />}
            >
              Key Controls
            </TabButton>

            <TabButton
              active={activeTab === "procedures"}
              onClick={() => setActiveTab("procedures")}
              icon={<ClipboardCheck className="h-4 w-4" />}
            >
              Audit Procedures
            </TabButton>
          </div>

          <div className="p-6">
            {/* Overview */}
            {activeTab === "overview" && (
              <div className="space-y-8">
                <section>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Financial Statement Close Process
                      </h2>

                      <p className="text-sm text-slate-500">
                        Key areas to understand during planning and risk
                        assessment.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm leading-7 text-slate-700">
                      The financial statement close process includes activities
                      performed by management and finance personnel to close the
                      accounting records, record closing adjustments, reconcile
                      accounts, prepare financial statements, complete
                      consolidation activities, and prepare required
                      disclosures.
                    </p>
                  </div>
                </section>

                <section>
                  <div className="mb-4">
                    <h2 className="text-lg font-bold text-slate-900">
                      Key Focus Areas
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Areas that should receive attention during the audit.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {focusAreas.map((item) => (
                      <FocusItem
                        key={item.title}
                        title={item.title}
                        description={item.description}
                        icon={item.icon}
                      />
                    ))}
                  </div>
                </section>

                <section>
                  <div className="mb-4">
                    <h2 className="text-lg font-bold text-slate-900">
                      Assessment Summary
                    </h2>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Inherent Risk
                      </p>
                      <p className="mt-2 text-xl font-bold text-slate-900">
                        Moderate to High
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        The close process involves significant management
                        judgment and manual activities.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Control Focus
                      </p>
                      <p className="mt-2 text-xl font-bold text-slate-900">
                        Management Review
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Review and approval controls are important throughout
                        the closing process.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Audit Focus
                      </p>
                      <p className="mt-2 text-xl font-bold text-slate-900">
                        Accuracy & Completeness
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Particular attention should be given to adjustments,
                        reconciliations, cut-off, and disclosures.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* Risk Assessment */}
            {activeTab === "risk" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Financial Statement Close Risk Assessment
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Review each significant area and adjust the assessed risk
                    level where necessary.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Area
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Assertions
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Risk
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Description
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 bg-white">
                      {risks.map((risk) => (
                        <tr key={risk.id} className="align-top">
                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-900">
                              {risk.area}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-600">
                            {risk.assertions}
                          </td>

                          <td className="px-4 py-4">
                            <select
                              value={risk.riskLevel}
                              onChange={(event) =>
                                handleRiskChange(
                                  risk.id,
                                  event.target.value as
                                    | "Low"
                                    | "Medium"
                                    | "High"
                                )
                              }
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            >
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
                            </select>
                          </td>

                          <td className="max-w-md px-4 py-4 text-sm leading-6 text-slate-600">
                            {risk.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                    <div>
                      <h3 className="font-semibold text-amber-900">
                        Risk Assessment Reminder
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-amber-800">
                        Risk levels should be based on the specific facts and
                        circumstances of the engagement, including the
                        financial reporting framework, complexity of the
                        entity, management judgment, and effectiveness of
                        relevant controls.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Controls */}
            {activeTab === "controls" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Key Controls
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Important controls commonly relevant to the financial
                    statement closing process.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {keyControls.map((control) => (
                    <div
                      key={control.title}
                      className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200 hover:shadow-sm"
                    >
                      <div className="flex gap-4">
                        <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
                          {control.icon}
                        </div>

                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {control.title}
                          </h3>

                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {control.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Procedures */}
            {activeTab === "procedures" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Suggested Audit Procedures
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Procedures that may be considered when auditing the
                    financial statement close process.
                  </p>
                </div>

                <div className="space-y-3">
                  {auditProcedures.map((procedure, index) => (
                    <div
                      key={procedure}
                      className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                        {index + 1}
                      </div>

                      <p className="text-sm leading-6 text-slate-700">
                        {procedure}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
                  <div className="flex gap-3">
                    <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />

                    <div>
                      <h3 className="font-semibold text-indigo-900">
                        Auditor Consideration
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-indigo-800">
                        The final audit procedures should be tailored to the
                        assessed risks and the specific circumstances of the
                        engagement.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save / Continue */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-indigo-100 p-2.5 text-indigo-700">
                {saved ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  {saved
                    ? "Financial Statement Close saved"
                    : "Save your assessment"}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Save your current work before continuing to the final
                  transaction cycle.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Workpaper
              </button>

              <button
                type="button"
                onClick={handleSaveAndContinue}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Save & Continue to Other Significant Processes
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-6">
          <button
            type="button"
            onClick={() =>
              router.push(
                `/engagements/${engagementId}/risk-assessment/transaction-cycles/inventory`
              )
            }
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous: Inventory
          </button>

          <button
            type="button"
            onClick={handleSaveAndContinue}
            disabled={saving}
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700 disabled:opacity-50"
          >
            Next: Other Significant Processes
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

/* -------------------------------------------------------------------------- */
/* Helper Components                                                          */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>

      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-5 py-4 text-sm font-semibold transition ${
        active
          ? "border-indigo-600 text-indigo-600"
          : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function FocusItem({
  title,
  description,
  icon,
}: FocusItemProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200 hover:shadow-sm">
      <div className="flex gap-4">
        <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
          {icon ?? <Target className="h-5 w-5" />}
        </div>

        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}