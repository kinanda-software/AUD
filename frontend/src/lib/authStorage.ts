const accessTokenKeys = [
  "audit-token",
  "access_token",
  "accessToken",
  "token",
  "authToken",
  "jwt",
  "jwt_token",
];

export function getStoredAccessToken(): string | null {
  for (const key of accessTokenKeys) {
    const value = localStorage.getItem(key);
    if (value) {
      return value;
    }
  }
  return null;
}

export function clearStoredAccessTokens(): void {
  for (const key of accessTokenKeys) {
    localStorage.removeItem(key);
  }
}
