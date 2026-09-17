"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";

import {
  ArrowLeft,
  RefreshCw,
  ClipboardCheck,
  AlertTriangle,
  Save,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";

const API_BASE_URL = "http://localhost:8000/api";

interface InterimYearEndAssessment {
  id?: number;
  engagement: number;
  engagement_code?: string;

  control_name: string;
  interim_date: string;
  year_end_date: string;

  interim_testing: string;
  control_changes: string;
  remaining_period: string;
  additional_testing: string;
  exceptions: string;
  conclusion: string;

  created_at?: string;
  updated_at?: string;
}

/**
 * Get a browser cookie by name.
 *
 * Django uses the csrftoken cookie for CSRF protection on
 * POST/PATCH requests.
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

/**
 * Authenticated fetch helper.
 *
 * credentials: "include"
 * ----------------------
 * Sends the Django session cookie with the request.
 *
 * X-CSRFToken
 * -----------
 * Sends Django's CSRF token for POST/PATCH requests.
 */
const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const csrfToken = getCookie("csrftoken");

  const headers = new Headers(options.headers || {});

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

/**
 * Safely parse API responses.
 *
 * Some Django responses are JSON while other error responses
 * can occasionally be plain text.
 */
const parseResponse = async (response: Response): Promise<any> => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  return text || null;
};

/**
 * Convert Django / DRF errors into a readable message.
 */
const formatApiError = (
  data: any,
  status: number
): string => {
  if (!data) {
    return `Request failed with status ${status}.`;
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

    Object.entries(data).forEach(([field, value]) => {
      if (Array.isArray(value)) {
        messages.push(
          `${field}: ${value.join(", ")}`
        );
      } else if (typeof value === "string") {
        messages.push(`${field}: ${value}`);
      } else if (
        value !== null &&
        value !== undefined
      ) {
        messages.push(
          `${field}: ${JSON.stringify(value)}`
        );
      }
    });

    if (messages.length > 0) {
      return messages.join(" | ");
    }
  }

  return `Request failed with status ${status}.`;
};

export default function InterimYearEndPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = params.id as string;

  const [assessmentId, setAssessmentId] = useState<number | null>(
    null
  );

  const [controlName, setControlName] = useState("");
  const [interimDate, setInterimDate] = useState("");
  const [yearEndDate, setYearEndDate] = useState("");

  const [interimTesting, setInterimTesting] = useState("");
  const [controlChanges, setControlChanges] = useState("");
  const [remainingPeriod, setRemainingPeriod] = useState("");

  const [additionalTesting, setAdditionalTesting] = useState("");
  const [exceptions, setExceptions] = useState("");

  const [conclusion, setConclusion] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /*
   * ----------------------------------------------------------
   * LOAD EXISTING ASSESSMENT
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (!engagementId) {
      setLoading(false);
      return;
    }

    const loadAssessment = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await authenticatedFetch(
          `${API_BASE_URL}/interim-year-end-assessments/?engagement=${engagementId}`,
          {
            method: "GET",
          }
        );

        const data = await parseResponse(response);

        if (!response.ok) {
          console.error(
            "3.2 load API error:",
            data
          );

          throw new Error(
            formatApiError(data, response.status)
          );
        }

        /*
         * DRF can return either:
         *
         * [
         *   {...}
         * ]
         *
         * or:
         *
         * {
         *   results: [...]
         * }
         */
        const assessments: InterimYearEndAssessment[] =
          Array.isArray(data)
            ? data
            : Array.isArray(data?.results)
              ? data.results
              : [];

        /*
         * The API returns a list.
         * For this workpaper page we use the latest
         * available assessment.
         */
        if (assessments.length > 0) {
          const existing = assessments[0];

          setAssessmentId(existing.id ?? null);

          setControlName(
            existing.control_name || ""
          );

          setInterimDate(
            existing.interim_date || ""
          );

          setYearEndDate(
            existing.year_end_date || ""
          );

          setInterimTesting(
            existing.interim_testing || ""
          );

          setControlChanges(
            existing.control_changes || ""
          );

          setRemainingPeriod(
            existing.remaining_period || ""
          );

          setAdditionalTesting(
            existing.additional_testing || ""
          );

          setExceptions(
            existing.exceptions || ""
          );

          setConclusion(
            existing.conclusion || ""
          );

          setSaved(true);
        }
      } catch (err) {
        console.error(
          "Error loading 3.2 assessment:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load the existing assessment."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAssessment();
  }, [engagementId]);

  /*
   * ----------------------------------------------------------
   * VALIDATION
   * ----------------------------------------------------------
   */

  const validateForm = () => {
    if (!controlName.trim()) {
      setError("Control Name is required.");
      return false;
    }

    if (!interimDate) {
      setError(
        "Interim Testing Date is required."
      );
      return false;
    }

    if (!yearEndDate) {
      setError(
        "Year-End Date is required."
      );
      return false;
    }

    if (interimDate > yearEndDate) {
      setError(
        "Interim Testing Date cannot be after the Year-End Date."
      );
      return false;
    }

    if (!interimTesting.trim()) {
      setError(
        "Please document the interim testing performed."
      );
      return false;
    }

    if (!conclusion.trim()) {
      setError(
        "Auditor Conclusion is required."
      );
      return false;
    }

    return true;
  };

  /*
   * ----------------------------------------------------------
   * BUILD PAYLOAD
   * ----------------------------------------------------------
   */

  const buildPayload = () => {
    return {
      engagement: Number(engagementId),

      control_name: controlName.trim(),

      interim_date: interimDate,

      year_end_date: yearEndDate,

      interim_testing: interimTesting.trim(),

      control_changes: controlChanges.trim(),

      remaining_period: remainingPeriod.trim(),

      additional_testing:
        additionalTesting.trim(),

      exceptions: exceptions.trim(),

      conclusion: conclusion.trim(),
    };
  };

  /*
   * ----------------------------------------------------------
   * SAVE ASSESSMENT
   * ----------------------------------------------------------
   */

  const saveAssessment = async (): Promise<boolean> => {
    setSaved(false);
    setSuccessMessage("");
    setError("");

    if (!validateForm()) {
      return false;
    }

    try {
      setSaving(true);

      const payload = buildPayload();

      const isUpdating =
        assessmentId !== null;

      const url = isUpdating
        ? `${API_BASE_URL}/interim-year-end-assessments/${assessmentId}/`
        : `${API_BASE_URL}/interim-year-end-assessments/`;

      const response =
        await authenticatedFetch(url, {
          method: isUpdating
            ? "PATCH"
            : "POST",

          body: JSON.stringify(payload),
        });

      const responseData =
        await parseResponse(response);

      if (!response.ok) {
        console.error(
          "3.2 API validation error:",
          responseData
        );

        setError(
          formatApiError(
            responseData,
            response.status
          )
        );

        return false;
      }

      /*
       * Django returns the saved object.
       */
      if (responseData?.id) {
        setAssessmentId(
          Number(responseData.id)
        );
      }

      setSaved(true);

      setSuccessMessage(
        isUpdating
          ? "Assessment updated successfully."
          : "Assessment saved successfully."
      );

      return true;
    } catch (err) {
      console.error(
        "Error saving 3.2 assessment:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save the assessment."
      );

      return false;
    } finally {
      setSaving(false);
    }
  };

  /*
   * ----------------------------------------------------------
   * SAVE BUTTON
   * ----------------------------------------------------------
   */

  const handleSave = async () => {
    await saveAssessment();
  };

  /*
   * ----------------------------------------------------------
   * SAVE THEN CONTINUE
   * ----------------------------------------------------------
   */

  const handleContinue = async () => {
    const success =
      await saveAssessment();

    if (!success) {
      return;
    }

    router.push(
      `/engagements/${engagementId}/execution/3.3`
    );
  };

  /*
   * ----------------------------------------------------------
   * CLEAR MESSAGES
   * ----------------------------------------------------------
   */

  const clearMessages = () => {
    setSaved(false);
    setSuccessMessage("");
    setError("");
  };

  /*
   * ----------------------------------------------------------
   * LOADING
   * ----------------------------------------------------------
   */

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="flex min-h-[500px] items-center justify-center">
            <div className="flex items-center gap-3 rounded-xl border bg-white px-6 py-5 shadow-sm">
              <Loader2
                size={22}
                className="animate-spin text-blue-600"
              />

              <span className="text-sm font-medium text-gray-600">
                Loading interim-to-year-end assessment...
              </span>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  /*
   * ----------------------------------------------------------
   * PAGE
   * ----------------------------------------------------------
   */

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="mb-6 flex items-center gap-4">

          <button
            type="button"
            onClick={() =>
              router.push(
                `/engagements/${engagementId}/execution`
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white text-gray-600 transition hover:bg-gray-100"
          >
            <ArrowLeft size={19} />
          </button>

          <div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-600">
                Phase 3
              </span>

              <span className="text-gray-400">
                /
              </span>

              <span className="text-sm text-gray-500">
                3.2 Interim-to-Year-End
              </span>
            </div>

            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              Interim-to-Year-End Considerations
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Evaluate whether interim control testing can be
              rolled forward to year-end.
            </p>

          </div>

        </div>

        {/* ==================================================
            ENGAGEMENT INFORMATION
        ================================================== */}

        <section className="mb-6 rounded-xl border bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Current Engagement
              </p>

              <p className="mt-1 text-lg font-semibold text-gray-900">
                Engagement #{engagementId}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Interim-to-year-end control testing workpaper
              </p>
            </div>

            {assessmentId && (
              <div className="rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
                Assessment #{assessmentId}
              </div>
            )}

          </div>

        </section>

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">

            <div className="flex items-start gap-3">

              <AlertTriangle
                size={20}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div>
                <p className="font-semibold text-red-800">
                  Unable to save assessment
                </p>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>
              </div>

            </div>

          </div>
        )}

        {/* ==================================================
            SUCCESS
        ================================================== */}

        {successMessage && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">

            <div className="flex items-center gap-3">

              <CheckCircle2
                size={20}
                className="text-green-600"
              />

              <p className="text-sm font-medium text-green-800">
                {successMessage}
              </p>

            </div>

          </div>
        )}

        {/* ==================================================
            CONTROL TESTING PERIOD
        ================================================== */}

        <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">

          <div className="mb-5 flex items-center gap-3">

            <RefreshCw className="text-blue-600" />

            <div>
              <h2 className="font-semibold text-gray-900">
                Control Testing Period
              </h2>

              <p className="text-sm text-gray-500">
                Define the period covered by the testing.
              </p>
            </div>

          </div>

          <div className="grid gap-5 md:grid-cols-3">

            {/* CONTROL NAME */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Control Name *
              </label>

              <input
                value={controlName}
                onChange={(e) => {
                  setControlName(e.target.value);
                  clearMessages();
                }}
                placeholder="Control name"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* INTERIM DATE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Interim Testing Date *
              </label>

              <input
                type="date"
                value={interimDate}
                onChange={(e) => {
                  setInterimDate(e.target.value);
                  clearMessages();
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* YEAR END DATE */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Year-End Date *
              </label>

              <input
                type="date"
                value={yearEndDate}
                onChange={(e) => {
                  setYearEndDate(e.target.value);
                  clearMessages();
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

          </div>

        </section>

        {/* ==================================================
            INTERIM TESTING
        ================================================== */}

        <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">

          <div className="mb-4 flex items-center gap-3">

            <ClipboardCheck className="text-purple-600" />

            <h2 className="font-semibold text-gray-900">
              Interim Testing Performed
            </h2>

          </div>

          <textarea
            value={interimTesting}
            onChange={(e) => {
              setInterimTesting(e.target.value);
              clearMessages();
            }}
            rows={5}
            placeholder="Describe the testing performed during the interim period..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

        </section>

        {/* ==================================================
            CONTROL CHANGES
        ================================================== */}

        <section className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-6">

          <div className="mb-4 flex items-center gap-3">

            <AlertTriangle className="text-orange-600" />

            <div>
              <h2 className="font-semibold text-gray-900">
                Control Changes
              </h2>

              <p className="text-sm text-gray-600">
                Identify changes that may affect the
                continued reliance on the control.
              </p>
            </div>

          </div>

          <textarea
            value={controlChanges}
            onChange={(e) => {
              setControlChanges(e.target.value);
              clearMessages();
            }}
            rows={5}
            placeholder="Were there any changes to the control after interim testing?"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />

        </section>

        {/* ==================================================
            REMAINING PERIOD
        ================================================== */}

        <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">

          <h2 className="font-semibold text-gray-900">
            Remaining Period Evaluation
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Document procedures performed over the period
            between interim testing and year-end.
          </p>

          <textarea
            value={remainingPeriod}
            onChange={(e) => {
              setRemainingPeriod(e.target.value);
              clearMessages();
            }}
            rows={5}
            placeholder="Describe procedures performed over the remaining period..."
            className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

        </section>

        {/* ==================================================
            ADDITIONAL TESTING
        ================================================== */}

        <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">

          <h2 className="font-semibold text-gray-900">
            Incremental Testing
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Document any additional testing required to
            cover the remaining period.
          </p>

          <textarea
            value={additionalTesting}
            onChange={(e) => {
              setAdditionalTesting(e.target.value);
              clearMessages();
            }}
            rows={5}
            placeholder="Document additional testing performed..."
            className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

        </section>

        {/* ==================================================
            EXCEPTIONS
        ================================================== */}

        <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">

          <h2 className="font-semibold text-gray-900">
            Exceptions Identified
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Document exceptions identified during
            roll-forward testing.
          </p>

          <textarea
            value={exceptions}
            onChange={(e) => {
              setExceptions(e.target.value);
              clearMessages();
            }}
            rows={4}
            placeholder="Document exceptions identified during roll-forward testing..."
            className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

        </section>

        {/* ==================================================
            CONCLUSION
        ================================================== */}

        <section className="mb-6 rounded-xl border bg-white p-6 shadow-sm">

          <h2 className="font-semibold text-gray-900">
            Auditor Conclusion
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Conclude whether interim testing can be relied
            upon through year-end.
          </p>

          <textarea
            value={conclusion}
            onChange={(e) => {
              setConclusion(e.target.value);
              clearMessages();
            }}
            rows={5}
            placeholder="Conclude whether interim testing can be relied upon through year-end..."
            className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

        </section>

        {/* ==================================================
            ACTIONS
        ================================================== */}

        <div className="flex flex-col gap-3 rounded-xl border bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">

          <button
            type="button"
            onClick={() =>
              router.push(
                `/engagements/${engagementId}/execution`
              )
            }
            disabled={saving}
            className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">

            {/* SAVE */}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <CheckCircle2 size={18} />
                  Saved
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Assessment
                </>
              )}
            </button>

            {/* CONTINUE */}

            <button
              type="button"
              onClick={handleContinue}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Saving...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight size={18} />
                </>
              )}
            </button>

          </div>

        </div>

      </div>
    </AppLayout>
  );
}