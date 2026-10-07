export type WorkpaperResponse = {
  id: number | null;
  engagement: number;
  section: string;
  data: Record<string, unknown> | null;
  completion_status: "Not Started" | "In Progress" | "Completed";
  completed_at: string | null;
};

export function validateWorkpaperResponse(
  value: unknown, engagement: string, section: string, saving = false,
): WorkpaperResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid workpaper response.");
  const record = value as WorkpaperResponse;
  if (String(record.engagement) !== engagement || record.section !== section
    || !["Not Started", "In Progress", "Completed"].includes(record.completion_status)
    || (record.id !== null && (!Number.isInteger(record.id) || record.id <= 0))
    || (record.data !== null && (typeof record.data !== "object" || Array.isArray(record.data)))
    || (record.id === null) !== (record.data === null)
    || (saving && record.id === null)
    || !(record.completed_at === null || (typeof record.completed_at === "string"
      && Number.isFinite(Date.parse(record.completed_at))))
    || (record.completion_status === "Completed" && record.completed_at === null)
    || (record.completion_status !== "Completed" && record.completed_at !== null)
    || (record.id === null && record.completion_status !== "Not Started")) {
    throw new Error("Invalid or mismatched workpaper response; saving has not been confirmed.");
  }
  return record;
}

export function compatibleValue(value: unknown, template: unknown): boolean {
  if (Array.isArray(template)) return Array.isArray(value);
  if (template !== null && typeof template === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    return Object.entries(template).every(([key, child]) =>
      key in value && compatibleValue((value as Record<string, unknown>)[key], child));
  }
  return typeof value === typeof template && (typeof value !== "number" || Number.isFinite(value));
}
