import type { Request, Response } from "express";

/**
 * GET /healthz
 *
 * Used by UptimeRobot to keep Render warm.
 */
export function handleHealth(_req: Request, res: Response): void {
  res.status(200).json({ ok: true, ts: new Date().toISOString() });
}
