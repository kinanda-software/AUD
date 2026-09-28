"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Edit3,
  FileText,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
  CircleAlert,
  User,
} from "lucide-react";
import {
  createPlanningProcedure,
  deletePlanningProcedure,
  getEngagement,
  getPlanningProceduresByEngagement,
  PlanningProcedure,
  updatePlanningProcedure,
} from "@/lib/api";

const API_URL = "http://localhost:8000";

const STATUS_OPTIONS = [
  {
    value: "not_started",
    label: "Not Started",
  },
  {
    value: "in_progress",
    label: "In Progress",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "not_applicable",
    label: "Not Applicable",
  },
];

type ProcedureStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "not_applicable";

type FormState = {
  procedure_code: string;
  title: string;
  objective: string;
  procedure_description: string;
  status: ProcedureStatus;
  conclusion: string;
  performed_by: string;
  performed_at: string;
};

type AuthUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
};

type SessionResponse = {
  authenticated?: boolean;
  user?: AuthUser;
  error?: string;
};

const emptyForm: FormState = {
  procedure_code: "",
  title: "",
  objective: "",
  procedure_description: "",
  status: "not_started",
  conclusion: "",
  performed_by: "",
  performed_at: "",
};

function isProcedureStatus(
  value: string
): value is ProcedureStatus {
  return (
    value === "not_started" ||
    value === "in_progress" ||
    value === "completed" ||
    value === "not_applicable"
  );
}

function getStatusLabel(value: string) {
  return (
    STATUS_OPTIONS.find(
      (item) => item.value === value
    )?.label || value
  );
}

function statusClass(status: string) {
  switch (status) {
    case "not_started":
      return "bg-gray-100 text-gray-700";

    case "in_progress":
      return "bg-blue-100 text-blue-700";

    case "completed":
      return "bg-green-100 text-green-700";

    case "not_applicable":
      return "bg-purple-100 text-purple-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatDateTimeInput(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(
    date.getHours()
  ).padStart(2, "0");
  const minutes = String(
    date.getMinutes()
  ).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function PlanningProceduresPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = Number(params.id);

  const [engagement, setEngagement] = useState<any>(null);

  const [procedures, setProcedures] = useState<
    PlanningProcedure[]
  >([]);

  const [currentUser, setCurrentUser] =
    useState<AuthUser | null>(null);

  const [form, setForm] =
    useState<FormState>(emptyForm);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [continuing, setContinuing] =
    useState(false);

  const [showForm, setShowForm] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] =
    useState("");

  /*
   * Load authenticated user.
   *
   * The backend session already knows who is logged in.
   * We use /api/auth/me/ instead of asking the user to
   * manually type a database user ID.
   */
  async function loadCurrentUser() {
    const response = await fetch(
      `${API_URL}/api/auth/me/`,
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      }
    );

    let data: SessionResponse = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (
      !response.ok ||
      !data.authenticated ||
      !data.user ||
      !Number.isFinite(data.user.id)
    ) {
      throw new Error(
        "Unable to identify the currently authenticated user."
      );
    }

    setCurrentUser(data.user);

    return data.user;
  }

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

      const [
        engagementData,
        proceduresData,
        userData,
      ] = await Promise.all([
        getEngagement(engagementId),
        getPlanningProceduresByEngagement(
          engagementId
        ),
        loadCurrentUser(),
      ]);

      setEngagement(engagementData);
      setProcedures(proceduresData);
      setCurrentUser(userData);
    } catch (err) {
      console.error(
        "Planning Procedures load error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Planning Procedures."
      );
    } finally {
      setLoading(false);
    }
  }

  function getUserDisplayName(user: AuthUser) {
    const fullName = [
      user.first_name,
      user.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (fullName) {
      return `${fullName} (${user.username})`;
    }

    return user.username;
  }

  function openNewProcedure() {
    if (!currentUser) {
      setError(
        "Your authenticated user could not be identified. Please refresh the page and try again."
      );
      return;
    }

    setEditingId(null);

    setForm({
      ...emptyForm,
      performed_by: String(
        currentUser.id
      ),
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditProcedure(
    procedure: PlanningProcedure
  ) {
    setEditingId(procedure.id);

    setForm({
      procedure_code:
        procedure.procedure_code || "",

      title: procedure.title || "",

      objective:
        procedure.objective || "",

      procedure_description:
        procedure.procedure_description || "",

      status: isProcedureStatus(
        procedure.status
      )
        ? procedure.status
        : "not_started",

      conclusion:
        procedure.conclusion || "",

      /*
       * IMPORTANT:
       * Preserve the existing performed_by value
       * when editing an existing procedure.
       *
       * We do NOT replace it with the current user's
       * ID because another user may have performed it.
       */
      performed_by:
        procedure.performed_by !== null &&
        procedure.performed_by !== undefined
          ? String(procedure.performed_by)
          : "",

      performed_at:
        formatDateTimeInput(
          procedure.performed_at
        ),
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

  function updateField<
    K extends keyof FormState
  >(
    field: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.procedure_code.trim()) {
      setError(
        "Procedure code is required."
      );
      return;
    }

    if (!form.title.trim()) {
      setError(
        "Procedure title is required."
      );
      return;
    }

    if (!form.status) {
      setError(
        "Procedure status is required."
      );
      return;
    }

    /*
     * A new procedure must always have a real
     * authenticated user.
     */
    if (
      editingId === null &&
      (!currentUser ||
        !Number.isFinite(currentUser.id))
    ) {
      setError(
        "The currently logged-in user could not be identified. Please refresh the page and try again."
      );
      return;
    }

    try {
      setSaving(true);

      /*
       * Determine performed_by safely.
       *
       * CREATE:
       * Use the actual authenticated user's database ID.
       *
       * UPDATE:
       * Preserve the existing procedure's performed_by.
       *
       * This prevents invalid IDs such as 123.
       */
      let performedBy: number | null = null;

      if (editingId !== null) {
        if (form.performed_by.trim()) {
          const parsedUserId = Number(
            form.performed_by
          );

          if (
            Number.isInteger(parsedUserId) &&
            parsedUserId > 0
          ) {
            performedBy = parsedUserId;
          }
        }
      } else {
        performedBy = currentUser!.id;
      }

      const payload = {
        engagement: engagementId,

        procedure_code:
          form.procedure_code.trim(),

        title: form.title.trim(),

        objective:
          form.objective.trim(),

        procedure_description:
          form.procedure_description.trim(),

        status: form.status,

        conclusion:
          form.conclusion.trim(),

        performed_by: performedBy,

        performed_at: form.performed_at
          ? new Date(
              form.performed_at
            ).toISOString()
          : null,
      };

      console.log(
        "Planning Procedure payload:",
        payload
      );

      if (editingId !== null) {
        const updated =
          await updatePlanningProcedure(
            editingId,
            payload
          );

        setProcedures((current) =>
          current.map((procedure) =>
            procedure.id === editingId
              ? updated
              : procedure
          )
        );

        setSuccess(
          "Planning procedure updated successfully."
        );
      } else {
        const created =
          await createPlanningProcedure(
            payload
          );

        setProcedures((current) => [
          created,
          ...current,
        ]);

        setSuccess(
          "Planning procedure created successfully."
        );
      }

      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      console.error(
        "Planning Procedure save error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save planning procedure."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(
    procedure: PlanningProcedure
  ) {
    const confirmed = window.confirm(
      `Delete "${procedure.title}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(procedure.id);
      setError("");
      setSuccess("");

      await deletePlanningProcedure(
        procedure.id
      );

      setProcedures((current) =>
        current.filter(
          (item) =>
            item.id !== procedure.id
        )
      );

      setSuccess(
        "Planning procedure deleted successfully."
      );
    } catch (err) {
      console.error(
        "Planning Procedure delete error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete planning procedure."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const summary = useMemo(() => {
    return {
      total: procedures.length,

      notStarted:
        procedures.filter(
          (procedure) =>
            procedure.status ===
            "not_started"
        ).length,

      inProgress:
        procedures.filter(
          (procedure) =>
            procedure.status ===
            "in_progress"
        ).length,

      completed:
        procedures.filter(
          (procedure) =>
            procedure.status ===
            "completed"
        ).length,

      notApplicable:
        procedures.filter(
          (procedure) =>
            procedure.status ===
            "not_applicable"
        ).length,
    };
  }, [procedures]);

  /*
   * Phase 1 completion gate.
   *
   * There must be at least one procedure,
   * and every procedure must be either
   * Completed or Not Applicable.
   */
  const canContinueToPhase2 =
    procedures.length > 0 &&
    procedures.every(
      (procedure) =>
        procedure.status ===
          "completed" ||
        procedure.status ===
          "not_applicable"
    );

  function handleBackToPlanningMatters() {
    if (
      showForm &&
      form.title.trim()
    ) {
      const confirmed =
        window.confirm(
          "You have unsaved planning procedure information. Are you sure you want to leave this page?"
        );

      if (!confirmed) {
        return;
      }
    }

    router.push(
      `/engagements/${engagementId}/audit-planning/planning-matters`
    );
  }

  function handleContinueToPhase2() {
    if (showForm) {
      window.alert(
        "Please save or cancel the current planning procedure before continuing to Phase 2."
      );
      return;
    }

    if (!canContinueToPhase2) {
      window.alert(
        procedures.length === 0
          ? "Add at least one planning procedure before continuing to Phase 2."
          : "Complete all planning procedures or mark them as Not Applicable before continuing to Phase 2."
      );
      return;
    }

    setContinuing(true);

    router.push(
      `/engagements/${engagementId}/risk-assessment`
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 text-gray-600">
            <Loader2 className="h-6 w-6 animate-spin" />

            <span>
              Loading Planning Procedures...
            </span>
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
                <div className="rounded-lg bg-blue-100 p-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>

                <span className="text-sm font-semibold text-blue-600">
                  Workpaper 1.6
                </span>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Planning Procedures
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-gray-600 sm:text-base">
                Document the audit procedures planned during the
                planning phase, including their objectives,
                detailed procedures, status, conclusions and
                performance information.
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

              {currentUser && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                  <User className="h-4 w-4" />

                  Logged in as:{" "}
                  <span className="font-semibold text-gray-800">
                    {getUserDisplayName(
                      currentUser
                    )}
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={openNewProcedure}
              disabled={!currentUser}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />

              Add Planning Procedure
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
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Total Procedures"
            value={summary.total}
          />

          <SummaryCard
            label="Not Started"
            value={summary.notStarted}
          />

          <SummaryCard
            label="In Progress"
            value={summary.inProgress}
          />

          <SummaryCard
            label="Completed"
            value={summary.completed}
          />

          <SummaryCard
            label="Not Applicable"
            value={summary.notApplicable}
          />
        </div>

        {/* Completion status */}
        <div
          className={`mb-6 rounded-xl border p-5 ${
            canContinueToPhase2
              ? "border-green-200 bg-green-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex items-start gap-3">
            {canContinueToPhase2 ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            ) : (
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            )}

            <div>
              <h2
                className={`font-semibold ${
                  canContinueToPhase2
                    ? "text-green-900"
                    : "text-amber-900"
                }`}
              >
                {canContinueToPhase2
                  ? "Planning Procedures Complete"
                  : "Planning Procedures Not Yet Complete"}
              </h2>

              <p
                className={`mt-1 text-sm ${
                  canContinueToPhase2
                    ? "text-green-800"
                    : "text-amber-800"
                }`}
              >
                {canContinueToPhase2
                  ? "All planning procedures are completed or marked Not Applicable. You can proceed to Phase 2 Risk Assessment."
                  : procedures.length === 0
                    ? "Add at least one planning procedure before proceeding to Phase 2."
                    : "Complete all procedures or mark them as Not Applicable before proceeding to Phase 2."}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="font-semibold text-gray-900">
                  {editingId !== null
                    ? "Edit Planning Procedure"
                    : "New Planning Procedure"}
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Document the planned audit procedure and its
                  current status.
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
                {/* Procedure Code */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Procedure Code
                  </label>

                  <input
                    type="text"
                    value={form.procedure_code}
                    onChange={(event) =>
                      updateField(
                        "procedure_code",
                        event.target.value
                      )
                    }
                    placeholder="e.g. PP-001"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />

                  <p className="mt-1 text-xs text-gray-500">
                    Use a unique code for this engagement.
                  </p>
                </div>

                {/* Status */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Status
                  </label>

                  <select
                    value={form.status}
                    onChange={(event) => {
                      const value =
                        event.target.value;

                      if (
                        isProcedureStatus(
                          value
                        )
                      ) {
                        updateField(
                          "status",
                          value
                        );
                      }
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  >
                    {STATUS_OPTIONS.map(
                      (item) => (
                        <option
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* Title */}
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Procedure Title
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
                    placeholder="e.g. Review revenue recognition policy and supporting controls"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                {/* Objective */}
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Objective
                  </label>

                  <textarea
                    value={form.objective}
                    onChange={(event) =>
                      updateField(
                        "objective",
                        event.target.value
                      )
                    }
                    rows={4}
                    placeholder="State what this audit procedure is intended to achieve."
                    className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                {/* Procedure Description */}
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Procedure Description
                  </label>

                  <textarea
                    value={
                      form.procedure_description
                    }
                    onChange={(event) =>
                      updateField(
                        "procedure_description",
                        event.target.value
                      )
                    }
                    rows={6}
                    placeholder="Describe the audit steps, tests, evidence to be obtained, population or sample to be tested, and other relevant instructions."
                    className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                {/* Conclusion */}
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Conclusion
                  </label>

                  <textarea
                    value={form.conclusion}
                    onChange={(event) =>
                      updateField(
                        "conclusion",
                        event.target.value
                      )
                    }
                    rows={5}
                    placeholder="Document the conclusion reached after performing or reviewing this procedure."
                    className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />
                </div>

                {/* Performed By */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Performed By
                  </label>

                  <div className="flex min-h-[44px] items-center gap-3 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>

                    <div className="min-w-0">
                      {editingId !== null ? (
                        form.performed_by ? (
                          <div className="text-sm font-medium text-gray-800">
                            User ID{" "}
                            {form.performed_by}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            Not recorded
                          </div>
                        )
                      ) : currentUser ? (
                        <div className="text-sm font-medium text-gray-800">
                          {getUserDisplayName(
                            currentUser
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-red-600">
                          User not identified
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="mt-1 text-xs text-gray-500">
                    {editingId !== null
                      ? "The existing performer is preserved when this procedure is edited."
                      : "Automatically assigned to the currently logged-in user."}
                  </p>
                </div>

                {/* Performed At */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Performed At
                  </label>

                  <input
                    type="datetime-local"
                    value={form.performed_at}
                    onChange={(event) =>
                      updateField(
                        "performed_at",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  />

                  <p className="mt-1 text-xs text-gray-500">
                    Leave blank if the procedure has not yet
                    been performed.
                  </p>
                </div>
              </div>

              {/* Form Actions */}
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
                  disabled={
                    saving ||
                    !currentUser
                  }
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
                        ? "Update Procedure"
                        : "Save Procedure"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Procedures */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Documented Planning Procedures
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              All planning procedures recorded for this
              engagement.
            </p>
          </div>

          {procedures.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <FileText className="h-6 w-6 text-gray-500" />
              </div>

              <h3 className="font-semibold text-gray-900">
                No planning procedures recorded
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                Add the audit procedures planned for this
                engagement, including their objectives,
                detailed steps and expected responses.
              </p>

              <button
                type="button"
                onClick={openNewProcedure}
                disabled={!currentUser}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />

                Add First Procedure
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {procedures.map(
                (procedure) => (
                  <div
                    key={procedure.id}
                    className="p-5 transition hover:bg-gray-50"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        {/* Title / Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white">
                            {
                              procedure.procedure_code
                            }
                          </span>

                          <h3 className="text-base font-semibold text-gray-900">
                            {
                              procedure.title
                            }
                          </h3>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                              procedure.status
                            )}`}
                          >
                            {getStatusLabel(
                              procedure.status
                            )}
                          </span>
                        </div>

                        {/* Objective */}
                        {procedure.objective && (
                          <div className="mt-4">
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Objective
                            </div>

                            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                              {
                                procedure.objective
                              }
                            </p>
                          </div>
                        )}

                        {/* Procedure Description */}
                        {procedure.procedure_description && (
                          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Procedure Description
                            </div>

                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                              {
                                procedure.procedure_description
                              }
                            </p>
                          </div>
                        )}

                        {/* Conclusion */}
                        {procedure.conclusion && (
                          <div className="mt-4 rounded-lg border border-green-100 bg-green-50 p-4">
                            <div className="text-xs font-semibold uppercase tracking-wide text-green-700">
                              Conclusion
                            </div>

                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-green-900">
                              {
                                procedure.conclusion
                              }
                            </p>
                          </div>
                        )}

                        {/* Performance Information */}
                        {(procedure.performed_by ||
                          procedure.performed_at) && (
                          <div className="mt-4 flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:flex-wrap sm:items-center">
                            {procedure.performed_by && (
                              <span>
                                Performed by:{" "}
                                <span className="font-semibold text-gray-700">
                                  {procedure.performed_by_username ||
                                    `User ID ${procedure.performed_by}`}
                                </span>
                              </span>
                            )}

                            {procedure.performed_at && (
                              <span>
                                Performed at:{" "}
                                <span className="font-semibold text-gray-700">
                                  {formatDateTime(
                                    procedure.performed_at
                                  )}
                                </span>
                              </span>
                            )}
                          </div>
                        )}

                        {/* Created / Updated */}
                        <div className="mt-3 text-xs text-gray-400">
                          {procedure.updated_at
                            ? `Last updated ${formatDateTime(
                                procedure.updated_at
                              )}`
                            : ""}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEditProcedure(
                              procedure
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Edit3 className="h-4 w-4" />

                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              procedure
                            )
                          }
                          disabled={
                            deletingId ===
                            procedure.id
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId ===
                          procedure.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}

                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Workflow Navigation */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            {/* Previous */}
            <button
              type="button"
              onClick={
                handleBackToPlanningMatters
              }
              disabled={continuing}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />

              Back to 1.5 Planning Matters
            </button>

            {/* Current Workpaper */}
            <div className="hidden text-center sm:block">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Audit Planning Workflow
              </div>

              <div className="mt-1 text-sm font-semibold text-gray-900">
                Workpaper 1.6 — Planning Procedures
              </div>
            </div>

            {/* Phase 2 */}
            <button
              type="button"
              onClick={
                handleContinueToPhase2
              }
              disabled={
                continuing ||
                !canContinueToPhase2 ||
                showForm
              }
              title={
                showForm
                  ? "Save or cancel the current procedure first."
                  : !canContinueToPhase2
                    ? "Complete all procedures or mark them Not Applicable first."
                    : "Continue to Phase 2 Risk Assessment"
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {continuing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />

                  Opening Phase 2...
                </>
              ) : (
                <>
                  Continue to Phase 2

                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {!canContinueToPhase2 &&
            !showForm && (
              <div className="border-t border-gray-200 bg-gray-50 px-5 py-3 text-center text-xs text-gray-500">
                Complete all planning procedures or
                mark them as Not Applicable to unlock
                Phase 2.
              </div>
            )}

          {canContinueToPhase2 && (
            <div className="border-t border-green-200 bg-green-50 px-5 py-3 text-center text-xs font-medium text-green-700">
              Phase 1 Audit Planning is complete. You
              can now proceed to Phase 2 Risk Assessment.
            </div>
          )}
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