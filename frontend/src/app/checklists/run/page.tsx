"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  Loader2,
  Save,
} from "lucide-react";

import { getEngagements, type Engagement } from "@/lib/api";
import {
  createEngagementChecklist,
  getChecklistResponses,
  getChecklistTemplates,
  getEngagementChecklists,
  saveChecklistResponses,
  type ChecklistResponseRecord,
  type ChecklistTemplate,
  type EngagementChecklist,
  type ResponseEntry,
} from "@/lib/checklists";

function ChecklistRunner() {
  const searchParams = useSearchParams();
  const presetTemplate = searchParams.get("template") ?? "";

  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [checklists, setChecklists] = useState<EngagementChecklist[]>([]);
  const [checklist, setChecklist] = useState<EngagementChecklist | null>(null);
  const [responses, setResponses] = useState<ChecklistResponseRecord[]>([]);
  const [draft, setDraft] = useState<Record<number, ResponseEntry>>({});

  const [engagementId, setEngagementId] = useState("");
  const [templateId, setTemplateId] = useState(presetTemplate);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function load() {
      await Promise.resolve();
      setLoading(true);
      setError("");
      try {
        const [engagementData, templateData] = await Promise.all([
          getEngagements(),
          getChecklistTemplates(),
        ]);
        setEngagements(engagementData);
        setTemplates(templateData.filter((item) => item.is_active));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load data.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  useEffect(() => {
    if (!engagementId) return;
    let active = true;
    getEngagementChecklists(Number(engagementId))
      .then((data) => {
        if (active) setChecklists(data);
      })
      .catch(() => {
        if (active) setChecklists([]);
      });
    return () => {
      active = false;
    };
  }, [engagementId]);

  async function openChecklist(record: EngagementChecklist) {
    setError("");
    setSuccess("");
    try {
      const data = await getChecklistResponses(record.id);
      setChecklist(record);
      setResponses(data);
      const initial: Record<number, ResponseEntry> = {};
      for (const response of data) {
        initial[response.item] = {
          item: response.item,
          value: response.value,
          rating: response.rating,
          text_value: response.text_value,
          comment: response.comment,
        };
      }
      setDraft(initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open checklist.");
    }
  }

  async function handleStart() {
    if (!engagementId || !templateId) {
      setError("Select an engagement and a template first.");
      return;
    }
    setStarting(true);
    setError("");
    try {
      const template = templates.find(
        (item) => String(item.id) === templateId
      );
      const record = await createEngagementChecklist({
        engagement: Number(engagementId),
        template: Number(templateId),
        name: template?.name,
      });
      setChecklists((current) => [record, ...current]);
      await openChecklist(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the checklist.");
    } finally {
      setStarting(false);
    }
  }

  function isVisible(response: ChecklistResponseRecord) {
    if (!response.parent) return true;
    const parentAnswer = (
      draft[response.parent]?.value ?? ""
    ).toLowerCase();
    if (!response.condition_value) return Boolean(parentAnswer);
    return parentAnswer === response.condition_value.toLowerCase();
  }

  const visibleResponses = useMemo(
    () => responses.filter(isVisible),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [responses, draft]
  );

  async function handleSave(complete: boolean) {
    if (!checklist) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await saveChecklistResponses(
        checklist.id,
        Object.values(draft),
        complete
      );
      setChecklist(updated);
      setSuccess(
        complete
          ? `Checklist completed. Score: ${
              updated.score.percent !== null
                ? `${updated.score.percent}% (${updated.score.rating})`
                : "not scored"
            }.`
          : "Responses saved."
      );
      if (engagementId) {
        setChecklists(
          await getEngagementChecklists(Number(engagementId))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function updateDraft(item: number, patch: Partial<ResponseEntry>) {
    setDraft((current) => ({
      ...current,
      [item]: { ...current[item], item, ...patch },
    }));
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm";

  function renderAnswer(response: ChecklistResponseRecord) {
    const entry = draft[response.item] ?? { item: response.item };
    const type = response.response_type;

    if (type === "yes_no" || type === "yes_no_na") {
      const options = type === "yes_no" ? ["yes", "no"] : ["yes", "no", "na"];
      return (
        <div className="mt-2 flex gap-2">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => updateDraft(response.item, { value: option })}
              className={`rounded-lg border px-4 py-1.5 text-sm font-semibold capitalize ${
                entry.value === option
                  ? option === "yes"
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : option === "no"
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-slate-600 bg-slate-600 text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {option === "na" ? "N/A" : option}
            </button>
          ))}
        </div>
      );
    }

    if (type === "rating") {
      return (
        <div className="mt-2 flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => updateDraft(response.item, { rating: value })}
              className={`h-9 w-9 rounded-lg border text-sm font-bold ${
                entry.rating === value
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      );
    }

    return (
      <input
        type={type === "number" ? "number" : "text"}
        className={inputClass}
        value={entry.text_value ?? ""}
        onChange={(event) =>
          updateDraft(response.item, { text_value: event.target.value })
        }
      />
    );
  }

  const score = checklist?.score;

  return (
    <div className="w-full px-6 py-8">
      <Link href="/checklists" className="text-sm text-blue-700">
        Back to Checklist Library
      </Link>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">
        Run Checklist
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Instantiate a template on an engagement, record responses, and
        compute the weighted compliance score and rating.
      </p>

      {error && (
        <div role="alert" className="my-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="my-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {loading ? (
        <p role="status" className="mt-6 flex items-center gap-2 text-sm">
          <Loader2 className="animate-spin" /> Loading...
        </p>
      ) : (
        <>
          <div className="my-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-3">
            <label className="text-sm font-medium">
              Engagement
              <select
                className={inputClass}
                value={engagementId}
                onChange={(event) => {
                  setEngagementId(event.target.value);
                  setChecklist(null);
                  setChecklists([]);
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
            <label className="text-sm font-medium">
              Template
              <select
                className={inputClass}
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
              >
                <option value="">Select a template</option>
                {templates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.item_count} questions)
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                disabled={starting || !engagementId || !templateId}
                onClick={handleStart}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {starting && <Loader2 size={16} className="animate-spin" />}
                Start checklist
              </button>
            </div>
          </div>

          {engagementId && checklists.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {checklists.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openChecklist(item)}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                    checklist?.id === item.id
                      ? "border-blue-600 bg-blue-50 text-blue-800"
                      : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {item.name} · {item.status.replace("_", " ")}
                  {item.score.percent !== null &&
                    ` · ${item.score.percent}%`}
                </button>
              ))}
            </div>
          )}

          {checklist && (
            <>
              {score && (
                <div className="mb-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                      <Award size={16} /> Compliance score
                    </p>
                    <p className="mt-2 text-3xl font-bold">
                      {score.percent !== null ? `${score.percent}%` : "—"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-600">Rating</p>
                    <p className="mt-2 text-2xl font-bold text-blue-800">
                      {score.rating}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-600">Answered</p>
                    <p className="mt-2 text-3xl font-bold">
                      {score.answered}
                      <span className="text-base font-normal text-slate-500">
                        {" "}/ {score.total_questions}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {visibleResponses.map((response, index) => (
                  <div
                    key={response.id}
                    className={`rounded-2xl border border-slate-200 bg-white p-5 ${
                      response.parent ? "ml-8 border-l-4 border-l-blue-200" : ""
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {index + 1}. {response.question}
                      {response.parent && (
                        <span className="ml-2 rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          conditional
                        </span>
                      )}
                    </p>
                    {renderAnswer(response)}
                    <textarea
                      rows={1}
                      placeholder="Comment (optional)"
                      className={`${inputClass} mt-3`}
                      value={draft[response.item]?.comment ?? ""}
                      onChange={(event) =>
                        updateDraft(response.item, {
                          comment: event.target.value,
                        })
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="sticky bottom-4 mt-6 flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave(false)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Save progress
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} /> Save &amp; mark complete
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function ChecklistRunPage() {
  return (
    <Suspense
      fallback={
        <p className="flex items-center gap-2 p-8 text-sm">
          <Loader2 className="animate-spin" /> Loading...
        </p>
      }
    >
      <ChecklistRunner />
    </Suspense>
  );
}
