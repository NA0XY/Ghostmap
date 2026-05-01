import type { GraphData } from "@ghostmap/core";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import React from "react";
import { MapShell } from "../../../components/map/map-shell";
import { JobStatusPoller } from "../../../components/queue/job-status-poller";
import type { JobClassification, JobStatus } from "../../../lib/supabase/database.types";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

export const runtime = "edge";

interface MapPageProps {
  params: { jobId: string };
}

interface JobRow {
  id: string;
  user_id: string | null;
  status: JobStatus;
  repo_owner: string;
  repo_name: string;
  classification: JobClassification;
}

interface ResultRow {
  graph_json: unknown;
  expires_at: string;
}

export async function generateMetadata({ params }: MapPageProps): Promise<Metadata> {
  return {
    title: `Map ${params.jobId.slice(0, 8)} — Ghostmap`,
  };
}

export default async function MapPage({ params }: MapPageProps): Promise<React.ReactElement> {
  const { jobId } = params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const jobQuery = await supabase
    .from("jobs")
    .select("id, user_id, status, repo_owner, repo_name, classification")
    .eq("id", jobId)
    .single();
  const job = jobQuery.data as unknown as JobRow | null;
  const error = jobQuery.error;

  if (error || !job) {
    notFound();
  }

  if (job.user_id !== null && (!user || job.user_id !== user.id)) {
    redirect(`/login?redirectTo=/map/${jobId}`);
  }

  const isAnonymous = !user;
  if (job.status !== "complete") {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 52px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <JobStatusPoller jobId={jobId} />
      </div>
    );
  }

  const resultQuery = await supabase
    .from("results")
    .select("graph_json, expires_at")
    .eq("job_id", jobId)
    .single();
  const result = resultQuery.data as unknown as ResultRow | null;
  const resultError = resultQuery.error;

  if (resultError || !result) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 52px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
          fontFamily: "var(--gm-font-ui)",
          color: "var(--gm-text-secondary)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 40 }}>🕳</div>
        <div style={{ fontSize: "var(--gm-font-size-lg)", color: "var(--gm-text-primary)" }}>
          This map has expired
        </div>
        <div style={{ fontSize: "var(--gm-font-size-sm)" }}>
          Results are kept for 48 hours. Submit the repo again to regenerate it.
        </div>
      </div>
    );
  }

  return (
    <MapShell
      graphData={result.graph_json as unknown as GraphData}
      jobId={jobId}
      isAnonymous={isAnonymous}
      expiresAt={result.expires_at}
    />
  );
}
