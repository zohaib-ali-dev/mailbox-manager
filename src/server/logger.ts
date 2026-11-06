/**
 * Minimal structured logger: one JSON line per event. Used by the worker and the HTTP layer.
 * Never log passwords, tokens, cookies or request bodies.
 */
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];
export type LogFields = Record<string, unknown>;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(fields: LogFields): Logger;
}

export interface LoggerOptions {
  level: LogLevel;
  base?: LogFields;
  /** Defaults to stdout (stderr for warn and error). */
  write?: (line: string, level: LogLevel) => void;
}

const defaultWrite = (line: string, level: LogLevel) => {
  (level === 'warn' || level === 'error' ? process.stderr : process.stdout).write(`${line}\n`);
};

function serialise(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

export function createLogger(options: LoggerOptions): Logger {
  const threshold = LOG_LEVELS.indexOf(options.level);
  const write = options.write ?? defaultWrite;
  const base = options.base ?? {};

  const log = (level: LogLevel, message: string, fields: LogFields = {}) => {
    if (LOG_LEVELS.indexOf(level) < threshold) return;
    const entry: LogFields = { time: new Date().toISOString(), level, ...base };
    for (const [key, value] of Object.entries(fields)) entry[key] = serialise(value);
    entry.message = message;
    write(JSON.stringify(entry), level);
  };

  return {
    debug: (message, fields) => log('debug', message, fields),
    info: (message, fields) => log('info', message, fields),
    warn: (message, fields) => log('warn', message, fields),
    error: (message, fields) => log('error', message, fields),
    child: (fields) => createLogger({ ...options, base: { ...base, ...fields } }),
  };
}

export const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => silentLogger,
};
