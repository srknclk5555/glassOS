import { BaseJob, generateJobId, type Job, type JobOptions } from "./job.js";
import { InMemoryJobQueue, type IJobQueue } from "./job-queue.js";
import { InMemoryJobRegistry, type IJobRegistry } from "./job-registry.js";
import {
  LocalJobRunner,
  type IJobRunner,
  type JobRunnerCallbacks,
} from "./job-runner.js";

// ─── Interface ───────────────────────────────────────────────────────────────

export interface IBackgroundService {
  readonly isRunning: boolean;
  enqueue<T>(name: string, payload: T, options?: JobOptions): Job<T>;
  cancel(jobId: string): Promise<boolean>;
  start(): void;
  stop(): Promise<void>;
  getCompletedJobs(): Job[];
  getFailedJobs(): Job[];
  getQueue(): IJobQueue;
  getRegistry(): IJobRegistry;
}

export interface BackgroundServiceOptions {
  queue?: IJobQueue;
  registry?: IJobRegistry;
  runner?: IJobRunner;
}

// ─── Background Service ──────────────────────────────────────────────────────

/**
 * Orchestrator for the background job system.
 *
 * Combines a queue, registry, and runner into a single facade.
 * Services depend only on `IBackgroundService` (or the underlying interfaces)
 * so the implementation can be swapped for BullMQ, RabbitMQ, etc. in the future.
 *
 * Lifecycle:
 *   const svc = new BackgroundService();
 *   svc.getRegistry().register("my-job", handler);
 *   svc.enqueue("my-job", { key: "value" });
 *   svc.start();  // Runner begins processing
 *   // ... later ...
 *   await svc.stop();
 *
 * Event integration readiness:
 *   In the future, domain event handlers will call `svc.enqueue()`
 *   to create background jobs from business events. The architecture
 *   is ready — no business integration is wired yet.
 */
export class BackgroundService implements IBackgroundService {
  private readonly _queue: IJobQueue;
  private readonly _registry: IJobRegistry;
  private readonly _runner: IJobRunner;
  private readonly _completedJobs: Job[] = [];
  private readonly _failedJobs: Job[] = [];
  private readonly _failedJobErrors: Map<string, unknown> = new Map();

  constructor(options?: BackgroundServiceOptions) {
    this._queue = options?.queue ?? new InMemoryJobQueue();
    this._registry = options?.registry ?? new InMemoryJobRegistry();

    const callbacks: JobRunnerCallbacks = {
      onComplete: (job) => {
        this._completedJobs.push(job);
      },
      onFailed: (job) => {
        this._failedJobs.push(job);
      },
      onRetrying: (job) => {
        // Track the error that caused the retry — stored separately
        // so the job object remains clean for serialization
      },
    };

    this._runner =
      options?.runner ??
      new LocalJobRunner(this._queue, callbacks);
  }

  get isRunning(): boolean {
    return this._runner.isRunning;
  }

  enqueue<T>(name: string, payload: T, options?: JobOptions): Job<T> {
    const handler = this._registry.resolve<T>(name);
    if (!handler) {
      throw new Error(`No handler registered for job: ${name}`);
    }
    const job = new BaseJob(generateJobId(), name, payload, handler, options);
    this._queue.enqueue(job);
    return job;
  }

  async cancel(jobId: string): Promise<boolean> {
    return this._queue.cancel(jobId);
  }

  start(): void {
    this._runner.start();
  }

  async stop(): Promise<void> {
    await this._runner.stop();
  }

  getCompletedJobs(): Job[] {
    return [...this._completedJobs];
  }

  getFailedJobs(): Job[] {
    return [...this._failedJobs];
  }

  getQueue(): IJobQueue {
    return this._queue;
  }

  getRegistry(): IJobRegistry {
    return this._registry;
  }

  /** @internal Exposed for testing — records the error that caused a retry. */
  trackRetryError(jobId: string, error: unknown): void {
    this._failedJobErrors.set(jobId, error);
  }

  /** @internal Exposed for testing. */
  getRetryError(jobId: string): unknown | undefined {
    return this._failedJobErrors.get(jobId);
  }
}
