import { apiRequest } from "@/lib/api";

/* =========================================================
   AUDIT ANALYTICS (Benford, stratification, aging, sampling)
========================================================= */

export interface BenfordDigit {
  digit: number;
  count: number;
  observed_percent: number;
  expected_percent: number;
}

export interface BenfordResult {
  population: number;
  digits: BenfordDigit[];
  chi_square: number;
  mad: number;
  verdict: string;
}

export interface StratificationBand {
  label: string;
  count: number;
  total: number;
  percent_of_value: number;
  percent_of_count: number;
}

export interface StratificationResult {
  population_count: number;
  population_value: number;
  bands: StratificationBand[];
  top_10_concentration_percent: number;
  top_10: {
    id: number;
    account_code: string;
    transaction_date: string;
    reference: string;
    description: string;
    amount: number;
  }[];
}

export interface AgingBucket {
  key: string;
  label: string;
  total: number;
  percent: number;
}

export interface AgingDocument {
  document_id: number;
  number: string;
  contact: string;
  transaction_date: string;
  due_date: string;
  days_overdue: number;
  outstanding: number;
  bucket: string;
}

export interface AgingResult {
  side: "receivable" | "payable";
  as_of: string;
  total_outstanding: number;
  buckets: AgingBucket[];
  documents: AgingDocument[];
}

export interface SampleItem {
  id: number;
  account_code: string;
  account_name: string;
  transaction_date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  amount: number;
}

export interface SampleSelection {
  id: number;
  engagement: number;
  engagement_code: string;
  account: number | null;
  account_code: string;
  name: string;
  method: "random" | "systematic" | "mus";
  method_label: string;
  population_size: number;
  population_value: string;
  sample_size: number;
  seed: number;
  interval: string | null;
  items: SampleItem[];
  created_by: number | null;
  created_by_username: string;
  created_at: string;
}

export async function getBenfordAnalysis(
  engagement: number,
  account?: number
): Promise<BenfordResult> {
  const params = new URLSearchParams({ engagement: String(engagement) });
  if (account) params.set("account", String(account));
  return apiRequest<BenfordResult>(`/analysis/benford/?${params}`);
}

export async function getStratification(
  engagement: number,
  account?: number
): Promise<StratificationResult> {
  const params = new URLSearchParams({ engagement: String(engagement) });
  if (account) params.set("account", String(account));
  return apiRequest<StratificationResult>(
    `/analysis/stratification/?${params}`
  );
}

export async function getAging(
  engagement: number,
  side: "receivable" | "payable",
  asOf?: string
): Promise<AgingResult> {
  const params = new URLSearchParams({
    engagement: String(engagement),
    side,
  });
  if (asOf) params.set("as_of", asOf);
  return apiRequest<AgingResult>(`/analysis/aging/?${params}`);
}

export async function getSamples(
  engagement?: number
): Promise<SampleSelection[]> {
  const query = engagement ? `?engagement=${engagement}` : "";
  return apiRequest<SampleSelection[]>(`/analysis-samples/${query}`);
}

export async function drawSample(data: {
  engagement: number;
  name: string;
  method: "random" | "systematic" | "mus";
  sample_size: number;
  seed?: number;
  account?: number | null;
}): Promise<SampleSelection> {
  return apiRequest<SampleSelection>("/analysis-samples/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteSample(id: number): Promise<void> {
  await apiRequest(`/analysis-samples/${id}/`, { method: "DELETE" });
}
