import { apiResponse } from "@/lib/api";
import { clearStoredAccessTokens } from "@/lib/authStorage";

export async function logoutToLogin(): Promise<void> {
  await apiResponse("/auth/logout/", { method: "POST" });
  clearStoredAccessTokens();
  window.location.replace("/login");
}
