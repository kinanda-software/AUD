"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";

import {
  approveClientRegistration,
  getClientRegistrations,
  rejectClientRegistration,
  type ClientRegistration,
} from "@/lib/clientPortal";

const statusStyles: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  verified: "bg-blue-50 text-blue-700 border-blue-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

function licenseBadge(expiry: string | null) {
  if (!expiry) return null;
  const days = Math.ceil(
    (new Date(expiry).getTime() - Date.now()) / 86_400_000
  );
  if (days < 0) {
    return (
      <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
        License expired
      </span>
    );
  }
  if (days <= 60) {
    return (
      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
        License expires in {days}d
      </span>
    );
  }
  return null;
}

export default function ClientRegistrationsPage() {
  const [registrations, setRegistrations] = useState<ClientRegistration[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actingId, setActingId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getClientRegistrations(
          statusFilter || undefined
        );
        if (active) setRegistrations(data);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load registrations."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [statusFilter, reloadKey]);

  async function handleApprove(id: number) {
    setActingId(id);
    setError("");
    setSuccess("");
    try {
      const updated = await approveClientRegistration(id);
      setSuccess(
        `${updated.legal_name} approved — client ${updated.client_code} created.`
      );
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(id: number) {
    if (!window.confirm("Reject this registration?")) return;
    setActingId(id);
    setError("");
    try {
      await rejectClientRegistration(id);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rejection failed.");
    } finally {
      setActingId(null);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm";

  return (
    <div className="w-full px-6 py-8">
      <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
        <Building2 aria-hidden="true" /> Client Registrations
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Review self-registered companies from the public client portal.
        Approving a verified registration creates the client record with
        its license details.
      </p>

      {error && (
        <div role="alert" className="my-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="my-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="my-6">
        <label className="text-sm font-medium">
          Status
          <select
            className={inputClass}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending verification</option>
            <option value="verified">Email verified</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p role="status" className="mt-6 flex items-center gap-2 text-sm">
          <Loader2 className="animate-spin" /> Loading registrations...
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-700">
              <tr>
                {["Ref", "Company", "License", "Contact", "Status", "Actions"].map(
                  (title) => (
                    <th key={title} className="px-4 py-3">{title}</th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {registrations.map((record) => (
                <tr key={record.id} className="align-top">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {record.reference}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {record.legal_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {record.industry || "Industry not stated"}
                      {record.registration_number &&
                        ` · Reg. ${record.registration_number}`}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p>{record.license_authority || "—"}</p>
                    {record.license_expiry_date && (
                      <p className="mt-1 text-slate-500">
                        expires {record.license_expiry_date}
                      </p>
                    )}
                    {licenseBadge(record.license_expiry_date)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p>{record.contact_person}</p>
                    <p className="text-slate-500">{record.contact_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[record.status]}`}>
                      {record.status.replace("_", " ")}
                    </span>
                    {record.client_code && (
                      <p className="mt-1 text-xs font-semibold text-emerald-700">
                        Client {record.client_code}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {record.status === "verified" && (
                      <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        <button
                          type="button"
                          disabled={actingId === record.id}
                          onClick={() => handleApprove(record.id)}
                          className="inline-flex items-center gap-1 text-emerald-700 hover:underline disabled:opacity-50"
                        >
                          {actingId === record.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={12} />
                          )}
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={actingId === record.id}
                          onClick={() => handleReject(record.id)}
                          className="inline-flex items-center gap-1 text-red-700 hover:underline disabled:opacity-50"
                        >
                          <XCircle size={12} /> Reject
                        </button>
                      </div>
                    )}
                    {record.status === "pending" && (
                      <span className="text-xs text-slate-400">
                        Awaiting email verification
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!registrations.length && (
            <p className="p-6 text-center text-sm text-slate-600">
              No registrations found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
