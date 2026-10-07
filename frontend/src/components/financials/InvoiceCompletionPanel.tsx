"use client";

import { useState } from "react";
import { apiRequest, apiResponse } from "@/lib/api";
import type { FinancialContact, FinancialDocument } from "@/lib/subledgers";

interface MessagePreview { recipient: string; subject: string; body: string }
interface DeliveryEvent { id: number; created_at: string; details: MessagePreview & { kind: string } }
interface CustomerStatement {
  customer: string; as_of: string; basis: string; totals_by_currency: Record<string, string>;
  rows: { id: number; number: string; date: string; due_date: string; currency: string; total: string; outstanding: string }[];
}
const button = "rounded-lg border px-3 py-2 text-sm disabled:opacity-50";

export function InvoiceCompletionPanel({ document, disabled }: { document: FinancialDocument; disabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState<MessagePreview | null>(null);
  const [kind, setKind] = useState<"invoice" | "reminder">("invoice");
  const [history, setHistory] = useState<DeliveryEvent[]>([]);
  const blocked = disabled || busy;

  async function run(operation: () => Promise<void>) {
    setBusy(true); setError(""); setSuccess("");
    try { await operation(); }
    catch (err) { setError(err instanceof Error ? err.message : "Invoice operation failed."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3 rounded-lg border p-4">
    <h3 className="font-semibold">Invoice PDF &amp; delivery</h3>
    <p className="text-sm">Review each email before sending. SMTP acceptance is not proof of recipient delivery.
      Sending again sends another copy. Draft PDFs are marked DRAFT.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {success && <p role="status" className="text-sm text-green-800">{success}</p>}
    <div className="flex flex-wrap gap-2">
      <button className={button} disabled={blocked} onClick={() => void run(async () => {
        const response = await apiResponse(`/financials/documents/${document.id}/pdf/`);
        const url = URL.createObjectURL(await response.blob());
        const link = window.document.createElement("a");
        link.href = url; link.download = `invoice-${document.id}.pdf`; link.click();
        URL.revokeObjectURL(url);
      })}>Download invoice PDF</button>
      {(["invoice", "reminder"] as const).map((value) => <button key={value} className={button}
        disabled={blocked || document.journal_status !== "posted"} onClick={() => void run(async () => {
          setPreview(null); setKind(value);
          setPreview(await apiRequest<MessagePreview>(`/financials/documents/${document.id}/delivery-preview/?kind=${value}`));
        })}>{value === "invoice" ? "Review invoice email" : "Review overdue reminder"}</button>)}
      <button className={button} disabled={blocked} onClick={() => void run(async () => {
        setHistory(await apiRequest<DeliveryEvent[]>(`/financials/documents/${document.id}/delivery-history/`));
      })}>Load sending history</button>
    </div>
    {preview && <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
      <p>To: {preview.recipient}</p><p>Subject: {preview.subject}</p>
      <pre className="whitespace-pre-wrap font-sans">{preview.body}</pre>
      <p>Attachment: invoice PDF</p>
      <button className={button} disabled={blocked} onClick={() => {
        if (!window.confirm(`Send this ${kind} email to ${preview.recipient}?`)) return;
        void run(async () => {
          await apiRequest(`/financials/documents/${document.id}/send/`, {
            method: "POST", body: JSON.stringify({ kind, ...preview }),
          });
          setPreview(null); setSuccess("Message accepted by SMTP. Recipient delivery is not confirmed.");
          setHistory(await apiRequest<DeliveryEvent[]>(`/financials/documents/${document.id}/delivery-history/`));
        });
      }}>Send reviewed email</button>
    </div>}
    {history.length > 0 && <ul className="space-y-1 text-sm">{history.map((event) =>
      <li key={event.id}>{event.created_at} — {event.details.kind} to {event.details.recipient} (SMTP accepted)</li>)}</ul>}
  </section>;
}

export function CustomerStatementPanel({ contacts, disabled }: { contacts: FinancialContact[]; disabled: boolean }) {
  const [contact, setContact] = useState("");
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<CustomerStatement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <section className="space-y-3 rounded-lg border p-4">
    <h3 className="font-semibold">Customer statements</h3>
    <form onSubmit={(event) => {
      event.preventDefault(); setBusy(true); setError(""); setReport(null);
      apiRequest<CustomerStatement>(`/financials/contacts/${contact}/statement/?as_of=${asOf}`)
        .then(setReport, (err: unknown) => setError(err instanceof Error ? err.message : "Could not load statement."))
        .finally(() => setBusy(false));
    }}><fieldset disabled={disabled || busy} className="flex flex-wrap items-end gap-3">
      <label className="text-sm">Customer<select required value={contact} className="ml-2 rounded border p-2"
        onChange={(event) => { setContact(event.target.value); setReport(null); }}>
        <option value="">Select customer</option>{contacts.filter((item) => item.kind === "customer").map((item) =>
          <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <label className="text-sm">Statement as of<input required type="date" className="ml-2 rounded border p-2"
        value={asOf} onChange={(event) => { setAsOf(event.target.value); setReport(null); }} /></label>
      <button className={button}>Generate customer statement</button>
    </fieldset></form>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {report && <div className="space-y-3 overflow-x-auto text-sm">
      <p>{report.customer} — {report.as_of}. {report.basis}</p>
      <p>{Object.entries(report.totals_by_currency).map(([currency, amount]) => `${currency} ${amount}`).join("; ") || "No posted invoices."}</p>
      <table className="w-full text-left"><thead><tr>{["Invoice", "Date", "Due", "Currency", "Total", "Outstanding"].map((label) =>
        <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{report.rows.map((row) =>
        <tr key={row.id} className="border-t">{[row.number, row.date, row.due_date, row.currency, row.total, row.outstanding].map((value, index) =>
          <td key={index} className="p-2">{value}</td>)}</tr>)}</tbody></table>
      <button className={button} onClick={() => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
        const link = document.createElement("a"); link.href = url; link.download = `customer-statement-${contact}-${report.as_of}.json`;
        link.click(); URL.revokeObjectURL(url);
      }}>Download statement JSON</button>
      <button className={button} disabled={disabled || busy} onClick={() => {
        setBusy(true); setError("");
        apiResponse(`/financials/contacts/${contact}/statement/?as_of=${report.as_of}&download=pdf`)
          .then(async (response) => {
            const url = URL.createObjectURL(await response.blob());
            const link = document.createElement("a"); link.href = url; link.download = `customer-statement-${contact}-${report.as_of}.pdf`;
            link.click(); URL.revokeObjectURL(url);
          })
          .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not download statement."))
          .finally(() => setBusy(false));
      }}>Download statement PDF</button>
    </div>}
  </section>;
}
