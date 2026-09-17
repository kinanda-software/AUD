"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle2,
  FileText,
  Monitor,
  ShieldCheck,
  Loader2,
} from "lucide-react";

export default function RevenueCyclePage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = params.id as string;

  const [description, setDescription] = useState("");
  const [significantAccounts, setSignificantAccounts] = useState("");
  const [disclosureProcesses, setDisclosureProcesses] = useState("");
  const [itApplications, setItApplications] = useState("");
  const [itDependencies, setItDependencies] = useState("");

  const [assertions, setAssertions] = useState<string[]>([]);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const assertionOptions = [
    "Existence",
    "Completeness",
    "Accuracy",
    "Cut-off",
    "Classification",
    "Occurrence",
    "Rights & Obligations",
    "Valuation",
    "Presentation & Disclosure",
  ];

  const toggleAssertion = (assertion: string) => {
    setAssertions((current) =>
      current.includes(assertion)
        ? current.filter((item) => item !== assertion)
        : [...current, assertion]
    );

    setSaved(false);
  };

  /*
   * ============================================================
   * SAVE REVENUE CYCLE AND CONTINUE TO PURCHASING & PAYABLES
   * ============================================================
   *
   * This page belongs ONLY to Phase 2.1 Transaction Cycles.
   *
   * Workflow:
   *
   * Revenue
   *   ↓
   * Purchasing & Payables
   *   ↓
   * Payroll
   *   ↓
   * Inventory
   *   ↓
   * Financial Statement Close
   *   ↓
   * Other Significant Processes
   *
   * We do NOT route to Phase 2.2 from this page.
   */

  const handleSave = () => {
    if (!description.trim()) {
      window.alert(
        "Please complete the Cycle Description before continuing."
      );
      return;
    }

    if (!significantAccounts.trim()) {
      window.alert(
        "Please enter the Significant Accounts before continuing."
      );
      return;
    }

    if (assertions.length === 0) {
      window.alert(
        "Please select at least one relevant financial statement assertion."
      );
      return;
    }

    setSaving(true);
    setSaved(true);

    /*
     * Give React a short moment to display the saved state,
     * then continue to the next transaction cycle.
     */
    setTimeout(() => {
      router.push(
        `/engagements/${engagementId}/risk-assessment/transaction-cycles/purchasing-payables`
      );
    }, 500);
  };

  const handleBack = () => {
    if (
      description.trim() ||
      significantAccounts.trim() ||
      disclosureProcesses.trim() ||
      itApplications.trim() ||
      itDependencies.trim() ||
      assertions.length > 0
    ) {
      const confirmed = window.confirm(
        "You have entered revenue cycle information. Are you sure you want to leave this page?"
      );

      if (!confirmed) {
        return;
      }
    }

    /*
     * Return to the 2.1 Transaction Cycles landing page.
     */
    router.push(
      `/engagements/${engagementId}/risk-assessment`
    );
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div>
          <Link
            href={`/engagements/${engagementId}/risk-assessment`}
            className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Transaction Cycles
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600">
                <span>PHASE 2</span>
                <span>/</span>
                <span>2.1 TRANSACTION CYCLES</span>
              </div>

              <h1 className="text-2xl font-bold text-slate-900">
                Revenue Cycle
              </h1>

              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Configure the revenue transaction cycle,
                significant accounts, assertions, disclosure
                processes and supporting IT applications.
              </p>
            </div>

            {/* Status */}
            <div
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${
                saved
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {saved ? (
                <>
                  <CheckCircle2 size={17} />
                  Assessed
                </>
              ) : (
                "Not assessed"
              )}
            </div>
          </div>
        </div>

        {/* Cycle Information */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 p-6">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <FileText size={22} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Revenue Cycle Information
              </h2>

              <p className="text-sm text-slate-500">
                Document how revenue transactions are
                initiated, processed, recorded and reported.
              </p>
            </div>
          </div>

          <div className="space-y-6 p-6">
            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Cycle Description{" "}
                <span className="text-red-500">*</span>
              </label>

              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setSaved(false);
                }}
                rows={4}
                placeholder="Describe the client's revenue cycle and the major processes involved..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Significant Accounts */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Significant Accounts{" "}
                <span className="text-red-500">*</span>
              </label>

              <textarea
                value={significantAccounts}
                onChange={(e) => {
                  setSignificantAccounts(e.target.value);
                  setSaved(false);
                }}
                rows={4}
                placeholder="List significant accounts associated with revenue, for example Revenue, Trade Receivables, Contract Assets..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Disclosure Processes */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Disclosure Processes
              </label>

              <textarea
                value={disclosureProcesses}
                onChange={(e) => {
                  setDisclosureProcesses(e.target.value);
                  setSaved(false);
                }}
                rows={4}
                placeholder="Describe relevant financial statement disclosure processes related to revenue..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        {/* Assertions */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 p-6">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <ShieldCheck size={22} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Relevant Financial Statement Assertions
              </h2>

              <p className="text-sm text-slate-500">
                Select the assertions relevant to the revenue
                cycle.
              </p>
            </div>
          </div>

          <div className="grid gap-3 p-6 md:grid-cols-3">
            {assertionOptions.map((assertion) => {
              const selected = assertions.includes(assertion);

              return (
                <button
                  key={assertion}
                  type="button"
                  onClick={() => toggleAssertion(assertion)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">
                      {assertion}
                    </span>

                    {selected && (
                      <CheckCircle2
                        size={18}
                        className="text-blue-600"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* IT Applications */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 p-6">
            <div className="rounded-xl bg-purple-50 p-3 text-purple-600">
              <Monitor size={22} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                IT Applications & Dependencies
              </h2>

              <p className="text-sm text-slate-500">
                Identify systems supporting initiation,
                recording, processing, correction, reporting
                or electronic audit evidence.
              </p>
            </div>
          </div>

          <div className="space-y-6 p-6">
            {/* IT Applications */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                IT Applications
              </label>

              <textarea
                value={itApplications}
                onChange={(e) => {
                  setItApplications(e.target.value);
                  setSaved(false);
                }}
                rows={4}
                placeholder="List applications supporting the revenue process, e.g. ERP, accounting system, POS, billing system..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                  setItDependencies(e.target.value);
                  setSaved(false);
                }}
                rows={4}
                placeholder="Describe important IT dependencies, interfaces, automated controls, reports or electronic audit evidence..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        {/* Assessment Summary */}
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
            Assessment Summary
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-white p-4">
              <p className="text-xs text-slate-500">
                Transaction Cycle
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                Revenue
              </p>
            </div>

            <div className="rounded-xl bg-white p-4">
              <p className="text-xs text-slate-500">
                Assertions Selected
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {assertions.length}
              </p>
            </div>

            <div className="rounded-xl bg-white p-4">
              <p className="text-xs text-slate-500">
                Engagement
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                #{engagementId}
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {/* Back */}
          <button
            type="button"
            onClick={handleBack}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft size={18} />
            Back to Transaction Cycles
          </button>

          {/* Save & Continue */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Saving & Continuing...
              </>
            ) : saved ? (
              <>
                <CheckCircle2 size={18} />
                Assessment Saved
                <ArrowRight size={18} />
              </>
            ) : (
              <>
                <Save size={18} />
                Save & Continue to Purchasing & Payables
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}