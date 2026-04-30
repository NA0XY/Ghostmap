import Link from "next/link";
import React from "react";
import type { JobClassification, JobStatus } from "../../lib/supabase/database.types";

interface Job {
  id: string;
  repo_owner: string;
  repo_name: string;
  status: JobStatus;
  classification: JobClassification;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
}

interface JobListProps {
  jobs: Job[];
}

export function JobList({ jobs }: JobListProps): React.ReactElement {
  if (jobs.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 0",
          color: "var(--gm-text-muted)",
          fontSize: "var(--gm-font-size-sm)",
          fontFamily: "var(--gm-font-ui)",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>◎</div>
        No maps yet.{" "}
        <Link href="/" style={{ color: "var(--gm-accent)" }}>
          Analyse a repo
        </Link>{" "}
        to get started.
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid var(--gm-border)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 100px 100px 120px 80px",
          padding: "10px 16px",
          background: "var(--gm-bg-surface)",
          borderBottom: "1px solid var(--gm-border)",
          fontSize: "var(--gm-font-size-xs)",
          color: "var(--gm-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontFamily: "var(--gm-font-ui)",
        }}
      >
        <span>Repository</span>
        <span>Status</span>
        <span>Type</span>
        <span>Created</span>
        <span></span>
      </div>

      {jobs.map((job, index) => (
        <JobRow key={job.id} job={job} isLast={index === jobs.length - 1} />
      ))}
    </div>
  );
}

function JobRow({ job, isLast }: { job: Job; isLast: boolean }): React.ReactElement {
  const createdDate = new Date(job.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 100px 100px 120px 80px",
        padding: "12px 16px",
        background: "var(--gm-bg-canvas)",
        borderBottom: isLast ? "none" : "1px solid var(--gm-border)",
        alignItems: "center",
        fontFamily: "var(--gm-font-ui)",
        fontSize: "var(--gm-font-size-sm)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--gm-font-code)",
          color: "var(--gm-text-primary)",
          fontSize: "var(--gm-font-size-sm)",
        }}
      >
        {job.repo_owner}/{job.repo_name}
      </span>

      <StatusBadge status={job.status} />

      <span
        style={{
          fontSize: "var(--gm-font-size-xs)",
          color: "var(--gm-text-muted)",
          textTransform: "capitalize",
        }}
      >
        {job.classification}
      </span>

      <span style={{ fontSize: "var(--gm-font-size-xs)", color: "var(--gm-text-muted)" }}>
        {createdDate}
      </span>

      <div>
        {job.status === "complete" && (
          <Link
            href={`/map/${job.id}`}
            style={{
              fontSize: "var(--gm-font-size-xs)",
              color: "var(--gm-accent)",
              fontWeight: 600,
            }}
          >
            View →
          </Link>
        )}
        {(job.status === "pending" || job.status === "processing") && (
          <Link
            href={`/map/${job.id}`}
            style={{ fontSize: "var(--gm-font-size-xs)", color: "var(--gm-text-muted)" }}
          >
            Watch →
          </Link>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: JobStatus }): React.ReactElement {
  const config: Record<JobStatus, { label: string; color: string; bg: string }> = {
    pending: {
      label: "Pending",
      color: "var(--gm-text-secondary)",
      bg: "var(--gm-bg-surface-2)",
    },
    processing: {
      label: "Processing",
      color: "var(--gm-accent-hover)",
      bg: "var(--gm-accent-muted)",
    },
    complete: {
      label: "Complete",
      color: "var(--gm-decay-low)",
      bg: "color-mix(in srgb, var(--gm-decay-low) 15%, transparent)",
    },
    failed: {
      label: "Failed",
      color: "var(--gm-decay-high)",
      bg: "color-mix(in srgb, var(--gm-decay-high) 15%, transparent)",
    },
    expired: {
      label: "Expired",
      color: "var(--gm-text-muted)",
      bg: "var(--gm-bg-surface-2)",
    },
  };

  const fallback = config.pending;
  const { label, color, bg } = config[status] ?? fallback;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 4,
        background: bg,
        color,
        fontSize: "var(--gm-font-size-xs)",
        fontFamily: "var(--gm-font-ui)",
        fontWeight: 500,
      }}
    >
      {label}
    </span>
  );
}
