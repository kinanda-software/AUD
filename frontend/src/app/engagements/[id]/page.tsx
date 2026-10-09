"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { FileDown, Forward, Loader2 } from "lucide-react";

import {
  getEngagement,
  rollForwardEngagement,
  type Engagement,
} from "@/lib/api";
import {
  downloadEngagementSummaryPdf,
  downloadManagementLetterPdf,
} from "@/lib/reportExport";

export default function EngagementPage() {
  const params = useParams();

  const engagementId = params.id as string;

  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const [rollForm, setRollForm] = useState({
    engagement_code: "",
    title: "",
    start_date: "",
    planned_end_date: "",
    financial_year_end: "",
  });
  const [rolling, setRolling] = useState(false);
  const [rolledTo, setRolledTo] = useState<Engagement | null>(null);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getEngagement(engagementId);
        if (active) setEngagement(data);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load engagement."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    if (engagementId) void load();
    return () => {
      active = false;
    };
  }, [engagementId]);

  async function handleExport() {
    if (!engagement) return;
    setExporting(true);
    setError("");
    try {
      await downloadEngagementSummaryPdf(
        engagement.id,
        engagement.engagement_code
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Summary export failed."
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleLetterExport() {
    if (!engagement) return;
    setExporting(true);
    setError("");
    try {
      await downloadManagementLetterPdf(
        engagement.id,
        engagement.engagement_code
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Management letter export failed."
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleRollForward(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!engagement) return;
    setRolling(true);
    setError("");
    setSuccess("");
    setRolledTo(null);
    try {
      const created = await rollForwardEngagement(engagement.id, {
        engagement_code: rollForm.engagement_code.trim(),
        title: rollForm.title.trim() || undefined,
        start_date: rollForm.start_date,
        planned_end_date: rollForm.planned_end_date || undefined,
        financial_year_end: rollForm.financial_year_end || undefined,
      });
      setRolledTo(created);
      setSuccess(
        `Rolled forward to ${created.engagement_code}. Team, chart of accounts, and blank checklists carried over.`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Roll-forward failed."
      );
    } finally {
      setRolling(false);
    }
  }

  return (
    <div className="w-full bg-gray-50 p-8">
      <div className="w-full">
        <h1 className="text-2xl font-bold text-gray-900">
          Engagement
        </h1>

        {loading ? (
          <p role="status" className="mt-2 flex items-center gap-2 text-gray-600">
            <Loader2 size={16} className="animate-spin" /> Loading engagement...
          </p>
        ) : (
          <p className="mt-2 text-gray-600">
            {engagement
              ? `${engagement.engagement_code} — ${engagement.title}`
              : `Engagement ID: ${engagementId}`}
          </p>
        )}

        {error && (
          <div role="alert" className="mt-4 max-w-xl rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {engagement && (
          <div className="mt-6 max-w-xl rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">
              Engagement summary export
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Exports an internal PDF summary covering engagement details,
              team, scheduled audits, non-conformances, checklist scores,
              and the evidence register. It is a working summary — not an
              auditor&apos;s report and not an audit opinion.
            </p>
            <button
              type="button"
              disabled={exporting}
              onClick={handleExport}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FileDown size={16} />
              )}
              Export summary PDF
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={handleLetterExport}
              className="ml-3 mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <FileDown size={16} />
              Management letter PDF
            </button>
          </div>
        )}

        {success && (
          <div role="status" className="mt-4 max-w-xl rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
            {rolledTo && (
              <Link
                href={`/engagements/${rolledTo.id}`}
                className="ml-2 font-semibold underline"
              >
                Open new engagement
              </Link>
            )}
          </div>
        )}

        {engagement && (
          <form
            onSubmit={handleRollForward}
            className="mt-6 max-w-xl rounded-2xl border border-slate-200 bg-white p-5"
          >
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Forward size={15} /> Roll forward to a new period
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Creates a new engagement for this client and carries over the
              audit team, chart of accounts, and blank checklist instances.
              Prior answers and workpaper data are not copied.
            </p>
            <fieldset disabled={rolling} className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-700">
                New engagement code
                <input
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm"
                  value={rollForm.engagement_code}
                  onChange={(event) =>
                    setRollForm({ ...rollForm, engagement_code: event.target.value })
                  }
                  placeholder={`${engagement.engagement_code}-NEXT`}
                />
              </label>
              <label className="text-xs font-medium text-slate-700">
                Title (optional)
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm"
                  value={rollForm.title}
                  onChange={(event) =>
                    setRollForm({ ...rollForm, title: event.target.value })
                  }
                  placeholder={`${engagement.title} (rolled forward)`}
                />
              </label>
              <label className="text-xs font-medium text-slate-700">
                Start date
                <input
                  required
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm"
                  value={rollForm.start_date}
                  onChange={(event) =>
                    setRollForm({ ...rollForm, start_date: event.target.value })
                  }
                />
              </label>
              <label className="text-xs font-medium text-slate-700">
                Financial year end
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm"
                  value={rollForm.financial_year_end}
                  onChange={(event) =>
                    setRollForm({ ...rollForm, financial_year_end: event.target.value })
                  }
                />
              </label>
              <label className="text-xs font-medium text-slate-700 sm:col-span-2">
                Planned end date
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm"
                  value={rollForm.planned_end_date}
                  onChange={(event) =>
                    setRollForm({ ...rollForm, planned_end_date: event.target.value })
                  }
                />
              </label>
            </fieldset>
            <button
              type="submit"
              disabled={rolling}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
            >
              {rolling ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Forward size={16} />
              )}
              Roll forward engagement
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
