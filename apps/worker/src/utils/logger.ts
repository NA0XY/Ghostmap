type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  ts: string;
  level: LogLevel;
  msg: string;
  jobId?: string;
  [key: string]: unknown;
}

interface Logger {
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, ctx?: Record<string, unknown>): void;
  child(ctx: Record<string, unknown>): Logger;
}

/**
 * Structured JSON logger. All output goes to stdout — Render tails it.
 * Avoid direct console output in processor code — use logger instead.
 */
export const logger: Logger = {
  info(msg: string, ctx?: Record<string, unknown>): void {
    log("info", msg, ctx);
  },
  warn(msg: string, ctx?: Record<string, unknown>): void {
    log("warn", msg, ctx);
  },
  error(msg: string, ctx?: Record<string, unknown>): void {
    log("error", msg, ctx);
  },
  child(ctx: Record<string, unknown>): Logger {
    return {
      info: (msg: string, extra?: Record<string, unknown>) =>
        log("info", msg, { ...ctx, ...extra }),
      warn: (msg: string, extra?: Record<string, unknown>) =>
        log("warn", msg, { ...ctx, ...extra }),
      error: (msg: string, extra?: Record<string, unknown>) =>
        log("error", msg, { ...ctx, ...extra }),
      child: (extra: Record<string, unknown>) => logger.child({ ...ctx, ...extra }),
    };
  },
};

function log(level: LogLevel, msg: string, ctx?: Record<string, unknown>): void {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...ctx,
  };
  process.stdout.write(JSON.stringify(entry) + "\n");
}
