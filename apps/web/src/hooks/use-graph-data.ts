"use client";

import { useEffect, useRef, useState } from "react";
import type { GraphData } from "@ghostmap/core";

interface UseGraphDataResult {
  graphData: GraphData | null;
  isLoading: boolean;
  error: string | null;
  expiresAt: string | null;
}

export function useGraphData(jobId: string): UseGraphDataResult {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) {
      return;
    }
    hasFetchedRef.current = true;

    let cancelled = false;

    const load = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/jobs/result/${jobId}`);
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? `HTTP ${response.status}`);
        }

        const data = (await response.json()) as { graphData: GraphData; expiresAt: string };
        if (cancelled) {
          return;
        }

        setGraphData(data.graphData);
        setExpiresAt(data.expiresAt);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(String(err instanceof Error ? err.message : err));
        setIsLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  return { graphData, isLoading, error, expiresAt };
}
