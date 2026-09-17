"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "../../../../../components/layout/AppLayout";
import {
  ArrowLeft,
  Archive,
  CheckCircle2,
  FileArchive,
  FileCheck2,
  FileText,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
} from "lucide-react";

type CompletionStatus = "Not Started" | "In Progress" | "Completed";

type ReviewStatus =
  | "Not Started"
  | "In Progress"
  | "Completed"
  | "Not Applicable";

type MatterStatus = "Open" | "Resolved" | "Accepted" | "Not Applicable";

type AssemblyStatus =
  | "Not Started"
  | "In Progress"
  | "Completed"
  | "Not Applicable";

type ArchiveStatus =
  | "Not Ready"
  | "Ready for Assembly"
  | "Assembled"
  | "Archived";

type DocumentationArea = {
  id: number;
  reference: string;
  title: string;
  description: string;
  reviewStatus: ReviewStatus;
  reviewer: string;
  reviewDate: string;
  reviewNotes: string;
};

type OutstandingMatter = {
  id: number;
  reference: string;
  matter: string;
  responsiblePerson: string;
  dueDate: string;
  status: MatterStatus;
  resolution: string;
};

type AssemblySection = {
  id: number;
  reference: string;
  title: string;
  description: string;
  assemblyStatus: AssemblyStatus;
  fileLocation: string;
  assemblyNotes: string;
};

const initialDocumentationAreas: DocumentationArea[] = [
  {
    id: 1,
    reference: "01",
    title: "Audit Planning",
    description:
      "Planning documentation supports the audit strategy, scope, risk assessment, materiality and planned responses.",
    reviewStatus: "Not Started",
    reviewer: "",
    reviewDate: "",
    reviewNotes: "",
  },
  {
    id: 2,
    reference: "02",
    title: "Risk Assessment",
    description:
      "Risk assessment documentation identifies and assesses risks of material misstatement and links them to audit responses.",
    reviewStatus: "Not Started",
    reviewer: "",
    reviewDate: "",
    reviewNotes: "",
  },
  {
    id: 3,
    reference: "03",
    title: "Internal Controls",
    description:
      "Documentation supports the understanding, evaluation and testing of relevant internal controls.",
    reviewStatus: "Not Started",
    reviewer: "",
    reviewDate: "",
    reviewNotes: "",
  },
  {
    id: 4,
    reference: "04",
    title: "Substantive Procedures",
    description:
      "Audit procedures, evidence obtained, results and conclusions are sufficiently documented.",
    reviewStatus: "Not Started",
    reviewer: "",
    reviewDate: "",
    reviewNotes: "",
  },
  {
    id: 5,
    reference: "05",
    title: "Significant Audit Areas",
    description:
      "Significant risks, significant transactions, estimates and other significant matters have adequate supporting documentation.",
    reviewStatus: "Not Started",
    reviewer: "",
    reviewDate: "",
    reviewNotes: "",
  },
  {
    id: 6,
    reference: "06",
    title: "Misstatements",
    description:
      "Identified misstatements, management responses and final evaluation are completely documented.",
    reviewStatus: "Not Started",
    reviewer: "",
    reviewDate: "",
    reviewNotes: "",
  },
  {
    id: 7,
    reference: "07",
    title: "Going Concern",
    description:
      "Going concern assessment and related audit evidence and conclusions are documented.",
    reviewStatus: "Not Started",
    reviewer: "",
    reviewDate: "",
    reviewNotes: "",
  },
  {
    id: 8,
    reference: "08",
    title: "Financial Statement Review",
    description:
      "Final financial statement procedures, disclosures and analytical review are documented.",
    reviewStatus: "Not Started",
    reviewer: "",
    reviewDate: "",
    reviewNotes: "",
  },
  {
    id: 9,
    reference: "09",
    title: "Audit Opinion",
    description:
      "The basis for the audit opinion and final auditor's report are supported by the audit file.",
    reviewStatus: "Not Started",
    reviewer: "",
    reviewDate: "",
    reviewNotes: "",
  },
  {
    id: 10,
    reference: "10",
    title: "Client Communications",
    description:
      "Required communications with management and those charged with governance are documented.",
    reviewStatus: "Not Started",
    reviewer: "",
    reviewDate: "",
    reviewNotes: "",
  },
];

const initialOutstandingMatters: OutstandingMatter[] = [
  {
    id: 1,
    reference: "OUT-001",
    matter: "",
    responsiblePerson: "",
    dueDate: "",
    status: "Open",
    resolution: "",
  },
];

const initialAssemblySections: AssemblySection[] = [
  {
    id: 1,
    reference: "01",
    title: "Permanent File",
    description:
      "Standing information relevant to the continuing relationship and future audits.",
    assemblyStatus: "Not Started",
    fileLocation: "",
    assemblyNotes: "",
  },
  {
    id: 2,
    reference: "02",
    title: "Current Audit File",
    description:
      "Current-year audit planning, risk assessment, procedures, evidence and conclusions.",
    assemblyStatus: "Not Started",
    fileLocation: "",
    assemblyNotes: "",
  },
  {
    id: 3,
    reference: "03",
    title: "Financial Statements",
    description:
      "Final financial statements and supporting final review documentation.",
    assemblyStatus: "Not Started",
    fileLocation: "",
    assemblyNotes: "",
  },
  {
    id: 4,
    reference: "04",
    title: "Auditor's Report",
    description:
      "Final approved and issued auditor's report and related reporting documentation.",
    assemblyStatus: "Not Started",
    fileLocation: "",
    assemblyNotes: "",
  },
  {
    id: 5,
    reference: "05",
    title: "Client Communications",
    description:
      "Final communications with management and those charged with governance.",
    assemblyStatus: "Not Started",
    fileLocation: "",
    assemblyNotes: "",
  },
];

type ChecklistItemProps = {
  complete: boolean;
  label: string;
};

function ChecklistItem({ complete, label }: ChecklistItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      {complete ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
      ) : (
        <ShieldAlert className="h-5 w-5 shrink-0 text-amber-500" />
      )}

      <span className="min-w-0 flex-1 text-sm font-medium text-slate-700">
        {label}
      </span>

      <span
        className={`text-xs font-semibold ${
          complete ? "text-emerald-600" : "text-amber-600"
        }`}
      >
        {complete ? "Complete" : "Pending"}
      </span>
    </div>
  );
}

export default function DocumentationArchivePage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = String(params.id);

  const [completionStatus, setCompletionStatus] =
    useState<CompletionStatus>("Not Started");

  const [saved, setSaved] = useState(false);

  const [documentationAreas, setDocumentationAreas] = useState<
    DocumentationArea[]
  >(initialDocumentationAreas);

  const [outstandingMatters, setOutstandingMatters] = useState<
    OutstandingMatter[]
  >(initialOutstandingMatters);

  const [assemblySections, setAssemblySections] = useState<AssemblySection[]>(
    initialAssemblySections
  );

  const [subsequentEventExists, setSubsequentEventExists] =
    useState<boolean>(false);

  const [subsequentEventDescription, setSubsequentEventDescription] =
    useState("");

  const [subsequentEventAction, setSubsequentEventAction] = useState("");

  const [
    finalDocumentationReviewCompleted,
    setFinalDocumentationReviewCompleted,
  ] = useState(false);

  const [reviewNotesCleared, setReviewNotesCleared] = useState(false);

  const [finalFileAssembled, setFinalFileAssembled] = useState(false);

  const [archiveIntegrityConfirmed, setArchiveIntegrityConfirmed] =
    useState(false);

  const [retentionRequirementsConfirmed, setRetentionRequirementsConfirmed] =
    useState(false);

  const [accessRestrictionsConfirmed, setAccessRestrictionsConfirmed] =
    useState(false);

  const [finalFileApproved, setFinalFileApproved] = useState(false);

  const [engagementPartner, setEngagementPartner] = useState("");

  const [finalFileReviewer, setFinalFileReviewer] = useState("");

  const [documentationCompletionDate, setDocumentationCompletionDate] =
    useState("");

  const [finalReviewDate, setFinalReviewDate] = useState("");

  const [finalDocumentationConclusion, setFinalDocumentationConclusion] =
    useState("");

  const [archiveStatus, setArchiveStatus] =
    useState<ArchiveStatus>("Not Ready");

  const [archiveReference, setArchiveReference] = useState("");

  const [archiveDate, setArchiveDate] = useState("");

  const [retentionPeriod, setRetentionPeriod] = useState("");

  const [archiveIntegrityConfirmed2, setArchiveIntegrityConfirmed2] =
    useState(false);

  const [retentionConfirmed2, setRetentionConfirmed2] = useState(false);

  const [accessConfirmed2, setAccessConfirmed2] = useState(false);

  const [approvalConfirmed2, setApprovalConfirmed2] = useState(false);

  /* =========================================================
     DERIVED VALUES
  ========================================================= */

  const completedDocumentationAreas = useMemo(() => {
    return documentationAreas.filter(
      (area) =>
        area.reviewStatus === "Completed" ||
        area.reviewStatus === "Not Applicable"
    ).length;
  }, [documentationAreas]);

  const documentationProgress = useMemo(() => {
    return Math.round(
      (completedDocumentationAreas / documentationAreas.length) * 100
    );
  }, [completedDocumentationAreas, documentationAreas.length]);

  const openMattersCount = useMemo(() => {
    return outstandingMatters.filter((matter) => matter.status === "Open")
      .length;
  }, [outstandingMatters]);

  const resolvedMattersCount = useMemo(() => {
    return outstandingMatters.filter(
      (matter) =>
        matter.status === "Resolved" ||
        matter.status === "Accepted" ||
        matter.status === "Not Applicable"
    ).length;
  }, [outstandingMatters]);

  const completedAssemblySections = useMemo(() => {
    return assemblySections.filter(
      (section) =>
        section.assemblyStatus === "Completed" ||
        section.assemblyStatus === "Not Applicable"
    ).length;
  }, [assemblySections]);

  const assemblyProgress = useMemo(() => {
    return Math.round(
      (completedAssemblySections / assemblySections.length) * 100
    );
  }, [completedAssemblySections, assemblySections.length]);

  const allDocumentationAreasComplete =
    documentationAreas.length > 0 &&
    documentationAreas.every(
      (area) =>
        area.reviewStatus === "Completed" ||
        area.reviewStatus === "Not Applicable"
    );

  const allOutstandingMattersCleared =
    outstandingMatters.length === 0 ||
    outstandingMatters.every(
      (matter) =>
        matter.status === "Resolved" ||
        matter.status === "Accepted" ||
        matter.status === "Not Applicable"
    );

  const subsequentEventComplete =
    !subsequentEventExists ||
    (subsequentEventDescription.trim() !== "" &&
      subsequentEventAction.trim() !== "");

  const allAssemblyComplete =
    assemblySections.length > 0 &&
    assemblySections.every(
      (section) =>
        section.assemblyStatus === "Completed" ||
        section.assemblyStatus === "Not Applicable"
    );

  /* =========================================================
     FINAL CHECKLIST
     
     IMPORTANT:
     This checklist is now the SINGLE navigation gate
     for moving from 4.6 to 4.7.
  ========================================================= */

  const checklist = [
    {
      label: "Final audit documentation reviewed",
      complete: finalDocumentationReviewCompleted,
    },
    {
      label: "All documentation areas completed",
      complete: allDocumentationAreasComplete,
    },
    {
      label: "Outstanding matters resolved or accepted",
      complete: allOutstandingMattersCleared,
    },
    {
      label: "Review notes cleared",
      complete: reviewNotesCleared,
    },
    {
      label: "Audit file assembled",
      complete: finalFileAssembled && allAssemblyComplete,
    },
    {
      label: "Permanent and current files accounted for",
      complete:
        (assemblySections.find((section) => section.id === 1)
          ?.assemblyStatus === "Completed" ||
          assemblySections.find((section) => section.id === 1)
            ?.assemblyStatus === "Not Applicable") &&
        (assemblySections.find((section) => section.id === 2)
          ?.assemblyStatus === "Completed" ||
          assemblySections.find((section) => section.id === 2)
            ?.assemblyStatus === "Not Applicable"),
    },
    {
      label: "Final auditor's report included",
      complete:
        assemblySections.find((section) => section.id === 4)
          ?.assemblyStatus === "Completed" ||
        assemblySections.find((section) => section.id === 4)
          ?.assemblyStatus === "Not Applicable",
    },
    {
      label: "Retention requirements confirmed",
      complete: retentionRequirementsConfirmed && retentionConfirmed2,
    },
    {
      label: "Access restrictions confirmed",
      complete: accessRestrictionsConfirmed && accessConfirmed2,
    },
    {
      label: "Archive integrity confirmed",
      complete: archiveIntegrityConfirmed && archiveIntegrityConfirmed2,
    },
    {
      label: "Final file approval obtained",
      complete: finalFileApproved && approvalConfirmed2,
    },
    {
      label: "Final documentation conclusion recorded",
      complete: finalDocumentationConclusion.trim() !== "",
    },
  ];

  const completedChecklistItems = checklist.filter(
    (item) => item.complete
  ).length;

  /*
   * THIS IS THE IMPORTANT FIX.
   *
   * Continue to 4.7 is controlled ONLY by the
   * visible 12-item checklist.
   */
  const checklistComplete =
    completedChecklistItems === checklist.length;

  const allRequirementsComplete = checklistComplete;

  /* =========================================================
     UPDATE FUNCTIONS
  ========================================================= */

  const updateDocumentationArea = (
    id: number,
    field: keyof DocumentationArea,
    value: string | ReviewStatus
  ) => {
    setDocumentationAreas((current) =>
      current.map((area) =>
        area.id === id ? { ...area, [field]: value } : area
      )
    );

    setSaved(false);
  };

  const updateOutstandingMatter = (
    id: number,
    field: keyof OutstandingMatter,
    value: string | MatterStatus
  ) => {
    setOutstandingMatters((current) =>
      current.map((matter) =>
        matter.id === id ? { ...matter, [field]: value } : matter
      )
    );

    setSaved(false);
  };

  const updateAssemblySection = (
    id: number,
    field: keyof AssemblySection,
    value: string | AssemblyStatus
  ) => {
    setAssemblySections((current) =>
      current.map((section) =>
        section.id === id ? { ...section, [field]: value } : section
      )
    );

    setSaved(false);
  };

  /* =========================================================
     OUTSTANDING MATTERS
  ========================================================= */

  const addOutstandingMatter = () => {
    const nextNumber =
      outstandingMatters.length > 0
        ? Math.max(...outstandingMatters.map((item) => item.id)) + 1
        : 1;

    setOutstandingMatters((current) => [
      ...current,
      {
        id: nextNumber,
        reference: `OUT-${String(nextNumber).padStart(3, "0")}`,
        matter: "",
        responsiblePerson: "",
        dueDate: "",
        status: "Open",
        resolution: "",
      },
    ]);

    setSaved(false);
  };

  const removeOutstandingMatter = (id: number) => {
    setOutstandingMatters((current) =>
      current.filter((matter) => matter.id !== id)
    );

    setSaved(false);
  };

  /* =========================================================
     SAVE
  ========================================================= */

  const handleSave = () => {
    const workpaperData = {
      engagementId,
      completionStatus,
      documentationAreas,
      outstandingMatters,
      subsequentEventExists,
      subsequentEventDescription,
      subsequentEventAction,
      finalDocumentationReviewCompleted,
      reviewNotesCleared,
      finalFileAssembled,
      archiveIntegrityConfirmed,
      retentionRequirementsConfirmed,
      accessRestrictionsConfirmed,
      finalFileApproved,
      engagementPartner,
      finalFileReviewer,
      documentationCompletionDate,
      finalReviewDate,
      finalDocumentationConclusion,
      assemblySections,
      archiveStatus,
      archiveReference,
      archiveDate,
      retentionPeriod,
      archiveIntegrityConfirmed2,
      retentionConfirmed2,
      accessConfirmed2,
      approvalConfirmed2,
    };

    console.log("4.6 Documentation Archive Workpaper:", workpaperData);

    setSaved(true);

    setCompletionStatus((current) =>
      current === "Not Started" ? "In Progress" : current
    );
  };

  /* =========================================================
     MARK READY
  ========================================================= */

  const handleMarkReady = () => {
    if (!checklistComplete) {
      window.alert(
        `The 4.6 workpaper still has outstanding requirements. Current checklist: ${completedChecklistItems}/${checklist.length}.`
      );
      return;
    }

    setArchiveStatus("Archived");
    setCompletionStatus("Completed");
    setSaved(false);

    window.alert("4.6 Complete Documentation and Archive is ready.");
  };

  /* =========================================================
     COMPLETE & ARCHIVE
  ========================================================= */

  const handleCompleteAndArchive = () => {
    if (!checklistComplete) {
      window.alert(
        `Please complete all 4.6 requirements before completing and archiving the engagement. Current checklist: ${completedChecklistItems}/${checklist.length}.`
      );
      return;
    }

    setArchiveStatus("Archived");
    setCompletionStatus("Completed");

    window.alert(
      "4.6 Complete Documentation and Archive has been completed and archived."
    );
  };

  /* =========================================================
     NAVIGATION
  ========================================================= */

  const handleBack = () => {
    router.push(`/engagements/${engagementId}/conclusion-reporting`);
  };

  const handleNext = () => {
    /*
     * IMPORTANT:
     * The Continue button is unlocked when the visible
     * checklist reaches 12/12.
     */
    if (!checklistComplete) {
      window.alert(
        `Please complete all 4.6 requirements before continuing. Current checklist: ${completedChecklistItems}/${checklist.length}.`
      );
      return;
    }

    setCompletionStatus("Completed");

    router.push(
      `/engagements/${engagementId}/conclusion-reporting/quality-monitoring`
    );
  };

  return (
    <AppLayout>
      <main className="min-w-0 flex-1 bg-slate-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* =====================================================
              HEADER
          ===================================================== */}

          <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">
                      4.6
                    </span>

                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      ISA 230
                    </span>

                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      Documentation Archive
                    </span>

                    <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      Engagement: {engagementId}
                    </span>
                  </div>

                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Complete Documentation and Archive
                  </h1>

                  <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 sm:text-base">
                    Complete the audit documentation review, clear outstanding
                    matters, assemble the final audit file, document retention
                    requirements, and confirm that the audit file is ready for
                    archive.
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      archiveStatus === "Archived"
                        ? "bg-emerald-100 text-emerald-700"
                        : archiveStatus === "Assembled"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {archiveStatus === "Archived"
                      ? "Archive: Archived"
                      : `Archive: ${archiveStatus}`}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      completionStatus === "Completed"
                        ? "bg-emerald-100 text-emerald-700"
                        : completionStatus === "In Progress"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {completionStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Phase 4 Overview
              </button>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Save className="h-4 w-4" />
                  {saved ? "Saved" : "Save Workpaper"}
                </button>

                <button
                  type="button"
                  onClick={handleMarkReady}
                  disabled={!checklistComplete}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                    checklistComplete
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "cursor-not-allowed bg-slate-300"
                  }`}
                >
                  <FileCheck2 className="h-4 w-4" />
                  Mark Ready
                </button>

                <button
                  type="button"
                  onClick={handleCompleteAndArchive}
                  disabled={!checklistComplete}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                    checklistComplete
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "cursor-not-allowed bg-slate-300"
                  }`}
                >
                  <Archive className="h-4 w-4" />
                  Complete & Archive
                </button>
              </div>
            </div>
          </div>

          {/* =====================================================
              SUMMARY CARDS
          ===================================================== */}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Documentation
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {documentationProgress}%
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {completedDocumentationAreas}/10 areas completed
                  </p>
                </div>

                <FileText className="h-6 w-6 text-slate-400" />
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-900 transition-all"
                  style={{ width: `${documentationProgress}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Outstanding
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {openMattersCount}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Matter(s) require resolution
                  </p>
                </div>

                <ShieldAlert className="h-6 w-6 text-amber-500" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    File Assembly
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {assemblyProgress}%
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {completedAssemblySections}/5 sections complete
                  </p>
                </div>

                <FileArchive className="h-6 w-6 text-slate-400" />
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-900 transition-all"
                  style={{ width: `${assemblyProgress}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">
                Archive Status
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900">
                {archiveStatus}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {archiveStatus === "Archived"
                  ? "Final archive completed"
                  : "Requirements pending"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">
                Completion
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900">
                {completionStatus}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                ISA 230 completion status
              </p>
            </div>
          </div>

          {/* =====================================================
              SECTION 1
          ===================================================== */}

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                  1
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    ISA 230 — Final Documentation Review
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Review whether the audit documentation provides a
                    sufficient record of the basis for the auditor's report
                    and evidence that the audit was planned and performed in
                    accordance with applicable standards.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                  Documentation review principle
                </p>

                <p className="mt-2 text-sm leading-6 text-blue-900">
                  The final audit file should allow an experienced auditor,
                  having no previous connection with the engagement, to
                  understand the significant matters, procedures performed,
                  evidence obtained, conclusions reached, and significant
                  professional judgments made.
                </p>
              </div>

              <div className="space-y-4">
                {documentationAreas.map((area) => (
                  <div
                    key={area.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm">
                          {area.reference}
                        </span>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-slate-900">
                              {area.title}
                            </h3>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                area.reviewStatus === "Completed"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : area.reviewStatus === "In Progress"
                                  ? "bg-blue-100 text-blue-700"
                                  : area.reviewStatus === "Not Applicable"
                                  ? "bg-slate-200 text-slate-600"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {area.reviewStatus}
                            </span>
                          </div>

                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {area.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                          Review Status
                        </span>

                        <select
                          value={area.reviewStatus}
                          onChange={(e) =>
                            updateDocumentationArea(
                              area.id,
                              "reviewStatus",
                              e.target.value as ReviewStatus
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        >
                          <option value="Not Started">Not Started</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Not Applicable">
                            Not Applicable
                          </option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                          Reviewer
                        </span>

                        <input
                          type="text"
                          value={area.reviewer}
                          onChange={(e) =>
                            updateDocumentationArea(
                              area.id,
                              "reviewer",
                              e.target.value
                            )
                          }
                          placeholder="Enter reviewer"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                          Review Date
                        </span>

                        <input
                          type="date"
                          value={area.reviewDate}
                          onChange={(e) =>
                            updateDocumentationArea(
                              area.id,
                              "reviewDate",
                              e.target.value
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        />
                      </label>

                      <label className="block lg:col-span-2">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                          Review Notes
                        </span>

                        <textarea
                          value={area.reviewNotes}
                          onChange={(e) =>
                            updateDocumentationArea(
                              area.id,
                              "reviewNotes",
                              e.target.value
                            )
                          }
                          rows={3}
                          placeholder="Document final review observations, exceptions, or conclusion..."
                          className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* =====================================================
              SECTION 2
          ===================================================== */}

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                  2
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Outstanding Documentation and Review Matters
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Identify and track documentation gaps, review notes,
                    unresolved audit matters, or other items that must be
                    resolved before final file assembly.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <div className="mb-5 rounded-xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                  Outstanding matters
                </p>

                <p className="mt-2 text-sm leading-6 text-amber-900">
                  Open items should be resolved, appropriately documented, or
                  formally accepted before archive.
                </p>
              </div>

              <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Open
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {openMattersCount}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Resolved / Accepted
                  </p>

                  <p className="mt-1 text-2xl font-bold text-emerald-600">
                    {resolvedMattersCount}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Open Matters
                  </p>

                  <p className="mt-1 text-2xl font-bold text-amber-600">
                    {openMattersCount}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {outstandingMatters.map((matter) => (
                  <div
                    key={matter.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm">
                          {matter.reference}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            matter.status === "Open"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {matter.status}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeOutstandingMatter(matter.id)}
                        className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 sm:self-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <label className="block lg:col-span-2">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                          Outstanding Matter
                        </span>

                        <textarea
                          value={matter.matter}
                          onChange={(e) =>
                            updateOutstandingMatter(
                              matter.id,
                              "matter",
                              e.target.value
                            )
                          }
                          rows={3}
                          placeholder="Describe the documentation gap, review note or unresolved matter..."
                          className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                          Responsible Person
                        </span>

                        <input
                          type="text"
                          value={matter.responsiblePerson}
                          onChange={(e) =>
                            updateOutstandingMatter(
                              matter.id,
                              "responsiblePerson",
                              e.target.value
                            )
                          }
                          placeholder="Responsible person"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                          Due Date
                        </span>

                        <input
                          type="date"
                          value={matter.dueDate}
                          onChange={(e) =>
                            updateOutstandingMatter(
                              matter.id,
                              "dueDate",
                              e.target.value
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                          Status
                        </span>

                        <select
                          value={matter.status}
                          onChange={(e) =>
                            updateOutstandingMatter(
                              matter.id,
                              "status",
                              e.target.value as MatterStatus
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        >
                          <option value="Open">Open</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Accepted">Accepted</option>
                          <option value="Not Applicable">
                            Not Applicable
                          </option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                          Resolution / Final Action
                        </span>

                        <input
                          type="text"
                          value={matter.resolution}
                          onChange={(e) =>
                            updateOutstandingMatter(
                              matter.id,
                              "resolution",
                              e.target.value
                            )
                          }
                          placeholder="Describe resolution or final action"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addOutstandingMatter}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Add Outstanding Matter
              </button>
            </div>
          </section>

          {/* =====================================================
              SECTION 3
          ===================================================== */}

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                  3
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Subsequent Changes and Events After the Auditor's Report
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Document whether information or events came to the
                    auditor's attention after the auditor's report date that
                    require consideration or action.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={subsequentEventExists}
                  onChange={(e) => {
                    setSubsequentEventExists(e.target.checked);
                    setSaved(false);
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />

                <span className="text-sm font-medium leading-6 text-slate-700">
                  Information or an event came to the auditor's attention
                  after the auditor's report date that requires consideration.
                </span>
              </label>

              {subsequentEventExists && (
                <div className="mt-5 grid grid-cols-1 gap-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Event / Information Description
                    </span>

                    <textarea
                      value={subsequentEventDescription}
                      onChange={(e) => {
                        setSubsequentEventDescription(e.target.value);
                        setSaved(false);
                      }}
                      rows={4}
                      placeholder="Describe the information or subsequent event..."
                      className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Action Taken
                    </span>

                    <textarea
                      value={subsequentEventAction}
                      onChange={(e) => {
                        setSubsequentEventAction(e.target.value);
                        setSaved(false);
                      }}
                      rows={4}
                      placeholder="Document the audit action, evaluation, consultation or reporting response..."
                      className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />
                  </label>
                </div>
              )}
            </div>
          </section>

          {/* =====================================================
              SECTION 4
          ===================================================== */}

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                  4
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Final Audit File Assembly
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Confirm that the permanent file, current audit file,
                    financial statements, auditor's report and communications
                    have been assembled in the firm's approved documentation
                    system.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Assembly Progress
                    </p>

                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {assemblyProgress}%
                    </p>

                    <p className="text-xs text-slate-500">
                      {completedAssemblySections}/5 sections complete
                    </p>
                  </div>

                  <div className="w-full sm:max-w-xs">
                    <div className="h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-slate-900 transition-all"
                        style={{ width: `${assemblyProgress}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Archive Status
                    </p>

                    <p className="mt-1 font-bold text-slate-900">
                      {archiveStatus}
                    </p>

                    <p className="text-xs text-slate-500">
                      Current file assembly stage
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {assemblySections.map((section) => (
                  <div
                    key={section.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm">
                          {section.reference}
                        </span>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-slate-900">
                              {section.title}
                            </h3>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                section.assemblyStatus === "Completed"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : section.assemblyStatus === "In Progress"
                                  ? "bg-blue-100 text-blue-700"
                                  : section.assemblyStatus ===
                                    "Not Applicable"
                                  ? "bg-slate-200 text-slate-600"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {section.assemblyStatus}
                            </span>
                          </div>

                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {section.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                          Assembly Status
                        </span>

                        <select
                          value={section.assemblyStatus}
                          onChange={(e) =>
                            updateAssemblySection(
                              section.id,
                              "assemblyStatus",
                              e.target.value as AssemblyStatus
                            )
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        >
                          <option value="Not Started">Not Started</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Not Applicable">
                            Not Applicable
                          </option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                          File Location / Reference
                        </span>

                        <input
                          type="text"
                          value={section.fileLocation}
                          onChange={(e) =>
                            updateAssemblySection(
                              section.id,
                              "fileLocation",
                              e.target.value
                            )
                          }
                          placeholder="Enter file location or reference"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        />
                      </label>

                      <label className="block lg:col-span-2">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                          Assembly Notes
                        </span>

                        <textarea
                          value={section.assemblyNotes}
                          onChange={(e) =>
                            updateAssemblySection(
                              section.id,
                              "assemblyNotes",
                              e.target.value
                            )
                          }
                          rows={3}
                          placeholder="Document assembly observations or final file notes..."
                          className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* =====================================================
              SECTION 5
          ===================================================== */}

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                  5
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Final File Review and Approval
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Document the final engagement file review and confirm that
                    review notes, documentation gaps and significant matters
                    have been addressed.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-3">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={finalDocumentationReviewCompleted}
                    onChange={(e) => {
                      setFinalDocumentationReviewCompleted(e.target.checked);
                      setSaved(false);
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />

                  <span className="text-sm font-medium text-slate-700">
                    Final documentation review has been completed.
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={reviewNotesCleared}
                    onChange={(e) => {
                      setReviewNotesCleared(e.target.checked);
                      setSaved(false);
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />

                  <span className="text-sm font-medium text-slate-700">
                    All review notes and outstanding review points have been
                    cleared or appropriately resolved.
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={finalFileAssembled}
                    onChange={(e) => {
                      setFinalFileAssembled(e.target.checked);
                      setSaved(false);
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />

                  <span className="text-sm font-medium text-slate-700">
                    The final audit file has been assembled.
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={archiveIntegrityConfirmed}
                    onChange={(e) => {
                      setArchiveIntegrityConfirmed(e.target.checked);
                      setSaved(false);
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />

                  <span className="text-sm font-medium text-slate-700">
                    The integrity of the archived documentation has been
                    confirmed.
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={retentionRequirementsConfirmed}
                    onChange={(e) => {
                      setRetentionRequirementsConfirmed(e.target.checked);
                      setSaved(false);
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />

                  <span className="text-sm font-medium text-slate-700">
                    Applicable documentation retention requirements have been
                    confirmed.
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={accessRestrictionsConfirmed}
                    onChange={(e) => {
                      setAccessRestrictionsConfirmed(e.target.checked);
                      setSaved(false);
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />

                  <span className="text-sm font-medium text-slate-700">
                    Access restrictions and confidentiality controls have been
                    confirmed.
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={finalFileApproved}
                    onChange={(e) => {
                      setFinalFileApproved(e.target.checked);
                      setSaved(false);
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />

                  <span className="text-sm font-medium text-slate-700">
                    The final audit file has been approved by the authorized
                    reviewer.
                  </span>
                </label>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Engagement Partner
                  </span>

                  <input
                    type="text"
                    value={engagementPartner}
                    onChange={(e) => {
                      setEngagementPartner(e.target.value);
                      setSaved(false);
                    }}
                    placeholder="Enter engagement partner"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Final File Reviewer
                  </span>

                  <input
                    type="text"
                    value={finalFileReviewer}
                    onChange={(e) => {
                      setFinalFileReviewer(e.target.value);
                      setSaved(false);
                    }}
                    placeholder="Enter final file reviewer"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Documentation Completion Date
                  </span>

                  <input
                    type="date"
                    value={documentationCompletionDate}
                    onChange={(e) => {
                      setDocumentationCompletionDate(e.target.value);
                      setSaved(false);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Final Review Date
                  </span>

                  <input
                    type="date"
                    value={finalReviewDate}
                    onChange={(e) => {
                      setFinalReviewDate(e.target.value);
                      setSaved(false);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </label>

                <label className="block lg:col-span-2">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Final Documentation Conclusion
                  </span>

                  <textarea
                    value={finalDocumentationConclusion}
                    onChange={(e) => {
                      setFinalDocumentationConclusion(e.target.value);
                      setSaved(false);
                    }}
                    rows={5}
                    placeholder="Document the final conclusion regarding the completeness and adequacy of the audit documentation..."
                    className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </label>
              </div>
            </div>
          </section>

          {/* =====================================================
              SECTION 6
          ===================================================== */}

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                  6
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Archive and Retention
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Record the archive reference and retention information and
                    confirm that the completed audit file is protected against
                    unauthorized alteration or deletion.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Archive Status
                  </span>

                  <select
                    value={archiveStatus}
                    onChange={(e) => {
                      setArchiveStatus(e.target.value as ArchiveStatus);
                      setSaved(false);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="Not Ready">Not Ready</option>
                    <option value="Ready for Assembly">
                      Ready for Assembly
                    </option>
                    <option value="Assembled">Assembled</option>
                    <option value="Archived">Archived</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Archive Reference
                  </span>

                  <input
                    type="text"
                    value={archiveReference}
                    onChange={(e) => {
                      setArchiveReference(e.target.value);
                      setSaved(false);
                    }}
                    placeholder="Enter archive reference"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Archive Date
                  </span>

                  <input
                    type="date"
                    value={archiveDate}
                    onChange={(e) => {
                      setArchiveDate(e.target.value);
                      setSaved(false);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Retention Period
                  </span>

                  <input
                    type="text"
                    value={retentionPeriod}
                    onChange={(e) => {
                      setRetentionPeriod(e.target.value);
                      setSaved(false);
                    }}
                    placeholder="e.g. 7 years"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </label>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={archiveIntegrityConfirmed2}
                    onChange={(e) => {
                      setArchiveIntegrityConfirmed2(e.target.checked);
                      setSaved(false);
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />

                  <span className="text-sm font-medium text-slate-700">
                    Archive integrity has been confirmed.
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={retentionConfirmed2}
                    onChange={(e) => {
                      setRetentionConfirmed2(e.target.checked);
                      setSaved(false);
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />

                  <span className="text-sm font-medium text-slate-700">
                    Retention requirements have been confirmed.
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={accessConfirmed2}
                    onChange={(e) => {
                      setAccessConfirmed2(e.target.checked);
                      setSaved(false);
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />

                  <span className="text-sm font-medium text-slate-700">
                    Access and confidentiality restrictions have been
                    confirmed.
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={approvalConfirmed2}
                    onChange={(e) => {
                      setApprovalConfirmed2(e.target.checked);
                      setSaved(false);
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />

                  <span className="text-sm font-medium text-slate-700">
                    Final file approval has been obtained.
                  </span>
                </label>
              </div>

              <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                  <div>
                    <p className="text-sm font-bold text-blue-900">
                      Important
                    </p>

                    <p className="mt-1 text-sm leading-6 text-blue-800">
                      Once the audit file has been assembled and the applicable
                      documentation completion period has elapsed, changes to
                      the audit documentation should be controlled and should
                      preserve the original documentation and the reason for
                      any subsequent change.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =====================================================
              SECTION 7 — FINAL CHECKLIST
          ===================================================== */}

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                  7
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Final Completion Checklist
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Confirm that the engagement documentation and archive
                    process is complete before closing this workpaper.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <div className="space-y-3">
                {checklist.map((item) => (
                  <ChecklistItem
                    key={item.label}
                    complete={item.complete}
                    label={item.label}
                  />
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Checklist Progress
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      {completedChecklistItems}/{checklist.length} completion
                      requirements satisfied
                    </p>
                  </div>

                  <div className="w-full sm:max-w-xs">
                    <div className="h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className={`h-full rounded-full transition-all ${
                          checklistComplete
                            ? "bg-emerald-600"
                            : "bg-slate-900"
                        }`}
                        style={{
                          width: `${
                            (completedChecklistItems / checklist.length) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =====================================================
              FINAL STATUS
          ===================================================== */}

          <section
            className={`mb-6 rounded-2xl border p-5 shadow-sm sm:p-6 ${
              checklistComplete
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex items-start gap-4">
              {checklistComplete ? (
                <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-emerald-600" />
              ) : (
                <ShieldAlert className="mt-0.5 h-7 w-7 shrink-0 text-amber-600" />
              )}

              <div className="min-w-0">
                <h2
                  className={`text-lg font-bold ${
                    checklistComplete
                      ? "text-emerald-900"
                      : "text-amber-900"
                  }`}
                >
                  {checklistComplete
                    ? "4.6 Complete Documentation and Archive is complete"
                    : "4.6 still has completion requirements"}
                </h2>

                <p
                  className={`mt-1 text-sm leading-6 ${
                    checklistComplete
                      ? "text-emerald-800"
                      : "text-amber-800"
                  }`}
                >
                  {checklistComplete
                    ? "All 12 checklist requirements have been satisfied. You can continue to 4.7 Quality Monitoring."
                    : `Complete the remaining checklist requirements before continuing. Current progress: ${completedChecklistItems}/${checklist.length}.`}
                </p>
              </div>
            </div>
          </section>

          {/* =====================================================
              FOOTER ACTIONS
          ===================================================== */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  4.6 Complete Documentation and Archive
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Complete this workpaper before proceeding to 4.7 Quality
                  Monitoring and Root Cause Analysis.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Save className="h-4 w-4" />
                  {saved ? "Saved" : "Save"}
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!checklistComplete}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition ${
                    checklistComplete
                      ? "bg-slate-900 hover:bg-slate-800"
                      : "cursor-not-allowed bg-slate-300"
                  }`}
                >
                  Continue to 4.7
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}