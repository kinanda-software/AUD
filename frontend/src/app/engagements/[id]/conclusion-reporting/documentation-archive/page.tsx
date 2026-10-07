"use client";
import { apiResponse } from "@/lib/api";
import { fetchAllRecords } from "@/lib/dashboard";
import { isRecord } from "@/lib/typeGuards";


import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Archive,
  CheckCircle2,
  FileArchive,
  FileCheck2,
  FileText,
  Loader2,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
} from "lucide-react";

type DocumentationArea = {
  id: number;
  title: string;
  description: string;
  completed: boolean;
};

type OutstandingMatter = {
  id: number;
  description: string;
  resolved: boolean;
};

type AssemblySection = {
  id: number;
  title: string;
  completed: boolean;
};

type ArchiveRecord = {
  id?: number;
  engagement?: number;
  data?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

type ArchiveStatusRecord = {
  id?: number;
  engagement?: number;
  documentation_completed_at?: string | null;
  retention_period_years?: number | null;
  locked?: boolean;
  created_at?: string;
  updated_at?: string;
};

type DocumentationArchivePageData = {
  completionStatus: string;
  archiveStatus: string;

  documentationCompletionDate: string;
  retentionPeriod: string;
  archiveReference: string;

  documentationAreas: DocumentationArea[];
  outstandingMatters: OutstandingMatter[];
  assemblySections: AssemblySection[];

  subsequentEventsReviewed: boolean;
  subsequentEventsDetails: string;

  finalReviewCompleted: boolean;
  finalReviewNotes: string;

  partnerApprovalCompleted: boolean;
  partnerApprovalNotes: string;

  archiveChecklistDocumentationComplete: boolean;
  archiveChecklistOutstandingMattersResolved: boolean;
  archiveChecklistFinalReviewComplete: boolean;
  archiveChecklistPartnerApprovalComplete: boolean;
  archiveChecklistRetentionConfirmed: boolean;
};

function isArchiveData(value: unknown): value is DocumentationArchivePageData {
  if (!isRecord(value)) return false;
  const strings = ["completionStatus", "archiveStatus", "documentationCompletionDate",
    "retentionPeriod", "archiveReference", "subsequentEventsDetails", "finalReviewNotes", "partnerApprovalNotes"];
  const flags = ["subsequentEventsReviewed", "finalReviewCompleted", "partnerApprovalCompleted",
    "archiveChecklistDocumentationComplete", "archiveChecklistOutstandingMattersResolved",
    "archiveChecklistFinalReviewComplete", "archiveChecklistPartnerApprovalComplete",
    "archiveChecklistRetentionConfirmed"];
  return strings.every((key) => typeof value[key] === "string")
    && flags.every((key) => typeof value[key] === "boolean")
    && Array.isArray(value.documentationAreas) && value.documentationAreas.every((row) =>
      isRecord(row) && typeof row.id === "number" && typeof row.title === "string"
      && typeof row.description === "string" && typeof row.completed === "boolean")
    && Array.isArray(value.assemblySections) && value.assemblySections.every((row) =>
      isRecord(row) && typeof row.id === "number" && typeof row.title === "string" && typeof row.completed === "boolean")
    && Array.isArray(value.outstandingMatters) && value.outstandingMatters.every((row) =>
      isRecord(row) && typeof row.id === "number" && typeof row.description === "string" && typeof row.resolved === "boolean");
}

function isArchiveRecord(value: unknown, engagement: string): value is ArchiveRecord {
  return isRecord(value) && typeof value.id === "number" && Number.isInteger(value.id) && value.id > 0
    && String(value.engagement) === engagement && isRecord(value.data)
    && (Object.keys(value.data).length === 0 || isArchiveData(value.data));
}

function isArchiveStatusRecord(value: unknown, engagement: string): value is ArchiveStatusRecord {
  return isRecord(value) && typeof value.id === "number" && Number.isInteger(value.id) && value.id > 0
    && String(value.engagement) === engagement && typeof value.locked === "boolean"
    && (value.retention_period_years === null || (typeof value.retention_period_years === "number"
      && Number.isInteger(value.retention_period_years) && value.retention_period_years > 0))
    && (value.documentation_completed_at === null || (typeof value.documentation_completed_at === "string"
      && Number.isFinite(Date.parse(value.documentation_completed_at))));
}

const createDefaultDocumentationAreas = (): DocumentationArea[] => [
  {
    id: 1,
    title: "Audit documentation complete",
    description:
      "All significant audit work, evidence and conclusions have been documented.",
    completed: false,
  },
  {
    id: 2,
    title: "Working papers reviewed",
    description:
      "Working papers have been reviewed and review notes have been cleared.",
    completed: false,
  },
  {
    id: 3,
    title: "Audit evidence retained",
    description:
      "Sufficient appropriate audit evidence has been retained in the audit file.",
    completed: false,
  },
  {
    id: 4,
    title: "Audit conclusions documented",
    description:
      "Final audit conclusions are documented and supported by the audit evidence.",
    completed: false,
  },
  {
    id: 5,
    title: "Outstanding matters resolved",
    description:
      "All outstanding matters have been resolved or appropriately documented.",
    completed: false,
  },
  {
    id: 6,
    title: "Final review completed",
    description:
      "The final engagement quality and completion review has been completed.",
    completed: false,
  },
  {
    id: 7,
    title: "Archive requirements confirmed",
    description:
      "The final documentation and retention requirements have been confirmed.",
    completed: false,
  },
];

const createDefaultAssemblySections = (): AssemblySection[] => [
  {
    id: 1,
    title: "Financial statements and report",
    completed: false,
  },
  {
    id: 2,
    title: "Final audit documentation",
    completed: false,
  },
  {
    id: 3,
    title: "Review notes and resolutions",
    completed: false,
  },
  {
    id: 4,
    title: "Management and governance communications",
    completed: false,
  },
  {
    id: 5,
    title: "Final engagement file assembly",
    completed: false,
  },
];

export default function DocumentationArchivePage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = String(params?.id ?? "");

  const [archiveRecordId, setArchiveRecordId] = useState<number | null>(
    null
  );

  const [archiveStatusRecordId, setArchiveStatusRecordId] = useState<
    number | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [, setSaved] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isArchived, setIsArchived] = useState(false);

  const [completionStatus, setCompletionStatus] = useState("Not Started");
  const [archiveStatus, setArchiveStatus] = useState("Not Archived");

  const [documentationCompletionDate, setDocumentationCompletionDate] =
    useState("");

  const [retentionPeriod, setRetentionPeriod] = useState("7 years");
  const [archiveReference, setArchiveReference] = useState("");

  const [documentationAreas, setDocumentationAreas] = useState<
    DocumentationArea[]
  >(createDefaultDocumentationAreas);

  const [outstandingMatters, setOutstandingMatters] = useState<
    OutstandingMatter[]
  >([]);

  const [assemblySections, setAssemblySections] = useState<
    AssemblySection[]
  >(createDefaultAssemblySections);

  const [subsequentEventsReviewed, setSubsequentEventsReviewed] =
    useState(false);

  const [subsequentEventsDetails, setSubsequentEventsDetails] =
    useState("");

  const [finalReviewCompleted, setFinalReviewCompleted] =
    useState(false);

  const [finalReviewNotes, setFinalReviewNotes] = useState("");

  const [partnerApprovalCompleted, setPartnerApprovalCompleted] =
    useState(false);

  const [partnerApprovalNotes, setPartnerApprovalNotes] = useState("");

  const [
    archiveChecklistDocumentationComplete,
    setArchiveChecklistDocumentationComplete,
  ] = useState(false);

  const [
    archiveChecklistOutstandingMattersResolved,
    setArchiveChecklistOutstandingMattersResolved,
  ] = useState(false);

  const [
    archiveChecklistFinalReviewComplete,
    setArchiveChecklistFinalReviewComplete,
  ] = useState(false);

  const [
    archiveChecklistPartnerApprovalComplete,
    setArchiveChecklistPartnerApprovalComplete,
  ] = useState(false);

  const [
    archiveChecklistRetentionConfirmed,
    setArchiveChecklistRetentionConfirmed,
  ] = useState(false);

  const documentationCompletedCount = useMemo(
    () => documentationAreas.filter((item) => item.completed).length,
    [documentationAreas]
  );

  const assemblyCompletedCount = useMemo(
    () => assemblySections.filter((item) => item.completed).length,
    [assemblySections]
  );

  const outstandingResolvedCount = useMemo(
    () => outstandingMatters.filter((item) => item.resolved).length,
    [outstandingMatters]
  );

  const allDocumentationComplete =
    documentationAreas.length > 0 &&
    documentationAreas.every((item) => item.completed);

  const allAssemblyComplete =
    assemblySections.length > 0 &&
    assemblySections.every((item) => item.completed);

  const allOutstandingMattersResolved =
    outstandingMatters.length === 0 ||
    outstandingMatters.every((item) => item.resolved);

  const allRequirementsComplete =
    allDocumentationComplete &&
    allAssemblyComplete &&
    allOutstandingMattersResolved &&
    subsequentEventsReviewed &&
    finalReviewCompleted &&
    partnerApprovalCompleted &&
    archiveChecklistDocumentationComplete &&
    archiveChecklistOutstandingMattersResolved &&
    archiveChecklistFinalReviewComplete &&
    archiveChecklistPartnerApprovalComplete &&
    archiveChecklistRetentionConfirmed;

  const completionPercentage = useMemo(() => {
    const totalRequirements =
      documentationAreas.length +
      assemblySections.length +
      2 +
      1 +
      1 +
      5;

    const completedRequirements =
      documentationCompletedCount +
      assemblyCompletedCount +
      (allOutstandingMattersResolved ? 1 : 0) +
      (subsequentEventsReviewed ? 1 : 0) +
      (finalReviewCompleted ? 1 : 0) +
      (partnerApprovalCompleted ? 1 : 0) +
      (archiveChecklistDocumentationComplete ? 1 : 0) +
      (archiveChecklistOutstandingMattersResolved ? 1 : 0) +
      (archiveChecklistFinalReviewComplete ? 1 : 0) +
      (archiveChecklistPartnerApprovalComplete ? 1 : 0) +
      (archiveChecklistRetentionConfirmed ? 1 : 0);

    if (totalRequirements === 0) {
      return 0;
    }

    return Math.round(
      (completedRequirements / totalRequirements) * 100
    );
  }, [
    documentationAreas.length,
    assemblySections.length,
    documentationCompletedCount,
    assemblyCompletedCount,
    allOutstandingMattersResolved,
    subsequentEventsReviewed,
    finalReviewCompleted,
    partnerApprovalCompleted,
    archiveChecklistDocumentationComplete,
    archiveChecklistOutstandingMattersResolved,
    archiveChecklistFinalReviewComplete,
    archiveChecklistPartnerApprovalComplete,
    archiveChecklistRetentionConfirmed,
  ]);

  useEffect(() => {
    if (!engagementId) {
      return;
    }

    let cancelled = false;

    const loadArchive = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const archiveResults = await fetchAllRecords<unknown>(
          `/documentation-archives/?engagement=${engagementId}`,
        );
        if (archiveResults.length > 1 || !archiveResults.every((item): item is ArchiveRecord =>
          isArchiveRecord(item, engagementId))) throw new Error("Invalid documentation archive response. No data has been overwritten.");

        const archiveRecord: ArchiveRecord | null =
          archiveResults.length > 0 ? archiveResults[0] : null;

        const statusResults = await fetchAllRecords<unknown>(
          `/archive-statuses/?engagement=${engagementId}`,
        );
        if (statusResults.length > 1 || !statusResults.every((item): item is ArchiveStatusRecord =>
          isArchiveStatusRecord(item, engagementId))) throw new Error("Invalid archive lock response. No data has been overwritten.");

        const statusRecord: ArchiveStatusRecord | null =
          statusResults.length > 0 ? statusResults[0] : null;

        if (cancelled) {
          return;
        }

        if (archiveRecord?.id) {
          setArchiveRecordId(Number(archiveRecord.id));
        }

        if (statusRecord?.id) {
          setArchiveStatusRecordId(Number(statusRecord.id));
        }

        if (archiveRecord?.data && Object.keys(archiveRecord.data).length) {
          const data = archiveRecord.data;

          setCompletionStatus(
            typeof data.completionStatus === "string"
              ? data.completionStatus
              : "Not Started"
          );

          setArchiveStatus(
            typeof data.archiveStatus === "string"
              ? data.archiveStatus
              : "Not Archived"
          );

          setDocumentationCompletionDate(
            typeof data.documentationCompletionDate === "string"
              ? data.documentationCompletionDate
              : ""
          );

          setRetentionPeriod(
            typeof data.retentionPeriod === "string"
              ? data.retentionPeriod
              : "7 years"
          );

          setArchiveReference(
            typeof data.archiveReference === "string"
              ? data.archiveReference
              : ""
          );

          if (Array.isArray(data.documentationAreas)) {
            setDocumentationAreas(data.documentationAreas as DocumentationArea[]);
          }

          if (Array.isArray(data.outstandingMatters)) {
            setOutstandingMatters(
              data.outstandingMatters as OutstandingMatter[]
            );
          }

          if (Array.isArray(data.assemblySections)) {
            setAssemblySections(
              data.assemblySections as AssemblySection[]
            );
          }

          setSubsequentEventsReviewed(
            Boolean(data.subsequentEventsReviewed)
          );

          setSubsequentEventsDetails(
            typeof data.subsequentEventsDetails === "string"
              ? data.subsequentEventsDetails
              : ""
          );

          setFinalReviewCompleted(
            Boolean(data.finalReviewCompleted)
          );

          setFinalReviewNotes(
            typeof data.finalReviewNotes === "string"
              ? data.finalReviewNotes
              : ""
          );

          setPartnerApprovalCompleted(
            Boolean(data.partnerApprovalCompleted)
          );

          setPartnerApprovalNotes(
            typeof data.partnerApprovalNotes === "string"
              ? data.partnerApprovalNotes
              : ""
          );

          setArchiveChecklistDocumentationComplete(
            Boolean(data.archiveChecklistDocumentationComplete)
          );

          setArchiveChecklistOutstandingMattersResolved(
            Boolean(data.archiveChecklistOutstandingMattersResolved)
          );

          setArchiveChecklistFinalReviewComplete(
            Boolean(data.archiveChecklistFinalReviewComplete)
          );

          setArchiveChecklistPartnerApprovalComplete(
            Boolean(data.archiveChecklistPartnerApprovalComplete)
          );

          setArchiveChecklistRetentionConfirmed(
            Boolean(data.archiveChecklistRetentionConfirmed)
          );
        }

        if (statusRecord) {
          setArchiveStatus(statusRecord.locked ? "Archived" : "Not Archived");

          if (statusRecord.locked) {
            setIsArchived(true);
            setCompletionStatus("Completed");
          }

          if (statusRecord.retention_period_years) {
            setRetentionPeriod(
              `${statusRecord.retention_period_years} years`
            );
          }

          if (statusRecord.documentation_completed_at) {
            setDocumentationCompletionDate(
              statusRecord.documentation_completed_at.slice(0, 10)
            );
          }
        }

        setSaved(Boolean(archiveRecord));
        setLoadFailed(false);
      } catch (error) {
        if (!cancelled) {
          setLoadFailed(true);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Failed to load documentation archive."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadArchive();

    return () => {
      cancelled = true;
    };
  }, [engagementId, loadAttempt]);

  const updateDocumentationArea = (
    id: number,
    completed: boolean
  ) => {
    if (loadFailed || loading || isArchived) {
      return;
    }

    setDocumentationAreas((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              completed,
            }
          : item
      )
    );
  };

  const addOutstandingMatter = () => {
    if (isArchived) {
      return;
    }

    setOutstandingMatters((current) => [
      ...current,
      {
        id: Date.now(),
        description: "",
        resolved: false,
      },
    ]);
  };

  const updateOutstandingMatter = (
    id: number,
    field: "description" | "resolved",
    value: string | boolean
  ) => {
    if (isArchived) {
      return;
    }

    setOutstandingMatters((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const removeOutstandingMatter = (id: number) => {
    if (isArchived) {
      return;
    }

    setOutstandingMatters((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  const updateAssemblySection = (
    id: number,
    completed: boolean
  ) => {
    if (isArchived) {
      return;
    }

    setAssemblySections((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              completed,
            }
          : item
      )
    );
  };

  const buildArchiveData = (
    overrides?: Partial<
      Pick<
        DocumentationArchivePageData,
        "completionStatus" | "archiveStatus"
      >
    >
  ): DocumentationArchivePageData => ({
    completionStatus:
      overrides?.completionStatus ?? completionStatus,

    archiveStatus:
      overrides?.archiveStatus ?? archiveStatus,

    documentationCompletionDate,
    retentionPeriod,
    archiveReference,

    documentationAreas,
    outstandingMatters,
    assemblySections,

    subsequentEventsReviewed,
    subsequentEventsDetails,

    finalReviewCompleted,
    finalReviewNotes,

    partnerApprovalCompleted,
    partnerApprovalNotes,

    archiveChecklistDocumentationComplete,
    archiveChecklistOutstandingMattersResolved,
    archiveChecklistFinalReviewComplete,
    archiveChecklistPartnerApprovalComplete,
    archiveChecklistRetentionConfirmed,
  });

  const handleSave = async (
    overrides?: Partial<
      Pick<
        DocumentationArchivePageData,
        "completionStatus" | "archiveStatus"
      >
    >
  ): Promise<boolean> => {
    if (loadFailed || loading || isArchived) {
      setErrorMessage(
        "This engagement has already been archived and is read-only."
      );

      return false;
    }

    if (!engagementId) {
      setErrorMessage("Engagement ID is missing.");

      return false;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        engagement: Number(engagementId),
        data: buildArchiveData(overrides),
      };

      const response = await apiResponse(
        archiveRecordId
          ? `/documentation-archives/${archiveRecordId}/`
          : `/documentation-archives/`,
        {
          method: archiveRecordId ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        }
      );

      const data: unknown = await response.json();
      if (!isArchiveRecord(data, engagementId)) throw new Error("The server did not confirm the saved archive record.");

      if ("id" in data && data.id) {
        setArchiveRecordId(Number(data.id));
      }

      if (overrides?.completionStatus) {
        setCompletionStatus(overrides.completionStatus);
      }

      if (overrides?.archiveStatus) {
        setArchiveStatus(overrides.archiveStatus);
      }

      setSaved(true);

      if (!overrides?.archiveStatus) {
        setSuccessMessage("Documentation archive saved successfully.");
      }

      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save documentation archive."
      );

      return false;
    } finally {
      setSaving(false);
    }
  };

  /*
   * COMPLETE & ARCHIVE
   *
   * Important change:
   * After the archive has been successfully saved and locked,
   * the user is redirected away from this completed workflow.
   *
   * router.replace("/engagements") is intentional:
   * it replaces the current history entry so the browser Back button
   * does not immediately return the user to the completed archive page.
   */
  const handleCompleteAndArchive = async () => {
    if (isArchived) {
      setErrorMessage(
        "This engagement has already been archived."
      );

      return;
    }

    if (!allRequirementsComplete) {
      setErrorMessage(
        "Complete all documentation, review, assembly and archive requirements before archiving."
      );

      return;
    }

    const retentionMatch = retentionPeriod.match(/\d+/);

    if (!retentionMatch) {
      setErrorMessage(
        "Enter a valid retention period, for example 7 years."
      );

      return;
    }

    setActionLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const savedSuccessfully = await handleSave({
        completionStatus: "In Progress",
        archiveStatus: "Not Archived",
      });

      if (!savedSuccessfully) {
        return;
      }

      const retentionYears = Number(retentionMatch[0]);
      if (!Number.isInteger(retentionYears) || retentionYears < 1) {
        throw new Error("Retention period must be at least one year.");
      }

      const archivePayload = {
        engagement: Number(engagementId),

        documentation_completed_at:
          documentationCompletionDate
            ? `${documentationCompletionDate}T00:00:00Z`
            : new Date().toISOString(),

        retention_period_years: retentionYears,

        locked: true,
      };

      const response = await apiResponse(
        archiveStatusRecordId
          ? `/archive-statuses/${archiveStatusRecordId}/`
          : `/archive-statuses/`,
        {
          method: archiveStatusRecordId ? "PATCH" : "POST",
          body: JSON.stringify(archivePayload),
        }
      );

      const data: unknown = await response.json();
      if (!isArchiveStatusRecord(data, engagementId) || !data.locked) {
        throw new Error("The server did not confirm the archive lock.");
      }

      if (data?.id) {
        setArchiveStatusRecordId(Number(data.id));
      }

      setArchiveStatus("Archived");
      setCompletionStatus("Completed");
      setSaved(true);
      setIsArchived(true);

      setSuccessMessage(
        "Documentation saved and locked successfully. Leaving the archive workspace..."
      );

      /*
       * Give the user a short moment to see the success message,
       * then leave the completed Documentation Archive page.
       *
       * replace() is used instead of push() so the completed page
       * is not kept as the previous browser-history page.
       */
      window.setTimeout(() => {
        router.replace("/engagements");
      }, 1500);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to complete and archive engagement."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleBack = () => {
    router.push(`/engagements/${engagementId}`);
  };

  if (loading) {
    return (

        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading documentation archive...
          </div>
        </div>

    );
  }

  if (loadFailed) {
    return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
      <p>{errorMessage}</p>
      <button type="button" onClick={() => setLoadAttempt((current) => current + 1)} className="mt-4 font-semibold underline">Retry loading archive</button>
      <button type="button" onClick={handleBack} className="ml-4 underline">Back to engagement</button>
    </div>;
  }

  return (

      <div className="w-full bg-[#f6f4ef] px-4 py-6 md:px-8">
        <div className="w-full">
          {/* Header */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleBack}
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Engagement
            </button>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <FileArchive className="h-6 w-6 text-slate-700" />

                  <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Phase 4.6
                  </span>
                </div>

                <h1 className="text-2xl font-bold text-[#172323] md:text-3xl">
                  ISA 230 Documentation Archive
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Complete the final audit documentation, review,
                  assembly and retention requirements before locking
                  the engagement file.
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Engagement:{" "}
                  <span className="font-semibold text-slate-700">
                    {engagementId}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${
                    isArchived
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {isArchived ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}

                  {isArchived ? "Archived" : completionStatus}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                  {archiveStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="font-semibold">Workflow Error</p>
                <p className="mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="font-semibold">Success</p>
                <p className="mt-1">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Archived banner */}
          {isArchived && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-3">
                <Archive className="mt-0.5 h-6 w-6 text-emerald-700" />

                <div>
                  <h2 className="font-bold text-emerald-900">
                    Engagement Completed and Archived
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    This engagement has been completed and the audit
                    file is locked. The workflow is now read-only.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Completion Progress
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Complete all required items before archiving.
                </p>
              </div>

              <span className="text-sm font-bold text-slate-800">
                {completionPercentage}%
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#0c766d] transition-all duration-300"
                style={{
                  width: `${completionPercentage}%`,
                }}
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main content */}
            <div className="space-y-6 lg:col-span-2">
              {/* Documentation */}
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-slate-900">
                        Final Documentation
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Confirm that all required audit documentation
                        has been completed.
                      </p>
                    </div>

                    <span className="text-sm font-semibold text-slate-600">
                      {documentationCompletedCount}/
                      {documentationAreas.length}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {documentationAreas.map((item) => (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer gap-4 p-5 ${
                        isArchived
                          ? "cursor-not-allowed opacity-80"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        disabled={isArchived}
                        onChange={(event) =>
                          updateDocumentationArea(
                            item.id,
                            event.target.checked
                          )
                        }
                        className="mt-1 h-5 w-5 rounded border-slate-300"
                      />

                      <div>
                        <p className="font-semibold text-slate-900">
                          {item.title}
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {item.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              {/* Outstanding matters */}
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      Outstanding Matters
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Resolve all outstanding matters before final
                      archive.
                    </p>
                  </div>

                  {!isArchived && (
                    <button
                      type="button"
                      onClick={addOutstandingMatter}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Plus className="h-4 w-4" />
                      Add Matter
                    </button>
                  )}
                </div>

                <div className="p-5">
                  {outstandingMatters.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                      <p className="text-sm font-medium text-slate-700">
                        No outstanding matters recorded.
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        The engagement currently has no unresolved
                        outstanding matters.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {outstandingMatters.map((matter) => (
                        <div
                          key={matter.id}
                          className="rounded-lg border border-slate-200 p-4"
                        >
                          <div className="flex gap-3">
                            <input
                              type="checkbox"
                              checked={matter.resolved}
                              disabled={isArchived}
                              onChange={(event) =>
                                updateOutstandingMatter(
                                  matter.id,
                                  "resolved",
                                  event.target.checked
                                )
                              }
                              className="mt-1 h-5 w-5 rounded border-slate-300"
                            />

                            <div className="min-w-0 flex-1">
                              <textarea
                                value={matter.description}
                                disabled={isArchived}
                                onChange={(event) =>
                                  updateOutstandingMatter(
                                    matter.id,
                                    "description",
                                    event.target.value
                                  )
                                }
                                placeholder="Describe the outstanding matter..."
                                rows={3}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                              />

                              <div className="mt-2 flex items-center justify-between">
                                <span
                                  className={`text-xs font-semibold ${
                                    matter.resolved
                                      ? "text-emerald-700"
                                      : "text-amber-700"
                                  }`}
                                >
                                  {matter.resolved
                                    ? "Resolved"
                                    : "Outstanding"}
                                </span>

                                {!isArchived && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeOutstandingMatter(
                                        matter.id
                                      )
                                    }
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="mt-4 text-xs text-slate-500">
                    Resolved: {outstandingResolvedCount}/
                    {outstandingMatters.length}
                  </p>
                </div>
              </section>

              {/* Assembly */}
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-slate-900">
                        Final Audit File Assembly
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Confirm each required section is assembled in
                        the final audit file.
                      </p>
                    </div>

                    <span className="text-sm font-semibold text-slate-600">
                      {assemblyCompletedCount}/
                      {assemblySections.length}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {assemblySections.map((section) => (
                    <label
                      key={section.id}
                      className={`flex cursor-pointer gap-4 p-5 ${
                        isArchived
                          ? "cursor-not-allowed opacity-80"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={section.completed}
                        disabled={isArchived}
                        onChange={(event) =>
                          updateAssemblySection(
                            section.id,
                            event.target.checked
                          )
                        }
                        className="mt-1 h-5 w-5 rounded border-slate-300"
                      />

                      <div>
                        <p className="font-semibold text-slate-900">
                          {section.title}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              {/* Subsequent events */}
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-5">
                  <h2 className="font-bold text-slate-900">
                    Subsequent Events
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Document the final review of subsequent events.
                  </p>
                </div>

                <div className="space-y-4 p-5">
                  <label
                    className={`flex items-center gap-3 ${
                      isArchived
                        ? "cursor-not-allowed opacity-80"
                        : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={subsequentEventsReviewed}
                      disabled={isArchived}
                      onChange={(event) =>
                        setSubsequentEventsReviewed(
                          event.target.checked
                        )
                      }
                      className="h-5 w-5 rounded border-slate-300"
                    />

                    <span className="text-sm font-semibold text-slate-800">
                      Subsequent events review completed
                    </span>
                  </label>

                  <textarea
                    value={subsequentEventsDetails}
                    disabled={isArchived}
                    onChange={(event) =>
                      setSubsequentEventsDetails(event.target.value)
                    }
                    placeholder="Enter details of the subsequent events review..."
                    rows={4}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  />
                </div>
              </section>

              {/* Final review */}
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-5">
                  <h2 className="font-bold text-slate-900">
                    Final Review
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Confirm completion of the final engagement review.
                  </p>
                </div>

                <div className="space-y-4 p-5">
                  <label
                    className={`flex items-center gap-3 ${
                      isArchived
                        ? "cursor-not-allowed opacity-80"
                        : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={finalReviewCompleted}
                      disabled={isArchived}
                      onChange={(event) =>
                        setFinalReviewCompleted(
                          event.target.checked
                        )
                      }
                      className="h-5 w-5 rounded border-slate-300"
                    />

                    <span className="text-sm font-semibold text-slate-800">
                      Final engagement review completed
                    </span>
                  </label>

                  <textarea
                    value={finalReviewNotes}
                    disabled={isArchived}
                    onChange={(event) =>
                      setFinalReviewNotes(event.target.value)
                    }
                    placeholder="Enter final review notes..."
                    rows={4}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  />
                </div>
              </section>

              {/* Partner approval */}
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-5">
                  <h2 className="font-bold text-slate-900">
                    Partner / Engagement Approval
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Confirm that the final engagement approval has
                    been completed.
                  </p>
                </div>

                <div className="space-y-4 p-5">
                  <label
                    className={`flex items-center gap-3 ${
                      isArchived
                        ? "cursor-not-allowed opacity-80"
                        : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={partnerApprovalCompleted}
                      disabled={isArchived}
                      onChange={(event) =>
                        setPartnerApprovalCompleted(
                          event.target.checked
                        )
                      }
                      className="h-5 w-5 rounded border-slate-300"
                    />

                    <span className="text-sm font-semibold text-slate-800">
                      Final partner / engagement approval completed
                    </span>
                  </label>

                  <textarea
                    value={partnerApprovalNotes}
                    disabled={isArchived}
                    onChange={(event) =>
                      setPartnerApprovalNotes(event.target.value)
                    }
                    placeholder="Enter approval notes..."
                    rows={4}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  />
                </div>
              </section>
            </div>

            {/* Right sidebar */}
            <aside className="space-y-6">
              {/* Archive details */}
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-5">
                  <h2 className="font-bold text-slate-900">
                    Archive Details
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Final archive and retention information.
                  </p>
                </div>

                <div className="space-y-4 p-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Documentation completion date
                    </label>

                    <input
                      type="date"
                      value={documentationCompletionDate}
                      disabled={isArchived}
                      onChange={(event) =>
                        setDocumentationCompletionDate(
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Retention period
                    </label>

                    <input
                      type="text"
                      value={retentionPeriod}
                      disabled={isArchived}
                      onChange={(event) =>
                        setRetentionPeriod(event.target.value)
                      }
                      placeholder="Example: 7 years"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Archive reference
                    </label>

                    <input
                      type="text"
                      value={archiveReference}
                      disabled={isArchived}
                      onChange={(event) =>
                        setArchiveReference(event.target.value)
                      }
                      placeholder="Archive reference"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>
                </div>
              </section>

              {/* Archive checklist */}
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-5">
                  <h2 className="font-bold text-slate-900">
                    Archive Checklist
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Every item must be confirmed before final
                    archive.
                  </p>
                </div>

                <div className="divide-y divide-slate-100">
                  <label
                    className={`flex gap-3 p-4 ${
                      isArchived
                        ? "cursor-not-allowed opacity-80"
                        : "cursor-pointer hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={archiveChecklistDocumentationComplete}
                      disabled={isArchived}
                      onChange={(event) =>
                        setArchiveChecklistDocumentationComplete(
                          event.target.checked
                        )
                      }
                      className="mt-0.5 h-5 w-5 rounded border-slate-300"
                    />

                    <span className="text-sm font-medium text-slate-800">
                      Final documentation is complete
                    </span>
                  </label>

                  <label
                    className={`flex gap-3 p-4 ${
                      isArchived
                        ? "cursor-not-allowed opacity-80"
                        : "cursor-pointer hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={
                        archiveChecklistOutstandingMattersResolved
                      }
                      disabled={isArchived}
                      onChange={(event) =>
                        setArchiveChecklistOutstandingMattersResolved(
                          event.target.checked
                        )
                      }
                      className="mt-0.5 h-5 w-5 rounded border-slate-300"
                    />

                    <span className="text-sm font-medium text-slate-800">
                      Outstanding matters are resolved
                    </span>
                  </label>

                  <label
                    className={`flex gap-3 p-4 ${
                      isArchived
                        ? "cursor-not-allowed opacity-80"
                        : "cursor-pointer hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={archiveChecklistFinalReviewComplete}
                      disabled={isArchived}
                      onChange={(event) =>
                        setArchiveChecklistFinalReviewComplete(
                          event.target.checked
                        )
                      }
                      className="mt-0.5 h-5 w-5 rounded border-slate-300"
                    />

                    <span className="text-sm font-medium text-slate-800">
                      Final review is complete
                    </span>
                  </label>

                  <label
                    className={`flex gap-3 p-4 ${
                      isArchived
                        ? "cursor-not-allowed opacity-80"
                        : "cursor-pointer hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={archiveChecklistPartnerApprovalComplete}
                      disabled={isArchived}
                      onChange={(event) =>
                        setArchiveChecklistPartnerApprovalComplete(
                          event.target.checked
                        )
                      }
                      className="mt-0.5 h-5 w-5 rounded border-slate-300"
                    />

                    <span className="text-sm font-medium text-slate-800">
                      Partner approval is complete
                    </span>
                  </label>

                  <label
                    className={`flex gap-3 p-4 ${
                      isArchived
                        ? "cursor-not-allowed opacity-80"
                        : "cursor-pointer hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={archiveChecklistRetentionConfirmed}
                      disabled={isArchived}
                      onChange={(event) =>
                        setArchiveChecklistRetentionConfirmed(
                          event.target.checked
                        )
                      }
                      className="mt-0.5 h-5 w-5 rounded border-slate-300"
                    />

                    <span className="text-sm font-medium text-slate-800">
                      Retention period is confirmed
                    </span>
                  </label>
                </div>
              </section>

              {/* Actions */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={isArchived || saving || actionLoading}
                    onClick={() => void handleSave()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}

                    {saving ? "Saving..." : "Save Draft"}
                  </button>

                  <button
                    type="button"
                    disabled={
                      !allRequirementsComplete ||
                      completionStatus === "Completed" ||
                      actionLoading ||
                      loading ||
                      isArchived
                    }
                    onClick={() => void handleCompleteAndArchive()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0c766d] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#095f58] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}

                    {actionLoading
                      ? "Completing & Archiving..."
                      : "Complete & Archive"}
                  </button>
                </div>

                {!allRequirementsComplete && !isArchived && (
                  <p className="mt-3 text-xs leading-5 text-amber-700">
                    Complete all required checklist, documentation,
                    review and assembly items before archiving.
                  </p>
                )}

                {isArchived && (
                  <p className="mt-3 text-xs leading-5 text-emerald-700">
                    This engagement is archived and locked. You have
                    completed this workflow.
                  </p>
                )}
              </section>
            </aside>
          </div>

          {/* Bottom actions */}
          <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Engagement
            </button>

            <button
              type="button"
              disabled={
                !allRequirementsComplete ||
                completionStatus === "Completed" ||
                actionLoading ||
                loading ||
                isArchived
              }
              onClick={() => void handleCompleteAndArchive()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0c766d] px-5 py-3 text-sm font-bold text-white hover:bg-[#095f58] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileCheck2 className="h-4 w-4" />
              )}

              {actionLoading
                ? "Completing & Archiving..."
                : "Complete & Archive"}
            </button>
          </div>
        </div>
      </div>

  );
}
