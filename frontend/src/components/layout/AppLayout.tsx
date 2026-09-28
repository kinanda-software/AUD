"use client";

import { useEffect, useState } from "react";

import Sidebar from "./Sidebar";
import Header from "./Header";

const API_URL = "http://localhost:8000";

export type AuthUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
};

type SessionResponse = {
  authenticated?: boolean;
  user?: AuthUser;
  error?: string;
  detail?: string;
};

function getStoredAccessToken(): string | null {
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
      return value;
    }
  }

  return null;
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkAuthentication() {
      try {
        console.log("APP_LAYOUT: checking authentication");

        const authUrl = `${API_URL}/api/auth/me/`;

        const accessToken = getStoredAccessToken();

        console.log(
          "APP_LAYOUT: token exists =",
          Boolean(accessToken)
        );

        if (!accessToken) {
          if (!mounted) return;

          setUser(null);
          setAuthError(
            "No login token was found. Please login again."
          );
          setCheckingAuth(false);

          return;
        }

        const authorizationHeader = accessToken.startsWith(
          "Token "
        )
          ? accessToken
          : `Token ${accessToken}`;

        const response = await fetch(authUrl, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: authorizationHeader,
          },
        });

        console.log(
          "APP_LAYOUT: session status =",
          response.status
        );

        const data: SessionResponse =
          await response.json();

        console.log(
          "APP_LAYOUT: session response =",
          data
        );

        if (!mounted) {
          return;
        }

        if (
          response.ok &&
          data.authenticated === true &&
          data.user
        ) {
          setUser(data.user);
          setAuthError("");
          setCheckingAuth(false);

          return;
        }

        console.error(
          "APP_LAYOUT: backend says unauthenticated",
          data
        );

        setUser(null);

        setAuthError(
          data.detail ||
            "The backend did not recognize the current login token."
        );

        setCheckingAuth(false);
      } catch (error) {
        console.error(
          "APP_LAYOUT: authentication request failed",
          error
        );

        if (!mounted) {
          return;
        }

        setUser(null);

        setAuthError(
          "The frontend could not connect to the authentication endpoint."
        );

        setCheckingAuth(false);
      }
    }

    checkAuthentication();

    return () => {
      mounted = false;
    };
  }, []);

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-medium text-slate-500">
            Verifying access...
          </p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-red-700">
            Authentication Problem
          </h2>

          <p className="mt-3 text-sm text-slate-600">
            {authError}
          </p>

          <p className="mt-3 text-xs text-slate-400">
            Open the browser console with F12 to see the
            authentication response.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* SIDEBAR */}
      <Sidebar user={user} />

      {/* HEADER */}
      <Header user={user} />

      {/* CONTENT AREA */}
      <div className="ml-64 min-h-screen pt-20">

        <main className="w-full px-4 py-5 sm:px-5 lg:px-6">

          <div className="w-full min-w-0">

            {children}

          </div>

        </main>

      </div>
    </div>
  );
}
