"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  BarChart3,
  Dices,
  Hourglass,
  Layers,
  Loader2,
  Play,
  Trash2,
} from "lucide-react";

import { getEngagements, type Engagement } from "@/lib/api";
import {
  deleteSample,
  drawSample,
  getAging,
  getBenfordAnalysis,
  getSamples,
  getStratification,
  type AgingResult,
  type BenfordResult,
  type SampleSelection,
  type StratificationResult,
} from "@/lib/analysis";

type Tab = "benford" | "stratification" | "aging" | "sampling";

const TABS: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
  { key: "benford", label: "Benford's Law", icon: BarChart3 },
  { key: "stratification", label: "Stratification", icon: Layers },
  { key: "aging", label: "Aging (AR / AP)", icon: Hourglass },
  { key: "sampling", label: "Audit Sampling", icon: Dices },
];

function money(value: number | string) {
  return Number(value).toLocaleString("en-TZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function AuditAnalyticsPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [engagementId, setEngagementId] = useState("");
  const [tab, setTab] = useState<Tab>("benford");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const [benford, setBenford] = useState<BenfordResult | null>(null);
  const [stratification, setStratification] =
    useState<StratificationResult | null>(null);
  const [aging, setAging] = useState<AgingResult | null>(null);
  const [agingSide, setAgingSide] = useState<"receivable" | "payable">(
    "receivable"
  );
  const [samples, setSamples] = useState<SampleSelection[]>([]);
  const [openSample, setOpenSample] = useState<SampleSelection | null>(null);
  const [sampleForm, setSampleForm] = useState({
    name: "",
    method: "random",
    sample_size: "10",
    seed: "",
  });

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getEngagements();
        if (active) setEngagements(data);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Could not load engagements."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!engagementId) {
      return;
    }
    let active = true;
    getSamples(Number(engagementId))
      .then((data) => {
        if (active) setSamples(data);
      })
      .catch(() => {
        if (active) setSamples([]);
      });
    return () => {
      active = false;
    };
  }, [engagementId]);

  function resetResults() {
    setBenford(null);
    setStratification(null);
    setAging(null);
    setOpenSample(null);
  }

  async function runBenford() {
    if (!engagementId) return;
    setRunning(true);
    setError("");
    try {
      setBenford(await getBenfordAnalysis(Number(engagementId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Benford analysis failed.");
    } finally {
      setRunning(false);
    }
  }

  async function runStratification() {
    if (!engagementId) return;
    setRunning(true);
    setError("");
    try {
      setStratification(await getStratification(Number(engagementId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stratification failed.");
    } finally {
      setRunning(false);
    }
  }

  async function runAging() {
    if (!engagementId) return;
    setRunning(true);
    setError("");
    try {
      setAging(await getAging(Number(engagementId), agingSide));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aging analysis failed.");
    } finally {
      setRunning(false);
    }
  }

  async function runSample(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!engagementId) return;
    setRunning(true);
    setError("");
    try {
      const created = await drawSample({
        engagement: Number(engagementId),
        name: sampleForm.name,
        method: sampleForm.method as SampleSelection["method"],
        sample_size: Number(sampleForm.sample_size),
        seed: sampleForm.seed ? Number(sampleForm.seed) : undefined,
      });
      setSamples((current) => [created, ...current]);
      setOpenSample(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sampling failed.");
    } finally {
      setRunning(false);
    }
  }

  async function handleDeleteSample(id: number) {
    if (!window.confirm("Delete this documented sample?")) return;
    setError("");
    try {
      await deleteSample(id);
      setSamples((current) => current.filter((item) => item.id !== id));
      if (openSample?.id === id) setOpenSample(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm";

  const maxDigitPercent = benford
    ? Math.max(...benford.digits.map((d) => d.observed_percent), 32)
    : 32;

  return (
    <div className="w-full px-6 py-8">
      <Link href="/financials/trial-balance" className="text-sm text-blue-700">
        Back to Financials
      </Link>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">
        Audit Analytics
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Full-population tests over posted financial records: Benford
        first-digit screening, amount stratification, receivable/payable
        aging, and reproducible audit sampling. All analyses are read-only.
      </p>

      <div className="my-6 flex flex-wrap items-end gap-4">
        <label className="text-sm font-medium">
          Engagement
          <select
            className={inputClass}
            value={engagementId}
            onChange={(event) => {
              setEngagementId(event.target.value);
              resetResults();
            }}
          >
            <option value="">Select an engagement</option>
            {engagements.map((item) => (
              <option key={item.id} value={item.id}>
                {item.engagement_code} — {item.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div role="alert" className="my-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p role="status" className="mt-6 flex items-center gap-2 text-sm">
          <Loader2 className="animate-spin" /> Loading...
        </p>
      ) : !engagementId ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
          Select an engagement to run analytics over its posted records.
        </p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ${
                  tab === key
                    ? "border-blue-600 bg-blue-50 text-blue-800"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          {tab === "benford" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Benford&apos;s Law — first digits</h2>
                <button
                  type="button"
                  disabled={running}
                  onClick={runBenford}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  Run analysis
                </button>
              </div>
              {benford && (
                <>
                  <p className="mt-2 text-sm text-slate-600">
                    Population: <strong>{benford.population}</strong> posted
                    entries · Chi-square: <strong>{benford.chi_square}</strong> ·
                    MAD: <strong>{benford.mad}</strong>
                  </p>
                  <p className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-medium text-blue-900">
                    {benford.verdict}
                  </p>
                  <div className="mt-5 space-y-2">
                    {benford.digits.map((digit) => (
                      <div key={digit.digit} className="flex items-center gap-3 text-xs">
                        <span className="w-4 text-right font-bold">{digit.digit}</span>
                        <div className="relative h-6 flex-1">
                          <div
                            className="absolute inset-y-0 left-0 rounded bg-blue-600/80"
                            style={{
                              width: `${(digit.observed_percent / maxDigitPercent) * 100}%`,
                            }}
                            title={`Observed ${digit.observed_percent}%`}
                          />
                          <div
                            className="absolute inset-y-0 w-0.5 bg-red-500"
                            style={{
                              left: `${(digit.expected_percent / maxDigitPercent) * 100}%`,
                            }}
                            title={`Expected ${digit.expected_percent}%`}
                          />
                        </div>
                        <span className="w-40 text-slate-600">
                          {digit.count} · {digit.observed_percent}% (exp.{" "}
                          {digit.expected_percent}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          {tab === "stratification" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Population stratification</h2>
                <button
                  type="button"
                  disabled={running}
                  onClick={runStratification}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  Run analysis
                </button>
              </div>
              {stratification && (
                <>
                  <p className="mt-2 text-sm text-slate-600">
                    Population: <strong>{stratification.population_count}</strong>{" "}
                    entries worth <strong>{money(stratification.population_value)}</strong>{" "}
                    · Top 10 entries hold{" "}
                    <strong>{stratification.top_10_concentration_percent}%</strong>{" "}
                    of total value.
                  </p>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-700">
                        <tr>
                          {["Band", "Entries", "% of count", "Value", "% of value"].map(
                            (title) => (
                              <th key={title} className="px-4 py-2">{title}</th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stratification.bands.map((band) => (
                          <tr key={band.label}>
                            <td className="px-4 py-2 font-medium">{band.label}</td>
                            <td className="px-4 py-2">{band.count}</td>
                            <td className="px-4 py-2">{band.percent_of_count}%</td>
                            <td className="px-4 py-2">{money(band.total)}</td>
                            <td className="px-4 py-2 font-semibold text-blue-800">
                              {band.percent_of_value}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <h3 className="mt-5 text-sm font-semibold">Largest entries</h3>
                  <ul className="mt-2 divide-y divide-slate-100 text-sm">
                    {stratification.top_10.map((entry) => (
                      <li key={entry.id} className="flex justify-between gap-3 py-2">
                        <span>
                          <span className="font-mono text-xs">{entry.account_code}</span>{" "}
                          {entry.description || entry.reference || `#${entry.id}`}
                          <span className="ml-2 text-xs text-slate-500">
                            {entry.transaction_date}
                          </span>
                        </span>
                        <span className="font-semibold">{money(entry.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          {tab === "aging" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Outstanding aging</h2>
                <div className="flex items-center gap-3">
                  <select
                    className="rounded-lg border border-slate-300 bg-white p-2.5 text-sm"
                    value={agingSide}
                    onChange={(event) => {
                      setAgingSide(event.target.value as "receivable" | "payable");
                      setAging(null);
                    }}
                  >
                    <option value="receivable">Receivables</option>
                    <option value="payable">Payables</option>
                  </select>
                  <button
                    type="button"
                    disabled={running}
                    onClick={runAging}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                    Run analysis
                  </button>
                </div>
              </div>
              {aging && (
                <>
                  <p className="mt-2 text-sm text-slate-600">
                    Total outstanding {aging.side}:{" "}
                    <strong>{money(aging.total_outstanding)}</strong> as of{" "}
                    {aging.as_of}.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-5">
                    {aging.buckets.map((bucket) => (
                      <div
                        key={bucket.key}
                        className={`rounded-xl border p-3 text-center ${
                          bucket.key === "over_90" && bucket.total > 0
                            ? "border-red-200 bg-red-50"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <p className="text-xs text-slate-600">{bucket.label}</p>
                        <p className="mt-1 text-lg font-bold">
                          {money(bucket.total)}
                        </p>
                        <p className="text-xs text-slate-500">{bucket.percent}%</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-700">
                        <tr>
                          {["Document", "Contact", "Due date", "Days overdue", "Outstanding"].map(
                            (title) => (
                              <th key={title} className="px-4 py-2">{title}</th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {aging.documents.map((doc) => (
                          <tr key={doc.document_id}>
                            <td className="px-4 py-2 font-medium">{doc.number}</td>
                            <td className="px-4 py-2">{doc.contact}</td>
                            <td className="px-4 py-2">{doc.due_date}</td>
                            <td className="px-4 py-2">
                              {doc.days_overdue > 0 ? (
                                <span className={doc.days_overdue > 90 ? "font-semibold text-red-700" : ""}>
                                  {doc.days_overdue}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-2 font-semibold">
                              {money(doc.outstanding)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!aging.documents.length && (
                      <p className="p-4 text-center text-sm text-slate-600">
                        No outstanding documents for this side.
                      </p>
                    )}
                  </div>
                </>
              )}
            </section>
          )}

          {tab === "sampling" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold">Draw a documented sample</h2>
              <form onSubmit={runSample} className="mt-4 grid gap-4 md:grid-cols-4">
                <label className="text-sm font-medium md:col-span-2">
                  Sample name
                  <input
                    required
                    className={inputClass}
                    value={sampleForm.name}
                    onChange={(event) =>
                      setSampleForm({ ...sampleForm, name: event.target.value })
                    }
                    placeholder="e.g. Revenue postings sample Q3"
                  />
                </label>
                <label className="text-sm font-medium">
                  Method
                  <select
                    className={inputClass}
                    value={sampleForm.method}
                    onChange={(event) =>
                      setSampleForm({ ...sampleForm, method: event.target.value })
                    }
                  >
                    <option value="random">Random</option>
                    <option value="systematic">Systematic</option>
                    <option value="mus">Monetary-unit (MUS)</option>
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Sample size
                  <input
                    required
                    type="number"
                    min="1"
                    className={inputClass}
                    value={sampleForm.sample_size}
                    onChange={(event) =>
                      setSampleForm({ ...sampleForm, sample_size: event.target.value })
                    }
                  />
                </label>
                <label className="text-sm font-medium">
                  Seed (optional — reuse to reproduce)
                  <input
                    type="number"
                    className={inputClass}
                    value={sampleForm.seed}
                    onChange={(event) =>
                      setSampleForm({ ...sampleForm, seed: event.target.value })
                  }
                  />
                </label>
                <div className="flex items-end md:col-span-3">
                  <button
                    type="submit"
                    disabled={running}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {running ? <Loader2 size={16} className="animate-spin" /> : <Dices size={16} />}
                    Draw sample
                  </button>
                </div>
              </form>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold">Documented samples</h3>
                  <ul className="mt-2 divide-y divide-slate-100">
                    {samples.map((sample) => (
                      <li
                        key={sample.id}
                        className="flex items-center justify-between gap-3 py-2 text-sm"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenSample(sample)}
                          className="text-left font-medium text-blue-800 hover:underline"
                        >
                          {sample.name}
                          <span className="block text-xs font-normal text-slate-500">
                            {sample.method_label} · {sample.sample_size} of{" "}
                            {sample.population_size} · seed {sample.seed}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSample(sample.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </li>
                    ))}
                    {!samples.length && (
                      <li className="py-3 text-sm text-slate-500">
                        No samples drawn yet for this engagement.
                      </li>
                    )}
                  </ul>
                </div>
                {openSample && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold">
                      {openSample.name} — {openSample.sample_size} items
                      {openSample.interval && ` · interval ${money(openSample.interval)}`}
                    </h3>
                    <ul className="mt-2 max-h-96 space-y-1 overflow-y-auto text-xs">
                      {openSample.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex justify-between gap-2 rounded bg-white p-2"
                        >
                          <span>
                            <span className="font-mono">{item.account_code}</span>{" "}
                            {item.description || item.reference || `#${item.id}`}
                            <span className="ml-1 text-slate-500">
                              {item.transaction_date}
                            </span>
                          </span>
                          <span className="font-semibold">{money(item.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
