"use client";

import { usePathname } from "next/navigation";
import AppLayout from "./AppLayout";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Public authentication pages.
  // These pages must be accessible without being logged in.
  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/reset-password/");

  if (isPublicRoute) {
    return <>{children}</>;
  }

  // All other pages use the authenticated application layout.
  return <AppLayout>{children}</AppLayout>;
}