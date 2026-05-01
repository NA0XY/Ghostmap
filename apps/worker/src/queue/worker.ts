import { Worker, type Job } from "bullmq";
import { createRedisConnection } from "./connection.js";
import { QUEUE_NAME } from "./queue.js";
import { processJob } from "../processors/index.js";
import { logger } from "../utils/logger.js";
import { refreshQueuePositions } from "./position.js";

export interface GhostmapJobData {
  jobId: string;
}

/**
 * BullMQ Worker — consumes jobs from the "ghostmap-jobs" queue.
 */
export function startWorker(): Worker<GhostmapJobData> {
  const worker = new Worker<GhostmapJobData>(
    QUEUE_NAME,
    async (job: Job<GhostmapJobData>) => {
      const { jobId } = job.data;
      const log = logger.child({ jobId, bullmqJobId: job.id });

      log.info("BullMQ picked up job", { attempt: job.attemptsMade + 1 });

      try {
        await processJob(jobId);
      } catch (err) {
        log.error("processJob threw unexpectedly", { error: String(err) });
        throw err;
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 5,
      lockDuration: 5 * 60 * 1000,
    },
  );

  worker.on("completed", (job) => {
    logger.info("BullMQ job completed", { bullmqJobId: job.id, jobId: job.data.jobId });
    void refreshQueuePositions();
  });

  worker.on("failed", (job, err) => {
    logger.error("BullMQ job failed", {
      bullmqJobId: job?.id,
      jobId: job?.data.jobId,
      error: err.message,
      attempt: job?.attemptsMade,
    });
    void refreshQueuePositions();
  });

  worker.on("stalled", (bullmqJobId) => {
    logger.warn("BullMQ job stalled", { bullmqJobId });
  });

  return worker;
}
