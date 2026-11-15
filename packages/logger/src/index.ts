/**
 * Logger JSON estruturado (CLAUDE.md): timestamp, company, role, country, salary,
 * score, language, persona, action, duration, error.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogFields {
  action: string;
  company?: string | undefined;
  role?: string | undefined;
  country?: string | undefined;
  salary?: string | undefined;
  score?: number | undefined;
  language?: string | undefined;
  persona?: string | undefined;
  duration?: number | undefined;
  error?: string | undefined;
  [extra: string]: unknown;
}

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const minLevel = (process.env["LOG_LEVEL"] as LogLevel | undefined) ?? "info";
const format = process.env["LOG_FORMAT"] ?? "pretty";

function emit(level: LogLevel, fields: LogFields) {
  if (LEVELS[level] < LEVELS[minLevel]) return;
  const entry = { timestamp: new Date().toISOString(), level, ...fields };
  if (format === "json") {
    process.stderr.write(`${JSON.stringify(entry)}\n`);
    return;
  }
  const { timestamp, action, ...rest } = entry;
  const tail = Object.entries(rest)
    .filter(([k, v]) => k !== "level" && v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(" ");
  process.stderr.write(`${timestamp.slice(11, 19)} ${level.toUpperCase().padEnd(5)} ${action}${tail ? ` ${tail}` : ""}\n`);
}

export const log = {
  debug: (f: LogFields) => emit("debug", f),
  info: (f: LogFields) => emit("info", f),
  warn: (f: LogFields) => emit("warn", f),
  error: (f: LogFields) => emit("error", f),
};

/** Mede a duração de uma ação e registra automaticamente. */
export async function timed<T>(fields: LogFields, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    log.info({ ...fields, duration: Date.now() - start });
    return result;
  } catch (err) {
    log.error({ ...fields, duration: Date.now() - start, error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
