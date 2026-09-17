"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Save,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import {
  createAuditScope,
  getAuditScopeByEngagement,
  getEngagement,
  updateAuditScope,
  type AuditScope,
  type Engagement,
} from "@/lib/api";

type FormData = {
  entities_in_scope: string;
  locations_in_scope: string;
  reporting_period: string;
  financial_statement_areas: string;
  significant_accounts: string;
  significant_disclosures: string;
  systems_in_scope: string;
  processes_in_scope: string;
  areas_out_of_scope: string;
  component_auditor_involvement: boolean;
  component_auditor_details: string;
  scope_conclusion: string;
};

const initialForm: FormData = {
  entities_in_scope: "",
  locations_in_scope: "",
  reporting_period: "",
  financial_statement_areas: "",
  significant_accounts: "",
  significant_disclosures: "",
  systems_in_scope: "",
  processes_in_scope: "",
  areas_out_of_scope: "",
  component_auditor_involvement: false,
  component_auditor_details: "",
  scope_conclusion: "",
};

export default function AuditScopePage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = String(params.id);

  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [auditScope, setAuditScope] = useState<AuditScope | null>(null);
  const [form, setForm] = useState<FormData>(initialForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [continuing, setContinuing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const engagementData = await getEngagement(engagementId);
        setEngagement(engagementData);

        const scopeData = await getAuditScopeByEngagement(engagementId);

        if (scopeData) {
          setAuditScope(scopeData);

          setForm({
            entities_in_scope: scopeData.entities_in_scope ?? "",
            locations_in_scope: scopeData.locations_in_scope ?? "",
            reporting_period: scopeData.reporting_period ?? "",
            financial_statement_areas:
              scopeData.financial_statement_areas ?? "",
            significant_accounts: scopeData.significant_accounts ?? "",
            significant_disclosures:
              scopeData.significant_disclosures ?? "",
            systems_in_scope: scopeData.systems_in_scope ?? "",
            processes_in_scope: scopeData.processes_in_scope ?? "",
            areas_out_of_scope: scopeData.areas_out_of_scope ?? "",
            component_auditor_involvement:
              scopeData.component_auditor_involvement ?? false,
            component_auditor_details:
              scopeData.component_auditor_details ?? "",
            scope_conclusion: scopeData.scope_conclusion ?? "",
          });
        }
      } catch (err) {
        console.error("Error loading audit scope:", err);
        setError("Unable to load the audit scope information.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [engagementId]);

  function updateField<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setSuccess("");
    setError("");
  }

  async function saveAuditScope(continueToNext: boolean) {
    if (!engagement) {
      setError("Engagement information is not available.");
      return;
    }

    try {
      if (continueToNext) {
        setContinuing(true);
      } else {
        setSaving(true);
      }

      setError("");
      setSuccess("");

      const payload: Partial<AuditScope> = {
        engagement: engagement.id,
        entities_in_scope: form.entities_in_scope,
        locations_in_scope: form.locations_in_scope,
        reporting_period: form.reporting_period,
        financial_statement_areas: form.financial_statement_areas,
        significant_accounts: form.significant_accounts,
        significant_disclosures: form.significant_disclosures,
        systems_in_scope: form.systems_in_scope,
        processes_in_scope: form.processes_in_scope,
        areas_out_of_scope: form.areas_out_of_scope,
        component_auditor_involvement:
          form.component_auditor_involvement,
        component_auditor_details: form.component_auditor_details,
        scope_conclusion: form.scope_conclusion,
      };

      let saved: AuditScope;

      if (auditScope) {
        saved = await updateAuditScope(auditScope.id, payload);
      } else {
        saved = await createAuditScope(payload);
      }

      setAuditScope(saved);

      if (continueToNext) {
        router.push(
          `/engagements/${engagement.id}/audit-planning/audit-team`
        );
        return;
      }

      setSuccess(
        auditScope
          ? "Audit Scope updated successfully."
          : "Audit Scope saved successfully."
      );
    } catch (err) {
      console.error("Audit Scope save error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save the Audit Scope."
      );
    } finally {
      setSaving(false);
      setContinuing(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveAuditScope(false);
  }

  async function handleSaveAndContinue() {
    await saveAuditScope(true);
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading Audit Scope...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!engagement) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-semibold text-red-800">
              Engagement not found
            </h1>

            <p className="mt-2 text-sm text-red-700">
              The requested engagement could not be loaded.
            </p>

            <Link
              href="/engagements"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Engagements
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/engagements/${engagement.id}/audit-planning`}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Audit Planning
          </Link>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-200 px-6 py-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    <ClipboardList className="h-6 w-6 text-slate-700" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        Workpaper 1.3
                      </span>

                      {auditScope && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Saved
                        </span>
                      )}
                    </div>

                    <h1 className="mt-3 text-2xl font-bold text-slate-900">
                      Audit Scope
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                      Define the entities, locations, financial statement
                      areas, systems, processes and other matters included
                      within the audit scope.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 px-4 py-3 text-left lg:min-w-[240px]">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Engagement
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {engagement.engagement_code}
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    {engagement.title}
                  </p>
                </div>

              </div>
            </div>

            {/* Workflow */}
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex flex-wrap items-center gap-2">

                <div className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  1.1 Planning Assessment
                </div>

                <ArrowRight className="h-4 w-4 text-slate-400" />

                <div className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  1.2 Materiality
                </div>

                <ArrowRight className="h-4 w-4 text-slate-400" />

                <div className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                  <ClipboardList className="h-4 w-4" />
                  1.3 Audit Scope
                </div>

                <ArrowRight className="h-4 w-4 text-slate-400" />

                <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                  1.4 Audit Team
                </div>

              </div>
            </div>

            <div className="px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-3">

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Workpaper
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    1.3 — Audit Scope
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Engagement Type
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {engagement.engagement_type}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Risk Level
                  </p>

                  <p className="mt-1 text-sm font-semibold capitalize text-slate-900">
                    {engagement.risk_level}
                  </p>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <p className="font-semibold">Error</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-semibold">{success}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Scope Overview */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-slate-700" />

                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Scope Overview
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Define the overall boundaries and period of the audit.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 px-6 py-6 lg:grid-cols-2">

              <Field
                label="Entities in Scope"
                value={form.entities_in_scope}
                onChange={(value) =>
                  updateField("entities_in_scope", value)
                }
                placeholder="List the entities, subsidiaries, branches or components included in the audit."
                rows={5}
              />

              <Field
                label="Locations in Scope"
                value={form.locations_in_scope}
                onChange={(value) =>
                  updateField("locations_in_scope", value)
                }
                placeholder="List offices, branches, factories, sites or other locations included."
                rows={5}
              />

              <Field
                label="Reporting Period"
                value={form.reporting_period}
                onChange={(value) =>
                  updateField("reporting_period", value)
                }
                placeholder="Example: Year ended 31 December 2026"
                rows={3}
              />

              <Field
                label="Areas Out of Scope"
                value={form.areas_out_of_scope}
                onChange={(value) =>
                  updateField("areas_out_of_scope", value)
                }
                placeholder="Document any entities, locations, accounts, systems or activities specifically excluded."
                rows={3}
              />

            </div>
          </section>

          {/* Financial Statement Scope */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Financial Statement Scope
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Identify the financial statement areas, significant accounts
                and disclosures subject to audit.
              </p>
            </div>

            <div className="grid gap-6 px-6 py-6">

              <Field
                label="Financial Statement Areas"
                value={form.financial_statement_areas}
                onChange={(value) =>
                  updateField("financial_statement_areas", value)
                }
                placeholder="Example: Revenue, receivables, inventory, PPE, liabilities, equity and cash flows."
                rows={5}
              />

              <Field
                label="Significant Accounts"
                value={form.significant_accounts}
                onChange={(value) =>
                  updateField("significant_accounts", value)
                }
                placeholder="List significant accounts and balances requiring audit attention."
                rows={5}
              />

              <Field
                label="Significant Disclosures"
                value={form.significant_disclosures}
                onChange={(value) =>
                  updateField("significant_disclosures", value)
                }
                placeholder="Identify significant or complex disclosures that require audit procedures."
                rows={5}
              />

            </div>
          </section>

          {/* Systems and Processes */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Systems and Processes
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Document the systems and business processes relevant to the
                audit.
              </p>
            </div>

            <div className="grid gap-6 px-6 py-6 lg:grid-cols-2">

              <Field
                label="Systems in Scope"
                value={form.systems_in_scope}
                onChange={(value) =>
                  updateField("systems_in_scope", value)
                }
                placeholder="List ERP systems, accounting systems, applications and other IT systems relevant to the audit."
                rows={6}
              />

              <Field
                label="Processes in Scope"
                value={form.processes_in_scope}
                onChange={(value) =>
                  updateField("processes_in_scope", value)
                }
                placeholder="List significant business processes such as revenue, purchasing, payroll, inventory and financial close."
                rows={6}
              />

            </div>
          </section>

          {/* Component Auditor */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Component Auditor Involvement
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Record whether component auditors will participate in the
                engagement.
              </p>
            </div>

            <div className="px-6 py-6">

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100">

                <input
                  type="checkbox"
                  checked={form.component_auditor_involvement}
                  onChange={(event) =>
                    updateField(
                      "component_auditor_involvement",
                      event.target.checked
                    )
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />

                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Component auditor involvement
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    Select this option if another audit team or component
                    auditor will perform audit work for this engagement.
                  </p>
                </div>

              </label>

              {form.component_auditor_involvement && (
                <div className="mt-6">
                  <Field
                    label="Component Auditor Details"
                    value={form.component_auditor_details}
                    onChange={(value) =>
                      updateField(
                        "component_auditor_details",
                        value
                      )
                    }
                    placeholder="Describe the component auditor, entity/component covered, responsibilities and planned involvement."
                    rows={6}
                  />
                </div>
              )}

            </div>
          </section>

          {/* Conclusion */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Scope Conclusion
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Summarize the final scope determination and any important
                limitations or considerations.
              </p>
            </div>

            <div className="px-6 py-6">

              <Field
                label="Scope Conclusion"
                value={form.scope_conclusion}
                onChange={(value) =>
                  updateField("scope_conclusion", value)
                }
                placeholder="Document the conclusion reached regarding the overall audit scope."
                rows={7}
              />

            </div>
          </section>

          {/* Save Actions */}
          <div className="sticky bottom-4 z-10">

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur lg:flex-row lg:items-center lg:justify-between">

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {auditScope
                    ? "Audit Scope already exists"
                    : "Audit Scope not yet saved"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {auditScope
                    ? "Save your changes to update this workpaper."
                    : "Complete the scope information and save the workpaper."}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">

                {/* Cancel */}
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/engagements/${engagement.id}/audit-planning`
                    )
                  }
                  disabled={saving || continuing}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                {/* Save */}
                <button
                  type="submit"
                  disabled={saving || continuing}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {auditScope
                        ? "Update Audit Scope"
                        : "Save Audit Scope"}
                    </>
                  )}
                </button>

                {/* Save & Continue */}
                <button
                  type="button"
                  onClick={handleSaveAndContinue}
                  disabled={saving || continuing}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {continuing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Save & Continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

              </div>
            </div>
          </div>

        </form>
      </div>
    </AppLayout>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  rows = 5,
}: FieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-800">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      />
    </div>
  );
}