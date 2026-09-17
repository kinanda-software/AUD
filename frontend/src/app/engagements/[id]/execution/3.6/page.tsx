"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "../../../../../components/layout/AppLayout";

import {
  ArrowLeft,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  Save,
  CheckCircle2,
  FileWarning,
  TrendingUp,
} from "lucide-react";

export default function RiskReassessmentPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = String(params.id ?? "");

  const [riskArea, setRiskArea] = useState("");
  const [assertion, setAssertion] = useState("");
  const [originalRisk, setOriginalRisk] = useState("");

  const [newEvidence, setNewEvidence] = useState("");
  const [unexpectedResults, setUnexpectedResults] = useState("");
  const [controlExceptions, setControlExceptions] = useState("");
  const [misstatements, setMisstatements] = useState("");
  const [confirmationExceptions, setConfirmationExceptions] =
    useState("");

  const [reassessedRisk, setReassessedRisk] = useState("");
  const [riskChangeReason, setRiskChangeReason] = useState("");

  const [additionalProcedures, setAdditionalProcedures] =
    useState("");

  const [conclusion, setConclusion] = useState("");

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!riskArea || !reassessedRisk || !conclusion) {
      alert(
        "Please complete the risk area, reassessed risk and auditor conclusion."
      );
      return;
    }

    const assessmentData = {
      engagementId,
      section: "3.6",
      riskArea,
      assertion,
      originalRisk,
      newEvidence,
      unexpectedResults,
      controlExceptions,
      misstatements,
      confirmationExceptions,
      reassessedRisk,
      riskChangeReason,
      additionalProcedures,
      conclusion,
    };

    console.log("Risk Reassessment:", assessmentData);

    setSaved(true);

    router.replace(
      `/engagements/${engagementId}/conclusion-reporting`
    );
  };

  const handleBack = () => {
    router.push(`/engagements/${engagementId}/execution`);
  };

  return (
    <AppLayout>
      <main className="min-w-0 flex-1 bg-gray-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

          {/* HEADER */}
          <div className="mb-6 flex items-start gap-4">
            <button
              type="button"
              onClick={handleBack}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-blue-600">
                  Phase 3
                </span>

                <span className="text-gray-400">/</span>

                <span className="text-gray-500">
                  3.6 Reassess Combined Risk
                </span>
              </div>

              <h1 className="mt-1 text-2xl font-bold text-gray-900">
                Reassess Combined Risk Assessments
              </h1>

              <p className="mt-1 max-w-3xl text-sm text-gray-500">
                Revisit assessed risks based on evidence obtained
                during audit execution.
              </p>
            </div>
          </div>

          {/* ENGAGEMENT SUMMARY */}
          <section className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Current Engagement
                </p>

                <h2 className="mt-1 text-xl font-bold text-gray-900">
                  Engagement #{engagementId}
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  Phase 3 — Risk reassessment workpaper
                </p>
              </div>

              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm md:flex">
                <RefreshCw size={23} />
              </div>
            </div>
          </section>

          {/* RISK ASSESSMENT INFORMATION */}
          <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <TrendingUp
                size={22}
                className="shrink-0 text-blue-600"
              />

              <div>
                <h2 className="font-semibold text-gray-900">
                  Risk Assessment Information
                </h2>

                <p className="text-sm text-gray-500">
                  Identify the risk being reassessed and compare it
                  with the original assessment.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Risk Area *
                </label>

                <input
                  value={riskArea}
                  onChange={(e) => setRiskArea(e.target.value)}
                  placeholder="e.g. Revenue Recognition"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Assertion
                </label>

                <select
                  value={assertion}
                  onChange={(e) => setAssertion(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select assertion</option>
                  <option>Occurrence</option>
                  <option>Completeness</option>
                  <option>Accuracy</option>
                  <option>Cut-off</option>
                  <option>Existence</option>
                  <option>Valuation</option>
                  <option>Rights & Obligations</option>
                  <option>Classification</option>
                  <option>Presentation & Disclosure</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Original Risk Level
                </label>

                <select
                  value={originalRisk}
                  onChange={(e) => setOriginalRisk(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">
                    Select original risk
                  </option>
                  <option>Low</option>
                  <option>Moderate</option>
                  <option>High</option>
                  <option>Significant</option>
                </select>
              </div>
            </div>
          </section>

          {/* NEW AUDIT EVIDENCE */}
          <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <FileWarning
                size={21}
                className="shrink-0 text-blue-600"
              />

              <div>
                <h2 className="font-semibold text-gray-900">
                  New Audit Evidence
                </h2>

                <p className="text-sm text-gray-500">
                  Document evidence obtained during execution that
                  may affect the original risk assessment.
                </p>
              </div>
            </div>

            <textarea
              value={newEvidence}
              onChange={(e) => setNewEvidence(e.target.value)}
              rows={6}
              placeholder="Describe new audit evidence obtained during execution..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </section>

          {/* UNEXPECTED RESULTS */}
          <section className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <AlertTriangle
                size={21}
                className="shrink-0 text-orange-600"
              />

              <div>
                <h2 className="font-semibold text-gray-900">
                  Unexpected Results
                </h2>

                <p className="text-sm text-gray-600">
                  Document unexpected results or unusual findings
                  that may require reassessment.
                </p>
              </div>
            </div>

            <textarea
              value={unexpectedResults}
              onChange={(e) =>
                setUnexpectedResults(e.target.value)
              }
              rows={5}
              placeholder="Document unexpected results, unusual trends, unexplained variances or other findings..."
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
          </section>

          {/* CONTROL EXCEPTIONS */}
          <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-semibold text-gray-900">
              Control Exceptions
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Document control exceptions identified during tests
              of controls.
            </p>

            <textarea
              value={controlExceptions}
              onChange={(e) =>
                setControlExceptions(e.target.value)
              }
              rows={5}
              placeholder="Describe control exceptions, their nature, cause and potential effect on the risk assessment..."
              className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </section>

          {/* MISSTATEMENTS */}
          <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-semibold text-gray-900">
              Misstatements Identified
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Document misstatements identified during substantive
              or other audit procedures.
            </p>

            <textarea
              value={misstatements}
              onChange={(e) => setMisstatements(e.target.value)}
              rows={5}
              placeholder="Describe identified misstatements and their impact on assessed risk..."
              className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </section>

          {/* CONFIRMATION EXCEPTIONS */}
          <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-semibold text-gray-900">
              Confirmation Exceptions
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Document exceptions from external confirmations and
              evaluate whether they indicate increased risk.
            </p>

            <textarea
              value={confirmationExceptions}
              onChange={(e) =>
                setConfirmationExceptions(e.target.value)
              }
              rows={5}
              placeholder="Document confirmation exceptions, non-responses, differences or alternative procedures..."
              className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </section>

          {/* REASSESS RISK */}
          <section className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <ShieldAlert
                size={22}
                className="shrink-0 text-red-600"
              />

              <div>
                <h2 className="font-semibold text-gray-900">
                  Reassessed Risk
                </h2>

                <p className="text-sm text-gray-600">
                  Determine the revised level of risk after
                  considering all evidence obtained.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Reassessed Risk Level *
                </label>

                <select
                  value={reassessedRisk}
                  onChange={(e) =>
                    setReassessedRisk(e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                >
                  <option value="">
                    Select reassessed risk
                  </option>
                  <option>Low</option>
                  <option>Moderate</option>
                  <option>High</option>
                  <option>Significant</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Reason for Risk Change
                </label>

                <input
                  value={riskChangeReason}
                  onChange={(e) =>
                    setRiskChangeReason(e.target.value)
                  }
                  placeholder="Why has the risk changed?"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </div>
            </div>
          </section>

          {/* ADDITIONAL AUDIT PROCEDURES */}
          <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-semibold text-gray-900">
              Additional Audit Procedures
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Document additional procedures required because of
              the revised risk assessment.
            </p>

            <textarea
              value={additionalProcedures}
              onChange={(e) =>
                setAdditionalProcedures(e.target.value)
              }
              rows={6}
              placeholder="Describe additional audit procedures required, such as expanded sampling, additional substantive testing, confirmations or other responses..."
              className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </section>

          {/* AUDITOR CONCLUSION */}
          <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-semibold text-gray-900">
              Auditor Conclusion
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Document the final conclusion regarding the
              reassessed risk and audit response.
            </p>

            <textarea
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              rows={6}
              placeholder="Document the auditor's final risk reassessment conclusion..."
              className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </section>

          {/* ACTIONS */}
          <div className="mb-8 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <button
              type="button"
              onClick={handleBack}
              className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {saved ? (
                <>
                  <CheckCircle2 size={18} />
                  Completed — Opening Phase 4...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Complete 3.6 & Continue to Phase 4
                </>
              )}
            </button>
          </div>

        </div>
      </main>
    </AppLayout>
  );
}