"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Edit,
  Loader2,
  Plus,
  Save,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import {
  createAuditTeamMember,
  deleteAuditTeamMember,
  getAuditTeamByEngagement,
  getEngagement,
  updateAuditTeamMember,
  type AuditTeamMember,
  type Engagement,
} from "@/lib/api";

interface AvailableUser {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  is_active?: boolean;
}

const ROLES = [
  { value: "engagement_partner", label: "Engagement Partner" },
  { value: "engagement_manager", label: "Engagement Manager" },
  { value: "senior_auditor", label: "Senior Auditor" },
  { value: "auditor", label: "Auditor" },
  { value: "assistant", label: "Assistant" },
  { value: "it_specialist", label: "IT Specialist" },
  { value: "tax_specialist", label: "Tax Specialist" },
  { value: "valuation_specialist", label: "Valuation Specialist" },
  { value: "other", label: "Other" },
];

const API_URL = "http://localhost:8000/api";

export default function AuditTeamPage() {
  const params = useParams();
  const router = useRouter();

  const engagementId = String(params.id);

  const [engagement, setEngagement] =
    useState<Engagement | null>(null);

  const [members, setMembers] = useState<AuditTeamMember[]>([]);

  const [users, setUsers] = useState<AvailableUser[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [continuing, setContinuing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("auditor");
  const [responsibilities, setResponsibilities] =
    useState("");
  const [budgetedHours, setBudgetedHours] =
    useState("0");
  const [isKeyMember, setIsKeyMember] =
    useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [engagementData, teamData] =
        await Promise.all([
          getEngagement(engagementId),
          getAuditTeamByEngagement(engagementId),
        ]);

      setEngagement(engagementData);
      setMembers(teamData);

      try {
        const csrfResponse = await fetch(
          `${API_URL}/auth/csrf-token/`,
          {
            credentials: "include",
          }
        );

        if (!csrfResponse.ok) {
          throw new Error(
            "Unable to initialize session."
          );
        }

        /*
         * IMPORTANT:
         * This endpoint is different from /auth/users/.
         *
         * /auth/users/ is administrator-only.
         * /auth/audit-team-users/ allows active
         * admin, manager and auditor users to view
         * users available for audit-team assignment.
         */
        const usersResponse = await fetch(
          `${API_URL}/auth/audit-team-users/`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        if (usersResponse.ok) {
          const usersData =
            await usersResponse.json();

          if (Array.isArray(usersData)) {
            setUsers(usersData);
          } else if (
            Array.isArray(usersData.users)
          ) {
            setUsers(usersData.users);
          }
        } else {
          console.error(
            "Audit team users request failed:",
            usersResponse.status,
            usersResponse.statusText
          );
        }
      } catch (userError) {
        console.error(
          "Unable to load audit team users:",
          userError
        );

        /*
         * The team list can still be displayed if
         * the user list endpoint is unavailable.
         */
      }
    } catch (err) {
      console.error(err);
      setError(
        "Failed to load the audit team."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [engagementId]);

  const resetForm = () => {
    setEditingId(null);
    setUserId("");
    setRole("auditor");
    setResponsibilities("");
    setBudgetedHours("0");
    setIsKeyMember(false);
    setShowForm(false);
  };

  const startAdd = () => {
    setError("");
    setSuccess("");

    setEditingId(null);
    setUserId("");
    setRole("auditor");
    setResponsibilities("");
    setBudgetedHours("0");
    setIsKeyMember(false);

    setShowForm(true);
  };

  const startEdit = (
    member: AuditTeamMember
  ) => {
    setError("");
    setSuccess("");

    setEditingId(member.id);
    setUserId(String(member.user));
    setRole(member.role);
    setResponsibilities(
      member.responsibilities || ""
    );
    setBudgetedHours(
      member.budgeted_hours || "0"
    );
    setIsKeyMember(member.is_key_member);

    setShowForm(true);
  };

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!userId) {
      setError("Please select a user.");
      return;
    }

    if (!role) {
      setError("Please select a role.");
      return;
    }

    const hours = Number(budgetedHours);

    if (
      Number.isNaN(hours) ||
      hours < 0
    ) {
      setError(
        "Budgeted hours must be a valid positive number."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        engagement: Number(engagementId),
        user: Number(userId),
        role,
        responsibilities,
        budgeted_hours: hours.toFixed(2),
        is_key_member: isKeyMember,
      };

      if (editingId !== null) {
        await updateAuditTeamMember(
          editingId,
          payload
        );

        setSuccess(
          "Audit team member updated successfully."
        );
      } else {
        await createAuditTeamMember(
          payload
        );

        setSuccess(
          "Audit team member added successfully."
        );
      }

      resetForm();

      const updatedMembers =
        await getAuditTeamByEngagement(
          engagementId
        );

      setMembers(updatedMembers);
    } catch (err: any) {
      console.error(err);

      const message =
        err?.message ||
        "Unable to save the audit team member.";

      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (
    member: AuditTeamMember
  ) => {
    const confirmed = window.confirm(
      `Remove ${
        member.username ||
        "this team member"
      } from the audit team?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await deleteAuditTeamMember(
        member.id
      );

      setMembers((current) =>
        current.filter(
          (item) =>
            item.id !== member.id
        )
      );

      setSuccess(
        "Audit team member removed successfully."
      );
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to remove the audit team member."
      );
    }
  };

  const handleSaveAndContinue =
    async () => {
      setError("");
      setSuccess("");

      /*
       * Audit Team is a multi-member workpaper.
       * We require at least one assigned member
       * before continuing to the next workpaper.
       */
      if (members.length === 0) {
        setError(
          "Please add at least one audit team member before continuing to Workpaper 1.5."
        );
        return;
      }

      try {
        setContinuing(true);

        /*
         * Refresh the team from the backend
         * before continuing.
         */
        const updatedMembers =
          await getAuditTeamByEngagement(
            engagementId
          );

        setMembers(updatedMembers);

        if (updatedMembers.length === 0) {
          setError(
            "No audit team members were found for this engagement. Please add at least one member before continuing."
          );
          return;
        }

        router.push(
          `/engagements/${engagementId}/audit-planning/planning-matters`
        );
      } catch (err: any) {
        console.error(
          "Save & Continue audit team error:",
          err
        );

        setError(
          err?.message ||
            "Unable to continue to Workpaper 1.5."
        );
      } finally {
        setContinuing(false);
      }
    };

  const roleLabel = (
    value: string
  ) => {
    return (
      ROLES.find(
        (item) =>
          item.value === value
      )?.label || value
    );
  };

  const totalHours = useMemo(() => {
    return members.reduce(
      (total, member) =>
        total +
        Number(
          member.budgeted_hours || 0
        ),
      0
    );
  }, [members]);

  const keyMembers = members.filter(
    (member) =>
      member.is_key_member
  ).length;

  return (
    <AppLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

          {/* Back */}
          <button
            type="button"
            onClick={() =>
              router.push(
                `/engagements/${engagementId}/audit-planning`
              )
            }
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={18} />
            Back to Audit Planning
          </button>

          {/* Header */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                <div>
                  <div className="mb-2 flex items-center gap-3">

                    <div className="rounded-xl bg-slate-900 p-3 text-white">
                      <Users size={22} />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        Workpaper 1.4
                      </p>

                      <h1 className="text-2xl font-bold text-slate-900">
                        Audit Team
                      </h1>
                    </div>

                  </div>

                  {engagement && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">

                      <BriefcaseBusiness size={16} />

                      <span className="font-medium">
                        {engagement.engagement_code}
                      </span>

                      <span>•</span>

                      <span>
                        {engagement.title}
                      </span>

                    </div>
                  )}
                </div>

                {!showForm && (
                  <button
                    type="button"
                    onClick={startAdd}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    <Plus size={18} />
                    Add Team Member
                  </button>
                )}

              </div>
            </div>

            {/* Workflow */}
            <div className="border-t border-slate-200 px-6 py-5">
              <div className="flex flex-wrap items-center gap-2">

                <div className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                  <CheckCircle2 size={15} />
                  1.1 Planning Assessment
                </div>

                <ArrowRight
                  size={15}
                  className="text-slate-400"
                />

                <div className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                  <CheckCircle2 size={15} />
                  1.2 Materiality
                </div>

                <ArrowRight
                  size={15}
                  className="text-slate-400"
                />

                <div className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                  <CheckCircle2 size={15} />
                  1.3 Audit Scope
                </div>

                <ArrowRight
                  size={15}
                  className="text-slate-400"
                />

                <div className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                  <Users size={15} />
                  1.4 Audit Team
                </div>

                <ArrowRight
                  size={15}
                  className="text-slate-400"
                />

                <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                  1.5 Planning Matters
                </div>

              </div>
            </div>

          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <X
                size={18}
                className="mt-0.5 shrink-0"
              />

              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              <Check
                size={18}
                className="mt-0.5 shrink-0"
              />

              <span>{success}</span>
            </div>
          )}

          {/* Summary */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Team Members
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {members.length}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Key Members
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {keyMembers}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Budgeted Hours
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {totalHours.toFixed(2)}
              </p>
            </div>

          </div>

          {/* Add/Edit Form */}
          {showForm && (
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <div className="mb-5 flex items-center justify-between">

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingId !== null
                      ? "Edit Team Member"
                      : "Add Team Member"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Assign a user and define their responsibilities
                    for this engagement.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                >
                  <X size={20} />
                </button>

              </div>

              <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 gap-5 md:grid-cols-2"
              >

                {/* User */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    User
                  </label>

                  {users.length > 0 ? (
                    <select
                      value={userId}
                      onChange={(e) =>
                        setUserId(
                          e.target.value
                        )
                      }
                      disabled={
                        editingId !== null
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                    >
                      <option value="">
                        Select a user
                      </option>

                      {users
                        .filter(
                          (user) =>
                            user.is_active !==
                              false ||
                            String(
                              user.id
                            ) === userId
                        )
                        .map((user) => (
                          <option
                            key={user.id}
                            value={user.id}
                          >
                            {user.username}

                            {user.first_name ||
                            user.last_name
                              ? ` — ${[
                                  user.first_name,
                                  user.last_name,
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(
                                    " "
                                  )}`
                              : ""}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      The user list is not available for your
                      account. Ask an administrator to assign the
                      team member.
                    </div>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Role
                  </label>

                  <select
                    value={role}
                    onChange={(e) =>
                      setRole(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  >
                    {ROLES.map((item) => (
                      <option
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Budgeted Hours */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Budgeted Hours
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={budgetedHours}
                    onChange={(e) =>
                      setBudgetedHours(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                {/* Key Member */}
                <div className="flex items-end">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={
                        isKeyMember
                      }
                      onChange={(e) =>
                        setIsKeyMember(
                          e.target.checked
                        )
                      }
                      className="h-4 w-4"
                    />

                    <span className="text-sm font-medium text-slate-700">
                      Key team member
                    </span>
                  </label>
                </div>

                {/* Responsibilities */}
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Responsibilities
                  </label>

                  <textarea
                    value={
                      responsibilities
                    }
                    onChange={(e) =>
                      setResponsibilities(
                        e.target.value
                      )
                    }
                    rows={4}
                    placeholder="Describe the responsibilities of this team member..."
                    className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex flex-col-reverse gap-3 md:col-span-2 md:flex-row md:justify-end">

                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <X size={17} />
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving ||
                      continuing ||
                      users.length === 0
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />
                        Saving...
                      </>
                    ) : editingId !==
                      null ? (
                      <>
                        <Save
                          size={17}
                        />
                        Update Member
                      </>
                    ) : (
                      <>
                        <UserPlus
                          size={17}
                        />
                        Add Member
                      </>
                    )}
                  </button>

                </div>
              </form>
            </div>
          )}

          {/* Assigned Team */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-200 px-6 py-5">

              <h2 className="text-lg font-bold text-slate-900">
                Assigned Audit Team
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Team members currently assigned to this engagement.
              </p>

            </div>

            {loading ? (
              <div className="flex min-h-60 items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Loader2
                    size={20}
                    className="animate-spin"
                  />
                  Loading audit team...
                </div>
              </div>
            ) : members.length ===
              0 ? (
              <div className="flex min-h-60 flex-col items-center justify-center px-6 text-center">

                <div className="mb-4 rounded-full bg-slate-100 p-4">
                  <Users
                    size={28}
                    className="text-slate-500"
                  />
                </div>

                <h3 className="text-lg font-semibold text-slate-900">
                  No team members assigned
                </h3>

                <p className="mt-1 max-w-md text-sm text-slate-500">
                  Add the people who will participate in this
                  engagement and define their responsibilities.
                </p>

                {!showForm && (
                  <button
                    type="button"
                    onClick={startAdd}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    <Plus size={18} />
                    Add First Member
                  </button>
                )}

              </div>
            ) : (
              <div className="overflow-x-auto">

                <table className="min-w-full">

                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left">

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Team Member
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Role
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Responsibilities
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Hours
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Key
                      </th>

                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>

                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">

                    {members.map(
                      (member) => (
                        <tr
                          key={member.id}
                          className="hover:bg-slate-50"
                        >

                          {/* Team Member */}
                          <td className="px-6 py-5">

                            <div className="flex items-center gap-3">

                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                                {(
                                  member.username ||
                                  "U"
                                )
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase()}
                              </div>

                              <div>

                                <p className="font-semibold text-slate-900">
                                  {member.username ||
                                    `User ${member.user}`}
                                </p>

                                <p className="text-xs text-slate-500">
                                  User ID:{" "}
                                  {
                                    member.user
                                  }
                                </p>

                              </div>

                            </div>

                          </td>

                          {/* Role */}
                          <td className="px-6 py-5">

                            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {roleLabel(
                                member.role
                              )}
                            </span>

                          </td>

                          {/* Responsibilities */}
                          <td className="max-w-md px-6 py-5">

                            <p className="line-clamp-3 text-sm text-slate-600">
                              {member.responsibilities ||
                                "No responsibilities specified."}
                            </p>

                          </td>

                          {/* Hours */}
                          <td className="px-6 py-5 text-sm font-semibold text-slate-800">
                            {Number(
                              member.budgeted_hours ||
                                0
                            ).toFixed(2)}
                          </td>

                          {/* Key */}
                          <td className="px-6 py-5">

                            {member.is_key_member ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                <Check
                                  size={13}
                                />
                                Yes
                              </span>
                            ) : (
                              <span className="text-sm text-slate-500">
                                No
                              </span>
                            )}

                          </td>

                          {/* Actions */}
                          <td className="px-6 py-5">

                            <div className="flex justify-end gap-2">

                              <button
                                type="button"
                                onClick={() =>
                                  startEdit(
                                    member
                                  )
                                }
                                disabled={
                                  saving ||
                                  continuing
                                }
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Edit
                                  size={15}
                                />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(
                                    member
                                  )
                                }
                                disabled={
                                  saving ||
                                  continuing
                                }
                                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Trash2
                                  size={15}
                                />
                                Delete
                              </button>

                            </div>

                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>
              </div>
            )}

          </div>

          {/* Bottom Workflow Actions */}
          <div className="sticky bottom-4 z-10 mt-6">

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur lg:flex-row lg:items-center lg:justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <CheckCircle2
                    size={18}
                    className="text-green-600"
                  />

                  <p className="text-sm font-semibold text-slate-900">
                    {members.length >
                    0
                      ? `${members.length} team member${
                          members.length ===
                          1
                            ? ""
                            : "s"
                        } assigned`
                      : "Audit Team not yet completed"}
                  </p>

                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Add or update the team members before continuing
                  to Planning Matters.
                </p>

              </div>

              <div className="flex flex-col gap-2 sm:flex-row">

                {/* Back */}
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/engagements/${engagementId}/audit-planning`
                    )
                  }
                  disabled={
                    saving ||
                    continuing
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft
                    size={17}
                  />
                  Back
                </button>

                {/* Save & Continue */}
                <button
                  type="button"
                  onClick={
                    handleSaveAndContinue
                  }
                  disabled={
                    saving ||
                    continuing ||
                    members.length ===
                      0
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {continuing ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      Save & Continue
                      <ArrowRight
                        size={17}
                      />
                    </>
                  )}
                </button>

              </div>

            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}