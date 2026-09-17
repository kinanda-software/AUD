"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Plus,
  X,
  FileText,
  Monitor,
  ShieldCheck,
} from "lucide-react";

// IMPORTANT:
// We are using a relative import here.
// Do NOT use "@/components/..." for now.
import AppLayout from "@/components/layout/AppLayout";

export default function RevenuePage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = params.id as string;

  // -----------------------------
  // FORM STATE
  // -----------------------------

  const [description, setDescription] = useState("");

  const [accounts, setAccounts] = useState<string[]>([]);
  const [accountInput, setAccountInput] = useState("");

  const [disclosures, setDisclosures] = useState<string[]>([]);
  const [disclosureInput, setDisclosureInput] = useState("");

  const [itApplications, setItApplications] = useState<string[]>([]);
  const [itApplicationInput, setItApplicationInput] = useState("");

  const [itDependencies, setItDependencies] = useState("");

  const [assertions, setAssertions] = useState<string[]>([]);

  const [saved, setSaved] = useState(false);

  // -----------------------------
  // ASSERTIONS
  // -----------------------------

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
  };

  // -----------------------------
  // ADD ACCOUNT
  // -----------------------------

  const addAccount = () => {
    const value = accountInput.trim();

    if (!value) return;

    setAccounts((current) => [...current, value]);
    setAccountInput("");
  };

  const removeAccount = (index: number) => {
    setAccounts((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  // -----------------------------
  // ADD DISCLOSURE
  // -----------------------------

  const addDisclosure = () => {
    const value = disclosureInput.trim();

    if (!value) return;

    setDisclosures((current) => [...current, value]);
    setDisclosureInput("");
  };

  const removeDisclosure = (index: number) => {
    setDisclosures((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  // -----------------------------
  // ADD IT APPLICATION
  // -----------------------------

  const addItApplication = () => {
    const value = itApplicationInput.trim();

    if (!value) return;

    setItApplications((current) => [...current, value]);
    setItApplicationInput("");
  };

  const removeItApplication = (index: number) => {
    setItApplications((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  // -----------------------------
  // SAVE
  // -----------------------------

  const handleSave = () => {
    setSaved(true);

    console.log({
      engagementId,
      cycle: "Revenue",
      description,
      significantAccounts: accounts,
      disclosureProcesses: disclosures,
      assertions,
      itApplications,
      itDependencies,
    });
  };

  // -----------------------------
  // BACK
  // -----------------------------

  const handleBack = () => {
    router.push(`/engagements/${engagementId}/risk-assessment`);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50">

        {/* -------------------------------- */}
        {/* PAGE HEADER */}
        {/* -------------------------------- */}

        <div className="mb-6 flex items-center justify-between">

          <div className="flex items-center gap-4">

            <button
              onClick={handleBack}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <div className="flex items-center gap-2">

                <span className="text-sm font-medium text-blue-600">
                  Phase 2
                </span>

                <span className="text-gray-400">/</span>

                <span className="text-sm text-gray-500">
                  2.1 Transaction Cycles
                </span>

              </div>

              <h1 className="mt-1 text-2xl font-bold text-gray-900">
                Revenue Cycle
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Identify significant accounts, disclosure processes,
                assertions, and IT applications supporting revenue.
              </p>
            </div>

          </div>

          <div
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
              saved
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >

            {saved ? (
              <>
                <CheckCircle2 size={17} />
                Assessed
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                Not Assessed
              </>
            )}

          </div>

        </div>

        {/* -------------------------------- */}
        {/* MAIN CONTENT */}
        {/* -------------------------------- */}

        <div className="space-y-6">

          {/* -------------------------------- */}
          {/* CYCLE DESCRIPTION */}
          {/* -------------------------------- */}

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">

            <div className="border-b border-gray-200 px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FileText size={20} />
                </div>

                <div>
                  <h2 className="font-semibold text-gray-900">
                    Cycle Description
                  </h2>

                  <p className="text-sm text-gray-500">
                    Describe how the revenue process operates.
                  </p>
                </div>

              </div>

            </div>

            <div className="p-6">

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Revenue Cycle Description
              </label>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                rows={5}
                placeholder="Describe the revenue process from initiation through recording, processing, reporting, and financial statement presentation..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

          </section>

          {/* -------------------------------- */}
          {/* SIGNIFICANT ACCOUNTS */}
          {/* -------------------------------- */}

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">

            <div className="border-b border-gray-200 px-6 py-5">

              <h2 className="font-semibold text-gray-900">
                Significant Accounts
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Identify accounts affected by the revenue cycle.
              </p>

            </div>

            <div className="p-6">

              <div className="flex gap-3">

                <input
                  value={accountInput}
                  onChange={(event) =>
                    setAccountInput(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addAccount();
                    }
                  }}
                  placeholder="e.g. Revenue, Trade Receivables"
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={addAccount}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Plus size={17} />
                  Add
                </button>

              </div>

              {accounts.length > 0 && (
                <div className="mt-4 space-y-2">

                  {accounts.map((account, index) => (
                    <div
                      key={`${account}-${index}`}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                    >

                      <span className="text-sm text-gray-700">
                        {account}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeAccount(index)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <X size={17} />
                      </button>

                    </div>
                  ))}

                </div>
              )}

            </div>

          </section>

          {/* -------------------------------- */}
          {/* DISCLOSURE PROCESSES */}
          {/* -------------------------------- */}

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">

            <div className="border-b border-gray-200 px-6 py-5">

              <h2 className="font-semibold text-gray-900">
                Disclosure Processes
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Identify disclosures associated with revenue.
              </p>

            </div>

            <div className="p-6">

              <div className="flex gap-3">

                <input
                  value={disclosureInput}
                  onChange={(event) =>
                    setDisclosureInput(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addDisclosure();
                    }
                  }}
                  placeholder="e.g. Revenue recognition policy"
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={addDisclosure}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Plus size={17} />
                  Add
                </button>

              </div>

              {disclosures.length > 0 && (
                <div className="mt-4 space-y-2">

                  {disclosures.map((disclosure, index) => (
                    <div
                      key={`${disclosure}-${index}`}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                    >

                      <span className="text-sm text-gray-700">
                        {disclosure}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          removeDisclosure(index)
                        }
                        className="text-gray-400 hover:text-red-600"
                      >
                        <X size={17} />
                      </button>

                    </div>
                  ))}

                </div>
              )}

            </div>

          </section>

          {/* -------------------------------- */}
          {/* ASSERTIONS */}
          {/* -------------------------------- */}

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">

            <div className="border-b border-gray-200 px-6 py-5">

              <h2 className="font-semibold text-gray-900">
                Relevant Financial Statement Assertions
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Select the assertions relevant to the revenue cycle.
              </p>

            </div>

            <div className="p-6">

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">

                {assertionOptions.map((assertion) => {

                  const selected =
                    assertions.includes(assertion);

                  return (
                    <button
                      key={assertion}
                      type="button"
                      onClick={() =>
                        toggleAssertion(assertion)
                      }
                      className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition ${
                        selected
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-gray-50"
                      }`}
                    >

                      <div className="flex items-center justify-between">

                        <span>{assertion}</span>

                        {selected && (
                          <CheckCircle2
                            size={17}
                            className="text-blue-600"
                          />
                        )}

                      </div>

                    </button>
                  );

                })}

              </div>

            </div>

          </section>

          {/* -------------------------------- */}
          {/* IT APPLICATIONS */}
          {/* -------------------------------- */}

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">

            <div className="border-b border-gray-200 px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <Monitor size={20} />
                </div>

                <div>

                  <h2 className="font-semibold text-gray-900">
                    IT Applications
                  </h2>

                  <p className="text-sm text-gray-500">
                    Identify systems used to initiate, process,
                    record, or report revenue transactions.
                  </p>

                </div>

              </div>

            </div>

            <div className="p-6">

              <div className="flex gap-3">

                <input
                  value={itApplicationInput}
                  onChange={(event) =>
                    setItApplicationInput(
                      event.target.value
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addItApplication();
                    }
                  }}
                  placeholder="e.g. ERP, POS, Accounting System"
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={addItApplication}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Plus size={17} />
                  Add
                </button>

              </div>

              {itApplications.length > 0 && (
                <div className="mt-4 space-y-2">

                  {itApplications.map(
                    (application, index) => (
                      <div
                        key={`${application}-${index}`}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                      >

                        <span className="text-sm text-gray-700">
                          {application}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            removeItApplication(index)
                          }
                          className="text-gray-400 hover:text-red-600"
                        >
                          <X size={17} />
                        </button>

                      </div>
                    )
                  )}

                </div>
              )}

            </div>

          </section>

          {/* -------------------------------- */}
          {/* IT DEPENDENCIES */}
          {/* -------------------------------- */}

          <section className="rounded-xl border border-gray-200 bg-white shadow-sm">

            <div className="border-b border-gray-200 px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
                  <ShieldCheck size={20} />
                </div>

                <div>

                  <h2 className="font-semibold text-gray-900">
                    IT Dependencies
                  </h2>

                  <p className="text-sm text-gray-500">
                    Document important IT dependencies and
                    controls relevant to the revenue cycle.
                  </p>

                </div>

              </div>

            </div>

            <div className="p-6">

              <textarea
                value={itDependencies}
                onChange={(event) =>
                  setItDependencies(event.target.value)
                }
                rows={5}
                placeholder="Describe relevant IT dependencies, interfaces, automated controls, system-generated reports, access controls, change management dependencies, etc..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

          </section>

          {/* -------------------------------- */}
          {/* SUMMARY */}
          {/* -------------------------------- */}

          <section className="rounded-xl border border-blue-200 bg-blue-50">

            <div className="p-6">

              <h2 className="font-semibold text-gray-900">
                Assessment Summary
              </h2>

              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">

                <div className="rounded-lg bg-white p-4">
                  <p className="text-xs text-gray-500">
                    Accounts
                  </p>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {accounts.length}
                  </p>
                </div>

                <div className="rounded-lg bg-white p-4">
                  <p className="text-xs text-gray-500">
                    Disclosures
                  </p>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {disclosures.length}
                  </p>
                </div>

                <div className="rounded-lg bg-white p-4">
                  <p className="text-xs text-gray-500">
                    Assertions
                  </p>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {assertions.length}
                  </p>
                </div>

                <div className="rounded-lg bg-white p-4">
                  <p className="text-xs text-gray-500">
                    IT Applications
                  </p>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {itApplications.length}
                  </p>
                </div>

              </div>

            </div>

          </section>

          {/* -------------------------------- */}
          {/* ACTIONS */}
          {/* -------------------------------- */}

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

            <button
              type="button"
              onClick={handleBack}
              className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Back to Risk Assessment
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Save size={18} />
              Save Assessment
            </button>

          </div>

        </div>

      </div>
    </AppLayout>
  );
}