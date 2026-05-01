import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "../../../../../lib/supabase/server";
import { createServiceRoleClient } from "../../../../../lib/supabase/service-role";
import type { JobStatus } from "../../../../../lib/supabase/database.types";

export const runtime = "edge";

interface JobLookupRow {
  id: string;
  user_id: string | null;
  status: JobStatus;
}

interface JobResultRow {
  graph_json: unknown;
  expires_at: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { jobId: string } },
): Promise<NextResponse> {
  const { jobId } = params;
  if (!jobId || typeof jobId !== "string") {
    return NextResponse.json({ error: "jobId is required." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const serviceRoleClient = createServiceRoleClient();
  const readClient = serviceRoleClient ?? supabase;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const jobQuery = await readClient
    .from("jobs")
    .select("id, user_id, status")
    .eq("id", jobId)
    .single();
  const job = jobQuery.data as unknown as JobLookupRow | null;
  const jobError = jobQuery.error;

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (job.user_id !== null && (!user || job.user_id !== user.id)) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (job.status !== "complete") {
    return NextResponse.json(
      { error: `Job is not complete (status: ${job.status}).` },
      { status: 409 },
    );
  }

  const resultQuery = await readClient
    .from("results")
    .select("graph_json, expires_at")
    .eq("job_id", jobId)
    .single();
  const result = resultQuery.data as unknown as JobResultRow | null;
  const resultError = resultQuery.error;

  if (resultError || !result) {
    return NextResponse.json({ error: "Result not found or expired." }, { status: 404 });
  }

  return NextResponse.json({
    graphData: result.graph_json,
    expiresAt: result.expires_at,
  });
}
