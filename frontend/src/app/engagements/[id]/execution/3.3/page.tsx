
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "../../../../../components/layout/AppLayout";

import {
  ArrowLeft,
  Save,
  CheckCircle2,
  CircleAlert,
  ShieldAlert,
  FileSearch,
  BarChart3,
  Scale,
  AlertTriangle,
  ChevronRight,
  Database,
} from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:8000/api";

interface FraudJournalEntryAssessment {
  id?: number;
  engagement: number;
  engagement_code?: string;

  population_description: string;
  population_period: string;
  total_population: number | null;

  selection_method: string;
  selected_entries: number | null;
  selection_rationale: string;

  journal_entry_testing: string;
  testing_period: string;
  journal_entry_criteria: string;
  journal_entry_evidence: string;

  management_override_procedures: string;
  override_results: string;

  data_analytics_anomalies: string;
  anomaly_analysis: string;

  possible_fraud_indicators: string;
  fraud_risk_assessment: string;

  exceptions: string;
  exceptions_count: number;
  exception_resolution: string;

  auditor_conclusion: string;
  fraud_implication: string;
  further_procedures_required: boolean;

  created_at?: string;
  updated_at?: string;
}

const emptyAssessment: FraudJournalEntryAssessment = {
  engagement: 0,

  population_description: "",
  population_period: "",
  total_population: null,

  selection_method: "Risk-based",
  selected_entries: null,
  selection_rationale: "",

  journal_entry_testing: "",
  testing_period: "",
  journal_entry_criteria: "",
  journal_entry_evidence: "",

  management_override_procedures: "",
  override_results: "",

  data_analytics_anomalies: "",
  anomaly_analysis: "",

  possible_fraud_indicators: "",
  fraud_risk_assessment: "",

  exceptions: "",
  exceptions_count: 0,
  exception_resolution: "",

  auditor_conclusion: "",
  fraud_implication: "",
  further_procedures_required: false,
};

export default function FraudJournalEntryProceduresPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = Number(params.id);

  const [assessment, setAssessment] =
    useState<FraudJournalEntryAssessment>({
      ...emptyAssessment,
      engagement: engagementId,
    });

  const [assessmentId, setAssessmentId] =
    useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [saved, setSaved] = useState(false);

  const [successMessage, setSuccessMessage] =
    useState("");

  const [error, setError] = useState("");

  // ==========================================================
  // GET AUTHENTICATION TOKEN
  // ==========================================================

  const getAuthToken = () => {
    if (typeof window === "undefined") {
      return null;
    }

    /*
     * Try the common token names used by the AUD application.
     *
     * This makes the page compatible with the existing
     * authentication implementation if the token was stored
     * under one of these names.
     */

    const tokenKeys = [
      "access_token",
      "accessToken",
      "token",
      "authToken",
      "jwt",
    ];

    for (const key of tokenKeys) {
      const value =
        localStorage.getItem(key);

      if (value) {
        return value;
      }
    }

    /*
     * Some applications store the complete user/auth object.
     */

    const possibleObjects = [
      "auth",
      "user",
      "currentUser",
      "userData",
    ];

    for (const key of possibleObjects) {
      const raw =
        localStorage.getItem(key);

      if (!raw) {
        continue;
      }

      try {
        const parsed = JSON.parse(raw);

        if (parsed?.access) {
          return parsed.access;
        }

        if (parsed?.access_token) {
          return parsed.access_token;
        }

        if (parsed?.accessToken) {
          return parsed.accessToken;
        }

        if (parsed?.token) {
          return parsed.token;
        }

        if (parsed?.jwt) {
          return parsed.jwt;
        }
      } catch {
        // Ignore invalid JSON and continue.
      }
    }

    return null;
  };

  // ==========================================================
  // AUTHENTICATED HEADERS
  // ==========================================================

  const getHeaders = (
    includeContentType = false
  ): HeadersInit => {
    const token = getAuthToken();

    const headers: HeadersInit = {
      Accept: "application/json",
    };

    if (includeContentType) {
      headers["Content-Type"] =
        "application/json";
    }

    if (token) {
      headers["Authorization"] =
        `Bearer ${token}`;
    }

    return headers;
  };

  // ==========================================================
  // LOAD EXISTING WORKPAPER
  // ==========================================================

  useEffect(() => {
    if (
      !engagementId ||
      Number.isNaN(engagementId)
    ) {
      setError("Invalid engagement ID.");
      setLoading(false);
      return;
    }

    const loadAssessment = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccessMessage("");

        const token = getAuthToken();

        if (!token) {
          setError(
            "Authentication token was not found. Please log in again."
          );

          setLoading(false);
          return;
        }

        const url =
          `${API_BASE_URL}/fraud-journal-entry-assessments/` +
          `?engagement=${engagementId}`;

        console.log(
          "Loading Phase 3.3:",
          url
        );

        const response = await fetch(
          url,
          {
            method: "GET",
            headers: getHeaders(),
            cache: "no-store",
          }
        );

        const responseText =
          await response.text();

        let data: any = null;

        try {
          data = responseText
            ? JSON.parse(responseText)
            : null;
        } catch {
          data = responseText;
        }

        console.log(
          "Phase 3.3 LOAD RESPONSE:",
          {
            status: response.status,
            statusText:
              response.statusText,
            data,
          }
        );

        if (response.status === 401 ||
            response.status === 403) {
          throw new Error(
            "Authentication failed. Please log out and log in again."
          );
        }

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status} ${response.statusText}: ` +
              `${
                typeof data === "string"
                  ? data
                  : JSON.stringify(data)
              }`
          );
        }

        let records: any[] = [];

        if (Array.isArray(data)) {
          records = data;
        } else if (
          data &&
          Array.isArray(data.results)
        ) {
          records = data.results;
        } else if (
          data &&
          typeof data === "object" &&
          data.id
        ) {
          records = [data];
        }

        if (records.length > 0) {
          const existing = records[0];

          setAssessment({
            ...emptyAssessment,
            ...existing,
            engagement: engagementId,
          });

          setAssessmentId(
            existing.id ?? null
          );

          setSaved(true);
        } else {
          setAssessment({
            ...emptyAssessment,
            engagement: engagementId,
          });

          setAssessmentId(null);
          setSaved(false);
        }
      } catch (err) {
        console.error(
          "Error loading Phase 3.3:",
          err
        );

        const message =
          err instanceof Error
            ? err.message
            : "Unknown error";

        setError(
          `Failed to load the Phase 3.3 workpaper. ${message}`
        );
      } finally {
        setLoading(false);
      }
    };

    loadAssessment();
  }, [engagementId]);

  // ==========================================================
  // UPDATE FIELD
  // ==========================================================

  const updateField = <
    K extends keyof FraudJournalEntryAssessment
  >(
    field: K,
    value: FraudJournalEntryAssessment[K]
  ) => {
    setAssessment((current) => ({
      ...current,
      [field]: value,
    }));

    setSaved(false);
    setSuccessMessage("");
    setError("");
  };

  // ==========================================================
  // VALIDATION
  // ==========================================================

  const validateForm = () => {
    setError("");

    if (!assessment.selection_method) {
      setError(
        "Please select a journal entry selection method."
      );

      return false;
    }

    if (
      assessment.total_population !== null &&
      assessment.selected_entries !== null &&
      assessment.selected_entries >
        assessment.total_population
    ) {
      setError(
        "Selected entries cannot exceed the total population."
      );

      return false;
    }

    if (
      assessment.exceptions_count > 0 &&
      !assessment.exceptions.trim()
    ) {
      setError(
        "Please describe the exceptions identified."
      );

      return false;
    }

    if (
      assessment.further_procedures_required &&
      !assessment.fraud_implication.trim()
    ) {
      setError(
        "Please document the fraud implication or further procedure required."
      );

      return false;
    }

    return true;
  };

  // ==========================================================
  // BUILD API PAYLOAD
  // ==========================================================

  const buildPayload = () => {
    return {
      engagement: engagementId,

      population_description:
        assessment.population_description,

      population_period:
        assessment.population_period,

      total_population:
        assessment.total_population ===
          null ||
        assessment.total_population ===
          undefined ||
        assessment.total_population === 0
          ? null
          : Number(
              assessment.total_population
            ),

      selection_method:
        assessment.selection_method,

      selected_entries:
        assessment.selected_entries ===
          null ||
        assessment.selected_entries ===
          undefined ||
        assessment.selected_entries === 0
          ? null
          : Number(
              assessment.selected_entries
            ),

      selection_rationale:
        assessment.selection_rationale,

      journal_entry_testing:
        assessment.journal_entry_testing,

      testing_period:
        assessment.testing_period,

      journal_entry_criteria:
        assessment.journal_entry_criteria,

      journal_entry_evidence:
        assessment.journal_entry_evidence,

      management_override_procedures:
        assessment.management_override_procedures,

      override_results:
        assessment.override_results,

      data_analytics_anomalies:
        assessment.data_analytics_anomalies,

      anomaly_analysis:
        assessment.anomaly_analysis,

      possible_fraud_indicators:
        assessment.possible_fraud_indicators,

      fraud_risk_assessment:
        assessment.fraud_risk_assessment,

      exceptions:
        assessment.exceptions,

      exceptions_count:
        Number(
          assessment.exceptions_count
        ) || 0,

      exception_resolution:
        assessment.exception_resolution,

      auditor_conclusion:
        assessment.auditor_conclusion,

      fraud_implication:
        assessment.fraud_implication,

      further_procedures_required:
        assessment.further_procedures_required,
    };
  };

  // ==========================================================
  // SAVE
  // ==========================================================

  const saveAssessment = async () => {
    if (!validateForm()) {
      return false;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const token = getAuthToken();

      if (!token) {
        setError(
          "Authentication token was not found. Please log in again."
        );

        return false;
      }

      const payload =
        buildPayload();

      const isUpdating =
        assessmentId !== null;

      const url = isUpdating
        ? `${API_BASE_URL}/fraud-journal-entry-assessments/${assessmentId}/`
        : `${API_BASE_URL}/fraud-journal-entry-assessments/`;

      console.log(
        "Saving Phase 3.3:",
        {
          method: isUpdating
            ? "PATCH"
            : "POST",
          url,
          payload,
        }
      );

      const response =
        await fetch(url, {
          method: isUpdating
            ? "PATCH"
            : "POST",

          headers:
            getHeaders(true),

          body: JSON.stringify(
            payload
          ),
        });

      const responseText =
        await response.text();

      let responseData: any = null;

      try {
        responseData =
          responseText
            ? JSON.parse(
                responseText
              )
            : null;
      } catch {
        responseData =
          responseText;
      }

      console.log(
        "Phase 3.3 SAVE RESPONSE:",
        {
          status:
            response.status,
          statusText:
            response.statusText,
          data:
            responseData,
        }
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        throw new Error(
          "Authentication failed. Please log out and log in again."
        );
      }

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status} ${response.statusText}: ` +
            `${
              typeof responseData ===
              "string"
                ? responseData
                : JSON.stringify(
                    responseData
                  )
            }`
        );
      }

      if (
        !responseData ||
        typeof responseData !==
          "object"
      ) {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (responseData.id) {
        setAssessmentId(
          responseData.id
        );
      }

      setAssessment({
        ...emptyAssessment,
        ...responseData,
        engagement:
          engagementId,
      });

      setSaved(true);

      setSuccessMessage(
        isUpdating
          ? "Fraud and journal entry assessment updated successfully."
          : "Fraud and journal entry assessment saved successfully."
      );

      return true;
    } catch (err) {
      console.error(
        "Error saving Phase 3.3:",
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : "Unknown error";

      setError(
        `Failed to save the Phase 3.3 workpaper. ${message}`
      );

      return false;
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // CONTINUE
  // ==========================================================

  const handleContinue =
    async () => {
      const success =
        await saveAssessment();

      if (!success) {
        return;
      }

      router.push(
        `/engagements/${engagementId}/execution/3.4`
      );
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-700" />

            <p className="text-sm text-gray-600">
              Loading Phase 3.3 workpaper...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* HEADER */}

        <div className="mb-8">
          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="mb-5 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft
              size={17}
            />
            Back
          </button>

          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="mb-2 flex items-center gap-3">

                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  Phase 3 / 3.3
                </span>

                {saved && (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                    <CheckCircle2
                      size={14}
                    />
                    Saved
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Fraud &amp; Journal Entry Procedures
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                Perform journal entry testing and evaluate
                potential fraud indicators, management override
                risks, anomalies, exceptions, and required
                follow-up procedures.
              </p>
            </div>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">

            <CircleAlert
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0">
              <p className="font-semibold">
                Unable to load or save
              </p>

              <p className="mt-1 break-words text-sm">
                {error}
              </p>

              {error.includes(
                "log in again"
              ) && (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/login"
                    )
                  }
                  className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                >
                  Go to Login
                </button>
              )}
            </div>
          </div>
        )}

        {/* SUCCESS */}

        {successMessage && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">

            <CheckCircle2
              size={20}
            />

            <p className="text-sm font-medium">
              {successMessage}
            </p>
          </div>
        )}

        {/* JOURNAL ENTRY POPULATION */}

        <section className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center gap-3">

              <div className="rounded-lg bg-gray-100 p-2">
                <Database
                  size={20}
                />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Journal Entry Population
                </h2>

                <p className="text-sm text-gray-500">
                  Define the population and document how
                  journal entries were selected.
                </p>
              </div>

            </div>
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-2">

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Population Description
              </label>

              <textarea
                value={
                  assessment.population_description
                }
                onChange={(e) =>
                  updateField(
                    "population_description",
                    e.target.value
                  )
                }
                rows={4}
                placeholder="Describe the journal entry population obtained and the source of the population..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Population Period
              </label>

              <input
                type="text"
                value={
                  assessment.population_period
                }
                onChange={(e) =>
                  updateField(
                    "population_period",
                    e.target.value
                  )
                }
                placeholder="e.g. 1 July 2025 – 30 June 2026"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Total Journal Entries
              </label>

              <input
                type="number"
                min="0"
                value={
                  assessment.total_population ??
                  ""
                }
                onChange={(e) =>
                  updateField(
                    "total_population",
                    e.target.value === ""
                      ? null
                      : Number(
                          e.target.value
                        )
                  )
                }
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Selection Method
              </label>

              <select
                value={
                  assessment.selection_method
                }
                onChange={(e) =>
                  updateField(
                    "selection_method",
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              >
                <option value="Risk-based">
                  Risk-based
                </option>

                <option value="Random">
                  Random
                </option>

                <option value="Full Population">
                  Full Population
                </option>

                <option value="Data Analytics">
                  Data Analytics
                </option>

                <option value="Judgmental">
                  Judgmental
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Selected Entries
              </label>

              <input
                type="number"
                min="0"
                value={
                  assessment.selected_entries ??
                  ""
                }
                onChange={(e) =>
                  updateField(
                    "selected_entries",
                    e.target.value === ""
                      ? null
                      : Number(
                          e.target.value
                        )
                  )
                }
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Selection Rationale
              </label>

              <textarea
                value={
                  assessment.selection_rationale
                }
                onChange={(e) =>
                  updateField(
                    "selection_rationale",
                    e.target.value
                  )
                }
                rows={3}
                placeholder="Explain why this selection method was considered appropriate..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

          </div>
        </section>

        {/* JOURNAL ENTRY TESTING */}

        <section className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center gap-3">

              <div className="rounded-lg bg-gray-100 p-2">
                <FileSearch
                  size={20}
                />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Journal Entry Testing
                </h2>

                <p className="text-sm text-gray-500">
                  Document procedures performed over the
                  selected journal entries.
                </p>
              </div>

            </div>
          </div>

          <div className="space-y-6 p-6">

            <div className="grid gap-6 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Testing Period
                </label>

                <input
                  type="text"
                  value={
                    assessment.testing_period
                  }
                  onChange={(e) =>
                    updateField(
                      "testing_period",
                      e.target.value
                    )
                  }
                  placeholder="Period covered by testing"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Testing Criteria
                </label>

                <input
                  type="text"
                  value={
                    assessment.journal_entry_criteria
                  }
                  onChange={(e) =>
                    updateField(
                      "journal_entry_criteria",
                      e.target.value
                    )
                  }
                  placeholder="Criteria used to identify entries"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                />
              </div>

            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Journal Entry Testing
              </label>

              <textarea
                value={
                  assessment.journal_entry_testing
                }
                onChange={(e) =>
                  updateField(
                    "journal_entry_testing",
                    e.target.value
                  )
                }
                rows={5}
                placeholder="Describe the journal entry testing procedures performed, including unusual postings, manual entries, period-end entries, unusual accounts, preparer/approver considerations, and other relevant criteria..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Audit Evidence
              </label>

              <textarea
                value={
                  assessment.journal_entry_evidence
                }
                onChange={(e) =>
                  updateField(
                    "journal_entry_evidence",
                    e.target.value
                  )
                }
                rows={4}
                placeholder="Document evidence inspected and how the entries were substantiated..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

          </div>
        </section>

        {/* MANAGEMENT OVERRIDE */}

        <section className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center gap-3">

              <div className="rounded-lg bg-gray-100 p-2">
                <ShieldAlert
                  size={20}
                />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Management Override Procedures
                </h2>

                <p className="text-sm text-gray-500">
                  Document procedures addressing the risk of
                  management override of controls.
                </p>
              </div>

            </div>
          </div>

          <div className="space-y-6 p-6">

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Procedures Performed
              </label>

              <textarea
                value={
                  assessment.management_override_procedures
                }
                onChange={(e) =>
                  updateField(
                    "management_override_procedures",
                    e.target.value
                  )
                }
                rows={5}
                placeholder="Describe procedures performed to address management override risk..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Results
              </label>

              <textarea
                value={
                  assessment.override_results
                }
                onChange={(e) =>
                  updateField(
                    "override_results",
                    e.target.value
                  )
                }
                rows={4}
                placeholder="Document the results of management override procedures..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

          </div>
        </section>

        {/* DATA ANALYTICS */}

        <section className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center gap-3">

              <div className="rounded-lg bg-gray-100 p-2">
                <BarChart3
                  size={20}
                />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Data Analytics &amp; Anomalies
                </h2>

                <p className="text-sm text-gray-500">
                  Document analytics performed and unusual
                  journal entry patterns identified.
                </p>
              </div>

            </div>
          </div>

          <div className="space-y-6 p-6">

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Data Analytics &amp; Anomalies
              </label>

              <textarea
                value={
                  assessment.data_analytics_anomalies
                }
                onChange={(e) =>
                  updateField(
                    "data_analytics_anomalies",
                    e.target.value
                  )
                }
                rows={5}
                placeholder="Describe analytics performed and anomalies identified, such as unusual amounts, dates, users, accounts, descriptions, or posting patterns..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Anomaly Analysis
              </label>

              <textarea
                value={
                  assessment.anomaly_analysis
                }
                onChange={(e) =>
                  updateField(
                    "anomaly_analysis",
                    e.target.value
                  )
                }
                rows={4}
                placeholder="Explain how identified anomalies were investigated and resolved..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

          </div>
        </section>

        {/* FRAUD INDICATORS */}

        <section className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center gap-3">

              <div className="rounded-lg bg-gray-100 p-2">
                <AlertTriangle
                  size={20}
                />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Possible Fraud Indicators
                </h2>

                <p className="text-sm text-gray-500">
                  Evaluate indicators that may suggest
                  fraudulent financial reporting or
                  misappropriation.
                </p>
              </div>

            </div>
          </div>

          <div className="space-y-6 p-6">

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Possible Fraud Indicators
              </label>

              <textarea
                value={
                  assessment.possible_fraud_indicators
                }
                onChange={(e) =>
                  updateField(
                    "possible_fraud_indicators",
                    e.target.value
                  )
                }
                rows={5}
                placeholder="Document any fraud indicators identified during journal entry testing..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Fraud Risk Assessment
              </label>

              <textarea
                value={
                  assessment.fraud_risk_assessment
                }
                onChange={(e) =>
                  updateField(
                    "fraud_risk_assessment",
                    e.target.value
                  )
                }
                rows={4}
                placeholder="Assess the significance of identified fraud indicators..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

          </div>
        </section>

        {/* EXCEPTIONS */}

        <section className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center gap-3">

              <div className="rounded-lg bg-gray-100 p-2">
                <CircleAlert
                  size={20}
                />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Exceptions
                </h2>

                <p className="text-sm text-gray-500">
                  Document exceptions identified from the
                  journal entry procedures.
                </p>
              </div>

            </div>
          </div>

          <div className="space-y-6 p-6">

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Number of Exceptions
              </label>

              <input
                type="number"
                min="0"
                value={
                  assessment.exceptions_count
                }
                onChange={(e) =>
                  updateField(
                    "exceptions_count",
                    Number(
                      e.target.value
                    ) || 0
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200 md:max-w-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Exceptions
              </label>

              <textarea
                value={
                  assessment.exceptions
                }
                onChange={(e) =>
                  updateField(
                    "exceptions",
                    e.target.value
                  )
                }
                rows={5}
                placeholder="Describe exceptions, unusual transactions, unsupported entries, or other matters identified..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Exception Resolution
              </label>

              <textarea
                value={
                  assessment.exception_resolution
                }
                onChange={(e) =>
                  updateField(
                    "exception_resolution",
                    e.target.value
                  )
                }
                rows={4}
                placeholder="Document how exceptions were investigated, resolved, or communicated..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

          </div>
        </section>

        {/* CONCLUSION */}

        <section className="mb-8 rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center gap-3">

              <div className="rounded-lg bg-gray-100 p-2">
                <Scale
                  size={20}
                />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Auditor Conclusion
                </h2>

                <p className="text-sm text-gray-500">
                  Conclude on the results of journal entry
                  testing and fraud-related procedures.
                </p>
              </div>

            </div>
          </div>

          <div className="space-y-6 p-6">

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Auditor Conclusion
              </label>

              <textarea
                value={
                  assessment.auditor_conclusion
                }
                onChange={(e) =>
                  updateField(
                    "auditor_conclusion",
                    e.target.value
                  )
                }
                rows={6}
                placeholder="Document the auditor's overall conclusion from the procedures performed..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Fraud Implication / Further Action
              </label>

              <textarea
                value={
                  assessment.fraud_implication
                }
                onChange={(e) =>
                  updateField(
                    "fraud_implication",
                    e.target.value
                  )
                }
                rows={4}
                placeholder="Document any implications for the audit, fraud risk assessment, communication, or further audit procedures..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4">

              <input
                type="checkbox"
                checked={
                  assessment.further_procedures_required
                }
                onChange={(e) =>
                  updateField(
                    "further_procedures_required",
                    e.target.checked
                  )
                }
                className="h-4 w-4 rounded border-gray-300"
              />

              <div>
                <p className="text-sm font-medium text-gray-800">
                  Further audit procedures required
                </p>

                <p className="text-xs text-gray-500">
                  Select if the results require additional
                  audit work or follow-up.
                </p>
              </div>

            </label>

          </div>
        </section>

        {/* ACTION BAR */}

        <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white/95 px-1 py-4 backdrop-blur">

          <div className="flex items-center justify-between gap-4">

            <button
              type="button"
              onClick={() =>
                router.back()
              }
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft
                size={17}
              />
              Back
            </button>

            <div className="flex items-center gap-3">

              <button
                type="button"
                onClick={
                  saveAssessment
                }
                disabled={saving}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save
                  size={17}
                />

                {saving
                  ? "Saving..."
                  : "Save Workpaper"}
              </button>

              <button
                type="button"
                onClick={
                  handleContinue
                }
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue

                <ChevronRight
                  size={17}
                />
              </button>

            </div>

          </div>
        </div>

      </div>
    </AppLayout>
  );
}

