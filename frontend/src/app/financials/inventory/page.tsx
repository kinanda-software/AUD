"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getEngagements, postJournalEntry, type Engagement } from "@/lib/api";
import { getAccountingControl, type AccountingControl } from "@/lib/accountingControls";
import { getChartOfAccounts, type ChartOfAccount } from "@/lib/financials";
import {
  cancelInventoryMovement, deleteInventoryItem, getInventoryItems, getInventoryMovements,
  movementLabels, prepareInventoryMovement, saveInventoryItem,
  type InventoryItem, type InventoryItemInput, type InventoryMovement, type MovementInput, type MovementKind,
} from "@/lib/inventory";

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm";
const buttonClass = "rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50";
const secondaryClass = "rounded-lg border px-3 py-2 text-sm disabled:opacity-50";
const today = () => new Date().toISOString().slice(0, 10);
const incomingKinds: MovementKind[] = ["opening", "receipt", "increase"];
const blankMovement = (): MovementInput => ({
  kind: "receipt", transaction_date: today(), quantity: "", total_value: "",
  offset_account: null, reference: "", reason: "", register_only: false, confirm_existing_balance: false,
});
const isPending = (status: string) => ["draft", "submitted", "approved"].includes(status);

export default function InventoryPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [engagementId, setEngagementId] = useState("");
  const [policy, setPolicy] = useState<AccountingControl | null>(null);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<InventoryItemInput | null>(null);
  const [editingId, setEditingId] = useState<number | undefined>();
  const [movement, setMovement] = useState<MovementInput>(blankMovement);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    Promise.all([
      getAccountingControl(id), getChartOfAccounts(id), getInventoryItems(id), getInventoryMovements(id),
    ]).then(([control, chart, stock, history]) => {
      if (!active) return;
      setPolicy(control); setAccounts(chart); setItems(stock); setMovements(history); setLoading(false);
    }, (err: unknown) => {
      if (active) {
        setError(err instanceof Error ? err.message : "Could not load inventory.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [engagementId, refresh]);

  async function run(operation: () => Promise<unknown>, message: string) {
    setBusy(true); setError(""); setSuccess("");
    try {
      await operation();
      setSuccess(message);
      setLoading(true); setRefresh((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The operation failed.");
    } finally { setBusy(false); }
  }
  function changeEngagement(value: string) {
    setEngagementId(value); setPolicy(null); setAccounts([]); setItems([]); setMovements([]);
    setSelectedId(null); setDraft(null); setMovement(blankMovement());
    setError(""); setSuccess(""); setLoading(Boolean(value));
  }
  function startDraft(item?: InventoryItem) {
    setEditingId(item?.id);
    setDraft(item ? {
      engagement: item.engagement, sku: item.sku, name: item.name, unit: item.unit,
      inventory_account: item.inventory_account, expense_account: item.expense_account, is_active: item.is_active,
    } : {
      engagement: Number(engagementId), sku: "", name: "", unit: "each",
      inventory_account: 0, expense_account: 0, is_active: true,
    });
  }

  const disabled = busy || loading;
  const selected = items.find((item) => item.id === selectedId);
  const history = movements.filter((row) => row.item === selectedId);
  const activeAccounts = accounts.filter((account) => account.is_active);
  const incoming = incomingKinds.includes(movement.kind);
  const offsetTypes: Record<MovementKind, string[]> = {
    opening: ["equity"], receipt: ["asset", "liability"], issue: ["expense"],
    increase: ["expense", "revenue", "equity"], decrease: ["expense"],
  };
  const options = (chart: ChartOfAccount[]) => chart.map((account) =>
    <option key={account.id} value={account.id}>{account.account_code} - {account.account_name}</option>);
  const usedDraft = editingId !== undefined && movements.some((row) => row.item === editingId);
  const canPost = (journalStatus: string) => policy?.require_journal_approval
    ? journalStatus === "approved" : journalStatus === "draft" || journalStatus === "approved";

  return <main className="space-y-5 p-6">
    <header>
      <Link href="/financials" className="text-sm text-blue-700">Back to Financials</Link>
      <h1 className="mt-2 text-2xl font-semibold">Inventory</h1>
      <p className="mt-2 text-sm text-slate-600">Standalone opening stock, receipts, issues, and adjustments
        with perpetual moving weighted-average valuation.</p>
    </header>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {success && <p role="status" className="rounded-lg bg-green-50 p-3 text-green-800">{success}</p>}
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-64 text-sm">Engagement
        <select className={inputClass} value={engagementId} disabled={busy} onChange={(event) => changeEngagement(event.target.value)}>
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
      {policy?.can_manage && <button className={buttonClass} disabled={disabled || !policy.base_currency}
        onClick={() => startDraft()}>Add stock item</button>}
    </div>
    {loading && <p role="status">Loading inventory...</p>}
    {policy && <div className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm">
      <p>Base currency: <strong>{policy.base_currency || "Configure in Accounting Controls first"}</strong>.
        Quantities support four decimals; carrying values use two. Average unit cost is displayed to six decimals.</p>
      <p>These movements are not linked to invoices or bills. Do not post the same inventory cost again through a supplier bill.
        Tax, sales revenue, and supplier/customer payments are separate. Confirmed opening stock creates no ledger journal.</p>
    </div>}

    {draft && <section className="rounded-xl border bg-white p-5">
      <h2 className="font-semibold">{editingId ? "Edit stock item" : "Add stock item"}</h2>
      <form onSubmit={(event) => {
        event.preventDefault();
        void run(async () => {
          const saved = await saveInventoryItem(draft, editingId);
          setSelectedId(saved.id); setDraft(null); setMovement(blankMovement());
        }, "Stock item saved.");
      }}>
        <fieldset disabled={disabled} className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm">SKU<input className={inputClass} required maxLength={50} disabled={usedDraft}
            value={draft.sku} onChange={(event) => setDraft({ ...draft, sku: event.target.value })} /></label>
          <label className="text-sm">Item name<input className={inputClass} required maxLength={200}
            value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label className="text-sm">Unit of measure<input className={inputClass} required maxLength={30} disabled={usedDraft}
            value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} /></label>
          <label className="text-sm">Inventory asset account<select className={inputClass} required disabled={usedDraft}
            value={draft.inventory_account || ""} onChange={(event) => setDraft({ ...draft, inventory_account: Number(event.target.value) })}>
            <option value="">Select inventory account</option>{options(activeAccounts.filter((account) => account.account_type === "asset"))}
          </select></label>
          <label className="text-sm">Cost of goods sold / expense account<select className={inputClass} required disabled={usedDraft}
            value={draft.expense_account || ""} onChange={(event) => setDraft({ ...draft, expense_account: Number(event.target.value) })}>
            <option value="">Select expense account</option>{options(activeAccounts.filter((account) => account.account_type === "expense"))}
          </select></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.is_active}
            onChange={(event) => setDraft({ ...draft, is_active: event.target.checked })} />Active</label>
          <p className="text-sm text-slate-600 md:col-span-3">Used item codes, units and account mappings are immutable.
            Deactivate used items instead of deleting them.</p>
          <div className="flex gap-2 md:col-span-3"><button className={buttonClass} type="submit">Save item</button>
            <button className={secondaryClass} type="button" onClick={() => setDraft(null)}>Cancel</button></div>
        </fieldset>
      </form>
    </section>}

    <section className="overflow-x-auto rounded-xl border bg-white p-5">
      <h2 className="font-semibold">Current stock valuation</h2>
      <table className="mt-3 w-full text-left text-sm">
        <thead><tr className="border-b"><th className="p-2">Item</th><th>Unit</th><th>Quantity</th>
          <th>Carrying value</th><th>Average unit cost</th><th>Status</th><th /></tr></thead>
        <tbody>{items.map((item) => <tr key={item.id} className="border-b">
          <td className="p-2">{item.sku} - {item.name}</td><td>{item.unit}</td><td>{item.state.quantity}</td>
          <td>{item.state.value}</td><td>{item.state.average_unit_cost}</td>
          <td>{!item.is_active ? "Inactive" : item.state.pending_movement ? "Movement pending" : "Active"}</td>
          <td className="p-2"><button className={secondaryClass} disabled={disabled} onClick={() => {
            setSelectedId(item.id); setMovement(blankMovement()); setDraft(null);
          }}>Details</button></td>
        </tr>)}</tbody>
      </table>
      {!loading && items.length === 0 && <p className="mt-3 text-sm">No stock items for this engagement.</p>}
    </section>

    {selected && <section className="space-y-4 rounded-xl border bg-white p-5">
      <h2 className="font-semibold">{selected.sku} - {selected.name}</h2>
      <p className="text-sm">Last recognised movement: {selected.state.last_movement_date || "None"}.
        One pending movement per item is allowed. Earlier dates and negative stock are rejected.</p>
      {policy?.can_manage && <div className="flex gap-2">
        <button className={secondaryClass} disabled={disabled} onClick={() => startDraft(selected)}>Edit item</button>
        {!history.length && <button className={secondaryClass} disabled={disabled} onClick={() => {
          if (confirm(`Delete unused item ${selected.sku}?`)) void run(async () => {
            await deleteInventoryItem(selected.id); setSelectedId(null);
          }, "Unused stock item deleted.");
        }}>Delete unused item</button>}
      </div>}
      {selected.is_active && <form className="border-t pt-4" onSubmit={(event) => {
        event.preventDefault();
        const data: MovementInput = { ...movement };
        if (!incoming) delete data.total_value;
        if (data.kind === "issue") data.offset_account = null;
        if (data.register_only) {
          if (!confirm("Register this opening stock without posting a journal? Confirm its value is already in the ledger.")) return;
          data.offset_account = null;
        }
        void run(async () => {
          await prepareInventoryMovement(selected.id, data); setMovement(blankMovement());
        }, data.register_only ? "Opening stock registered without a journal." : "Stock movement journal prepared.");
      }}>
        <h3 className="font-medium">Prepare stock movement</h3>
        <fieldset disabled={disabled || selected.state.pending_movement || !policy?.base_currency}
          className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="text-sm">Movement type<select className={inputClass} value={movement.kind}
            onChange={(event) => {
              const kind = event.target.value as MovementKind;
              setMovement({ ...movement, kind, offset_account: null, register_only: false, confirm_existing_balance: false });
            }}>
            {(Object.keys(movementLabels) as MovementKind[]).filter((kind) =>
              policy?.can_manage || kind === "receipt" || kind === "issue").map((kind) =>
              <option key={kind} value={kind}>{movementLabels[kind]}</option>)}
          </select></label>
          <label className="text-sm">Transaction date<input className={inputClass} type="date" required
            min={selected.state.last_movement_date || undefined} value={movement.transaction_date}
            onChange={(event) => setMovement({ ...movement, transaction_date: event.target.value })} /></label>
          <label className="text-sm">Quantity ({selected.unit})<input className={inputClass} type="number" min="0.0001" step="0.0001" required
            value={movement.quantity} onChange={(event) => setMovement({ ...movement, quantity: event.target.value })} /></label>
          {incoming && <label className="text-sm">Total capitalised value ({policy?.base_currency})<input className={inputClass} type="number"
            min="0.01" step="0.01" required value={movement.total_value || ""}
            onChange={(event) => setMovement({ ...movement, total_value: event.target.value })} /></label>}
          {movement.kind !== "issue" && !movement.register_only && <label className="text-sm">Offset account<select className={inputClass}
            required value={movement.offset_account || ""} onChange={(event) => setMovement({
              ...movement, offset_account: Number(event.target.value) || null,
            })}>
            <option value="">Select offset</option>{options(activeAccounts.filter((account) =>
              offsetTypes[movement.kind].includes(account.account_type) && account.id !== selected.inventory_account))}
          </select></label>}
          <label className="text-sm">Reference<input className={inputClass} maxLength={100} value={movement.reference}
            onChange={(event) => setMovement({ ...movement, reference: event.target.value })} /></label>
          <label className="text-sm md:col-span-3">Reason / description<textarea className={inputClass} required maxLength={500} value={movement.reason}
            onChange={(event) => setMovement({ ...movement, reason: event.target.value })} /></label>
          {movement.kind === "opening" && <label className="flex items-center gap-2 text-sm md:col-span-3">
            <input type="checkbox" checked={movement.register_only}
              onChange={(event) => setMovement({ ...movement, register_only: event.target.checked, offset_account: null, confirm_existing_balance: false })} />
            Register only - opening stock value is already included in the ledger
          </label>}
          {movement.register_only && <label className="flex items-start gap-2 text-sm md:col-span-3">
            <input type="checkbox" required checked={movement.confirm_existing_balance}
              onChange={(event) => setMovement({ ...movement, confirm_existing_balance: event.target.checked })} />
            I confirm this quantity and value are opening stock already included in the base-currency ledger.
            This registration is immediately recognised and cannot be cancelled.
          </label>}
          <p className="text-sm text-slate-600 md:col-span-3">{incoming
            ? "Enter total stock cost, not unit cost. Receipt journals credit bank/cash or a payable/clearing account; opening journals credit equity."
            : "Outgoing value is computed from current carrying value and quantity. Full depletion clears any rounding residual; issues debit the configured expense account."}</p>
          <div><button className={buttonClass} type="submit">{movement.register_only ? "Register opening stock" : "Prepare movement journal"}</button></div>
        </fieldset>
      </form>}
      <h3 className="font-medium">Movement history</h3>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead><tr className="border-b"><th className="p-2">Date / type</th><th>Quantity</th><th>Value</th>
          <th>Quantity after</th><th>Value after</th><th>Status</th><th>Journal / actions</th></tr></thead>
        <tbody>{history.map((row) => <tr key={row.id} className="border-b">
          <td className="p-2">{row.transaction_date} - {movementLabels[row.kind]}
            <p className="text-xs text-slate-600">{row.reference} {row.reason}</p></td>
          <td>{row.quantity}</td><td>{row.value}</td><td>{row.quantity_after}</td><td>{row.value_after}</td>
          <td>{row.register_only ? "Registered (no journal)" : row.journal_status}</td>
          <td className="flex flex-wrap gap-2 p-2">
            {row.journal && <Link className="text-blue-700" href="/financials/journal-entries">Journal #{row.journal}</Link>}
            {row.journal && canPost(row.journal_status) && <button className={buttonClass} disabled={disabled}
              onClick={() => void run(() => postJournalEntry(row.journal!), "Stock movement posted.")}>Post</button>}
            {policy?.can_manage && row.journal && isPending(row.journal_status) && <button className={secondaryClass}
              disabled={disabled} onClick={() => {
                if (confirm("Cancel this unposted movement?")) void run(() => cancelInventoryMovement(row.id), "Stock movement cancelled.");
              }}>Cancel</button>}
          </td>
        </tr>)}</tbody>
      </table></div>
      {!history.length && <p className="text-sm text-slate-600">No movements yet.</p>}
      <p className="text-xs text-slate-600">Pending and cancelled rows show proposed before/after balances, not current stock.
        Only posted journals and confirmed register-only openings affect the current valuation.</p>
    </section>}
  </main>;
}
