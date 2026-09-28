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

/*
|--------------------------------------------------------------------------
| API URL
|--------------------------------------------------------------------------
|
| Use ONE hostname everywhere.
|
| We use localhost consistently so the Django session cookie
| is associated with the same hostname used by the frontend.
|
|--------------------------------------------------------------------------
*/
const API_URL = "http://localhost:8000";

/*
|--------------------------------------------------------------------------
| User data returned by Django
|--------------------------------------------------------------------------
*/
type UserData = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
};

/*
|--------------------------------------------------------------------------
| Login response
|--------------------------------------------------------------------------
|
| IMPORTANT:
| Django returns a DRF API token after successful login.
|
|--------------------------------------------------------------------------
*/
type LoginResponse = {
  message?: string;
  error?: string;
  token?: string;
  user?: UserData;
};

/*
|--------------------------------------------------------------------------
| Session response
|--------------------------------------------------------------------------
*/
type SessionResponse = {
  authenticated?: boolean;
  user?: UserData;
  error?: string;
};

/*
|--------------------------------------------------------------------------
| Helper: safely read JSON
|--------------------------------------------------------------------------
*/
async function readJson<T>(
  response: Response
): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/*
|--------------------------------------------------------------------------
| Login Page Form
|--------------------------------------------------------------------------
*/
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [checkingSession, setCheckingSession] =
    useState(true);

  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Check existing Django session
  |--------------------------------------------------------------------------
  |
  | If the browser already has an authenticated Django session,
  | redirect the user without showing the login form.
  |
  |--------------------------------------------------------------------------
  */
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      console.log(
        "LOGIN: Checking existing Django session..."
      );

      const controller =
        new AbortController();

      const timeout = window.setTimeout(() => {
        console.log(
          "LOGIN: Session check timed out."
        );

        controller.abort();
      }, 5000);

      try {
        const response = await fetch(
          `${API_URL}/api/auth/me/`,
          {
            method: "GET",

            /*
            |--------------------------------------------------------------------------
            | Send Django session cookie
            |--------------------------------------------------------------------------
            */
            credentials: "include",

            cache: "no-store",

            headers: {
              Accept: "application/json",
            },

            signal: controller.signal,
          }
        );

        console.log(
          "LOGIN: Existing session HTTP status:",
          response.status
        );

        const data =
          await readJson<SessionResponse>(
            response
          );

        console.log(
          "LOGIN: Existing session response:",
          data
        );

        if (!mounted) {
          return;
        }

        if (
          response.ok &&
          data?.authenticated
        ) {
          console.log(
            "LOGIN: Existing Django session is valid."
          );

          /*
          |--------------------------------------------------------------------------
          | IMPORTANT
          |--------------------------------------------------------------------------
          | Do NOT redirect automatically if there is no API token.
          |
          | The user may have an old Django session but no valid DRF token.
          | In that situation, we need the user to login again so the
          | token can be created/stored.
          |--------------------------------------------------------------------------
          */
          const existingToken =
            localStorage.getItem(
              "audit-token"
            );

          if (!existingToken) {
            console.log(
              "LOGIN: Existing session found, but no API token exists."
            );

            setCheckingSession(false);

            return;
          }

          const next =
            searchParams.get("next") ||
            "/dashboard";

          router.replace(next);

          return;
        }

        console.log(
          "LOGIN: No active Django session."
        );
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          console.log(
            "LOGIN: Session check aborted."
          );
        } else {
          console.log(
            "LOGIN: Session check failed:",
            error
          );
        }
      } finally {
        window.clearTimeout(timeout);

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

  /*
  |--------------------------------------------------------------------------
  | Submit Login
  |--------------------------------------------------------------------------
  */
  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    const cleanUsername =
      username.trim();

    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */
    if (!cleanUsername) {
      setError(
        "Please enter your username."
      );

      return;
    }

    if (!password) {
      setError(
        "Please enter your password."
      );

      return;
    }

    setLoading(true);

    try {
      console.log(
        "================================================"
      );

      console.log(
        "LOGIN: Starting authentication..."
      );

      console.log(
        "LOGIN: API:",
        API_URL
      );

      console.log(
        "LOGIN: Username:",
        cleanUsername
      );

      /*
      |--------------------------------------------------------------------------
      | 1. LOGIN
      |--------------------------------------------------------------------------
      */
      const response = await fetch(
        `${API_URL}/api/auth/login/`,
        {
          method: "POST",

          /*
          |--------------------------------------------------------------------------
          | IMPORTANT
          |--------------------------------------------------------------------------
          | Allows the browser to receive/send the Django session cookie.
          |--------------------------------------------------------------------------
          */
          credentials: "include",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body: JSON.stringify({
            username:
              cleanUsername,

            password,
          }),
        }
      );

      console.log(
        "LOGIN: Login HTTP status:",
        response.status
      );

      const data =
        await readJson<LoginResponse>(
          response
        );

      console.log(
        "LOGIN: Login response:",
        data
      );

      /*
      |--------------------------------------------------------------------------
      | 2. LOGIN FAILED
      |--------------------------------------------------------------------------
      */
      if (!response.ok) {
        let message =
          "Unable to sign in.";

        if (
          response.status === 401
        ) {
          message =
            data?.error ||
            "Invalid username or password.";
        } else if (
          response.status === 403
        ) {
          message =
            data?.error ||
            "Your account is inactive.";
        } else if (
          response.status === 400
        ) {
          message =
            data?.error ||
            "Please check the information entered.";
        } else if (
          response.status >= 500
        ) {
          message =
            "The AUD server encountered an error.";
        } else if (
          data?.error
        ) {
          message = data.error;
        }

        console.error(
          "LOGIN: Authentication failed:",
          message
        );

        setError(message);

        setLoading(false);

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | 3. LOGIN REQUEST WAS ACCEPTED
      |--------------------------------------------------------------------------
      */
      console.log(
        "LOGIN: Login request accepted."
      );

      /*
      |--------------------------------------------------------------------------
      | 3A. VERIFY API TOKEN
      |--------------------------------------------------------------------------
      |
      | Protected Django REST Framework endpoints use:
      |
      | Authorization: Token <token>
      |
      | The Documentation Archive page reads this token from:
      |
      | localStorage.getItem("audit-token")
      |
      |--------------------------------------------------------------------------
      */
      if (!data?.token) {
        console.error(
          "LOGIN: Login succeeded but Django did not return an API token."
        );

        /*
        |--------------------------------------------------------------------------
        | Remove any stale token
        |--------------------------------------------------------------------------
        */
        localStorage.removeItem(
          "audit-token"
        );

        setError(
          "Login succeeded, but the API token was not returned by the server."
        );

        setLoading(false);

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | 3B. STORE API TOKEN
      |--------------------------------------------------------------------------
      */
      localStorage.setItem(
        "audit-token",
        data.token
      );

      console.log(
        "LOGIN: API token stored successfully."
      );

      /*
      |--------------------------------------------------------------------------
      | 3C. Confirm token exists without printing the token
      |--------------------------------------------------------------------------
      */
      console.log(
        "LOGIN: API token exists:",
        Boolean(
          localStorage.getItem(
            "audit-token"
          )
        )
      );

      /*
      |--------------------------------------------------------------------------
      | 4. VERIFY THE DJANGO SESSION
      |--------------------------------------------------------------------------
      |
      | We immediately ask Django:
      |
      | "Does this browser have an authenticated session?"
      |
      |--------------------------------------------------------------------------
      */
      const sessionResponse =
        await fetch(
          `${API_URL}/api/auth/me/`,
          {
            method: "GET",

            credentials: "include",

            cache: "no-store",

            headers: {
              Accept:
                "application/json",
            },
          }
        );

      console.log(
        "LOGIN: Session verification HTTP status:",
        sessionResponse.status
      );

      const sessionData =
        await readJson<SessionResponse>(
          sessionResponse
        );

      console.log(
        "LOGIN: Session verification response:",
        sessionData
      );

      /*
      |--------------------------------------------------------------------------
      | 5. SESSION WAS NOT CREATED
      |--------------------------------------------------------------------------
      */
      if (
        !sessionResponse.ok ||
        !sessionData?.authenticated
      ) {
        console.error(
          "LOGIN: Django session was not authenticated."
        );

        /*
        |--------------------------------------------------------------------------
        | Remove token because the complete authentication flow failed.
        |--------------------------------------------------------------------------
        */
        localStorage.removeItem(
          "audit-token"
        );

        setError(
          "Login was accepted, but Django did not create an authenticated browser session. Please try again."
        );

        setLoading(false);

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | 6. AUTHENTICATION SUCCESSFUL
      |--------------------------------------------------------------------------
      */
      console.log(
        "LOGIN: Django authentication successful."
      );

      console.log(
        "LOGIN: Authenticated user:",
        sessionData.user
      );

      console.log(
        "LOGIN: Complete authentication successful."
      );

      /*
      |--------------------------------------------------------------------------
      | 7. REDIRECT
      |--------------------------------------------------------------------------
      */
      const next =
        searchParams.get("next") ||
        "/dashboard";

      console.log(
        "LOGIN: Redirecting to:",
        next
      );

      console.log(
        "================================================"
      );

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

  /*
  |--------------------------------------------------------------------------
  | Checking existing session screen
  |--------------------------------------------------------------------------
  */
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

  /*
  |--------------------------------------------------------------------------
  | Login UI
  |--------------------------------------------------------------------------
  */
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-10">

      <div className="pointer-events-none absolute inset-0">

        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-100/60 blur-3xl" />

        <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-slate-200/70 blur-3xl" />

      </div>

      <div className="relative w-full max-w-md">

        {/* Logo */}

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

        {/* Login Card */}

        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 sm:p-8">

          <div className="mb-7">

            <h2 className="text-xl font-bold text-slate-950">
              Welcome back
            </h2>

            <p className="mt-1.5 text-sm text-slate-500">
              Sign in to access your audit workspace.
            </p>

          </div>

          {/* Error */}

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

            {/* Username */}

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
                    setUsername(
                      event.target.value
                    )
                  }
                  placeholder="Enter your username"
                  autoComplete="username"
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                />

              </div>

            </div>

            {/* Password */}

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
                    setPassword(
                      event.target.value
                    )
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
                      (current) =>
                        !current
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

            {/* Sign In */}

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

          {/* Security message */}

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

/*
|--------------------------------------------------------------------------
| Loading screen
|--------------------------------------------------------------------------
*/
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

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/
export default function LoginPage() {
  return (
    <Suspense
      fallback={<LoginLoading />}
    >
      <LoginForm />
    </Suspense>
  );
}