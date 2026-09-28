
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  createPlanningMatter,
  deletePlanningMatter,
  getEngagement,
  getPlanningMattersByEngagement,
  PlanningMatter,
  updatePlanningMatter,
} from "@/lib/api";

const MATTER_TYPES = [
  {
    value: "significant_risk",
    label: "Significant Risk",
  },
  {
    value: "fraud",
    label: "Fraud",
  },
  {
    value: "related_party",
    label: "Related Party",
  },
  {
    value: "going_concern",
    label: "Going Concern",
  },
  {
    value: "estimation",
    label: "Accounting Estimation",
  },
  {
    value: "it",
    label: "Information Technology",
  },
  {
    value: "regulatory",
    label: "Regulatory",
  },
  {
    value: "litigation",
    label: "Litigation",
  },
  {
    value: "other",
    label: "Other",
  },
];

const SEVERITIES = [
  {
    value: "low",
    label: "Low",
  },
  {
    value: "medium",
    label: "Medium",
  },
  {
    value: "high",
    label: "High",
  },
  {
    value: "critical",
    label: "Critical",
  },
];

type FormState = {
  matter_type: string;
  title: string;
  description: string;
  severity: string;
  response_required: boolean;
  planned_response: string;
  resolved: boolean;
};

const emptyForm: FormState = {
  matter_type: "significant_risk",
  title: "",
  description: "",
  severity: "medium",
  response_required: true,
  planned_response: "",
  resolved: false,
};

export default function PlanningMattersPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = Number(params.id);

  const [engagement, setEngagement] = useState<any>(null);
  const [matters, setMatters] = useState<PlanningMatter[]>([]);

  const [form, setForm] = useState<FormState>(emptyForm);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [continuing, setContinuing] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!Number.isFinite(engagementId)) {
      setError("Invalid engagement ID.");
      setLoading(false);
      return;
    }

    loadData();
  }, [engagementId]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [engagementData, mattersData] = await Promise.all([
        getEngagement(engagementId),
        getPlanningMattersByEngagement(engagementId),
      ]);

      setEngagement(engagementData);
      setMatters(mattersData);
    } catch (err) {
      console.error("Planning Matters load error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Planning Matters."
      );
    } finally {
      setLoading(false);
    }
  }

  function openNewMatter() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditMatter(matter: PlanningMatter) {
    setEditingId(matter.id);

    setForm({
      matter_type: matter.matter_type,
      title: matter.title,
      description: matter.description || "",
      severity: matter.severity,
      response_required: matter.response_required,
      planned_response: matter.planned_response || "",
      resolved: matter.resolved,
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Matter title is required.");
      return;
    }

    if (!form.matter_type) {
      setError("Matter type is required.");
      return;
    }

    if (!form.severity) {
      setError("Severity is required.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        engagement: engagementId,
        matter_type: form.matter_type,
        title: form.title.trim(),
        description: form.description.trim(),
        severity: form.severity,
        response_required: form.response_required,
        planned_response: form.planned_response.trim(),
        resolved: form.resolved,
      };

      if (editingId !== null) {
        const updated = await updatePlanningMatter(
          editingId,
          payload
        );

        setMatters((current) =>
          current.map((matter) =>
            matter.id === editingId ? updated : matter
          )
        );

        setSuccess("Planning matter updated successfully.");
      } else {
        const created = await createPlanningMatter(payload);

        setMatters((current) => [
          created,
          ...current,
        ]);

        setSuccess("Planning matter created successfully.");
      }

      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      console.error("Planning Matter save error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save planning matter."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(matter: PlanningMatter) {
    const confirmed = window.confirm(
      `Delete "${matter.title}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(matter.id);
      setError("");
      setSuccess("");

      await deletePlanningMatter(matter.id);

      setMatters((current) =>
        current.filter((item) => item.id !== matter.id)
      );

      setSuccess("Planning matter deleted successfully.");
    } catch (err) {
      console.error("Planning Matter delete error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete planning matter."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function handleBackToAuditTeam() {
    if (showForm && form.title.trim()) {
      const confirmed = window.confirm(
        "You have unsaved planning matter information. Are you sure you want to leave this page?"
      );

      if (!confirmed) {
        return;
      }
    }

    router.push(
      `/engagements/${engagementId}/audit-planning/audit-team`
    );
  }

  function handleContinueToPlanningProcedures() {
    if (showForm && form.title.trim()) {
      const confirmed = window.confirm(
        "You have unsaved planning matter information. Please save the matter before continuing."
      );

      if (!confirmed) {
        return;
      }

      return;
    }

    setContinuing(true);

    router.push(
      `/engagements/${engagementId}/audit-planning/planning-procedures`
    );
  }

  function getMatterTypeLabel(value: string) {
    return (
      MATTER_TYPES.find((item) => item.value === value)?.label ||
      value
    );
  }

  function getSeverityLabel(value: string) {
    return (
      SEVERITIES.find((item) => item.value === value)?.label ||
      value
    );
  }

  function severityClass(severity: string) {
    switch (severity) {
      case "low":
        return "bg-gray-100 text-gray-700";

      case "medium":
        return "bg-blue-100 text-blue-700";

      case "high":
        return "bg-orange-100 text-orange-700";

      case "critical":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  const summary = useMemo(() => {
    return {
      total: matters.length,
      unresolved: matters.filter(
        (matter) => !matter.resolved
      ).length,
      responseRequired: matters.filter(
        (matter) => matter.response_required
      ).length,
      critical: matters.filter(
        (matter) => matter.severity === "critical"
      ).length,
    };
  }, [matters]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 text-gray-600">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading Planning Matters...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() =>
              router.push(
                `/engagements/${engagementId}/audit-planning`
              )
            }
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Audit Planning
          </button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="rounded-lg bg-orange-100 p-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>

                <span className="text-sm font-semibold text-orange-600">
                  Workpaper 1.5
                </span>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Planning Matters
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-gray-600 sm:text-base">
                Capture significant risks, fraud risks, related
                parties, going concern, accounting estimates, IT,
                regulatory, litigation and other matters requiring
                specific audit responses.
              </p>

              {engagement && (
                <div className="mt-3 text-sm text-gray-500">
                  Engagement:{" "}
                  <span className="font-semibold text-gray-800">
                    {engagement.engagement_code ||
                      engagement.code ||
                      engagement.title ||
                      `#${engagementId}`}
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={openNewMatter}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
              Add Planning Matter
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </div>
        )}

        {/* Summary */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Matters"
            value={summary.total}
          />

          <SummaryCard
            label="Unresolved"
            value={summary.unresolved}
          />

          <SummaryCard
            label="Response Required"
            value={summary.responseRequired}
          />

          <SummaryCard
            label="Critical"
            value={summary.critical}
          />
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="font-semibold text-gray-900">
                  {editingId !== null
                    ? "Edit Planning Matter"
                    : "New Planning Matter"}
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Document the matter and the planned audit
                  response.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-2">
                {/* Matter Type */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Matter Type
                  </label>

                  <select
                    value={form.matter_type}
                    onChange={(event) =>
                      updateField(
                        "matter_type",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  >
                    {MATTER_TYPES.map((item) => (
                      <option
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Severity */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Severity
                  </label>

                  <select
                    value={form.severity}
                    onChange={(event) =>
                      updateField(
                        "severity",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  >
                    {SEVERITIES.map((item) => (
                      <option
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Matter Title
                  </label>

                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) =>
                      updateField(
                        "title",
                        event.target.value
                      )
                    }
                    placeholder="e.g. Revenue recognition requires specific audit response"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                {/* Description */}
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Description
                  </label>

                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateField(
                        "description",
                        event.target.value
                      )
                    }
                    rows={5}
                    placeholder="Describe the matter, relevant facts, circumstances and why it requires attention during planning."
                    className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                {/* Planned Response */}
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Planned Audit Response
                  </label>

                  <textarea
                    value={form.planned_response}
                    onChange={(event) =>
                      updateField(
                        "planned_response",
                        event.target.value
                      )
                    }
                    rows={5}
                    placeholder="Describe the audit procedures, specialist involvement, additional testing or other response planned for this matter."
                    className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                {/* Response Required */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={form.response_required}
                      onChange={(event) =>
                        updateField(
                          "response_required",
                          event.target.checked
                        )
                      }
                      className="mt-1 h-4 w-4 rounded border-gray-300"
                    />

                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        Specific audit response required
                      </div>

                      <div className="mt-1 text-xs text-gray-500">
                        Select this when the matter requires a
                        documented audit response.
                      </div>
                    </div>
                  </label>
                </div>

                {/* Resolved */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={form.resolved}
                      onChange={(event) =>
                        updateField(
                          "resolved",
                          event.target.checked
                        )
                      }
                      className="mt-1 h-4 w-4 rounded border-gray-300"
                    />

                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        Matter resolved
                      </div>

                      <div className="mt-1 text-xs text-gray-500">
                        Mark this when the planning matter has been
                        addressed and no further action is required.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {editingId !== null
                        ? "Update Matter"
                        : "Save Matter"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Matters */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Documented Planning Matters
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              All planning matters recorded for this engagement.
            </p>
          </div>

          {matters.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <AlertTriangle className="h-6 w-6 text-gray-500" />
              </div>

              <h3 className="font-semibold text-gray-900">
                No planning matters recorded
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                Add the significant risks, fraud considerations,
                related parties, going concern matters and other
                issues identified during audit planning.
              </p>

              <button
                type="button"
                onClick={openNewMatter}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
              >
                <Plus className="h-4 w-4" />
                Add First Matter
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {matters.map((matter) => (
                <div
                  key={matter.id}
                  className="p-5 transition hover:bg-gray-50"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-gray-900">
                          {matter.title}
                        </h3>

                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {getMatterTypeLabel(
                            matter.matter_type
                          )}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityClass(
                            matter.severity
                          )}`}
                        >
                          {getSeverityLabel(
                            matter.severity
                          )}
                        </span>

                        {matter.resolved ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Resolved
                          </span>
                        ) : (
                          <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-700">
                            Open
                          </span>
                        )}
                      </div>

                      {matter.description && (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                          {matter.description}
                        </p>
                      )}

                      {matter.response_required && (
                        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
                          <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                            Planned Audit Response
                          </div>

                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-blue-900">
                            {matter.planned_response ||
                              "Response required but no planned response has been documented yet."}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openEditMatter(matter)
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(matter)
                        }
                        disabled={
                          deletingId === matter.id
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === matter.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Workflow Navigation */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            {/* Previous Workpaper */}
            <button
              type="button"
              onClick={handleBackToAuditTeam}
              disabled={continuing}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to 1.4 Audit Team
            </button>

            {/* Current Workpaper */}
            <div className="hidden text-center sm:block">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Audit Planning Workflow
              </div>

              <div className="mt-1 text-sm font-semibold text-gray-700">
                1.5 Planning Matters
              </div>
            </div>

            {/* Next Workpaper */}
            <button
              type="button"
              onClick={handleContinueToPlanningProcedures}
              disabled={continuing || showForm}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {continuing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Opening 1.6...
                </>
              ) : (
                <>
                  Continue to 1.6 Planning Procedures
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-gray-500">
        {label}
      </div>

      <div className="mt-2 text-2xl font-bold text-gray-900">
        {value}
      </div>
    </div>
  );
}

