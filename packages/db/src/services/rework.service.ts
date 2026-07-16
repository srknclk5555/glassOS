import { ReworkRepository } from "../repositories/rework.repository.js";
import { ProductionRepository } from "../repositories/production.repository.js";
import { OrderLineRepository } from "../repositories/order-line.repository.js";
import { OrderRepository } from "../repositories/order.repository.js";
import { withTenantSession } from "../db/transactions.js";

import type { ReworkCreatedEvent, FireDepotAssignedEvent, ReworkMergedEvent, EventPublisher } from "./events.js";

export class ReworkService {
  constructor(
    private readonly reworkRepository: ReworkRepository,
    private readonly productionRepository: ProductionRepository,
    private readonly orderLineRepository: OrderLineRepository,
    private readonly orderRepository: OrderRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly db: any
  ) {}

  async createReworkOrder(input: {
    id: string;
    tenantId: string;
    factoryId?: string;
    parentProductionOrderId: string;
    breakageEventId?: string;
    reworkReason?: string;
    internalCustomer?: string;
  }): Promise<{ reworkOrder: any; events: ReworkCreatedEvent[] }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const parent = await this.productionRepository.findById(
        input.parentProductionOrderId
      );
      if (!parent) {
        throw new Error(
          `Parent production order not found: ${input.parentProductionOrderId}`
        );
      }

      const reworkOrder = await this.reworkRepository.create({
        ...input,
        reworkStatus: "pending",
      });

      const event: ReworkCreatedEvent = {
        eventType: "rework.created",
        reworkOrderId: reworkOrder.id,
        parentProductionOrderId: input.parentProductionOrderId,
        reason: input.reworkReason ?? "Unknown",
        createdAt: new Date(),
      };

      return { reworkOrder, events: [event] };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  /**
   * Create a breakage-triggered rework with full parent references and Fire Depot ownership.
   * This is the complete breakage → rework workflow within a single transaction.
   */
  async createBreakageRework(input: {
    id: string;
    tenantId: string;
    factoryId?: string;
    orderLineId: string;
    parentProductionOrderId: string;
    parentOrderId: string;
    originalCustomerId: string;
    breakageEventId: string;
    brokenQuantity: number;
    reason: string;
    stationId: string;
    machineId?: string;
    operatorId?: string;
    shift?: string;
  }): Promise<{
    reworkOrder: any;
    events: (ReworkCreatedEvent | FireDepotAssignedEvent)[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      // Validate parent production exists
      const parent = await this.productionRepository.findById(
        input.parentProductionOrderId
      );
      if (!parent) {
        throw new Error(
          `Parent production order not found: ${input.parentProductionOrderId}`
        );
      }

      // Validate parent order line exists
      const orderLine = await this.orderLineRepository.findById(input.orderLineId);
      if (!orderLine) {
        throw new Error(`Order line not found: ${input.orderLineId}`);
      }

      // Validate parent order exists
      const parentOrder = await this.orderRepository.findById(input.parentOrderId);
      if (!parentOrder) {
        throw new Error(`Parent order not found: ${input.parentOrderId}`);
      }

      // Rule: Cannot break completed rework
      if (parent.currentStatus === "completed") {
        throw new Error(`Cannot create rework for completed production order: ${input.parentProductionOrderId}`);
      }

      // Rule: Cannot create duplicate active rework
      const existingReworks = await this.reworkRepository.findByParentOrder(input.parentProductionOrderId);
      const hasActiveRework = existingReworks.some(
        (r: any) => r.reworkStatus === "pending" || r.reworkStatus === "in_progress"
      );
      if (hasActiveRework) {
        throw new Error(`Active rework already exists for production order: ${input.parentProductionOrderId}`);
      }

      // Create rework order with Fire Depot as internal customer
      // The rework order carries: own ID/status, references to parent order, parent order line,
      // original customer, original production, and breakage event
      const reworkOrder = await this.reworkRepository.create({
        id: input.id,
        tenantId: input.tenantId,
        factoryId: input.factoryId,
        parentProductionOrderId: input.parentProductionOrderId,
        parentOrderId: input.parentOrderId,
        orderLineId: input.orderLineId,
        originalCustomerId: input.originalCustomerId,
        breakageEventId: input.breakageEventId,
        reworkReason: input.reason,
        reworkStatus: "pending",
        internalCustomer: "fire_depot",
        stationId: input.stationId,
        machineId: input.machineId,
        operatorId: input.operatorId,
        shift: input.shift,
        brokenQuantity: input.brokenQuantity,
      });

      // Create a corresponding production order for the rework (internal production order)
      // This production order will flow through the normal manufacturing process
      const reworkProdOrder = await this.productionRepository.create({
        id: `RPROD-${input.id.slice(-20)}`,
        tenantId: input.tenantId,
        factoryId: input.factoryId,
        orderLineId: input.orderLineId,
        glassBarcode: parent.glassBarcode,
        widthMm: parent.widthMm,
        heightMm: parent.heightMm,
        productType: parent.productType,
        currentOperation: "cutting",
        currentStationId: null,
        currentStatus: "pending",
        isRework: true,
        revisionNumber: (parent.revisionNumber ?? 0) + 1,
      });

      // Fire Depot ownership — the broken glass becomes factory property
      const fireDepotItemId = `FIRE-${input.id.slice(-20)}`;

      const reworkEvent: ReworkCreatedEvent = {
        eventType: "rework.created",
        reworkOrderId: reworkOrder.id,
        parentProductionOrderId: input.parentProductionOrderId,
        reason: input.reason,
        createdAt: new Date(),
      };

      const fireDepotEvent: FireDepotAssignedEvent = {
        eventType: "firedepot.assigned",
        fireDepotItemId,
        orderLineId: input.orderLineId,
        productionOrderId: input.parentProductionOrderId,
        brokenQuantity: input.brokenQuantity,
        ownership: "unknown", // Determined later by quality inspection
        assignedAt: new Date(),
      };

      return {
        reworkOrder,
        events: [reworkEvent, fireDepotEvent],
      };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  async findById(id: string): Promise<any | undefined> {
    return withTenantSession(async (tx, ctx) => {
      return this.reworkRepository.findById(id);
    });
  }

  async findOpenReworks(options: any = {}): Promise<any[]> {
    return withTenantSession(async (tx, ctx) => {
      return this.reworkRepository.findOpenReworks(options);
    });
  }

  async findByParentOrder(parentId: string): Promise<any[]> {
    return withTenantSession(async (tx, ctx) => {
      return this.reworkRepository.findByParentOrder(parentId);
    });
  }

  // ─── Merge Preparation ──────────────────────────────────────────────────

  /**
   * Prepare merge metadata so the system knows how to merge when rework completes.
   * The actual merge is NOT implemented here — only the preparation metadata.
   */
  async getMergePreparation(reworkOrderId: string): Promise<{
    reworkOrderId: string;
    parentOrderId: string;
    parentOrderLineId: string;
    targetStationId: string | null;
    targetProductionOrderId: string;
    originalCustomerId: string;
    isReadyToMerge: boolean;
  } | null> {
    return withTenantSession(async (tx, ctx) => {
      const rework = await this.reworkRepository.findById(reworkOrderId);
      if (!rework) return null;

      // Find the rework production order
      const allProds = await this.productionRepository.list();
      const reworkProdOrder = allProds.find(
        (p: any) => p.isRework === true && p.orderLineId === rework.orderLineId && p.currentStatus === "pending"
      );

      if (!reworkProdOrder) return null;

      return {
        reworkOrderId: rework.id,
        parentOrderId: rework.parentOrderId,
        parentOrderLineId: rework.orderLineId,
        targetStationId: rework.stationId,
        targetProductionOrderId: reworkProdOrder.id,
        originalCustomerId: rework.originalCustomerId,
        isReadyToMerge: rework.reworkStatus === "completed",
      };
    });
  }

  // ─── Rework Merge ──────────────────────────────────────────────────────

  /**
   * Merge completed rework back into the parent production order.
   *
   * Rules:
   * 1. Parent production must exist
   * 2. Parent order line must exist
   * 3. Missing quantity (quantity - completedQuantity) must be > 0
   * 4. No duplicate merge — rework must not already be merged
   * 5. Parent production must not be cancelled
   * 6. Parent order must not be completed
   * 7. Material must match (same order line)
   * 8. No unresolved active rework for the same parent
   *
   * Counter updates:
   * - Increase completedQuantity on the order line
   * - Decrease missing (implicit — missing = quantity - completed)
   * - DO NOT change brokenQuantity (broken history is immutable)
   * - Close rework production order
   * - Mark merge completed (rework.reworkStatus = "completed")
   * - Emit ReworkMergedEvent
   */
  async mergeRework(
    reworkOrderId: string,
    options: { completedQuantity?: number } = {}
  ): Promise<{
    reworkOrder: any;
    events: ReworkMergedEvent[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      // Find the rework order
      const rework = await this.reworkRepository.findById(reworkOrderId);
      if (!rework) {
        throw new Error(`Rework order not found: ${reworkOrderId}`);
      }

      // Rule 1: Parent production must exist
      const parentProd = await this.productionRepository.findById(
        rework.parentProductionOrderId
      );
      if (!parentProd) {
        throw new Error(
          `Parent production order not found: ${rework.parentProductionOrderId}`
        );
      }

      // Rule 2: Parent order line must exist
      const orderLine = await this.orderLineRepository.findById(
        rework.orderLineId
      );
      if (!orderLine) {
        throw new Error(`Order line not found: ${rework.orderLineId}`);
      }

      // Rule 3: Missing quantity (quantity - completedQuantity) must be > 0
      const totalQuantity = parseInt(String(orderLine.quantity ?? 0), 10);
      const completedSoFar = parseInt(String(orderLine.completedQuantity ?? 0), 10);
      const missing = totalQuantity - completedSoFar;
      if (missing <= 0) {
        throw new Error(
          `Order line is already fully completed: ${rework.orderLineId}`
        );
      }

      // The quantity to add (default to 1, or use provided value, capped by missing)
      const addQuantity = Math.min(
        options.completedQuantity ?? 1,
        missing
      );

      // Rule 4: No duplicate merge — rework must not already be merged
      if (rework.reworkStatus === "completed") {
        throw new Error(
          `Rework order is already completed: ${reworkOrderId}`
        );
      }

      // Rule 5: Parent production must not be cancelled
      if (parentProd.currentStatus === "cancelled") {
        throw new Error(
          `Cannot merge — parent production is cancelled: ${rework.parentProductionOrderId}`
        );
      }

      // Rule 6: Parent order must not be completed
      const parentOrder = await this.orderRepository.findById(
        rework.parentOrderId
      );
      if (parentOrder && parentOrder.status === "completed") {
        throw new Error(
          `Cannot merge — parent order is completed: ${rework.parentOrderId}`
        );
      }

      // Rule 7: Material must match — same order line
      // (Already guaranteed since rework references the same order line)

      // Rule 8: No unresolved active rework for the same parent
      const existingReworks = await this.reworkRepository.findByParentOrder(
        rework.parentProductionOrderId
      );
      const hasActiveRework = existingReworks.some(
        (r: any) =>
          r.id !== reworkOrderId &&
          (r.reworkStatus === "pending" || r.reworkStatus === "in_progress")
      );
      if (hasActiveRework) {
        throw new Error(
          `Cannot merge — unresolved active rework exists for production: ${rework.parentProductionOrderId}`
        );
      }

      // ─── Perform Merge ──────────────────────────────────────────────

      // Increase completedQuantity on the order line
      const newCompleted = completedSoFar + addQuantity;
      await this.orderLineRepository.update(rework.orderLineId, {
        completedQuantity: newCompleted,
      });

      // DO NOT change brokenQuantity — broken history is immutable
      // missing decrease is implicit: missing = quantity - completed

      // Close the rework production order (find by parent reference)
      const allProds = await this.productionRepository.list();
      const reworkProdOrder = allProds.find(
        (p: any) =>
          p.isRework === true &&
          p.orderLineId === rework.orderLineId &&
          p.currentStatus !== "completed"
      );
      if (reworkProdOrder) {
        await this.productionRepository.update(reworkProdOrder.id, {
          currentStatus: "completed",
        });
      }

      // Mark rework as completed
      const updatedRework = await this.reworkRepository.update(reworkOrderId, {
        reworkStatus: "completed",
      });

      const event: ReworkMergedEvent = {
        eventType: "rework.merged",
        reworkOrderId,
        parentProductionOrderId: rework.parentProductionOrderId,
        orderLineId: rework.orderLineId,
        completedIncrease: addQuantity,
        mergedAt: new Date(),
      };

      return {
        reworkOrder: updatedRework,
        events: [event],
      };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }
}
