"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
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

const API_BASE_URL = "http://localhost:8000/api";

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

function getCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie.split("; ");

  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split("=");

    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();

    return text || null;
  } catch {
    return null;
  }
}

function formatApiError(
  data: unknown,
  fallback: string
): string {
  if (!data) {
    return fallback;
  }

  if (typeof data === "string") {
    return data;
  }

  if (
    typeof data === "object" &&
    data !== null
  ) {
    const objectData = data as Record<string, unknown>;

    if (
      typeof objectData.detail === "string" &&
      objectData.detail.trim()
    ) {
      return objectData.detail;
    }

    if (
      typeof objectData.message === "string" &&
      objectData.message.trim()
    ) {
      return objectData.message;
    }

    const fieldErrors = Object.entries(objectData)
      .map(([field, messages]) => {
        if (Array.isArray(messages)) {
          return `${field}: ${messages.join(", ")}`;
        }

        if (
          typeof messages === "object" &&
          messages !== null
        ) {
          return `${field}: ${JSON.stringify(messages)}`;
        }

        return `${field}: ${String(messages)}`;
      })
      .filter(Boolean)
      .join(" | ");

    if (fieldErrors) {
      return fieldErrors;
    }
  }

  return fallback;
}

export default function ProcessFlowWalkthroughsPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  // =========================================================
  // FORM STATE
  // =========================================================

  const [processName, setProcessName] = useState("");
  const [processOwner, setProcessOwner] = useState("");
  const [department, setDepartment] = useState("");
  const [walkthroughDate, setWalkthroughDate] = useState("");

  const [processDescription, setProcessDescription] =
    useState("");
  const [processFlow, setProcessFlow] = useState("");

  const [keyControls, setKeyControls] = useState("");
  const [controlObjectives, setControlObjectives] =
    useState("");
  const [controlOwner, setControlOwner] = useState("");

  const [itApplications, setItApplications] =
    useState("");
  const [itDependencies, setItDependencies] =
    useState("");
  const [interfaces, setInterfaces] = useState("");

  const [walkthroughProcedure, setWalkthroughProcedure] =
    useState("");
  const [evidenceObtained, setEvidenceObtained] =
    useState("");

  const [observations, setObservations] = useState("");
  const [exceptions, setExceptions] = useState("");

  const [conclusion, setConclusion] = useState("");

  // =========================================================
  // PAGE STATE
  // =========================================================

  const [workpaperId, setWorkpaperId] = useState<
    number | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // =========================================================
  // COMMON AUTHENTICATED REQUEST
  // =========================================================

  const authenticatedFetch = async (
    url: string,
    options: RequestInit = {}
  ) => {
    const csrfToken = getCookie("csrftoken");

    const headers = new Headers(options.headers);

    headers.set("Accept", "application/json");

    if (options.body) {
      headers.set("Content-Type", "application/json");
    }

    if (csrfToken) {
      headers.set("X-CSRFToken", csrfToken);
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  };

  // =========================================================
  // LOAD EXISTING WORKPAPER
  // =========================================================

  useEffect(() => {
    if (!engagementId) {
      setLoading(false);
      setError("Invalid engagement ID.");
      return;
    }

    const loadWorkpaper = async () => {
      setLoading(true);
      setError("");

      try {
        const url =
          `${API_BASE_URL}/process-flow-walkthroughs/` +
          `?engagement=${encodeURIComponent(
            String(engagementId)
          )}`;

        console.log(
          "=== PHASE 2.2 LOAD START ==="
        );
        console.log("LOAD URL:", url);

        const response =
          await authenticatedFetch(url, {
            method: "GET",
          });

        const data = await parseResponse(response);

        console.log(
          "PHASE 2.2 LOAD STATUS:",
          response.status
        );

        console.log(
          "PHASE 2.2 LOAD RESPONSE:",
          data
        );

        if (!response.ok) {
          throw new Error(
            formatApiError(
              data,
              `Failed to load Phase 2.2 workpaper. HTTP ${response.status}.`
            )
          );
        }

        let workpapers: ProcessFlowWalkthrough[] = [];

        if (Array.isArray(data)) {
          workpapers = data;
        } else if (
          data &&
          typeof data === "object" &&
          Array.isArray(
            (data as {
              results?: ProcessFlowWalkthrough[];
            }).results
          )
        ) {
          workpapers = (
            data as {
              results: ProcessFlowWalkthrough[];
            }
          ).results;
        } else if (
          data &&
          typeof data === "object" &&
          typeof (data as ProcessFlowWalkthrough).id ===
            "number"
        ) {
          workpapers = [
            data as ProcessFlowWalkthrough,
          ];
        }

        if (workpapers.length === 0) {
          console.log(
            "No Phase 2.2 workpaper exists yet."
          );

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

        setProcessName(
          workpaper.process_name ?? ""
        );

        setProcessOwner(
          workpaper.process_owner ?? ""
        );

        setDepartment(
          workpaper.department ?? ""
        );

        setWalkthroughDate(
          workpaper.walkthrough_date ?? ""
        );

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

  // =========================================================
  // MARK FORM AS EDITED
  // =========================================================

  const markAsEdited = () => {
    setSaved(false);

    if (error) {
      setError("");
    }
  };

  // =========================================================
  // SAVE WORKPAPER
  // =========================================================

  const handleSave = async (): Promise<boolean> => {
    if (!engagementId) {
      setError("Invalid engagement ID.");
      return false;
    }

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

    const workpaperData = {
      engagement: Number(engagementId),

      process_name: processName.trim(),
      process_owner: processOwner.trim(),
      department: department.trim(),
      walkthrough_date: walkthroughDate,

      process_description:
        processDescription.trim(),
      process_flow: processFlow.trim(),

      key_controls: keyControls.trim(),
      control_objectives:
        controlObjectives.trim(),
      control_owner: controlOwner.trim(),

      it_applications:
        itApplications.trim(),
      it_dependencies:
        itDependencies.trim(),
      interfaces: interfaces.trim(),

      walkthrough_procedure:
        walkthroughProcedure.trim(),
      evidence_obtained:
        evidenceObtained.trim(),

      observations: observations.trim(),
      exceptions: exceptions.trim(),

      conclusion: conclusion.trim(),
    };

    console.log(
      "=== PHASE 2.2 SAVE START ==="
    );

    console.log(
      "ENGAGEMENT ID:",
      engagementId
    );

    console.log(
      "WORKPAPER ID:",
      workpaperId
    );

    console.log(
      "SAVE PAYLOAD:",
      workpaperData
    );

    try {
      let response: Response;

      // =====================================================
      // UPDATE EXISTING WORKPAPER
      // =====================================================

      if (workpaperId !== null) {
        const url =
          `${API_BASE_URL}/process-flow-walkthroughs/` +
          `${workpaperId}/`;

        console.log(
          "PHASE 2.2 SAVE METHOD: PATCH"
        );

        console.log(
          "PATCH URL:",
          url
        );

        response =
          await authenticatedFetch(url, {
            method: "PATCH",
            body: JSON.stringify(
              workpaperData
            ),
          });
      }

      // =====================================================
      // CREATE NEW WORKPAPER
      // =====================================================

      else {
        const url =
          `${API_BASE_URL}/process-flow-walkthroughs/`;

        console.log(
          "PHASE 2.2 SAVE METHOD: POST"
        );

        console.log(
          "POST URL:",
          url
        );

        response =
          await authenticatedFetch(url, {
            method: "POST",
            body: JSON.stringify(
              workpaperData
            ),
          });
      }

      const data = await parseResponse(response);

      console.log(
        "=== PHASE 2.2 SAVE RESPONSE ==="
      );

      console.log(
        "HTTP STATUS:",
        response.status
      );

      console.log(
        "DATABASE RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          formatApiError(
            data,
            `Failed to save Phase 2.2 workpaper. HTTP ${response.status}.`
          )
        );
      }

      if (
        !data ||
        typeof data !== "object" ||
        typeof (data as ProcessFlowWalkthrough)
          .id !== "number"
      ) {
        throw new Error(
          "The server saved the workpaper but returned an invalid response."
        );
      }

      const savedWorkpaper =
        data as ProcessFlowWalkthrough;

      // =====================================================
      // UPDATE STATE FROM DATABASE RESPONSE
      // =====================================================

      setWorkpaperId(
        savedWorkpaper.id
      );

      setProcessName(
        savedWorkpaper.process_name ?? ""
      );

      setProcessOwner(
        savedWorkpaper.process_owner ?? ""
      );

      setDepartment(
        savedWorkpaper.department ?? ""
      );

      setWalkthroughDate(
        savedWorkpaper.walkthrough_date ?? ""
      );

      setProcessDescription(
        savedWorkpaper.process_description ?? ""
      );

      setProcessFlow(
        savedWorkpaper.process_flow ?? ""
      );

      setKeyControls(
        savedWorkpaper.key_controls ?? ""
      );

      setControlObjectives(
        savedWorkpaper.control_objectives ??
          ""
      );

      setControlOwner(
        savedWorkpaper.control_owner ?? ""
      );

      setItApplications(
        savedWorkpaper.it_applications ?? ""
      );

      setItDependencies(
        savedWorkpaper.it_dependencies ??
          ""
      );

      setInterfaces(
        savedWorkpaper.interfaces ?? ""
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
        savedWorkpaper.observations ?? ""
      );

      setExceptions(
        savedWorkpaper.exceptions ?? ""
      );

      setConclusion(
        savedWorkpaper.conclusion ?? ""
      );

      setSaved(true);

      console.log(
        "Phase 2.2 workpaper saved successfully."
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

  // =========================================================
  // SAVE + CONTINUE
  // =========================================================

  const handleContinue = async () => {
    if (saving || continuing) {
      return;
    }

    setContinuing(true);
    setError("");

    try {
      const saveSuccessful =
        await handleSave();

      if (!saveSuccessful) {
        return;
      }

      console.log(
        "Phase 2.2 saved successfully."
      );

      console.log(
        "Navigating to Phase 2.3..."
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

  // =========================================================
  // BACK
  // =========================================================

  const handleBack = () => {
    router.push(
      `/engagements/${engagementId}/risk-assessment`
    );
  };

  // =========================================================
  // LOADING
  // =========================================================

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

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <AppLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

          {/* =================================================
              HEADER
          ================================================== */}

          <div className="mb-6 flex items-start gap-4">
            <button
              type="button"
              onClick={handleBack}
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-blue-600">
                  Phase 2
                </span>

                <span className="text-slate-400">
                  /
                </span>

                <span className="text-slate-500">
                  Risk Assessment
                </span>

                <span className="text-slate-400">
                  /
                </span>

                <span className="text-slate-500">
                  2.2 Process Flow & Walkthroughs
                </span>
              </div>

              <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                Process Flow & Walkthroughs
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Map processes, controls, IT dependencies
                and perform walkthrough procedures.
              </p>
            </div>
          </div>

          {/* =================================================
              ERROR
          ================================================== */}

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
              <CircleAlert
                size={20}
                className="mt-0.5 shrink-0"
              />

              <div>
                <p className="font-semibold">
                  Unable to complete action
                </p>

                <p className="mt-1 text-sm">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* =================================================
              SUCCESS
          ================================================== */}

          {saved && !error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <CheckCircle2
                size={20}
                className="shrink-0"
              />

              <div>
                <p className="font-semibold">
                  Workpaper saved
                </p>

                <p className="text-sm">
                  Your Phase 2.2 workpaper has been saved
                  successfully.
                </p>
              </div>
            </div>
          )}

          {/* =================================================
              ENGAGEMENT SUMMARY
          ================================================== */}

          <section className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Current Engagement
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Engagement #{engagementId}
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Phase 2 — Risk Assessment
                </p>
              </div>

              <div className="hidden h-12 w-12 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm sm:flex">
                <Workflow size={23} />
              </div>
            </div>
          </section>

          {/* =================================================
              PROCESS INFORMATION
          ================================================== */}

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <Building2
                size={22}
                className="text-blue-600"
              />

              <div>
                <h2 className="font-semibold text-slate-900">
                  Process Information
                </h2>

                <p className="text-sm text-slate-500">
                  Identify the business process selected
                  for walkthrough.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Process Name *
                </label>

                <input
                  type="text"
                  value={processName}
                  onChange={(e) => {
                    setProcessName(e.target.value);
                    markAsEdited();
                  }}
                  placeholder="e.g. Revenue and Receivables"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Process Owner *
                </label>

                <div className="relative">
                  <User
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={processOwner}
                    onChange={(e) => {
                      setProcessOwner(
                        e.target.value
                      );
                      markAsEdited();
                    }}
                    placeholder="Name / role"
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Department
                </label>

                <input
                  type="text"
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    markAsEdited();
                  }}
                  placeholder="e.g. Finance"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Walkthrough Date *
                </label>

                <div className="relative">
                  <CalendarDays
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="date"
                    value={walkthroughDate}
                    onChange={(e) => {
                      setWalkthroughDate(
                        e.target.value
                      );
                      markAsEdited();
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              PROCESS DESCRIPTION
          ================================================== */}

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <Workflow
                size={22}
                className="text-blue-600"
              />

              <div>
                <h2 className="font-semibold text-slate-900">
                  Process Description & Flow
                </h2>

                <p className="text-sm text-slate-500">
                  Document how the process operates from
                  initiation through recording and reporting.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Process Description *
                </label>

                <textarea
                  rows={5}
                  value={processDescription}
                  onChange={(e) => {
                    setProcessDescription(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  placeholder="Describe how the process works..."
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Process Flow
                </label>

                <textarea
                  rows={6}
                  value={processFlow}
                  onChange={(e) => {
                    setProcessFlow(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  placeholder="Example: Initiation → Authorization → Processing → Recording → Reporting"
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </section>

          {/* =================================================
              KEY CONTROLS
          ================================================== */}

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <ShieldCheck
                size={22}
                className="text-blue-600"
              />

              <div>
                <h2 className="font-semibold text-slate-900">
                  Key Controls
                </h2>

                <p className="text-sm text-slate-500">
                  Identify key controls and their objectives
                  and owners.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Key Controls
                </label>

                <textarea
                  rows={5}
                  value={keyControls}
                  onChange={(e) => {
                    setKeyControls(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  placeholder="List the key controls..."
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Control Objectives
                </label>

                <textarea
                  rows={5}
                  value={controlObjectives}
                  onChange={(e) => {
                    setControlObjectives(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  placeholder="Describe what the controls are designed to achieve..."
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Control Owner
                </label>

                <input
                  type="text"
                  value={controlOwner}
                  onChange={(e) => {
                    setControlOwner(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  placeholder="Person / role responsible for the control"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </section>

          {/* =================================================
              IT APPLICATIONS
          ================================================== */}

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <Monitor
                size={22}
                className="text-blue-600"
              />

              <div>
                <h2 className="font-semibold text-slate-900">
                  IT Applications & Dependencies
                </h2>

                <p className="text-sm text-slate-500">
                  Document systems, IT dependencies and
                  interfaces relevant to the process.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  IT Applications
                </label>

                <textarea
                  rows={4}
                  value={itApplications}
                  onChange={(e) => {
                    setItApplications(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  placeholder="ERP, accounting system, payroll system, etc."
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  IT Dependencies
                </label>

                <textarea
                  rows={4}
                  value={itDependencies}
                  onChange={(e) => {
                    setItDependencies(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  placeholder="Describe important IT dependencies..."
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Interfaces
                </label>

                <textarea
                  rows={4}
                  value={interfaces}
                  onChange={(e) => {
                    setInterfaces(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  placeholder="Describe interfaces between systems..."
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </section>

          {/* =================================================
              WALKTHROUGH PROCEDURES
          ================================================== */}

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <FileSearch
                size={22}
                className="text-blue-600"
              />

              <div>
                <h2 className="font-semibold text-slate-900">
                  Walkthrough Procedures
                </h2>

                <p className="text-sm text-slate-500">
                  Record the procedures performed and
                  evidence obtained.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Walkthrough Procedure *
                </label>

                <textarea
                  rows={6}
                  value={walkthroughProcedure}
                  onChange={(e) => {
                    setWalkthroughProcedure(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  placeholder="Describe the walkthrough steps performed..."
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Evidence Obtained
                </label>

                <textarea
                  rows={5}
                  value={evidenceObtained}
                  onChange={(e) => {
                    setEvidenceObtained(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  placeholder="List documents, screenshots, reports or other evidence obtained..."
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </section>

          {/* =================================================
              OBSERVATIONS
          ================================================== */}

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <AlertTriangle
                size={22}
                className="text-amber-600"
              />

              <div>
                <h2 className="font-semibold text-slate-900">
                  Observations & Exceptions
                </h2>

                <p className="text-sm text-slate-500">
                  Document walkthrough observations,
                  exceptions and matters requiring further
                  audit attention.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Observations
                </label>

                <textarea
                  rows={5}
                  value={observations}
                  onChange={(e) => {
                    setObservations(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  placeholder="Document observations..."
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Exceptions
                </label>

                <textarea
                  rows={5}
                  value={exceptions}
                  onChange={(e) => {
                    setExceptions(
                      e.target.value
                    );
                    markAsEdited();
                  }}
                  placeholder="Document exceptions or control deviations..."
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </section>

          {/* =================================================
              CONCLUSION
          ================================================== */}

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <CheckCircle2
                size={22}
                className="text-blue-600"
              />

              <div>
                <h2 className="font-semibold text-slate-900">
                  Walkthrough Conclusion
                </h2>

                <p className="text-sm text-slate-500">
                  Summarize the auditor's conclusion from
                  the walkthrough.
                </p>
              </div>
            </div>

            <textarea
              rows={6}
              value={conclusion}
              onChange={(e) => {
                setConclusion(
                  e.target.value
                );
                markAsEdited();
              }}
              placeholder="Summarize the conclusion from the walkthrough..."
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </section>

          {/* =================================================
              FOOTER ACTIONS
          ================================================== */}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Phase 2.2 Workpaper
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Save your workpaper before continuing to
                  Phase 2.3.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={
                    saving || continuing
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft size={17} />
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={
                    saving || continuing
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {continuing || saving ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />

                      {continuing
                        ? "Saving & Continuing..."
                        : "Saving..."}
                    </>
                  ) : (
                    <>
                      <Save size={17} />

                      Save & Continue to 2.3

                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

        </div>
      </div>
    </AppLayout>
  );
}