"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Loader2,
  Mail,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

type ResetResponse = {
  message?: string;
  reset_url?: string;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [debugResetUrl, setDebugResetUrl] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setDebugResetUrl("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      const data = await apiRequest<ResetResponse>(
        "/auth/password-reset/",
        {
          method: "POST",
          body: JSON.stringify({
            email: cleanEmail,
          }),
        }
      );

      setSuccess(
        data.message ||
          "If an active account exists for that email address, a password reset link has been sent."
      );

      if (data.reset_url) {
        setDebugResetUrl(data.reset_url);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to request a password reset."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-6">
      <div className="w-full max-w-[380px]">
        <Link
          href="/login"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6">
          <div className="mb-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Mail className="h-5 w-5" />
            </div>

            <h1 className="text-xl font-bold text-slate-950">
              Forgot your password?
            </h1>

            <p className="mt-1 text-sm leading-5 text-slate-500">
              Enter your account email and we&apos;ll send you
              a secure password reset link.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <div className="flex items-start gap-2">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <p className="text-sm leading-5 text-red-700">
                  {error}
                </p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-sm leading-5 text-emerald-700">
                  {success}
                </p>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-semibold text-slate-700"
              >
                Email Address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>

          {debugResetUrl && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs font-semibold text-blue-900">
                Development reset link
              </p>

              <a
                href={debugResetUrl}
                className="mt-1 block break-all text-xs text-blue-700 underline"
              >
                {debugResetUrl}
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
