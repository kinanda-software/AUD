import Link from "next/link";
import { RefreshCw } from "lucide-react";

export function RecordsRefresh({ loading, onRefresh }: { loading: boolean; onRefresh: () => void }) {
  return (
    <button type="button" disabled={loading} onClick={onRefresh} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
      <RefreshCw size={16} aria-hidden="true" className={loading ? "animate-spin" : ""} />
      {loading ? "Loading..." : "Refresh"}
    </button>
  );
}

export function RecordsStatus({ loading, error, hasData, retrievedAt, returnPath }: {
  loading: boolean;
  error: string;
  hasData: boolean;
  retrievedAt: Date | null;
  returnPath: string;
}) {
  return (
    <>
      {retrievedAt && <p className="text-xs text-slate-600">Retrieved {retrievedAt.toLocaleString("en-GB")} / Records returned by your account&apos;s API access</p>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
        {error} {hasData && "Previously retrieved records remain visible and may be out of date."}
        <Link href={`/login?next=${encodeURIComponent(returnPath)}`} className="ml-2 font-semibold underline">Sign in</Link>
      </div>}
      {loading && !hasData && <p role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Retrieving audit records...</p>}
    </>
  );
}
