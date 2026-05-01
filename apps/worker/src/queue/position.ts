import { getSupabaseClient } from "../lib/supabase.js";
import { logger } from "../utils/logger.js";
import { getQueue } from "./queue.js";

/**
 * Update queue positions for waiting jobs.
 */
export async function refreshQueuePositions(): Promise<void> {
  try {
    const queue = getQueue();
    const waiting = await queue.getWaiting();
    const supabase = getSupabaseClient();

    if (waiting.length > 0) {
      for (const [index, waitingJob] of waiting.entries()) {
        const { error } = await supabase
          .from("jobs")
          .update({ queue_position: index + 1 })
          .eq("id", waitingJob.data.jobId);

        if (error) {
          logger.warn("Failed to update queue position", {
            jobId: waitingJob.data.jobId,
            position: index + 1,
            error: error.message,
          });
        }
      }
    }
  } catch (err) {
    logger.error("refreshQueuePositions failed", { error: String(err) });
  }
}
