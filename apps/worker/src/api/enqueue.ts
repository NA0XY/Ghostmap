import type { Request, Response } from "express";
import { refreshQueuePositions } from "../queue/position.js";
import { getQueue } from "../queue/queue.js";
import { logger } from "../utils/logger.js";

/**
 * POST /api/enqueue
 *
 * Request body: { jobId: string }
 * Headers: X-Worker-Secret: <WORKER_SECRET>
 */
export async function handleEnqueue(req: Request, res: Response): Promise<void> {
  const expectedSecret = process.env["WORKER_SECRET"];
  const headerValue = req.headers["x-worker-secret"];
  const providedSecret = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!expectedSecret || providedSecret !== expectedSecret) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  const body = req.body as { jobId?: unknown };
  if (typeof body.jobId !== "string" || body.jobId.length === 0) {
    res.status(400).json({ error: "jobId is required and must be a string." });
    return;
  }

  const { jobId } = body;

  try {
    const queue = getQueue();
    await queue.add("process", { jobId }, { jobId });
    await refreshQueuePositions();
    logger.info("Job enqueued", { jobId });
    res.status(200).json({ ok: true, jobId });
  } catch (err) {
    logger.error("Failed to enqueue job", { jobId, error: String(err) });
    res.status(500).json({ error: "Failed to enqueue job." });
  }
}
