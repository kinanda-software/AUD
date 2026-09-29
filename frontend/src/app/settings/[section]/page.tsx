"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Database,
  FileCheck2,
  Save,
  SlidersHorizontal,
  Workflow,
} from "lucide-react";

const SECTIONS: Record<
  string,
  {
    title: string;
    description: string;
    icon: typeof Workflow;
    fields: {
      label: string;
      description: string;
      type: "select" | "toggle" | "number";
      options?: string[];
      defaultValue: string | number | boolean;
    }[];
  }
> = {
  "audit-methodology": {
    title: "Audit Methodology",
    description:
      "Configure audit phases, procedures, workpapers, and methodology requirements.",
    icon: Workflow,
    fields: [
      {
        label: "Default Methodology",
        description: "Methodology used for new audit engagements.",
        type: "select",
        options: ["ISA-Based Audit", "Firm Standard", "Custom Methodology"],
        defaultValue: "ISA-Based Audit",
      },
      {
        label: "Require Workpapers",
        description: "Require supporting workpapers before completing workflow steps.",
        type: "toggle",
        defaultValue: true,
      },
      {
        label: "Reviewer Sign-off",
        description: "Require reviewer approval before final completion.",
        type: "toggle",
        defaultValue: true,
      },
    ],
  },

  "engagement-settings": {
    title: "Engagement Settings",
    description:
      "Configure engagement statuses, assignments, workflow rules, and deadlines.",
    icon: SlidersHorizontal,
    fields: [
      {
        label: "Default Engagement Status",
        description: "Status used when a new engagement is created.",
        type: "select",
        options: ["Not Started", "In Progress", "Under Review"],
        defaultValue: "Not Started",
      },
      {
        label: "Assignment Model",
        description: "How engagement team assignments are handled.",
        type: "select",
        options: ["Manual", "Manager Assigned", "Automatic"],
        defaultValue: "Manual",
      },
      {
        label: "Deadline Alerts",
        description: "Notify users when engagement deadlines are approaching.",
        type: "toggle",
        defaultValue: true,
      },
    ],
  },

  "risk-materiality": {
    title: "Risk & Materiality",
    description:
      "Configure default risk classifications, materiality settings, and assessment parameters.",
    icon: FileCheck2,
    fields: [
      {
        label: "Default Risk Classification",
        description: "Default risk classification for new assessments.",
        type: "select",
        options: ["Low", "Moderate", "High", "Significant"],
        defaultValue: "Moderate",
      },
      {
        label: "Materiality Basis",
        description: "Default basis for materiality assessment.",
        type: "select",
        options: ["Revenue", "Profit Before Tax", "Total Assets", "Equity"],
        defaultValue: "Profit Before Tax",
      },
      {
        label: "Performance Materiality (%)",
        description: "Default performance materiality percentage.",
        type: "number",
        defaultValue: 75,
      },
    ],
  },

  "reporting-settings": {
    title: "Reporting Settings",
    description:
      "Configure reporting workflows, opinion types, approvals, and report templates.",
    icon: FileCheck2,
    fields: [
      {
        label: "Default Opinion Type",
        description: "Opinion type used when creating a new report.",
        type: "select",
        options: [
          "Unmodified Opinion",
          "Qualified Opinion",
          "Adverse Opinion",
          "Disclaimer of Opinion",
        ],
        defaultValue: "Unmodified Opinion",
      },
      {
        label: "Require Report Approval",
        description: "Require approval before reports can be finalized.",
        type: "toggle",
        defaultValue: true,
      },
      {
        label: "Default Report Template",
        description: "Template used for new audit reports.",
        type: "select",
        options: ["Standard Audit Report", "Firm Template", "Custom Template"],
        defaultValue: "Standard Audit Report",
      },
    ],
  },

  "data-storage": {
    title: "Data & Storage",
    description:
      "Manage document storage, retention, backups, and audit documentation settings.",
    icon: Database,
    fields: [
      {
        label: "Document Retention (Years)",
        description: "Default retention period for audit documentation.",
        type: "number",
        defaultValue: 7,
      },
      {
        label: "Backup Frequency",
        description: "Preferred backup frequency for platform data.",
        type: "select",
        options: ["Daily", "Weekly", "Monthly"],
        defaultValue: "Daily",
      },
      {
        label: "Document Versioning",
        description: "Keep previous versions of updated audit documents.",
        type: "toggle",
        defaultValue: true,
      },
    ],
  },
};

export default function SettingsSectionPage() {
  const params = useParams<{ section: string }>();
  const sectionKey = params.section;
  const section = SECTIONS[sectionKey];

  const [values, setValues] = useState<Record<string, string | number | boolean>>(() => {
    if (!section) return {};

    return Object.fromEntries(
      section.fields.map((field) => [field.label, field.defaultValue])
    );
  });

  const [saved, setSaved] = useState(false);

  if (!section) {
    return (
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-semibold text-red-900">
            Configuration Not Found
          </h1>

          <p className="mt-2 text-sm text-red-700">
            The requested settings section does not exist.
          </p>

          <Link
            href="/settings"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200"
          >
            <ArrowLeft size={16} />
            Back to Settings
          </Link>
        </div>
      </div>
    );
  }

  const Icon = section.icon;

  function handleSave() {
    localStorage.setItem(
      `aud-platform-settings-${sectionKey}`,
      JSON.stringify(values)
    );

    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 2000);
  }

  return (
    <div className="w-full min-w-0">
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/settings"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Settings
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Icon size={22} />
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {section.title}
                </h1>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {section.description}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Save size={17} />
              {saved ? "Saved" : "Save Changes"}
            </button>
          </div>
        </div>

        <section className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Configuration
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Configure the platform defaults for this area.
            </p>
          </div>

          <div className="divide-y divide-slate-200">
            {section.fields.map((field) => {
              const value = values[field.label];

              return (
                <div
                  key={field.label}
                  className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <h3 className="font-medium text-slate-900">
                      {field.label}
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {field.description}
                    </p>
                  </div>

                  <div className="w-full md:w-80">
                    {field.type === "toggle" ? (
                      <button
                        type="button"
                        aria-pressed={Boolean(value)}
                        onClick={() =>
                          setValues((current) => ({
                            ...current,
                            [field.label]: !Boolean(current[field.label]),
                          }))
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          Boolean(value)
                            ? "bg-blue-600"
                            : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${
                            Boolean(value)
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    ) : field.type === "select" ? (
                      <select
                        value={String(value)}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [field.label]: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        value={Number(value)}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [field.label]: Number(event.target.value),
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
          <p className="text-sm leading-6 text-blue-900">
            Platform configuration is managed separately from engagement
            workpapers, audit procedures, risk assessments, conclusion
            procedures, and reporting workflows.
          </p>
        </div>
      </div>
    </div>
  );
}

