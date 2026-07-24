import { ProductionQueueRepository } from "../repositories/production-queue.repository";
import { ProductionRepository } from "../repositories/production.repository";
import { OrderRepository } from "../repositories/order.repository";
import { OrderLineRepository } from "../repositories/order-line.repository";
import { withTenantSession } from "../db/transactions";

import type {
  QueueCreatedEvent,
  QueueStartedEvent,
  QueueCompletedEvent,
  EventPublisher,
} from "./events";
import type { ProductionRecordService } from "./production-record.service";

export class ProductionQueueService {
  constructor(
    private readonly productionQueueRepository: ProductionQueueRepository,
    private readonly productionRepository: ProductionRepository,
    private readonly orderRepository: OrderRepository,
    private readonly orderLineRepository: OrderLineRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly db: any,
    private readonly productionRecordService?: ProductionRecordService,
  ) {}

  async createWorkQueue(input: {
    id: string;
    tenantId: string;
    factoryId?: string;
    stationId: string;
    operationCode: string;
    isActive?: boolean;
  }): Promise<{ queue: any; events: QueueCreatedEvent[] }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const queue = await this.productionQueueRepository.create({
        ...input,
        isActive: input.isActive ?? true,
      });

      const event: QueueCreatedEvent = {
        eventType: "queue.created",
        queueId: queue.id,
        stationId: queue.stationId,
        operationCode: queue.operationCode,
        createdAt: new Date(),
      };

      return { queue, events: [event] };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  /**
   * Select material filter — stores the material selection context.
   * This is a logical operation; filtering is done via loadApprovedOrders.
   */
  async selectMaterial(materialId: string): Promise<{ materialId: string }> {
    return { materialId };
  }

  /**
   * Load approved (confirmed) orders that are available for production.
   */
  async loadApprovedOrders(options: any = {}): Promise<any[]> {
    return withTenantSession(async (tx, ctx) => {
      return this.orderRepository.findApproved(options);
    });
  }

  /**
   * Load approved order lines for a specific customer/order.
   * Used to display available work items.
   */
  async loadApprovedOrderLines(options: any = {}): Promise<any[]> {
    return withTenantSession(async (tx, ctx) => {
      const orders = await this.orderRepository.findApproved(options);
      const allLines: any[] = [];

      for (const order of orders) {
        const lines = await this.orderLineRepository.findByOrder(order.id);
        // Only include incomplete lines
        const incomplete = lines.filter((line: any) => {
          const completed = Number(line.completedQuantity ?? 0);
          const quantity = Number(line.quantity ?? 0);
          return completed < quantity;
        });
        allLines.push(
          ...incomplete.map((line: any) => ({
            ...line,
            orderNumber: order.orderNumber,
            customerId: order.customerId,
          }))
        );
      }

      return allLines;
    });
  }

  /**
   * Filter order lines by material/product type.
   * In a real system, this would join through the product to find material type.
   */
  async filterOrderLinesByMaterial(
    materialType: string,
    options: any = {}
  ): Promise<any[]> {
    return withTenantSession(async (tx, ctx) => {
      const allLines = await this.loadApprovedOrderLines(options);
      return allLines.filter((line: any) => {
        // Match by productType field which represents glass type
        const lineType = (line.productType ?? "").toLowerCase();
        return lineType === materialType.toLowerCase();
      });
    });
  }

  /**
   * Add a production order (from an order line) to the queue basket.
   * Creates a productionQueueItems record.
   */
  async addOrderLineToBasket(
    queueId: string,
    productionOrderId: string
  ): Promise<any> {
    return withTenantSession(async (tx, ctx) => {
      const queue = await this.productionQueueRepository.findById(queueId);
      if (!queue) {
        throw new Error(`Queue not found: ${queueId}`);
      }

      const prodOrder = await this.productionRepository.findById(productionOrderId);
      if (!prodOrder) {
        throw new Error(`Production order not found: ${productionOrderId}`);
      }

      // Rule: Prevent duplicate additions — check if already in queue
      const existingItems = await this.db
        .select()
        .from("production_queue_items" as never)
        .execute();
      const existing = (existingItems as any[]).find(
        (item: any) =>
          item.queueId === queueId &&
          item.productionOrderId === productionOrderId &&
          item.status !== "done"
      );

      // Since we can't query production_queue_items directly via the repository,
      // we check via the queue's state
      const queueItems = await this._getQueueItems(queueId);
      const duplicate = queueItems.find(
        (item: any) =>
          item.productionOrderId === productionOrderId && item.status !== "done"
      );

      if (duplicate) {
        throw new Error(
          `Production order already in queue: ${productionOrderId}`
        );
      }

      // Insert directly into production_queue_items
      const itemId = `QITEM-${productionOrderId.slice(-12)}`;
      const result = await this.db
        .insert("production_queue_items" as never)
        .values({
          id: itemId,
          queueId,
          productionOrderId,
          enteredAt: new Date(),
          priority: prodOrder.isRework ? 1 : 100,
          status: "waiting",
        })
        .returning()
        .execute();

      return result?.[0] ?? { id: itemId, queueId, productionOrderId, status: "waiting" };
    });
  }

  /**
   * Remove an order line from the queue basket.
   * Marks the queue item as done (removes from active basket).
   */
  async removeOrderLineFromBasket(
    queueId: string,
    productionOrderId: string
  ): Promise<void> {
    return withTenantSession(async (tx, ctx) => {
      const queueItems = await this._getQueueItems(queueId);
      const item = queueItems.find(
        (i: any) => i.productionOrderId === productionOrderId && i.status !== "done"
      );

      if (!item) {
        throw new Error(
          `Production order not in queue basket: ${productionOrderId}`
        );
      }

      // Mark as done to remove from active basket
      await this.db
        .update("production_queue_items" as never)
        .set({ status: "done" })
        .where({ id: item.id })
        .execute();
    });
  }

  /**
   * Start the queue — transitions all waiting items to in_progress.
   */
  async startQueue(
    queueId: string
  ): Promise<{ events: QueueStartedEvent[] }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const queue = await this.productionQueueRepository.findById(queueId);
      if (!queue) {
        throw new Error(`Queue not found: ${queueId}`);
      }

      const items = await this._getQueueItems(queueId);
      const waitingItems = items.filter((i: any) => i.status === "waiting");

      // Rule: Cannot start empty queue
      if (waitingItems.length === 0) {
        throw new Error(`Cannot start empty queue: ${queueId}`);
      }

      // Transition all waiting items to in_progress
      for (const item of waitingItems) {
        await this.db
          .update("production_queue_items" as never)
          .set({ status: "in_progress" })
          .where({ id: item.id })
          .execute();
      }

      const event: QueueStartedEvent = {
        eventType: "queue.started",
        queueId,
        startedAt: new Date(),
        itemCount: waitingItems.length,
      };

      return { events: [event] };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  /**
   * Complete the queue — transitions all in_progress items to done.
   */
  async completeQueue(
    queueId: string
  ): Promise<{ events: QueueCompletedEvent[] }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const queue = await this.productionQueueRepository.findById(queueId);
      if (!queue) {
        throw new Error(`Queue not found: ${queueId}`);
      }

      const items = await this._getQueueItems(queueId);
      const inProgressItems = items.filter(
        (i: any) => i.status === "in_progress"
      );

      // Rule: Cannot complete queue that hasn't been started
      const hasInProgress = inProgressItems.length > 0;
      const hasOnlyWaiting = !hasInProgress && items.some((i: any) => i.status === "waiting");

      if (hasOnlyWaiting) {
        throw new Error(`Cannot complete queue that hasn't been started: ${queueId}`);
      }

      // Complete all non-done items
      for (const item of items) {
        if (item.status !== "done") {
          await this.db
            .update("production_queue_items" as never)
            .set({ status: "done" })
            .where({ id: item.id })
            .execute();
        }
      }

      // Update production order statuses for completed items
      const completedOrderIds: string[] = [];
      for (const item of inProgressItems) {
        const prodOrder = await this.productionRepository.findById(
          item.productionOrderId
        );
        if (prodOrder) {
          await this.productionRepository.update(prodOrder.id, {
            currentStatus: "completed",
            completedAt: new Date(),
          });
          completedOrderIds.push(prodOrder.id);
        }
      }

      const event: QueueCompletedEvent = {
        eventType: "queue.completed",
        queueId,
        completedAt: new Date(),
        itemCount: inProgressItems.length,
      };

      return { events: [event], completedOrderIds };
    });
    await this.eventPublisher.publishMany(_txResult.events);

    // ── Integration: Create Production Records for completed orders ────
    // Executed AFTER the queue completion transaction commits.
    for (const orderId of _txResult.completedOrderIds) {
      try {
        await this.productionRecordService?.handleProductionCompletion(
          orderId,
          {},
        );
      } catch (err) {
        console.error(
          `[ProductionRecord] Failed to create record for completed order ${orderId}:`,
          err,
        );
      }
    }

    return _txResult;
  }

  /**
   * Calculate queue statistics.
   */
  async getQueueStatistics(queueId: string): Promise<{
    totalItems: number;
    waiting: number;
    inProgress: number;
    done: number;
    queue: any;
  }> {
    return withTenantSession(async (tx, ctx) => {
      const queue = await this.productionQueueRepository.findById(queueId);
      if (!queue) {
        throw new Error(`Queue not found: ${queueId}`);
      }

      const items = await this._getQueueItems(queueId);
      const waiting = items.filter((i: any) => i.status === "waiting").length;
      const inProgress = items.filter((i: any) => i.status === "in_progress").length;
      const done = items.filter((i: any) => i.status === "done").length;

      return {
        totalItems: items.length,
        waiting,
        inProgress,
        done,
        queue,
      };
    });
  }

  /**
   * List all active queues.
   */
  async findActiveQueues(options: any = {}): Promise<any[]> {
    return withTenantSession(async (tx, ctx) => {
      return this.productionQueueRepository.findActiveQueues(options);
    });
  }

  // ─── Internal Helpers ─────────────────────────────────────────────────────

  private async _getQueueItems(queueId: string): Promise<any[]> {
    const result = await this.db
      .select()
      .from("production_queue_items" as never)
      .execute();
    return (result as any[]).filter((item: any) => item.queueId === queueId);
  }
}
