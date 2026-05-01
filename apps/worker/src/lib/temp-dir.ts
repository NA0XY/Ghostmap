import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "../utils/logger.js";

const TMP_BASE = "/tmp";

/**
 * Create an isolated temp directory for a job.
 * Returns the absolute path — e.g. /tmp/ghostmap-<jobId>
 */
export async function makeTempDir(jobId: string): Promise<string> {
  const dir = path.join(TMP_BASE, `ghostmap-${jobId}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Delete the temp directory for a job.
 * Always call this in a finally block — never skip cleanup.
 * Logs a warning if deletion fails but never throws.
 */
export async function cleanupTempDir(jobId: string): Promise<void> {
  const dir = path.join(TMP_BASE, `ghostmap-${jobId}`);
  try {
    await fs.rm(dir, { recursive: true, force: true });
    logger.info("Cleaned up temp dir", { jobId, dir });
  } catch (err) {
    logger.warn("Failed to clean up temp dir", {
      jobId,
      dir,
      error: String(err),
    });
  }
}
