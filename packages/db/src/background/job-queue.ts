import { type Job, PRIORITY_ORDER } from "./job";

// ─── Interface ───────────────────────────────────────────────────────────────

export interface IJobQueue {
  enqueue(job: Job): Promise<void>;
  dequeue(): Promise<Job | null>;
  cancel(jobId: string): Promise<boolean>;
  pending(): Promise<Job[]>;
  isEmpty(): Promise<boolean>;
  size(): Promise<number>;
}

// ─── In-Memory Implementation ────────────────────────────────────────────────

/**
 * In-memory priority queue for background jobs.
 *
 * Maintains jobs sorted by priority (critical → high → normal → low)
 * and FIFO within the same priority level.
 *
 * Supports delayed execution via `scheduledAt` — jobs with a future
 * `scheduledAt` are skipped by `dequeue()` until the time elapses.
 */
export class InMemoryJobQueue implements IJobQueue {
  private _jobs: Job[] = [];

  async enqueue(job: Job): Promise<void> {
    this._jobs.push(job);
    this._sort();
  }

  async dequeue(): Promise<Job | null> {
    const now = Date.now();
    const idx = this._jobs.findIndex(
      (j) =>
        j.status === "pending" &&
        (!j.scheduledAt || j.scheduledAt.getTime() <= now),
    );
    if (idx === -1) return null;
    const [job] = this._jobs.splice(idx, 1);
    return job ?? null;
  }

  async cancel(jobId: string): Promise<boolean> {
    const idx = this._jobs.findIndex(
      (j) => j.id === jobId && j.status === "pending",
    );
    if (idx === -1) return false;
    const job = this._jobs[idx]!;
    job.status = "cancelled";
    this._jobs.splice(idx, 1);
    return true;
  }

  async pending(): Promise<Job[]> {
    return this._jobs.filter((j) => j.status === "pending");
  }

  async isEmpty(): Promise<boolean> {
    return this._jobs.length === 0;
  }

  async size(): Promise<number> {
    return this._jobs.length;
  }

  private _sort(): void {
    this._jobs.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority];
      const pb = PRIORITY_ORDER[b.priority];
      if (pa !== pb) return pa - pb;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }
}
