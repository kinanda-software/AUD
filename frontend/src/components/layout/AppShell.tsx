
"use client";

import { usePathname } from "next/navigation";
import AppLayout from "./AppLayout";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Login page must remain standalone.
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // All other pages use the main application layout.
  return <AppLayout>{children}</AppLayout>;
}

