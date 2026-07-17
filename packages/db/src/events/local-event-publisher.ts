import type { DomainEvent, EventPublisher } from "../services/events";

/**
 * LocalEventPublisher — executes event handlers synchronously in-process.
 *
 * This is the DEFAULT event publisher for production use.
 * Handlers are called in registration order immediately when publish() is called.
 *
 * To integrate with external brokers (RabbitMQ, Kafka, etc.) in the future:
 * 1. Create a new class implementing EventPublisher
 * 2. Inject it instead of this one
 * 3. No service code changes needed
 */
export class LocalEventPublisher implements EventPublisher {
  private readonly handlers: Array<(event: DomainEvent) => void | Promise<void>> = [];

  /**
   * Register a handler that will be called for every published event.
   * Handlers are called in registration order.
   */
  onPublish(handler: (event: DomainEvent) => void | Promise<void>): void {
    this.handlers.push(handler);
  }

  /**
   * Publish a single event to all registered handlers.
   * If any handler throws, the error propagates — callers should handle accordingly.
   */
  async publish(event: DomainEvent): Promise<void> {
    for (const handler of this.handlers) {
      await handler(event);
    }
  }

  /**
   * Publish multiple events in sequence, preserving order.
   * Each event is published to all handlers before the next event is processed.
   */
  async publishMany(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
