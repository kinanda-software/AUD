"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Download,
  FileText,
  FolderOpen,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";

import { getEngagements, type Engagement } from "@/lib/api";
import {
  deleteEvidenceFile,
  formatFileSize,
  getEvidenceFiles,
  uploadEvidenceFile,
  type EvidenceFile,
} from "@/lib/evidence";

const SECTION_OPTIONS = [
  "planning-assessment",
  "materiality-assessment",
  "audit-scope",
  "risk-assessment",
  "controls-testing",
  "substantive-procedures",
  "fieldwork",
  "completion-review",
  "general",
];

export default function EvidencePage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [engagementId, setEngagementId] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [section, setSection] = useState("general");
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [engagementData, fileData] = await Promise.all([
          getEngagements(),
          getEvidenceFiles(
            engagementId ? Number(engagementId) : undefined,
            sectionFilter || undefined,
          ),
        ]);
        if (!active) return;
        setEngagements(engagementData);
        setFiles(fileData);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load evidence files."
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
  }, [engagementId, sectionFilter, reloadKey]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !engagementId) {
      setError("Select an engagement and a file before uploading.");
      return;
    }
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      await uploadEvidenceFile({
        engagement: Number(engagementId),
        file,
        section,
        caption,
        description,
      });
      setSuccess(`Uploaded "${file.name}".`);
      setFile(null);
      setCaption("");
      setDescription("");
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!window.confirm(`Delete "${name}"? The file will be removed from storage.`)) {
      return;
    }
    setDeletingId(id);
    setError("");
    try {
      await deleteEvidenceFile(id);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm";

  return (
    <div className="w-full px-6 py-8">
      <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
        <FolderOpen aria-hidden="true" /> Evidence Management
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Attach, organize, and manage digital audit evidence per engagement
        and workpaper section. Files up to 25 MB are accepted.
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

      <form
        onSubmit={handleUpload}
        className="my-6 rounded-2xl border border-slate-200 bg-white p-5"
      >
        <h2 className="text-lg font-semibold">Upload evidence</h2>
        <fieldset disabled={uploading} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Engagement
            <select
              required
              className={inputClass}
              value={engagementId}
              onChange={(event) => setEngagementId(event.target.value)}
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
            Workpaper section
            <select
              className={inputClass}
              value={section}
              onChange={(event) => setSection(event.target.value)}
            >
              {SECTION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll("-", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            File
            <input
              required
              type="file"
              className={inputClass}
              onChange={(event) =>
                setFile(event.target.files?.[0] ?? null)
              }
            />
          </label>
          <label className="text-sm font-medium">
            Caption
            <input
              className={inputClass}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="e.g. Bank confirmation letter"
            />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Description
            <textarea
              rows={2}
              className={inputClass}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
        </fieldset>
        <button
          type="submit"
          disabled={uploading}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          Upload evidence
        </button>
      </form>

      <div className="my-6 flex flex-wrap gap-4">
        <label className="text-sm font-medium">
          Filter by engagement
          <select
            className={inputClass}
            value={engagementId}
            onChange={(event) => setEngagementId(event.target.value)}
          >
            <option value="">All engagements</option>
            {engagements.map((item) => (
              <option key={item.id} value={item.id}>
                {item.engagement_code}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Filter by section
          <select
            className={inputClass}
            value={sectionFilter}
            onChange={(event) => setSectionFilter(event.target.value)}
          >
            <option value="">All sections</option>
            {SECTION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.replaceAll("-", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p role="status" className="mt-6 flex items-center gap-2 text-sm">
          <Loader2 className="animate-spin" /> Loading evidence...
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-700">
              <tr>
                {["File", "Engagement", "Section", "Size", "Uploaded", "Actions"].map(
                  (title) => (
                    <th key={title} className="px-4 py-3">{title}</th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {files.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="flex items-center gap-2 font-semibold text-slate-900">
                      <FileText size={15} className="shrink-0 text-slate-400" />
                      {item.caption || item.original_filename}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.original_filename}
                    </p>
                    {item.description && (
                      <p className="mt-1 text-xs text-slate-500">
                        {item.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {item.engagement_code}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {(item.section || "general").replaceAll("-", " ")}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {formatFileSize(item.file_size)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p>{new Date(item.uploaded_at).toLocaleString("en-GB")}</p>
                    <p className="text-slate-500">
                      {item.uploaded_by_username || "Unknown"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-3 text-xs font-semibold">
                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                      >
                        <Download size={12} /> Open
                      </a>
                      <button
                        type="button"
                        disabled={deletingId === item.id}
                        onClick={() =>
                          handleDelete(item.id, item.original_filename)
                        }
                        className="inline-flex items-center gap-1 text-red-700 hover:underline disabled:opacity-50"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!files.length && (
            <p className="p-6 text-center text-sm text-slate-600">
              No evidence files uploaded yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
