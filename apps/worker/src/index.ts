import express from "express";
import { handleEnqueue } from "./api/enqueue.js";
import { handleHealth } from "./api/health.js";
import { getResendClient } from "./email/client.js";
import { startPollingFallback } from "./polling-fallback.js";
import { startWorker } from "./queue/worker.js";
import { startStaleJobCleanup } from "./stale-job-cleanup.js";
import { logger } from "./utils/logger.js";

const PORT = Number.parseInt(process.env["PORT"] ?? "4000", 10);

async function main(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get("/healthz", handleHealth);
  app.post("/api/enqueue", (req, res) => {
    void handleEnqueue(req, res);
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found." });
  });

  if (process.env["RESEND_API_KEY"]) {
    getResendClient();
    logger.info("Resend client initialized");
  } else {
    logger.warn("RESEND_API_KEY is missing — email notifications are disabled.");
  }

  const worker = startWorker();
  logger.info("BullMQ worker started");

  startPollingFallback();
  startStaleJobCleanup();

  const server = app.listen(PORT, () => {
    logger.info("Worker HTTP server listening", { port: PORT });
  });

  const shutdown = async (): Promise<void> => {
    logger.info("Shutting down worker...");
    await worker.close();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
    process.exit(0);
  };

  process.on("SIGTERM", () => {
    void shutdown();
  });
  process.on("SIGINT", () => {
    void shutdown();
  });
}

main().catch((err: unknown) => {
  logger.error("Fatal startup error", { error: String(err) });
  process.exit(1);
});
