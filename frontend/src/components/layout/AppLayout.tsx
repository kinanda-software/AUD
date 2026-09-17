"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import Sidebar from "./Sidebar";
import Header from "./Header";

const API_URL = "http://localhost:8000";

type AuthUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkAuthentication = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me/`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (mounted) {
            setUser(null);

            router.replace(
              `/login?next=${encodeURIComponent(
                pathname || "/dashboard"
              )}`
            );
          }

          return;
        }

        const data = await response.json();

        if (mounted) {
          setUser(data.user);
          setCheckingAuth(false);
        }
      } catch {
        if (mounted) {
          setUser(null);

          router.replace(
            `/login?next=${encodeURIComponent(
              pathname || "/dashboard"
            )}`
          );
        }
      }
    };

    checkAuthentication();

    return () => {
      mounted = false;
    };
  }, [pathname, router]);

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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <Header />

      <main className="ml-64 pt-16">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}