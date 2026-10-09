import { apiRequest } from "@/lib/api";

/* =========================================================
   EVIDENCE MANAGEMENT
========================================================= */

export interface EvidenceFile {
  id: number;
  engagement: number;
  engagement_code: string;
  section: string;
  file: string;
  file_url: string;
  original_filename: string;
  content_type: string;
  file_size: number;
  caption: string;
  description: string;
  uploaded_by: number | null;
  uploaded_by_username: string;
  uploaded_at: string;
}

export async function getEvidenceFiles(
  engagementId?: number,
  section?: string,
): Promise<EvidenceFile[]> {
  const params = new URLSearchParams();
  if (engagementId) params.set("engagement", String(engagementId));
  if (section) params.set("section", section);
  const query = params.toString();
  return apiRequest<EvidenceFile[]>(
    `/evidence-files/${query ? `?${query}` : ""}`,
  );
}

export async function uploadEvidenceFile(input: {
  engagement: number;
  file: File;
  section?: string;
  caption?: string;
  description?: string;
}): Promise<EvidenceFile> {
  const formData = new FormData();
  formData.append("engagement", String(input.engagement));
  formData.append("file", input.file);
  if (input.section) formData.append("section", input.section);
  if (input.caption) formData.append("caption", input.caption);
  if (input.description) {
    formData.append("description", input.description);
  }

  return apiRequest<EvidenceFile>("/evidence-files/", {
    method: "POST",
    body: formData,
  });
}

export async function deleteEvidenceFile(id: number): Promise<void> {
  await apiRequest(`/evidence-files/${id}/`, { method: "DELETE" });
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
