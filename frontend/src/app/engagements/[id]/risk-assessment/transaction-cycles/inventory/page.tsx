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
  ClipboardCheck,
  FileText,
  Loader2,
  Package,
  Save,
  ShieldCheck,
  Warehouse,
} from "lucide-react";

type RiskLevel = "Low" | "Medium" | "High";

type InventoryRisk = {
  id: number;
  area: string;
  risk: string;
  assertion: string;
  level: RiskLevel;
  response: string;
};

const initialRisks: InventoryRisk[] = [
  {
    id: 1,
    area: "Inventory Existence",
    risk: "Inventory recorded in the accounting records may not physically exist.",
    assertion: "Existence",
    level: "Medium",
    response:
      "Attend physical inventory counts and perform test counts against inventory records.",
  },
  {
    id: 2,
    area: "Inventory Completeness",
    risk: "Inventory movements may not be completely recorded in the accounting system.",
    assertion: "Completeness",
    level: "Medium",
    response:
      "Test inventory movement reports and reconcile stock movements to accounting records.",
  },
  {
    id: 3,
    area: "Inventory Valuation",
    risk: "Inventory may be incorrectly valued or obsolete inventory may not be provided for.",
    assertion: "Valuation",
    level: "High",
    response:
      "Review costing methods, unit costs, ageing reports and provisions for obsolete or damaged inventory.",
  },
  {
    id: 4,
    area: "Inventory Ownership",
    risk: "Inventory may include goods that are not owned by the entity.",
    assertion: "Rights & Obligations",
    level: "Low",
    response:
      "Inspect purchase documents, ownership records and consignment arrangements.",
  },
  {
    id: 5,
    area: "Inventory Cut-off",
    risk: "Purchases and inventory movements may be recorded in the wrong accounting period.",
    assertion: "Cut-off",
    level: "Medium",
    response:
      "Perform cut-off testing around year-end for purchases, goods received and goods issued.",
  },
  {
    id: 6,
    area: "Physical Controls",
    risk: "Poor warehouse controls may result in loss, damage or unauthorized access to inventory.",
    assertion: "Existence / Safeguarding",
    level: "Medium",
    response:
      "Inspect warehouse controls, access restrictions, security arrangements and stock handling procedures.",
  },
  {
    id: 7,
    area: "Inventory Reconciliation",
    risk: "Differences between physical counts and accounting records may not be investigated.",
    assertion: "Accuracy",
    level: "Medium",
    response:
      "Review inventory reconciliations and investigate significant stock count differences.",
  },
  {
    id: 8,
    area: "Inventory Adjustments",
    risk: "Unauthorized inventory adjustments may be processed.",
    assertion: "Accuracy / Authorization",
    level: "Low",
    response:
      "Test inventory adjustments for authorization and supporting documentation.",
  },
];

const inventoryControls = [
  {
    title: "Physical stock counts",
    description:
      "Periodic physical counts are performed and differences are investigated.",
  },
  {
    title: "Goods receiving controls",
    description:
      "Goods received are checked against approved purchase orders and receiving documentation.",
  },
  {
    title: "Stores issue controls",
    description:
      "Inventory issues require authorized documentation before stock is released.",
  },
  {
    title: "Inventory access controls",
    description:
      "Warehouse access is restricted to authorized personnel.",
  },
  {
    title: "Inventory reconciliation",
    description:
      "Inventory sub-ledger records are reconciled with the general ledger.",
  },
  {
    title: "Obsolescence review",
    description:
      "Slow-moving, damaged and obsolete inventory is identified and reviewed.",
  },
];

const auditProcedures = [
  "Obtain an understanding of the inventory management process.",
  "Document the flow of inventory from purchasing through storage and issue.",
  "Assess the design and implementation of key inventory controls.",
  "Attend or review the results of physical inventory counts.",
  "Perform independent test counts.",
  "Test inventory additions to supporting purchase documentation.",
  "Test inventory issues to authorized stores issue documentation.",
  "Perform year-end inventory cut-off testing.",
  "Review inventory ageing for slow-moving and obsolete items.",
  "Test inventory valuation and costing.",
  "Reconcile inventory records to the general ledger.",
  "Investigate significant inventory count differences.",
];

export default function InventoryPage() {
  const router = useRouter();
  const params = useParams();

  const engagementId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : "";

  const [activeTab, setActiveTab] = useState<
    "overview" | "risk" | "controls" | "procedures"
  >("overview");

  const [risks, setRisks] = useState<InventoryRisk[]>(initialRisks);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateRiskLevel = (id: number, level: RiskLevel) => {
    setRisks((currentRisks) =>
      currentRisks.map((risk) =>
        risk.id === id ? { ...risk, level } : risk
      )
    );

    setSaved(false);
  };

  const handleSave = () => {
    if (saving) return;

    setSaving(true);
    setSaved(false);

    console.log("Inventory risk assessment:", {
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

    console.log("Inventory risk assessment:", {
      engagementId,
      risks,
    });

    setTimeout(() => {
      setSaving(false);
      setSaved(true);

      router.push(
        `/engagements/${engagementId}/risk-assessment/transaction-cycles/financial-statement-close`
      );
    }, 500);
  };

  const getRiskClass = (level: RiskLevel) => {
    if (level === "High") {
      return "border-red-200 bg-red-50 text-red-700";
    }

    if (level === "Medium") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    return "border-green-200 bg-green-50 text-green-700";
  };

  const highRisks = risks.filter((risk) => risk.level === "High").length;

  const mediumRisks = risks.filter(
    (risk) => risk.level === "Medium"
  ).length;

  const lowRisks = risks.filter((risk) => risk.level === "Low").length;

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
                  Inventory
                </span>
              </div>

              <div className="flex items-start gap-4">
                <div className="hidden rounded-xl bg-emerald-100 p-3 text-emerald-700 sm:flex">
                  <Package size={24} />
                </div>

                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    Inventory Transaction Cycle
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    Identify and assess risks relating to inventory
                    existence, completeness, valuation, ownership,
                    cut-off, safeguarding and reconciliation.
                  </p>
                </div>
              </div>
            </div>

            <div className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Current Cycle
              </p>

              <p className="mt-1 text-sm font-bold text-slate-900">
                4 of 6
              </p>

              <p className="text-xs text-slate-500">
                Inventory
              </p>
            </div>
          </div>
        </section>

        {/* SUMMARY CARDS */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Risk Areas"
            value={risks.length}
            description="Areas assessed"
            icon={<CircleAlert size={20} />}
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
            </nav>
          </div>
        </section>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                  <Warehouse size={22} />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Inventory Process
                  </h2>

                  <p className="text-sm text-slate-500">
                    Key activities within the inventory transaction cycle.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  "Inventory planning and purchasing",
                  "Goods receiving and inspection",
                  "Storage and warehouse management",
                  "Inventory issue and movement",
                  "Stock counting and reconciliation",
                  "Inventory valuation and reporting",
                ].map((step, index) => (
                  <div
                    key={step}
                    className="flex items-center gap-4 rounded-xl border border-slate-100 p-4 transition hover:bg-slate-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <p className="flex-1 text-sm font-medium text-slate-800">
                      {step}
                    </p>

                    <ChevronRight
                      size={16}
                      className="text-slate-400"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                    <ClipboardCheck size={22} />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Audit Focus
                    </h2>

                    <p className="text-sm text-slate-500">
                      Key assertions and risk areas.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <FocusItem
                    title="Existence"
                    description="Determine whether recorded inventory physically exists."
                  />

                  <FocusItem
                    title="Valuation"
                    description="Assess costing and provisions for obsolete or damaged inventory."
                  />

                  <FocusItem
                    title="Completeness & Cut-off"
                    description="Verify inventory movements are completely and accurately recorded."
                  />

                  <FocusItem
                    title="Safeguarding"
                    description="Evaluate controls protecting inventory from theft, damage and unauthorized access."
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
                      Inventory may involve significant quantities,
                      physical handling, valuation judgments and
                      cut-off considerations. These factors should be
                      considered when determining the appropriate audit
                      response.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* RISK ASSESSMENT */}
        {activeTab === "risk" && (
          <section>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Inventory Risk Assessment
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Assess the risk level and planned audit response for
                each inventory area.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Area
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Risk
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Assertion
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Risk Level
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

                        <td className="px-5 py-5">
                          <p className="max-w-sm text-sm leading-6 text-slate-600">
                            {risk.risk}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {risk.assertion}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <div className="space-y-2">
                            <select
                              value={risk.level}
                              onChange={(event) =>
                                updateRiskLevel(
                                  risk.id,
                                  event.target.value as RiskLevel
                                )
                              }
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                            >
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
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

                        <td className="px-5 py-5">
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
          </section>
        )}

        {/* CONTROLS */}
        {activeTab === "controls" && (
          <section>
            <div className="mb-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-green-100 p-3 text-green-700">
                  <ShieldCheck size={21} />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Key Inventory Controls
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Controls to consider when evaluating the inventory
                    process.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {inventoryControls.map((control, index) => (
                <div
                  key={control.title}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {control.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {control.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PROCEDURES */}
        {activeTab === "procedures" && (
          <section>
            <div className="mb-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-purple-100 p-3 text-purple-700">
                  <FileText size={21} />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Suggested Audit Procedures
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Procedures to consider when designing the inventory
                    audit response.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {auditProcedures.map((procedure, index) => (
                <div
                  key={procedure}
                  className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <p className="pt-1 text-sm leading-6 text-slate-700">
                    {procedure}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SAVE AND CONTINUE */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-semibold text-slate-900">
                Inventory assessment
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Save your inventory assessment before continuing to the
                next transaction cycle.
              </p>

              {saved && (
                <div className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-600">
                  <CheckCircle2 size={16} />
                  Inventory assessment saved
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
                    Save & Continue to Financial Statement Close
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

function FocusItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <p className="font-semibold text-slate-900">{title}</p>

      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}