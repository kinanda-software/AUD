"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "../../../../../components/layout/AppLayout";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type CompletionStatus = "Not Started" | "In Progress" | "Completed";

type Classification =
  | "Not a Deficiency"
  | "Deficiency"
  | "Significant Deficiency";

type CommunicationStatus =
  | "Not Communicated"
  | "Drafted"
  | "Communicated";

type GovernanceSignificance = "Routine" | "Significant" | "Key Matter";

type CommunicationMethod = "Meeting" | "Written" | "Meeting and Written";

type RepresentationStatus = "Pending" | "Received" | "Exception";

type Deficiency = {
  id: number;
  reference: string;
  financialStatementArea: string;
  classification: Classification;
  description: string;
  potentialEffect: string;
  managementResponse: string;
  auditorRecommendation: string;
  communicationStatus: CommunicationStatus;
};

type GovernanceMatter = {
  id: number;
  reference: string;
  matterCommunicated: string;
  significance: GovernanceSignificance;
  communicationMethod: CommunicationMethod;
  recipient: string;
  communicationDate: string;
  responseOutcome: string;
  communicationStatus: CommunicationStatus;
};

type RepresentationItem = {
  id: number;
  reference: string;
  representation: string;
  responsiblePerson: string;
  expectedDate: string;
  receivedDate: string;
  status: RepresentationStatus;
  comments: string;
};

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({
  number,
  title,
  subtitle,
  icon,
}: {
  number: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
          {icon}
        </div>

        <div className="min-w-0">
          <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
            {number}
          </div>

          <h2 className="text-lg font-bold text-slate-900">
            {title}
          </h2>

          <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}: {
  status: CompletionStatus;
}) {
  const styles: Record<CompletionStatus, string> = {
    "Not Started":
      "border-slate-200 bg-slate-100 text-slate-700",

    "In Progress":
      "border-amber-200 bg-amber-50 text-amber-700",

    Completed:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

/* =========================================================
   METRIC CARD
========================================================= */

function MetricCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   TEXT FIELD
========================================================= */

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      />
    </label>
  );
}

/* =========================================================
   TEXT AREA
========================================================= */

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      />
    </label>
  );
}

/* =========================================================
   SELECT FIELD
========================================================= */

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
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

/* =========================================================
   BOOLEAN CHECK
========================================================= */

function BooleanCheck({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300"
      />

      <span className="text-sm font-medium leading-6 text-slate-700">
        {children}
      </span>
    </label>
  );
}

/* =========================================================
   CHECKLIST ITEM
========================================================= */

function ChecklistItem({
  complete,
  children,
}: {
  complete: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex min-w-0 items-center gap-3">
        {complete ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <XCircle className="h-5 w-5 shrink-0 text-amber-500" />
        )}

        <span className="text-sm font-medium text-slate-700">
          {children}
        </span>
      </div>

      <span
        className={`shrink-0 text-xs font-bold ${
          complete
            ? "text-emerald-600"
            : "text-amber-600"
        }`}
      >
        {complete ? "Complete" : "Pending"}
      </span>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function ClientCommunicationsPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = String(params.id ?? "1");

  const [completionStatus, setCompletionStatus] =
    useState<CompletionStatus>("Not Started");

  const [saved, setSaved] = useState(false);

  /* =======================================================
     ISA 265 — DEFICIENCIES
  ======================================================= */

  const [deficiencies, setDeficiencies] = useState<Deficiency[]>([
    {
      id: 1,
      reference: "DEF-001",
      financialStatementArea: "",
      classification: "Not a Deficiency",
      description: "",
      potentialEffect: "",
      managementResponse: "",
      auditorRecommendation: "",
      communicationStatus: "Not Communicated",
    },
  ]);

  /* =======================================================
     ISA 260 — GOVERNANCE
  ======================================================= */

  const [governanceMeetingDate, setGovernanceMeetingDate] =
    useState("");

  const [primaryGovernanceContact, setPrimaryGovernanceContact] =
    useState("");

  const [
    governanceCommunicationCompleted,
    setGovernanceCommunicationCompleted,
  ] = useState(false);

  const [governanceMatters, setGovernanceMatters] =
    useState<GovernanceMatter[]>([
      {
        id: 1,
        reference: "GOV-001",
        matterCommunicated: "",
        significance: "Routine",
        communicationMethod: "Meeting",
        recipient: "",
        communicationDate: "",
        responseOutcome: "",
        communicationStatus: "Not Communicated",
      },
    ]);

  /* =======================================================
     ISA 580 — REPRESENTATIONS
  ======================================================= */

  const [representations, setRepresentations] =
    useState<RepresentationItem[]>([
      {
        id: 1,
        reference: "REP-001",
        representation:
          "Completeness of information provided to the auditor",
        responsiblePerson: "",
        expectedDate: "",
        receivedDate: "",
        status: "Pending",
        comments: "",
      },

      {
        id: 2,
        reference: "REP-002",
        representation:
          "Management responsibility for the financial statements",
        responsiblePerson: "",
        expectedDate: "",
        receivedDate: "",
        status: "Pending",
        comments: "",
      },

      {
        id: 3,
        reference: "REP-003",
        representation:
          "Disclosure of all relevant matters and transactions",
        responsiblePerson: "",
        expectedDate: "",
        receivedDate: "",
        status: "Pending",
        comments: "",
      },
    ]);

  const [
    writtenRepresentationLetterDate,
    setWrittenRepresentationLetterDate,
  ] = useState("");

  const [representationStatus, setRepresentationStatus] =
    useState<RepresentationStatus>("Pending");

  const [
    writtenRepresentationConclusion,
    setWrittenRepresentationConclusion,
  ] = useState("");

  /* =======================================================
     MANAGEMENT COMMUNICATION
  ======================================================= */

  const [managementMeetingDate, setManagementMeetingDate] =
    useState("");

  const [primaryManagementContact, setPrimaryManagementContact] =
    useState("");

  const [
    managementCommunicationCompleted,
    setManagementCommunicationCompleted,
  ] = useState(false);

  const [communicationSummary, setCommunicationSummary] =
    useState("");

  /* =======================================================
     OUTSTANDING MATTERS
  ======================================================= */

  const [outstandingMatters, setOutstandingMatters] =
    useState("");

  /* =======================================================
     OVERALL CONCLUSION
  ======================================================= */

  const [auditorConclusion, setAuditorConclusion] =
    useState("");

  /* =======================================================
     DERIVED VALUES
  ======================================================= */

  const applicableDeficiencies = useMemo(
    () =>
      deficiencies.filter(
        (item) =>
          item.classification !== "Not a Deficiency"
      ),
    [deficiencies]
  );

  const significantDeficiencies = useMemo(
    () =>
      deficiencies.filter(
        (item) =>
          item.classification === "Significant Deficiency"
      ),
    [deficiencies]
  );

  const communicatedDeficiencies = useMemo(
    () =>
      applicableDeficiencies.filter(
        (item) =>
          item.communicationStatus === "Communicated"
      ),
    [applicableDeficiencies]
  );

  const communicatedGovernanceMatters = useMemo(
    () =>
      governanceMatters.filter(
        (item) =>
          item.communicationStatus === "Communicated"
      ),
    [governanceMatters]
  );

  const receivedRepresentations = useMemo(
    () =>
      representations.filter(
        (item) => item.status === "Received"
      ),
    [representations]
  );

  const exceptionRepresentations = useMemo(
    () =>
      representations.filter(
        (item) => item.status === "Exception"
      ),
    [representations]
  );

  /* =======================================================
     READINESS
  ======================================================= */

  const deficienciesReady =
    applicableDeficiencies.length === 0 ||
    applicableDeficiencies.every(
      (item) =>
        item.communicationStatus === "Communicated"
    );

  const significantDeficienciesReady =
    significantDeficiencies.length === 0 ||
    significantDeficiencies.every(
      (item) =>
        item.communicationStatus === "Communicated"
    );

  const governanceReady =
    governanceCommunicationCompleted &&
    governanceMatters.every(
      (item) =>
        item.communicationStatus === "Communicated"
    );

  const representationsReady =
    representations.length > 0 &&
    representations.every(
      (item) => item.status === "Received"
    );

  const managementReady =
    managementCommunicationCompleted;

  const outstandingMattersReady = useMemo(() => {
    const value = outstandingMatters
      .trim()
      .toLowerCase();

    if (!value) {
      return false;
    }

    const resolvedPhrases = [
      "none",
      "no outstanding matters",
      "no outstanding communication matters",
      "none outstanding",
      "all matters resolved",
      "all outstanding matters resolved",
      "resolved",
      "cleared",
      "all matters cleared",
    ];

    return resolvedPhrases.some((phrase) =>
      value.includes(phrase)
    );
  }, [outstandingMatters]);

  const conclusionReady =
    auditorConclusion.trim().length > 0;

  const communicationReady =
    deficienciesReady &&
    significantDeficienciesReady &&
    managementReady &&
    governanceReady &&
    representationsReady &&
    outstandingMattersReady &&
    conclusionReady;

  /* =======================================================
     OPEN MATTERS
  ======================================================= */

  const openMattersCount =
    deficiencies.filter(
      (item) =>
        item.classification !== "Not a Deficiency" &&
        item.communicationStatus !== "Communicated"
    ).length +
    governanceMatters.filter(
      (item) =>
        item.communicationStatus !== "Communicated"
    ).length +
    representations.filter(
      (item) => item.status !== "Received"
    ).length;

  /* =======================================================
     UPDATE DEFICIENCY
  ======================================================= */

  const updateDeficiency = (
    id: number,
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

    if (completionStatus === "Completed") {
      setCompletionStatus("In Progress");
    }
  };

  const addDeficiency = () => {
    const nextId =
      deficiencies.length > 0
        ? Math.max(
            ...deficiencies.map(
              (item) => item.id
            )
          ) + 1
        : 1;

    setDeficiencies((current) => [
      ...current,
      {
        id: nextId,
        reference: `DEF-${String(nextId).padStart(
          3,
          "0"
        )}`,
        financialStatementArea: "",
        classification: "Not a Deficiency",
        description: "",
        potentialEffect: "",
        managementResponse: "",
        auditorRecommendation: "",
        communicationStatus: "Not Communicated",
      },
    ]);

    setSaved(false);
  };

  const removeDeficiency = (id: number) => {
    setDeficiencies((current) =>
      current.filter((item) => item.id !== id)
    );

    setSaved(false);
  };

  /* =======================================================
     UPDATE GOVERNANCE MATTER
  ======================================================= */

  const updateGovernanceMatter = (
    id: number,
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

    if (completionStatus === "Completed") {
      setCompletionStatus("In Progress");
    }
  };

  const addGovernanceMatter = () => {
    const nextId =
      governanceMatters.length > 0
        ? Math.max(
            ...governanceMatters.map(
              (item) => item.id
            )
          ) + 1
        : 1;

    setGovernanceMatters((current) => [
      ...current,
      {
        id: nextId,
        reference: `GOV-${String(nextId).padStart(
          3,
          "0"
        )}`,
        matterCommunicated: "",
        significance: "Routine",
        communicationMethod: "Meeting",
        recipient: "",
        communicationDate: "",
        responseOutcome: "",
        communicationStatus: "Not Communicated",
      },
    ]);

    setSaved(false);
  };

  const removeGovernanceMatter = (id: number) => {
    setGovernanceMatters((current) =>
      current.filter((item) => item.id !== id)
    );

    setSaved(false);
  };

  /* =======================================================
     UPDATE REPRESENTATION
  ======================================================= */

  const updateRepresentation = (
    id: number,
    field: keyof RepresentationItem,
    value: string
  ) => {
    setRepresentations((current) =>
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

    if (completionStatus === "Completed") {
      setCompletionStatus("In Progress");
    }
  };

  const addRepresentation = () => {
    const nextId =
      representations.length > 0
        ? Math.max(
            ...representations.map(
              (item) => item.id
            )
          ) + 1
        : 1;

    setRepresentations((current) => [
      ...current,
      {
        id: nextId,
        reference: `REP-${String(nextId).padStart(
          3,
          "0"
        )}`,
        representation: "",
        responsiblePerson: "",
        expectedDate: "",
        receivedDate: "",
        status: "Pending",
        comments: "",
      },
    ]);

    setSaved(false);
  };

  const removeRepresentation = (id: number) => {
    setRepresentations((current) =>
      current.filter((item) => item.id !== id)
    );

    setSaved(false);
  };

  /* =======================================================
     SAVE
  ======================================================= */

  const handleSave = () => {
    const workpaperData = {
      engagementId,

      completionStatus,

      deficiencies,

      governance: {
        governanceMeetingDate,
        primaryGovernanceContact,
        governanceCommunicationCompleted,
        governanceMatters,
      },

      representations: {
        writtenRepresentationLetterDate,
        representationStatus,
        representations,
        writtenRepresentationConclusion,
      },

      management: {
        managementMeetingDate,
        primaryManagementContact,
        managementCommunicationCompleted,
        communicationSummary,
      },

      outstandingMatters,

      auditorConclusion,

      savedAt: new Date().toISOString(),
    };

    console.log(
      "4.5 Client Communications Workpaper:",
      workpaperData
    );

    setSaved(true);

    if (completionStatus === "Not Started") {
      setCompletionStatus("In Progress");
    }

    window.alert(
      "Client Communications workpaper saved."
    );
  };

  /* =======================================================
     COMPLETE
  ======================================================= */

  const handleComplete = () => {
    if (!communicationReady) {
      const missing: string[] = [];

      if (!deficienciesReady) {
        missing.push(
          "Internal control deficiencies must be evaluated and communicated."
        );
      }

      if (!significantDeficienciesReady) {
        missing.push(
          "Significant deficiencies must be communicated."
        );
      }

      if (!managementReady) {
        missing.push(
          "Management communication must be completed."
        );
      }

      if (!governanceReady) {
        missing.push(
          "Communication with those charged with governance must be completed."
        );
      }

      if (!representationsReady) {
        missing.push(
          "All required written representations must be received."
        );
      }

      if (!outstandingMattersReady) {
        missing.push(
          "Outstanding communication matters must be cleared or documented as none outstanding."
        );
      }

      if (!conclusionReady) {
        missing.push(
          "The overall auditor communication conclusion must be documented."
        );
      }

      window.alert(
        `4.5 cannot be completed yet.\n\n${missing
          .map(
            (item, index) =>
              `${index + 1}. ${item}`
          )
          .join("\n")}`
      );

      return;
    }

    setCompletionStatus("Completed");
    setSaved(true);

    window.alert(
      "4.5 Client Communications has been marked as completed."
    );
  };

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const handleBack = () => {
    router.push(
      `/engagements/${engagementId}/conclusion-reporting`
    );
  };

  /*
   * IMPORTANT:
   * 4.5 now continues directly to 4.6 Documentation Archive.
   *
   * The button is enabled when all checklist requirements
   * are complete, even if the status badge still says
   * "In Progress".
   */

  const handleNext = () => {
    if (!communicationReady) {
      window.alert(
        "Please complete all required 4.5 Client Communications requirements before continuing to 4.6."
      );

      return;
    }

    setCompletionStatus("Completed");

    router.push(
      `/engagements/${engagementId}/conclusion-reporting/documentation-archive`
    );
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <AppLayout>
      <main className="min-w-0 flex-1 bg-slate-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">

                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                    4.5
                  </span>

                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    ISA 265
                  </span>

                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    ISA 260
                  </span>

                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    ISA 580
                  </span>

                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    Engagement: {engagementId}
                  </span>

                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Client Communications
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Document communication of internal control
                  deficiencies, matters with those charged with
                  governance, and written representations obtained
                  from management.
                </p>

                <div className="mt-4">
                  <StatusBadge
                    status={completionStatus}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">

                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Phase 4 Overview
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Save className="h-4 w-4" />

                  {saved
                    ? "Saved"
                    : "Save Workpaper"}
                </button>

                <button
                  type="button"
                  onClick={handleComplete}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                    communicationReady
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark Completed
                </button>

              </div>
            </div>
          </div>

          {/* =================================================
              METRICS
          ================================================= */}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

            <MetricCard
              title="Control Deficiencies"
              value={applicableDeficiencies.length}
              description={
                significantDeficiencies.length > 0
                  ? `${significantDeficiencies.length} significant`
                  : "No significant deficiencies"
              }
              icon={
                <ShieldAlert className="h-5 w-5" />
              }
            />

            <MetricCard
              title="Deficiencies Communicated"
              value={`${communicatedDeficiencies.length}/${applicableDeficiencies.length}`}
              description="Communication addressed"
              icon={
                <CheckCircle2 className="h-5 w-5" />
              }
            />

            <MetricCard
              title="Governance Matters"
              value={governanceMatters.length}
              description={`${communicatedGovernanceMatters.length} communicated`}
              icon={
                <Users className="h-5 w-5" />
              }
            />

            <MetricCard
              title="Representations Received"
              value={`${receivedRepresentations.length}/${representations.length}`}
              description={
                exceptionRepresentations.length > 0
                  ? `${exceptionRepresentations.length} exception(s)`
                  : "No exceptions recorded"
              }
              icon={
                <FileText className="h-5 w-5" />
              }
            />

            <MetricCard
              title="Open Communications"
              value={openMattersCount}
              description={
                openMattersCount === 0
                  ? "No open items"
                  : "Items require follow-up"
              }
              icon={
                <ShieldAlert className="h-5 w-5" />
              }
            />

          </div>

          <div className="space-y-6">

            {/* =================================================
                1. ISA 265
            ================================================= */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <SectionHeader
                number="1"
                title="ISA 265 — Internal Control Deficiencies"
                subtitle="Document identified deficiencies in internal control, their potential effects, classification, management response, recommendations, and communication status."
                icon={
                  <ShieldAlert className="h-5 w-5" />
                }
              />

              <div className="space-y-5 p-5 sm:p-6">

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                  <p className="text-sm font-bold text-slate-900">
                    Deficiency communication
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Deficiencies that meet the applicable criteria
                    should be communicated to management and, where
                    required, those charged with governance. The
                    classification should be supported by the
                    auditor&apos;s professional judgment and engagement
                    evidence.
                  </p>

                </div>

                {deficiencies.map((deficiency) => (

                  <div
                    key={deficiency.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >

                    <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">

                      <div className="flex flex-wrap items-center gap-2">

                        <span className="font-bold text-slate-900">
                          {deficiency.reference}
                        </span>

                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          {deficiency.classification}
                        </span>

                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          {deficiency.communicationStatus}
                        </span>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeDeficiency(
                            deficiency.id
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>

                    </div>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

                      <TextField
                        label="Financial Statement / Control Area"
                        value={
                          deficiency.financialStatementArea
                        }
                        onChange={(value) =>
                          updateDeficiency(
                            deficiency.id,
                            "financialStatementArea",
                            value
                          )
                        }
                        placeholder="e.g. Revenue, Payroll, IT access controls"
                      />

                      <SelectField
                        label="Classification"
                        value={
                          deficiency.classification
                        }
                        onChange={(value) =>
                          updateDeficiency(
                            deficiency.id,
                            "classification",
                            value
                          )
                        }
                        options={[
                          "Not a Deficiency",
                          "Deficiency",
                          "Significant Deficiency",
                        ]}
                      />

                      <div className="lg:col-span-2">

                        <TextAreaField
                          label="Description of Deficiency"
                          value={
                            deficiency.description
                          }
                          onChange={(value) =>
                            updateDeficiency(
                              deficiency.id,
                              "description",
                              value
                            )
                          }
                          placeholder="Describe the control deficiency identified..."
                        />

                      </div>

                      <TextAreaField
                        label="Potential Effect"
                        value={
                          deficiency.potentialEffect
                        }
                        onChange={(value) =>
                          updateDeficiency(
                            deficiency.id,
                            "potentialEffect",
                            value
                          )
                        }
                        placeholder="Describe the potential financial reporting or operational effect..."
                      />

                      <TextAreaField
                        label="Management Response"
                        value={
                          deficiency.managementResponse
                        }
                        onChange={(value) =>
                          updateDeficiency(
                            deficiency.id,
                            "managementResponse",
                            value
                          )
                        }
                        placeholder="Document management's response..."
                      />

                      <TextAreaField
                        label="Auditor Recommendation"
                        value={
                          deficiency.auditorRecommendation
                        }
                        onChange={(value) =>
                          updateDeficiency(
                            deficiency.id,
                            "auditorRecommendation",
                            value
                          )
                        }
                        placeholder="Document the auditor's recommendation..."
                      />

                      <SelectField
                        label="Communication Status"
                        value={
                          deficiency.communicationStatus
                        }
                        onChange={(value) =>
                          updateDeficiency(
                            deficiency.id,
                            "communicationStatus",
                            value
                          )
                        }
                        options={[
                          "Not Communicated",
                          "Drafted",
                          "Communicated",
                        ]}
                      />

                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addDeficiency}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                  Add Deficiency
                </button>

              </div>
            </section>

            {/* =================================================
                2. ISA 260
            ================================================= */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <SectionHeader
                number="2"
                title="ISA 260 — Communication With Those Charged With Governance"
                subtitle="Document significant audit matters communicated to those charged with governance, including the communication method, recipient, date, response, and status."
                icon={
                  <Users className="h-5 w-5" />
                }
              />

              <div className="space-y-5 p-5 sm:p-6">

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                  <TextField
                    label="Governance Meeting Date"
                    type="date"
                    value={governanceMeetingDate}
                    onChange={(value) => {
                      setGovernanceMeetingDate(
                        value
                      );
                      setSaved(false);
                    }}
                  />

                  <TextField
                    label="Primary Governance Contact"
                    value={
                      primaryGovernanceContact
                    }
                    onChange={(value) => {
                      setPrimaryGovernanceContact(
                        value
                      );
                      setSaved(false);
                    }}
                    placeholder="Name / position"
                  />

                </div>

                <BooleanCheck
                  checked={
                    governanceCommunicationCompleted
                  }
                  onChange={(checked) => {
                    setGovernanceCommunicationCompleted(
                      checked
                    );
                    setSaved(false);
                  }}
                >
                  Required communication with those charged
                  with governance has been completed.
                </BooleanCheck>

                {governanceMatters.map((matter) => (

                  <div
                    key={matter.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >

                    <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">

                      <div className="flex flex-wrap items-center gap-2">

                        <span className="font-bold text-slate-900">
                          {matter.reference}
                        </span>

                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          {matter.communicationStatus}
                        </span>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeGovernanceMatter(
                            matter.id
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>

                    </div>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

                      <div className="lg:col-span-2">

                        <TextAreaField
                          label="Matter Communicated"
                          value={
                            matter.matterCommunicated
                          }
                          onChange={(value) =>
                            updateGovernanceMatter(
                              matter.id,
                              "matterCommunicated",
                              value
                            )
                          }
                          placeholder="Describe the matter communicated..."
                        />

                      </div>

                      <SelectField
                        label="Significance"
                        value={matter.significance}
                        onChange={(value) =>
                          updateGovernanceMatter(
                            matter.id,
                            "significance",
                            value
                          )
                        }
                        options={[
                          "Routine",
                          "Significant",
                          "Key Matter",
                        ]}
                      />

                      <SelectField
                        label="Communication Method"
                        value={
                          matter.communicationMethod
                        }
                        onChange={(value) =>
                          updateGovernanceMatter(
                            matter.id,
                            "communicationMethod",
                            value
                          )
                        }
                        options={[
                          "Meeting",
                          "Written",
                          "Meeting and Written",
                        ]}
                      />

                      <TextField
                        label="Recipient"
                        value={matter.recipient}
                        onChange={(value) =>
                          updateGovernanceMatter(
                            matter.id,
                            "recipient",
                            value
                          )
                        }
                        placeholder="Recipient name / role"
                      />

                      <TextField
                        label="Communication Date"
                        type="date"
                        value={
                          matter.communicationDate
                        }
                        onChange={(value) =>
                          updateGovernanceMatter(
                            matter.id,
                            "communicationDate",
                            value
                          )
                        }
                      />

                      <div className="lg:col-span-2">

                        <TextAreaField
                          label="Response / Outcome"
                          value={
                            matter.responseOutcome
                          }
                          onChange={(value) =>
                            updateGovernanceMatter(
                              matter.id,
                              "responseOutcome",
                              value
                            )
                          }
                          placeholder="Document the response or outcome..."
                        />

                      </div>

                      <SelectField
                        label="Communication Status"
                        value={
                          matter.communicationStatus
                        }
                        onChange={(value) =>
                          updateGovernanceMatter(
                            matter.id,
                            "communicationStatus",
                            value
                          )
                        }
                        options={[
                          "Not Communicated",
                          "Drafted",
                          "Communicated",
                        ]}
                      />

                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addGovernanceMatter}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                  Add Governance Matter
                </button>

              </div>
            </section>

            {/* =================================================
                3. ISA 580
            ================================================= */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <SectionHeader
                number="3"
                title="ISA 580 — Written Representations"
                subtitle="Track the written representations required from management and document receipt, exceptions, and the auditor's conclusion."
                icon={
                  <FileText className="h-5 w-5" />
                }
              />

              <div className="space-y-5 p-5 sm:p-6">

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                  <p className="text-sm font-bold text-slate-900">
                    Written representation letter
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Written representations should be obtained
                    from management with appropriate responsibility
                    for the financial statements and knowledge of the
                    matters covered by the representations.
                  </p>

                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">

                  <table className="min-w-[1100px] w-full border-collapse text-left">

                    <thead className="bg-slate-100">

                      <tr>

                        <th className="border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">
                          Ref
                        </th>

                        <th className="border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">
                          Representation
                        </th>

                        <th className="border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">
                          Responsible Person
                        </th>

                        <th className="border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">
                          Expected Date
                        </th>

                        <th className="border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">
                          Received Date
                        </th>

                        <th className="border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">
                          Status
                        </th>

                        <th className="border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">
                          Comments
                        </th>

                        <th className="border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">
                          Action
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {representations.map(
                        (item) => (

                          <tr
                            key={item.id}
                            className="align-top"
                          >

                            <td className="border-b border-slate-200 px-4 py-4">

                              <span className="font-bold text-slate-900">
                                {item.reference}
                              </span>

                            </td>

                            <td className="min-w-[260px] border-b border-slate-200 px-4 py-4">

                              <textarea
                                value={
                                  item.representation
                                }
                                onChange={(event) =>
                                  updateRepresentation(
                                    item.id,
                                    "representation",
                                    event.target.value
                                  )
                                }
                                rows={3}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                                placeholder="Required representation..."
                              />

                            </td>

                            <td className="min-w-[190px] border-b border-slate-200 px-4 py-4">

                              <input
                                value={
                                  item.responsiblePerson
                                }
                                onChange={(event) =>
                                  updateRepresentation(
                                    item.id,
                                    "responsiblePerson",
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                                placeholder="Responsible person"
                              />

                            </td>

                            <td className="min-w-[150px] border-b border-slate-200 px-4 py-4">

                              <input
                                type="date"
                                value={
                                  item.expectedDate
                                }
                                onChange={(event) =>
                                  updateRepresentation(
                                    item.id,
                                    "expectedDate",
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                              />

                            </td>

                            <td className="min-w-[150px] border-b border-slate-200 px-4 py-4">

                              <input
                                type="date"
                                value={
                                  item.receivedDate
                                }
                                onChange={(event) =>
                                  updateRepresentation(
                                    item.id,
                                    "receivedDate",
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                              />

                            </td>

                            <td className="min-w-[150px] border-b border-slate-200 px-4 py-4">

                              <select
                                value={item.status}
                                onChange={(event) =>
                                  updateRepresentation(
                                    item.id,
                                    "status",
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                              >

                                <option value="Pending">
                                  Pending
                                </option>

                                <option value="Received">
                                  Received
                                </option>

                                <option value="Exception">
                                  Exception
                                </option>

                              </select>

                            </td>

                            <td className="min-w-[220px] border-b border-slate-200 px-4 py-4">

                              <textarea
                                value={item.comments}
                                onChange={(event) =>
                                  updateRepresentation(
                                    item.id,
                                    "comments",
                                    event.target.value
                                  )
                                }
                                rows={3}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                                placeholder="Comments..."
                              />

                            </td>

                            <td className="border-b border-slate-200 px-4 py-4">

                              <button
                                type="button"
                                onClick={() =>
                                  removeRepresentation(
                                    item.id
                                  )
                                }
                                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </button>

                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

                <button
                  type="button"
                  onClick={addRepresentation}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                  Add Representation
                </button>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                  <TextField
                    label="Written Representation Letter Date"
                    type="date"
                    value={
                      writtenRepresentationLetterDate
                    }
                    onChange={(value) => {
                      setWrittenRepresentationLetterDate(
                        value
                      );
                      setSaved(false);
                    }}
                  />

                  <SelectField
                    label="Representation Status"
                    value={representationStatus}
                    onChange={(value) => {
                      setRepresentationStatus(
                        value as RepresentationStatus
                      );
                      setSaved(false);
                    }}
                    options={[
                      "Pending",
                      "Received",
                      "Exception",
                    ]}
                  />

                </div>

                {!representationsReady && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                    One or more representations remain
                    outstanding.
                  </div>
                )}

                <TextAreaField
                  label="Written Representation Conclusion"
                  value={
                    writtenRepresentationConclusion
                  }
                  onChange={(value) => {
                    setWrittenRepresentationConclusion(
                      value
                    );
                    setSaved(false);
                  }}
                  placeholder="Document the auditor's conclusion regarding the written representations obtained..."
                  rows={5}
                />

              </div>
            </section>

            {/* =================================================
                4. MANAGEMENT
            ================================================= */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <SectionHeader
                number="4"
                title="Management Communication"
                subtitle="Document the overall communication with management, including significant findings, deficiencies, unresolved matters, and management responses."
                icon={
                  <Users className="h-5 w-5" />
                }
              />

              <div className="space-y-5 p-5 sm:p-6">

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                  <TextField
                    label="Management Meeting Date"
                    type="date"
                    value={managementMeetingDate}
                    onChange={(value) => {
                      setManagementMeetingDate(
                        value
                      );
                      setSaved(false);
                    }}
                  />

                  <TextField
                    label="Primary Management Contact"
                    value={
                      primaryManagementContact
                    }
                    onChange={(value) => {
                      setPrimaryManagementContact(
                        value
                      );
                      setSaved(false);
                    }}
                    placeholder="Name / position"
                  />

                </div>

                <BooleanCheck
                  checked={
                    managementCommunicationCompleted
                  }
                  onChange={(checked) => {
                    setManagementCommunicationCompleted(
                      checked
                    );
                    setSaved(false);
                  }}
                >
                  Required management communications have
                  been completed.
                </BooleanCheck>

                <TextAreaField
                  label="Communication Summary"
                  value={communicationSummary}
                  onChange={(value) => {
                    setCommunicationSummary(value);
                    setSaved(false);
                  }}
                  placeholder="Summarize significant findings, deficiencies, unresolved matters, and management responses..."
                  rows={6}
                />

              </div>
            </section>

            {/* =================================================
                5. OUTSTANDING
            ================================================= */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <SectionHeader
                number="5"
                title="Outstanding Communication Matters"
                subtitle="Identify matters that remain unresolved or require follow-up before the auditor's report is finalized."
                icon={
                  <ShieldAlert className="h-5 w-5" />
                }
              />

              <div className="p-5 sm:p-6">

                <TextAreaField
                  label="Outstanding Communication Matters"
                  value={outstandingMatters}
                  onChange={(value) => {
                    setOutstandingMatters(value);
                    setSaved(false);
                  }}
                  placeholder="Document outstanding communication matters. If there are none, state 'No outstanding communication matters.'"
                  rows={6}
                />

              </div>
            </section>

            {/* =================================================
                6. CONCLUSION
            ================================================= */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <SectionHeader
                number="6"
                title="Overall Auditor Communication Conclusion"
                subtitle="Document the auditor's final conclusion regarding client and governance communications."
                icon={
                  <CheckCircle2 className="h-5 w-5" />
                }
              />

              <div className="space-y-5 p-5 sm:p-6">

                {!communicationReady && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">

                    <p className="text-sm font-bold text-amber-900">
                      Client communication workpaper still
                      has outstanding requirements.
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      Complete required communications, clear
                      open communication items, obtain written
                      representations, and document the overall
                      conclusion.
                    </p>

                  </div>
                )}

                {communicationReady && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">

                    <p className="text-sm font-bold text-emerald-900">
                      Client communication requirements have
                      been addressed.
                    </p>

                    <p className="mt-1 text-sm leading-6 text-emerald-800">
                      The workpaper is ready for completion and
                      continuation to 4.6 Documentation Archive.
                    </p>

                  </div>
                )}

                <TextAreaField
                  label="Auditor's Overall Conclusion"
                  value={auditorConclusion}
                  onChange={(value) => {
                    setAuditorConclusion(value);
                    setSaved(false);
                  }}
                  placeholder="Document the auditor's overall conclusion regarding client, management and governance communications..."
                  rows={7}
                />

              </div>
            </section>

            {/* =================================================
                7. CHECKLIST
            ================================================= */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <SectionHeader
                number="7"
                title="Final Completion Checklist"
                subtitle="Confirm that the principal client communication requirements have been addressed."
                icon={
                  <CheckCircle2 className="h-5 w-5" />
                }
              />

              <div className="space-y-3 p-5 sm:p-6">

                <ChecklistItem
                  complete={deficienciesReady}
                >
                  Internal control deficiencies evaluated
                </ChecklistItem>

                <ChecklistItem
                  complete={
                    significantDeficienciesReady
                  }
                >
                  Significant deficiencies communicated
                </ChecklistItem>

                <ChecklistItem
                  complete={managementReady}
                >
                  Communication with management completed
                </ChecklistItem>

                <ChecklistItem
                  complete={governanceReady}
                >
                  Communication with governance completed
                </ChecklistItem>

                <ChecklistItem
                  complete={representationsReady}
                >
                  Written representations received
                </ChecklistItem>

                <ChecklistItem
                  complete={
                    outstandingMattersReady
                  }
                >
                  Open communication matters cleared
                </ChecklistItem>

                <ChecklistItem
                  complete={conclusionReady}
                >
                  Overall conclusion documented
                </ChecklistItem>

              </div>
            </section>

            {/* =================================================
                FOOTER
            ================================================= */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                <div>

                  <p className="text-sm font-bold text-slate-900">
                    4.5 Client Communications
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    Complete this workpaper before proceeding
                    to 4.6 Documentation Archive.
                  </p>

                </div>

                <div className="flex flex-col gap-2 sm:flex-row">

                  {/* SAVE */}

                  <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>

                  {/* CONTINUE TO 4.6 */}

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!communicationReady}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition ${
                      communicationReady
                        ? "bg-slate-900 hover:bg-slate-800"
                        : "cursor-not-allowed bg-slate-300"
                    }`}
                  >
                    Continue to 4.6

                    <ArrowLeft className="h-4 w-4 rotate-180" />
                  </button>

                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </AppLayout>
  );
}