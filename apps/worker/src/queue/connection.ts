import { Redis } from "ioredis";
import { logger } from "../utils/logger.js";

/**
 * Singleton ioredis connection factory.
 * BullMQ expects separate connection instances for Queue and Worker.
 */
export function createRedisConnection(): Redis {
  const url = process.env["REDIS_URL"];

  if (!url) {
    throw new Error(
      "Missing REDIS_URL. Set this in the Render environment — use the co-located Render Redis URL.",
    );
  }

  const connection = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  connection.on("error", (err: Error) => {
    logger.error("Redis connection error", { error: err.message });
  });

  connection.on("connect", () => {
    logger.info("Redis connected");
  });

  return connection;
}
