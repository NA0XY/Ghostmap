"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { JobClassification, JobStatus } from "../lib/supabase/database.types";

export interface JobStatusData {
  id: string;
  status: JobStatus;
  classification: JobClassification;
  queuePosition: number | null;
  errorMessage: string | null;
  repoOwner: string;
  repoName: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface UseJobStatusResult {
  statusData: JobStatusData | null;
  isLoading: boolean;
  error: string | null;
}

const POLL_INTERVAL_MS = 10_000;
const TERMINAL_STATUSES: JobStatus[] = ["complete", "failed", "expired"];

export function useJobStatus(jobId: string): UseJobStatusResult {
  const [statusData, setStatusData] = useState<JobStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  const fetchStatus = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`/api/jobs/status/${jobId}`);
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? `HTTP ${response.status}`);
      }

      const data = (await response.json()) as {
        id: string;
        status: JobStatus;
        classification: JobClassification;
        queue_position: number | null;
        error_message: string | null;
        repo_owner: string;
        repo_name: string;
        created_at: string;
        started_at: string | null;
        completed_at: string | null;
      };

      if (!isMountedRef.current) {
        return;
      }

      setStatusData({
        id: data.id,
        status: data.status,
        classification: data.classification,
        queuePosition: data.queue_position,
        errorMessage: data.error_message,
        repoOwner: data.repo_owner,
        repoName: data.repo_name,
        createdAt: data.created_at,
        startedAt: data.started_at,
        completedAt: data.completed_at,
      });
      setIsLoading(false);
      setError(null);

      if (TERMINAL_STATUSES.includes(data.status) && intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }
      setError(String(err instanceof Error ? err.message : err));
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    isMountedRef.current = true;
    void fetchStatus();
    intervalRef.current = setInterval(() => {
      void fetchStatus();
    }, POLL_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchStatus]);

  return { statusData, isLoading, error };
}
