import { apiRequest, type JournalEntryStatus } from "@/lib/api";

export interface AssetInput {
  engagement: number;
  asset_number: string;
  name: string;
  registration_mode: "new" | "existing";
  acquisition_date: string;
  depreciation_start: string;
  depreciation_months: number;
  cost: string;
  residual_value: string;
  opening_depreciation: string;
  asset_account: number;
  accumulated_account: number;
  expense_account: number;
  funding_account: number | null;
  confirm_existing_balances?: boolean;
}

export interface AssetEvent {
  id: number;
  asset: number;
  kind: "depreciation" | "disposal";
  transaction_date: string;
  amount: string;
  journal: number;
  journal_status: JournalEntryStatus;
}

export interface FixedAsset extends AssetInput {
  id: number;
  acquisition_journal: number | null;
  acquisition_status: JournalEntryStatus | null;
  state: {
    registered: boolean;
    disposed: boolean;
    disposal_pending: boolean;
    accumulated_depreciation: string;
    net_book_value: string;
    next_depreciation_date: string | null;
    posted_months: number;
  };
  events: AssetEvent[];
}

export function getFixedAssets(engagement: number) {
  return apiRequest<FixedAsset[]>(`/financials/fixed-assets/?engagement=${engagement}`);
}
export function saveFixedAsset(data: AssetInput, id?: number) {
  return apiRequest<FixedAsset>(`/financials/fixed-assets/${id ? `${id}/` : ""}`, {
    method: id ? "PATCH" : "POST", body: JSON.stringify(data),
  });
}
export function deleteFixedAsset(id: number) {
  return apiRequest<void>(`/financials/fixed-assets/${id}/`, { method: "DELETE" });
}
export function acquireFixedAsset(id: number) {
  return apiRequest<FixedAsset>(`/financials/fixed-assets/${id}/acquire/`, { method: "POST" });
}
export function depreciateFixedAsset(id: number, periodEnd: string) {
  return apiRequest<AssetEvent>(`/financials/fixed-assets/${id}/depreciate/`, {
    method: "POST", body: JSON.stringify({ period_end: periodEnd }),
  });
}
export function disposeFixedAsset(id: number, data: {
  transaction_date: string; proceeds: string;
  bank_account: number | null; gain_loss_account: number | null;
}) {
  return apiRequest<AssetEvent>(`/financials/fixed-assets/${id}/dispose/`, {
    method: "POST", body: JSON.stringify(data),
  });
}
export function cancelAssetJournal(assetId: number, eventId?: number) {
  const path = eventId
    ? `/financials/fixed-asset-events/${eventId}/cancel/`
    : `/financials/fixed-assets/${assetId}/cancel-acquisition/`;
  return apiRequest<FixedAsset | AssetEvent>(path, { method: "POST" });
}
