"use client";

import {
  FormEvent,
  Suspense,
  useEffect,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  LogIn,
  ShieldCheck,
  User,
} from "lucide-react";

const API_URL = "http://localhost:8000";

type LoginResponse = {
  message?: string;
  error?: string;
  user?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
};

type SessionResponse = {
  authenticated?: boolean;
  user?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
  error?: string;
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      console.log("LOGIN: Checking existing session...");

      const controller = new AbortController();

      const timeout = setTimeout(() => {
        console.log(
          "LOGIN: Session check timed out after 5 seconds."
        );

        controller.abort();
      }, 5000);

      try {
        const response = await fetch(
          `${API_URL}/api/auth/me/`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          }
        );

        console.log(
          "LOGIN: Existing session status:",
          response.status
        );

        if (!mounted) {
          return;
        }

        if (response.ok) {
          const data: SessionResponse =
            await response.json();

          console.log(
            "LOGIN: Existing session:",
            data
          );

          if (data.authenticated) {
            const next =
              searchParams.get("next") ||
              "/dashboard";

            router.replace(next);
            return;
          }
        }
      } catch (error) {
        console.log(
          "LOGIN: Session check failed:",
          error
        );
      } finally {
        clearTimeout(timeout);

        if (mounted) {
          setCheckingSession(false);
        }
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, [router, searchParams]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    const cleanUsername = username.trim();

    if (!cleanUsername) {
      setError("Please enter your username.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      console.log("LOGIN: Sending login request...");
      console.log("LOGIN: API:", API_URL);
      console.log("LOGIN: Username:", cleanUsername);

      const response = await fetch(
        `${API_URL}/api/auth/login/`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            username: cleanUsername,
            password,
          }),
        }
      );

      console.log(
        "LOGIN: HTTP status:",
        response.status
      );

      let data: LoginResponse = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      console.log(
        "LOGIN: Backend response:",
        data
      );

      if (!response.ok) {
        let message = "Unable to sign in.";

        if (response.status === 401) {
          message =
            data.error ||
            "Invalid username or password.";
        } else if (response.status === 403) {
          message =
            data.error ||
            "Your account is inactive.";
        } else if (response.status === 400) {
          message =
            data.error ||
            "Please check the information entered.";
        } else if (response.status >= 500) {
          message =
            "The AUD server encountered an error.";
        } else if (data.error) {
          message = data.error;
        }

        setError(message);
        setLoading(false);
        return;
      }

      console.log(
        "LOGIN: Login request successful."
      );

      const sessionResponse = await fetch(
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

      console.log(
        "LOGIN: Session status:",
        sessionResponse.status
      );

      let sessionData: SessionResponse = {};

      try {
        sessionData =
          await sessionResponse.json();
      } catch {
        sessionData = {};
      }

      console.log(
        "LOGIN: Session response:",
        sessionData
      );

      if (
        !sessionResponse.ok ||
        !sessionData.authenticated
      ) {
        setError(
          "Login was accepted, but the browser session could not be created. Please try again."
        );

        setLoading(false);
        return;
      }

      console.log(
        "LOGIN: Authentication successful."
      );

      const next =
        searchParams.get("next") ||
        "/dashboard";

      router.replace(next);
      router.refresh();
    } catch (error) {
      console.error(
        "LOGIN: Network error:",
        error
      );

      setError(
        "Unable to connect to the AUD server. Make sure Django is running on port 8000."
      );

      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-medium text-slate-500">
            Checking session...
          </p>

          <p className="mt-2 text-xs text-slate-400">
            Checking AUD authentication...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-100/60 blur-3xl" />

        <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-slate-200/70 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-600/20">
            <ShieldCheck
              size={32}
              strokeWidth={2}
            />
          </div>

          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
            AUD Platform
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Audit Management System
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 sm:p-8">
          <div className="mb-7">
            <h2 className="text-xl font-bold text-slate-950">
              Welcome back
            </h2>

            <p className="mt-1.5 text-sm text-slate-500">
              Sign in to access your audit workspace.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-medium leading-5 text-red-700">
                {error}
              </p>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Username
              </label>

              <div className="relative">
                <User
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value)
                  }
                  placeholder="Enter your username"
                  autoComplete="username"
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-7 border-t border-slate-100 pt-5 text-center">
            <p className="text-xs leading-5 text-slate-400">
              Authorized users only. Your access is
              protected by the AUD authentication
              system.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          AUD Platform • Audit Management System
        </p>
      </div>
    </main>
  );
}

function LoginLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

        <p className="mt-4 text-sm font-medium text-slate-500">
          Loading...
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}