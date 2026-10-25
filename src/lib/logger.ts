/**
 * Minimal console logger that works on the Workers runtime (no Node streams).
 * Message convention kept from the boilerplate: `file fn() called args={...}`.
 */
type Level = "debug" | "info" | "warn" | "error";

function write(level: Level, message: string, meta?: unknown) {
  const line = `${new Date().toISOString()} [${level}] ${message}`;
  const args = meta === undefined ? [line] : [line, meta];
  if (level === "error") console.error(...args);
  else if (level === "warn") console.warn(...args);
  else console.log(...args);
}

const logger = {
  debug: (message: string, meta?: unknown) => write("debug", message, meta),
  info: (message: string, meta?: unknown) => write("info", message, meta),
  warn: (message: string, meta?: unknown) => write("warn", message, meta),
  error: (message: string, meta?: unknown) => write("error", message, meta),
};

export default logger;
