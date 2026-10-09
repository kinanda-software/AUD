import { apiRequest } from "@/lib/api";
import { API_ORIGIN } from "@/lib/apiConfig";

/* =========================================================
   CLIENT PORTAL — public self-registration with email OTP
========================================================= */

export type ClientRegistrationInput = {
  legal_name: string;
  registration_number?: string;
  license_authority?: string;
  license_expiry_date?: string;
  industry?: string;
  contact_person: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
};

export interface ClientRegistrationResult {
  registration_id: number;
  reference: string;
  message: string;
  /** Present only when the backend runs in DEBUG mode. */
  otp?: string;
}

export interface ClientRegistration {
  id: number;
  reference: string;
  legal_name: string;
  registration_number: string;
  license_authority: string;
  license_expiry_date: string | null;
  industry: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  status: "pending" | "verified" | "approved" | "rejected";
  review_notes: string;
  client: number | null;
  client_code: string;
  created_at: string;
  updated_at: string;
}

/*
 * Public endpoints (no auth token) — use plain fetch so the
 * page works for anonymous visitors.
 */
async function publicPost<T>(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<T> {
  const response = await fetch(
    `${API_ORIGIN}/api/client-portal/${endpoint}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      text || `Request failed with status ${response.status}`
    );
  }
  return text ? JSON.parse(text) : ({} as T);
}

export async function registerClient(
  data: ClientRegistrationInput
): Promise<ClientRegistrationResult> {
  return publicPost<ClientRegistrationResult>("register/", data);
}

export async function verifyClientRegistration(
  registrationId: number,
  otp: string
): Promise<{ status: string; message: string }> {
  return publicPost("verify/", {
    registration_id: registrationId,
    otp,
  });
}

export async function resendClientOtp(
  registrationId: number
): Promise<{ message: string; otp?: string }> {
  return publicPost("resend/", { registration_id: registrationId });
}

/* ---------------- Staff endpoints (authenticated) -------- */

export async function getClientRegistrations(
  status?: string
): Promise<ClientRegistration[]> {
  const query = status ? `?status=${status}` : "";
  return apiRequest<ClientRegistration[]>(
    `/client-portal/registrations/${query}`
  );
}

export async function approveClientRegistration(
  id: number,
  reviewNotes?: string
): Promise<ClientRegistration> {
  return apiRequest<ClientRegistration>(
    `/client-portal/registrations/${id}/approve/`,
    { method: "POST", body: JSON.stringify({ review_notes: reviewNotes }) }
  );
}

export async function rejectClientRegistration(
  id: number,
  reviewNotes?: string
): Promise<ClientRegistration> {
  return apiRequest<ClientRegistration>(
    `/client-portal/registrations/${id}/reject/`,
    { method: "POST", body: JSON.stringify({ review_notes: reviewNotes }) }
  );
}
