import { API_ORIGIN } from "@/lib/apiConfig";
import { getStoredAccessToken } from "@/lib/authStorage";

export type AuthUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
};

function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== "object" || value === null) return false;
  return "id" in value && typeof value.id === "number"
    && "username" in value && typeof value.username === "string"
    && "first_name" in value && typeof value.first_name === "string"
    && "last_name" in value && typeof value.last_name === "string"
    && "email" in value && typeof value.email === "string"
    && "role" in value && typeof value.role === "string";
}

export async function checkAuthSession(signal?: AbortSignal): Promise<AuthUser | null> {
  const token = getStoredAccessToken();
  const authorization = token?.startsWith("Token ") ? token : token ? `Token ${token}` : null;
  const response = await fetch(`${API_ORIGIN}/api/auth/me/`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(authorization ? { Authorization: authorization } : {}),
    },
    signal,
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) {
    throw new Error(`Authentication service returned HTTP ${response.status}.`);
  }
  const data: unknown = await response.json();
  if (typeof data !== "object" || data === null || !("authenticated" in data)) {
    throw new Error("The authentication service returned an invalid session response.");
  }
  if (data.authenticated === false) return null;
  if (data.authenticated === true && "user" in data && isAuthUser(data.user)) {
    return data.user;
  }
  throw new Error("The authentication service returned invalid user information.");
}
