import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BaseJob, InMemoryJobQueue, InMemoryJobRegistry, LocalJobRunner, BackgroundService, calculateBackoff, generateJobId, PRIORITY_ORDER } from "../src/background/index.js";
import type { Job, JobHandler, JobStatus, JobPriority, IJobQueue, IJobRegistry } from "../src/background/index.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const createTestHandler = (): { handler: JobHandler; calls: number } => {
  let calls = 0;
  const handler: JobHandler = async () => {
    calls++;
  };
  return { handler, get calls() { return calls; } };
};

const createFailingHandler = (failCount: number): JobHandler => {
  let attempts = 0;
  return async () => {
    attempts++;
    if (attempts <= failCount) {
      throw new Error(`Simulated failure #${attempts}`);
    }
  };
};

const createJob = <T>(
  name: string,
  payload: T,
  handler: JobHandler<T>,
  options?: { priority?: JobPriority; maxRetries?: number; scheduledAt?: Date | null },
): Job<T> => {
  return new BaseJob(generateJobId(), name, payload, handler, options);
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 10));

// ─── Job Creation ────────────────────────────────────────────────────────────

describe("Job — Creation & Defaults", () => {
  it("creates a job with default options", () => {
    const { handler } = createTestHandler();
    const job = createJob("test-job", { hello: "world" }, handler);
    expect(job.id).toBeTruthy();
    expect(job.name).toBe("test-job");
    expect(job.payload).toEqual({ hello: "world" });
    expect(job.createdAt).toBeInstanceOf(Date);
    expect(job.priority).toBe("normal");
    expect(job.retryCount).toBe(0);
    expect(job.maxRetries).toBe(3);
    expect(job.status).toBe("pending");
    expect(job.scheduledAt).toBeNull();
  });

  it("creates a job with custom priority", () => {
    const { handler } = createTestHandler();
    const job = createJob("critical-job", {}, handler, { priority: "critical" });
    expect(job.priority).toBe("critical");
  });

  it("creates a job with custom maxRetries", () => {
    const { handler } = createTestHandler();
    const job = createJob("no-retry", {}, handler, { maxRetries: 0 });
    expect(job.maxRetries).toBe(0);
  });

  it("creates a job with scheduled delay", () => {
    const { handler } = createTestHandler();
    const future = new Date(Date.now() + 60_000);
    const job = createJob("delayed", {}, handler, { scheduledAt: future });
    expect(job.scheduledAt).toEqual(future);
  });

  it("generates unique IDs", () => {
    const { handler } = createTestHandler();
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateJobId());
    }
    expect(ids.size).toBe(100);
  });
});

describe("Job — Execution", () => {
  it("executes the handler and returns", async () => {
    let executed = false;
    const handler: JobHandler = async () => { executed = true; };
    const job = createJob("exec-test", {}, handler);
    await job.execute();
    expect(executed).toBe(true);
  });

  it("throws when handler throws", async () => {
    const handler: JobHandler = async () => { throw new Error("fail"); };
    const job = createJob("fail-test", {}, handler);
    await expect(job.execute()).rejects.toThrow("fail");
  });

  it("passes the job instance to the handler", async () => {
    let received: Job | undefined;
    const handler: JobHandler = async (j) => { received = j; };
    const job = createJob("self-ref", {}, handler);
    await job.execute();
    expect(received).toBe(job);
  });
});

// ─── Priority Ordering ───────────────────────────────────────────────────────

describe("InMemoryJobQueue — Priority Ordering", () => {
  let queue: InMemoryJobQueue;

  beforeEach(() => {
    queue = new InMemoryJobQueue();
  });

  it("dequeues critical before high", async () => {
    const { handler: h1 } = createTestHandler();
    const { handler: h2 } = createTestHandler();
    const low = createJob("normal", {}, h1, { priority: "high" });
    const high = createJob("critical", {}, h2, { priority: "critical" });
    await queue.enqueue(low);
    await queue.enqueue(high);
    const job = await queue.dequeue();
    expect(job?.priority).toBe("critical");
  });

  it("dequeues high before normal", async () => {
    const { handler: h1 } = createTestHandler();
    const { handler: h2 } = createTestHandler();
    await queue.enqueue(createJob("normal", {}, h1, { priority: "normal" }));
    await queue.enqueue(createJob("high", {}, h2, { priority: "high" }));
    const job = await queue.dequeue();
    expect(job?.priority).toBe("high");
  });

  it("dequeues normal before low", async () => {
    const { handler: h1 } = createTestHandler();
    const { handler: h2 } = createTestHandler();
    await queue.enqueue(createJob("low", {}, h1, { priority: "low" }));
    await queue.enqueue(createJob("normal", {}, h2, { priority: "normal" }));
    const job = await queue.dequeue();
    expect(job?.priority).toBe("normal");
  });

  it("respects FIFO within the same priority", async () => {
    const base = Date.now();
    const { handler: h1 } = createTestHandler();
    const { handler: h2 } = createTestHandler();
    const { handler: h3 } = createTestHandler();
    // Use explicit createdAt to control FIFO order deterministically
    const first = createJob("first", { seq: 1 }, h1, { priority: "normal", createdAt: new Date(base) });
    const second = createJob("second", { seq: 2 }, h2, { priority: "normal", createdAt: new Date(base + 10) });
    const third = createJob("third", { seq: 3 }, h3, { priority: "normal", createdAt: new Date(base + 20) });
    // Enqueue in non-chronological order
    await queue.enqueue(second);
    await queue.enqueue(first);
    await queue.enqueue(third);
    // Dequeue order should be chronological by createdAt (FIFO): first, second, third
    const j1 = await queue.dequeue();
    const j2 = await queue.dequeue();
    const j3 = await queue.dequeue();
    expect(j1!.id).toBe(first.id);
    expect(j2!.id).toBe(second.id);
    expect(j3!.id).toBe(third.id);
  });

  it("skips scheduled jobs until their time", async () => {
    const { handler } = createTestHandler();
    const future = new Date(Date.now() + 60_000);
    const job = createJob("future", {}, handler, { scheduledAt: future });
    await queue.enqueue(job);
    const dequeued = await queue.dequeue();
    expect(dequeued).toBeNull();
  });

  it("returns scheduled job after its time", async () => {
    const { handler } = createTestHandler();
    const past = new Date(Date.now() - 1_000);
    const job = createJob("past", {}, handler, { scheduledAt: past });
    await queue.enqueue(job);
    const dequeued = await queue.dequeue();
    expect(dequeued).not.toBeNull();
    expect(dequeued!.id).toBe(job.id);
  });
});

// ─── Job Lifecycle ───────────────────────────────────────────────────────────

describe("Job — Lifecycle", () => {
  it("transitions from pending → running → completed on success", async () => {
    const { handler } = createTestHandler();
    const job = createJob("lifecycle", {}, handler);
    expect(job.status).toBe("pending");
    job.status = "running";
    expect(job.status).toBe("running");
    await job.execute();
    job.status = "completed";
    expect(job.status).toBe("completed");
  });

  it("transitions to failed when handler throws and no retries left", async () => {
    const handler = createFailingHandler(1);
    const job = createJob("fail-once", {}, handler, { maxRetries: 0 });
    job.status = "running";
    await expect(job.execute()).rejects.toThrow();
    job.status = "failed";
    expect(job.status).toBe("failed");
  });
});

// ─── Queue Operations ────────────────────────────────────────────────────────

describe("InMemoryJobQueue — Queue Operations", () => {
  let queue: InMemoryJobQueue;

  beforeEach(() => {
    queue = new InMemoryJobQueue();
  });

  it("reports empty when no jobs exist", async () => {
    expect(await queue.isEmpty()).toBe(true);
    expect(await queue.size()).toBe(0);
  });

  it("reports non-empty after enqueue", async () => {
    const { handler } = createTestHandler();
    await queue.enqueue(createJob("test", {}, handler));
    expect(await queue.isEmpty()).toBe(false);
    expect(await queue.size()).toBe(1);
  });

  it("dequeues in priority order", async () => {
    const { handler: h1 } = createTestHandler();
    const { handler: h2 } = createTestHandler();
    await queue.enqueue(createJob("low", {}, h1, { priority: "low" }));
    await queue.enqueue(createJob("high", {}, h2, { priority: "high" }));
    const job = await queue.dequeue();
    expect(job!.priority).toBe("high");
    expect(await queue.size()).toBe(1);
  });

  it("returns null when queue is empty", async () => {
    expect(await queue.dequeue()).toBeNull();
  });

  it("lists pending jobs", async () => {
    const { handler: h1 } = createTestHandler();
    const { handler: h2 } = createTestHandler();
    await queue.enqueue(createJob("a", {}, h1));
    await queue.enqueue(createJob("b", {}, h2));
    const pending = await queue.pending();
    expect(pending).toHaveLength(2);
  });
});

// ─── Cancellation ────────────────────────────────────────────────────────────

describe("InMemoryJobQueue — Cancellation", () => {
  it("cancels a pending job", async () => {
    const queue = new InMemoryJobQueue();
    const { handler } = createTestHandler();
    const job = createJob("cancel-me", {}, handler);
    await queue.enqueue(job);
    const result = await queue.cancel(job.id);
    expect(result).toBe(true);
    expect(job.status).toBe("cancelled");
    expect(await queue.isEmpty()).toBe(true);
  });

  it("returns false when job not found", async () => {
    const queue = new InMemoryJobQueue();
    const result = await queue.cancel("nonexistent");
    expect(result).toBe(false);
  });

  it("cannot cancel a non-pending job (already dequeued)", async () => {
    const queue = new InMemoryJobQueue();
    const { handler } = createTestHandler();
    const job = createJob("gone", {}, handler);
    await queue.enqueue(job);
    await queue.dequeue();
    const result = await queue.cancel(job.id);
    expect(result).toBe(false);
  });
});

// ─── Retry & Backoff ─────────────────────────────────────────────────────────

describe("Retry Policy — Exponential Backoff", () => {
  it("calculates backoff correctly", () => {
    expect(calculateBackoff(1)).toBe(1_000);
    expect(calculateBackoff(2)).toBe(2_000);
    expect(calculateBackoff(3)).toBe(4_000);
    expect(calculateBackoff(4)).toBe(8_000);
    expect(calculateBackoff(5)).toBe(16_000);
  });

  it("caps backoff at 30 seconds", () => {
    expect(calculateBackoff(6)).toBe(30_000);
    expect(calculateBackoff(10)).toBe(30_000);
  });

  it("uses custom base delay", () => {
    expect(calculateBackoff(1, 500)).toBe(500);
    expect(calculateBackoff(2, 500)).toBe(1_000);
    expect(calculateBackoff(3, 500)).toBe(2_000);
  });
});

describe("LocalJobRunner — Retry Logic", () => {
  it("retries on failure and increments retryCount", async () => {
    const queue = new InMemoryJobQueue();
    const runner = new LocalJobRunner(queue);
    const handler = createFailingHandler(1);
    const job = createJob("retry-test", {}, handler, { maxRetries: 3 });
    await queue.enqueue(job);
    await runner.execute(job);
    expect(job.retryCount).toBe(1);
    // Job is reset to pending so the queue can pick it up again
    expect(job.status).toBe("pending");
    expect(job.scheduledAt).not.toBeNull();
  });

  it("marks as failed after exhausting retries", async () => {
    const queue = new InMemoryJobQueue();
    const runner = new LocalJobRunner(queue);
    const handler = createFailingHandler(99);
    const job = createJob("exhausted", {}, handler, { maxRetries: 2 });
    // Simulate 2 retries already used
    job.retryCount = 2;
    await runner.execute(job);
    expect(job.status).toBe("failed");
    expect(job.retryCount).toBe(2);
  });

  it("re-enqueues the job on retry", async () => {
    const queue = new InMemoryJobQueue();
    const runner = new LocalJobRunner(queue);
    const handler = createFailingHandler(1);
    const job = createJob("re-enqueue", {}, handler, { maxRetries: 3 });
    // Dequeue first (as the runner loop would), then simulate retry
    await queue.enqueue(job);
    const dequeued = await queue.dequeue();
    expect(dequeued).not.toBeNull();
    expect(await queue.size()).toBe(0);
    await runner.execute(job);
    // Should be re-enqueued once
    expect(await queue.size()).toBe(1);
    // Clear scheduledAt so dequeue can pick it up (backoff set it in the future)
    job.scheduledAt = null;
    const reQueued = await queue.dequeue();
    expect(reQueued).not.toBeNull();
    expect(reQueued!.retryCount).toBe(1);
  });

  it("calls onRetrying callback when retrying", async () => {
    const queue = new InMemoryJobQueue();
    const onRetrying = vi.fn();
    const runner = new LocalJobRunner(queue, { onRetrying });
    const handler = createFailingHandler(1);
    const job = createJob("retry-cb", {}, handler, { maxRetries: 3 });
    await queue.enqueue(job);
    await runner.execute(job);
    expect(onRetrying).toHaveBeenCalledWith(job);
  });

  it("calls onFailed callback when max retries exhausted", async () => {
    const queue = new InMemoryJobQueue();
    const onFailed = vi.fn();
    const runner = new LocalJobRunner(queue, { onFailed });
    const handler = createFailingHandler(99);
    const job = createJob("fail-cb", {}, handler, { maxRetries: 2 });
    job.retryCount = 2;
    await runner.execute(job);
    expect(onFailed).toHaveBeenCalledWith(job);
  });

  it("calls onComplete callback on success", async () => {
    const queue = new InMemoryJobQueue();
    const onComplete = vi.fn();
    const runner = new LocalJobRunner(queue, { onComplete });
    const { handler } = createTestHandler();
    const job = createJob("success-cb", {}, handler);
    await queue.enqueue(job);
    await runner.execute(job);
    expect(onComplete).toHaveBeenCalledWith(job);
    expect(job.status).toBe("completed");
  });
});

// ─── Runner ──────────────────────────────────────────────────────────────────

describe("LocalJobRunner — Lifecycle", () => {
  it("starts and processes queued jobs", async () => {
    const queue = new InMemoryJobQueue();
    const onComplete = vi.fn();
    const runner = new LocalJobRunner(queue, { onComplete });
    const { handler } = createTestHandler();
    const job = createJob("runner-start", {}, handler);
    await queue.enqueue(job);
    runner.start();
    expect(runner.isRunning).toBe(true);
    // Wait a short time for processing
    await flushPromises();
    await runner.stop();
    expect(onComplete).toHaveBeenCalled();
  });

  it("stops processing after stop()", async () => {
    const queue = new InMemoryJobQueue();
    const runner = new LocalJobRunner(queue);
    runner.start();
    await runner.stop();
    expect(runner.isRunning).toBe(false);
  });

  it("does not start twice", () => {
    const queue = new InMemoryJobQueue();
    const runner = new LocalJobRunner(queue);
    runner.start();
    runner.start(); // no-op
    expect(runner.isRunning).toBe(true);
    runner.stop();
  });
});

// ─── Registry ────────────────────────────────────────────────────────────────

describe("InMemoryJobRegistry — Registration", () => {
  let registry: InMemoryJobRegistry;

  beforeEach(() => {
    registry = new InMemoryJobRegistry();
  });

  it("registers and resolves a handler", () => {
    const handler: JobHandler = async () => {};
    registry.register("test-job", handler);
    expect(registry.has("test-job")).toBe(true);
    expect(registry.resolve("test-job")).toBe(handler);
  });

  it("returns undefined for unregistered job", () => {
    expect(registry.resolve("nonexistent")).toBeUndefined();
    expect(registry.has("nonexistent")).toBe(false);
  });

  it("throws on duplicate registration", () => {
    const handler: JobHandler = async () => {};
    registry.register("dup", handler);
    expect(() => registry.register("dup", handler)).toThrow(
      "Handler already registered for job: dup",
    );
  });

  it("lists registered names", () => {
    registry.register("a", async () => {});
    registry.register("b", async () => {});
    const names = registry.names();
    expect(names).toContain("a");
    expect(names).toContain("b");
    expect(names).toHaveLength(2);
  });
});

// ─── BackgroundService ───────────────────────────────────────────────────────

describe("BackgroundService — Full Integration", () => {
  let service: BackgroundService;

  beforeEach(() => {
    service = new BackgroundService();
  });

  afterEach(async () => {
    await service.stop();
  });

  it("enqueue creates a job with the registered handler", () => {
    const handler: JobHandler = async () => {};
    service.getRegistry().register("my-job", handler);
    const job = service.enqueue("my-job", { data: 42 });
    expect(job.name).toBe("my-job");
    expect(job.payload).toEqual({ data: 42 });
    expect(job.status).toBe("pending");
  });

  it("enqueue throws for unregistered handler", () => {
    expect(() => service.enqueue("unknown", {})).toThrow(
      "No handler registered for job: unknown",
    );
  });

  it("cancels a pending job", async () => {
    service.getRegistry().register("cancel-test", async () => {});
    const job = service.enqueue("cancel-test", {});
    const result = await service.cancel(job.id);
    expect(result).toBe(true);
    expect(job.status).toBe("cancelled");
  });

  it("starts and stops", async () => {
    service.start();
    expect(service.isRunning).toBe(true);
    await service.stop();
    expect(service.isRunning).toBe(false);
  });

  it("processes a job end-to-end via the runner", async () => {
    let executed = false;
    service.getRegistry().register("e2e", async () => { executed = true; });
    service.enqueue("e2e", {});
    service.start();
    await new Promise((r) => setTimeout(r, 100));
    await service.stop();
    expect(executed).toBe(true);
  });

  it("tracks completed jobs after runner execution", async () => {
    const svc = new BackgroundService();
    svc.getRegistry().register("track", async () => {});
    svc.enqueue("track", {});
    svc.start();
    await new Promise((r) => setTimeout(r, 100));
    await svc.stop();
    expect(svc.getCompletedJobs().length).toBeGreaterThanOrEqual(1);
    expect(svc.getCompletedJobs()[0].status).toBe("completed");
  });
});

describe("BackgroundService — Full Lifecycle Integration", () => {
  it("completes a job and adds it to completed list", async () => {
    const service = new BackgroundService();
    service.getRegistry().register("lifecycle", async () => {});
    const job = service.enqueue("lifecycle", {});
    service.start();
    await new Promise((r) => setTimeout(r, 100));
    await service.stop();
    expect(job.status).toBe("completed");
    expect(service.getCompletedJobs().length).toBeGreaterThanOrEqual(1);
  });

  it("fails a job after exhausting retries", async () => {
    const service = new BackgroundService();
    const failingHandler: JobHandler = async () => {
      throw new Error("always fails");
    };
    service.getRegistry().register("always-fail", failingHandler);
    // maxRetries=0 means immediate failure, no retry scheduling delay
    service.enqueue("always-fail", {}, { maxRetries: 0 });
    service.start();
    await new Promise((r) => setTimeout(r, 100));
    await service.stop();
    const failed = service.getFailedJobs();
    expect(failed.length).toBeGreaterThanOrEqual(1);
    expect(failed[0].status).toBe("failed");
  });

  it("handles multiple jobs with priority ordering", async () => {
    const service = new BackgroundService();
    const order: string[] = [];
    service.getRegistry().register("low-prio", async () => { order.push("low"); });
    service.getRegistry().register("high-prio", async () => { order.push("high"); });
    service.enqueue("low-prio", {}, { priority: "low" });
    service.enqueue("high-prio", {}, { priority: "high" });
    service.start();
    await new Promise((r) => setTimeout(r, 100));
    await service.stop();
    expect(order).toEqual(["high", "low"]);
  });

  it("supports dependency injection with custom queue and registry", () => {
    class CustomQueue extends InMemoryJobQueue {
      readonly marker = "custom";
    }
    class CustomRegistry extends InMemoryJobRegistry {
      readonly marker = "custom";
    }
    const customQueue = new CustomQueue();
    const customRegistry = new CustomRegistry();
    const svc = new BackgroundService({ queue: customQueue, registry: customRegistry });
    expect((svc.getQueue() as CustomQueue).marker).toBe("custom");
    expect((svc.getRegistry() as CustomRegistry).marker).toBe("custom");
  });
});

// ─── PRIORITY_ORDER ──────────────────────────────────────────────────────────

describe("PRIORITY_ORDER", () => {
  it("has the correct ordering", () => {
    expect(PRIORITY_ORDER.critical).toBeLessThan(PRIORITY_ORDER.high);
    expect(PRIORITY_ORDER.high).toBeLessThan(PRIORITY_ORDER.normal);
    expect(PRIORITY_ORDER.normal).toBeLessThan(PRIORITY_ORDER.low);
  });
});
