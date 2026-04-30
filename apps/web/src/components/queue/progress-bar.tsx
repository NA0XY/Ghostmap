"use client";

import React, { useEffect, useState } from "react";
import type { JobStatusData } from "../../hooks/use-job-status";

interface ProgressBarProps {
  statusData: JobStatusData;
}

export function ProgressBar({ statusData }: ProgressBarProps): React.ReactElement {
  const [progress, setProgress] = useState(0);

  const isComplete = statusData.status === "complete";
  const isFailed = statusData.status === "failed";

  useEffect(() => {
    if (isComplete) {
      setProgress(100);
      return;
    }
    if (isFailed) {
      return;
    }

    const intervalMs = statusData.classification === "instant" ? 200 : 500;
    const id = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          return prev + 0.2;
        }
        if (prev >= 70) {
          return prev + 1;
        }
        return prev + 3;
      });
    }, intervalMs);

    return () => {
      clearInterval(id);
    };
  }, [isComplete, isFailed, statusData.classification]);

  const capped = Math.min(progress, isComplete ? 100 : 92);
  const statusLabel =
    statusData.status === "pending"
      ? "Queued…"
      : statusData.status === "processing"
        ? `Analysing ${statusData.repoOwner}/${statusData.repoName}…`
        : statusData.status === "complete"
          ? "Done!"
          : statusData.errorMessage ?? "Something went wrong.";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        padding: "60px 24px",
        maxWidth: 480,
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--gm-font-code)",
          fontSize: "var(--gm-font-size-lg)",
          color: "var(--gm-text-primary)",
          marginBottom: 4,
        }}
      >
        {statusData.repoOwner}/{statusData.repoName}
      </div>

      <div
        style={{
          fontFamily: "var(--gm-font-ui)",
          fontSize: "var(--gm-font-size-sm)",
          color: isFailed ? "var(--gm-decay-high)" : "var(--gm-text-secondary)",
        }}
      >
        {statusLabel}
      </div>

      {!isFailed && (
        <div
          style={{
            width: "100%",
            height: 4,
            background: "var(--gm-bg-surface-2)",
            borderRadius: 2,
            overflow: "hidden",
          }}
          role="progressbar"
          aria-valuenow={Math.round(capped)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Analysis progress"
        >
          <div
            style={{
              height: "100%",
              width: `${capped}%`,
              background: isComplete ? "var(--gm-decay-low)" : "var(--gm-accent)",
              borderRadius: 2,
              transition: isComplete ? "width 300ms ease" : "width 500ms ease",
            }}
          />
        </div>
      )}

      {!isFailed && (
        <div
          style={{
            fontFamily: "var(--gm-font-code)",
            fontSize: "var(--gm-font-size-xs)",
            color: "var(--gm-text-muted)",
          }}
        >
          {Math.round(capped)}%
        </div>
      )}
    </div>
  );
}
