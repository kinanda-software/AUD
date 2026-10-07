"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { apiRequest } from "@/lib/api";
import { compatibleValue, validateWorkpaperResponse } from "@/lib/workpaperContract";

export function useWorkpaper(engagement: string, section: string) {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [status, setStatus] = useState("Not Started");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const savingLock = useRef(false);
  const revision = useRef(0);
  const [loadedEndpoint, setLoadedEndpoint] = useState<string | null>(null);
  const currentEndpoint = useRef("");
  const snapshot: Record<string, unknown> = {};
  const templates: Record<string, unknown> = {};
  const endpoint = `/engagements/${engagement}/workpapers/${section}/`;
  const pageLoading = loading || loadedEndpoint !== endpoint;

  useEffect(() => {
    let active = true;
    currentEndpoint.current = endpoint;
    apiRequest<unknown>(endpoint).then((value) => {
      const record = validateWorkpaperResponse(value, engagement, section);
      if (active) {
        setData(record.data ?? {});
        setStatus(record.completion_status);
        setSaved(record.id !== null);
        setLoadFailed(false);
        setError("");
      }
    }).catch((reason) => {
      if (active) {
        setLoadFailed(true);
        setError(reason instanceof Error ? reason.message : "Unable to load workpaper.");
      }
    }).finally(() => {
      if (active) {
        setLoadedEndpoint(endpoint);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [endpoint, engagement, section]);

  function field<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
    templates[key] = initial;
    const stored = data[key];
    const normalized = section === "summary-review" && initial && typeof initial === "object"
      && !Array.isArray(initial) && stored && typeof stored === "object" && !Array.isArray(stored)
      ? { ...initial, ...stored } : stored;
    const value = (key in data && compatibleValue(normalized, initial) ? normalized : initial) as T;
    snapshot[key] = value;
    const update: Dispatch<SetStateAction<T>> = (next) => {
      revision.current++;
      setData((current) => ({
        ...current,
        [key]: typeof next === "function"
          ? (next as (previous: T) => T)((key in current ? current[key] : initial) as T) : next,
      }));
      setStatus("In Progress");
      setSaved(false);
    };
    return [value, update];
  }

  async function save(complete = false): Promise<boolean> {
    if (pageLoading || savingLock.current || loadFailed || invalidData()) return false;
    const submittedRevision = revision.current;
    savingLock.current = true;
    setSaving(true);
    setSaved(false);
    try {
      const value = await apiRequest<unknown>(endpoint, {
        method: "PUT", body: JSON.stringify({ data: snapshot, complete }),
      });
      const record = validateWorkpaperResponse(value, engagement, section, true);
      if (!record.data || Object.entries(templates).some(([key, template]) =>
        !compatibleValue(record.data?.[key], template))
        || record.completion_status !== (complete ? "Completed" : "In Progress")
        || JSON.stringify(record.data) !== JSON.stringify(snapshot)) {
        // Object key ordering can differ across database JSON implementations.
        if (!record.data || Object.keys(snapshot).some((key) =>
          JSON.stringify(record.data?.[key]) !== JSON.stringify(snapshot[key]))
          || record.completion_status !== (complete ? "Completed" : "In Progress")) {
          throw new Error("The database did not confirm the submitted workpaper.");
        }
      }
      if (currentEndpoint.current !== endpoint) return false;
      if (revision.current !== submittedRevision) {
        setError("The earlier version was saved, but newer edits are still unsaved. Save again.");
        return false;
      }
      setData(record.data);
      setStatus(record.completion_status);
      setSaved(true);
      setError("");
      return true;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to save workpaper.";
      if (currentEndpoint.current === endpoint) setError(message);
      return false;
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  }

  // Validation failures do not block correction and retry; load failures do.
  const invalidData = () => Object.entries(templates).some(([key, template]) => {
    const stored = data[key];
    const normalized = section === "summary-review" && template && typeof template === "object"
      && !Array.isArray(template) && stored && typeof stored === "object" && !Array.isArray(stored)
      ? { ...template, ...stored } : stored;
    return key in data && !compatibleValue(normalized, template);
  });
  return {
    field, save, saved: !pageLoading && saved, saving, loading: pageLoading,
    get error() {
      return invalidData() ? "Invalid stored workpaper data. No data has been overwritten." : error;
    },
    status, setStatus: (next?: string | ((previous: string) => string)) => {
      void next;
      setStatus("In Progress");
      setSaved(false);
    },
    get blocked() { return pageLoading || saving || loadFailed || invalidData(); },
    setSaved: (value: boolean) => { if (!value) setSaved(false); },
    clearError: () => setError(""),
  };
}
