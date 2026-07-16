# Background Job Architecture

> **Version:** 1.0  
> **Last Updated:** 2026-07-16 (Sprint 2.6.6)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Job Model](#2-job-model)
3. [Module Structure](#3-module-structure)
4. [Job Lifecycle](#4-job-lifecycle)
5. [Execution Flow](#5-execution-flow)
6. [Priority System](#6-priority-system)
7. [Retry Policy](#7-retry-policy)
8. [Dependency Injection](#8-dependency-injection)
9. [Scheduling](#9-scheduling)
10. [Event Integration Readiness](#10-event-integration-readiness)
11. [Future Worker Architecture](#11-future-worker-architecture)
12. [Future Distributed Processing](#12-future-distributed-processing)

---

## 1. Overview

GlassOS Background Job Architecture provides a production-ready foundation for asynchronous job processing. This sprint establishes the infrastructure only — no business jobs are implemented yet.

### Design Principles

| Principle                | Description                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **Interface-first**      | All components depend on interfaces, not concrete implementations.                                                        |
| **Pluggable backends**   | Queue and runner can be swapped for BullMQ, RabbitMQ, Temporal, etc. without changing service code.                       |
| **In-memory by default** | Current implementation keeps all state in memory. Architecture supports persistent storage via interface implementations. |
| **Single process**       | The local runner operates in a single process. Distributed workers are a future concern.                                  |
| **Transaction safety**   | Job state transitions are explicit and tracked. Failed jobs never disappear silently.                                     |

### Current Status

| Component                        | Status           |
| -------------------------------- | ---------------- |
| Job model & BaseJob              | ✅ Complete      |
| InMemoryJobQueue                 | ✅ Complete      |
| InMemoryJobRegistry              | ✅ Complete      |
| LocalJobRunner (in-process)      | ✅ Complete      |
| BackgroundService (orchestrator) | ✅ Complete      |
| Retry with exponential backoff   | ✅ Complete      |
| Cancel before execution          | ✅ Complete      |
| Priority ordering (4 levels)     | ✅ Complete      |
| Scheduled/delayed execution      | ✅ Complete      |
| Persistent storage               | 🔜 Future sprint |
| Distributed workers              | 🔜 Future sprint |
| Cron / recurring jobs            | 🔜 Future sprint |
| Business job implementations     | 🔜 Future sprint |

---

## 2. Job Model

Every background job exposes the following structure:

```typescript
interface Job<T = unknown> {
  id: string; // Unique ULID-like identifier
  name: string; // Job type name (e.g. "erp.sync-order")
  payload: T; // Type-safe job data
  createdAt: Date; // Creation timestamp
  priority: JobPriority; // low | normal | high | critical
  retryCount: number; // Current retry attempt
  maxRetries: number; // Maximum retry attempts
  status: JobStatus; // Current lifecycle status
  scheduledAt: Date | null; // Delayed execution timestamp
  execute(): Promise<void>; // Execute the job handler
}
```

### Status Values

| Status      | Description                             |
| ----------- | --------------------------------------- |
| `pending`   | Job is queued and waiting for execution |
| `running`   | Job is currently being executed         |
| `completed` | Job finished successfully               |
| `failed`    | Job exhausted all retry attempts        |
| `cancelled` | Job was cancelled before execution      |
| `retrying`  | Job failed and is being retried         |

### Priority Values

| Priority   | Order       |
| ---------- | ----------- |
| `critical` | 0 (highest) |
| `high`     | 1           |
| `normal`   | 2 (default) |
| `low`      | 3           |

---

## 3. Module Structure

```
packages/db/src/background/
├── job.ts                   # Job interface, BaseJob, enums, utilities
├── job-queue.ts             # IJobQueue interface + InMemoryJobQueue
├── job-registry.ts          # IJobRegistry interface + InMemoryJobRegistry
├── job-runner.ts            # IJobRunner interface + LocalJobRunner
├── background-service.ts    # IBackgroundService facade + BackgroundService
└── index.ts                 # Barrel exports
```

### File Responsibilities

| File                    | Exports                                                                                                                             | Purpose                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `job.ts`                | `Job`, `BaseJob`, `JobHandler`, `JobOptions`, `JobStatus`, `JobPriority`, `PRIORITY_ORDER`, `generateJobId()`, `calculateBackoff()` | Core domain model and utilities                  |
| `job-queue.ts`          | `IJobQueue`, `InMemoryJobQueue`                                                                                                     | Queue contract and in-memory priority queue      |
| `job-registry.ts`       | `IJobRegistry`, `InMemoryJobRegistry`                                                                                               | Handler registration and resolution              |
| `job-runner.ts`         | `IJobRunner`, `LocalJobRunner`, `JobRunnerCallbacks`                                                                                | In-process execution with retry logic            |
| `background-service.ts` | `IBackgroundService`, `BackgroundService`, `BackgroundServiceOptions`                                                               | Orchestrator: combines queue + registry + runner |
| `index.ts`              | All public exports                                                                                                                  | Barrel for clean imports                         |

---

## 4. Job Lifecycle

```
                  ┌──────────────┐
                  │   pending    │
                  └──────┬───────┘
                         │ dequeue
                         ▼
                  ┌──────────────┐
         ┌───────│   running    │───────┐
         │       └──────┬───────┘       │
         │              │               │
    on success    on failure            │
         │         (retries <           │
         │          maxRetries)         │
         ▼              │               ▼
  ┌────────────┐        │       ┌──────────────┐
  │ completed  │        │       │  cancelled   │
  └────────────┘        │       └──────────────┘
                        ▼
                 ┌──────────────┐
                 │  retrying    │
                 │  (backoff)   │
                 └──────┬───────┘
                        │ re-enqueue
                        ▼
                 ┌──────────────┐
                 │   pending    │ (back to start)
                 └──────────────┘

  ... after maxRetries exhausted:

                  ┌──────────────┐
    on failure    │    failed    │
    (retries >=   │              │
     maxRetries)  └──────────────┘
```

---

## 5. Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      BackgroundService                          │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────────┐  │
│  │ JobRegistry  │  │   JobQueue     │  │    JobRunner       │  │
│  │              │  │                │  │                    │  │
│  │ register()   │  │ enqueue()      │  │ start() → runLoop  │  │
│  │ resolve()    │  │ dequeue()      │  │ execute(job)       │  │
│  │ has()        │  │ cancel()       │  │ stop()             │  │
│  └──────┬───────┘  └───────┬────────┘  └─────────┬──────────┘  │
└─────────┼──────────────────┼─────────────────────┼─────────────┘
          │                  │                     │
          ▼                  ▼                     ▼
   Stores handlers    Priority queue        In-process executor
   by job name        (in-memory)           with retry + backoff
```

### Step-by-Step

1. **Registration**: A job handler is registered with the registry by name.

   ```typescript
   registry.register("my-job", async (job) => {
     /* ... */
   });
   ```

2. **Enqueue**: A job is created and queued via the BackgroundService.

   ```typescript
   service.enqueue("my-job", { data: "..." }, { priority: "high" });
   ```

3. **Dequeue**: The runner loop polls the queue for pending jobs, respecting priority and scheduled time.

4. **Execution**: The runner calls `job.execute()`, which invokes the registered handler.

5. **Completion**: On success, the job status is set to `completed`.

6. **Retry (on failure)**: If `retryCount < maxRetries`, the job is re-enqueued with exponential backoff.

7. **Failure**: After exhausting retries, the job status is set to `failed` and tracked for observability.

---

## 6. Priority System

The queue maintains strict priority ordering:

1. Jobs are sorted by priority level (critical → high → normal → low).
2. Within the same priority, jobs are processed in FIFO order (by `createdAt`).
3. Priority is set at enqueue time via `JobOptions.priority` and defaults to `normal`.

```typescript
const PRIORITY_ORDER: Record<JobPriority, number> = {
  critical: 0, // Highest — processed first
  high: 1,
  normal: 2, // Default
  low: 3, // Lowest
};
```

---

## 7. Retry Policy

### Configuration

Each job specifies its maximum retry count via `JobOptions.maxRetries` (default: 3).

### Exponential Backoff

```typescript
function calculateBackoff(retryCount: number, baseDelayMs = 1000): number {
  return Math.min(baseDelayMs * Math.pow(2, retryCount - 1), 30_000);
}
```

| Retry # | Delay        |
| ------- | ------------ |
| 1       | 1s           |
| 2       | 2s           |
| 3       | 4s           |
| 4       | 8s           |
| 5       | 16s          |
| 6+      | 30s (capped) |

### Safety Guarantees

- **Failed jobs never disappear silently**: The `BackgroundService` tracks all failed jobs via `getFailedJobs()`.
- **Callbacks**: The `LocalJobRunner` invokes `onFailed`, `onComplete`, and `onRetrying` callbacks for monitoring.
- **Observability**: Completed and failed job lists are accessible for inspection and alerting.

---

## 8. Dependency Injection

All components depend on interfaces, allowing backend swaps without changing service code.

```typescript
// Current (in-memory)
const service = new BackgroundService();

// Future (BullMQ)
const service = new BackgroundService({
  queue: new BullMQQueue("redis://..."),
  registry: new InMemoryJobRegistry(),
  runner: new BullMQWorker(),
});
```

### Supported Interface Contracts

| Interface      | Current Implementation | Future Implementations                             |
| -------------- | ---------------------- | -------------------------------------------------- |
| `IJobQueue`    | `InMemoryJobQueue`     | BullMQ Queue, RabbitMQ Queue, Azure Queue, AWS SQS |
| `IJobRegistry` | `InMemoryJobRegistry`  | Persistent registry (DB-backed)                    |
| `IJobRunner`   | `LocalJobRunner`       | BullMQ Worker, RabbitMQ Consumer, Temporal Worker  |

---

## 9. Scheduling

### Run Now (default)

Jobs are enqueued with no delay and processed as soon as a runner is available.

```typescript
service.enqueue("my-job", payload); // processed immediately
```

### Delayed Execution

Jobs can be scheduled for future execution using `scheduledAt`:

```typescript
const future = new Date(Date.now() + 60_000); // 1 minute from now
service.enqueue("my-job", payload, { scheduledAt: future });
```

The queue skips scheduled jobs until their `scheduledAt` time has elapsed.

### Recurring / Cron (Future)

The scheduling interface supports recurring jobs architecturally but no cron implementation exists yet.

---

## 10. Event Integration Readiness

The BackgroundService is architected to receive domain events from the EventPublisher infrastructure. In a future sprint:

1. Domain event handlers will call `service.enqueue()` to create background jobs.
2. This decouples event publishing from job processing.
3. No business event integration is wired in Sprint 2.6.6 — only the architecture is ready.

```typescript
// Future pattern:
eventPublisher.onPublish(async (event) => {
  if (event.eventType === "order.approved") {
    await backgroundService.enqueue(
      "erp.sync-order",
      { orderId: event.orderId },
      { priority: "high" },
    );
  }
});
```

---

## 11. Future Worker Architecture

When moving beyond the local in-process runner, the architecture supports:

- **Dedicated worker process**: A separate Node.js process runs the runner loop, independent of the API server.
- **Graceful shutdown**: Workers drain active jobs before stopping.
- **Concurrency control**: Configurable parallelism (currently single-process, concurrency=1).
- **Health checks**: Workers report liveness and job processing rates.

---

## 12. Future Distributed Processing

The interface-based design supports distributed backends without service changes:

### BullMQ (Redis-based)

```typescript
class BullMQQueue implements IJobQueue {
  constructor(private readonly queue: BullMQ.Queue) {}
  async enqueue(job: Job): Promise<void> {
    await this.queue.add(job.name, job.payload, {
      priority: PRIORITY_ORDER[job.priority],
      attempts: job.maxRetries,
      backoff: { type: "exponential", delay: 1000 },
    });
  }
  // ...
}
```

### RabbitMQ

```typescript
class RabbitMQQueue implements IJobQueue {
  constructor(private readonly channel: amqp.Channel) {}
  async enqueue(job: Job): Promise<void> {
    this.channel.sendToQueue("jobs", Buffer.from(JSON.stringify(job)));
  }
  // ...
}
```

### AWS SQS

```typescript
class SQSQueue implements IJobQueue {
  constructor(
    private readonly sqs: AWS.SQS,
    private readonly queueUrl: string,
  ) {}
  async enqueue(job: Job): Promise<void> {
    await this.sqs
      .sendMessage({ QueueUrl: this.queueUrl, MessageBody: JSON.stringify(job) })
      .promise();
  }
  // ...
}
```

### Temporal

```typescript
class TemporalRunner implements IJobRunner {
  constructor(private readonly client: Temporal.Client) {}
  async execute(job: Job): Promise<void> {
    await this.client.workflow.start("jobWorkflow", { args: [job] });
  }
  // ...
}
```

---

## 13. Current Limitations

| Limitation         | Reason                     | Future Resolution                              |
| ------------------ | -------------------------- | ---------------------------------------------- |
| In-memory only     | No database tables created | Implement `IJobQueue` with Drizzle persistence |
| Single process     | No distributed workers     | BullMQ / Temporal integration                  |
| Polling-based loop | Simple implementation      | Event-driven dequeue (pub/sub)                 |
| No cron            | Architecture only          | Recurring job scheduler                        |
| No business jobs   | Foundation sprint only     | Implement in Sprint 2.6.7+                     |
