"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getEngagements, postJournalEntry, type Engagement } from "@/lib/api";
import { getAccountingControl, type AccountingControl } from "@/lib/accountingControls";
import { getChartOfAccounts, type ChartOfAccount } from "@/lib/financials";
import {
  acquireFixedAsset, cancelAssetJournal, deleteFixedAsset, depreciateFixedAsset,
  disposeFixedAsset, getFixedAssets, saveFixedAsset, type AssetInput, type FixedAsset,
} from "@/lib/fixedAssets";

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm";
const buttonClass = "rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50";
const secondaryClass = "rounded-lg border px-3 py-2 text-sm disabled:opacity-50";
const today = () => new Date().toISOString().slice(0, 10);
const pending = (status: string | null) => status !== null && status !== "posted" && status !== "void";

function status(asset: FixedAsset) {
  if (asset.state.disposed) return "Disposed";
  if (asset.state.disposal_pending) return "Disposal pending";
  if (asset.state.registered) return "Registered";
  if (asset.acquisition_status === "void") return "Acquisition cancelled";
  return asset.acquisition_journal ? `Acquisition ${asset.acquisition_status}` : "Draft acquisition";
}

export default function FixedAssetsPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [engagementId, setEngagementId] = useState("");
  const [policy, setPolicy] = useState<AccountingControl | null>(null);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<AssetInput | null>(null);
  const [editingId, setEditingId] = useState<number | undefined>();
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [disposalDate, setDisposalDate] = useState(today());
  const [proceeds, setProceeds] = useState("0.00");
  const [bankAccount, setBankAccount] = useState("");
  const [gainLossAccount, setGainLossAccount] = useState("");

  useEffect(() => {
    let active = true;
    getEngagements().then((data) => {
      if (!active) return;
      setEngagements(data);
      if (data.length) setEngagementId(String(data[0].id));
      else setLoading(false);
    }, (err: unknown) => {
      if (active) {
        setError(err instanceof Error ? err.message : "Could not load engagements.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!engagementId) return;
    let active = true;
    const id = Number(engagementId);
    Promise.all([getAccountingControl(id), getChartOfAccounts(id), getFixedAssets(id)]).then(
      ([control, chart, register]) => {
        if (!active) return;
        setPolicy(control);
        setAccounts(chart);
        setAssets(register);
        setLoading(false);
      }, (err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Could not load the asset register.");
          setLoading(false);
        }
      },
    );
    return () => { active = false; };
  }, [engagementId, refresh]);

  async function run(operation: () => Promise<unknown>, message: string) {
    setBusy(true); setError(""); setSuccess("");
    try {
      await operation();
      setSuccess(message);
      setLoading(true);
      setRefresh((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The operation failed.");
    } finally {
      setBusy(false);
    }
  }

  function changeEngagement(value: string) {
    setEngagementId(value); setPolicy(null); setAccounts([]); setAssets([]);
    setSelectedId(null); setDraft(null); setBankAccount(""); setGainLossAccount("");
    setError(""); setSuccess(""); setLoading(Boolean(value));
  }

  function startDraft(asset?: FixedAsset) {
    setEditingId(asset?.id);
    setDraft(asset ? {
      engagement: asset.engagement, asset_number: asset.asset_number, name: asset.name,
      registration_mode: asset.registration_mode, acquisition_date: asset.acquisition_date,
      depreciation_start: asset.depreciation_start, depreciation_months: asset.depreciation_months,
      cost: asset.cost, residual_value: asset.residual_value, opening_depreciation: asset.opening_depreciation,
      asset_account: asset.asset_account, accumulated_account: asset.accumulated_account,
      expense_account: asset.expense_account, funding_account: asset.funding_account,
    } : {
      engagement: Number(engagementId), asset_number: "", name: "", registration_mode: "new",
      acquisition_date: today(), depreciation_start: `${today().slice(0, 7)}-01`, depreciation_months: 60,
      cost: "", residual_value: "0.00", opening_depreciation: "0.00",
      asset_account: 0, accumulated_account: 0, expense_account: 0, funding_account: null,
      confirm_existing_balances: false,
    });
  }

  const selected = assets.find((asset) => asset.id === selectedId);
  const disabled = loading || busy;
  const activeAccounts = accounts.filter((account) => account.is_active);
  const assetAccounts = activeAccounts.filter((account) => account.account_type === "asset");
  const expenseAccounts = activeAccounts.filter((account) => account.account_type === "expense");
  const accountOptions = (chart: ChartOfAccount[]) => chart.map((account) =>
    <option key={account.id} value={account.id}>{account.account_code} - {account.account_name}</option>);
  const canPost = (journalStatus: string | null) => policy?.require_journal_approval
    ? journalStatus === "approved" : journalStatus === "draft" || journalStatus === "approved";

  return <main className="space-y-5 p-6">
    <header>
      <Link href="/financials" className="text-sm text-blue-700">Back to Financials</Link>
      <h1 className="mt-2 text-2xl font-semibold">Fixed Assets</h1>
      <p className="mt-2 text-sm text-slate-600">Register acquisitions, prepare monthly straight-line depreciation,
        and dispose of assets through balanced, approval-controlled journals.</p>
    </header>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {success && <p role="status" className="rounded-lg bg-green-50 p-3 text-green-800">{success}</p>}
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-64 text-sm">Engagement
        <select className={inputClass} value={engagementId} disabled={busy}
          onChange={(event) => changeEngagement(event.target.value)}>
          <option value="">Select engagement</option>
          {engagements.map((engagement) => <option key={engagement.id} value={engagement.id}>
            {engagement.engagement_code || engagement.title}
          </option>)}
        </select>
      </label>
      <button className={secondaryClass} disabled={disabled || !engagementId}
        onClick={() => { setLoading(true); setRefresh((value) => value + 1); }}>Refresh</button>
      <Link href="/financials/accounting-controls" className="p-2 text-sm text-blue-700">Accounting Controls</Link>
      <Link href="/financials/journal-entries" className="p-2 text-sm text-blue-700">Approve/Post Journals</Link>
      {policy?.can_manage && <button className={buttonClass}
        disabled={disabled || !policy.base_currency} onClick={() => startDraft()}>Add asset</button>}
    </div>
    {loading && <p role="status">Loading asset register...</p>}
    {policy && <p className="rounded-lg bg-slate-50 p-3 text-sm">
      Base currency: <strong>{policy.base_currency || "Configure in Accounting Controls first"}</strong>.
      {" "}Full-month depreciation starts in the selected month; there is no daily proration or depreciation
      in the disposal month. Amounts are base-currency, tax-exclusive capitalised costs.
      {" "}{policy.require_journal_approval ? "Independent approval is required." : "Review and post each generated journal."}
    </p>}

    {draft && <section className="rounded-xl border bg-white p-5">
      <h2 className="font-semibold">{editingId ? "Edit draft asset" : "Add asset"}</h2>
      <form onSubmit={(event) => {
        event.preventDefault();
        void run(async () => {
          const saved = await saveFixedAsset(draft, editingId);
          setSelectedId(saved.id); setDraft(null);
        }, "Asset saved.");
      }}>
        <fieldset disabled={disabled} className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm">Asset number<input className={inputClass} required maxLength={50}
            value={draft.asset_number} onChange={(event) => setDraft({ ...draft, asset_number: event.target.value })} /></label>
          <label className="text-sm">Asset name<input className={inputClass} required maxLength={200}
            value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label className="text-sm">Registration mode<select className={inputClass} value={draft.registration_mode}
            onChange={(event) => setDraft({
              ...draft, registration_mode: event.target.value === "existing" ? "existing" : "new",
              opening_depreciation: "0.00", funding_account: null, confirm_existing_balances: false,
            })}>
            <option value="new">New acquisition - generate journal</option>
            <option value="existing">Already in ledger - register only</option>
          </select></label>
          <label className="text-sm">Acquisition date<input className={inputClass} type="date" required
            value={draft.acquisition_date} onChange={(event) => setDraft({ ...draft, acquisition_date: event.target.value })} /></label>
          <label className="text-sm">{draft.registration_mode === "existing" ? "Opening register / first depreciation month" : "First depreciation month"}
            <input className={inputClass} type="month" required value={draft.depreciation_start.slice(0, 7)}
              onChange={(event) => setDraft({ ...draft, depreciation_start: `${event.target.value}-01` })} /></label>
          <label className="text-sm">{draft.registration_mode === "existing" ? "Remaining depreciation months" : "Useful life (months)"}
            <input className={inputClass} type="number" required min={1} max={1200} value={draft.depreciation_months}
              onChange={(event) => setDraft({ ...draft, depreciation_months: Number(event.target.value) })} /></label>
          {(["cost", "residual_value", "opening_depreciation"] as const).map((field) => <label className="text-sm" key={field}>
            {field === "cost" ? "Capitalised cost" : field === "residual_value" ? "Residual value" : "Opening accumulated depreciation"}
            <input className={inputClass} type="number" required min={field === "cost" ? "0.01" : "0"} step="0.01"
              disabled={field === "opening_depreciation" && draft.registration_mode === "new"}
              value={draft[field]} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })} />
          </label>)}
          <label className="text-sm">Asset cost account<select className={inputClass} required value={draft.asset_account || ""}
            onChange={(event) => setDraft({ ...draft, asset_account: Number(event.target.value) })}>
            <option value="">Select asset account</option>{accountOptions(assetAccounts)}
          </select></label>
          <label className="text-sm">Accumulated depreciation (contra-asset)<select className={inputClass} required value={draft.accumulated_account || ""}
            onChange={(event) => setDraft({ ...draft, accumulated_account: Number(event.target.value) })}>
            <option value="">Select separate asset account</option>{accountOptions(assetAccounts)}
          </select></label>
          <label className="text-sm">Depreciation expense account<select className={inputClass} required value={draft.expense_account || ""}
            onChange={(event) => setDraft({ ...draft, expense_account: Number(event.target.value) })}>
            <option value="">Select expense account</option>{accountOptions(expenseAccounts)}
          </select></label>
          {draft.registration_mode === "new" ? <label className="text-sm">Funding / offset account<select className={inputClass} required
            value={draft.funding_account || ""} onChange={(event) => setDraft({ ...draft, funding_account: Number(event.target.value) || null })}>
            <option value="">Select funding account</option>{accountOptions(activeAccounts.filter((account) =>
              ["asset", "liability", "equity"].includes(account.account_type)))}
          </select></label> : <label className="flex items-start gap-2 text-sm md:col-span-3">
            <input type="checkbox" required checked={draft.confirm_existing_balances || false}
              onChange={(event) => setDraft({ ...draft, confirm_existing_balances: event.target.checked })} />
            I confirm cost and opening accumulated depreciation are already recorded in the base-currency ledger
            before the opening register month. No acquisition or opening journal will be created.
          </label>}
          <p className="text-sm text-slate-600 md:col-span-3">Existing registration and prepared acquisitions are immutable.
            Do not generate an acquisition journal for an asset already recorded through a supplier bill or opening balances.
            Depreciation allocates remaining depreciable value over the selected months, with final rounding absorbed.</p>
          <div className="flex gap-2 md:col-span-3"><button className={buttonClass} type="submit">Save asset</button>
            <button className={secondaryClass} type="button" onClick={() => setDraft(null)}>Cancel</button></div>
        </fieldset>
      </form>
    </section>}

    <section className="overflow-x-auto rounded-xl border bg-white p-5">
      <h2 className="font-semibold">Asset register</h2>
      <table className="mt-3 w-full text-left text-sm">
        <thead><tr className="border-b"><th className="p-2">Asset</th><th>Status</th><th>Cost</th>
          <th>Accumulated depreciation</th><th>Net book value</th><th>Next month-end</th><th /></tr></thead>
        <tbody>{assets.map((asset) => <tr key={asset.id} className="border-b">
          <td className="p-2">{asset.asset_number} - {asset.name}</td><td>{status(asset)}</td><td>{asset.cost}</td>
          <td>{asset.state.registered ? asset.state.accumulated_depreciation : "-"}</td>
          <td>{asset.state.registered ? asset.state.net_book_value : "-"}</td>
          <td>{asset.state.registered ? asset.state.next_depreciation_date || "-" : "-"}</td>
          <td className="p-2"><button className={secondaryClass} disabled={disabled} onClick={() => {
            setSelectedId(asset.id); setProceeds("0.00"); setBankAccount(""); setGainLossAccount("");
          }}>Details</button></td>
        </tr>)}</tbody>
      </table>
      {!loading && assets.length === 0 && <p className="mt-3 text-sm">No assets registered for this engagement.</p>}
    </section>

    {selected && <section className="space-y-4 rounded-xl border bg-white p-5">
      <h2 className="font-semibold">{selected.asset_number} - {selected.name}</h2>
      <p className="text-sm">{status(selected)}. Residual value: {selected.residual_value}.
        {" "}First depreciation month: {selected.depreciation_start}. Posted months: {selected.state.posted_months}/{selected.depreciation_months}.</p>
      <div className="flex flex-wrap gap-2">
        {policy?.can_manage && selected.registration_mode === "new" && !selected.acquisition_journal && <>
          <button className={secondaryClass} disabled={disabled} onClick={() => startDraft(selected)}>Edit draft</button>
          <button className={secondaryClass} disabled={disabled} onClick={() => {
            if (confirm(`Delete draft asset ${selected.asset_number}?`)) void run(async () => {
              await deleteFixedAsset(selected.id); setSelectedId(null);
            }, "Draft asset deleted.");
          }}>Delete draft</button>
          <button className={buttonClass} disabled={disabled} onClick={() =>
            void run(() => acquireFixedAsset(selected.id), "Acquisition journal prepared.")}>Prepare acquisition journal</button>
        </>}
        {selected.acquisition_journal && pending(selected.acquisition_status) && <>
          {canPost(selected.acquisition_status) && <button className={buttonClass} disabled={disabled}
            onClick={() => void run(() => postJournalEntry(selected.acquisition_journal!), "Acquisition posted.")}>Post acquisition</button>}
          {policy?.can_manage && <button className={secondaryClass} disabled={disabled} onClick={() => {
            if (confirm("Cancel the unposted acquisition journal? This registration will remain cancelled."))
              void run(() => cancelAssetJournal(selected.id), "Acquisition cancelled.");
          }}>Cancel acquisition</button>}
        </>}
        {selected.state.registered && selected.state.next_depreciation_date && <button className={buttonClass}
          disabled={disabled || selected.events.some((event) => pending(event.journal_status))}
          onClick={() => void run(() => depreciateFixedAsset(selected.id, selected.state.next_depreciation_date!),
            "Depreciation journal prepared.")}>Prepare depreciation: {selected.state.next_depreciation_date}</button>}
      </div>
      <h3 className="font-medium">Depreciation and disposal journals</h3>
      {selected.events.length === 0 && <p className="text-sm text-slate-600">No asset events yet.</p>}
      {selected.events.map((event) => <div key={event.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
        <span>{event.transaction_date} - {event.kind} - {event.amount} - {event.journal_status}</span>
        <Link className="text-blue-700" href="/financials/journal-entries">Journal #{event.journal}</Link>
        {canPost(event.journal_status) && <button className={buttonClass} disabled={disabled}
          onClick={() => void run(() => postJournalEntry(event.journal), "Asset journal posted.")}>Post</button>}
        {policy?.can_manage && pending(event.journal_status) && <button className={secondaryClass} disabled={disabled}
          onClick={() => {
            if (confirm("Cancel this unposted asset journal?"))
              void run(() => cancelAssetJournal(selected.id, event.id), "Asset journal cancelled.");
          }}>Cancel journal</button>}
      </div>)}
      {policy?.can_manage && selected.state.registered && !selected.state.disposed && !selected.state.disposal_pending &&
        <form className="border-t pt-4" onSubmit={(event) => {
          event.preventDefault();
          if (confirm("Prepare disposal? No depreciation is charged in the disposal month.")) void run(() => disposeFixedAsset(selected.id, {
            transaction_date: disposalDate, proceeds,
            bank_account: Number(bankAccount) || null, gain_loss_account: Number(gainLossAccount) || null,
          }), "Disposal journal prepared.");
        }}>
          <h3 className="font-medium">Disposal / write-off</h3>
          <fieldset disabled={disabled} className="mt-3 grid gap-3 md:grid-cols-4">
            <label className="text-sm">Disposal date<input className={inputClass} type="date" required value={disposalDate}
              onChange={(event) => setDisposalDate(event.target.value)} /></label>
            <label className="text-sm">Proceeds (base currency)<input className={inputClass} type="number" min="0" step="0.01" required
              value={proceeds} onChange={(event) => setProceeds(event.target.value)} /></label>
            <label className="text-sm">Bank/cash account<select className={inputClass} value={bankAccount}
              onChange={(event) => setBankAccount(event.target.value)}>
              <option value="">None (zero proceeds)</option>{accountOptions(assetAccounts)}
            </select></label>
            <label className="text-sm">Gain (revenue) / loss (expense)<select className={inputClass} value={gainLossAccount}
              onChange={(event) => setGainLossAccount(event.target.value)}>
              <option value="">None (no gain/loss)</option>{accountOptions(activeAccounts.filter((account) =>
                ["revenue", "expense"].includes(account.account_type)))}
            </select></label>
            <p className="text-sm text-slate-600 md:col-span-4">Post all scheduled depreciation through the previous month first.
              Use zero proceeds for a write-off. Proceeds exclude tax; disposal-tax handling is not automated.</p>
            <div><button className={buttonClass} type="submit">Prepare disposal</button></div>
          </fieldset>
        </form>}
    </section>}
  </main>;
}
