"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { getEngagements, type Engagement } from "@/lib/api";
import { getChartOfAccounts, type ChartOfAccount } from "@/lib/financials";
import {
  getAccountingControl, configureAccountingControl, closeAccountingPeriod,
  reopenAccountingPeriod, createOpeningBalances, type AccountingControl,
} from "@/lib/accountingControls";

const inputClass = "w-full rounded-lg border border-slate-300 p-2 text-sm";
const buttonClass = "rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50";
type OpeningLine = { account: string; debit: string; credit: string };
const emptyLine = (): OpeningLine => ({ account: "", debit: "0.00", credit: "0.00" });

export default function AccountingControlsPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [engagementId, setEngagementId] = useState("");
  const [control, setControl] = useState<AccountingControl | null>(null);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [requireApproval, setRequireApproval] = useState(false);
  const [baseCurrency, setBaseCurrency] = useState("TZS");
  const [confirmLegacyCurrency, setConfirmLegacyCurrency] = useState(false);
  const [closedThrough, setClosedThrough] = useState("");
  const [reason, setReason] = useState("");
  const [entryNumber, setEntryNumber] = useState("");
  const [openingDate, setOpeningDate] = useState("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<OpeningLine[]>([emptyLine(), emptyLine()]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    getEngagements().then((data) => {
      if (active) {
        setEngagements(data);
        setEngagementId(data.length ? String(data[0].id) : "");
        if (!data.length) setLoading(false);
      }
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
    Promise.all([
      getAccountingControl(Number(engagementId)),
      getChartOfAccounts(Number(engagementId)),
    ]).then(([policy, chart]) => {
      if (active) {
        setControl(policy);
        setRequireApproval(policy.require_journal_approval);
        setBaseCurrency(policy.base_currency || "TZS");
        setClosedThrough(policy.closed_through ?? "");
        setAccounts(chart.filter((account) =>
          account.is_active && ["asset", "liability", "equity"].includes(account.account_type)
        ));
        setLoading(false);
      }
    }, (err: unknown) => {
      if (active) {
        setError(err instanceof Error ? err.message : "Could not load accounting controls.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [engagementId]);

  function changeEngagement(value: string) {
    setEngagementId(value);
    setControl(null);
    setLoading(Boolean(value));
    setError("");
    setSuccess("");
    setReason("");
    setConfirmLegacyCurrency(false);
    setEntryNumber("");
    setOpeningDate("");
    setDescription("");
    setLines([emptyLine(), emptyLine()]);
  }

  async function run(operation: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await operation();
      const policy = await getAccountingControl(Number(engagementId));
      setControl(policy);
      setRequireApproval(policy.require_journal_approval);
      setBaseCurrency(policy.base_currency || "TZS");
      setClosedThrough(policy.closed_through ?? "");
      setSuccess(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Accounting operation failed.");
    } finally {
      setBusy(false);
    }
  }

  function updateLine(index: number, field: keyof OpeningLine, value: string) {
    setLines((current) => current.map((line, i) =>
      i === index ? { ...line, [field]: value } : line
    ));
  }

  function openingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(() => createOpeningBalances(Number(engagementId), {
      entry_number: entryNumber,
      transaction_date: openingDate,
      description,
      lines: lines.map((line) => ({
        account: Number(line.account), debit: line.debit || "0.00", credit: line.credit || "0.00",
      })),
    }), "Opening journal saved as draft. Review and post it from Journal Entries.");
  }

  const disabled = busy || loading || !control?.can_manage;

  return (
    <main className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Accounting Controls</h1>
        <p className="mt-2 text-sm text-slate-600">
          Configure independent journal approval, close books, and establish conversion opening balances.
        </p>
        <div className="mt-3 flex gap-4 text-sm text-blue-700">
          <Link href="/financials/journal-entries">Journal Entries</Link>
          <Link href="/financials/activity-log">Financial Activity</Link>
        </div>
      </header>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      {success && <p role="status" className="rounded-lg bg-green-50 p-3 text-green-800">{success}</p>}
      <label className="block max-w-xl text-sm">
        Engagement
        <select className={inputClass} value={engagementId} disabled={busy}
          onChange={(event) => changeEngagement(event.target.value)}>
          <option value="">Select engagement</option>
          {engagements.map((engagement) => <option key={engagement.id} value={engagement.id}>
            {engagement.engagement_code || engagement.title || `Engagement ${engagement.id}`}
          </option>)}
        </select>
      </label>
      {loading && <p role="status">Loading accounting controls...</p>}
      {control && !control.can_manage &&
        <p className="text-sm text-slate-600">Only managers and administrators can change these controls.</p>}
      {control && <>
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Base currency</h2>
          <p className="my-2 text-sm text-slate-600">
            Establish one fixed base currency before creating invoices and bills. Rates mean base-currency
            units per one document-currency unit. Existing ledger amounts are not converted.
          </p>
          {control.base_currency ? <p className="text-sm">Fixed base currency: <strong>{control.base_currency}</strong></p>
            : <form onSubmit={(event) => {
              event.preventDefault();
              void run(() => configureAccountingControl(Number(engagementId), requireApproval, {
                base_currency: baseCurrency, confirm_legacy_currency: confirmLegacyCurrency,
              }), "Base currency established.");
            }}>
              <fieldset disabled={disabled} className="max-w-xl space-y-3">
                <label className="block text-sm">Base currency
                  <select className={inputClass} value={baseCurrency}
                    onChange={(event) => setBaseCurrency(event.target.value)}>
                    {control.supported_currencies.map((currency) => <option key={currency}>{currency}</option>)}
                  </select>
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={confirmLegacyCurrency}
                    onChange={(event) => setConfirmLegacyCurrency(event.target.checked)} />
                  I have verified that all existing ledger amounts already use this currency.
                  This is required when legacy ledger entries exist.
                </label>
                <button className={buttonClass}>Establish base currency</button>
              </fieldset>
            </form>}
        </section>
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Journal approval</h2>
          <p className="my-2 text-sm text-slate-600">
            Approval is opt-in. When enabled, a different manager or administrator must approve
            each submitted journal before posting. Direct ledger posting is blocked.
          </p>
          <form onSubmit={(event) => {
            event.preventDefault();
            void run(() => configureAccountingControl(Number(engagementId), requireApproval),
              "Journal approval policy saved.");
          }}>
            <fieldset disabled={disabled} className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={requireApproval}
                  onChange={(event) => setRequireApproval(event.target.checked)} />
                Require independent journal approval
              </label>
              <button className={buttonClass}>Save policy</button>
            </fieldset>
          </form>
        </section>
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Close or reopen books</h2>
          <p className="my-2 text-sm text-slate-600">
            Current closing date: <strong>{control.closed_through ?? "Books are open"}</strong>.
            Closing blocks dated journal and ledger changes through that date. Pending journals
            must be resolved and posted ledger debits and credits must balance.
          </p>
          <form onSubmit={(event) => {
            event.preventDefault();
            void run(() => closeAccountingPeriod(Number(engagementId), closedThrough, reason),
              "Accounting period closed.");
          }}>
            <fieldset disabled={disabled} className="grid max-w-xl gap-3">
              <label className="text-sm">Close through
                <input className={inputClass} type="date" required value={closedThrough}
                  onChange={(event) => setClosedThrough(event.target.value)} />
              </label>
              <label className="text-sm">Reason for closing or reopening
                <input className={inputClass} required maxLength={500} value={reason}
                  onChange={(event) => setReason(event.target.value)} />
              </label>
              <div className="flex gap-3">
                <button className={buttonClass}>Close period</button>
                <button className={buttonClass} type="button" disabled={!control.closed_through || !reason.trim()}
                  onClick={() => void run(() => reopenAccountingPeriod(Number(engagementId), reason),
                    "Books reopened. The reason has been recorded.")}>Reopen books</button>
              </div>
            </fieldset>
          </form>
        </section>
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Opening balances</h2>
          <p className="my-2 text-sm text-slate-600">
            Establish one balanced conversion journal before posting ledger activity.
            Use balance-sheet accounts, with retained earnings for accumulated prior-year profit.
            After posting it, trial balances include activity from the opening date through their end date.
          </p>
          {control.opening_journal ? <p className="text-sm">
            Opening journal #{control.opening_journal}: {control.opening_journal_status}.
            {" "}<Link href="/financials/journal-entries" className="text-blue-700">Review journals</Link>
          </p> : <form onSubmit={openingSubmit}>
            <fieldset disabled={disabled} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-sm">Entry number
                  <input className={inputClass} required maxLength={50} value={entryNumber}
                    onChange={(event) => setEntryNumber(event.target.value)} />
                </label>
                <label className="text-sm">Opening date
                  <input className={inputClass} type="date" required value={openingDate}
                    onChange={(event) => setOpeningDate(event.target.value)} />
                </label>
                <label className="text-sm">Description
                  <input className={inputClass} required maxLength={500} value={description}
                    onChange={(event) => setDescription(event.target.value)} />
                </label>
              </div>
              {lines.map((line, index) => <div key={index} className="grid gap-2 md:grid-cols-4">
                <label className="text-sm">Account
                  <select className={inputClass} required value={line.account}
                    onChange={(event) => updateLine(index, "account", event.target.value)}>
                    <option value="">Select account</option>
                    {accounts.map((account) => <option key={account.id} value={account.id}>
                      {account.account_code} - {account.account_name}
                    </option>)}
                  </select>
                </label>
                {(["debit", "credit"] as const).map((field) => <label key={field} className="text-sm">
                  {field === "debit" ? "Debit" : "Credit"}
                  <input className={inputClass} type="number" min="0" step="0.01" required value={line[field]}
                    onChange={(event) => updateLine(index, field, event.target.value)} />
                </label>)}
                <button type="button" className="text-sm text-red-700" disabled={lines.length <= 2}
                  onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>
                  Remove line
                </button>
              </div>)}
              <div className="flex gap-3">
                <button type="button" className="rounded-lg border px-4 py-2 text-sm"
                  onClick={() => setLines((current) => [...current, emptyLine()])}>Add line</button>
                <button className={buttonClass}>Save opening journal</button>
              </div>
            </fieldset>
          </form>}
        </section>
      </>}
    </main>
  );
}
