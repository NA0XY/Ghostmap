import { sendFailedEmail } from "./email/notify.js";
import { getSupabaseClient, updateJobStatus } from "./lib/supabase.js";
import { logger } from "./utils/logger.js";

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const PENDING_MAX_AGE_MS = 60 * 60 * 1000;
const PROCESSING_MAX_AGE_MS = 2 * 60 * 60 * 1000;

interface StaleJobCandidate {
  id: string;
  repo_owner: string;
  repo_name: string;
  notify_email: string | null;
}

/**
 * Start stale job cleanup loop.
 */
export function startStaleJobCleanup(): void {
  logger.info("Stale job cleanup started", { intervalMs: CLEANUP_INTERVAL_MS });

  const run = async (): Promise<void> => {
    try {
      await cleanupStaleJobs();
    } catch (err) {
      logger.error("Stale job cleanup error", { error: String(err) });
    }
  };

  void run();
  setInterval(() => {
    void run();
  }, CLEANUP_INTERVAL_MS);
}

async function cleanupStaleJobs(): Promise<void> {
  const supabase = getSupabaseClient();
  const now = Date.now();
  const stalePendingCutoff = new Date(now - PENDING_MAX_AGE_MS).toISOString();
  const staleProcessingCutoff = new Date(now - PROCESSING_MAX_AGE_MS).toISOString();

  const { data: stalePending, error: stalePendingError } = await supabase
    .from("jobs")
    .select("id, repo_owner, repo_name, notify_email")
    .eq("status", "pending")
    .lt("created_at", stalePendingCutoff)
    .limit(20);

  if (stalePendingError) {
    logger.error("Stale cleanup pending query failed", { error: stalePendingError.message });
    return;
  }

  const { data: staleProcessing, error: staleProcessingError } = await supabase
    .from("jobs")
    .select("id, repo_owner, repo_name, notify_email")
    .eq("status", "processing")
    .lt("started_at", staleProcessingCutoff)
    .limit(20);

  if (staleProcessingError) {
    logger.error("Stale cleanup processing query failed", { error: staleProcessingError.message });
    return;
  }

  const staleJobs: StaleJobCandidate[] = [
    ...(stalePending ?? []),
    ...(staleProcessing ?? []),
  ];

  if (staleJobs.length === 0) {
    return;
  }

  logger.warn("Stale job cleanup: found stale jobs", { count: staleJobs.length });

  for (const job of staleJobs) {
    const errorMessage =
      "Job timed out — it was in the queue too long without completing. Please try again.";

    logger.warn("Dropping stale job", { jobId: job.id });

    await updateJobStatus(job.id, "failed", {
      errorMessage,
      completedAt: new Date().toISOString(),
      queuePosition: null,
    });

    await sendFailedEmail({
      notifyEmail: job.notify_email,
      repoOwner: job.repo_owner,
      repoName: job.repo_name,
      errorMessage,
    });
  }
}
