"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  CircleAlert,
  Loader2,
  LockKeyhole,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

type ResetConfirmResponse = {
  message?: string;
};

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();

  const uid = Array.isArray(params.uid)
    ? params.uid[0]
    : params.uid;

  const token = Array.isArray(params.token)
    ? params.token[0]
    : params.token;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!password) {
      setError("Please enter a new password.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Your new password must be at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    if (!uid || !token) {
      setError(
        "This password reset link is invalid."
      );
      return;
    }

    try {
      setLoading(true);

      const data =
        await apiRequest<ResetConfirmResponse>(
          "/auth/password-reset/confirm/",
          {
            method: "POST",
            body: JSON.stringify({
              uid,
              token,
              new_password: password,
            }),
          }
        );

      setSuccess(
        data.message ||
          "Your password has been reset successfully."
      );

      setPassword("");
      setConfirmPassword("");

      window.setTimeout(() => {
        router.replace("/login");
      }, 1800);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reset your password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-6">
      <div className="w-full max-w-[380px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6">
          <div className="mb-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <LockKeyhole className="h-5 w-5" />
            </div>

            <h1 className="text-xl font-bold text-slate-950">
              Set a new password
            </h1>

            <p className="mt-1 text-sm leading-5 text-slate-500">
              Choose a new password for your AUD Platform
              account.
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

          {!success && (
            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  New Password
                </label>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  Confirm Password
                </label>

                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50"
                />
              </div>

              <p className="text-xs text-slate-400">
                Minimum 8 characters. Django&apos;s password
                validation rules also apply.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>
          )}

          {success && (
            <Link
              href="/login"
              className="mt-4 block text-center text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Return to Login
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
