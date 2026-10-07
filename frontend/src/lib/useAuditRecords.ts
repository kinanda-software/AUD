"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useAuditRecords<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retrievedAt, setRetrievedAt] = useState<Date | null>(null);
  const controller = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    return loader(request.signal).then((result) => {
      if (request.signal.aborted) return;
      setData(result);
      setError("");
      setRetrievedAt(new Date());
    }).catch((failure: unknown) => {
      if (request.signal.aborted) return;
      console.error("Audit records could not be loaded:", failure);
      setError("Unable to retrieve current records. Check your connection or sign in again, then retry.");
    }).finally(() => {
      if (!request.signal.aborted) setLoading(false);
    });
  }, [loader]);

  useEffect(() => {
    void load();
    return () => controller.current?.abort();
  }, [load]);

  const refresh = () => {
    setLoading(true);
    setError("");
    void load();
  };

  return { data, loading, error, retrievedAt, refresh };
}
