import { type JobHandler } from "./job.js";

// ─── Interface ───────────────────────────────────────────────────────────────

export interface IJobRegistry {
  register<T>(name: string, handler: JobHandler<T>): void;
  resolve<T>(name: string): JobHandler<T> | undefined;
  has(name: string): boolean;
  names(): string[];
}

// ─── In-Memory Implementation ────────────────────────────────────────────────

export class InMemoryJobRegistry implements IJobRegistry {
  private readonly _handlers = new Map<string, JobHandler>();

  register<T>(name: string, handler: JobHandler<T>): void {
    if (this._handlers.has(name)) {
      throw new Error(`Handler already registered for job: ${name}`);
    }
    this._handlers.set(name, handler as JobHandler);
  }

  resolve<T>(name: string): JobHandler<T> | undefined {
    return this._handlers.get(name) as JobHandler<T> | undefined;
  }

  has(name: string): boolean {
    return this._handlers.has(name);
  }

  names(): string[] {
    return Array.from(this._handlers.keys());
  }
}
