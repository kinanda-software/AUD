"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  Building2,
  CheckCircle2,
  Loader2,
  MailCheck,
  ShieldCheck,
} from "lucide-react";

import {
  registerClient,
  resendClientOtp,
  verifyClientRegistration,
} from "@/lib/clientPortal";

export default function RegisterClientPage() {
  const [step, setStep] = useState<"form" | "verify" | "done">("form");
  const [registrationId, setRegistrationId] = useState<number | null>(null);
  const [devOtp, setDevOtp] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    legal_name: "",
    registration_number: "",
    license_authority: "",
    license_expiry_date: "",
    industry: "",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    address: "",
  });

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await registerClient({
        ...form,
        license_expiry_date: form.license_expiry_date || undefined,
      });
      setRegistrationId(result.registration_id);
      setDevOtp(result.otp ?? "");
      setStep("verify");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Registration failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (registrationId === null) return;
    setSubmitting(true);
    setError("");
    try {
      await verifyClientRegistration(registrationId, otp.trim());
      setStep("done");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Verification failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (registrationId === null) return;
    setError("");
    try {
      const result = await resendClientOtp(registrationId);
      setDevOtp(result.otp ?? "");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not resend the code."
      );
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-slate-900">
            <ShieldCheck aria-hidden="true" /> Client Registration
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Register your organization to request audit services from our firm.
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {step === "form" && (
          <form
            onSubmit={handleRegister}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Building2 size={18} /> Company information
            </h2>
            <fieldset disabled={submitting} className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium sm:col-span-2">
                Legal name
                <input
                  required
                  className={inputClass}
                  value={form.legal_name}
                  onChange={(event) =>
                    setForm({ ...form, legal_name: event.target.value })
                  }
                />
              </label>
              <label className="text-sm font-medium">
                Registration / license number
                <input
                  className={inputClass}
                  value={form.registration_number}
                  onChange={(event) =>
                    setForm({ ...form, registration_number: event.target.value })
                  }
                />
              </label>
              <label className="text-sm font-medium">
                License issuing authority
                <input
                  className={inputClass}
                  value={form.license_authority}
                  onChange={(event) =>
                    setForm({ ...form, license_authority: event.target.value })
                  }
                  placeholder="e.g. Ministry of Industry and Trade"
                />
              </label>
              <label className="text-sm font-medium">
                License expiry date
                <input
                  type="date"
                  className={inputClass}
                  value={form.license_expiry_date}
                  onChange={(event) =>
                    setForm({ ...form, license_expiry_date: event.target.value })
                  }
                />
              </label>
              <label className="text-sm font-medium">
                Industry
                <input
                  className={inputClass}
                  value={form.industry}
                  onChange={(event) =>
                    setForm({ ...form, industry: event.target.value })
                  }
                />
              </label>
              <label className="text-sm font-medium">
                Contact person
                <input
                  required
                  className={inputClass}
                  value={form.contact_person}
                  onChange={(event) =>
                    setForm({ ...form, contact_person: event.target.value })
                  }
                />
              </label>
              <label className="text-sm font-medium">
                Contact email
                <input
                  required
                  type="email"
                  className={inputClass}
                  value={form.contact_email}
                  onChange={(event) =>
                    setForm({ ...form, contact_email: event.target.value })
                  }
                />
              </label>
              <label className="text-sm font-medium">
                Contact phone
                <input
                  className={inputClass}
                  value={form.contact_phone}
                  onChange={(event) =>
                    setForm({ ...form, contact_phone: event.target.value })
                  }
                />
              </label>
              <label className="text-sm font-medium sm:col-span-2">
                Address
                <textarea
                  rows={2}
                  className={inputClass}
                  value={form.address}
                  onChange={(event) =>
                    setForm({ ...form, address: event.target.value })
                  }
                />
              </label>
            </fieldset>
            <button
              type="submit"
              disabled={submitting}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Submit registration
            </button>
            <p className="mt-4 text-center text-sm text-slate-600">
              Already registered?{" "}
              <Link href="/login" className="font-semibold text-blue-700 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}

        {step === "verify" && (
          <form
            onSubmit={handleVerify}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <MailCheck size={18} /> Verify your email
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              We sent a 6-digit verification code to{" "}
              <strong>{form.contact_email}</strong>. The code expires in 10
              minutes.
            </p>
            {devOtp && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Development mode — the emailed code is: <strong>{devOtp}</strong>
              </p>
            )}
            <label className="mt-4 block text-sm font-medium">
              Verification code
              <input
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                className={`${inputClass} text-center text-lg tracking-[0.5em]`}
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="••••••"
              />
            </label>
            <button
              type="submit"
              disabled={submitting || otp.trim().length !== 6}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Verify
            </button>
            <button
              type="button"
              onClick={handleResend}
              className="mt-3 w-full text-sm font-semibold text-blue-700 hover:underline"
            >
              Resend code
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
            <CheckCircle2 size={48} className="mx-auto text-emerald-600" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">
              Registration verified
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Thank you. Our firm will review your registration and activate
              your client profile. You will be contacted at{" "}
              <strong>{form.contact_email}</strong>.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Back to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
