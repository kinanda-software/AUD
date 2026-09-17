"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Save,
  Loader2,
} from "lucide-react";

export default function PurchasingPayablesPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = params.id as string;

  const [significantAccounts, setSignificantAccounts] =
    useState("");

  const [assertions, setAssertions] = useState("");

  const [processDescription, setProcessDescription] =
    useState("");

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  /*
   * ============================================================
   * SAVE AND CONTINUE
   * ============================================================
   *
   * This page belongs ONLY to Phase 2.1 Transaction Cycles.
   *
   * Workflow:
   *
   * Revenue
   *     ↓
   * Purchasing & Payables
   *     ↓
   * Payroll
   *     ↓
   * Inventory
   *     ↓
   * Financial Statement Close
   *     ↓
   * Other Significant Processes
   *
   * We do NOT route to Phase 2.2.
   */

  const handleSave = () => {
    if (!significantAccounts.trim()) {
      window.alert(
        "Please enter the Significant Accounts before continuing."
      );
      return;
    }

    if (!assertions.trim()) {
      window.alert(
        "Please enter the relevant Assertions before continuing."
      );
      return;
    }

    if (!processDescription.trim()) {
      window.alert(
        "Please complete the Process Description before continuing."
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
        `/engagements/${engagementId}/risk-assessment/transaction-cycles/payroll`
      );
    }, 500);
  };

  const handleBack = () => {
    if (
      significantAccounts.trim() ||
      assertions.trim() ||
      processDescription.trim()
    ) {
      const confirmed = window.confirm(
        "You have entered purchasing and payables information. Are you sure you want to leave this page?"
      );

      if (!confirmed) {
        return;
      }
    }

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
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={17} />
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
                Purchasing &amp; Payables
              </h1>

              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Configure procurement, purchases, trade payables,
                expenses, assertions and supporting processes.
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

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Section */}
          <section className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* Section Header */}
              <div className="border-b border-slate-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <FileText size={21} />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Cycle Configuration
                    </h2>

                    <p className="text-sm text-slate-500">
                      Document the purchasing and payables process.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-6 p-6">
                {/* Significant Accounts */}
                <div>
                  <label
                    htmlFor="accounts"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Significant Accounts{" "}
                    <span className="text-red-500">*</span>
                  </label>

                  <textarea
                    id="accounts"
                    value={significantAccounts}
                    onChange={(e) => {
                      setSignificantAccounts(e.target.value);
                      setSaved(false);
                    }}
                    rows={4}
                    placeholder="Enter significant accounts, for example Purchases, Trade Payables, Accrued Expenses, Cost of Sales..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Assertions */}
                <div>
                  <label
                    htmlFor="assertions"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Relevant Assertions{" "}
                    <span className="text-red-500">*</span>
                  </label>

                  <textarea
                    id="assertions"
                    value={assertions}
                    onChange={(e) => {
                      setAssertions(e.target.value);
                      setSaved(false);
                    }}
                    rows={4}
                    placeholder="Enter relevant assertions, for example Completeness, Accuracy, Cut-off, Occurrence, Rights & Obligations, Valuation..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Process Description */}
                <div>
                  <label
                    htmlFor="process"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Process Description{" "}
                    <span className="text-red-500">*</span>
                  </label>

                  <textarea
                    id="process"
                    value={processDescription}
                    onChange={(e) => {
                      setProcessDescription(e.target.value);
                      setSaved(false);
                    }}
                    rows={6}
                    placeholder="Describe the purchasing and payables process from supplier selection and purchase orders through goods receipt, invoice processing, accounts payable and payment..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Right Section */}
          <aside>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-slate-900">
                Audit Areas
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Key areas within the purchasing and payables cycle.
              </p>

              <div className="mt-4 space-y-3">
                {[
                  "Suppliers",
                  "Purchase Orders",
                  "Goods Received",
                  "Supplier Invoices",
                  "Accounts Payable",
                  "Payments",
                  "Expenses",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-100"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

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
                Purchasing &amp; Payables
              </p>
            </div>

            <div className="rounded-xl bg-white p-4">
              <p className="text-xs text-slate-500">
                Process Status
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {saved ? "Assessed" : "Not assessed"}
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
                Saving &amp; Continuing...
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
                Save &amp; Continue to Payroll
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}