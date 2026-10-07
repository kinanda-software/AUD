"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, getEngagements, postJournalEntry, type Engagement } from "@/lib/api";
import { CustomerStatementPanel, InvoiceCompletionPanel } from "@/components/financials/InvoiceCompletionPanel";
import { getAccountingControl, type AccountingControl } from "@/lib/accountingControls";
import { getChartOfAccounts, type ChartOfAccount } from "@/lib/financials";
import {
  getContacts, getTaxCodes, getDocuments, createContact, createTaxCode, saveDocument,
  documentAction, deleteDraftDocument, createPayment, cancelPayment, getAgeingReport,
  getTaxReport, documentLabels, type DocumentKind, type DocumentInput,
  type FinancialDocument, type FinancialContact, type FinancialTaxCode, type DocumentLine,
  type AgeingReport, type TaxReport,
} from "@/lib/subledgers";

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm";
const buttonClass = "rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50";
const secondaryClass = "rounded-lg border px-3 py-2 text-sm disabled:opacity-50";
const today = () => new Date().toISOString().slice(0, 10);
const blankLine = (): DocumentLine => ({ account: 0, description: "", net_amount: "", tax_code: null });
function blankDocument(engagement: number, currency: string): DocumentInput {
  return {
    engagement, kind: "invoice", number: "", contact: 0,
    transaction_date: today(), due_date: today(), currency, exchange_rate: "1",
    control_account: 0, original: null, lines: [blankLine()],
  };
}
function status(document: FinancialDocument) {
  if (!document.journal) return "Draft";
  if (document.journal_status === "posted") {
    return document.outstanding === "0.00" ? "Settled" : "Posted";
  }
  return document.journal_status === "void" ? "Cancelled" : `Journal ${document.journal_status}`;
}

export default function InvoicesBillsPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [engagementId, setEngagementId] = useState("");
  const [policy, setPolicy] = useState<AccountingControl | null>(null);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [contacts, setContacts] = useState<FinancialContact[]>([]);
  const [codes, setCodes] = useState<FinancialTaxCode[]>([]);
  const [documents, setDocuments] = useState<FinancialDocument[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [panel, setPanel] = useState<"documents" | "setup" | "reports">("documents");
  const [kindFilter, setKindFilter] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<DocumentInput | null>(null);
  const [editingId, setEditingId] = useState<number | undefined>();
  const [contactKind, setContactKind] = useState<"customer" | "supplier">("customer");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [taxName, setTaxName] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [salesTaxAccount, setSalesTaxAccount] = useState("");
  const [purchaseTaxAccount, setPurchaseTaxAccount] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentRate, setPaymentRate] = useState("1");
  const [bankAccount, setBankAccount] = useState("");
  const [fxAccount, setFxAccount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [asOf, setAsOf] = useState(today());
  const [ageingKind, setAgeingKind] = useState<"invoice" | "bill">("invoice");
  const [dateFrom, setDateFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [dateTo, setDateTo] = useState(today());
  const [ageing, setAgeing] = useState<AgeingReport | null>(null);
  const [taxReport, setTaxReport] = useState<TaxReport | null>(null);

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
      getAccountingControl(id), getChartOfAccounts(id), getContacts(id),
      getTaxCodes(id), getDocuments(id),
    ]).then(([control, chart, contactData, taxData, documentData]) => {
      if (!active) return;
      setPolicy(control);
      setAccounts(chart);
      setContacts(contactData);
      setCodes(taxData);
      setDocuments(documentData);
      setLoading(false);
    }, (err: unknown) => {
      if (active) {
        setError(err instanceof Error ? err.message : "Could not load subledgers.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [engagementId, refresh]);

  async function run(operation: () => Promise<unknown>, message: string, reload = true) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await operation();
      setSuccess(message);
      if (reload) {
        setLoading(true);
        setRefresh((value) => value + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "The operation failed.");
    } finally {
      setBusy(false);
    }
  }

  function changeEngagement(value: string) {
    setEngagementId(value);
    setPolicy(null);
    setDocuments([]);
    setContacts([]);
    setCodes([]);
    setAccounts([]);
    setSelectedId(null);
    setDraft(null);
    setAgeing(null);
    setTaxReport(null);
    setPaymentAmount("");
    setBankAccount("");
    setFxAccount("");
    setSalesTaxAccount("");
    setPurchaseTaxAccount("");
    setError("");
    setSuccess("");
    setLoading(Boolean(value));
  }

  const selected = documents.find((document) => document.id === selectedId);
  const sales = draft?.kind === "invoice" || draft?.kind === "sales_credit";
  const credit = draft?.kind === "sales_credit" || draft?.kind === "purchase_credit";
  const activeAccounts = accounts.filter((account) => account.is_active);
  const disabled = busy || loading;

  function startDraft(document?: FinancialDocument) {
    setEditingId(document?.id);
    setError("");
    setDraft(document ? {
      engagement: document.engagement, kind: document.kind, number: document.number,
      contact: document.contact, transaction_date: document.transaction_date,
      due_date: document.due_date, currency: document.currency,
      exchange_rate: document.exchange_rate, control_account: document.control_account,
      original: document.original,
      lines: document.lines.map((line) => ({
        account: line.account, description: line.description,
        net_amount: line.net_amount, tax_code: line.tax_code,
      })),
    } : blankDocument(Number(engagementId), policy?.base_currency ?? ""));
  }

  function selectOriginal(id: number) {
    const original = documents.find((document) => document.id === id);
    if (!draft || !original) return;
    setDraft({
      ...draft, original: id, contact: original.contact, control_account: original.control_account,
      currency: original.currency, exchange_rate: original.exchange_rate,
      lines: original.lines.map((line) => ({
        account: line.account, description: line.description,
        net_amount: line.net_amount, tax_code: line.tax_code,
      })),
    });
  }

  function updateLine(index: number, data: Partial<DocumentLine>) {
    if (draft) setDraft({
      ...draft, lines: draft.lines.map((line, i) => i === index ? { ...line, ...data } : line),
    });
  }

  function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    void run(async () => {
      await saveDocument(draft, editingId);
      setDraft(null);
    }, "Document saved. Prepare its journal when ready.");
  }

  function selectDocument(document: FinancialDocument) {
    setSelectedId(document.id);
    setPaymentAmount(document.available_to_settle ?? "");
    setPaymentDate(today());
    setPaymentRate(document.currency === policy?.base_currency ? "1" : document.exchange_rate);
    setBankAccount("");
    setFxAccount("");
    setPaymentReference("");
  }

  return (
    <main className="space-y-5 p-6">
      <header>
        <Link href="/financials" className="text-sm text-blue-700">Back to Financials</Link>
        <h1 className="mt-2 text-2xl font-semibold">Invoices, Bills & Tax</h1>
        <p className="mt-2 text-sm text-slate-600">
          Record sales and purchases, allocate partial payments, issue credit notes, and report outstanding
          balances and configurable taxes. Source documents generate balanced base-currency journals.
        </p>
      </header>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{success}</p>}
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-64 text-sm">Engagement
          <select className={inputClass} value={engagementId} disabled={busy}
            onChange={(event) => changeEngagement(event.target.value)}>
            <option value="">Select engagement</option>
            {engagements.map((engagement) => <option key={engagement.id} value={engagement.id}>
              {engagement.engagement_code || engagement.title || `Engagement ${engagement.id}`}
            </option>)}
          </select>
        </label>
        <button className={secondaryClass} disabled={disabled || !engagementId}
          onClick={() => { setLoading(true); setRefresh((value) => value + 1); }}>Refresh</button>
        <Link href="/financials/accounting-controls" className="p-2 text-sm text-blue-700">Accounting Controls</Link>
        <Link href="/financials/journal-entries" className="p-2 text-sm text-blue-700">Approve/Post Journals</Link>
      </div>
      {loading && <p role="status">Loading subledgers...</p>}
      {policy && !policy.base_currency && <p className="rounded-lg bg-amber-50 p-3 text-sm">
        A manager must establish the base currency in Accounting Controls before creating documents.
      </p>}
      {policy && <p className="text-sm text-slate-600">
        Base currency: <strong>{policy.base_currency || "Not configured"}</strong>.
        {" "}{policy.require_journal_approval ? "Independent journal approval is required." : "Review and post generated journals."}
        {" "}Amounts and tax are rounded per line to two decimals. Rates are entered manually.
      </p>}
      <nav className="flex flex-wrap gap-2" aria-label="Subledger sections">
        {(["documents", "setup", "reports"] as const).map((tab) => <button key={tab}
          className={panel === tab ? buttonClass : secondaryClass} disabled={busy}
          onClick={() => setPanel(tab)}>
          {tab === "documents" ? "Documents & payments" : tab === "setup" ? "Contacts & tax codes" : "Ageing & tax reports"}
        </button>)}
      </nav>

      {panel === "setup" && <>
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Customers and suppliers</h2>
          <form className="mt-3" onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await createContact({ engagement: Number(engagementId), kind: contactKind, name: contactName, email: contactEmail });
              setContactName(""); setContactEmail("");
            }, "Contact created.");
          }}>
            <fieldset disabled={disabled || !engagementId} className="grid gap-3 md:grid-cols-4">
              <label className="text-sm">Type<select className={inputClass} value={contactKind}
                onChange={(event) => setContactKind(event.target.value === "customer" ? "customer" : "supplier")}>
                <option value="customer">Customer</option><option value="supplier">Supplier</option>
              </select></label>
              <label className="text-sm">Name<input className={inputClass} required maxLength={200}
                value={contactName} onChange={(event) => setContactName(event.target.value)} /></label>
              <label className="text-sm">Email (optional)<input className={inputClass} type="email"
                value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} /></label>
              <button className={`${buttonClass} self-end`}>Add contact</button>
            </fieldset>
          </form>
          <ul className="mt-4 space-y-1 text-sm">{contacts.map((contact) => <li key={contact.id}>
            {contact.name} ({contact.kind}) {contact.email} {!contact.is_active && " - inactive"}
          </li>)}</ul>
        </section>
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Configurable tax codes</h2>
          <p className="mt-2 text-sm text-slate-600">
            Manager/admin setup only. Rates are tax-exclusive. Used rates and account mappings are immutable.
            This does not calculate or file country-specific tax returns.
          </p>
          <form className="mt-3" onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await createTaxCode({
                engagement: Number(engagementId), name: taxName, rate: taxRate,
                sales_account: Number(salesTaxAccount), purchase_account: Number(purchaseTaxAccount),
              });
              setTaxName(""); setTaxRate("");
            }, "Tax code created.");
          }}>
            <fieldset disabled={disabled || !policy?.can_manage} className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">Name<input className={inputClass} required maxLength={80}
                value={taxName} onChange={(event) => setTaxName(event.target.value)} /></label>
              <label className="text-sm">Rate (%)<input className={inputClass} type="number"
                min="0" max="100" step="0.0001" required value={taxRate}
                onChange={(event) => setTaxRate(event.target.value)} /></label>
              <label className="text-sm">Sales/output tax liability account
                <select className={inputClass} required value={salesTaxAccount}
                  onChange={(event) => setSalesTaxAccount(event.target.value)}>
                  <option value="">Select account</option>
                  {activeAccounts.filter((account) => account.account_type === "liability").map((account) =>
                    <option key={account.id} value={account.id}>{account.account_code} - {account.account_name}</option>)}
                </select>
              </label>
              <label className="text-sm">Purchase/input tax asset account
                <select className={inputClass} required value={purchaseTaxAccount}
                  onChange={(event) => setPurchaseTaxAccount(event.target.value)}>
                  <option value="">Select account</option>
                  {activeAccounts.filter((account) => account.account_type === "asset").map((account) =>
                    <option key={account.id} value={account.id}>{account.account_code} - {account.account_name}</option>)}
                </select>
              </label>
              <button className={`${buttonClass} justify-self-start`}>Add tax code</button>
            </fieldset>
          </form>
          <ul className="mt-4 space-y-1 text-sm">{codes.map((code) => <li key={code.id}>
            {code.name}: {code.rate}% {!code.is_active && " - inactive"}
          </li>)}</ul>
        </section>
      </>}

      {panel === "documents" && <>
        <div className="flex flex-wrap gap-3">
          <button className={buttonClass} disabled={disabled || !policy?.base_currency} onClick={() => startDraft()}>
            New invoice / bill / credit
          </button>
          <select className="rounded-lg border p-2 text-sm" value={kindFilter}
            onChange={(event) => setKindFilter(event.target.value)}>
            <option value="">All document types</option>
            {(Object.keys(documentLabels) as DocumentKind[]).map((kind) =>
              <option key={kind} value={kind}>{documentLabels[kind]}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50"><tr>
              {["Document", "Contact", "Due", "Total", "Outstanding", "Status", "Actions"].map((label) =>
                <th className="p-3" key={label}>{label}</th>)}
            </tr></thead>
            <tbody>{documents.filter((document) => !kindFilter || document.kind === kindFilter).map((document) =>
              <tr key={document.id} className="border-t align-top">
                <td className="p-3"><button className="text-blue-700" onClick={() => selectDocument(document)}>
                  {document.number}</button><p className="text-xs text-slate-500">{documentLabels[document.kind]}</p></td>
                <td className="p-3">{document.contact_name}</td><td className="p-3">{document.due_date}</td>
                <td className="whitespace-nowrap p-3">{document.currency} {document.amounts.total}
                  <p className="text-xs text-slate-500">{policy?.base_currency} {document.amounts.base_total}</p></td>
                <td className="p-3">{document.outstanding ?? "-"}</td>
                <td className="p-3">{status(document)}{document.journal && <p className="text-xs">Journal #{document.journal}</p>}</td>
                <td className="p-3"><div className="flex flex-wrap gap-2">
                  {!document.journal && <>
                    <button className={secondaryClass} disabled={disabled} onClick={() => startDraft(document)}>Edit</button>
                    <button className={secondaryClass} disabled={disabled}
                      onClick={() => void run(() => documentAction(document.id, "prepare"),
                        "Journal prepared. Review and post it; an approval may be required.")}>Prepare journal</button>
                    <button className={secondaryClass} disabled={disabled} onClick={() => {
                      if (window.confirm(`Delete draft ${document.number}?`)) {
                        void run(() => deleteDraftDocument(document.id), "Draft deleted.");
                      }
                    }}>Delete draft</button>
                  </>}
                  {document.journal && ["draft", "approved"].includes(document.journal_status ?? "") &&
                    <button className={secondaryClass} disabled={disabled}
                      onClick={() => void run(() => {
                        if (document.journal === null) throw new Error("This document has no journal.");
                        return postJournalEntry(document.journal);
                      },
                        "Source journal posted.")}>Post journal</button>}
                  {document.journal && !["posted", "void"].includes(document.journal_status ?? "") && policy?.can_manage &&
                    <button className={secondaryClass} disabled={disabled} onClick={() => {
                      if (window.confirm(`Cancel unposted ${document.number}?`)) {
                        void run(() => documentAction(document.id, "cancel"), "Unposted document cancelled.");
                      }
                    }}>Cancel</button>}
                  <button className={secondaryClass} onClick={() => selectDocument(document)}>Details</button>
                </div></td>
              </tr>)}</tbody>
          </table>
          {!documents.length && !loading && <p className="p-4 text-sm">No documents yet. Add contacts and tax codes in Setup first.</p>}
        </div>
        {selected && <section className="space-y-4 rounded-xl border bg-white p-5">
          <h2 className="font-semibold">{selected.number} — {documentLabels[selected.kind]}</h2>
          {selected.kind === "invoice" && <InvoiceCompletionPanel key={selected.id} document={selected} disabled={disabled} />}
          <p className="text-sm">Net {selected.currency} {selected.amounts.net}; tax {selected.amounts.tax};
            total {selected.amounts.total}. Rate: {selected.exchange_rate} {policy?.base_currency} per {selected.currency}.
          </p>
          <ul className="space-y-1 text-sm">{selected.lines.map((line, index) => <li key={line.id ?? index}>
            {line.description}: net {line.net_amount}; tax {line.tax_amount} ({line.tax_rate}%)
          </li>)}</ul>
          {selected.journal_status === "posted" && ["invoice", "bill"].includes(selected.kind) && <>
            <p className="text-sm">Available to settle, after pending credits/payments: {selected.currency} {selected.available_to_settle}.</p>
            <form onSubmit={(event) => {
              event.preventDefault();
              void run(() => createPayment(selected.id, {
                transaction_date: paymentDate, amount: paymentAmount, exchange_rate: paymentRate,
                bank_account: Number(bankAccount), fx_account: fxAccount ? Number(fxAccount) : null,
                reference: paymentReference,
              }), "Payment journal prepared. Review, approve if required, and post it.");
            }}>
              <fieldset disabled={disabled || selected.available_to_settle === "0.00"} className="grid gap-3 md:grid-cols-3">
                <label className="text-sm">Payment date<input className={inputClass} type="date" required
                  min={selected.transaction_date} value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></label>
                <label className="text-sm">Amount ({selected.currency})<input className={inputClass} type="number"
                  min="0.01" step="0.01" required value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} /></label>
                <label className="text-sm">Payment exchange rate<input className={inputClass} type="number"
                  min="0.00000001" step="0.00000001" required value={paymentRate}
                  readOnly={selected.currency === policy?.base_currency}
                  onChange={(event) => setPaymentRate(event.target.value)} /></label>
                <label className="text-sm">Bank/cash account<select className={inputClass} required value={bankAccount}
                  onChange={(event) => setBankAccount(event.target.value)}>
                  <option value="">Select account</option>
                  {activeAccounts.filter((account) => account.account_type === "asset" && account.id !== selected.control_account).map((account) =>
                    <option key={account.id} value={account.id}>{account.account_code} - {account.account_name}</option>)}
                </select></label>
                <label className="text-sm">FX gain (revenue) / loss (expense) account<select className={inputClass} value={fxAccount}
                  onChange={(event) => setFxAccount(event.target.value)}>
                  <option value="">None — only when no FX difference</option>
                  {activeAccounts.filter((account) => ["revenue", "expense"].includes(account.account_type)).map((account) =>
                    <option key={account.id} value={account.id}>{account.account_code} - {account.account_name} ({account.account_type})</option>)}
                </select></label>
                <label className="text-sm">Reference<input className={inputClass} maxLength={100} value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)} /></label>
                <button className={`${buttonClass} justify-self-start`}>Prepare payment</button>
              </fieldset>
            </form>
          </>}
          <h3 className="text-sm font-semibold">Payments</h3>
          {selected.payments.map((payment) => <div key={payment.id} className="flex flex-wrap items-center gap-3 text-sm">
            <span>#{payment.id}: {payment.transaction_date} — {selected.currency} {payment.amount};
              base {payment.base_amount}; FX debit/(credit) {payment.fx_difference}; {payment.journal_status}</span>
            {["draft", "approved"].includes(payment.journal_status) && <button className={secondaryClass}
              disabled={disabled} onClick={() => void run(() => postJournalEntry(payment.journal), "Payment posted.")}>
              Post payment journal
            </button>}
            {!["posted", "void"].includes(payment.journal_status) && policy?.can_manage &&
              <button className={secondaryClass} disabled={disabled} onClick={() => {
                if (window.confirm("Cancel this unposted payment?")) {
                  void run(() => cancelPayment(payment.id), "Payment cancelled; reserved balance released.");
                }
              }}>Cancel pending payment</button>}
            {selected.kind === "invoice" && payment.journal_status === "posted" && !payment.refund_journal && policy?.can_manage &&
              <button className={secondaryClass} disabled={disabled} onClick={() => {
                const reason = window.prompt("Reason for a full receipt refund (original receipt remains unchanged):");
                if (!reason?.trim()) return;
                const date = window.prompt("Refund date (YYYY-MM-DD):", today());
                if (!date) return;
                void run(() => apiRequest(`/financials/payments/${payment.id}/refund/`, {
                  method: "POST", body: JSON.stringify({ transaction_date: date, reason }),
                }), "Full refund journal prepared. Approve/post it to restore the invoice balance.");
              }}>Prepare full receipt refund</button>}
            {payment.refund_journal && <span>Refund journal #{payment.refund_journal}: {payment.refund_status}</span>}
            {payment.refund_journal && ["draft", "approved"].includes(payment.refund_status ?? "") &&
              <button className={secondaryClass} disabled={disabled} onClick={() => void run(
                () => {
                  if (!payment.refund_journal) throw new Error("No refund journal was selected.");
                  return postJournalEntry(payment.refund_journal);
                }, "Refund posted; invoice balance restored.",
              )}>Post refund journal</button>}
            {payment.refund_journal && !["posted", "void"].includes(payment.refund_status ?? "") && policy?.can_manage &&
              <button className={secondaryClass} disabled={disabled} onClick={() => {
                if (!window.confirm("Cancel this pending refund? A new refund cannot be created for the same receipt.")) return;
                void run(() => apiRequest(`/financials/payments/${payment.id}/cancel-refund/`, {
                  method: "POST", body: "{}",
                }), "Pending refund cancelled.");
              }}>Cancel pending refund</button>}
          </div>)}
          {!selected.payments.length && <p className="text-sm text-slate-500">No payments recorded.</p>}
        </section>}
      </>}

      {panel === "reports" && <section className="space-y-5 rounded-xl border bg-white p-5">
        <CustomerStatementPanel key={engagementId} contacts={contacts} disabled={disabled} />
        <h2 className="font-semibold">Posted subledger reports</h2>
        <p className="text-sm text-slate-600">Pending journals do not affect these reports. Base-currency balances
          use stored transaction rates and are not period-end FX revaluations.</p>
        <form onSubmit={(event) => {
          event.preventDefault();
          void run(async () => setAgeing(await getAgeingReport(Number(engagementId), ageingKind, asOf)), "Ageing report generated.", false);
        }}><fieldset disabled={disabled || !policy?.base_currency} className="flex flex-wrap items-end gap-3">
          <label className="text-sm">Subledger<select className={inputClass} value={ageingKind}
            onChange={(event) => setAgeingKind(event.target.value === "invoice" ? "invoice" : "bill")}>
            <option value="invoice">Receivables</option><option value="bill">Payables</option>
          </select></label>
          <label className="text-sm">As of<input className={inputClass} type="date" required value={asOf}
            onChange={(event) => setAsOf(event.target.value)} /></label>
          <button className={buttonClass}>Run ageing</button>
        </fieldset></form>
        {ageing && <div className="overflow-x-auto">
          <p className="text-sm">As of {ageing.as_of}: {ageing.base_currency} {ageing.base_total}</p>
          <div className="my-3 flex flex-wrap gap-4 text-sm">{Object.entries(ageing.buckets).map(([key, value]) =>
            <span key={key}>{key.replaceAll("_", "-")}: {value}</span>)}</div>
          <table className="w-full text-left text-sm"><thead><tr>
            {["Document", "Contact", "Due", "Overdue days", "Outstanding", "Base outstanding"].map((label) =>
              <th key={label} className="p-2">{label}</th>)}
          </tr></thead><tbody>{ageing.rows.map((row) => <tr key={row.id} className="border-t">
            <td className="p-2">{row.number}</td><td className="p-2">{row.contact}</td>
            <td className="p-2">{row.due_date}</td><td className="p-2">{row.days_overdue}</td>
            <td className="p-2">{row.currency} {row.outstanding}</td><td className="p-2">{row.base_outstanding}</td>
          </tr>)}</tbody></table>
        </div>}
        <form onSubmit={(event) => {
          event.preventDefault();
          void run(async () => setTaxReport(await getTaxReport(Number(engagementId), dateFrom, dateTo)),
            "Tax summary generated.", false);
        }}><fieldset disabled={disabled || !policy?.base_currency} className="flex flex-wrap items-end gap-3">
          <label className="text-sm">From<input className={inputClass} type="date" required value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)} /></label>
          <label className="text-sm">To<input className={inputClass} type="date" required min={dateFrom}
            value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
          <button className={buttonClass}>Run tax summary</button>
        </fieldset></form>
        {taxReport && <div className="overflow-x-auto">
          <p className="text-sm">{taxReport.date_from} to {taxReport.date_to}, {taxReport.base_currency}. {taxReport.basis}</p>
          <table className="mt-3 w-full text-left text-sm"><thead><tr>
            {["Tax code", "Rate %", "Sales net", "Sales tax", "Purchase net", "Purchase tax"].map((label) =>
              <th className="p-2" key={label}>{label}</th>)}
          </tr></thead><tbody>{taxReport.rows.map((row) => <tr key={`${row.tax_code}-${row.rate}`} className="border-t">
            <td className="p-2">{row.name}</td><td className="p-2">{row.rate}</td>
            <td className="p-2">{row.sales_net}</td><td className="p-2">{row.sales_tax}</td>
            <td className="p-2">{row.purchase_net}</td><td className="p-2">{row.purchase_tax}</td>
          </tr>)}</tbody></table>
        </div>}
      </section>}

      {draft && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/30 p-4">
        <form onSubmit={saveDraft} className="mx-auto my-4 max-w-5xl space-y-4 rounded-xl bg-white p-6">
          <h2 className="font-semibold">{editingId ? "Edit draft" : "New financial document"}</h2>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <fieldset disabled={busy} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm">Type<select className={inputClass} value={draft.kind}
                onChange={(event) => {
                  const kind = event.target.value as DocumentKind;
                  setDraft({ ...blankDocument(draft.engagement, policy?.base_currency ?? ""), kind });
                }}>
                {(Object.keys(documentLabels) as DocumentKind[]).map((kind) =>
                  <option key={kind} value={kind}>{documentLabels[kind]}</option>)}
              </select></label>
              <label className="text-sm">Number<input className={inputClass} required maxLength={50}
                value={draft.number} onChange={(event) => setDraft({ ...draft, number: event.target.value })} /></label>
              {credit && <label className="text-sm">Original document<select className={inputClass} required
                value={draft.original ?? ""} onChange={(event) => selectOriginal(Number(event.target.value))}>
                <option value="">Select original</option>
                {documents.filter((document) => document.kind === (sales ? "invoice" : "bill") &&
                  document.journal_status === "posted").map((document) =>
                  <option key={document.id} value={document.id}>{document.number} — {document.contact_name}</option>)}
              </select></label>}
              <label className="text-sm">Contact<select className={inputClass} required value={draft.contact || ""}
                disabled={credit} onChange={(event) => setDraft({ ...draft, contact: Number(event.target.value) })}>
                <option value="">Select contact</option>
                {contacts.filter((contact) => contact.kind === (sales ? "customer" : "supplier") && contact.is_active).map((contact) =>
                  <option key={contact.id} value={contact.id}>{contact.name}</option>)}
              </select></label>
              <label className="text-sm">Document date<input className={inputClass} type="date" required
                value={draft.transaction_date} onChange={(event) => setDraft({ ...draft, transaction_date: event.target.value })} /></label>
              <label className="text-sm">Due date<input className={inputClass} type="date" required min={draft.transaction_date}
                value={draft.due_date} onChange={(event) => setDraft({ ...draft, due_date: event.target.value })} /></label>
              <label className="text-sm">Currency<select className={inputClass} value={draft.currency} disabled={credit}
                onChange={(event) => setDraft({ ...draft, currency: event.target.value, exchange_rate: "1" })}>
                {policy?.supported_currencies.map((currency) => <option key={currency}>{currency}</option>)}
              </select></label>
              <label className="text-sm">Rate ({policy?.base_currency} per {draft.currency})
                <input className={inputClass} type="number" required min="0.00000001" step="0.00000001"
                  value={draft.exchange_rate} readOnly={credit || draft.currency === policy?.base_currency}
                  onChange={(event) => setDraft({ ...draft, exchange_rate: event.target.value })} />
              </label>
              <label className="text-sm">{sales ? "Receivables asset account" : "Payables liability account"}
                <select className={inputClass} required value={draft.control_account || ""} disabled={credit}
                  onChange={(event) => setDraft({ ...draft, control_account: Number(event.target.value) })}>
                  <option value="">Select control account</option>
                  {activeAccounts.filter((account) => account.account_type === (sales ? "asset" : "liability")).map((account) =>
                    <option key={account.id} value={account.id}>{account.account_code} - {account.account_name}</option>)}
                </select>
              </label>
            </div>
            <p className="text-sm text-slate-600">Enter tax-exclusive line amounts. Credit amounts are positive
              and reduce the original balance. They cannot exceed its available unsettled amount.</p>
            {draft.lines.map((line, index) => <div key={index} className="grid gap-2 rounded-lg border p-3 md:grid-cols-5">
              <label className="text-sm">Line account<select className={inputClass} required value={line.account || ""}
                onChange={(event) => updateLine(index, { account: Number(event.target.value) })}>
                <option value="">Select account</option>
                {activeAccounts.filter((account) => (sales ? ["revenue"] : ["expense", "asset"]).includes(account.account_type)
                  && account.id !== draft.control_account).map((account) =>
                  <option key={account.id} value={account.id}>{account.account_code} - {account.account_name}</option>)}
              </select></label>
              <label className="text-sm">Description<input className={inputClass} required maxLength={255}
                value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} /></label>
              <label className="text-sm">Net amount<input className={inputClass} type="number" min="0.01" step="0.01" required
                value={line.net_amount} onChange={(event) => updateLine(index, { net_amount: event.target.value })} /></label>
              <label className="text-sm">Tax code<select className={inputClass} value={line.tax_code ?? ""}
                onChange={(event) => updateLine(index, { tax_code: event.target.value ? Number(event.target.value) : null })}>
                <option value="">No tax</option>
                {codes.filter((code) => code.is_active).map((code) =>
                  <option key={code.id} value={code.id}>{code.name} ({code.rate}%)</option>)}
              </select></label>
              <button type="button" className="text-sm text-red-700" disabled={draft.lines.length <= 1}
                onClick={() => setDraft({ ...draft, lines: draft.lines.filter((_, i) => index !== i) })}>Remove</button>
            </div>)}
            <div className="flex gap-3">
              <button type="button" className={secondaryClass} disabled={draft.lines.length >= 200}
                onClick={() => setDraft({ ...draft, lines: [...draft.lines, blankLine()] })}>Add line</button>
              <button className={buttonClass}>{busy ? "Saving..." : "Save draft"}</button>
              <button type="button" className={secondaryClass} onClick={() => setDraft(null)}>Cancel</button>
            </div>
          </fieldset>
        </form>
      </div>}
    </main>
  );
}
