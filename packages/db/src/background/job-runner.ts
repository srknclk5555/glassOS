import { type Job, calculateBackoff } from "./job.js";
import { type IJobQueue } from "./job-queue.js";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface JobRunnerCallbacks {
  onComplete?: (job: Job) => void;
  onFailed?: (job: Job) => void;
  onRetrying?: (job: Job) => void;
}

export interface IJobRunner {
  readonly isRunning: boolean;
  start(): void;
  stop(): Promise<void>;
  execute(job: Job): Promise<void>;
}

// ─── Local In-Process Runner ─────────────────────────────────────────────────

/**
 * Local in-process job runner.
 *
 * Operates in a single process — no distributed workers.
 * Polls the queue for pending jobs and executes them sequentially.
 *
 * Retry policy:
 * - On failure, if `retryCount < maxRetries`, the job is re-enqueued
 *   with exponential backoff and its status set to "retrying".
 * - After exhausting retries, the job is marked "failed".
 *
 * Failed jobs never disappear silently — the `onFailed` callback
 * is always invoked and the BackgroundService tracks them.
 */
export class LocalJobRunner implements IJobRunner {
  private _isRunning = false;
  private readonly callbacks: JobRunnerCallbacks;
  private readonly pollIntervalMs: number;

  constructor(
    private readonly queue: IJobQueue,
    callbacks?: JobRunnerCallbacks,
    options?: { pollIntervalMs?: number },
  ) {
    this.callbacks = callbacks ?? {};
    this.pollIntervalMs = options?.pollIntervalMs ?? 50;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  start(): void {
    if (this._isRunning) return;
    this._isRunning = true;
    this._runLoop();
  }

  async stop(): Promise<void> {
    this._isRunning = false;
  }

  async execute(job: Job): Promise<void> {
    job.status = "running";
    try {
      await job.execute();
      job.status = "completed";
      this.callbacks.onComplete?.(job);
    } catch (error) {
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        job.status = "retrying";
        const delay = calculateBackoff(job.retryCount);
        job.scheduledAt = new Date(Date.now() + delay);
        // Reset to pending so the queue can pick it up again
        job.status = "pending";
        await this.queue.enqueue(job);
        this.callbacks.onRetrying?.(job);
      } else {
        job.status = "failed";
        this.callbacks.onFailed?.(job);
      }
    }
  }

  private async _runLoop(): Promise<void> {
    while (this._isRunning) {
      const job = await this.queue.dequeue();
      if (!job) {
        await this._sleep(this.pollIntervalMs);
        continue;
      }
      await this.execute(job);
    }
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
