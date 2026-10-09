"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from "lucide-react";

import { submitFraudReport } from "@/lib/fraudReports";

export default function ReportFraudPage() {
  const [done, setDone] = useState(false);
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    subject: "",
    description: "",
    reporter_name: "",
    reporter_email: "",
    reporter_phone: "",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await submitFraudReport({
        subject: form.subject,
        description: form.description,
        reporter_name: form.reporter_name || undefined,
        reporter_email: form.reporter_email || undefined,
        reporter_phone: form.reporter_phone || undefined,
      });
      setReference(result.reference);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Submission failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-slate-900">
            <ShieldAlert aria-hidden="true" /> Report Fraud or Irregularity
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Report concerns about the use or management of funds or the
            quality of audit work. You may remain anonymous — contact
            details are optional and only used for follow-up.
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {done ? (
          <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
            <CheckCircle2 size={48} className="mx-auto text-emerald-600" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">
              Report received
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Your reference is{" "}
              <strong className="font-mono">{reference}</strong>. Quote it in
              any follow-up contact. All reports are reviewed by the
              firm&apos;s leadership.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <fieldset disabled={submitting} className="space-y-4">
              <label className="block text-sm font-medium">
                Subject — who or what does this concern?
                <input
                  required
                  className={inputClass}
                  value={form.subject}
                  onChange={(event) =>
                    setForm({ ...form, subject: event.target.value })
                  }
                  placeholder="e.g. Procurement irregularities at XYZ Ltd"
                />
              </label>
              <label className="block text-sm font-medium">
                What happened? Include where, when, and who is involved.
                <textarea
                  required
                  rows={5}
                  className={inputClass}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Your name (optional)
                  <input
                    className={inputClass}
                    value={form.reporter_name}
                    onChange={(event) =>
                      setForm({ ...form, reporter_name: event.target.value })
                    }
                  />
                </label>
                <label className="block text-sm font-medium">
                  Your email (optional)
                  <input
                    type="email"
                    className={inputClass}
                    value={form.reporter_email}
                    onChange={(event) =>
                      setForm({ ...form, reporter_email: event.target.value })
                    }
                  />
                </label>
              </div>
            </fieldset>
            <button
              type="submit"
              disabled={submitting}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Submit report
            </button>
            <p className="mt-4 text-center text-sm text-slate-600">
              <Link href="/login" className="font-semibold text-blue-700 hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
