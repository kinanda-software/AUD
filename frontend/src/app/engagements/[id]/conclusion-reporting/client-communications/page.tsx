"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "../../../../../components/layout/AppLayout";
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  FileText,
  MessageSquare,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";

type CompletionStatus = "Not Started" | "In Progress" | "Completed";

type Severity =
  | "Significant Deficiency"
  | "Material Weakness"
  | "Other Deficiency";

type CommunicationStatus = "Draft" | "Communicated" | "Cleared";

type MatterType =
  | "Audit Scope"
  | "Significant Risks"
  | "Significant Judgments"
  | "Accounting Policies"
  | "Misstatements"
  | "Going Concern"
  | "Internal Control"
  | "Other";

type Deficiency = {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  affectedArea: string;
  managementResponse: string;
  communicatedTo: string;
  communicationDate: string;
  status: CommunicationStatus;
};

type GovernanceMatter = {
  id: string;
  matterType: MatterType;
  title: string;
  description: string;
  communicatedTo: string;
  communicationDate: string;
  response: string;
  status: CommunicationStatus;
};

type RepresentationItem = {
  id: string;
  representation: string;
  responsiblePerson: string;
  requestedDate: string;
  receivedDate: string;
  status: "Requested" | "Received" | "Outstanding";
  notes: string;
};

export default function ClientCommunicationsPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = String(params.id ?? "");

  // =====================================================
  // GENERAL STATE
  // =====================================================

  const [completionStatus, setCompletionStatus] =
    useState<CompletionStatus>("Not Started");

  const [saved, setSaved] = useState(false);

  // =====================================================
  // ISA 265 — INTERNAL CONTROL DEFICIENCIES
  // =====================================================

  const [deficiencies, setDeficiencies] = useState<Deficiency[]>([
    {
      id: "DEF-001",
      title: "Example control deficiency",
      description:
        "Document the nature of the deficiency, the affected control and the potential effect.",
      severity: "Other Deficiency",
      affectedArea: "Financial reporting",
      managementResponse: "",
      communicatedTo: "Those Charged With Governance",
      communicationDate: "",
      status: "Draft",
    },
  ]);

  // =====================================================
  // ISA 260 — GOVERNANCE COMMUNICATION
  // =====================================================

  const [governanceMatters, setGovernanceMatters] = useState<
    GovernanceMatter[]
  >([
    {
      id: "GOV-001",
      matterType: "Audit Scope",
      title: "Overall audit scope and strategy",
      description:
        "Communicate the planned scope, timing and significant areas of the audit.",
      communicatedTo: "Those Charged With Governance",
      communicationDate: "",
      response: "",
      status: "Draft",
    },
  ]);

  // =====================================================
  // ISA 580 — WRITTEN REPRESENTATIONS
  // =====================================================

  const [representationItems, setRepresentationItems] = useState<
    RepresentationItem[]
  >([
    {
      id: "REP-001",
      representation:
        "Management has provided all relevant information and access to persons within the entity.",
      responsiblePerson: "",
      requestedDate: "",
      receivedDate: "",
      status: "Requested",
      notes: "",
    },
    {
      id: "REP-002",
      representation:
        "Management has disclosed all known actual or suspected fraud and non-compliance affecting the financial statements.",
      responsiblePerson: "",
      requestedDate: "",
      receivedDate: "",
      status: "Requested",
      notes: "",
    },
    {
      id: "REP-003",
      representation:
        "Management has disclosed all known uncorrected misstatements and their effect on the financial statements.",
      responsiblePerson: "",
      requestedDate: "",
      receivedDate: "",
      status: "Requested",
      notes: "",
    },
  ]);

  // =====================================================
  // MANAGEMENT RESPONSES / OUTSTANDING MATTERS
  // =====================================================

  const [outstandingMatters, setOutstandingMatters] = useState("");

  const [managementResponses, setManagementResponses] = useState("");

  // =====================================================
  // FINAL COMMUNICATION
  // =====================================================

  const [auditorCommunicationConclusion, setAuditorCommunicationConclusion] =
    useState("");

  const [finalCommunicationDate, setFinalCommunicationDate] =
    useState("");

  const [communicationResponsiblePerson, setCommunicationResponsiblePerson] =
    useState("");

  const [finalReviewCompleted, setFinalReviewCompleted] = useState(false);

  // =====================================================
  // CALCULATIONS
  // =====================================================

  const deficiencyStats = useMemo(() => {
    const communicated = deficiencies.filter(
      (item) => item.status === "Communicated"
    ).length;

    const cleared = deficiencies.filter(
      (item) => item.status === "Cleared"
    ).length;

    const significant = deficiencies.filter(
      (item) =>
        item.severity === "Significant Deficiency" ||
        item.severity === "Material Weakness"
    ).length;

    return {
      total: deficiencies.length,
      communicated,
      cleared,
      significant,
    };
  }, [deficiencies]);

  const governanceStats = useMemo(() => {
    const communicated = governanceMatters.filter(
      (item) => item.status === "Communicated"
    ).length;

    const cleared = governanceMatters.filter(
      (item) => item.status === "Cleared"
    ).length;

    const outstanding = governanceMatters.filter(
      (item) =>
        item.status !== "Communicated" &&
        item.status !== "Cleared"
    ).length;

    return {
      total: governanceMatters.length,
      communicated,
      cleared,
      outstanding,
    };
  }, [governanceMatters]);

  const representationStats = useMemo(() => {
    const received = representationItems.filter(
      (item) => item.status === "Received"
    ).length;

    const outstanding = representationItems.filter(
      (item) => item.status !== "Received"
    ).length;

    return {
      total: representationItems.length,
      received,
      outstanding,
    };
  }, [representationItems]);

  // =====================================================
  // READINESS RULES
  // =====================================================

  const deficienciesReady = useMemo(() => {
    return (
      deficiencies.length === 0 ||
      deficiencies.every(
        (item) =>
          item.status === "Communicated" ||
          item.status === "Cleared"
      )
    );
  }, [deficiencies]);

  const governanceReady = useMemo(() => {
    return (
      governanceMatters.length === 0 ||
      governanceMatters.every(
        (item) =>
          item.status === "Communicated" ||
          item.status === "Cleared"
      )
    );
  }, [governanceMatters]);

  const representationsReady = useMemo(() => {
    return (
      representationItems.length === 0 ||
      representationItems.every(
        (item) => item.status === "Received"
      )
    );
  }, [representationItems]);

  /*
   * Outstanding matters are ready only when:
   *
   * 1. There are no unresolved structured matters, OR
   * 2. The auditor has explicitly documented a resolved state.
   *
   * Examples:
   * None
   * None outstanding
   * No outstanding matters
   * All matters resolved
   * Resolved
   * N/A
   */

  const outstandingMattersReady = useMemo(() => {
    const unresolvedStructuredMatters =
      !deficienciesReady ||
      !governanceReady ||
      !representationsReady;

    if (!unresolvedStructuredMatters) {
      return true;
    }

    const text = outstandingMatters.trim().toLowerCase();

    if (!text) {
      return false;
    }

    const resolvedStatements = [
      "none",
      "none outstanding",
      "no outstanding matters",
      "no outstanding matter",
      "resolved",
      "all matters resolved",
      "all outstanding matters resolved",
      "not applicable",
      "n/a",
    ];

    return resolvedStatements.some((statement) =>
      text.includes(statement)
    );
  }, [
    outstandingMatters,
    deficienciesReady,
    governanceReady,
    representationsReady,
  ]);

  const conclusionReady =
    auditorCommunicationConclusion.trim() !== "";

  const finalReviewReady = finalReviewCompleted;

  const communicationReady = useMemo(() => {
    return (
      deficienciesReady &&
      governanceReady &&
      representationsReady &&
      outstandingMattersReady &&
      conclusionReady &&
      finalReviewReady
    );
  }, [
    deficienciesReady,
    governanceReady,
    representationsReady,
    outstandingMattersReady,
    conclusionReady,
    finalReviewReady,
  ]);

  // =====================================================
  // OPEN MATTERS COUNT
  // =====================================================

  const openMattersCount = useMemo(() => {
    const openDeficiencies = deficiencies.filter(
      (item) =>
        item.status !== "Communicated" &&
        item.status !== "Cleared"
    ).length;

    const openGovernance = governanceMatters.filter(
      (item) =>
        item.status !== "Communicated" &&
        item.status !== "Cleared"
    ).length;

    const openRepresentations = representationItems.filter(
      (item) => item.status !== "Received"
    ).length;

    return (
      openDeficiencies +
      openGovernance +
      openRepresentations
    );
  }, [
    deficiencies,
    governanceMatters,
    representationItems,
  ]);

  // =====================================================
  // START WORKPAPER
  // =====================================================

  const handleStart = () => {
    setCompletionStatus("In Progress");
    setSaved(false);
  };

  // =====================================================
  // DEFICIENCY ACTIONS
  // =====================================================

  const updateDeficiency = (
    id: string,
    field: keyof Deficiency,
    value: string
  ) => {
    setDeficiencies((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );

    setSaved(false);

    if (completionStatus === "Not Started") {
      setCompletionStatus("In Progress");
    }
  };

  const addDeficiency = () => {
    setDeficiencies((current) => [
      ...current,
      {
        id: `DEF-${String(current.length + 1).padStart(3, "0")}`,
        title: "",
        description: "",
        severity: "Other Deficiency",
        affectedArea: "",
        managementResponse: "",
        communicatedTo: "Those Charged With Governance",
        communicationDate: "",
        status: "Draft",
      },
    ]);

    setSaved(false);
    setCompletionStatus("In Progress");
  };

  const removeDeficiency = (id: string) => {
    setDeficiencies((current) =>
      current.filter((item) => item.id !== id)
    );

    setSaved(false);
  };

  // =====================================================
  // GOVERNANCE MATTER ACTIONS
  // =====================================================

  const updateGovernanceMatter = (
    id: string,
    field: keyof GovernanceMatter,
    value: string
  ) => {
    setGovernanceMatters((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );

    setSaved(false);

    if (completionStatus === "Not Started") {
      setCompletionStatus("In Progress");
    }
  };

  const addGovernanceMatter = () => {
    setGovernanceMatters((current) => [
      ...current,
      {
        id: `GOV-${String(current.length + 1).padStart(3, "0")}`,
        matterType: "Other",
        title: "",
        description: "",
        communicatedTo: "Those Charged With Governance",
        communicationDate: "",
        response: "",
        status: "Draft",
      },
    ]);

    setSaved(false);
    setCompletionStatus("In Progress");
  };

  const removeGovernanceMatter = (id: string) => {
    setGovernanceMatters((current) =>
      current.filter((item) => item.id !== id)
    );

    setSaved(false);
  };

  // =====================================================
  // REPRESENTATION ACTIONS
  // =====================================================

  const updateRepresentation = (
    id: string,
    field: keyof RepresentationItem,
    value: string
  ) => {
    setRepresentationItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );

    setSaved(false);

    if (completionStatus === "Not Started") {
      setCompletionStatus("In Progress");
    }
  };

  const addRepresentation = () => {
    setRepresentationItems((current) => [
      ...current,
      {
        id: `REP-${String(current.length + 1).padStart(3, "0")}`,
        representation: "",
        responsiblePerson: "",
        requestedDate: "",
        receivedDate: "",
        status: "Requested",
        notes: "",
      },
    ]);

    setSaved(false);
    setCompletionStatus("In Progress");
  };

  const removeRepresentation = (id: string) => {
    setRepresentationItems((current) =>
      current.filter((item) => item.id !== id)
    );

    setSaved(false);
  };

  // =====================================================
  // SAVE
  // =====================================================

  const handleSave = () => {
    const communicationData = {
      engagementId,
      section: "4.4",
      completionStatus,
      deficiencies,
      governanceMatters,
      representationItems,
      outstandingMatters,
      managementResponses,
      auditorCommunicationConclusion,
      finalCommunicationDate,
      communicationResponsiblePerson,
      finalReviewCompleted,
    };

    console.log(
      "Client Communications:",
      communicationData
    );

    setSaved(true);

    if (completionStatus === "Not Started") {
      setCompletionStatus("In Progress");
    }
  };

  // =====================================================
  // COMPLETE
  // =====================================================

  const handleComplete = () => {
    if (!communicationReady) {
      const missing: string[] = [];

      if (!deficienciesReady) {
        missing.push(
          "ISA 265: Set every deficiency Communication Status to Communicated or Cleared."
        );
      }

      if (!governanceReady) {
        missing.push(
          "ISA 260: Set every governance matter Status to Communicated or Cleared."
        );
      }

      if (!representationsReady) {
        missing.push(
          "ISA 580: Set every written representation Status to Received."
        );
      }

      if (!outstandingMattersReady) {
        missing.push(
          "Outstanding Matters: Resolve the open matters or document their resolution."
        );
      }

      if (!conclusionReady) {
        missing.push(
          "Auditor Communication Conclusion: Enter the auditor's overall conclusion."
        );
      }

      if (!finalReviewReady) {
        missing.push(
          "Final Communication Review: Tick the final communication review checkbox."
        );
      }

      alert(
        `Client Communications cannot be completed yet.\n\n${missing
          .map((item) => `• ${item}`)
          .join("\n")}`
      );

      return;
    }

    const communicationData = {
      engagementId,
      section: "4.4",
      completionStatus: "Completed",
      deficiencies,
      governanceMatters,
      representationItems,
      outstandingMatters,
      managementResponses,
      auditorCommunicationConclusion,
      finalCommunicationDate,
      communicationResponsiblePerson,
      finalReviewCompleted,
    };

    console.log(
      "Completed Client Communications:",
      communicationData
    );

    setCompletionStatus("Completed");
    setSaved(true);

    alert(
      "Phase 4.4 Client Communications completed successfully."
    );
  };

  // =====================================================
  // NAVIGATION
  // =====================================================

  const handleBack = () => {
    router.push(
      `/engagements/${engagementId}/conclusion-reporting/summary-review`
    );
  };

  const handlePhase4Overview = () => {
    router.push(
      `/engagements/${engagementId}/conclusion-reporting`
    );
  };

  const handleNext = () => {
    if (completionStatus !== "Completed") {
      alert(
        "Please complete and finalize Client Communications first."
      );
      return;
    }

    router.push(
      `/engagements/${engagementId}/conclusion-reporting/opinion-report`
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <AppLayout>
      <main className="min-w-0 flex-1 bg-slate-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

          {/* HEADER */}

          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex min-w-0 items-start gap-3 sm:gap-4">

              <button
                type="button"
                onClick={handleBack}
                className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100"
              >
                <ArrowLeft size={19} />
              </button>

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-2 text-sm">

                  <span className="font-semibold text-blue-600">
                    Phase 4
                  </span>

                  <span className="text-gray-400">
                    /
                  </span>

                  <span className="text-gray-500">
                    4.4 Client Communications
                  </span>

                </div>

                <h1 className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">
                  Client Communications
                </h1>

                <p className="mt-1 max-w-3xl text-sm text-gray-500">
                  Complete communications with management and those
                  charged with governance and document written
                  representations.
                </p>

              </div>

            </div>

            <div className="shrink-0 self-start lg:self-center">
              <StatusBadge status={completionStatus} />
            </div>

          </div>

          {/* ENGAGEMENT SUMMARY */}

          <section className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:p-6">

            <div className="flex items-center justify-between gap-4">

              <div className="min-w-0">

                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Current Engagement
                </p>

                <h2 className="mt-1 text-lg font-bold text-gray-900 sm:text-xl">
                  Engagement #{engagementId}
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  Phase 4 — Conclusion & Reporting
                </p>

              </div>

              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm md:flex">
                <MessageSquare size={23} />
              </div>

            </div>

          </section>

          {/* START WORKPAPER */}

          {completionStatus === "Not Started" && (
            <section className="mb-6 rounded-xl border border-blue-200 bg-white p-4 shadow-sm sm:p-6">

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                <div className="min-w-0">

                  <h2 className="font-semibold text-gray-900">
                    Client Communication Workpaper
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Review ISA 265 deficiencies, ISA 260 governance
                    communications and ISA 580 written representations.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={handleStart}
                  className="shrink-0 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Start Workpaper
                </button>

              </div>

            </section>
          )}

          {/* SUMMARY METRICS */}

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <MetricCard
              label="Deficiencies"
              value={deficiencyStats.total}
              description={`${deficiencyStats.communicated + deficiencyStats.cleared} completed`}
              icon={<ShieldAlert size={20} />}
            />

            <MetricCard
              label="Governance Matters"
              value={governanceStats.total}
              description={`${governanceStats.communicated + governanceStats.cleared} completed`}
              icon={<Users size={20} />}
            />

            <MetricCard
              label="Representations"
              value={representationStats.total}
              description={`${representationStats.received} received`}
              icon={<FileText size={20} />}
            />

            <MetricCard
              label="Open Matters"
              value={openMattersCount}
              description={
                openMattersCount === 0
                  ? "All structured matters resolved"
                  : "Require attention"
              }
              icon={<BellRing size={20} />}
            />

          </div>

          {/* ISA 265 */}

          <section className="mb-6 rounded-xl border border-orange-200 bg-white p-4 shadow-sm sm:p-6">

            <SectionHeader
              icon={<ShieldAlert size={22} />}
              title="ISA 265 — Communication of Deficiencies in Internal Control"
              description="Identify, evaluate, classify and communicate deficiencies in internal control to the appropriate level of management and those charged with governance."
            />

            <div className="mt-6 space-y-5">

              {deficiencies.map((item, index) => (

                <div
                  key={item.id}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5"
                >

                  <div className="mb-5 flex items-start justify-between gap-3">

                    <div className="flex min-w-0 items-center gap-3">

                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                        {index + 1}
                      </span>

                      <div className="min-w-0">

                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {item.id}
                        </p>

                        <h3 className="font-semibold text-gray-900">
                          Internal Control Deficiency
                        </h3>

                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeDeficiency(item.id)
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-red-500 hover:bg-red-50"
                      title="Remove deficiency"
                    >
                      <Trash2 size={17} />
                    </button>

                  </div>

                  <div className="grid gap-5 md:grid-cols-2">

                    <TextField
                      label="Deficiency Title"
                      value={item.title}
                      onChange={(value) =>
                        updateDeficiency(
                          item.id,
                          "title",
                          value
                        )
                      }
                      placeholder="e.g. Bank reconciliations not reviewed"
                    />

                    <TextField
                      label="Affected Area"
                      value={item.affectedArea}
                      onChange={(value) =>
                        updateDeficiency(
                          item.id,
                          "affectedArea",
                          value
                        )
                      }
                      placeholder="e.g. Cash and bank"
                    />

                    <SelectField
                      label="Severity Classification"
                      value={item.severity}
                      onChange={(value) =>
                        updateDeficiency(
                          item.id,
                          "severity",
                          value
                        )
                      }
                      options={[
                        "Significant Deficiency",
                        "Material Weakness",
                        "Other Deficiency",
                      ]}
                    />

                    <SelectField
                      label="Communication Status"
                      value={item.status}
                      onChange={(value) =>
                        updateDeficiency(
                          item.id,
                          "status",
                          value
                        )
                      }
                      options={[
                        "Draft",
                        "Communicated",
                        "Cleared",
                      ]}
                    />

                    <TextField
                      label="Communicated To"
                      value={item.communicatedTo}
                      onChange={(value) =>
                        updateDeficiency(
                          item.id,
                          "communicatedTo",
                          value
                        )
                      }
                      placeholder="Recipient or governance body"
                    />

                    <TextField
                      label="Communication Date"
                      type="date"
                      value={item.communicationDate}
                      onChange={(value) =>
                        updateDeficiency(
                          item.id,
                          "communicationDate",
                          value
                        )
                      }
                    />

                  </div>

                  <div className="mt-5">

                    <TextAreaField
                      label="Description of Deficiency"
                      value={item.description}
                      onChange={(value) =>
                        updateDeficiency(
                          item.id,
                          "description",
                          value
                        )
                      }
                      placeholder="Describe the deficiency, cause, affected control, potential effect and relevant circumstances."
                    />

                  </div>

                  <div className="mt-5">

                    <TextAreaField
                      label="Management Response"
                      value={item.managementResponse}
                      onChange={(value) =>
                        updateDeficiency(
                          item.id,
                          "managementResponse",
                          value
                        )
                      }
                      placeholder="Document management's response, planned corrective action and expected implementation."
                    />

                  </div>

                </div>

              ))}

            </div>

            <button
              type="button"
              onClick={addDeficiency}
              className="mt-5 flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <Plus size={17} />
              Add Deficiency
            </button>

          </section>

          {/* ISA 260 */}

          <section className="mb-6 rounded-xl border border-blue-200 bg-white p-4 shadow-sm sm:p-6">

            <SectionHeader
              icon={<Users size={22} />}
              title="ISA 260 — Communication With Those Charged With Governance"
              description="Document significant audit matters communicated to those charged with governance, including scope, significant risks, judgments, misstatements and other relevant matters."
            />

            <div className="mt-6 space-y-5">

              {governanceMatters.map((item, index) => (

                <div
                  key={item.id}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5"
                >

                  <div className="mb-5 flex items-start justify-between gap-3">

                    <div className="flex min-w-0 items-center gap-3">

                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                        {index + 1}
                      </span>

                      <div className="min-w-0">

                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {item.id}
                        </p>

                        <h3 className="font-semibold text-gray-900">
                          Governance Communication Matter
                        </h3>

                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeGovernanceMatter(item.id)
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-red-500 hover:bg-red-50"
                      title="Remove matter"
                    >
                      <Trash2 size={17} />
                    </button>

                  </div>

                  <div className="grid gap-5 md:grid-cols-2">

                    <SelectField
                      label="Matter Type"
                      value={item.matterType}
                      onChange={(value) =>
                        updateGovernanceMatter(
                          item.id,
                          "matterType",
                          value
                        )
                      }
                      options={[
                        "Audit Scope",
                        "Significant Risks",
                        "Significant Judgments",
                        "Accounting Policies",
                        "Misstatements",
                        "Going Concern",
                        "Internal Control",
                        "Other",
                      ]}
                    />

                    <TextField
                      label="Matter Title"
                      value={item.title}
                      onChange={(value) =>
                        updateGovernanceMatter(
                          item.id,
                          "title",
                          value
                        )
                      }
                      placeholder="Enter communication matter"
                    />

                    <TextField
                      label="Communicated To"
                      value={item.communicatedTo}
                      onChange={(value) =>
                        updateGovernanceMatter(
                          item.id,
                          "communicatedTo",
                          value
                        )
                      }
                      placeholder="Those charged with governance"
                    />

                    <TextField
                      label="Communication Date"
                      type="date"
                      value={item.communicationDate}
                      onChange={(value) =>
                        updateGovernanceMatter(
                          item.id,
                          "communicationDate",
                          value
                        )
                      }
                    />

                    <SelectField
                      label="Status"
                      value={item.status}
                      onChange={(value) =>
                        updateGovernanceMatter(
                          item.id,
                          "status",
                          value
                        )
                      }
                      options={[
                        "Draft",
                        "Communicated",
                        "Cleared",
                      ]}
                    />

                  </div>

                  <div className="mt-5">

                    <TextAreaField
                      label="Communication Matter"
                      value={item.description}
                      onChange={(value) =>
                        updateGovernanceMatter(
                          item.id,
                          "description",
                          value
                        )
                      }
                      placeholder="Describe the matter communicated, its significance and the auditor's communication."
                    />

                  </div>

                  <div className="mt-5">

                    <TextAreaField
                      label="Governance Response"
                      value={item.response}
                      onChange={(value) =>
                        updateGovernanceMatter(
                          item.id,
                          "response",
                          value
                        )
                      }
                      placeholder="Document response from those charged with governance."
                    />

                  </div>

                </div>

              ))}

            </div>

            <button
              type="button"
              onClick={addGovernanceMatter}
              className="mt-5 flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <Plus size={17} />
              Add Governance Matter
            </button>

          </section>

          {/* ISA 580 */}

          <section className="mb-6 rounded-xl border border-green-200 bg-white p-4 shadow-sm sm:p-6">

            <SectionHeader
              icon={<FileText size={22} />}
              title="ISA 580 — Written Representations"
              description="Track required written representations, responsible management personnel, dates requested and received, and outstanding representations."
            />

            <div className="mt-6 space-y-5">

              {representationItems.map((item, index) => (

                <div
                  key={item.id}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5"
                >

                  <div className="mb-5 flex items-start justify-between gap-3">

                    <div className="flex min-w-0 items-center gap-3">

                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
                        {index + 1}
                      </span>

                      <div className="min-w-0">

                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {item.id}
                        </p>

                        <h3 className="font-semibold text-gray-900">
                          Written Representation
                        </h3>

                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeRepresentation(item.id)
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-red-500 hover:bg-red-50"
                      title="Remove representation"
                    >
                      <Trash2 size={17} />
                    </button>

                  </div>

                  <div className="grid gap-5 md:grid-cols-2">

                    <TextField
                      label="Responsible Management Person"
                      value={item.responsiblePerson}
                      onChange={(value) =>
                        updateRepresentation(
                          item.id,
                          "responsiblePerson",
                          value
                        )
                      }
                      placeholder="Name / position"
                    />

                    <SelectField
                      label="Status"
                      value={item.status}
                      onChange={(value) =>
                        updateRepresentation(
                          item.id,
                          "status",
                          value
                        )
                      }
                      options={[
                        "Requested",
                        "Received",
                        "Outstanding",
                      ]}
                    />

                    <TextField
                      label="Requested Date"
                      type="date"
                      value={item.requestedDate}
                      onChange={(value) =>
                        updateRepresentation(
                          item.id,
                          "requestedDate",
                          value
                        )
                      }
                    />

                    <TextField
                      label="Received Date"
                      type="date"
                      value={item.receivedDate}
                      onChange={(value) =>
                        updateRepresentation(
                          item.id,
                          "receivedDate",
                          value
                        )
                      }
                    />

                  </div>

                  <div className="mt-5">

                    <TextAreaField
                      label="Representation"
                      value={item.representation}
                      onChange={(value) =>
                        updateRepresentation(
                          item.id,
                          "representation",
                          value
                        )
                      }
                      placeholder="Describe the written representation required."
                    />

                  </div>

                  <div className="mt-5">

                    <TextAreaField
                      label="Notes"
                      value={item.notes}
                      onChange={(value) =>
                        updateRepresentation(
                          item.id,
                          "notes",
                          value
                        )
                      }
                      placeholder="Document any relevant notes or exceptions."
                    />

                  </div>

                </div>

              ))}

            </div>

            <button
              type="button"
              onClick={addRepresentation}
              className="mt-5 flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <Plus size={17} />
              Add Representation
            </button>

          </section>

          {/* MANAGEMENT RESPONSES */}

          <section className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">

            <SectionHeader
              icon={<MessageSquare size={22} />}
              title="Management Responses and Outstanding Matters"
              description="Summarize management responses, unresolved matters and items requiring follow-up before the auditor's report is issued."
            />

            <div className="mt-5 grid gap-5">

              <TextAreaField
                label="Management Responses"
                value={managementResponses}
                onChange={(value) => {
                  setManagementResponses(value);
                  setSaved(false);

                  if (completionStatus === "Not Started") {
                    setCompletionStatus("In Progress");
                  }
                }}
                placeholder="Summarize management responses to deficiencies, audit findings and governance matters."
              />

              <TextAreaField
                label="Outstanding Matters"
                value={outstandingMatters}
                onChange={(value) => {
                  setOutstandingMatters(value);
                  setSaved(false);

                  if (completionStatus === "Not Started") {
                    setCompletionStatus("In Progress");
                  }
                }}
                placeholder="If there are no outstanding matters, enter 'None'. If matters remain, document them and resolve them before completion."
              />

            </div>

            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">

              <p className="font-semibold">
                Completion guidance
              </p>

              <p className="mt-1">
                If there are no unresolved matters, enter{" "}
                <strong>None</strong>. If there are unresolved
                matters, document them and resolve them before
                completing this workpaper.
              </p>

            </div>

          </section>

          {/* FINAL COMMUNICATION */}

          <section className="mb-6 rounded-xl border border-purple-200 bg-white p-4 shadow-sm sm:p-6">

            <SectionHeader
              icon={<CheckCircle2 size={22} />}
              title="Auditor Communication Conclusion"
              description="Document the auditor's overall conclusion regarding required client and governance communications."
            />

            <div className="mt-5 grid gap-5 md:grid-cols-2">

              <TextField
                label="Communication Responsible Person"
                value={communicationResponsiblePerson}
                onChange={(value) => {
                  setCommunicationResponsiblePerson(value);
                  setSaved(false);

                  if (completionStatus === "Not Started") {
                    setCompletionStatus("In Progress");
                  }
                }}
                placeholder="Name of responsible auditor"
              />

              <TextField
                label="Final Communication Date"
                type="date"
                value={finalCommunicationDate}
                onChange={(value) => {
                  setFinalCommunicationDate(value);
                  setSaved(false);

                  if (completionStatus === "Not Started") {
                    setCompletionStatus("In Progress");
                  }
                }}
              />

            </div>

            <div className="mt-5">

              <TextAreaField
                label="Auditor Overall Conclusion *"
                value={auditorCommunicationConclusion}
                onChange={(value) => {
                  setAuditorCommunicationConclusion(value);
                  setSaved(false);

                  if (completionStatus === "Not Started") {
                    setCompletionStatus("In Progress");
                  }
                }}
                placeholder="Conclude whether all required communications under ISA 265, ISA 260 and ISA 580 have been completed and whether any outstanding matters affect the audit conclusion."
              />

            </div>

            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">

              <BooleanCheck
                label="Final communication review completed"
                checked={finalReviewCompleted}
                onChange={(value) => {
                  setFinalReviewCompleted(value);
                  setSaved(false);

                  if (completionStatus === "Not Started") {
                    setCompletionStatus("In Progress");
                  }
                }}
              />

            </div>

          </section>

          {/* COMPLETION CHECKLIST */}

          <section className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">

            <h2 className="font-semibold text-gray-900">
              4.4 Completion Checklist
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Confirm that the required client communication procedures
              have been completed.
            </p>

            <div className="mt-5 space-y-3">

              <CompletionItem
                label="ISA 265 deficiencies evaluated and communicated"
                complete={deficienciesReady}
              />

              <CompletionItem
                label="ISA 260 governance matters communicated"
                complete={governanceReady}
              />

              <CompletionItem
                label="ISA 580 written representations received"
                complete={representationsReady}
              />

              <CompletionItem
                label="Outstanding communication matters resolved"
                complete={outstandingMattersReady}
              />

              <CompletionItem
                label="Auditor communication conclusion documented"
                complete={conclusionReady}
              />

              <CompletionItem
                label="Final communication review completed"
                complete={finalReviewReady}
              />

            </div>

          </section>

          {/* READINESS PANEL */}

          <section
            className={`mb-6 rounded-xl border p-4 sm:p-6 ${
              communicationReady
                ? "border-green-200 bg-green-50"
                : "border-orange-200 bg-orange-50"
            }`}
          >

            <div className="flex items-start gap-4">

              {communicationReady ? (
                <CheckCircle2
                  size={24}
                  className="mt-0.5 shrink-0 text-green-600"
                />
              ) : (
                <BellRing
                  size={24}
                  className="mt-0.5 shrink-0 text-orange-600"
                />
              )}

              <div className="min-w-0">

                <h2 className="font-semibold text-gray-900">
                  {communicationReady
                    ? "Client Communications Ready for Completion"
                    : "Client Communications Not Yet Ready"}
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  {communicationReady
                    ? "All required communication areas have been addressed and the workpaper can be completed."
                    : "The Complete 4.4 button is available. Click it to see exactly which requirements still need attention."}
                </p>

              </div>

            </div>

          </section>

          {/* ACTIONS */}

          <div className="mb-8 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">

              <button
                type="button"
                onClick={handleBack}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <ArrowLeft size={17} />
                Back
              </button>

              <button
                type="button"
                onClick={handlePhase4Overview}
                className="rounded-lg border border-blue-200 px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                Phase 4 Overview
              </button>

            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">

              {/* SAVE */}

              <button
                type="button"
                onClick={handleSave}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                {saved ? (
                  <>
                    <CheckCircle2 size={18} />
                    Saved
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Workpaper
                  </>
                )}
              </button>

              {/* COMPLETE 4.4
                  IMPORTANT:
                  This button is intentionally NOT disabled.
                  It remains clickable so the user can see exactly
                  what is preventing completion.
              */}

              <button
                type="button"
                onClick={handleComplete}
                className={`flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition ${
                  communicationReady
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-orange-500 hover:bg-orange-600"
                }`}
              >
                <CheckCircle2 size={18} />
                Complete 4.4
              </button>

              {/* CONTINUE TO 4.5 */}

              <button
                type="button"
                onClick={handleNext}
                disabled={completionStatus !== "Completed"}
                className={`flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition ${
                  completionStatus === "Completed"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "cursor-not-allowed bg-gray-400"
                }`}
              >
                Continue to 4.5
              </button>

            </div>

          </div>

        </div>
      </main>
    </AppLayout>
  );
}

// =========================================================
// SECTION HEADER
// =========================================================

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">

      <div className="mt-0.5 shrink-0 text-blue-600">
        {icon}
      </div>

      <div className="min-w-0">

        <h2 className="font-semibold text-gray-900">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-6 text-gray-500">
          {description}
        </p>

      </div>

    </div>
  );
}

// =========================================================
// STATUS BADGE
// =========================================================

function StatusBadge({
  status,
}: {
  status: CompletionStatus;
}) {
  const classes =
    status === "Completed"
      ? "bg-green-100 text-green-700 border-green-200"
      : status === "In Progress"
        ? "bg-blue-100 text-blue-700 border-blue-200"
        : "bg-gray-100 text-gray-600 border-gray-200";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${classes}`}
    >
      {status}
    </span>
  );
}

// =========================================================
// METRIC CARD
// =========================================================

function MetricCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between gap-3">

        <span className="text-sm font-medium text-gray-500">
          {label}
        </span>

        <div className="shrink-0 text-blue-600">
          {icon}
        </div>

      </div>

      <p className="mt-3 text-2xl font-bold text-gray-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500">
        {description}
      </p>

    </div>
  );
}

// =========================================================
// TEXT FIELD
// =========================================================

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="min-w-0">

      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

    </div>
  );
}

// =========================================================
// TEXT AREA
// =========================================================

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="min-w-0">

      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        placeholder={placeholder}
        className="w-full min-w-0 resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

    </div>
  );
}

// =========================================================
// SELECT FIELD
// =========================================================

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="min-w-0">

      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}

      </select>

    </div>
  );
}

// =========================================================
// BOOLEAN CHECK
// =========================================================

function BooleanCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />

      <span className="text-sm font-medium text-gray-700">
        {label}
      </span>

    </label>
  );
}

// =========================================================
// COMPLETION ITEM
// =========================================================

function CompletionItem({
  label,
  complete,
}: {
  label: string;
  complete: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

      <span className="text-sm text-gray-700">
        {label}
      </span>

      {complete ? (
        <span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-green-600">
          <CheckCircle2 size={18} />
          Complete
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-orange-600">
          <XCircle size={18} />
          Outstanding
        </span>
      )}

    </div>
  );
}