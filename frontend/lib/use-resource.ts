"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, asApiError } from "./api";

/** Carga un recurso con estados de carga y error, y permite recargarlo. */
export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const latest = useRef(path);
  latest.current = path;

  const reload = useCallback(async () => {
    if (!path) return;
    try {
      const result = await api<T>(path);
      if (latest.current === path) {
        setData(result);
        setError(null);
      }
    } catch (reason) {
      if (latest.current === path) setError(asApiError(reason));
    } finally {
      if (latest.current === path) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}
