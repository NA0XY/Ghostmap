import { getSupabaseClient } from "./lib/supabase.js";
import { getQueue } from "./queue/queue.js";
import { refreshQueuePositions } from "./queue/position.js";
import { logger } from "./utils/logger.js";

const POLL_INTERVAL_MS = 30_000;
const ORPHAN_THRESHOLD_MS = 2 * 60 * 1000;

/**
 * Start fallback loop that rescues orphaned pending jobs.
 */
export function startPollingFallback(): void {
  logger.info("Polling fallback started", { intervalMs: POLL_INTERVAL_MS });

  const run = async (): Promise<void> => {
    try {
      await rescueOrphanedJobs();
    } catch (err) {
      logger.error("Polling fallback error", { error: String(err) });
    }
  };

  void run();
  setInterval(() => {
    void run();
  }, POLL_INTERVAL_MS);
}

async function rescueOrphanedJobs(): Promise<void> {
  const supabase = getSupabaseClient();
  const threshold = new Date(Date.now() - ORPHAN_THRESHOLD_MS).toISOString();

  const { data: orphans, error } = await supabase
    .from("jobs")
    .select("id")
    .eq("status", "pending")
    .lt("created_at", threshold)
    .limit(10);

  if (error) {
    logger.error("Polling fallback: Supabase query failed", { error: error.message });
    return;
  }

  if (!orphans || orphans.length === 0) {
    return;
  }

  logger.warn("Polling fallback: found orphaned jobs", { count: orphans.length });
  const queue = getQueue();

  for (const orphan of orphans) {
    try {
      await queue.add("process", { jobId: orphan.id }, { jobId: orphan.id });
      logger.info("Polling fallback: re-enqueued orphaned job", { jobId: orphan.id });
    } catch (err) {
      logger.error("Polling fallback: failed to re-enqueue", {
        jobId: orphan.id,
        error: String(err),
      });
    }
  }

  await refreshQueuePositions();
}
