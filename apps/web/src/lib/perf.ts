/**
 * Temporary performance instrumentation utility.
 *
 * Usage:
 *   import { DEBUG_PERF, perfLog, perfStart, perfEnd } from "@/lib/perf";
 *
 * Enable by setting env var:  DEBUG_PERF=true
 * Disable by removing env var: (no code changes needed)
 *
 * To remove permanently, delete this file and remove all imports.
 */

export const DEBUG_PERF: boolean =
  process.env.DEBUG_PERF === "true" || process.env.NODE_ENV === "development";

/**
 * Log a timestamped performance message.
 * Only outputs when DEBUG_PERF is enabled.
 */
export function perfLog(label: string, message: string, timestamp?: number): void {
  if (!DEBUG_PERF) return;
  const ts = timestamp ?? Date.now();
  console.log(`[PERF_LOG] [${ts}] ${label} - ${message}`);
}

/**
 * Mark the start of a timed section.
 * Returns a start timestamp (0 if disabled) to pass to perfEnd().
 */
export function perfStart(label: string): number {
  if (!DEBUG_PERF) return 0;
  const ts = Date.now();
  console.log(`[PERF_LOG] [${ts}] ${label} - Started`);
  return ts;
}

/**
 * Mark the end of a timed section.
 * Logs the duration in milliseconds.
 */
export function perfEnd(label: string, startTime: number): void {
  if (!DEBUG_PERF || startTime === 0) return;
  const ts = Date.now();
  console.log(`[PERF_LOG] [${ts}] ${label} - Completed (Duration: ${ts - startTime}ms)`);
}

/**
 * Log a per-request marker (for HTTP request lifecycle).
 */
export function perfRequest(label: string, detail?: string): void {
  if (!DEBUG_PERF) return;
  const ts = Date.now();
  const detailStr = detail ? ` (${detail})` : "";
  console.log(`[PERF_LOG] [${ts}] [HTTP] ${label}${detailStr}`);
}
