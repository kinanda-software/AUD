import { apiRequest, type JournalEntryStatus } from "@/lib/api";

export interface InventoryItemInput {
  engagement: number;
  sku: string;
  name: string;
  unit: string;
  inventory_account: number;
  expense_account: number;
  is_active: boolean;
}
export interface InventoryItem extends InventoryItemInput {
  id: number;
  state: {
    quantity: string;
    value: string;
    average_unit_cost: string;
    last_movement_date: string | null;
    pending_movement: boolean;
  };
}
export type MovementKind = "opening" | "receipt" | "issue" | "increase" | "decrease";
export interface MovementInput {
  kind: MovementKind;
  transaction_date: string;
  quantity: string;
  total_value?: string;
  offset_account?: number | null;
  reference: string;
  reason: string;
  register_only: boolean;
  confirm_existing_balance: boolean;
}
export interface InventoryMovement {
  id: number;
  item: number;
  sku: string;
  kind: MovementKind;
  transaction_date: string;
  quantity: string;
  value: string;
  quantity_before: string;
  quantity_after: string;
  value_before: string;
  value_after: string;
  offset_account: number | null;
  reference: string;
  reason: string;
  register_only: boolean;
  journal: number | null;
  journal_status: JournalEntryStatus;
}
export const movementLabels: Record<MovementKind, string> = {
  opening: "Opening stock", receipt: "Stock receipt", issue: "Stock issue",
  increase: "Positive adjustment", decrease: "Negative adjustment",
};
export function getInventoryItems(engagement: number) {
  return apiRequest<InventoryItem[]>(`/financials/inventory-items/?engagement=${engagement}`);
}
export function getInventoryMovements(engagement: number) {
  return apiRequest<InventoryMovement[]>(`/financials/inventory-movements/?engagement=${engagement}`);
}
export function saveInventoryItem(data: InventoryItemInput, id?: number) {
  return apiRequest<InventoryItem>(`/financials/inventory-items/${id ? `${id}/` : ""}`, {
    method: id ? "PATCH" : "POST", body: JSON.stringify(data),
  });
}
export function deleteInventoryItem(id: number) {
  return apiRequest<void>(`/financials/inventory-items/${id}/`, { method: "DELETE" });
}
export function prepareInventoryMovement(id: number, data: MovementInput) {
  return apiRequest<InventoryMovement>(`/financials/inventory-items/${id}/move/`, {
    method: "POST", body: JSON.stringify(data),
  });
}
export function cancelInventoryMovement(id: number) {
  return apiRequest<InventoryMovement>(`/financials/inventory-movements/${id}/cancel/`, { method: "POST" });
}
