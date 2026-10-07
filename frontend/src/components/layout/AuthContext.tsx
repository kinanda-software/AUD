"use client";

import { createContext, useContext } from "react";
import type { AuthUser } from "./AppLayout";

export const AuthContext = createContext<AuthUser | null>(null);

export function useAuthUser(): AuthUser {
  const user = useContext(AuthContext);
  if (!user) throw new Error("An authenticated user is required for this workspace.");
  return user;
}
