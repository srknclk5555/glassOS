import { describe, expect, it, beforeEach } from "vitest";
import { InMemoryEventPublisher } from "../src/events/in-memory-event-publisher.js";
import { LocalEventPublisher } from "../src/events/local-event-publisher.js";
import type { DomainEvent } from "../src/services/events.js";

// ─── Test Fixtures ──────────────────────────────────────────────────────────

const createSampleEvent = (overrides: Partial<DomainEvent> = {}): DomainEvent => ({
  eventType: "order.approved",
  orderId: "01ORDER000000000000000001",
  orderNumber: "ORD-2026-001",
  customerId: "01CUST000000000000000001",
  approvedAt: new Date("2026-07-16"),
  lineCount: 3,
  ...overrides,
});

const createSecondEvent = (): DomainEvent => ({
  eventType: "queue.created",
  queueId: "01QUEUE00000000000000001",
  stationId: "01STAT000000000000000001",
  operationCode: "cutting",
  createdAt: new Date("2026-07-16"),
});

// ─── InMemoryEventPublisher Tests ───────────────────────────────────────────

describe("InMemoryEventPublisher", () => {
  let publisher: InMemoryEventPublisher;

  beforeEach(() => {
    publisher = new InMemoryEventPublisher();
  });

  describe("publish()", () => {
    it("stores a published event", async () => {
      const event = createSampleEvent();
      await publisher.publish(event);

      expect(publisher.events).toHaveLength(1);
      expect(publisher.events[0]).toBe(event);
    });

    it("stores multiple events in order", async () => {
      const event1 = createSampleEvent();
      const event2 = createSecondEvent();

      await publisher.publish(event1);
      await publisher.publish(event2);

      expect(publisher.events).toHaveLength(2);
      expect(publisher.events[0].eventType).toBe("order.approved");
      expect(publisher.events[1].eventType).toBe("queue.created");
    });

    it("increments publishCount on each call", async () => {
      await publisher.publish(createSampleEvent());
      expect(publisher.publishCount).toBe(1);

      await publisher.publish(createSecondEvent());
      expect(publisher.publishCount).toBe(2);
    });
  });

  describe("publishMany()", () => {
    it("stores all events from the array", async () => {
      const event1 = createSampleEvent();
      const event2 = createSecondEvent();

      await publisher.publishMany([event1, event2]);

      expect(publisher.events).toHaveLength(2);
      expect(publisher.eventCount).toBe(2);
    });

    it("counts publishMany as a single publish action", async () => {
      await publisher.publishMany([createSampleEvent(), createSecondEvent()]);

      expect(publisher.publishCount).toBe(1);
      expect(publisher.eventCount).toBe(2);
    });

    it("handles empty array", async () => {
      await publisher.publishMany([]);

      expect(publisher.eventCount).toBe(0);
      expect(publisher.publishCount).toBe(1);
    });

    it("preserves event order", async () => {
      const event1 = createSampleEvent({ orderId: "first" });
      const event2 = createSampleEvent({ orderId: "second" } as any);
      const event3 = createSampleEvent({ orderId: "third" } as any);

      await publisher.publishMany([event1, event2, event3]);

      expect(publisher.events[0].orderId).toBe("first");
      expect(publisher.events[1].orderId).toBe("second");
      expect(publisher.events[2].orderId).toBe("third");
    });
  });

  describe("ofType<T>()", () => {
    it("returns events matching the specified type", async () => {
      await publisher.publish(createSampleEvent());
      await publisher.publish(createSecondEvent());

      const approved = publisher.ofType<DomainEvent & { orderId: string }>("order.approved");

      expect(approved).toHaveLength(1);
      expect(approved[0].orderId).toBe("01ORDER000000000000000001");
    });

    it("returns empty array when no events match", async () => {
      const result = publisher.ofType<DomainEvent>("order.approved");
      expect(result).toHaveLength(0);
    });
  });

  describe("any()", () => {
    it("returns true when a matching event exists", async () => {
      await publisher.publish(createSampleEvent());

      const found = publisher.any((e) => e.eventType === "order.approved");
      expect(found).toBe(true);
    });

    it("returns false when no event matches", async () => {
      await publisher.publish(createSampleEvent());

      const found = publisher.any((e) => e.eventType === "queue.created");
      expect(found).toBe(false);
    });

    it("returns false when no events published", async () => {
      const found = publisher.any((e) => e.eventType === "order.approved");
      expect(found).toBe(false);
    });
  });

  describe("reset()", () => {
    it("clears all events and resets counters", async () => {
      await publisher.publish(createSampleEvent());
      await publisher.publishMany([createSecondEvent()]);

      expect(publisher.eventCount).toBe(2);
      expect(publisher.publishCount).toBe(2);

      publisher.reset();

      expect(publisher.eventCount).toBe(0);
      expect(publisher.publishCount).toBe(0);
      expect(publisher.events).toHaveLength(0);
    });
  });

  describe("first / last", () => {
    it("returns the first and last event", async () => {
      const event1 = createSampleEvent();
      const event2 = createSecondEvent();

      await publisher.publish(event1);
      await publisher.publish(event2);

      expect(publisher.first).toBe(event1);
      expect(publisher.last).toBe(event2);
    });

    it("returns undefined when no events", () => {
      expect(publisher.first).toBeUndefined();
      expect(publisher.last).toBeUndefined();
    });
  });
});

// ─── LocalEventPublisher Tests ──────────────────────────────────────────────

describe("LocalEventPublisher", () => {
  let publisher: LocalEventPublisher;

  beforeEach(() => {
    publisher = new LocalEventPublisher();
  });

  describe("publish()", () => {
    it("calls registered handler with the event", async () => {
      const event = createSampleEvent();
      const handled: DomainEvent[] = [];

      publisher.onPublish((e) => {
        handled.push(e);
      });

      await publisher.publish(event);

      expect(handled).toHaveLength(1);
      expect(handled[0]).toBe(event);
    });

    it("calls multiple handlers in registration order", async () => {
      const event = createSampleEvent();
      const order: number[] = [];

      publisher.onPublish(() => {
        order.push(1);
      });
      publisher.onPublish(() => {
        order.push(2);
      });
      publisher.onPublish(() => {
        order.push(3);
      });

      await publisher.publish(event);

      expect(order).toEqual([1, 2, 3]);
    });

    it("supports async handlers", async () => {
      const event = createSampleEvent();
      const handled: DomainEvent[] = [];

      publisher.onPublish(async (e) => {
        await Promise.resolve();
        handled.push(e);
      });

      await publisher.publish(event);

      expect(handled).toHaveLength(1);
    });
  });

  describe("publishMany()", () => {
    it("calls handler for each event in sequence", async () => {
      const event1 = createSampleEvent();
      const event2 = createSecondEvent();
      const handled: string[] = [];

      publisher.onPublish((e) => {
        handled.push(e.eventType);
      });

      await publisher.publishMany([event1, event2]);

      expect(handled).toEqual(["order.approved", "queue.created"]);
    });

    it("handles empty array without calling handler", async () => {
      const handlerCallCount = 0;
      let callCount = 0;

      publisher.onPublish(() => {
        callCount++;
      });

      await publisher.publishMany([]);

      expect(callCount).toBe(handlerCallCount);
    });
  });

  describe("error propagation", () => {
    it("propagates error from handler to caller", async () => {
      publisher.onPublish(() => {
        throw new Error("handler failed");
      });

      await expect(publisher.publish(createSampleEvent())).rejects.toThrow("handler failed");
    });

    it("stops processing handlers when one throws", async () => {
      const order: number[] = [];

      publisher.onPublish(async () => {
        order.push(1);
      });
      publisher.onPublish(async () => {
        throw new Error("middle handler failed");
      });
      publisher.onPublish(async () => {
        order.push(3);
      });

      await expect(publisher.publish(createSampleEvent())).rejects.toThrow("middle handler failed");
      expect(order).toEqual([1]);
    });
  });
});

// ─── Transaction Safety Pattern Tests ────────────────────────────────────────

describe("Event Publisher - Transaction Safety Pattern", () => {
  it("publishes only events collected from a successful transaction", async () => {
    const publisher = new InMemoryEventPublisher();

    // Simulate: transaction succeeds → events collected → published after commit
    const txResult = {
      data: "some result",
      events: [createSampleEvent(), createSecondEvent()],
    };

    // This is the pattern: publish AFTER transaction completes
    await publisher.publishMany(txResult.events);

    expect(publisher.eventCount).toBe(2);
    expect(publisher.events[0].eventType).toBe("order.approved");
    expect(publisher.events[1].eventType).toBe("queue.created");
  });

  it("does NOT publish any events when transaction fails", async () => {
    const publisher = new InMemoryEventPublisher();

    // Simulate: transaction fails → NO publish calls
    // If the tx throws, we never reach publishMany
    let capturedEvents: DomainEvent[] = [];

    const failingTx = async () => {
      const events = [createSampleEvent()];
      capturedEvents = events;
      throw new Error("transaction failed");
    };

    try {
      await failingTx();
      // We should never reach here — publish is ONLY after successful tx
      await publisher.publishMany(capturedEvents);
    } catch {
      // Transaction failed — NO events published
    }

    expect(publisher.eventCount).toBe(0);
    expect(publisher.publishCount).toBe(0);
  });

  it("publishes partial result events without transaction wrapper", async () => {
    const publisher = new InMemoryEventPublisher();

    // For in-memory operations (no DB transaction), publish directly
    const event = createSampleEvent({ eventType: "cutting.session.created" } as any);
    await publisher.publish(event);

    expect(publisher.eventCount).toBe(1);
    expect(publisher.events[0].eventType).toBe("cutting.session.created");
  });
});

// ─── Integration Style: Publisher Injection ──────────────────────────────────

describe("EventPublisher Injection Pattern", () => {
  it("supports replacing publisher at construction time", () => {
    const inMemory = new InMemoryEventPublisher();
    const local = new LocalEventPublisher();

    // Both implement EventPublisher interface
    expect(typeof inMemory.publish).toBe("function");
    expect(typeof inMemory.publishMany).toBe("function");
    expect(typeof local.publish).toBe("function");
    expect(typeof local.publishMany).toBe("function");
  });

  it("InMemoryEventPublisher provides test assertions", async () => {
    const publisher = new InMemoryEventPublisher();

    await publisher.publish(createSampleEvent());

    expect(publisher.any((e) => e.eventType === "order.approved")).toBe(true);
    expect(publisher.ofType("order.approved")).toHaveLength(1);
    expect(publisher.publishCount).toBe(1);
    expect(publisher.eventCount).toBe(1);
  });
});
