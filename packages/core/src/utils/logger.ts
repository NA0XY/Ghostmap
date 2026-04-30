export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel =
  process.env["NODE_ENV"] === "production" ? "warn" : "debug";

function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): void {
  if (LOG_LEVELS[level] < LOG_LEVELS[MIN_LEVEL]) {
    return;
  }

  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : "";
  process.stderr.write(
    `[${timestamp}] [ghostmap:core] [${level.toUpperCase()}] ${message}${contextStr}\n`,
  );
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>): void =>
    log("debug", message, context),
  info: (message: string, context?: Record<string, unknown>): void =>
    log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>): void =>
    log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>): void =>
    log("error", message, context),
};
