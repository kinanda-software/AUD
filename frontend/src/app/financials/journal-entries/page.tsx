
"use client";
import { API_ORIGIN } from "@/lib/apiConfig";


import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  createJournalEntry,
  getEngagements,
  getJournalEntries,
  postJournalEntry,
  updateJournalEntry,
  type Engagement,
  type JournalEntry,
  type JournalEntrySource,
  type JournalEntryStatus,
} from "@/lib/api";
import { journalWorkflowAction } from "@/lib/accountingControls";
import {
  getFinancialDimensions,
  type FinancialDimension,
} from "@/lib/financialWorkflows";

type Account = {
  id: number;
  engagement: number;
  account_code: string;
  account_name: string;
  account_type: string;
  financial_statement_section: string;
  description: string;
  is_active: boolean;
};

type DraftLine = {
  id: string;
  account: string;
  debit: string;
  credit: string;
  dimensions: string[];
};

const EMPTY_LINE = (): DraftLine => ({
  id: crypto.randomUUID(),
  account: "",
  debit: "",
  credit: "",
  dimensions: [],
});

const SOURCE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "import", label: "Import" },
  { value: "adjustment", label: "Adjustment" },
  { value: "other", label: "Other" },
];

function money(value: number | string) {
  const amount = Number(value || 0);

  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function JournalEntriesPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [dimensions, setDimensions] = useState<FinancialDimension[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  const [selectedEngagement, setSelectedEngagement] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [postingId, setPostingId] = useState<number | null>(null);
  const [workflowForm, setWorkflowForm] = useState<{
    entry: JournalEntry;
    action: "reverse" | "return-to-draft";
  } | null>(null);
  const [workflowReason, setWorkflowReason] = useState("");
  const [reversalDate, setReversalDate] = useState("");
  const [reversalNumber, setReversalNumber] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [entryNumber, setEntryNumber] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState<JournalEntrySource>("manual");

  const [lines, setLines] = useState<DraftLine[]>([
    EMPTY_LINE(),
    EMPTY_LINE(),
  ]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const availableDimensions = dimensions.filter(
    (dimension) => dimension.engagement === Number(selectedEngagement)
  );

  /*
   * ---------------------------------------------------------
   * LOAD ENGAGEMENTS
   * ---------------------------------------------------------
   */

  useEffect(() => {
    async function loadEngagements() {
      try {
        const data = await getEngagements();
        setEngagements(data);

        if (data.length > 0) {
          setSelectedEngagement(String(data[0].id));
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load engagements."
        );
      }
    }

    loadEngagements();
  }, []);

  /*
   * ---------------------------------------------------------
   * LOAD ACCOUNTS
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!selectedEngagement) {
      setAccounts([]);
      return;
    }

    let active = true;
    getFinancialDimensions(Number(selectedEngagement)).then(
      (result) => { if (active) setDimensions(result); },
      (err: unknown) =>
        { if (active) setError(
            err instanceof Error
              ? err.message
              : "Failed to load financial dimensions."
          ); }
    );

    async function loadAccounts() {
      setLoadingAccounts(true);

      try {
        const response = await fetch(
          `${API_ORIGIN}/api/financials/chart-of-accounts/?engagement=${selectedEngagement}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${
                typeof window !== "undefined"
                  ? localStorage.getItem("audit-token") || ""
                  : ""
              }`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load accounts (${response.status}).`
          );
        }

        const data = await response.json();

        setAccounts(
          Array.isArray(data)
            ? data.filter(
                (account: Account) => account.is_active
              )
            : []
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load accounts."
        );
      } finally {
        setLoadingAccounts(false);
      }
    }

    loadAccounts();
    return () => { active = false; };
  }, [selectedEngagement]);

  /*
   * ---------------------------------------------------------
   * LOAD JOURNAL ENTRIES
   * ---------------------------------------------------------
   */

  async function loadEntries() {
    setLoading(true);
    setError("");

    try {
      const data = await getJournalEntries({
        engagement: selectedEngagement || undefined,
        status: statusFilter as JournalEntryStatus | "",
        source: sourceFilter as
          | "manual"
          | "import"
          | "adjustment"
          | "other"
          | "",
      });

      setEntries(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load journal entries."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, [selectedEngagement, statusFilter, sourceFilter]);

  /*
   * ---------------------------------------------------------
   * LINE HELPERS
   * ---------------------------------------------------------
   */

  function updateLine(
    id: string,
    field: keyof Omit<DraftLine, "id">,
    value: string
  ) {
    setLines((current) =>
      current.map((line) =>
        line.id === id
          ? {
              ...line,
              [field]: value,
              ...(field === "debit"
                ? { credit: "" }
                : {}),
              ...(field === "credit"
                ? { debit: "" }
                : {}),
            }
          : line
      )
    );
  }

  function toggleLineDimension(
    lineId: string,
    dimensionId: string,
    checked: boolean
  ) {
    setLines((current) =>
      current.map((line) =>
        line.id === lineId
          ? {
              ...line,
              dimensions: checked
                ? [...line.dimensions, dimensionId]
                : line.dimensions.filter((id) => id !== dimensionId),
            }
          : line
      )
    );
  }

  function addLine() {
    setLines((current) => [...current, EMPTY_LINE()]);
  }

  function removeLine(id: string) {
    setLines((current) => {
      if (current.length <= 2) {
        return current;
      }

      return current.filter((line) => line.id !== id);
    });
  }

  function resetForm() {
    setEditingId(null);
    setEntryNumber("");
    setTransactionDate(
      new Date().toISOString().slice(0, 10)
    );
    setReference("");
    setDescription("");
    setSource("manual");
    setLines([EMPTY_LINE(), EMPTY_LINE()]);
    setError("");
    setSuccess("");
  }

  function editDraft(entry: JournalEntry) {
    setEditingId(entry.id);
    setSelectedEngagement(String(entry.engagement));
    setEntryNumber(entry.entry_number);
    setTransactionDate(entry.transaction_date);
    setReference(entry.reference);
    setDescription(entry.description);
    setSource(entry.source);
    setLines(entry.lines.map((line) => ({
      id: crypto.randomUUID(),
      account: String(line.account),
      debit: String(line.debit),
      credit: String(line.credit),
      dimensions: (line.dimensions ?? []).map(String),
    })));
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  /*
   * ---------------------------------------------------------
   * TOTALS
   * ---------------------------------------------------------
   */

  const totalDebit = useMemo(
    () =>
      lines.reduce(
        (total, line) =>
          total + Number(line.debit || 0),
        0
      ),
    [lines]
  );

  const totalCredit = useMemo(
    () =>
      lines.reduce(
        (total, line) =>
          total + Number(line.credit || 0),
        0
      ),
    [lines]
  );

  const difference = totalDebit - totalCredit;
  const isBalanced =
    Math.abs(difference) < 0.005 &&
    lines.length >= 2;

  /*
   * ---------------------------------------------------------
   * CREATE JOURNAL ENTRY
   * ---------------------------------------------------------
   */

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedEngagement) {
      setError("Please select an engagement.");
      return;
    }

    if (!entryNumber.trim()) {
      setError("Entry number is required.");
      return;
    }

    if (!transactionDate) {
      setError("Transaction date is required.");
      return;
    }

    if (!description.trim()) {
      setError("Description is required.");
      return;
    }

    if (lines.length < 2) {
      setError(
        "A journal entry must contain at least two lines."
      );
      return;
    }

    const hasIncompleteLine = lines.some(
      (line) =>
        !line.account ||
        (Number(line.debit || 0) === 0 &&
          Number(line.credit || 0) === 0)
    );

    if (hasIncompleteLine) {
      setError(
        "Every journal line must have an account and an amount."
      );
      return;
    }

    if (!isBalanced) {
      setError(
        `Journal entry is not balanced. Difference: ${money(
          difference
        )}`
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        engagement: Number(selectedEngagement),
        entry_number: entryNumber.trim(),
        transaction_date: transactionDate,
        reference: reference.trim(),
        description: description.trim(),
        source,
        status: "draft" as const,
        lines: lines.map((line) => ({
          account: Number(line.account),
          debit: line.debit || "0.00",
          credit: line.credit || "0.00",
          dimensions: line.dimensions.map(Number),
        })),
      };

      if (editingId !== null) {
        await updateJournalEntry(editingId, payload);
      } else {
        await createJournalEntry(payload);
      }

      resetForm();
      setSuccess("Journal entry saved successfully as draft.");
      setShowForm(false);

      await loadEntries();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save journal entry."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * POST JOURNAL ENTRY
   * ---------------------------------------------------------
   */

  async function handlePost(id: number) {
    setError("");
    setSuccess("");
    setPostingId(id);

    try {
      await postJournalEntry(id);

      setSuccess(
        "Journal entry posted successfully to the General Ledger."
      );

      await loadEntries();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to post journal entry."
      );
    } finally {
      setPostingId(null);
    }
  }

  async function handleWorkflow(
    entry: JournalEntry,
    action: "submit" | "approve" | "reverse" | "return-to-draft"
  ) {
    setError("");
    setSuccess("");
    setPostingId(entry.id);
    try {
      await journalWorkflowAction(entry.id, action, {
        ...(action === "reverse" || action === "return-to-draft"
          ? { reason: workflowReason } : {}),
        ...(action === "reverse"
          ? { transaction_date: reversalDate, entry_number: reversalNumber } : {}),
      });
      setWorkflowForm(null);
      setSuccess(action === "reverse"
        ? "Linked reversal saved as draft. Review, approve if required, and post it."
        : `Journal ${action === "return-to-draft" ? "returned to draft" : action === "approve" ? "approved" : "submitted"}.`);
      await loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Journal workflow action failed.");
    } finally {
      setPostingId(null);
    }
  }

  function openWorkflow(entry: JournalEntry, action: "reverse" | "return-to-draft") {
    setWorkflowForm({ entry, action });
    setWorkflowReason("");
    setReversalDate(new Date().toISOString().slice(0, 10));
    setReversalNumber("");
    setError("");
  }

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium text-gray-500">
              Financials
            </div>

            <h1 className="mt-1 text-2xl font-semibold text-gray-900">
              Journal Entries
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Record, review, and post double-entry transactions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            New Journal Entry
          </button>
        </div>

        {/* MESSAGES */}

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

            <span>{success}</span>
          </div>
        )}

        {/* FILTERS */}

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Engagement
              </label>

              <div className="relative">
                <select
                  value={selectedEngagement}
                  onChange={(event) =>
                    setSelectedEngagement(event.target.value)
                  }
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-9 text-sm outline-none focus:border-gray-500"
                >
                  <option value="">
                    All engagements
                  </option>

                  {engagements.map((engagement) => (
                    <option
                      key={engagement.id}
                      value={engagement.id}
                    >
                      {engagement.engagement_code ||
                        `Engagement ${engagement.id}`}
                    </option>
                  ))}
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Status
              </label>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
              >
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="posted">Posted</option>
                <option value="void">Void</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Source
              </label>

              <select
                value={sourceFilter}
                onChange={(event) =>
                  setSourceFilter(event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
              >
                <option value="">All sources</option>

                {SOURCE_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* JOURNAL ENTRIES TABLE */}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-gray-900">
                Journal Entries
              </h2>

              <p className="mt-0.5 text-sm text-gray-500">
                {entries.length} entries
              </p>
            </div>

            <button
              type="button"
              onClick={loadEntries}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading journal entries...
            </div>
          ) : entries.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-medium text-gray-900">
                No journal entries found
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Create your first journal entry to begin.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 font-medium text-gray-600">
                      Entry
                    </th>

                    <th className="px-5 py-3 font-medium text-gray-600">
                      Date
                    </th>

                    <th className="px-5 py-3 font-medium text-gray-600">
                      Description
                    </th>

                    <th className="px-5 py-3 text-right font-medium text-gray-600">
                      Debit
                    </th>

                    <th className="px-5 py-3 text-right font-medium text-gray-600">
                      Credit
                    </th>

                    <th className="px-5 py-3 font-medium text-gray-600">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right font-medium text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-900">
                          {entry.entry_number}
                        </div>

                        {entry.reference && (
                          <div className="mt-0.5 text-xs text-gray-500">
                            {entry.reference}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {entry.transaction_date}
                      </td>

                      <td className="max-w-[300px] px-5 py-4">
                        <div className="truncate text-gray-900">
                          {entry.description}
                        </div>

                        <div className="mt-1 text-xs text-gray-500">
                          {entry.line_count} lines
                          {entry.reversal_of && ` | Reverses #${entry.reversal_of}`}
                          {entry.reversal_id && ` | Reversal #${entry.reversal_id}`}
                          {entry.requires_approval && " | Independent approval required"}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right font-medium text-gray-900">
                        {money(entry.total_debit)}
                      </td>

                      <td className="px-5 py-4 text-right font-medium text-gray-900">
                        {money(entry.total_credit)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            entry.status === "posted"
                              ? "bg-green-100 text-green-700"
                              : entry.status === "void"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {entry.status === "posted"
                            ? "Posted"
                            : entry.status === "void"
                            ? "Void"
                            : entry.status === "submitted"
                            ? "Submitted"
                            : entry.status === "approved"
                            ? "Approved"
                            : "Draft"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {(entry.status === "approved" ||
                          (entry.status === "draft" && !entry.requires_approval)) && (
                          <button
                            type="button"
                            onClick={() =>
                              handlePost(entry.id)
                            }
                            disabled={postingId === entry.id}
                            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                          >
                            {postingId === entry.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}

                            Post
                          </button>
                        )}

                        {entry.status === "draft" && !entry.source_document && (
                          <button type="button" disabled={postingId !== null}
                            onClick={() => editDraft(entry)}
                            className="ml-2 rounded-lg border px-3 py-2 text-xs">
                            Edit
                          </button>
                        )}
                        {entry.status === "draft" && (
                          <button type="button" disabled={postingId !== null}
                            onClick={() => void handleWorkflow(entry, "submit")}
                            className="ml-2 rounded-lg border px-3 py-2 text-xs">
                            Submit
                          </button>
                        )}
                        {entry.can_approve && (
                          <button type="button" disabled={postingId !== null}
                            onClick={() => void handleWorkflow(entry, "approve")}
                            className="ml-2 rounded-lg border px-3 py-2 text-xs">
                            Approve
                          </button>
                        )}
                        {entry.can_manage && ["submitted", "approved"].includes(entry.status) && (
                          <button type="button" disabled={postingId !== null}
                            onClick={() => openWorkflow(entry, "return-to-draft")}
                            className="ml-2 rounded-lg border px-3 py-2 text-xs">
                            Return to draft
                          </button>
                        )}
                        {entry.status === "posted" && !entry.source_document && !entry.reversal_of && !entry.reversal_id && (
                          <button type="button" disabled={postingId !== null}
                            onClick={() => openWorkflow(entry, "reverse")}
                            className="ml-2 rounded-lg border px-3 py-2 text-xs">
                            Reverse
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* CREATE FORM */}

        {workflowForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <form className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl"
              onSubmit={(event) => {
                event.preventDefault();
                void handleWorkflow(workflowForm.entry, workflowForm.action);
              }}>
              <h2 className="font-semibold">
                {workflowForm.action === "reverse" ? "Reverse journal" : "Return to draft"}
                {" "}{workflowForm.entry.entry_number}
              </h2>
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              {workflowForm.action === "reverse" && <>
                <p className="text-sm text-slate-600">
                  The original remains posted. A linked opposite journal will be saved as draft.
                </p>
                <label className="block text-sm">Reversal entry number
                  <input className="mt-1 w-full rounded-lg border p-2" required maxLength={50}
                    value={reversalNumber} onChange={(event) => setReversalNumber(event.target.value)} />
                </label>
                <label className="block text-sm">Reversal date
                  <input className="mt-1 w-full rounded-lg border p-2" type="date" required
                    min={workflowForm.entry.transaction_date} value={reversalDate}
                    onChange={(event) => setReversalDate(event.target.value)} />
                </label>
              </>}
              <label className="block text-sm">Reason
                <input className="mt-1 w-full rounded-lg border p-2" required maxLength={400}
                  value={workflowReason} onChange={(event) => setWorkflowReason(event.target.value)} />
              </label>
              <div className="flex gap-3">
                <button disabled={postingId !== null}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">
                  {postingId !== null ? "Saving..." : "Confirm"}
                </button>
                <button type="button" disabled={postingId !== null}
                  onClick={() => setWorkflowForm(null)} className="rounded-lg border px-4 py-2 text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
              {/* MODAL HEADER */}

              <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {editingId !== null ? "Edit Draft Journal" : "New Journal Entry"}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Create a balanced double-entry transaction.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="flex min-h-0 flex-1 flex-col"
              >
                {/* MODAL BODY */}

                <div className="min-h-0 flex-1 overflow-y-auto p-6">
                  <div className="space-y-6">
                    {/* BASIC INFORMATION */}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Engagement
                        </label>

                        <select
                          value={selectedEngagement}
                          onChange={(event) =>
                            setSelectedEngagement(
                              event.target.value
                            )
                          }
                          required
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
                        >
                          <option value="">
                            Select engagement
                          </option>

                          {engagements.map((engagement) => (
                            <option
                              key={engagement.id}
                              value={engagement.id}
                            >
                              {engagement.engagement_code ||
                                `Engagement ${engagement.id}`}
                              {" — "}
                              {engagement.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Entry Number
                        </label>

                        <input
                          value={entryNumber}
                          onChange={(event) =>
                            setEntryNumber(event.target.value)
                          }
                          placeholder="e.g. JE-001"
                          required
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Transaction Date
                        </label>

                        <input
                          type="date"
                          value={transactionDate}
                          onChange={(event) =>
                            setTransactionDate(
                              event.target.value
                            )
                          }
                          required
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Source
                        </label>

                        <select
                          value={source}
                          onChange={(event) =>
                            setSource(
                              event.target
                                .value as JournalEntrySource
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
                        >
                          {SOURCE_OPTIONS.map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* REFERENCE + DESCRIPTION */}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Reference
                        </label>

                        <input
                          value={reference}
                          onChange={(event) =>
                            setReference(event.target.value)
                          }
                          placeholder="Optional reference"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Description
                        </label>

                        <input
                          value={description}
                          onChange={(event) =>
                            setDescription(event.target.value)
                          }
                          placeholder="Describe the transaction"
                          required
                          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                        />
                      </div>
                    </div>

                    {/* JOURNAL LINES */}

                    <div className="rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Journal Lines
                          </h3>

                          <p className="text-xs text-gray-500">
                            Each line must contain either a debit or
                            a credit.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={addLine}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Plus className="h-4 w-4" />
                          Add Line
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full                         min-w-[1000px] text-sm">
                          <thead className="border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left font-medium text-gray-600">
                                Account
                              </th>

                              <th className="w-48 px-4 py-3 text-right font-medium text-gray-600">
                                Debit
                              </th>

                              <th className="w-48 px-4 py-3 text-right font-medium text-gray-600">
                                Credit
                              </th>

                              <th className="w-16 px-4 py-3" />
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-gray-100">
                            {lines.map((line) => (
                              <tr key={line.id}>
                                <td className="px-4 py-3">
                                  <select
                                    value={line.account}
                                    onChange={(event) =>
                                      updateLine(
                                        line.id,
                                        "account",
                                        event.target.value
                                      )
                                    }
                                    disabled={loadingAccounts}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
                                  >
                                    <option value="">
                                      {loadingAccounts
                                        ? "Loading accounts..."
                                        : "Select account"}
                                    </option>

                                    {accounts.map(
                                      (account) => (
                                        <option
                                          key={account.id}
                                          value={account.id}
                                        >
                                          {account.account_code}
                                          {" — "}
                                          {account.account_name}
                                        </option>
                                      )
                                    )}
                                  </select>
                                  {availableDimensions.length > 0 && (
                                    <fieldset className="mt-2 rounded border border-gray-200 p-2">
                                      <legend className="px-1 text-[11px] text-gray-500">Dimensions</legend>
                                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                                        {availableDimensions.map((dimension) => (
                                          <label key={dimension.id} className="flex items-center gap-1 text-[11px] text-gray-600">
                                            <input
                                              type="checkbox"
                                              checked={line.dimensions.includes(String(dimension.id))}
                                              onChange={(event) => toggleLineDimension(
                                                line.id,
                                                String(dimension.id),
                                                event.target.checked
                                              )}
                                            />
                                            {dimension.dimension_type}: {dimension.name}
                                          </label>
                                        ))}
                                      </div>
                                    </fieldset>
                                  )}
                                </td>

                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={line.debit}
                                    onChange={(event) =>
                                      updateLine(
                                        line.id,
                                        "debit",
                                        event.target.value
                                      )
                                    }
                                    placeholder="0.00"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-right text-sm"
                                  />
                                </td>

                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={line.credit}
                                    onChange={(event) =>
                                      updateLine(
                                        line.id,
                                        "credit",
                                        event.target.value
                                      )
                                    }
                                    placeholder="0.00"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-right text-sm"
                                  />
                                </td>

                                <td className="px-4 py-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeLine(line.id)
                                    }
                                    disabled={lines.length <= 2}
                                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                                    title="Remove line"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>

                          <tfoot className="border-t border-gray-200 bg-gray-50">
                            <tr>
                              <td className="px-4 py-4 text-right font-semibold text-gray-900">
                                Totals
                              </td>

                              <td className="px-4 py-4 text-right font-semibold text-gray-900">
                                {money(totalDebit)}
                              </td>

                              <td className="px-4 py-4 text-right font-semibold text-gray-900">
                                {money(totalCredit)}
                              </td>

                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* BALANCE STATUS */}

                    <div
                      className={`flex items-center justify-between rounded-xl border px-4 py-4 ${
                        isBalanced
                          ? "border-green-200 bg-green-50"
                          : "border-red-200 bg-red-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isBalanced ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}

                        <div>
                          <div
                            className={`font-semibold ${
                              isBalanced
                                ? "text-green-800"
                                : "text-red-800"
                            }`}
                          >
                            {isBalanced
                              ? "Journal is balanced"
                              : "Journal is not balanced"}
                          </div>

                          <div className="text-sm text-gray-600">
                            Difference:{" "}
                            <span className="font-medium">
                              {money(difference)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right text-sm">
                        <div className="text-gray-500">
                          Debit
                        </div>

                        <div className="font-semibold text-gray-900">
                          {money(totalDebit)}
                        </div>
                      </div>

                      <div className="text-right text-sm">
                        <div className="text-gray-500">
                          Credit
                        </div>

                        <div className="font-semibold text-gray-900">
                          {money(totalCredit)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FORM ACTIONS */}

                <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving || !isBalanced}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}

                    Save Draft
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
