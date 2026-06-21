/**
 * Tiny structured logger for development.
 *
 * Output is suppressed in production (NODE_ENV === 'production') to keep
 * server logs clean and avoid leaking internal detail.
 */

export type LogLevel = 'info' | 'warn' | 'error';

const isProduction = (): boolean => process.env.NODE_ENV === 'production';

/**
 * Log a structured line in the form `[ZAKATI][CONTEXT][LEVEL] message`.
 *
 * @param level   Severity of the message.
 * @param context Subsystem the message originates from, e.g. "stellar/account".
 * @param message Human-readable message.
 * @param data    Optional structured payload appended to the line.
 */
export function log(
  level: LogLevel,
  context: string,
  message: string,
  data?: unknown,
): void {
  if (isProduction()) return;

  const prefix = `[ZAKATI][${context}][${level.toUpperCase()}]`;
  const sink =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

  if (data !== undefined) {
    sink(`${prefix} ${message}`, data);
  } else {
    sink(`${prefix} ${message}`);
  }
}

/** Convenience helpers. */
export const logger = {
  info: (context: string, message: string, data?: unknown) =>
    log('info', context, message, data),
  warn: (context: string, message: string, data?: unknown) =>
    log('warn', context, message, data),
  error: (context: string, message: string, data?: unknown) =>
    log('error', context, message, data),
};
