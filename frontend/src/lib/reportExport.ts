import { API_ORIGIN } from "@/lib/apiConfig";

/* =========================================================
   PDF REPORT DOWNLOADS
========================================================= */

/**
 * Downloads a binary PDF attachment from the reporting app
 * with the user's token attached. Responses are not JSON.
 */
async function downloadPdf(path: string, filename: string): Promise<void> {
  const headers = new Headers();
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("audit-token");
    if (token) headers.set("Authorization", `Token ${token}`);
  }

  const response = await fetch(`${API_ORIGIN}/api/${path}`, {
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      text || `Report download failed with status ${response.status}`,
    );
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Engagement summary PDF (working papers overview). */
export async function downloadEngagementSummaryPdf(
  engagementId: number,
  engagementCode: string,
): Promise<void> {
  return downloadPdf(
    `reporting/engagements/${engagementId}/summary.pdf`,
    `engagement-summary-${engagementCode}.pdf`,
  );
}

/** Management letter PDF (findings + recommendations + responses). */
export async function downloadManagementLetterPdf(
  engagementId: number,
  engagementCode: string,
): Promise<void> {
  return downloadPdf(
    `reporting/engagements/${engagementId}/management-letter.pdf`,
    `management-letter-${engagementCode}.pdf`,
  );
}

/** Consolidated firm-wide findings report (manager/admin only). */
export async function downloadConsolidatedPdf(): Promise<void> {
  return downloadPdf(
    "reporting/consolidated.pdf",
    "consolidated-findings-report.pdf",
  );
}
