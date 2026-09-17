"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FileText,
  Users,
  Wallet,
  ShieldCheck,
  Save,
  Loader2,
} from "lucide-react";

type RiskLevel = "Low" | "Medium" | "High";

interface PayrollRisk {
  id: number;
  area: string;
  assertion: string;
  risk: string;
  inherentRisk: RiskLevel;
  controlRisk: RiskLevel;
  response: string;
}

const initialRisks: PayrollRisk[] = [
  {
    id: 1,
    area: "Employee Master Data",
    assertion: "Existence / Accuracy",
    risk: "Fictitious, terminated, or unauthorized employees may remain in the payroll master file.",
    inherentRisk: "High",
    controlRisk: "Medium",
    response:
      "Agree payroll employees to approved HR records and investigate unusual or inactive employees.",
  },
  {
    id: 2,
    area: "Payroll Processing",
    assertion: "Accuracy / Completeness",
    risk: "Payroll calculations may contain errors resulting in incorrect salaries, allowances, deductions, or net pay.",
    inherentRisk: "High",
    controlRisk: "Medium",
    response:
      "Reperform selected payroll calculations and review payroll processing controls.",
  },
  {
    id: 3,
    area: "Salary Payments",
    assertion: "Occurrence / Accuracy",
    risk: "Salary payments may be made to unauthorized employees or incorrect bank accounts.",
    inherentRisk: "High",
    controlRisk: "Medium",
    response:
      "Agree selected payroll payments to bank records and independently approved employee information.",
  },
  {
    id: 4,
    area: "Statutory Deductions",
    assertion: "Completeness / Accuracy",
    risk: "PAYE, social security, pension, and other statutory deductions may be incorrectly calculated or omitted.",
    inherentRisk: "Medium",
    controlRisk: "Medium",
    response:
      "Recalculate statutory deductions and inspect evidence of statutory remittances.",
  },
  {
    id: 5,
    area: "Payroll Reconciliation",
    assertion: "Completeness / Accuracy",
    risk: "Payroll records may not reconcile with the general ledger or supporting payroll reports.",
    inherentRisk: "Medium",
    controlRisk: "Low",
    response:
      "Review payroll-to-GL reconciliations and investigate reconciling items.",
  },
];

export default function PayrollPage() {
  const router = useRouter();
  const params = useParams();

  const engagementId = params?.id as string;

  const [risks, setRisks] = useState<PayrollRisk[]>(initialRisks);

  const [activeTab, setActiveTab] = useState<
    "overview" | "risks" | "controls" | "procedures"
  >("overview");

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateRisk = (
    id: number,
    field: keyof PayrollRisk,
    value: string
  ) => {
    setRisks((currentRisks) =>
      currentRisks.map((risk) =>
        risk.id === id
          ? {
              ...risk,
              [field]: value,
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

    // Payroll workpaper is currently frontend-only.
    // API persistence can be connected later.
    console.log("Payroll risk assessment:", {
      engagementId,
      risks,
    });

    setTimeout(() => {
      setSaving(false);
      setSaved(true);
    }, 500);
  };

  const handleSaveAndContinue = () => {
    if (saving) return;

    setSaving(true);
    setSaved(false);

    console.log("Payroll risk assessment:", {
      engagementId,
      risks,
    });

    setTimeout(() => {
      setSaving(false);
      setSaved(true);

      router.push(
        `/engagements/${engagementId}/risk-assessment/transaction-cycles/inventory`
      );
    }, 500);
  };

  const highRisks = risks.filter(
    (risk) =>
      risk.inherentRisk === "High" || risk.controlRisk === "High"
  ).length;

  const mediumRisks = risks.filter(
    (risk) =>
      risk.inherentRisk === "Medium" || risk.controlRisk === "Medium"
  ).length;

  const lowRisks = risks.filter(
    (risk) =>
      risk.inherentRisk === "Low" && risk.controlRisk === "Low"
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
                onClick={() =>
                  router.push(
                    `/engagements/${engagementId}/risk-assessment`
                  )
                }
                className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                <ArrowLeft size={17} />
                Back to Transaction Cycles
              </button>

              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                  PHASE 2.1
                </span>

                <ChevronRight size={14} />

                <span>Transaction Cycles</span>

                <ChevronRight size={14} />

                <span className="font-medium text-slate-900">
                  Payroll
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Payroll Transaction Cycle
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Identify and assess risks relating to payroll processing,
                employees, deductions, payments, approvals, and payroll
                reconciliation.
              </p>
            </div>

            <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Current Cycle
              </p>

              <p className="mt-1 text-sm font-bold text-slate-900">
                3 of 6
              </p>

              <p className="text-xs text-slate-500">
                Payroll
              </p>
            </div>
          </div>
        </section>

        {/* SUMMARY CARDS */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Payroll Areas"
            value={risks.length}
            description="Areas assessed"
            icon={<FileText size={20} />}
          />

          <SummaryCard
            title="High Risk"
            value={highRisks}
            description="Require attention"
            icon={<CircleAlert size={20} />}
          />

          <SummaryCard
            title="Medium Risk"
            value={mediumRisks}
            description="Require monitoring"
            icon={<ShieldCheck size={20} />}
          />

          <SummaryCard
            title="Low Risk"
            value={lowRisks}
            description="Lower exposure"
            icon={<CheckCircle2 size={20} />}
          />
        </section>

        {/* TABS */}
        <section>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <nav className="flex min-w-max">
              <TabButton
                active={activeTab === "overview"}
                onClick={() => setActiveTab("overview")}
              >
                Overview
              </TabButton>

              <TabButton
                active={activeTab === "risks"}
                onClick={() => setActiveTab("risks")}
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
            </nav>
          </div>
        </section>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-3">
                  <Wallet size={22} className="text-slate-700" />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-900">
                    Payroll Cycle Overview
                  </h2>

                  <p className="text-sm text-slate-500">
                    Key activities within the payroll transaction cycle.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <ProcessStep
                  number="01"
                  title="Employee Master Data"
                  description="Creation, amendment and termination of employee records."
                />

                <ProcessStep
                  number="02"
                  title="Time and Attendance"
                  description="Collection and validation of attendance, overtime and leave information."
                />

                <ProcessStep
                  number="03"
                  title="Payroll Calculation"
                  description="Calculation of gross salary, allowances, deductions and net salary."
                />

                <ProcessStep
                  number="04"
                  title="Payroll Approval"
                  description="Review and approval of payroll before payment."
                />

                <ProcessStep
                  number="05"
                  title="Salary Payment"
                  description="Transfer of employee salaries through approved banking channels."
                />

                <ProcessStep
                  number="06"
                  title="Statutory Remittances"
                  description="Submission and payment of statutory deductions and payroll-related obligations."
                />

                <ProcessStep
                  number="07"
                  title="Payroll Reconciliation"
                  description="Reconciliation of payroll reports, bank payments and general ledger balances."
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-semibold text-slate-900">
                  Audit Focus
                </h2>

                <div className="mt-5 space-y-4">
                  <FocusItem
                    icon={<Users size={18} />}
                    title="Employees"
                    description="Existence and authorization"
                  />

                  <FocusItem
                    icon={<Wallet size={18} />}
                    title="Payments"
                    description="Accuracy and occurrence"
                  />

                  <FocusItem
                    icon={<ShieldCheck size={18} />}
                    title="Controls"
                    description="Authorization and segregation"
                  />

                  <FocusItem
                    icon={<FileText size={18} />}
                    title="Statutory"
                    description="Compliance and completeness"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <div className="flex gap-3">
                  <CircleAlert
                    size={20}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />

                  <div>
                    <h3 className="font-semibold text-amber-900">
                      Audit Consideration
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-amber-800">
                      Payroll is normally a significant transaction cycle
                      because errors or unauthorized transactions can directly
                      affect employee costs, liabilities and cash.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* RISKS */}
        {activeTab === "risks" && (
          <section>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Payroll Risk Assessment
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Assess inherent risk, control risk and the planned audit
                response for each payroll area.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-[1200px] w-full">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Payroll Area
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Assertion
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Risk
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Inherent
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Control
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Audit Response
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {risks.map((risk) => (
                      <tr
                        key={risk.id}
                        className="align-top transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-5">
                          <p className="font-semibold text-slate-900">
                            {risk.area}
                          </p>
                        </td>

                        <td className="px-5 py-5 text-sm text-slate-600">
                          {risk.assertion}
                        </td>

                        <td className="max-w-xs px-5 py-5 text-sm leading-6 text-slate-600">
                          {risk.risk}
                        </td>

                        <td className="px-5 py-5">
                          <RiskSelect
                            value={risk.inherentRisk}
                            onChange={(value) =>
                              updateRisk(
                                risk.id,
                                "inherentRisk",
                                value
                              )
                            }
                          />
                        </td>

                        <td className="px-5 py-5">
                          <RiskSelect
                            value={risk.controlRisk}
                            onChange={(value) =>
                              updateRisk(
                                risk.id,
                                "controlRisk",
                                value
                              )
                            }
                          />
                        </td>

                        <td className="min-w-[300px] px-5 py-5">
                          <textarea
                            value={risk.response}
                            onChange={(event) =>
                              updateRisk(
                                risk.id,
                                "response",
                                event.target.value
                              )
                            }
                            rows={4}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* CONTROLS */}
        {activeTab === "controls" && (
          <section>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Key Payroll Controls
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Controls that should normally be considered during the
                walkthrough and control evaluation.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ControlCard
                title="Employee Authorization"
                description="New employees and changes to employee master data are independently authorized."
              />

              <ControlCard
                title="Segregation of Duties"
                description="Payroll preparation, review, approval and payment responsibilities are appropriately segregated."
              />

              <ControlCard
                title="Payroll Review"
                description="Payroll reports are reviewed by an authorized person before processing payments."
              />

              <ControlCard
                title="Bank Account Validation"
                description="Employee bank account changes are subject to independent verification and approval."
              />

              <ControlCard
                title="Statutory Review"
                description="Statutory deductions are reviewed and reconciled before submission."
              />

              <ControlCard
                title="Payroll Reconciliation"
                description="Payroll reports are reconciled to the general ledger and bank payments."
              />
            </div>
          </section>
        )}

        {/* PROCEDURES */}
        {activeTab === "procedures" && (
          <section>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Suggested Audit Procedures
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Procedures can be adapted based on the assessed risk and
                control environment.
              </p>
            </div>

            <div className="space-y-4">
              <Procedure
                number="01"
                title="Obtain Payroll Register"
                description="Obtain the payroll register for the selected period and agree key totals to the accounting records."
              />

              <Procedure
                number="02"
                title="Test Employee Existence"
                description="Select employees from payroll and agree them to personnel files, employment records and other supporting documentation."
              />

              <Procedure
                number="03"
                title="Test Payroll Calculations"
                description="Recalculate gross salary, allowances, deductions and net salary for selected employees."
              />

              <Procedure
                number="04"
                title="Test Terminated Employees"
                description="Review terminated employees to determine whether payroll ceased appropriately after termination."
              />

              <Procedure
                number="05"
                title="Test Salary Payments"
                description="Agree selected payroll payments to bank statements and approved payroll reports."
              />

              <Procedure
                number="06"
                title="Review Statutory Payments"
                description="Inspect evidence supporting statutory deductions and remittances."
              />

              <Procedure
                number="07"
                title="Perform Payroll-to-GL Reconciliation"
                description="Reconcile payroll expenditure and related liabilities to the general ledger."
              />
            </div>
          </section>
        )}

        {/* SAVE + CONTINUE */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-semibold text-slate-900">
                Payroll assessment
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Save your payroll assessment before continuing to the next
                transaction cycle.
              </p>

              {saved && (
                <div className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-600">
                  <CheckCircle2 size={16} />
                  Payroll assessment saved
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Save size={17} />
                )}

                {saving ? "Saving..." : "Save Assessment"}
              </button>

              <button
                type="button"
                onClick={handleSaveAndContinue}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save & Continue to Inventory
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

/* ============================================================
   COMPONENTS
   ============================================================ */

function SummaryCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
          {icon}
        </div>

        <span className="text-2xl font-bold text-slate-900">
          {value}
        </span>
      </div>

      <div className="mt-4">
        <p className="font-semibold text-slate-900">{title}</p>

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
      className={`border-b-2 px-5 py-3.5 text-sm font-medium transition ${
        active
          ? "border-slate-900 text-slate-900"
          : "border-transparent text-slate-500 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function ProcessStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 rounded-xl border border-slate-100 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
        {number}
      </div>

      <div>
        <h3 className="font-medium text-slate-900">{title}</h3>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function FocusItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
        {icon}
      </div>

      <div>
        <p className="text-sm font-medium text-slate-900">{title}</p>

        <p className="text-xs text-slate-500">{description}</p>
      </div>
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex gap-3">
        <div className="rounded-lg bg-slate-100 p-2.5 text-slate-700">
          <ShieldCheck size={20} />
        </div>

        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function Procedure({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
        {number}
      </div>

      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function RiskSelect({
  value,
  onChange,
}: {
  value: RiskLevel;
  onChange: (value: RiskLevel) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) =>
        onChange(event.target.value as RiskLevel)
      }
      className={`rounded-lg border px-3 py-2 text-sm font-medium outline-none transition focus:ring-2 focus:ring-slate-100 ${
        value === "High"
          ? "border-red-200 bg-red-50 text-red-700"
          : value === "Medium"
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-green-200 bg-green-50 text-green-700"
      }`}
    >
      <option value="Low">Low</option>
      <option value="Medium">Medium</option>
      <option value="High">High</option>
    </select>
  );
}