import { analyzeRepo } from "@ghostmap/core";
import { sendEnqueuedEmail, sendFailedEmail, sendReadyEmail } from "../email/notify.js";
import { cloneRepo, CloneSizeError } from "../lib/git.js";
import { cleanupTempDir, makeTempDir } from "../lib/temp-dir.js";
import { getSupabaseClient, updateJobStatus, writeResult } from "../lib/supabase.js";
import { heavySemaphore } from "../queue/concurrency.js";
import { logger } from "../utils/logger.js";

/**
 * Full processor pipeline for a single graph analysis job.
 */
export async function runGraphProcessor(jobId: string): Promise<void> {
  const log = logger.child({ jobId });
  log.info("Processor started");

  await updateJobStatus(jobId, "processing", {
    startedAt: new Date().toISOString(),
    queuePosition: null,
  });

  const supabase = getSupabaseClient();
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, repo_url, repo_owner, repo_name, classification, notify_email")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    log.error("Failed to fetch job row", { error: jobError?.message });
    await updateJobStatus(jobId, "failed", {
      errorMessage: "Internal error: job not found in database.",
      completedAt: new Date().toISOString(),
      queuePosition: null,
    });
    return;
  }

  if (job.classification === "heavy") {
    await sendEnqueuedEmail({
      notifyEmail: job.notify_email,
      repoOwner: job.repo_owner,
      repoName: job.repo_name,
      jobId,
    });
  }

  const cloneDir = await makeTempDir(jobId);
  const isHeavy = job.classification === "heavy";
  let acquiredHeavySlot = false;

  if (isHeavy) {
    logger.info("Acquiring heavy semaphore", {
      jobId,
      active: heavySemaphore.active,
      waiting: heavySemaphore.waiting,
    });
    await heavySemaphore.acquire();
    acquiredHeavySlot = true;
    logger.info("Heavy semaphore acquired", { jobId });
  }

  try {
    log.info("Cloning", { repoUrl: job.repo_url });
    await cloneRepo(job.repo_url, cloneDir, jobId);

    log.info("Running analyzeRepo");
    const graphData = await analyzeRepo(cloneDir);
    log.info("Analysis complete", {
      nodes: graphData.nodes.length,
      edges: graphData.edges.length,
      analysisTimeMs: graphData.stats.analysisTimeMs,
    });

    log.info("Writing result to Supabase");
    await writeResult(jobId, graphData);

    await updateJobStatus(jobId, "complete", {
      completedAt: new Date().toISOString(),
      queuePosition: null,
    });

    log.info("Job complete");

    if (isHeavy) {
      await sendReadyEmail({
        notifyEmail: job.notify_email,
        repoOwner: job.repo_owner,
        repoName: job.repo_name,
        jobId,
      });
    }
  } catch (err) {
    const errorMessage =
      err instanceof CloneSizeError
        ? err.message
        : err instanceof Error
          ? err.message
          : String(err);

    log.error("Processor failed", { error: errorMessage });
    await updateJobStatus(jobId, "failed", {
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

    throw err;
  } finally {
    if (acquiredHeavySlot) {
      heavySemaphore.release();
      logger.info("Heavy semaphore released", {
        jobId,
        active: heavySemaphore.active,
        waiting: heavySemaphore.waiting,
      });
    }
    await cleanupTempDir(jobId);
  }
}
