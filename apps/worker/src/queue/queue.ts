import { Queue } from "bullmq";
import { createRedisConnection } from "./connection.js";
import type { GhostmapJobData } from "./worker.js";

export const QUEUE_NAME = "ghostmap-jobs";

let queue: Queue<GhostmapJobData> | null = null;

/**
 * Singleton BullMQ Queue used by the enqueue API.
 */
export function getQueue(): Queue<GhostmapJobData> {
  if (queue) {
    return queue;
  }

  queue = new Queue<GhostmapJobData>(QUEUE_NAME, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5_000,
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  });

  return queue;
}
