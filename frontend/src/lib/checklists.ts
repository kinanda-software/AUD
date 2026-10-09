import { apiRequest } from "@/lib/api";

/* =========================================================
   CHECKLIST TEMPLATE LIBRARY + SCORING
========================================================= */

export type ChecklistResponseType =
  | "yes_no"
  | "yes_no_na"
  | "text"
  | "number"
  | "rating";

export interface ChecklistItem {
  id: number;
  template: number;
  order: number;
  question: string;
  response_type: ChecklistResponseType;
  weight: string;
  parent: number | null;
  condition_value: string;
}

export interface ChecklistTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
  items: ChecklistItem[];
  item_count: number;
  created_by: number | null;
  created_by_username: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistScore {
  percent: number | null;
  rating: string;
  answered: number;
  yes: number;
  no: number;
  total_questions: number;
}

export interface EngagementChecklist {
  id: number;
  engagement: number;
  engagement_code: string;
  template: number;
  template_name: string;
  name: string;
  status: "not_started" | "in_progress" | "completed";
  score: ChecklistScore;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistResponseRecord {
  id: number;
  engagement_checklist: number;
  item: number;
  question: string;
  response_type: ChecklistResponseType;
  order: number;
  parent: number | null;
  condition_value: string;
  value: string;
  rating: number | null;
  text_value: string;
  comment: string;
}

export type ResponseEntry = {
  item: number;
  value?: string;
  rating?: number | null;
  text_value?: string;
  comment?: string;
};

export async function getChecklistTemplates(): Promise<ChecklistTemplate[]> {
  return apiRequest<ChecklistTemplate[]>("/checklist-templates/");
}

export async function createChecklistTemplate(data: {
  name: string;
  description?: string;
  category?: string;
}): Promise<ChecklistTemplate> {
  return apiRequest<ChecklistTemplate>("/checklist-templates/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function cloneChecklistTemplate(
  id: number,
): Promise<ChecklistTemplate> {
  return apiRequest<ChecklistTemplate>(`/checklist-templates/${id}/clone/`, {
    method: "POST",
  });
}

export async function deleteChecklistTemplate(id: number): Promise<void> {
  await apiRequest(`/checklist-templates/${id}/`, { method: "DELETE" });
}

export async function importChecklistExcel(input: {
  file: File;
  name: string;
  category?: string;
  description?: string;
}): Promise<ChecklistTemplate> {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("name", input.name);
  if (input.category) formData.append("category", input.category);
  if (input.description) {
    formData.append("description", input.description);
  }
  return apiRequest<ChecklistTemplate>(
    "/checklist-templates/import_excel/",
    { method: "POST", body: formData },
  );
}

export async function getEngagementChecklists(
  engagementId?: number,
): Promise<EngagementChecklist[]> {
  const query = engagementId ? `?engagement=${engagementId}` : "";
  return apiRequest<EngagementChecklist[]>(
    `/engagement-checklists/${query}`,
  );
}

export async function createEngagementChecklist(data: {
  engagement: number;
  template: number;
  name?: string;
}): Promise<EngagementChecklist> {
  return apiRequest<EngagementChecklist>("/engagement-checklists/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getChecklistResponses(
  checklistId: number,
): Promise<ChecklistResponseRecord[]> {
  return apiRequest<ChecklistResponseRecord[]>(
    `/engagement-checklists/${checklistId}/responses/`,
  );
}

export async function saveChecklistResponses(
  checklistId: number,
  responses: ResponseEntry[],
  complete = false,
): Promise<EngagementChecklist> {
  return apiRequest<EngagementChecklist>(
    `/engagement-checklists/${checklistId}/responses/`,
    {
      method: "PUT",
      body: JSON.stringify({ responses, complete }),
    },
  );
}

export async function deleteEngagementChecklist(id: number): Promise<void> {
  await apiRequest(`/engagement-checklists/${id}/`, { method: "DELETE" });
}
