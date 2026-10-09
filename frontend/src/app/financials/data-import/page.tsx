"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";

import {
  commitFinancialDataImport,
  createFinancialAccountMapping,
  createFinancialDataImport,
  getChartOfAccounts,
  getEngagements,
  getFinancialAccountMappings,
  getFinancialDataImports,
  type Engagement,
  type ChartOfAccount,
  type FinancialAccountMapping,
  type FinancialDataImport,
} from "@/lib/financials";

export default function FinancialDataImportPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [selectedEngagement, setSelectedEngagement] = useState("");
  const [sourceSystem, setSourceSystem] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [currency, setCurrency] = useState("TZS");
  const [accountCodeColumn, setAccountCodeColumn] = useState("account_code");
  const [debitColumn, setDebitColumn] = useState("debit");
  const [creditColumn, setCreditColumn] = useState("credit");
  const [file, setFile] = useState<File | null>(null);
  const [imports, setImports] = useState<FinancialDataImport[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [accountMappings, setAccountMappings] = useState<FinancialAccountMapping[]>([]);
  const [mappingSourceSystem, setMappingSourceSystem] = useState("");
  const [externalCode, setExternalCode] = useState("");
  const [localAccount, setLocalAccount] = useState("");
  const [activeImport, setActiveImport] = useState<FinancialDataImport | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadPage() {
      try {
        setError("");
        const [engagementData, importData, accountData, mappingData] = await Promise.all([
          getEngagements(),
          getFinancialDataImports(selectedEngagement ? Number(selectedEngagement) : undefined),
          selectedEngagement ? getChartOfAccounts(Number(selectedEngagement)) : Promise.resolve([]),
          selectedEngagement ? getFinancialAccountMappings(Number(selectedEngagement)) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setEngagements(engagementData);
        setImports(importData);
        setAccounts(accountData);
        setAccountMappings(mappingData);
        if (!selectedEngagement && engagementData.length) {
          setSelectedEngagement(String(engagementData[0].id));
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Failed to load financial imports.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadPage();
    return () => {
      cancelled = true;
    };
  }, [selectedEngagement]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEngagement || !file) {
      setError("Select an engagement and a CSV or XLSX file.");
      return;
    }
    try {
      setWorking(true);
      setError("");
      setSuccess("");
      const result = await createFinancialDataImport({
        engagement: Number(selectedEngagement),
        source_system: sourceSystem,
        period_start: periodStart,
        period_end: periodEnd,
        currency,
        column_mapping: {
          account_code: accountCodeColumn,
          debit: debitColumn,
          credit: creditColumn,
        },
        file,
      });
      setActiveImport(result);
      setSuccess(`Import #${result.id} validated. Review the reconciliation and any exceptions below.`);
      setImports(await getFinancialDataImports(Number(selectedEngagement)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The financial data could not be validated.");
    } finally {
      setWorking(false);
    }
  }

  async function handleCommit(imported: FinancialDataImport) {
    try {
      setWorking(true);
      setError("");
      setSuccess("");
      const result = await commitFinancialDataImport(imported.id);
      setActiveImport(result);
      setSuccess(`Import committed as Trial Balance #${result.trial_balance_id}.`);
      setImports(await getFinancialDataImports(Number(selectedEngagement)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The import could not be committed.");
    } finally {
      setWorking(false);
    }
  }

  async function handleCreateMapping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEngagement || !localAccount) return;
    try {
      setWorking(true);
      setError("");
      await createFinancialAccountMapping({
        engagement: Number(selectedEngagement),
        source_system: mappingSourceSystem,
        external_code: externalCode,
        account: Number(localAccount),
      });
      setAccountMappings(await getFinancialAccountMappings(Number(selectedEngagement)));
      setExternalCode("");
      setSuccess("Account mapping saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The account mapping could not be saved.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600">
          <Database size={18} />
          Financial data
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Client Data Import</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Upload a trial-balance export, map its columns to your chart of accounts, and reconcile it
          before creating an imported Trial Balance. CSV, XLSX, and JSON API ingestion are supported.
        </p>
      </header>

      {error && (
        <div role="alert" className="mb-5 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div role="status" className="mb-5 flex gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <section className="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Import and validate a source</h2>
          <p className="mt-1 text-xs text-slate-500">
            Account codes must match this engagement or have a source-system mapping configured.
          </p>
        </div>
        <form onSubmit={handleUpload} className="grid gap-5 p-5 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Engagement
            <select
              required
              value={selectedEngagement}
              onChange={(event) => setSelectedEngagement(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
            >
              <option value="">Select an engagement</option>
              {engagements.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.engagement_code || item.code || `Engagement #${item.id}`} — {item.title || item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Source system
            <input
              required
              maxLength={100}
              value={sourceSystem}
              onChange={(event) => setSourceSystem(event.target.value)}
              placeholder="e.g. QuickBooks, Xero, client ERP"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Period start
            <input required type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Period end
            <input required type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Currency
            <input required maxLength={10} value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Source file
            <input
              required
              type="file"
              accept=".csv,.xlsx"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-3 md:col-span-2">
            <ColumnField label="Account code column" value={accountCodeColumn} onChange={setAccountCodeColumn} />
            <ColumnField label="Debit column" value={debitColumn} onChange={setDebitColumn} />
            <ColumnField label="Credit column" value={creditColumn} onChange={setCreditColumn} />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={working || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {working ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />}
              Validate source
            </button>
          </div>
        </form>
      </section>

      {activeImport && <ImportReview imported={activeImport} working={working} onCommit={() => handleCommit(activeImport)} />}

      <section className="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Source account mappings</h2>
          <p className="mt-1 text-xs text-slate-500">Managers can map an external account code to the engagement’s chart of accounts.</p>
        </div>
        <form onSubmit={handleCreateMapping} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium text-slate-700">
            Source system
            <input required maxLength={100} value={mappingSourceSystem} onChange={(event) => setMappingSourceSystem(event.target.value)} placeholder="e.g. Xero" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            External account code
            <input required maxLength={100} value={externalCode} onChange={(event) => setExternalCode(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Engagement account
            <select required value={localAccount} onChange={(event) => setLocalAccount(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">
              <option value="">Select account</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.account_code} — {account.account_name}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <button type="submit" disabled={working || !selectedEngagement} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              Save mapping
            </button>
          </div>
        </form>
        {accountMappings.length > 0 && (
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Source</th><th className="px-5 py-3">External code</th><th className="px-5 py-3">Engagement account</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {accountMappings.map((mapping) => <tr key={mapping.id}><td className="px-5 py-3">{mapping.source_system}</td><td className="px-5 py-3">{mapping.external_code}</td><td className="px-5 py-3">{mapping.account_code} — {mapping.account_name}</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Import history</h2>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 size={17} className="animate-spin" /> Loading imports…</div>
        ) : imports.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No imports recorded for this engagement yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="px-5 py-3">Source</th><th className="px-5 py-3">Period</th><th className="px-5 py-3">Rows</th><th className="px-5 py-3">Validation</th><th className="px-5 py-3">Recorded</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {imports.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3"><button type="button" onClick={() => setActiveImport(item)} className="font-medium text-blue-700 hover:underline">#{item.id} · {item.source_system} / {item.source_name}</button></td>
                    <td className="px-5 py-3">{item.period_start} – {item.period_end}</td>
                    <td className="px-5 py-3">{item.row_count}</td>
                    <td className="px-5 py-3">{item.status === "validated" ? "Validated" : item.status === "imported" ? `Imported · TB #${item.trial_balance_id}` : `${item.validation_error_count} exception(s)`}</td>
                    <td className="px-5 py-3">{new Date(item.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function ColumnField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <input required value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
    </label>
  );
}

function ImportReview({
  imported,
  working,
  onCommit,
}: {
  imported: FinancialDataImport;
  working: boolean;
  onCommit: () => void;
}) {
  return (
    <section className="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><FileSpreadsheet size={18} /> Import #{imported.id} review</div>
          <p className="mt-1 text-xs text-slate-500">SHA-256 {imported.source_fingerprint}</p>
        </div>
        {imported.status === "validated" && (
          <button type="button" onClick={onCommit} disabled={working} className="rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60">
            {working ? "Committing…" : "Commit as Trial Balance"}
          </button>
        )}
      </div>
      <div className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-4">
        <Summary label="Source rows" value={String(imported.row_count)} />
        <Summary label="Debits" value={`${imported.currency} ${Number(imported.total_debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
        <Summary label="Credits" value={`${imported.currency} ${Number(imported.total_credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
        <Summary label="Status" value={imported.status.replace("_", " ")} />
      </div>
      {imported.validation_errors.length > 0 && (
        <div className="border-b border-slate-100 p-5">
          <h3 className="mb-2 font-semibold text-red-800">Validation exceptions ({imported.validation_error_count})</h3>
          <ul className="max-h-48 space-y-1 overflow-auto text-sm text-red-700">
            {imported.validation_errors.slice(0, 100).map((item, index) => (
              <li key={`${item.row}-${item.field}-${index}`}>{item.row ? `Row ${item.row} · ` : ""}{item.field}: {item.message}</li>
            ))}
          </ul>
          {imported.validation_error_count > 100 && <p className="mt-2 text-xs text-slate-500">Showing the first 100 exceptions.</p>}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-5 py-3">Row</th><th className="px-5 py-3">Source code</th><th className="px-5 py-3">Mapped account</th><th className="px-5 py-3 text-right">Debit</th><th className="px-5 py-3 text-right">Credit</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {imported.preview_rows.slice(0, 20).map((row) => (
              <tr key={row.source_row}>
                <td className="px-5 py-3">{row.source_row}</td>
                <td className="px-5 py-3">{row.external_code}</td>
                <td className="px-5 py-3">{row.account_code ? `${row.account_code} · ${row.account_name}` : "Unmapped"}</td>
                <td className="px-5 py-3 text-right tabular-nums">{row.debit}</td>
                <td className="px-5 py-3 text-right tabular-nums">{row.credit}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {imported.row_count > 20 && <p className="px-5 py-3 text-xs text-slate-500">Previewing the first 20 of {imported.row_count} rows.</p>}
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold capitalize text-slate-900">{value}</p></div>;
}
