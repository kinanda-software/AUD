"use client";
import { API_ORIGIN } from "@/lib/apiConfig";


import Link from "next/link";
import LoginWebsite from "./LoginWebsite";

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
const API_URL = `${API_ORIGIN}`;

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
  const [rememberMe, setRememberMe] = useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [checkingSession, setCheckingSession] =
    useState(true);

  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Restore remembered username
  |--------------------------------------------------------------------------
  */
  useEffect(() => {
    const rememberedUsername =
      localStorage.getItem("audit-remember-username");

    if (rememberedUsername) {
      setUsername(rememberedUsername);
      setRememberMe(true);
    }
  }, []);
  /*
  |--------------------------------------------------------------------------
  | Check existing authentication
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
        const existingToken = localStorage.getItem("audit-token");
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
              ...(existingToken ? { Authorization: `Token ${existingToken}` } : {}),
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
      | 4. VERIFY THE RETURNED API TOKEN
      |--------------------------------------------------------------------------
      |
      | We immediately ask Django:
      |
      | "Does this API token authenticate the current user?"
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
              Authorization: `Token ${data.token}`,
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
          "LOGIN: Returned API token was not authenticated."
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
          "Login was accepted, but the server did not recognize the returned API token. Please try again."
        );

        setLoading(false);

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Remember username preference
      |--------------------------------------------------------------------------
      */
      if (rememberMe) {
        localStorage.setItem(
          "audit-remember-username",
          cleanUsername
        );
      } else {
        localStorage.removeItem(
          "audit-remember-username"
        );
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
        `Unable to connect to the AUD server at ${API_URL}. Make sure the AUD backend is running at this address.`
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
      <LoginWebsite>
        <div role="status" className="py-16 text-center">

          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <h2 id="sign-in-heading" className="mt-4 text-sm font-medium text-slate-500">
            Checking session...
          </h2>

          <p className="mt-2 text-xs text-slate-400">
            Checking AUD authentication...
          </p>

        </div>
      </LoginWebsite>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Login UI
  |--------------------------------------------------------------------------
  */
  return (
    <LoginWebsite>
          <div className="mb-7">
            <p className="mb-3 text-xs font-bold tracking-widest text-blue-700">YOUR AUDIT WORKSPACE</p>
            <h2 id="sign-in-heading" className="text-2xl font-bold tracking-tight text-slate-950">
              Welcome back
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Sign in to your audit workspace.
            </p>

          </div>

          {/* Error */}

          {error && (
            <div role="alert" id="login-error" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">

              <p className="text-sm font-medium leading-5 text-red-700">
                {error}
              </p>

            </div>
          )}

          <form
            onSubmit={handleSubmit}
            aria-describedby={error ? "login-error" : undefined}
            aria-busy={loading}
            className="space-y-5"
          >

            {/* Username */}

            <div>

              <label
                htmlFor="username"
                className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700"
              >
                Username
              </label>

              <div className="relative">

                <User
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
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
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                />

              </div>

            </div>

            {/* Password */}

            <div>

              <label
                htmlFor="password"
                className="mb-1 block text-xs sm:text-sm font-semibold text-slate-700"
              >
                Password
              </label>

              <div className="relative">

                <LockKeyhole
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
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
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-3 pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
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
                  aria-pressed={showPassword}
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

            {/* Session options */}

            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) =>
                    setRememberMe(event.target.checked)
                  }
                  disabled={loading}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Remember username
              </label>

              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign In */}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-70"
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

            <p className="text-xs leading-5 text-slate-500">
              Authorized users only. Your access is
              protected by the AUD authentication
              system.
            </p>

          </div>

          <p className="mt-4 text-center text-xs leading-5 text-slate-500">
            Need an account? Contact your platform administrator.
          </p>
    </LoginWebsite>
  );
}

/*
|--------------------------------------------------------------------------
| Loading screen
|--------------------------------------------------------------------------
*/
function LoginLoading() {
  return (
    <LoginWebsite>
      <div role="status" className="py-16 text-center">

        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

        <h2 id="sign-in-heading" className="mt-4 text-sm font-medium text-slate-500">
          Loading...
        </h2>

      </div>

    </LoginWebsite>
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



