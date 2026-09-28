
"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  UserPlus,
  Search,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  ShieldCheck,
  X,
  RefreshCw,
  Users,
} from "lucide-react";

const API_URL = "http://localhost:8000";

type UserRecord = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  role_display?: string;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
  last_login: string | null;
};

type UserForm = {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
  role: string;
  is_active: boolean;
};

const EMPTY_FORM: UserForm = {
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  confirm_password: "",
  role: "staff",
  is_active: true,
};

function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const keys = [
    "audit-token",
    "access_token",
    "accessToken",
    "token",
    "authToken",
    "jwt",
    "jwt_token",
  ];

  for (const key of keys) {
    const value = localStorage.getItem(key);

    if (value) {
      return value.replace(/^Token\s+/i, "").trim();
    }
  }

  return null;
}

function authHeaders(includeJson = false): HeadersInit {
  const token = getToken();

  const headers: HeadersInit = {
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Token ${token}`;
  }

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

function getRoleName(role: string): string {
  const roles: Record<string, string> = {
    admin: "Administrator",
    auditor: "Auditor",
    manager: "Manager",
    staff: "Staff",
    guest: "Guest",
  };

  return roles[role] || role;
}

function getRoleBadgeClass(role: string): string {
  switch (role) {
    case "admin":
      return "bg-purple-50 text-purple-700 ring-purple-200";

    case "manager":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "auditor":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "staff":
      return "bg-slate-50 text-slate-700 ring-slate-200";

    case "guest":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
}

function getInitials(user: UserRecord): string {
  const first =
    user.first_name?.trim()?.charAt(0) || "";

  const last =
    user.last_name?.trim()?.charAt(0) || "";

  const initials =
    `${first}${last}`.toUpperCase();

  if (initials) {
    return initials;
  }

  return user.username
    .substring(0, 2)
    .toUpperCase();
}

function getFullName(user: UserRecord): string {
  const fullName =
    `${user.first_name || ""} ${
      user.last_name || ""
    }`.trim();

  return fullName || user.username;
}

function getErrorMessage(
  data: any,
  fallback: string
): string {
  if (!data) {
    return fallback;
  }

  if (typeof data === "string") {
    return data;
  }

  if (data.detail) {
    return String(data.detail);
  }

  if (data.error) {
    return String(data.error);
  }

  if (data.message) {
    return String(data.message);
  }

  if (data.details && typeof data.details === "object") {
    const messages = Object.entries(data.details)
      .map(([field, value]) => {
        const text = Array.isArray(value)
          ? value.join(", ")
          : String(value);

        return `${field}: ${text}`;
      })
      .join(" | ");

    if (messages) {
      return messages;
    }
  }

  return fallback;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [editingUser, setEditingUser] =
    useState<UserRecord | null>(null);

  const [form, setForm] =
    useState<UserForm>(EMPTY_FORM);

  const [currentUserId, setCurrentUserId] =
    useState<number | null>(null);

  const loadCurrentUser = async () => {
    try {
      const token = getToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        `${API_URL}/api/auth/me/`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: authHeaders(),
        }
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      const user = data?.user || data;

      if (user?.id) {
        setCurrentUserId(Number(user.id));
      }
    } catch (error) {
      console.error(
        "Unable to load current user:",
        error
      );
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    setError("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error(
          "Authentication token was not found. Please log in again."
        );
      }

      const response = await fetch(
        `${API_URL}/api/auth/users/`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: authHeaders(),
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            `Unable to load users (${response.status}).`
          )
        );
      }

      const loadedUsers = Array.isArray(
        data?.users
      )
        ? data.users
        : Array.isArray(data)
        ? data
        : [];

      setUsers(loadedUsers);
    } catch (error) {
      console.error(
        "Unable to load users:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCurrentUser();
    void loadUsers();
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingUser(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setError("");
    setSuccess("");
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (
    user: UserRecord
  ) => {
    setError("");
    setSuccess("");
    setEditingUser(user);

    setForm({
      username: user.username || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      password: "",
      confirm_password: "",
      role: user.role || "staff",
      is_active: user.is_active,
    });

    setShowForm(true);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const username = form.username.trim();

    if (!username) {
      setError("Username is required.");
      return;
    }

    if (!editingUser) {
      if (!form.password) {
        setError(
          "Password is required when creating a user."
        );
        return;
      }

      if (form.password.length < 8) {
        setError(
          "Password must contain at least 8 characters."
        );
        return;
      }

      if (
        form.password !==
        form.confirm_password
      ) {
        setError(
          "Password and confirmation password do not match."
        );
        return;
      }
    }

    const token = getToken();

    if (!token) {
      setError(
        "Authentication token was not found. Please log in again."
      );
      return;
    }

    setSaving(true);

    try {
      const isEditing =
        editingUser !== null;

      const url = isEditing
        ? `${API_URL}/api/auth/users/${editingUser.id}/`
        : `${API_URL}/api/auth/users/`;

      const payload: Record<
        string,
        string | boolean
      > = {
        username,
        first_name:
          form.first_name.trim(),
        last_name:
          form.last_name.trim(),
        email:
          form.email.trim(),
        role: form.role,
        is_active:
          form.is_active,
      };

      if (!isEditing) {
        payload.password =
          form.password;
      }

      const response = await fetch(url, {
        method: isEditing
          ? "PATCH"
          : "POST",
        credentials: "include",
        headers: authHeaders(true),
        body: JSON.stringify(payload),
      });

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            `Request failed (${response.status}).`
          )
        );
      }

      setSuccess(
        isEditing
          ? "User updated successfully."
          : "User created successfully."
      );

      resetForm();

      await loadUsers();
    } catch (error) {
      console.error(
        "User save failed:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to save user."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (
    user: UserRecord
  ) => {
    if (currentUserId === user.id) {
      setError(
        "You cannot deactivate your own account."
      );
      return;
    }

    const token = getToken();

    if (!token) {
      setError(
        "Authentication token was not found. Please log in again."
      );
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/auth/users/${user.id}/`,
        {
          method: "PATCH",
          credentials: "include",
          headers: authHeaders(true),
          body: JSON.stringify({
            is_active:
              !user.is_active,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            "Unable to update user status."
          )
        );
      }

      setSuccess(
        user.is_active
          ? "User deactivated successfully."
          : "User activated successfully."
      );

      await loadUsers();
    } catch (error) {
      console.error(
        "User status update failed:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update user status."
      );
    }
  };

  const handleDelete = async (
    user: UserRecord
  ) => {
    if (currentUserId === user.id) {
      setError(
        "You cannot delete your own account."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to delete user "${user.username}"? This action cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    const token = getToken();

    if (!token) {
      setError(
        "Authentication token was not found. Please log in again."
      );
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/api/auth/users/${user.id}/`,
        {
          method: "DELETE",
          credentials: "include",
          headers: authHeaders(),
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            "Unable to delete user."
          )
        );
      }

      setSuccess(
        `User "${user.username}" deleted successfully.`
      );

      await loadUsers();
    } catch (error) {
      console.error(
        "User deletion failed:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete user."
      );
    }
  };

  const filteredUsers = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    if (!value) {
      return users;
    }

    return users.filter((user) => {
      const fullName =
        `${user.first_name || ""} ${
          user.last_name || ""
        }`.toLowerCase();

      return (
        user.username
          .toLowerCase()
          .includes(value) ||
        fullName.includes(value) ||
        user.email
          .toLowerCase()
          .includes(value) ||
        user.role
          .toLowerCase()
          .includes(value)
      );
    });
  }, [users, search]);

  const activeUsers = users.filter(
    (user) => user.is_active
  ).length;

  const inactiveUsers =
    users.length - activeUsers;

  const adminUsers = users.filter(
    (user) => user.role === "admin"
  ).length;

  return (
    <div className="w-full">
      {/* PAGE HEADER */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <ShieldCheck size={21} />
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Users & Roles
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage system users, roles, and account access.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void loadUsers()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <UserPlus size={16} />

            Create User
          </button>
        </div>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div>
            <p className="font-semibold">
              Error
            </p>

            <p className="mt-1 break-words">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setError("")}
            className="shrink-0 rounded-md p-1 hover:bg-red-100"
            aria-label="Close error"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <div>
            <p className="font-semibold">
              Success
            </p>

            <p className="mt-1">
              {success}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSuccess("")}
            className="shrink-0 rounded-md p-1 hover:bg-emerald-100"
            aria-label="Close success message"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Users
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {users.length}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Users size={19} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Active Users
              </p>

              <p className="mt-2 text-2xl font-bold text-emerald-600">
                {activeUsers}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <UserCheck size={19} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Administrators
              </p>

              <p className="mt-2 text-2xl font-bold text-purple-600">
                {adminUsers}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {inactiveUsers} inactive{" "}
                {inactiveUsers === 1
                  ? "account"
                  : "accounts"}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
              <ShieldCheck size={19} />
            </div>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT FORM */}
      {showForm && (
        <section className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {editingUser
                  ? "Edit User"
                  : "Create New User"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {editingUser
                  ? "Update the user's account information and role."
                  : "Create an account and assign an initial role."}
              </p>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close form"
            >
              <X size={20} />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-5 sm:p-6"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Username
                </label>

                <input
                  type="text"
                  value={form.username}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      username:
                        event.target.value,
                    })
                  }
                  placeholder="e.g. john.audit"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Email
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      email:
                        event.target.value,
                    })
                  }
                  placeholder="user@example.com"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  First Name
                </label>

                <input
                  type="text"
                  value={form.first_name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      first_name:
                        event.target.value,
                    })
                  }
                  placeholder="First name"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Last Name
                </label>

                <input
                  type="text"
                  value={form.last_name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      last_name:
                        event.target.value,
                    })
                  }
                  placeholder="Last name"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Role
                </label>

                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      role:
                        event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="admin">
                    Administrator
                  </option>

                  <option value="manager">
                    Manager
                  </option>

                  <option value="auditor">
                    Auditor
                  </option>

                  <option value="staff">
                    Staff
                  </option>

                  <option value="guest">
                    Guest
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Account Status
                </label>

                <label className="flex h-[42px] cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3">
                  <input
                    type="checkbox"
                    checked={
                      form.is_active
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        is_active:
                          event.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />

                  <span className="text-sm text-slate-700">
                    Account is active
                  </span>
                </label>
              </div>

              {!editingUser && (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Password
                    </label>

                    <input
                      type="password"
                      value={form.password}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          password:
                            event.target.value,
                        })
                      }
                      placeholder="Minimum 8 characters"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Confirm Password
                    </label>

                    <input
                      type="password"
                      value={
                        form.confirm_password
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          confirm_password:
                            event.target.value,
                        })
                      }
                      placeholder="Repeat password"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="w-full rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {saving && (
                  <RefreshCw
                    size={16}
                    className="animate-spin"
                  />
                )}

                {editingUser
                  ? "Save Changes"
                  : "Create User"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* USERS TABLE */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                System Users
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage users who can access the audit platform.
              </p>
            </div>

            <div className="relative w-full lg:w-80">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search users..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <RefreshCw
                size={18}
                className="animate-spin"
              />

              Loading users...
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center px-5 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Users size={22} />
            </div>

            <h3 className="text-sm font-semibold text-slate-800">
              No users found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {search
                ? "Try a different search term."
                : "Create your first system user to get started."}
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="w-[27%] px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      User
                    </th>

                    <th className="w-[25%] px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Email
                    </th>

                    <th className="w-[18%] px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Role
                    </th>

                    <th className="w-[15%] px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="w-[15%] px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(
                    (user) => (
                      <tr
                        key={user.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                              {getInitials(
                                user
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {getFullName(
                                  user
                                )}
                              </p>

                              <p className="mt-0.5 truncate text-xs text-slate-500">
                                @{user.username}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="truncate text-sm text-slate-600">
                            {user.email ||
                              "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getRoleBadgeClass(
                              user.role
                            )}`}
                          >
                            {getRoleName(
                              user.role
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {user.is_active ? (
                            <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400">
                              <span className="h-2 w-2 rounded-full bg-slate-400" />
                              Inactive
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                openEditForm(
                                  user
                                )
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                              title="Edit user"
                              aria-label={`Edit ${getFullName(
                                user
                              )}`}
                            >
                              <Pencil
                                size={15}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void handleToggleActive(
                                  user
                                )
                              }
                              disabled={
                                currentUserId ===
                                user.id
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                              title={
                                user.is_active
                                  ? "Deactivate user"
                                  : "Activate user"
                              }
                              aria-label={
                                user.is_active
                                  ? `Deactivate ${getFullName(
                                      user
                                    )}`
                                  : `Activate ${getFullName(
                                      user
                                    )}`
                              }
                            >
                              {user.is_active ? (
                                <UserX
                                  size={15}
                                />
                              ) : (
                                <UserCheck
                                  size={15}
                                />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void handleDelete(
                                  user
                                )
                              }
                              disabled={
                                currentUserId ===
                                user.id
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Delete user"
                              aria-label={`Delete ${getFullName(
                                user
                              )}`}
                            >
                              <Trash2
                                size={15}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE */}
            <div className="divide-y divide-slate-100 md:hidden">
              {filteredUsers.map(
                (user) => (
                  <div
                    key={user.id}
                    className="p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          {getInitials(
                            user
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {getFullName(
                              user
                            )}
                          </p>

                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            @{user.username}
                          </p>
                        </div>
                      </div>

                      {user.is_active ? (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-600">
                          Active
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-slate-400">
                          Email
                        </span>

                        <span className="max-w-[65%] truncate text-right text-xs text-slate-600">
                          {user.email ||
                            "—"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-slate-400">
                          Role
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${getRoleBadgeClass(
                            user.role
                          )}`}
                        >
                          {getRoleName(
                            user.role
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openEditForm(
                            user
                          )
                        }
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Pencil
                          size={14}
                        />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleToggleActive(
                            user
                          )
                        }
                        disabled={
                          currentUserId ===
                          user.id
                        }
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {user.is_active ? (
                          <UserX
                            size={14}
                          />
                        ) : (
                          <UserCheck
                            size={14}
                          />
                        )}

                        {user.is_active
                          ? "Disable"
                          : "Enable"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleDelete(
                            user
                          )
                        }
                        disabled={
                          currentUserId ===
                          user.id
                        }
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2
                          size={14}
                        />
                        Delete
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

