import { apiRequest, type JournalEntryStatus } from "@/lib/api";

export type DocumentKind = "invoice" | "bill" | "sales_credit" | "purchase_credit";
export interface FinancialContact {
  id: number;
  engagement: number;
  kind: "customer" | "supplier";
  name: string;
  email: string;
  is_active: boolean;
}
export interface FinancialTaxCode {
  id: number;
  engagement: number;
  name: string;
  rate: string;
  sales_account: number;
  purchase_account: number;
  is_active: boolean;
}
export interface DocumentLine {
  id?: number;
  account: number;
  description: string;
  net_amount: string;
  tax_code: number | null;
  tax_rate?: string;
  tax_amount?: string;
  base_net?: string;
  base_tax?: string;
}
export interface FinancialPayment {
  id: number;
  document: number;
  transaction_date: string;
  amount: string;
  exchange_rate: string;
  base_amount: string;
  control_base_amount: string;
  fx_difference: string;
  bank_account: number;
  fx_account: number | null;
  reference: string;
  journal: number;
  journal_status: JournalEntryStatus;
  refund_journal: number | null;
  refund_status: JournalEntryStatus | null;
}
export interface FinancialDocument {
  id: number;
  engagement: number;
  kind: DocumentKind;
  number: string;
  contact: number;
  contact_name: string;
  transaction_date: string;
  due_date: string;
  currency: string;
  exchange_rate: string;
  control_account: number;
  original: number | null;
  journal: number | null;
  journal_status: JournalEntryStatus | null;
  lines: DocumentLine[];
  payments: FinancialPayment[];
  amounts: {
    net: string; tax: string; total: string;
    base_net: string; base_tax: string; base_total: string;
  };
  outstanding: string | null;
  available_to_settle: string | null;
}
export type DocumentInput = Pick<FinancialDocument,
  "engagement" | "kind" | "number" | "contact" | "transaction_date" | "due_date" |
  "currency" | "exchange_rate" | "control_account" | "original" | "lines">;
export interface AgeingReport {
  base_currency: string;
  base_total: string;
  as_of: string;
  kind: "invoice" | "bill";
  buckets: Record<string, string>;
  rows: {
    id: number; number: string; contact: string; currency: string;
    outstanding: string; base_outstanding: string; due_date: string;
    days_overdue: number; bucket: string;
  }[];
}
export interface TaxReport {
  base_currency: string;
  date_from: string;
  date_to: string;
  basis: string;
  rows: {
    tax_code: number | null; name: string; rate: string;
    sales_net: string; sales_tax: string; purchase_net: string; purchase_tax: string;
  }[];
}

export const documentLabels: Record<DocumentKind, string> = {
  invoice: "Sales invoice", bill: "Supplier bill",
  sales_credit: "Sales credit note", purchase_credit: "Purchase credit note",
};
export function getContacts(engagement: number) {
  return apiRequest<FinancialContact[]>(`/financials/contacts/?engagement=${engagement}`);
}
export function createContact(data: Omit<FinancialContact, "id" | "is_active">) {
  return apiRequest<FinancialContact>("/financials/contacts/", { method: "POST", body: JSON.stringify(data) });
}
export function getTaxCodes(engagement: number) {
  return apiRequest<FinancialTaxCode[]>(`/financials/tax-codes/?engagement=${engagement}`);
}
export function createTaxCode(data: Omit<FinancialTaxCode, "id" | "is_active">) {
  return apiRequest<FinancialTaxCode>("/financials/tax-codes/", { method: "POST", body: JSON.stringify(data) });
}
export function getDocuments(engagement: number) {
  return apiRequest<FinancialDocument[]>(`/financials/documents/?engagement=${engagement}`);
}
export function saveDocument(data: DocumentInput, id?: number) {
  return apiRequest<FinancialDocument>(
    `/financials/documents/${id === undefined ? "" : `${id}/`}`,
    { method: id === undefined ? "POST" : "PUT", body: JSON.stringify(data) }
  );
}
export function documentAction(id: number, action: "prepare" | "cancel") {
  return apiRequest<FinancialDocument>(`/financials/documents/${id}/${action}/`, {
    method: "POST", body: JSON.stringify({}),
  });
}
export function deleteDraftDocument(id: number) {
  return apiRequest<void>(`/financials/documents/${id}/`, { method: "DELETE" });
}
export function createPayment(
  id: number,
  data: Pick<FinancialPayment, "transaction_date" | "amount" | "exchange_rate" | "bank_account" | "fx_account" | "reference">
) {
  return apiRequest<FinancialPayment>(`/financials/documents/${id}/pay/`, {
    method: "POST", body: JSON.stringify(data),
  });
}
export function cancelPayment(id: number) {
  return apiRequest<FinancialPayment>(`/financials/payments/${id}/cancel/`, {
    method: "POST", body: JSON.stringify({}),
  });
}
export function getAgeingReport(engagement: number, kind: "invoice" | "bill", asOf: string) {
  return apiRequest<AgeingReport>(
    `/financials/subledger-reports/ageing/?${new URLSearchParams({
      engagement: String(engagement), kind, as_of: asOf,
    })}`
  );
}
export function getTaxReport(engagement: number, dateFrom: string, dateTo: string) {
  return apiRequest<TaxReport>(
    `/financials/subledger-reports/tax-summary/?${new URLSearchParams({
      engagement: String(engagement), date_from: dateFrom, date_to: dateTo,
    })}`
  );
}
