"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Plus } from "lucide-react";
import {
  getChartOfAccounts,
  getEngagements,
  type ChartOfAccount,
  type Engagement,
} from "@/lib/financials";
import {
  approveFinancialBudget,
  createFinancialDimension,
  createFinancialBudget,
  createFinancialBudgetLine,
  getFinancialDimensions,
  getBudgetActuals,
  getFinancialBudgets,
  updateFinancialDimension,
  type BudgetActuals,
  type FinancialBudget,
  type FinancialDimension,
} from "@/lib/financialWorkflows";

function money(value: string, currency: string) {
  const [whole, fraction] = value.split(".");
  return `${currency} ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction || "00"}`;
}

export default function FinancialBudgetsPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [budgets, setBudgets] = useState<FinancialBudget[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [dimensions, setDimensions] = useState<FinancialDimension[]>([]);
  const [engagementId, setEngagementId] = useState("");
  const [budgetId, setBudgetId] = useState("");
  const [report, setReport] = useState<BudgetActuals | null>(null);
  const [name, setName] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [currency, setCurrency] = useState("TZS");
  const [accountId, setAccountId] = useState("");
  const [period, setPeriod] = useState(`${new Date().getFullYear()}-01`);
  const [amount, setAmount] = useState("");
  const [dimensionType, setDimensionType] =
    useState<FinancialDimension["dimension_type"]>("class");
  const [dimensionName, setDimensionName] = useState("");
  const [dimensionCode, setDimensionCode] = useState("");
  const [selectedDimensions, setSelectedDimensions] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  const selectedBudget = budgets.find((budget) => String(budget.id) === budgetId);
  const dimensionEngagementId = selectedBudget?.engagement ?? Number(engagementId);
  const availableDimensions = dimensions.filter(
    (dimension) => dimension.engagement === dimensionEngagementId
  );
  const assignableDimensions = availableDimensions.filter(
    (dimension) => dimension.is_active
  );
  const availableAccounts = accounts.filter(
    (account) => account.account_type === "revenue" || account.account_type === "expense"
  );

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [engagementData, budgetData] = await Promise.all([
          getEngagements(), getFinancialBudgets(),
        ]);
        if (!active) return;
        setEngagements(engagementData);
        setBudgets(budgetData);
        setEngagementId((current) =>
          current || (engagementData.length ? String(engagementData[0].id) : "")
        );
        setBudgetId((current) =>
          budgetData.some((item) => String(item.id) === current)
            ? current
            : budgetData.length ? String(budgetData[0].id) : ""
        );
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load budgets.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [reload]);

  useEffect(() => {
    let active = true;
    if (!engagementId) return () => { active = false; };
    void getChartOfAccounts(Number(engagementId)).then(
      (result) => { if (active) setAccounts(result); },
      (err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load accounts.");
      }
    );
    return () => { active = false; };
  }, [engagementId]);

  useEffect(() => {
    let active = true;
    if (!dimensionEngagementId) {
      return () => { active = false; };
    }
    void getFinancialDimensions(dimensionEngagementId, true).then(
      (result) => { if (active) setDimensions(result); },
      (err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load dimensions.");
      }
    );
    return () => { active = false; };
  }, [dimensionEngagementId, reload]);

  useEffect(() => {
    let active = true;
    if (!budgetId) return () => { active = false; };
    void getBudgetActuals(Number(budgetId)).then(
      (result) => { if (active) setReport(result); },
      (err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load budget actuals.");
      }
    );
    return () => { active = false; };
  }, [budgetId, reload]);

  async function submitBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!engagementId) return;
    setSaving(true);
    setError("");
    try {
      const created = await createFinancialBudget({
        engagement: Number(engagementId),
        name,
        fiscal_year: Number(year),
        currency,
      });
      setReport(null);
      setBudgetId(String(created.id));
      setName("");
      setReload((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create budget.");
    } finally {
      setSaving(false);
    }
  }

  async function submitBudgetLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBudget || !accountId) return;
    setSaving(true);
    setError("");
    try {
      await createFinancialBudgetLine({
        budget: selectedBudget.id,
        account: Number(accountId),
        period: `${period}-01`,
        amount,
        dimensions: selectedDimensions,
      });
      setAmount("");
      setSelectedDimensions([]);
      setReload((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save budget line.");
    } finally {
      setSaving(false);
    }
  }

  async function submitDimension(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dimensionEngagementId || !dimensionName.trim()) return;
    setSaving(true);
    setError("");
    try {
      await createFinancialDimension({
        engagement: dimensionEngagementId,
        dimension_type: dimensionType,
        name: dimensionName.trim(),
        code: dimensionCode.trim(),
      });
      setDimensionName("");
      setDimensionCode("");
      setReload((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create dimension.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleDimension(dimension: FinancialDimension) {
    setSaving(true);
    setError("");
    try {
      await updateFinancialDimension(dimension.id, {
        is_active: !dimension.is_active,
      });
      setReload((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update dimension.");
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    if (!selectedBudget) return;
    setSaving(true);
    setError("");
    try {
      await approveFinancialBudget(selectedBudget.id);
      setReload((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve budget.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm";

  return (
    <div className="w-full px-6 py-8">
      <Link href="/financials" className="text-sm text-blue-700">Back to Financials</Link>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">Budgets vs Actuals</h1>
      <p className="mt-2 text-sm text-slate-600">
        Budget by account and engagement class, location, or project; compare actuals tagged
        to the exact same dimension combination and approve a read-only baseline.
      </p>
      <p className="mt-2 text-xs text-amber-800">
        Ledger entries do not currently store currency. Confirm that posted activity uses the
        selected budget currency before relying on the variance report.
      </p>
      {error && <div role="alert" className="my-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
      {loading ? (
        <p role="status" className="mt-6 flex items-center gap-2"><Loader2 className="animate-spin" /> Loading budgets...</p>
      ) : (
        <>
          <div className="my-6 grid gap-5 lg:grid-cols-2">
            <form onSubmit={submitBudget} className="rounded-xl border bg-white p-5">
              <h2 className="font-semibold">Create a budget</h2>
              <label className="mt-3 block text-sm">Engagement
                <select className={inputClass} value={engagementId} onChange={(event) => setEngagementId(event.target.value)} required>
                  <option value="">Select engagement</option>
                  {engagements.map((item) => <option key={item.id} value={item.id}>{item.engagement_code || item.title || `Engagement #${item.id}`}</option>)}
                </select>
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm">Name<input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} required maxLength={150} /></label>
                <label className="text-sm">Calendar fiscal year<input className={inputClass} type="number" min="1900" max="9999" value={year} onChange={(event) => { setYear(event.target.value); setPeriod(`${event.target.value}-01`); }} required /></label>
                <label className="text-sm">Currency<input className={inputClass} value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} required maxLength={10} /></label>
              </div>
              <button disabled={saving || !engagements.length} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16} /> Create draft budget</button>
            </form>

            <form onSubmit={submitDimension} className="rounded-xl border bg-white p-5">
              <h2 className="font-semibold">Set up a class, location, or project</h2>
              <p className="mt-1 text-xs text-slate-500">
                Dimension values belong to the engagement selected by the current budget.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="text-sm">Type
                  <select className={inputClass} value={dimensionType} onChange={(event) => setDimensionType(event.target.value as FinancialDimension["dimension_type"])}>
                    <option value="class">Class</option>
                    <option value="location">Location</option>
                    <option value="project">Project</option>
                  </select>
                </label>
                <label className="text-sm">Name<input className={inputClass} value={dimensionName} onChange={(event) => setDimensionName(event.target.value)} required maxLength={120} /></label>
                <label className="text-sm">Code (optional)<input className={inputClass} value={dimensionCode} onChange={(event) => setDimensionCode(event.target.value)} maxLength={40} /></label>
              </div>
              <button disabled={saving || !dimensionEngagementId} className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50"><Plus size={16} /> Add dimension value</button>
              {availableDimensions.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {availableDimensions.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2 text-xs text-slate-600">
                      <span>{item.dimension_type}: {item.name}{item.code ? ` (${item.code})` : ""}{!item.is_active && " — inactive"}</span>
                      <button type="button" onClick={() => void toggleDimension(item)} disabled={saving} className="font-medium text-blue-700 disabled:opacity-50">
                        {item.is_active ? "Deactivate" : "Reactivate"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </form>

            <form onSubmit={submitBudgetLine} className="rounded-xl border bg-white p-5">
              <h2 className="font-semibold">Add monthly budget amount</h2>
              <label className="mt-3 block text-sm">Budget
                <select className={inputClass} value={budgetId} onChange={(event) => {
                  setBudgetId(event.target.value);
                  setReport(null);
                  setSelectedDimensions([]);
                  const chosen = budgets.find((item) => String(item.id) === event.target.value);
                  if (chosen) setPeriod(`${chosen.fiscal_year}-01`);
                }} required>
                  <option value="">Select a budget</option>
                  {budgets.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.fiscal_year} — {item.status}</option>)}
                </select>
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="text-sm">P&amp;L account
                  <select className={inputClass} value={accountId} onChange={(event) => setAccountId(event.target.value)} required disabled={!selectedBudget || selectedBudget.status === "approved"}>
                    <option value="">Select account</option>
                    {availableAccounts.filter((item) => item.engagement === selectedBudget?.engagement).map((item) => <option key={item.id} value={item.id}>{item.account_code} — {item.account_name} ({item.account_type})</option>)}
                  </select>
                </label>
                <label className="text-sm">Month<input className={inputClass} type="month" min={`${selectedBudget?.fiscal_year}-01`} max={`${selectedBudget?.fiscal_year}-12`} value={period} onChange={(event) => setPeriod(event.target.value)} required disabled={!selectedBudget || selectedBudget.status === "approved"} /></label>
                <label className="text-sm">Budget amount<input className={inputClass} type="number" min="0" max="9999999999999999.99" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required disabled={!selectedBudget || selectedBudget.status === "approved"} /></label>
              </div>
              <fieldset className="mt-3 rounded-lg border p-3" disabled={!selectedBudget || selectedBudget.status === "approved"}>
                <legend className="px-1 text-xs font-semibold text-slate-600">Dimension values (optional)</legend>
                {assignableDimensions.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {assignableDimensions.map((dimension) => (
                      <label key={dimension.id} className="flex items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedDimensions.includes(dimension.id)}
                          onChange={(event) => setSelectedDimensions((current) =>
                            event.target.checked
                              ? [...current, dimension.id]
                              : current.filter((id) => id !== dimension.id)
                          )}
                        />
                        {dimension.dimension_type}: {dimension.name}
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No dimension values are configured for this engagement.</p>
                )}
              </fieldset>
              <button disabled={saving || !selectedBudget || selectedBudget.status === "approved"} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16} /> Save month</button>
              {selectedBudget?.status === "approved" && <p className="mt-2 text-xs text-slate-500">Approved budgets cannot be edited.</p>}
            </form>
          </div>

          {selectedBudget && report && (
            <section className="rounded-xl border bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{report.name} — {report.fiscal_year}</h2>
                  <p className="mt-1 text-sm text-slate-500">Actuals are posted general-ledger activity. Positive variance is favorable for revenue; negative is favorable for expenses. Ledger currency is not recorded, so currency consistency must be confirmed.</p>
                </div>
                {selectedBudget.status === "draft" && (
                  <button type="button" onClick={approve} disabled={saving || !selectedBudget.lines.length} className="inline-flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-semibold text-green-800 disabled:opacity-50">
                    <CheckCircle2 size={16} /> Approve budget
                  </button>
                )}
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full whitespace-nowrap text-left text-xs">
                  <thead className="bg-slate-50"><tr>
                    <th className="p-2">Account</th><th className="p-2">Dimensions</th><th className="p-2">Year budget</th><th className="p-2">Year actual</th><th className="p-2">Variance</th>
                    {report.accounts[0]?.months.map((month) => <th key={month.period} className="p-2">{month.period.slice(5, 7)}</th>)}
                  </tr></thead>
                  <tbody>{report.accounts.map((account) => <tr key={`${account.account_id}-${account.dimensions.map((item) => item.id).join("-") || "all"}`} className="border-t">
                    <td className="p-2">{account.account_code} — {account.account_name}</td>
                    <td className="p-2">{account.dimensions.length ? account.dimensions.map((item) => `${item.dimension_type}: ${item.name}`).join(", ") : "Unsegmented"}</td>
                    <td className="p-2">{money(account.annual_budget, report.currency)}</td>
                    <td className="p-2">{money(account.annual_actual, report.currency)}</td>
                    <td className={`p-2 font-medium ${account.annual_favorable ? "text-green-700" : "text-red-700"}`}>{money(account.annual_variance, report.currency)}</td>
                    {account.months.map((month) => <td key={month.period} title={`Budget ${month.budget}; actual ${month.actual}; variance ${month.variance}`} className={`p-2 ${month.favorable ? "text-green-700" : "text-red-700"}`}>{money(month.variance, report.currency)}</td>)}
                  </tr>)}</tbody>
                </table>
                {report.accounts.length === 0 && <p className="p-4 text-sm text-slate-600">Add budget lines or post ledger activity to see account variances.</p>}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
