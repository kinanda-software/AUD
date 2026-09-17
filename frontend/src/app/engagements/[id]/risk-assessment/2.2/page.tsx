"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "../../../../../components/layout/AppLayout";
import {
  ArrowLeft,
  ArrowRight,
  Workflow,
  Building2,
  User,
  CalendarDays,
  Monitor,
  ShieldCheck,
  FileSearch,
  AlertTriangle,
  Save,
  CheckCircle2,
  Loader2,
  CircleAlert,
} from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:8000/api";

interface ProcessFlowWalkthrough {
  id: number;
  engagement: number;
  engagement_code?: string;

  process_name: string;
  process_owner: string;
  department: string;
  walkthrough_date: string;

  process_description: string;
  process_flow: string;

  key_controls: string;
  control_objectives: string;
  control_owner: string;

  it_applications: string;
  it_dependencies: string;
  interfaces: string;

  walkthrough_procedure: string;
  evidence_obtained: string;

  observations: string;
  exceptions: string;

  conclusion: string;

  created_at?: string;
  updated_at?: string;
}

export default function ProcessFlowWalkthroughsPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = params.id as string;

  // ---------------------------------------------------------------------------
  // FORM STATE
  // ---------------------------------------------------------------------------

  const [processName, setProcessName] = useState("");
  const [processOwner, setProcessOwner] = useState("");
  const [department, setDepartment] = useState("");
  const [walkthroughDate, setWalkthroughDate] = useState("");

  const [processDescription, setProcessDescription] = useState("");
  const [processFlow, setProcessFlow] = useState("");

  const [keyControls, setKeyControls] = useState("");
  const [controlObjectives, setControlObjectives] = useState("");
  const [controlOwner, setControlOwner] = useState("");

  const [itApplications, setItApplications] = useState("");
  const [itDependencies, setItDependencies] = useState("");
  const [interfaces, setInterfaces] = useState("");

  const [walkthroughProcedure, setWalkthroughProcedure] = useState("");
  const [evidenceObtained, setEvidenceObtained] = useState("");

  const [observations, setObservations] = useState("");
  const [exceptions, setExceptions] = useState("");

  const [conclusion, setConclusion] = useState("");

  // ---------------------------------------------------------------------------
  // PAGE STATE
  // ---------------------------------------------------------------------------

  const [workpaperId, setWorkpaperId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [continuing, setContinuing] = useState(false);

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // ---------------------------------------------------------------------------
  // LOAD EXISTING WORKPAPER
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!engagementId) {
      setLoading(false);
      return;
    }

    const loadWorkpaper = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/process-flow-walkthroughs/?engagement=${encodeURIComponent(
            engagementId
          )}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        if (!response.ok) {
          let message = `Failed to load Phase 2.2 workpaper. HTTP ${response.status}.`;

          try {
            const errorData = await response.json();

            if (errorData?.detail) {
              message = errorData.detail;
            }
          } catch {
            // Ignore JSON parsing error.
          }

          throw new Error(message);
        }

        // ---------------------------------------------------------------------
        // DIAGNOSTIC: LOAD RESPONSE
        // ---------------------------------------------------------------------

        const data = await response.json();

        console.log("=== PHASE 2.2 LOAD RESPONSE ===");
        console.log("LOAD HTTP STATUS:", response.status);
        console.log("LOAD RESPONSE:", data);

        // ---------------------------------------------------------------------
        // SUPPORT BOTH:
        // 1. Normal DRF array response
        // 2. Paginated DRF response { results: [...] }
        // ---------------------------------------------------------------------

        let workpapers: ProcessFlowWalkthrough[] = [];

        if (Array.isArray(data)) {
          workpapers = data;
        } else if (
          data &&
          Array.isArray(data.results)
        ) {
          workpapers = data.results;
        }

        if (workpapers.length === 0) {
          setWorkpaperId(null);
          setSaved(false);
          return;
        }

        const workpaper = workpapers[0];

        console.log(
          "PHASE 2.2 EXISTING WORKPAPER:",
          workpaper
        );

        setWorkpaperId(workpaper.id);

        setProcessName(workpaper.process_name ?? "");
        setProcessOwner(workpaper.process_owner ?? "");
        setDepartment(workpaper.department ?? "");
        setWalkthroughDate(workpaper.walkthrough_date ?? "");

        setProcessDescription(
          workpaper.process_description ?? ""
        );

        setProcessFlow(
          workpaper.process_flow ?? ""
        );

        setKeyControls(
          workpaper.key_controls ?? ""
        );

        setControlObjectives(
          workpaper.control_objectives ?? ""
        );

        setControlOwner(
          workpaper.control_owner ?? ""
        );

        setItApplications(
          workpaper.it_applications ?? ""
        );

        setItDependencies(
          workpaper.it_dependencies ?? ""
        );

        setInterfaces(
          workpaper.interfaces ?? ""
        );

        setWalkthroughProcedure(
          workpaper.walkthrough_procedure ?? ""
        );

        setEvidenceObtained(
          workpaper.evidence_obtained ?? ""
        );

        setObservations(
          workpaper.observations ?? ""
        );

        setExceptions(
          workpaper.exceptions ?? ""
        );

        setConclusion(
          workpaper.conclusion ?? ""
        );

        setSaved(true);
      } catch (err) {
        console.error(
          "Error loading Phase 2.2 workpaper:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load the Phase 2.2 workpaper."
        );
      } finally {
        setLoading(false);
      }
    };

    loadWorkpaper();
  }, [engagementId]);

  // ---------------------------------------------------------------------------
  // MARK FORM AS EDITED
  // ---------------------------------------------------------------------------

  const markAsEdited = () => {
    setSaved(false);

    if (error) {
      setError("");
    }
  };

  // ---------------------------------------------------------------------------
  // SAVE
  // ---------------------------------------------------------------------------

  const handleSave = async (): Promise<boolean> => {
    // -------------------------------------------------------------------------
    // REQUIRED FIELD VALIDATION
    // -------------------------------------------------------------------------

    if (
      !processName.trim() ||
      !processOwner.trim() ||
      !walkthroughDate ||
      !processDescription.trim() ||
      !walkthroughProcedure.trim()
    ) {
      setError(
        "Please complete Process Name, Process Owner, Walkthrough Date, Process Description and Walkthrough Procedure."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return false;
    }

    setSaving(true);
    setSaved(false);
    setError("");

    // -------------------------------------------------------------------------
    // SAVE PAYLOAD
    // -------------------------------------------------------------------------

    const workpaperData = {
      engagement: Number(engagementId),

      process_name: processName.trim(),
      process_owner: processOwner.trim(),
      department: department.trim(),
      walkthrough_date: walkthroughDate,

      process_description:
        processDescription.trim(),

      process_flow:
        processFlow.trim(),

      key_controls:
        keyControls.trim(),

      control_objectives:
        controlObjectives.trim(),

      control_owner:
        controlOwner.trim(),

      it_applications:
        itApplications.trim(),

      it_dependencies:
        itDependencies.trim(),

      interfaces:
        interfaces.trim(),

      walkthrough_procedure:
        walkthroughProcedure.trim(),

      evidence_obtained:
        evidenceObtained.trim(),

      observations:
        observations.trim(),

      exceptions:
        exceptions.trim(),

      conclusion:
        conclusion.trim(),
    };

    // -------------------------------------------------------------------------
    // DIAGNOSTIC: SAVE START
    // -------------------------------------------------------------------------

    console.log("=== PHASE 2.2 SAVE START ===");
    console.log("engagementId:", engagementId);
    console.log("workpaperId:", workpaperId);
    console.log("SAVE PAYLOAD:", workpaperData);

    try {
      let response: Response;

      // -----------------------------------------------------------------------
      // UPDATE EXISTING WORKPAPER
      // -----------------------------------------------------------------------

      if (workpaperId !== null) {
        console.log(
          "PHASE 2.2 SAVE METHOD: PATCH"
        );

        console.log(
          "PATCH URL:",
          `${API_BASE_URL}/process-flow-walkthroughs/${workpaperId}/`
        );

        response = await fetch(
          `${API_BASE_URL}/process-flow-walkthroughs/${workpaperId}/`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(
              workpaperData
            ),
          }
        );
      } else {
        // ---------------------------------------------------------------------
        // CREATE NEW WORKPAPER
        // ---------------------------------------------------------------------

        console.log(
          "PHASE 2.2 SAVE METHOD: POST"
        );

        console.log(
          "POST URL:",
          `${API_BASE_URL}/process-flow-walkthroughs/`
        );

        response = await fetch(
          `${API_BASE_URL}/process-flow-walkthroughs/`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(
              workpaperData
            ),
          }
        );
      }

      // -----------------------------------------------------------------------
      // HANDLE HTTP ERROR
      // -----------------------------------------------------------------------

      if (!response.ok) {
        let message = `Failed to save Phase 2.2 workpaper. HTTP ${response.status}.`;

        try {
          const errorData =
            await response.json();

          console.error(
            "PHASE 2.2 SAVE ERROR RESPONSE:",
            errorData
          );

          if (
            errorData &&
            typeof errorData.detail ===
              "string"
          ) {
            message =
              errorData.detail;
          } else if (errorData) {
            const fieldErrors =
              Object.entries(
                errorData
              )
                .map(
                  ([field, messages]) => {
                    const formattedMessages =
                      Array.isArray(
                        messages
                      )
                        ? messages.join(
                            ", "
                          )
                        : String(
                            messages
                          );

                    return `${field}: ${formattedMessages}`;
                  }
                )
                .join(" | ");

            if (fieldErrors) {
              message =
                fieldErrors;
            }
          }
        } catch {
          // Ignore JSON parsing error.
        }

        throw new Error(message);
      }

      // -----------------------------------------------------------------------
      // READ SAVED RESPONSE
      // -----------------------------------------------------------------------

      const savedWorkpaper: ProcessFlowWalkthrough =
        await response.json();

      // -----------------------------------------------------------------------
      // DIAGNOSTIC: SAVE RESPONSE
      // -----------------------------------------------------------------------

      console.log(
        "=== PHASE 2.2 SAVE RESPONSE ==="
      );

      console.log(
        "HTTP STATUS:",
        response.status
      );

      console.log(
        "DATABASE RESPONSE:",
        savedWorkpaper
      );

      // -----------------------------------------------------------------------
      // UPDATE LOCAL STATE FROM DATABASE RESPONSE
      // -----------------------------------------------------------------------

      setWorkpaperId(
        savedWorkpaper.id
      );

      setProcessName(
        savedWorkpaper.process_name ??
          ""
      );

      setProcessOwner(
        savedWorkpaper.process_owner ??
          ""
      );

      setDepartment(
        savedWorkpaper.department ??
          ""
      );

      setWalkthroughDate(
        savedWorkpaper.walkthrough_date ??
          ""
      );

      setProcessDescription(
        savedWorkpaper.process_description ??
          ""
      );

      setProcessFlow(
        savedWorkpaper.process_flow ??
          ""
      );

      setKeyControls(
        savedWorkpaper.key_controls ??
          ""
      );

      setControlObjectives(
        savedWorkpaper.control_objectives ??
          ""
      );

      setControlOwner(
        savedWorkpaper.control_owner ??
          ""
      );

      setItApplications(
        savedWorkpaper.it_applications ??
          ""
      );

      setItDependencies(
        savedWorkpaper.it_dependencies ??
          ""
      );

      setInterfaces(
        savedWorkpaper.interfaces ??
          ""
      );

      setWalkthroughProcedure(
        savedWorkpaper.walkthrough_procedure ??
          ""
      );

      setEvidenceObtained(
        savedWorkpaper.evidence_obtained ??
          ""
      );

      setObservations(
        savedWorkpaper.observations ??
          ""
      );

      setExceptions(
        savedWorkpaper.exceptions ??
          ""
      );

      setConclusion(
        savedWorkpaper.conclusion ??
          ""
      );

      setSaved(true);

      console.log(
        "Phase 2.2 workpaper saved successfully:",
        savedWorkpaper
      );

      return true;
    } catch (err) {
      console.error(
        "Error saving Phase 2.2 workpaper:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save the Phase 2.2 workpaper."
      );

      setSaved(false);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return false;
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // CONTINUE TO PHASE 2.3
  // ---------------------------------------------------------------------------

  const handleContinue = async () => {
    setContinuing(true);
    setError("");

    try {
      const saveSuccessful =
        await handleSave();

      if (!saveSuccessful) {
        setContinuing(false);
        return;
      }

      console.log(
        "Phase 2.2 save successful. Navigating to Phase 2.3..."
      );

      router.push(
        `/engagements/${engagementId}/risk-assessment/2.3`
      );
    } catch (err) {
      console.error(
        "Error continuing from Phase 2.2:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to continue to the next procedure."
      );
    } finally {
      setContinuing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // BACK
  // ---------------------------------------------------------------------------

  const handleBack = () => {
    router.push(
      `/engagements/${engagementId}/risk-assessment`
    );
  };

  // ---------------------------------------------------------------------------
  // LOADING SCREEN
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-slate-50">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
              <div className="flex items-center gap-3 text-slate-600">
                <Loader2 className="h-6 w-6 animate-spin" />

                <span className="text-sm font-medium">
                  Loading Phase 2.2...
                </span>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // PAGE
  // ---------------------------------------------------------------------------

  return (
    <AppLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-8">
          {/* ---------------------------------------------------------------- */}
          {/* HEADER                                                           */}
          {/* ---------------------------------------------------------------- */}

          <div className="mb-8">
            <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
              <span>Phase 2</span>

              <span>/</span>

              <span>Risk Assessment</span>

              <span>/</span>

              <span className="font-medium text-slate-700">
                2.2 Process Flow & Walkthroughs
              </span>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  Process Flow & Walkthroughs
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Map processes, controls, IT dependencies
                  and perform walkthrough procedures.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Current Engagement
                </div>

                <div className="mt-1 text-sm font-semibold text-slate-900">
                  Engagement #{engagementId}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Phase 2 — Risk Assessment
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* ERROR MESSAGE                                                    */}
          {/* ---------------------------------------------------------------- */}

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <div className="font-semibold">
                  Unable to complete action
                </div>

                <div className="mt-1 text-sm">
                  {error}
                </div>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* SAVED MESSAGE                                                    */}
          {/* ---------------------------------------------------------------- */}

          {saved && !error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <CheckCircle2 className="h-5 w-5" />

              <div className="text-sm font-medium">
                Phase 2.2 workpaper saved successfully.
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* PROCESS INFORMATION                                               */}
          {/* ---------------------------------------------------------------- */}

          <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
                  <Workflow className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Process Information
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Identify the business process selected for walkthrough.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-2">
              {/* Process Name */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Process Name <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <Workflow className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />

                  <input
                    type="text"
                    value={processName}
                    onChange={(e) => {
                      setProcessName(
                        e.target.value
                      );
                      markAsEdited();
                    }}
                    placeholder="e.g. Revenue Cycle"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* Process Owner */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Process Owner <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />

                  <input
                    type="text"
                    value={processOwner}
                    onChange={(e) => {
                      setProcessOwner(
                        e.target.value
                      );
                      markAsEdited();
                    }}
                    placeholder="e.g. Finance Manager"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Department
                </label>

                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />

                  <input
                    type="text"
                    value={department}
                    onChange={(e) => {
                      setDepartment(
                        e.target.value
                      );
                      markAsEdited();
                    }}
                    placeholder="e.g. Finance"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* Walkthrough Date */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Walkthrough Date{" "}
                  <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />

                  <input
                    type="date"
                    value={walkthroughDate}
                    onChange={(e) => {
                      setWalkthroughDate(
                        e.target.value
                      );
                      markAsEdited();
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* PROCESS DESCRIPTION                                               */}
          {/* ---------------------------------------------------------------- */}

          <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                  <FileSearch className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Process Description & Flow
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Document how the process operates from initiation through recording and reporting.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-6">
              {/* Process Description */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Process Description{" "}
                  <span className="text-red-500">*</span>
                </label>

                <textarea
                  value={processDescription}
                  onChange={(e) => {
                    setProcessDescription(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  rows={5}
                  placeholder="Describe the process, including how transactions are initiated, authorized, processed, recorded and reported."
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Process Flow */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Process Flow
                </label>

                <textarea
                  value={processFlow}
                  onChange={(e) => {
                    setProcessFlow(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  rows={5}
                  placeholder="Describe the sequence of activities, systems, approvals and handoffs."
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* CONTROLS                                                         */}
          {/* ---------------------------------------------------------------- */}

          <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Key Controls
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Identify key controls and their objectives and owners.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-2">
              {/* Key Controls */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Key Controls
                </label>

                <textarea
                  value={keyControls}
                  onChange={(e) => {
                    setKeyControls(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  rows={4}
                  placeholder="List the key controls identified within the process."
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Control Objectives */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Control Objectives
                </label>

                <textarea
                  value={controlObjectives}
                  onChange={(e) => {
                    setControlObjectives(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  rows={4}
                  placeholder="Describe what each key control is designed to achieve."
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Control Owner */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Control Owner
                </label>

                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />

                  <input
                    type="text"
                    value={controlOwner}
                    onChange={(e) => {
                      setControlOwner(
                        e.target.value
                      );
                      markAsEdited();
                    }}
                    placeholder="e.g. Finance Manager"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* IT DEPENDENCIES                                                  */}
          {/* ---------------------------------------------------------------- */}

          <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-2 text-purple-700">
                  <Monitor className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    IT Applications & Dependencies
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Document systems, IT dependencies and interfaces relevant to the process.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-2">
              {/* IT Applications */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  IT Applications
                </label>

                <textarea
                  value={itApplications}
                  onChange={(e) => {
                    setItApplications(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  rows={4}
                  placeholder="List ERP systems, accounting systems, applications or tools used."
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* IT Dependencies */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  IT Dependencies
                </label>

                <textarea
                  value={itDependencies}
                  onChange={(e) => {
                    setItDependencies(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  rows={4}
                  placeholder="Describe relevant automated controls, reports, configurations or IT dependencies."
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Interfaces */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Interfaces
                </label>

                <textarea
                  value={interfaces}
                  onChange={(e) => {
                    setInterfaces(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  rows={4}
                  placeholder="Describe interfaces between systems or processes."
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* WALKTHROUGH                                                      */}
          {/* ---------------------------------------------------------------- */}

          <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                  <FileSearch className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Walkthrough Procedures
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Record the procedures performed and evidence obtained.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-6">
              {/* Walkthrough Procedure */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Walkthrough Procedure{" "}
                  <span className="text-red-500">*</span>
                </label>

                <textarea
                  value={walkthroughProcedure}
                  onChange={(e) => {
                    setWalkthroughProcedure(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  rows={6}
                  placeholder="Describe the walkthrough procedures performed, including the transaction selected and steps traced."
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Evidence Obtained */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Evidence Obtained
                </label>

                <textarea
                  value={evidenceObtained}
                  onChange={(e) => {
                    setEvidenceObtained(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  rows={5}
                  placeholder="Describe documents, reports, system screenshots, approvals or other audit evidence obtained."
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* OBSERVATIONS                                                      */}
          {/* ---------------------------------------------------------------- */}

          <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-100 p-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Observations & Exceptions
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Document walkthrough observations, exceptions and matters requiring further audit attention.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-2">
              {/* Observations */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Observations
                </label>

                <textarea
                  value={observations}
                  onChange={(e) => {
                    setObservations(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  rows={5}
                  placeholder="Document observations identified during the walkthrough."
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Exceptions */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Exceptions
                </label>

                <textarea
                  value={exceptions}
                  onChange={(e) => {
                    setExceptions(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  rows={5}
                  placeholder="Document any control exceptions, deviations or deficiencies identified."
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* CONCLUSION                                                       */}
          {/* ---------------------------------------------------------------- */}

          <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Walkthrough Conclusion
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Summarize the auditor's conclusion from the walkthrough.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Conclusion
              </label>

              <textarea
                value={conclusion}
                onChange={(e) => {
                  setConclusion(
                    e.target.value
                  );
                  markAsEdited();
                }}
                rows={6}
                placeholder="Summarize whether the process and controls operated as understood and identify any matters requiring further consideration."
                className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* NAVIGATION                                                       */}
          {/* ---------------------------------------------------------------- */}

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            {/* Back */}
            <button
              type="button"
              onClick={handleBack}
              disabled={
                saving || continuing
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />

              Back
            </button>

            <div className="flex flex-col gap-3 sm:flex-row">
              {/* Save */}
              <button
                type="button"
                onClick={() =>
                  handleSave()
                }
                disabled={
                  saving ||
                  continuing
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-300 bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />

                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />

                    Saved
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />

                    Save
                  </>
                )}
              </button>

              {/* Continue */}
              <button
                type="button"
                onClick={
                  handleContinue
                }
                disabled={
                  saving ||
                  continuing
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {continuing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />

                    Saving & Continuing...
                  </>
                ) : (
                  <>
                    Continue to 2.3

                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}