"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import AppLayout from "../../../../../components/layout/AppLayout";

import {
  ArrowLeft,
  AlertTriangle,
  ShieldAlert,
  FileSearch,
  Save,
  CheckCircle2,
  ChevronDown,
  Plus,
  Trash2,
  ClipboardCheck,
  Scale,
  CircleAlert,
  Loader2,
  ArrowRight,
} from "lucide-react";

type Assertion =
  | "Existence"
  | "Completeness"
  | "Accuracy"
  | "Cut-off"
  | "Classification"
  | "Valuation"
  | "Rights & Obligations"
  | "Presentation & Disclosure";

type RiskLevel = "Low" | "Medium" | "High" | "Significant";

type RiskItem = {
  id: number;
  account: string;
  riskDescription: string;
  assertions: Assertion[];
  fraudRisk: boolean;
  complexity: boolean;
  subjectivity: boolean;
  uncertainty: boolean;
  managementBias: boolean;
  likelihood: RiskLevel;
  magnitude: RiskLevel;
  significantRisk: boolean;
  controlResponse: string;
  rationale: string;
};

type ApiRiskPoint = {
  id: number;
  engagement: number;
  engagement_code?: string;
  sort_order: number;
  account: string;
  risk_description: string;
  assertions: Assertion[];
  fraud_risk: boolean;
  complexity: boolean;
  subjectivity: boolean;
  uncertainty: boolean;
  management_bias: boolean;
  likelihood: RiskLevel;
  magnitude: RiskLevel;
  significant_risk: boolean;
  control_response: string;
  rationale: string;
  created_at?: string;
  updated_at?: string;
};

const API_BASE_URL = "http://localhost:8000/api";

/*
 * ============================================================
 * CSRF COOKIE HELPER
 * ============================================================
 */

const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie.split(";");

  for (const cookie of cookies) {
    const trimmedCookie = cookie.trim();

    if (trimmedCookie.startsWith(`${name}=`)) {
      return decodeURIComponent(
        trimmedCookie.substring(name.length + 1)
      );
    }
  }

  return null;
};

/*
 * ============================================================
 * API RESPONSE HELPER
 * ============================================================
 */

const parseResponse = async (
  response: Response
): Promise<any> => {
  const contentType =
    response.headers.get("content-type") || "";

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
};

/*
 * ============================================================
 * API ERROR FORMATTER
 * ============================================================
 */

const formatApiError = (
  data: any,
  status: number
): string => {
  if (!data) {
    return `Request failed (${status}).`;
  }

  if (typeof data === "string") {
    return data;
  }

  if (data.detail) {
    return String(data.detail);
  }

  if (data.message) {
    return String(data.message);
  }

  if (data.error) {
    return String(data.error);
  }

  if (typeof data === "object") {
    const messages: string[] = [];

    Object.entries(data).forEach(
      ([field, value]) => {
        if (Array.isArray(value)) {
          messages.push(
            `${field}: ${value.join(", ")}`
          );
        } else if (
          typeof value === "string"
        ) {
          messages.push(`${field}: ${value}`);
        } else if (value !== null) {
          messages.push(
            `${field}: ${JSON.stringify(value)}`
          );
        }
      }
    );

    if (messages.length > 0) {
      return messages.join(" | ");
    }

    try {
      return JSON.stringify(data);
    } catch {
      return `Request failed (${status}).`;
    }
  }

  return `Request failed (${status}).`;
};

/*
 * ============================================================
 * AUTHENTICATED FETCH
 * ============================================================
 */

const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const csrfToken = getCookie("csrftoken");

  const headers = new Headers(
    options.headers || {}
  );

  headers.set("Accept", "application/json");

  if (options.body) {
    headers.set(
      "Content-Type",
      "application/json"
    );
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

/*
 * ============================================================
 * ASSERTIONS
 * ============================================================
 */

const assertionOptions: Assertion[] = [
  "Existence",
  "Completeness",
  "Accuracy",
  "Cut-off",
  "Classification",
  "Valuation",
  "Rights & Obligations",
  "Presentation & Disclosure",
];

/*
 * ============================================================
 * RISK LEVELS
 * ============================================================
 */

const riskLevelOptions: RiskLevel[] = [
  "Low",
  "Medium",
  "High",
  "Significant",
];

/*
 * ============================================================
 * EMPTY RISK
 * ============================================================
 */

const createEmptyRisk = (
  id: number
): RiskItem => ({
  id,
  account: "",
  riskDescription: "",
  assertions: [],
  fraudRisk: false,
  complexity: false,
  subjectivity: false,
  uncertainty: false,
  managementBias: false,
  likelihood: "Medium",
  magnitude: "Medium",
  significantRisk: false,
  controlResponse: "",
  rationale: "",
});

/*
 * ============================================================
 * API -> FRONTEND
 * ============================================================
 */

const apiToRiskItem = (
  risk: ApiRiskPoint
): RiskItem => ({
  id: risk.id,
  account: risk.account || "",
  riskDescription:
    risk.risk_description || "",
  assertions: Array.isArray(risk.assertions)
    ? risk.assertions
    : [],
  fraudRisk: Boolean(risk.fraud_risk),
  complexity: Boolean(risk.complexity),
  subjectivity: Boolean(risk.subjectivity),
  uncertainty: Boolean(risk.uncertainty),
  managementBias: Boolean(
    risk.management_bias
  ),
  likelihood:
    risk.likelihood || "Medium",
  magnitude:
    risk.magnitude || "Medium",
  significantRisk: Boolean(
    risk.significant_risk
  ),
  controlResponse:
    risk.control_response || "",
  rationale: risk.rationale || "",
});

/*
 * ============================================================
 * FRONTEND -> API
 * ============================================================
 */

const riskItemToApi = (
  item: RiskItem,
  engagementId: number,
  sortOrder: number
) => ({
  engagement: engagementId,
  sort_order: sortOrder,
  account: item.account.trim(),
  risk_description:
    item.riskDescription.trim(),
  assertions: item.assertions,
  fraud_risk: item.fraudRisk,
  complexity: item.complexity,
  subjectivity: item.subjectivity,
  uncertainty: item.uncertainty,
  management_bias: item.managementBias,
  likelihood: item.likelihood,
  magnitude: item.magnitude,
  significant_risk:
    item.significantRisk,
  control_response:
    item.controlResponse.trim(),
  rationale: item.rationale.trim(),
});

/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function RiskPointsPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = Number(params.id);

  const [riskItems, setRiskItems] =
    useState<RiskItem[]>([
      createEmptyRisk(1),
    ]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * ============================================================
   * LOAD EXISTING RISK POINTS
   * ============================================================
   */

  useEffect(() => {
    if (
      !engagementId ||
      Number.isNaN(engagementId)
    ) {
      setError(
        "Invalid engagement ID."
      );

      setLoading(false);

      return;
    }

    const loadRiskPoints =
      async () => {
        try {
          setLoading(true);
          setError("");

          const response =
            await authenticatedFetch(
              `${API_BASE_URL}/risk-points/?engagement=${engagementId}`,
              {
                method: "GET",
              }
            );

          const data =
            await parseResponse(
              response
            );

          if (!response.ok) {
            throw new Error(
              `Failed to load risk points (${response.status}): ${formatApiError(
                data,
                response.status
              )}`
            );
          }

          /*
           * DRF can return:
           *
           * 1. Array
           * 2. Paginated response:
           *    { results: [] }
           */

          const records: ApiRiskPoint[] =
            Array.isArray(data)
              ? data
              : Array.isArray(
                  data?.results
                )
              ? data.results
              : [];

          const mappedRisks =
            records
              .sort(
                (a, b) =>
                  (a.sort_order ?? 0) -
                    (b.sort_order ?? 0) ||
                  a.id - b.id
              )
              .map(apiToRiskItem);

          if (
            mappedRisks.length > 0
          ) {
            setRiskItems(
              mappedRisks
            );
          } else {
            setRiskItems([
              createEmptyRisk(1),
            ]);
          }

          setSaved(false);
        } catch (err) {
          console.error(
            "Error loading risk points:",
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load risk points."
          );
        } finally {
          setLoading(false);
        }
      };

    loadRiskPoints();
  }, [engagementId]);

  /*
   * ============================================================
   * UPDATE RISK ITEM
   * ============================================================
   */

  const updateRiskItem = (
    id: number,
    field: keyof RiskItem,
    value:
      | string
      | boolean
      | Assertion[]
      | RiskLevel
  ) => {
    setRiskItems(
      (currentItems) =>
        currentItems.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  [field]: value,
                }
              : item
        )
    );

    setSaved(false);
    setError("");
  };

  /*
   * ============================================================
   * TOGGLE ASSERTION
   * ============================================================
   */

  const toggleAssertion = (
    id: number,
    assertion: Assertion
  ) => {
    setRiskItems(
      (currentItems) =>
        currentItems.map(
          (item) => {
            if (item.id !== id) {
              return item;
            }

            const alreadySelected =
              item.assertions.includes(
                assertion
              );

            return {
              ...item,
              assertions:
                alreadySelected
                  ? item.assertions.filter(
                      (
                        existing
                      ) =>
                        existing !==
                        assertion
                    )
                  : [
                      ...item.assertions,
                      assertion,
                    ],
            };
          }
        )
    );

    setSaved(false);
    setError("");
  };

  /*
   * ============================================================
   * ADD RISK
   * ============================================================
   */

  const addRiskItem = () => {
    const newRisk =
      createEmptyRisk(
        Date.now()
      );

    setRiskItems(
      (currentItems) => [
        ...currentItems,
        newRisk,
      ]
    );

    setSaved(false);
    setError("");
  };

  /*
   * ============================================================
   * DELETE RISK
   * ============================================================
   */

  const removeRiskItem = async (
    id: number
  ) => {
    if (riskItems.length === 1) {
      alert(
        "At least one risk point must remain."
      );

      return;
    }

    /*
     * Existing database records
     * have normal PostgreSQL integer IDs.
     *
     * Temporary frontend records
     * use Date.now().
     */

    if (id < 1000000000000) {
      try {
        const response =
          await authenticatedFetch(
            `${API_BASE_URL}/risk-points/${id}/`,
            {
              method: "DELETE",
            }
          );

        const data =
          await parseResponse(
            response
          );

        if (!response.ok) {
          throw new Error(
            `Failed to delete risk point (${response.status}): ${formatApiError(
              data,
              response.status
            )}`
          );
        }
      } catch (err) {
        console.error(
          "Error deleting risk point:",
          err
        );

        alert(
          err instanceof Error
            ? err.message
            : "Unable to delete risk point."
        );

        return;
      }
    }

    setRiskItems(
      (currentItems) =>
        currentItems.filter(
          (item) =>
            item.id !== id
        )
    );

    setSaved(false);
    setError("");
  };

  /*
   * ============================================================
   * VALIDATE
   * ============================================================
   */

  const validateRiskItems =
    () => {
      const incompleteRisk =
        riskItems.some(
          (item) =>
            !item.account.trim() ||
            !item.riskDescription.trim() ||
            item.assertions.length ===
              0 ||
            !item.rationale.trim()
        );

      if (incompleteRisk) {
        alert(
          "Please complete Account / Disclosure, Risk Description, at least one Assertion, and Auditor Rationale for every risk."
        );

        return false;
      }

      return true;
    };

  /*
   * ============================================================
   * SAVE WORKPAPER
   * ============================================================
   */

  const handleSave =
    async (): Promise<boolean> => {
      if (!validateRiskItems()) {
        return false;
      }

      if (
        !engagementId ||
        Number.isNaN(engagementId)
      ) {
        alert(
          "Invalid engagement ID."
        );

        return false;
      }

      try {
        setSaving(true);
        setSaved(false);
        setError("");

        const savedItems: RiskItem[] =
          [];

        for (
          let index = 0;
          index <
            riskItems.length;
          index++
        ) {
          const item =
            riskItems[index];

          const payload =
            riskItemToApi(
              item,
              engagementId,
              index
            );

          const isExistingDatabaseRecord =
            item.id <
            1000000000000;

          let response: Response;

          /*
           * ==================================================
           * UPDATE EXISTING RECORD
           * ==================================================
           */

          if (
            isExistingDatabaseRecord
          ) {
            response =
              await authenticatedFetch(
                `${API_BASE_URL}/risk-points/${item.id}/`,
                {
                  method: "PATCH",
                  body: JSON.stringify(
                    payload
                  ),
                }
              );
          }

          /*
           * ==================================================
           * CREATE NEW RECORD
           * ==================================================
           */

          else {
            response =
              await authenticatedFetch(
                `${API_BASE_URL}/risk-points/`,
                {
                  method: "POST",
                  body: JSON.stringify(
                    payload
                  ),
                }
              );
          }

          const data =
            await parseResponse(
              response
            );

          if (!response.ok) {
            console.error(
              "Risk point API error:",
              data
            );

            throw new Error(
              `Failed to save risk point (${response.status}): ${formatApiError(
                data,
                response.status
              )}`
            );
          }

          if (!data) {
            throw new Error(
              "The server returned an empty response after saving the risk point."
            );
          }

          const savedRisk =
            data as ApiRiskPoint;

          savedItems.push(
            apiToRiskItem(
              savedRisk
            )
          );
        }

        /*
         * Replace temporary frontend IDs
         * with real PostgreSQL IDs.
         */

        setRiskItems(
          savedItems
        );

        setSaved(true);

        console.log(
          "Risk Points Workpaper saved:",
          savedItems
        );

        return true;
      } catch (err) {
        console.error(
          "Error saving risk points:",
          err
        );

        const message =
          err instanceof Error
            ? err.message
            : "Unable to save risk points.";

        setError(message);

        alert(
          `Could not save Risk Points.\n\n${message}`
        );

        return false;
      } finally {
        setSaving(false);
      }
    };

  /*
   * ============================================================
   * CONTINUE TO 2.4
   * ============================================================
   */

  const handleContinue =
    async () => {
      const success =
        await handleSave();

      if (!success) {
        return;
      }

      router.push(
        `/engagements/${engagementId}/risk-assessment/2.4`
      );
    };

  /*
   * ============================================================
   * BACK
   * ============================================================
   */

  const handleBack = () => {
    router.push(
      `/engagements/${engagementId}/risk-assessment`
    );
  };

  /*
   * ============================================================
   * RISK BADGE
   * ============================================================
   */

  const getRiskBadgeClass = (
    level: RiskLevel
  ) => {
    switch (level) {
      case "Low":
        return "bg-green-100 text-green-700 border-green-200";

      case "Medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";

      case "High":
        return "bg-orange-100 text-orange-700 border-orange-200";

      case "Significant":
        return "bg-red-100 text-red-700 border-red-200";

      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  /*
   * ============================================================
   * SUMMARY
   * ============================================================
   */

  const totalRisks =
    riskItems.length;

  const significantRisks =
    riskItems.filter(
      (item) =>
        item.significantRisk
    ).length;

  const highLikelihood =
    riskItems.filter(
      (item) =>
        item.likelihood ===
          "High" ||
        item.likelihood ===
          "Significant"
    ).length;

  const fraudRisks =
    riskItems.filter(
      (item) =>
        item.fraudRisk
    ).length;

  /*
   * ============================================================
   * LOADING STATE
   * ============================================================
   */

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-slate-50">
          <div className="mx-auto max-w-7xl px-6 py-10">
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="flex items-center gap-3 text-slate-600">
                <Loader2 className="h-6 w-6 animate-spin" />

                <span className="text-sm font-medium">
                  Loading Risk Points...
                </span>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <AppLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-8">

          {/* ================================================= */}
          {/* HEADER */}
          {/* ================================================= */}

          <div className="mb-8">
            <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
              <span>
                Phase 2
              </span>

              <span>/</span>

              <span>
                Risk Assessment & Strategy
              </span>

              <span>/</span>

              <span className="font-medium text-slate-700">
                Risk Points
              </span>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  Risk Assessment & Strategy
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Identify financial statement risks,
                  evaluate inherent risk factors, assess
                  likelihood and magnitude, and document
                  the planned audit response.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <ClipboardCheck className="h-5 w-5 text-slate-600" />

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Section
                  </p>

                  <p className="text-sm font-semibold text-slate-900">
                    2.3 Risk Points
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================= */}
          {/* ERROR */}
          {/* ================================================= */}

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <p className="font-semibold text-red-800">
                  Unable to load or save Risk Points
                </p>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* GUIDANCE */}
          {/* ================================================= */}

          <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                <FileSearch className="h-5 w-5 text-blue-700" />
              </div>

              <div>
                <h2 className="font-semibold text-blue-900">
                  Risk assessment guidance
                </h2>

                <p className="mt-1 text-sm leading-6 text-blue-800">
                  Identify what could go wrong at the
                  financial statement assertion level.
                  Consider fraud, complexity, subjectivity,
                  estimation uncertainty and management bias.
                  Significant risks require specific audit
                  consideration and an appropriate response.
                </p>
              </div>
            </div>
          </div>

          {/* ================================================= */}
          {/* RISK ITEMS */}
          {/* ================================================= */}

          <div className="space-y-6">
            {riskItems.map(
              (item, index) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >

                  {/* ======================================= */}
                  {/* RISK HEADER */}
                  {/* ======================================= */}

                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>

                      <div>
                        <h2 className="font-semibold text-slate-900">
                          Risk Point{" "}
                          {index + 1}
                        </h2>

                        <p className="text-xs text-slate-500">
                          Document the identified risk
                        </p>
                      </div>
                    </div>

                    {riskItems.length >
                      1 && (
                      <button
                        type="button"
                        onClick={() =>
                          removeRiskItem(
                            item.id
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />

                        Remove
                      </button>
                    )}
                  </div>

                  <div className="space-y-8 p-6">

                    {/* ===================================== */}
                    {/* ACCOUNT */}
                    {/* ===================================== */}

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">
                        Relevant Account / Disclosure
                      </label>

                      <input
                        type="text"
                        value={
                          item.account
                        }
                        onChange={(e) =>
                          updateRiskItem(
                            item.id,
                            "account",
                            e.target.value
                          )
                        }
                        placeholder="e.g. Revenue, Trade Receivables, Inventory"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    {/* ===================================== */}
                    {/* RISK DESCRIPTION */}
                    {/* ===================================== */}

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">
                        What Could Go Wrong?
                      </label>

                      <textarea
                        rows={4}
                        value={
                          item.riskDescription
                        }
                        onChange={(e) =>
                          updateRiskItem(
                            item.id,
                            "riskDescription",
                            e.target.value
                          )
                        }
                        placeholder="Describe the potential misstatement, error, omission or fraud risk..."
                        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    {/* ===================================== */}
                    {/* ASSERTIONS */}
                    {/* ===================================== */}

                    <div>
                      <div className="mb-3">
                        <label className="block text-sm font-semibold text-slate-800">
                          Financial Statement Assertions
                        </label>

                        <p className="mt-1 text-xs text-slate-500">
                          Select all assertions relevant to
                          this risk.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {assertionOptions.map(
                          (
                            assertion
                          ) => {
                            const selected =
                              item.assertions.includes(
                                assertion
                              );

                            return (
                              <button
                                key={
                                  assertion
                                }
                                type="button"
                                onClick={() =>
                                  toggleAssertion(
                                    item.id,
                                    assertion
                                  )
                                }
                                className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                                  selected
                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span>
                                    {
                                      assertion
                                    }
                                  </span>

                                  {selected && (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
                                  )}
                                </div>
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>

                    {/* ===================================== */}
                    {/* INHERENT RISK FACTORS */}
                    {/* ===================================== */}

                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-slate-600" />

                        <label className="text-sm font-semibold text-slate-800">
                          Inherent Risk Factors
                        </label>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
                        {[
                          {
                            field:
                              "fraudRisk" as const,
                            label:
                              "Fraud Risk",
                          },
                          {
                            field:
                              "complexity" as const,
                            label:
                              "Complexity",
                          },
                          {
                            field:
                              "subjectivity" as const,
                            label:
                              "Subjectivity",
                          },
                          {
                            field:
                              "uncertainty" as const,
                            label:
                              "Estimation Uncertainty",
                          },
                          {
                            field:
                              "managementBias" as const,
                            label:
                              "Management Bias",
                          },
                        ].map(
                          ({
                            field,
                            label,
                          }) => (
                            <label
                              key={
                                field
                              }
                              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                                item[field]
                                  ? "border-orange-300 bg-orange-50"
                                  : "border-slate-200 bg-white hover:bg-slate-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  item[
                                    field
                                  ]
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateRiskItem(
                                    item.id,
                                    field,
                                    e.target
                                      .checked
                                  )
                                }
                                className="h-4 w-4 rounded border-slate-300"
                              />

                              <span className="text-sm font-medium text-slate-700">
                                {
                                  label
                                }
                              </span>
                            </label>
                          )
                        )}
                      </div>
                    </div>

                    {/* ===================================== */}
                    {/* LIKELIHOOD / MAGNITUDE */}
                    {/* ===================================== */}

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

                      {/* LIKELIHOOD */}

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-800">
                          Likelihood
                        </label>

                        <div className="relative">
                          <select
                            value={
                              item.likelihood
                            }
                            onChange={(e) =>
                              updateRiskItem(
                                item.id,
                                "likelihood",
                                e.target
                                  .value as RiskLevel
                              )
                            }
                            className={`w-full appearance-none rounded-xl border px-4 py-3 pr-10 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 ${getRiskBadgeClass(
                              item.likelihood
                            )}`}
                          >
                            {riskLevelOptions.map(
                              (
                                level
                              ) => (
                                <option
                                  key={
                                    level
                                  }
                                  value={
                                    level
                                  }
                                >
                                  {
                                    level
                                  }
                                </option>
                              )
                            )}
                          </select>

                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        </div>
                      </div>

                      {/* MAGNITUDE */}

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-800">
                          Magnitude
                        </label>

                        <div className="relative">
                          <select
                            value={
                              item.magnitude
                            }
                            onChange={(e) =>
                              updateRiskItem(
                                item.id,
                                "magnitude",
                                e.target
                                  .value as RiskLevel
                              )
                            }
                            className={`w-full appearance-none rounded-xl border px-4 py-3 pr-10 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 ${getRiskBadgeClass(
                              item.magnitude
                            )}`}
                          >
                            {riskLevelOptions.map(
                              (
                                level
                              ) => (
                                <option
                                  key={
                                    level
                                  }
                                  value={
                                    level
                                  }
                                >
                                  {
                                    level
                                  }
                                </option>
                              )
                            )}
                          </select>

                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        </div>
                      </div>
                    </div>

                    {/* ===================================== */}
                    {/* SIGNIFICANT RISK */}
                    {/* ===================================== */}

                    <div
                      className={`rounded-xl border p-4 ${
                        item.significantRisk
                          ? "border-red-300 bg-red-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={
                            item.significantRisk
                          }
                          onChange={(e) =>
                            updateRiskItem(
                              item.id,
                              "significantRisk",
                              e.target.checked
                            )
                          }
                          className="mt-1 h-4 w-4 rounded border-slate-300"
                        />

                        <div>
                          <p
                            className={`text-sm font-semibold ${
                              item.significantRisk
                                ? "text-red-800"
                                : "text-slate-800"
                            }`}
                          >
                            Significant Risk
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            Select this when the risk requires
                            specific audit consideration due to
                            its nature, likelihood, magnitude,
                            fraud risk, complexity or other
                            relevant factors.
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* ===================================== */}
                    {/* CONTROL RESPONSE */}
                    {/* ===================================== */}

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">
                        Related Control / Audit Response
                      </label>

                      <textarea
                        rows={4}
                        value={
                          item.controlResponse
                        }
                        onChange={(e) =>
                          updateRiskItem(
                            item.id,
                            "controlResponse",
                            e.target.value
                          )
                        }
                        placeholder="Describe the relevant control and/or planned audit response..."
                        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    {/* ===================================== */}
                    {/* RATIONALE */}
                    {/* ===================================== */}

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-800">
                        Auditor Rationale / Conclusion
                      </label>

                      <textarea
                        rows={4}
                        value={
                          item.rationale
                        }
                        onChange={(e) =>
                          updateRiskItem(
                            item.id,
                            "rationale",
                            e.target.value
                          )
                        }
                        placeholder="Explain why this risk assessment and conclusion are appropriate..."
                        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          {/* ================================================= */}
          {/* ADD RISK */}
          {/* ================================================= */}

          <button
            type="button"
            onClick={
              addRiskItem
            }
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-5 text-sm font-semibold text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
          >
            <Plus className="h-5 w-5" />

            Add Another Risk Point
          </button>

          {/* ================================================= */}
          {/* SUMMARY */}
          {/* ================================================= */}

          <div className="mt-8">
            <div className="mb-4 flex items-center gap-2">
              <Scale className="h-5 w-5 text-slate-600" />

              <h2 className="text-lg font-semibold text-slate-900">
                Risk Assessment Summary
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Total Risks
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {
                    totalRisks
                  }
                </p>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-red-500">
                  Significant Risks
                </p>

                <p className="mt-2 text-3xl font-bold text-red-700">
                  {
                    significantRisks
                  }
                </p>
              </div>

              <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-orange-500">
                  High Likelihood
                </p>

                <p className="mt-2 text-3xl font-bold text-orange-700">
                  {
                    highLikelihood
                  }
                </p>
              </div>

              <div className="rounded-xl border border-purple-200 bg-purple-50 p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-purple-500">
                  Fraud Risks
                </p>

                <p className="mt-2 text-3xl font-bold text-purple-700">
                  {
                    fraudRisks
                  }
                </p>
              </div>

            </div>
          </div>

          {/* ================================================= */}
          {/* ACTION BAR */}
          {/* ================================================= */}

          <div className="sticky bottom-0 mt-10 border-t border-slate-200 bg-slate-50/95 py-5 backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <button
                type="button"
                onClick={
                  handleBack
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4" />

                Back
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">

                <button
                  type="button"
                  onClick={() =>
                    handleSave()
                  }
                  disabled={
                    saving
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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

                      Save Workpaper
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={
                    handleContinue
                  }
                  disabled={
                    saving
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Continue to 2.4

                  <ArrowRight className="h-4 w-4" />
                </button>

              </div>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}