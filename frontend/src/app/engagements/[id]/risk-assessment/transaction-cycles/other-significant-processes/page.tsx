"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  FileText,
  Layers,
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react";

type RiskLevel = "Low" | "Medium" | "High";

type SignificantProcessRisk = {
  id: number;
  area: string;
  risk: string;
  assertion: string;
  level: RiskLevel;
  response: string;
};

type TabType = "overview" | "risk" | "controls" | "procedures";

const initialRisks: SignificantProcessRisk[] = [
  {
    id: 1,
    area: "Related Party Transactions",
    risk: "Transactions with related parties may not be identified, authorized, recorded or disclosed appropriately.",
    assertion: "Completeness / Presentation",
    level: "High",
    response:
      "Identify related parties, inspect significant transactions and evaluate authorization and disclosure.",
  },
  {
    id: 2,
    area: "Legal and Regulatory Compliance",
    risk: "Non-compliance with applicable laws and regulations may result in financial or reporting consequences.",
    assertion: "Completeness / Presentation",
    level: "Medium",
    response:
      "Obtain an understanding of significant regulatory requirements and inspect evidence of compliance.",
  },
  {
    id: 3,
    area: "Commitments and Contingencies",
    risk: "Commitments and contingent liabilities may not be identified or appropriately accounted for and disclosed.",
    assertion: "Completeness / Presentation",
    level: "High",
    response:
      "Review contracts, legal correspondence and management assessments of commitments and contingencies.",
  },
  {
    id: 4,
    area: "Provisions",
    risk: "Provisions may be incomplete, inaccurately measured or unsupported.",
    assertion: "Completeness / Valuation",
    level: "Medium",
    response:
      "Evaluate the basis for significant provisions and test supporting calculations and documentation.",
  },
  {
    id: 5,
    area: "Capital Expenditure",
    risk: "Capital expenditure may be incorrectly classified, unauthorized or improperly capitalized.",
    assertion: "Classification / Accuracy",
    level: "Medium",
    response:
      "Test significant capital expenditure to invoices, approvals and evidence of assets acquired.",
  },
  {
    id: 6,
    area: "Fixed Asset Management",
    risk: "Fixed assets may not exist, may be incorrectly recorded or may not be properly safeguarded.",
    assertion: "Existence / Valuation",
    level: "Medium",
    response:
      "Inspect significant assets, test additions and review depreciation calculations.",
  },
  {
    id: 7,
    area: "Taxation",
    risk: "Tax liabilities may be incomplete or incorrectly calculated.",
    assertion: "Completeness / Accuracy",
    level: "High",
    response:
      "Review tax computations, tax returns, payments and significant tax positions.",
  },
  {
    id: 8,
    area: "Treasury and Cash Management",
    risk: "Cash balances or treasury transactions may be misstated or unauthorized.",
    assertion: "Existence / Accuracy",
    level: "Medium",
    response:
      "Perform bank confirmations, inspect reconciliations and test significant treasury transactions.",
  },
  {
    id: 9,
    area: "Insurance",
    risk: "Insurance coverage may be inadequate or insurance-related transactions may be incorrectly recorded.",
    assertion: "Completeness / Valuation",
    level: "Low",
    response:
      "Review significant insurance policies, coverage and related accounting entries.",
  },
  {
    id: 10,
    area: "Management Override",
    risk: "Management may override established controls to achieve inappropriate financial reporting outcomes.",
    assertion: "Accuracy / Completeness",
    level: "High",
    response:
      "Perform procedures over management estimates, unusual transactions and journal entries.",
  },
];

const keyControls = [
  {
    title: "Authorization Controls",
    description:
      "Significant transactions and commitments require approval from appropriately authorized personnel.",
  },
  {
    title: "Related Party Identification",
    description:
      "The entity maintains procedures for identifying related parties and related party transactions.",
  },
  {
    title: "Legal Review",
    description:
      "Significant contracts, claims and legal matters are reviewed by management and legal advisers where appropriate.",
  },
  {
    title: "Tax Compliance Review",
    description:
      "Tax calculations, returns and payments are reviewed before submission.",
  },
  {
    title: "Fixed Asset Controls",
    description:
      "Capital expenditure and fixed asset records are subject to authorization and periodic review.",
  },
  {
    title: "Bank Reconciliation",
    description:
      "Bank accounts are reconciled regularly and differences are investigated.",
  },
  {
    title: "Management Review",
    description:
      "Significant unusual transactions and financial movements are reviewed by management.",
  },
  {
    title: "Disclosure Review",
    description:
      "Financial statement disclosures are reviewed for completeness and accuracy before issuance.",
  },
];

const auditProcedures = [
  "Obtain an understanding of significant processes outside the major transaction cycles.",
  "Identify significant non-routine transactions and balances.",
  "Review the entity's policies and procedures for significant processes.",
  "Assess the design and implementation of relevant internal controls.",
  "Identify related parties and inspect significant related party transactions.",
  "Review legal correspondence and significant claims or disputes.",
  "Assess commitments and contingencies for completeness and appropriate disclosure.",
  "Review significant provisions and the assumptions supporting them.",
  "Test significant capital expenditure transactions.",
  "Inspect significant fixed assets where relevant.",
  "Review depreciation calculations and useful-life assumptions.",
  "Review tax computations, returns and significant tax balances.",
  "Perform bank confirmations and review bank reconciliations.",
  "Review significant treasury and financing transactions.",
  "Review significant insurance policies and coverage.",
  "Perform procedures designed to identify management override of controls.",
  "Review unusual or non-routine transactions recorded close to year-end.",
  "Assess whether significant matters are appropriately reflected in the financial statements.",
];

export default function OtherSignificantProcessesPage() {
  const router = useRouter();
  const params = useParams();

  const engagementId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : "";

  const [activeTab, setActiveTab] =
    useState<TabType>("overview");

  const [risks, setRisks] =
    useState<SignificantProcessRisk[]>(initialRisks);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateRiskLevel = (
    id: number,
    level: RiskLevel
  ) => {
    setRisks((currentRisks) =>
      currentRisks.map((risk) =>
        risk.id === id
          ? {
              ...risk,
              level,
            }
          : risk
      )
    );

    setSaved(false);
  };

  const handleSave = () => {
    if (saving) return;

    setSaving(true);
    setSaved(false);

    console.log(
      "Other Significant Processes Risk Assessment",
      {
        engagementId,
        risks,
      }
    );

    setTimeout(() => {
      setSaving(false);
      setSaved(true);
    }, 600);
  };

  const handleComplete = () => {
    if (saving) return;

    setSaving(true);
    setSaved(false);

    console.log(
      "Completed Phase 2.1 Transaction Cycles",
      {
        engagementId,
        risks,
      }
    );

    setTimeout(() => {
      setSaving(false);
      setSaved(true);

      router.push(
        `/engagements/${engagementId}/risk-assessment`
      );
    }, 600);
  };

  const handleBack = () => {
    router.push(
      `/engagements/${engagementId}/risk-assessment`
    );
  };

  const getRiskClass = (level: RiskLevel) => {
    if (level === "High") {
      return "border-red-200 bg-red-100 text-red-700";
    }

    if (level === "Medium") {
      return "border-amber-200 bg-amber-100 text-amber-700";
    }

    return "border-green-200 bg-green-100 text-green-700";
  };

  const highRisks = risks.filter(
    (risk) => risk.level === "High"
  ).length;

  const mediumRisks = risks.filter(
    (risk) => risk.level === "Medium"
  ).length;

  const lowRisks = risks.filter(
    (risk) => risk.level === "Low"
  ).length;

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-8">
        {/* PAGE HEADER */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <button
                type="button"
                onClick={handleBack}
                className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Transaction Cycles
              </button>

              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                  PHASE 2.1
                </span>

                <ChevronRight className="h-4 w-4" />

                <span>Transaction Cycles</span>

                <ChevronRight className="h-4 w-4" />

                <span className="font-medium text-slate-900">
                  Other Significant Processes
                </span>
              </div>

              <div className="flex items-start gap-4">
                <div className="hidden rounded-xl bg-purple-100 p-3 text-purple-700 sm:flex">
                  <Layers className="h-6 w-6" />
                </div>

                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    Other Significant Processes
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    Assess significant processes and financial
                    reporting risks outside the primary transaction
                    cycles.
                  </p>
                </div>
              </div>
            </div>

            <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Current Cycle
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                6 of 6
              </p>

              <p className="text-xs text-slate-500">
                Final Transaction Cycle
              </p>
            </div>
          </div>
        </section>

        {/* PROGRESS */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Transaction Cycle Progress
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Other Significant Processes is the final
                  transaction cycle.
                </p>
              </div>

              <span className="text-sm font-bold text-purple-600">
                6 / 6
              </span>
            </div>
          </div>

          <div className="p-6">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full w-full rounded-full bg-purple-600"
              />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500 sm:grid-cols-6">
              <span>Revenue</span>
              <span>Purchasing</span>
              <span>Payroll</span>
              <span>Inventory</span>
              <span>Financial Close</span>
              <span className="font-semibold text-purple-600">
                Other Processes
              </span>
            </div>
          </div>
        </section>

        {/* SUMMARY CARDS */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Risk Areas"
            value={risks.length}
            description="Areas assessed"
            icon={<CircleAlert className="h-5 w-5" />}
          />

          <SummaryCard
            title="High Risk"
            value={highRisks}
            description="Require attention"
            icon={<CircleAlert className="h-5 w-5" />}
            iconClass="bg-red-100 text-red-600"
          />

          <SummaryCard
            title="Medium Risk"
            value={mediumRisks}
            description="Require monitoring"
            icon={<ShieldCheck className="h-5 w-5" />}
            iconClass="bg-amber-100 text-amber-600"
          />

          <SummaryCard
            title="Low Risk"
            value={lowRisks}
            description="Lower exposure"
            icon={<CheckCircle2 className="h-5 w-5" />}
            iconClass="bg-green-100 text-green-600"
          />
        </section>

        {/* MAIN CONTENT */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* TABS */}
          <div className="border-b border-slate-200">
            <div className="flex overflow-x-auto">
              <TabButton
                active={activeTab === "overview"}
                onClick={() => setActiveTab("overview")}
              >
                Overview
              </TabButton>

              <TabButton
                active={activeTab === "risk"}
                onClick={() => setActiveTab("risk")}
              >
                Risk Assessment
              </TabButton>

              <TabButton
                active={activeTab === "controls"}
                onClick={() => setActiveTab("controls")}
              >
                Key Controls
              </TabButton>

              <TabButton
                active={activeTab === "procedures"}
                onClick={() => setActiveTab("procedures")}
              >
                Audit Procedures
              </TabButton>
            </div>
          </div>

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <div className="mb-5 flex items-center gap-3">
                    <Layers className="h-5 w-5 text-purple-600" />

                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Significant Processes
                      </h2>

                      <p className="text-sm text-slate-500">
                        Processes outside the primary transaction
                        cycles.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      "Related party transactions",
                      "Legal and regulatory matters",
                      "Commitments and contingencies",
                      "Provisions and significant estimates",
                      "Capital expenditure",
                      "Fixed asset management",
                      "Taxation",
                      "Treasury and cash management",
                      "Insurance",
                      "Management override",
                    ].map((process, index) => (
                      <div
                        key={process}
                        className="flex items-center gap-4 rounded-lg border border-slate-200 p-4 transition hover:bg-slate-50"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                          {index + 1}
                        </div>

                        <p className="flex-1 font-medium text-slate-800">
                          {process}
                        </p>

                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-5 flex items-center gap-3">
                    <ClipboardCheck className="h-5 w-5 text-blue-600" />

                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Audit Focus
                      </h2>

                      <p className="text-sm text-slate-500">
                        Key areas requiring auditor attention.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <FocusItem
                      title="Related Parties"
                      description="Identify related parties and assess whether significant transactions are appropriately authorized, recorded and disclosed."
                    />

                    <FocusItem
                      title="Legal Matters"
                      description="Consider legal claims, disputes, regulatory matters and other potential obligations."
                    />

                    <FocusItem
                      title="Estimates & Provisions"
                      description="Evaluate significant estimates, provisions and management judgments affecting the financial statements."
                    />

                    <FocusItem
                      title="Management Override"
                      description="Assess the risk that management could circumvent established controls or influence financial reporting."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RISK ASSESSMENT */}
          {activeTab === "risk" && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Other Significant Processes Risk Assessment
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Identify and assess significant risks outside
                  the primary transaction cycles.
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[1100px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="border-b border-slate-200 px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Area
                      </th>

                      <th className="border-b border-slate-200 px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Risk
                      </th>

                      <th className="border-b border-slate-200 px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Assertion
                      </th>

                      <th className="border-b border-slate-200 px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Risk Level
                      </th>

                      <th className="border-b border-slate-200 px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Audit Response
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {risks.map((risk) => (
                      <tr
                        key={risk.id}
                        className="align-top transition hover:bg-slate-50"
                      >
                        <td className="border-b border-slate-200 px-4 py-5">
                          <p className="font-semibold text-slate-900">
                            {risk.area}
                          </p>
                        </td>

                        <td className="border-b border-slate-200 px-4 py-5">
                          <p className="max-w-sm text-sm leading-6 text-slate-600">
                            {risk.risk}
                          </p>
                        </td>

                        <td className="border-b border-slate-200 px-4 py-5">
                          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {risk.assertion}
                          </span>
                        </td>

                        <td className="border-b border-slate-200 px-4 py-5">
                          <div className="space-y-2">
                            <select
                              value={risk.level}
                              onChange={(event) =>
                                updateRiskLevel(
                                  risk.id,
                                  event.target.value as RiskLevel
                                )
                              }
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                            >
                              <option value="Low">
                                Low
                              </option>

                              <option value="Medium">
                                Medium
                              </option>

                              <option value="High">
                                High
                              </option>
                            </select>

                            <div>
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getRiskClass(
                                  risk.level
                                )}`}
                              >
                                {risk.level}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="border-b border-slate-200 px-4 py-5">
                          <p className="max-w-sm text-sm leading-6 text-slate-600">
                            {risk.response}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CONTROLS */}
          {activeTab === "controls" && (
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-green-600" />

                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Key Controls
                    </h2>

                    <p className="mt-1 text-sm text-slate-600">
                      Key controls relevant to other significant
                      processes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {keyControls.map((control, index) => (
                  <div
                    key={control.title}
                    className="rounded-xl border border-slate-200 p-5 transition hover:border-slate-300 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-sm font-bold text-green-700">
                        {String(index + 1).padStart(2, "0")}
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

          {/* PROCEDURES */}
          {activeTab === "procedures" && (
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-purple-600" />

                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Suggested Audit Procedures
                    </h2>

                    <p className="mt-1 text-sm text-slate-600">
                      Procedures to consider when responding to
                      significant processes and risks.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {auditProcedures.map((procedure, index) => (
                  <div
                    key={procedure}
                    className="flex items-start gap-4 rounded-lg border border-slate-200 p-4"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <p className="pt-1 text-sm leading-6 text-slate-700">
                      {procedure}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* COMPLETION */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-purple-100 p-3 text-purple-700">
                {saved ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  {saved
                    ? "Assessment saved"
                    : "Complete Transaction Cycles"}
                </h3>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  {saved
                    ? "Your Other Significant Processes assessment has been saved."
                    : "This is the final transaction cycle in Phase 2.1. Save your work before completing the transaction-cycle assessment."}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}

                {saving ? "Saving..." : "Save Assessment"}
              </button>

              <button
                type="button"
                onClick={handleComplete}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Complete Transaction Cycles
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* BOTTOM NAVIGATION */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-6">
          <button
            type="button"
            onClick={() =>
              router.push(
                `/engagements/${engagementId}/risk-assessment/transaction-cycles/financial-statement-close`
              )
            }
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous: Financial Statement Close
          </button>

          <button
            type="button"
            onClick={handleComplete}
            disabled={saving}
            className="inline-flex items-center gap-2 text-sm font-semibold text-purple-600 transition hover:text-purple-700 disabled:opacity-50"
          >
            Complete Phase 2.1
            <CheckCircle2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

/* -------------------------------------------------------------------------- */
/* HELPER COMPONENTS                                                          */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  title,
  value,
  description,
  icon,
  iconClass = "bg-slate-100 text-slate-700",
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  iconClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div
          className={`rounded-xl p-2.5 ${iconClass}`}
        >
          {icon}
        </div>

        <span className="text-2xl font-bold text-slate-900">
          {value}
        </span>
      </div>

      <div className="mt-4">
        <p className="font-semibold text-slate-900">
          {title}
        </p>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap border-b-2 px-5 py-4 text-sm font-semibold transition ${
        active
          ? "border-slate-900 text-slate-900"
          : "border-transparent text-slate-500 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function FocusItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}