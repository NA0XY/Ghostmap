import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../utils/logger.js";

let client: SupabaseClient | null = null;

/**
 * Singleton service-role Supabase client.
 * Bypasses RLS — only use in the worker. Never expose this key anywhere else.
 */
export function getSupabaseClient(): SupabaseClient {
  if (client) {
    return client;
  }

  const url = process.env["SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. These must be set in the Render environment.",
    );
  }

  client = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return client;
}

interface UpdateJobStatusExtra {
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  queuePosition?: number | null;
}

/**
 * Convenience: update job status in Supabase.
 */
export async function updateJobStatus(
  jobId: string,
  status: "processing" | "complete" | "failed",
  extra?: UpdateJobStatusExtra,
): Promise<void> {
  const supabase = getSupabaseClient();
  const update: Record<string, unknown> = { status };

  if (extra?.errorMessage !== undefined) {
    update.error_message = extra.errorMessage;
  }
  if (extra?.startedAt !== undefined) {
    update.started_at = extra.startedAt;
  }
  if (extra?.completedAt !== undefined) {
    update.completed_at = extra.completedAt;
  }
  if (extra?.queuePosition !== undefined) {
    update.queue_position = extra.queuePosition;
  }

  const { error } = await supabase.from("jobs").update(update).eq("id", jobId);
  if (error) {
    logger.error("Failed to update job status", { jobId, status, error: error.message });
  }
}

/**
 * Write the graph result to the results table.
 * Upserts — safe to call multiple times (idempotent).
 */
export async function writeResult(jobId: string, graphJson: unknown): Promise<void> {
  const supabase = getSupabaseClient();

  const insert: Record<string, unknown> = {
    job_id: jobId,
    graph_json: graphJson,
    expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  };

  const { error } = await supabase.from("results").upsert(insert);
  if (error) {
    throw new Error(`Failed to write result for job ${jobId}: ${error.message}`);
  }
}
