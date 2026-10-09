"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  Copy,
  FileSpreadsheet,
  ListChecks,
  Loader2,
  Play,
  Plus,
  Trash2,
} from "lucide-react";

import {
  cloneChecklistTemplate,
  createChecklistTemplate,
  deleteChecklistTemplate,
  getChecklistTemplates,
  importChecklistExcel,
  type ChecklistTemplate,
} from "@/lib/checklists";

export default function ChecklistsPage() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "General",
    description: "",
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getChecklistTemplates();
        if (active) setTemplates(data);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Could not load templates."
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
  }, [reloadKey]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createChecklistTemplate(form);
      setSuccess(`Template "${form.name}" created. Add questions below from the template card.`);
      setShowCreate(false);
      setForm({ name: "", category: "General", description: "" });
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!importFile || !form.name) {
      setError("Choose an .xlsx workbook and provide a template name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const template = await importChecklistExcel({
        file: importFile,
        name: form.name,
        category: form.category,
        description: form.description,
      });
      setSuccess(
        `Imported "${template.name}" with ${template.item_count} questions.`
      );
      setShowImport(false);
      setImportFile(null);
      setForm({ name: "", category: "General", description: "" });
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClone(id: number) {
    setError("");
    try {
      const clone = await cloneChecklistTemplate(id);
      setSuccess(`Created "${clone.name}".`);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clone failed.");
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!window.confirm(`Delete template "${name}" and all its questions?`)) {
      return;
    }
    setError("");
    try {
      await deleteChecklistTemplate(id);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm";

  return (
    <div className="w-full px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
            <ListChecks aria-hidden="true" /> Checklist Library
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Reusable audit questionnaires with weighted scoring, rating
            bands, and conditional sub-questions. Create from scratch,
            clone an existing template, or import an Excel workbook.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setShowImport((value) => !value);
              setShowCreate(false);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
          >
            <FileSpreadsheet size={16} /> Import Excel
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreate((value) => !value);
              setShowImport(false);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={16} /> New template
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">
        <strong>Excel format:</strong> first row must be a header with a{" "}
        <code>question</code> column. Optional columns:{" "}
        <code>response_type</code> (yes_no, yes_no_na, text, number, rating),{" "}
        <code>weight</code>, <code>order</code>, <code>parent</code> (exact
        question text of the parent row), and <code>condition_value</code>{" "}
        (parent answer that reveals the sub-question, e.g. <code>no</code>).
      </div>

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

      {(showCreate || showImport) && (
        <form
          onSubmit={showImport ? handleImport : handleCreate}
          className="my-6 rounded-2xl border border-slate-200 bg-white p-5"
        >
          <h2 className="text-lg font-semibold">
            {showImport ? "Import template from Excel" : "New template"}
          </h2>
          <fieldset disabled={saving} className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Template name
              <input
                required
                className={inputClass}
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="e.g. Revenue cycle controls"
              />
            </label>
            <label className="text-sm font-medium">
              Category
              <input
                className={inputClass}
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
              />
            </label>
            {showImport && (
              <label className="text-sm font-medium md:col-span-2">
                Excel workbook (.xlsx)
                <input
                  required
                  type="file"
                  accept=".xlsx"
                  className={inputClass}
                  onChange={(event) =>
                    setImportFile(event.target.files?.[0] ?? null)
                  }
                />
              </label>
            )}
            <label className="text-sm font-medium md:col-span-2">
              Description
              <textarea
                rows={2}
                className={inputClass}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
            </label>
          </fieldset>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {showImport ? "Import template" : "Create template"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setShowImport(false);
              }}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p role="status" className="mt-6 flex items-center gap-2 text-sm">
          <Loader2 className="animate-spin" /> Loading templates...
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <article
              key={template.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    {template.name}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {template.category || "General"} · {template.item_count}{" "}
                    questions
                    {!template.is_active && " · inactive"}
                  </p>
                </div>
              </div>
              {template.description && (
                <p className="mt-3 line-clamp-3 text-sm text-slate-600">
                  {template.description}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 text-xs font-semibold">
                <Link
                  href={`/checklists/run?template=${template.id}`}
                  className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                >
                  <Play size={12} /> Run on engagement
                </Link>
                <button
                  type="button"
                  onClick={() => handleClone(template.id)}
                  className="inline-flex items-center gap-1 text-slate-700 hover:underline"
                >
                  <Copy size={12} /> Clone
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(template.id, template.name)}
                  className="inline-flex items-center gap-1 text-red-700 hover:underline"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </article>
          ))}
          {!templates.length && (
            <p className="col-span-full rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
              No checklist templates yet. Create one from scratch or import
              an Excel workbook.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
