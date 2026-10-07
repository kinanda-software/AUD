"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearStoredAccessTokens } from "@/lib/authStorage";
import { checkAuthSession, type AuthUser } from "@/lib/authSession";


import { useEffect, useState } from "react";

import Sidebar from "./Sidebar";
import Header from "./Header";
import { AuthContext } from "./AuthContext";

export type { AuthUser } from "@/lib/authSession";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authError, setAuthError] = useState("");
  const [navigationOpen, setNavigationOpen] = useState(false);

  useEffect(() => {
    if (!navigationOpen) return;
    const drawer = document.getElementById("workspace-navigation");
    if (!drawer) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawer.querySelector<HTMLElement>("button, a")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNavigationOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(drawer.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"))
        .filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setNavigationOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      desktop.removeEventListener("change", closeOnDesktop);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [navigationOpen]);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);

    async function checkAuthentication() {
      try {
        const authenticatedUser = await checkAuthSession(controller.signal);
        if (!mounted) return;
        if (authenticatedUser) {
          setUser(authenticatedUser);
          setAuthError("");
          setCheckingAuth(false);
          return;
        }
        setUser(null);
        clearStoredAccessTokens();
        const next = `${window.location.pathname}${window.location.search}`;
        router.replace(`/login?next=${encodeURIComponent(next)}`);
      } catch (error) {
        if (!mounted) return;
        console.error(
          "APP_LAYOUT: authentication request failed",
          error
        );
        setUser(null);
        setAuthError(
          error instanceof Error && error.name !== "AbortError"
            ? `Unable to verify access: ${error.message}`
            : "The authentication request timed out. Check your connection and retry."
        );
        setCheckingAuth(false);
      } finally {
        window.clearTimeout(timeout);
      }
    }

    checkAuthentication();

    return () => {
      mounted = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [router]);

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
            Sign in using the same browser and address as this page.
          </p>

          <Link
            href={`/login?next=${encodeURIComponent(pathname || "/dashboard")}`}
            className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Sign in
          </Link>

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
    <AuthContext.Provider value={user}>
      <div className="min-h-screen bg-slate-50">
        {navigationOpen && (
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setNavigationOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          />
        )}
        <Sidebar
          user={user}
          isOpen={navigationOpen}
          onClose={() => setNavigationOpen(false)}
        />
        <Header
          user={user}
          navigationOpen={navigationOpen}
          onToggleNavigation={() => setNavigationOpen((value) => !value)}
        />
        <div className="min-h-screen pt-20 lg:ml-64">
          <main className="w-full px-4 py-5 sm:px-5 lg:px-6">
            <div className="w-full min-w-0">{children}</div>
          </main>
        </div>
      </div>
    </AuthContext.Provider>
  );
}
