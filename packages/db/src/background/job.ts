import { randomUUID } from "node:crypto";

// ─── Types ───────────────────────────────────────────────────────────────────

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled" | "retrying";

export type JobPriority = "low" | "normal" | "high" | "critical";

export const PRIORITY_ORDER: Record<JobPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface Job<T = unknown> {
  readonly id: string;
  readonly name: string;
  readonly payload: T;
  readonly createdAt: Date;
  readonly priority: JobPriority;
  retryCount: number;
  readonly maxRetries: number;
  status: JobStatus;
  scheduledAt: Date | null;
  execute(): Promise<void>;
}

export type JobHandler<T = unknown> = (job: Job<T>) => Promise<void>;

export interface JobOptions {
  priority?: JobPriority;
  maxRetries?: number;
  scheduledAt?: Date | null;
  /** @internal For testing — override the creation timestamp. */
  createdAt?: Date;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

export function generateJobId(): string {
  return randomUUID().replace(/-/g, "").toUpperCase();
}

/**
 * Calculate exponential backoff delay.
 *
 * Base: 1s → 2s → 4s → 8s → 16s → 30s (capped)
 */
export function calculateBackoff(retryCount: number, baseDelayMs = 1_000): number {
  return Math.min(baseDelayMs * Math.pow(2, retryCount - 1), 30_000);
}

// ─── Base Job Implementation ─────────────────────────────────────────────────

export class BaseJob<T = unknown> implements Job<T> {
  readonly id: string;
  readonly name: string;
  readonly payload: T;
  readonly createdAt: Date;
  readonly priority: JobPriority;
  retryCount: number;
  readonly maxRetries: number;
  status: JobStatus;
  scheduledAt: Date | null;
  private readonly _handler: JobHandler<T>;

  constructor(
    id: string,
    name: string,
    payload: T,
    handler: JobHandler<T>,
    options?: JobOptions,
  ) {
    this.id = id;
    this.name = name;
    this.payload = payload;
    this._handler = handler;
    this.createdAt = options?.createdAt ?? new Date();
    this.priority = options?.priority ?? "normal";
    this.retryCount = 0;
    this.maxRetries = options?.maxRetries ?? 3;
    this.status = "pending";
    this.scheduledAt = options?.scheduledAt ?? null;
  }

  async execute(): Promise<void> {
    await this._handler(this);
  }
}
