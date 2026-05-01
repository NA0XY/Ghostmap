import { runGraphProcessor } from "./graph.processor.js";
import { logger } from "../utils/logger.js";

/**
 * Route a job to the correct processor.
 * Phase 5/6: all jobs run the graph processor only.
 */
export async function processJob(jobId: string): Promise<void> {
  logger.info("Routing job to graph processor", { jobId });
  await runGraphProcessor(jobId);
}
