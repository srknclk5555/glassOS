import type { DomainEvent, EventPublisher } from "../services/events.js";

/**
 * InMemoryEventPublisher — stores events in memory for test assertions.
 *
 * This publisher does NOT execute any handlers. It simply records
 * all published events so tests can inspect them.
 *
 * Features:
 * - Records all published events in order
 * - Provides assertions: shouldHavePublished(), shouldNotHavePublished()
 * - Can be reset between tests
 * - Tracks publish count
 */
export class InMemoryEventPublisher implements EventPublisher {
  private _events: DomainEvent[] = [];
  private _publishCount = 0;

  /** All events published so far, in order. */
  get events(): readonly DomainEvent[] {
    return this._events;
  }

  /** Total number of publish() + publishMany() calls. */
  get publishCount(): number {
    return this._publishCount;
  }

  /** Total number of individual events published. */
  get eventCount(): number {
    return this._events.length;
  }

  /** Record a single event. */
  async publish(event: DomainEvent): Promise<void> {
    this._events.push(event);
    this._publishCount++;
  }

  /** Record multiple events in order. */
  async publishMany(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      this._events.push(event);
    }
    this._publishCount++;
  }

  /** Clear all recorded events and reset counters. */
  reset(): void {
    this._events = [];
    this._publishCount = 0;
  }

  /**
   * Get events of a specific type.
   * Returns a typed array for convenient assertions.
   */
  ofType<T extends DomainEvent>(eventType: T["eventType"]): T[] {
    return this._events.filter((e) => e.eventType === eventType) as T[];
  }

  /** Check if an event matching the predicate was published. */
  any(predicate: (event: DomainEvent) => boolean): boolean {
    return this._events.some(predicate);
  }

  /** Get the last published event. */
  get last(): DomainEvent | undefined {
    return this._events[this._events.length - 1];
  }

  /** Get the first published event. */
  get first(): DomainEvent | undefined {
    return this._events[0];
  }
}
