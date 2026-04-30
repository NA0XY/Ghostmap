import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "../../../../../lib/supabase/server";
import type { JobClassification, JobStatus } from "../../../../../lib/supabase/database.types";

export const runtime = "edge";

interface JobStatusRow {
  id: string;
  user_id: string | null;
  status: JobStatus;
  classification: JobClassification;
  queue_position: number | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  repo_owner: string;
  repo_name: string;
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const queryResult = await supabase
    .from("jobs")
    .select(
      "id, user_id, status, classification, queue_position, error_message, created_at, started_at, completed_at, repo_owner, repo_name",
    )
    .eq("id", jobId)
    .single();
  const job = queryResult.data as unknown as JobStatusRow | null;
  const error = queryResult.error;

  if (error || !job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (user && job.user_id !== null && job.user_id !== user.id) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json(job);
}
