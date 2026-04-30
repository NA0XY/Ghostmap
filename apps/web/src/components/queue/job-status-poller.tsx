"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useJobStatus } from "../../hooks/use-job-status";
import { ProgressBar } from "./progress-bar";

interface JobStatusPollerProps {
  jobId: string;
}

export function JobStatusPoller({ jobId }: JobStatusPollerProps): React.ReactElement {
  const { statusData, isLoading, error } = useJobStatus(jobId);
  const router = useRouter();

  useEffect(() => {
    if (statusData?.status === "complete") {
      router.push(`/map/${jobId}`);
    }
  }, [jobId, router, statusData?.status]);

  if (isLoading && !statusData) {
    return (
      <div
        style={{
          padding: "80px 24px",
          textAlign: "center",
          color: "var(--gm-text-muted)",
          fontFamily: "var(--gm-font-ui)",
          fontSize: "var(--gm-font-size-sm)",
        }}
      >
        Connecting…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "80px 24px",
          textAlign: "center",
          color: "var(--gm-decay-high)",
          fontFamily: "var(--gm-font-ui)",
          fontSize: "var(--gm-font-size-sm)",
        }}
      >
        {error}
      </div>
    );
  }

  if (!statusData) {
    return <></>;
  }

  if (statusData.status === "failed") {
    return (
      <div
        style={{
          padding: "80px 24px",
          textAlign: "center",
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
        <div
          style={{
            color: "var(--gm-decay-high)",
            fontFamily: "var(--gm-font-ui)",
            marginBottom: 8,
          }}
        >
          Analysis failed
        </div>
        <div
          style={{
            color: "var(--gm-text-muted)",
            fontFamily: "var(--gm-font-ui)",
            fontSize: "var(--gm-font-size-sm)",
          }}
        >
          {statusData.errorMessage ?? "An unexpected error occurred."}
        </div>
      </div>
    );
  }

  return <ProgressBar statusData={statusData} />;
}
