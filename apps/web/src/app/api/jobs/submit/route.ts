import { NextResponse, type NextRequest } from "next/server";
import { classifyJob, getMaxFileCount } from "../../../../lib/jobs/classify";
import { parseGitHubUrl } from "../../../../lib/github/validate-url";
import { fetchRepoMeta, GitHubError } from "../../../../lib/github/repo-meta";
import { createServerSupabaseClient } from "../../../../lib/supabase/server";
import { checkUsageLimit, incrementUsage } from "../../../../lib/jobs/limits";
import type { Database, Json } from "../../../../lib/supabase/database.types";

export const runtime = "edge";

interface SubmitRequestBody {
  repoUrl: string;
  features?: string[];
  notifyEmail?: string;
}

interface SubmitResponseBody {
  jobId: string;
  classification: string;
  queuePosition?: number;
}

interface JobsInsertBuilder {
  insert: (
    values: Database["public"]["Tables"]["jobs"]["Insert"],
  ) => {
    select: (columns: string) => {
      single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
    };
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: SubmitRequestBody;
  try {
    body = (await request.json()) as SubmitRequestBody;
  } catch {
    return errorResponse("Invalid request body — expected JSON.", 400);
  }

  const { repoUrl, features = ["graph"], notifyEmail } = body;
  if (!repoUrl || typeof repoUrl !== "string") {
    return errorResponse("repoUrl is required.", 400);
  }

  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    return errorResponse(
      "Invalid GitHub URL. Expected a format like https://github.com/owner/repo",
      400,
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id ?? null;
  const isAnonymous = userId === null;

  if (isAnonymous && features.some((feature) => feature !== "graph")) {
    return errorResponse("Sign in to access Ownership, Decay, and Stranger Danger layers.", 403);
  }

  if (userId) {
    const limitCheck = await checkUsageLimit(supabase, userId);
    if (!limitCheck.allowed) {
      return errorResponse(
        `Daily limit reached (${limitCheck.currentCount}/${limitCheck.limit} analyses). Resets at midnight UTC.`,
        429,
      );
    }
  }

  let meta;
  try {
    meta = await fetchRepoMeta(parsed.owner, parsed.repo);
  } catch (err) {
    if (err instanceof GitHubError) {
      return errorResponse(err.message, err.status >= 500 ? 502 : 400);
    }
    console.error("[submit] GitHub API fetch failed:", err);
    return errorResponse("Failed to reach GitHub API. Please try again.", 502);
  }

  if (meta.fileCount > getMaxFileCount()) {
    return errorResponse(
      `This repository has over ${getMaxFileCount().toLocaleString()} files and cannot be analysed on the web app. Use the npm package to run it locally on your own machine.`,
      422,
    );
  }

  if (meta.isPrivate && !user) {
    return errorResponse("Sign in to analyse private repositories.", 403);
  }

  const { classification, reason } = classifyJob(meta, features);

  if (classification === "heavy" && !notifyEmail) {
    return NextResponse.json(
      {
        requiresEmail: true,
        classification,
        reason,
      },
      { status: 202 },
    );
  }

  if (classification === "heavy" && notifyEmail) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(notifyEmail)) {
      return errorResponse("Invalid email address.", 400);
    }
  }

  const jobsTable = supabase.from("jobs") as unknown as JobsInsertBuilder;
  const { data: job, error: insertError } = await jobsTable
    .insert({
      user_id: userId,
      repo_url: parsed.cloneUrl,
      repo_owner: parsed.owner,
      repo_name: parsed.repo,
      status: "pending",
      classification,
      features: features as unknown as Json,
      file_count: meta.fileCount,
      commit_count: meta.commitCount,
      notify_email: notifyEmail ?? null,
    })
    .select("id")
    .single();

  if (insertError || !job) {
    console.error("[submit] Failed to insert job:", insertError?.message);
    return errorResponse("Failed to create job. Please try again.", 500);
  }

  const jobId = job.id;

  if (userId) {
    await incrementUsage(supabase, userId);
  }

  const workerUrl = process.env["WORKER_INTERNAL_URL"];
  const workerSecret = process.env["WORKER_SECRET"];
  if (!workerUrl) {
    console.error("[submit] WORKER_INTERNAL_URL is not set");
    return errorResponse("Worker service is not configured.", 500);
  }
  if (!workerSecret) {
    console.error("[submit] WORKER_SECRET is not set");
    return errorResponse("Worker service secret is not configured.", 500);
  }

  try {
    const enqueueRes = await fetch(`${workerUrl}/api/enqueue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Secret": workerSecret,
      },
      body: JSON.stringify({ jobId }),
    });

    if (!enqueueRes.ok) {
      console.error("[submit] Worker enqueue failed:", await enqueueRes.text());
    }
  } catch (err) {
    console.error("[submit] Failed to reach worker:", err);
  }

  const response: SubmitResponseBody = { jobId, classification };
  return NextResponse.json(response, { status: 201 });
}

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
