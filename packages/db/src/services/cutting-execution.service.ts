import { ProductionRepository } from "../repositories/production.repository";
import { OrderLineRepository } from "../repositories/order-line.repository";
import { OrderRepository } from "../repositories/order.repository";
import { ProductionQueueService } from "./production-queue.service";
import { ReworkService } from "./rework.service";
import { withTenantSession } from "../db/transactions";

import type {
  CuttingSessionCreatedEvent,
  CuttingStartedEvent,
  CuttingCompletedEvent,
  CuttingPausedEvent,
  CuttingResumedEvent,
  CuttingCancelledEvent,
  BreakageRegisteredEvent,
  CuttingStartedEvent as CuttingStartedEventAlias,
  EventPublisher,
  DomainEvent,
} from "./events";

// ─── Session State ───────────────────────────────────────────────────────────

export type CuttingSessionStatus =
  | "CREATED"
  | "READY"
  | "CUTTING"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED";

interface CuttingSession {
  id: string;
  tenantId: string;
  factoryId?: string;
  queueId: string;
  stationId: string;
  machineId?: string;
  operatorId?: string;
  shift?: string;
  materialType: string;
  status: CuttingSessionStatus;
  basketItems: string[]; // productionOrderIds
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  pausedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  pausedDurationMs: number; // cumulative paused time
  _pauseStart?: Date; // current pause start time
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class CuttingExecutionService {
  private sessions: Map<string, CuttingSession> = new Map();

  constructor(
    private readonly productionRepository: ProductionRepository,
    private readonly orderLineRepository: OrderLineRepository,
    private readonly orderRepository: OrderRepository,
    private readonly productionQueueService: ProductionQueueService,
    private readonly reworkService: ReworkService,
    private readonly eventPublisher: EventPublisher,
    private readonly db: any
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Cutting Session Lifecycle
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new cutting session.
   * Loads the work queue from the production queue service and prepares the basket.
   */
  async createSession(input: {
    id: string;
    tenantId: string;
    factoryId?: string;
    queueId: string;
    stationId: string;
    materialType: string;
    machineId?: string;
    operatorId?: string;
    shift?: string;
  }): Promise<{
    session: any;
    events: CuttingSessionCreatedEvent[];
  }> {
    const session: CuttingSession = {
      id: input.id,
      tenantId: input.tenantId,
      factoryId: input.factoryId,
      queueId: input.queueId,
      stationId: input.stationId,
      machineId: input.machineId,
      operatorId: input.operatorId,
      shift: input.shift,
      materialType: input.materialType,
      status: "CREATED",
      basketItems: [],
      createdAt: new Date(),
      pausedDurationMs: 0,
    };

    this.sessions.set(input.id, session);

    const event: CuttingSessionCreatedEvent = {
      eventType: "cutting.session.created",
      sessionId: input.id,
      queueId: input.queueId,
      stationId: input.stationId,
      machineId: input.machineId,
      operatorId: input.operatorId,
      materialType: input.materialType,
      createdAt: new Date(),
    };

    const _createResult = { session: this._snapshot(session), events: [event] };
    await this.eventPublisher.publishMany(_createResult.events);
    return _createResult;
  }

  /**
   * Start cutting — transitions session from CREATED/READY → CUTTING.
   * Validates that the basket is not empty.
   */
  async startSession(
    sessionId: string
  ): Promise<{ events: CuttingStartedEvent[] }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Cutting session not found: ${sessionId}`);
    }

    // Rule: Cannot start if already completed or cancelled
    if (session.status === "COMPLETED") {
      throw new Error(`Cannot start completed session: ${sessionId}`);
    }
    if (session.status === "CANCELLED") {
      throw new Error(`Cannot start cancelled session: ${sessionId}`);
    }
    if (session.status === "CUTTING") {
      throw new Error(`Session already in progress: ${sessionId}`);
    }

    // Rule: Cannot start without items in basket
    if (session.basketItems.length === 0) {
      throw new Error(`Cannot start empty cutting session: ${sessionId}`);
    }

    session.status = "CUTTING";
    session.startedAt = new Date();

    const event: CuttingStartedEvent = {
      eventType: "cutting.started",
      sessionId,
      startedAt: session.startedAt,
      itemCount: session.basketItems.length,
    };

    const _startResult = { events: [event] };
    await this.eventPublisher.publishMany(_startResult.events);
    return _startResult;
  }

  /**
   * Complete cutting — transitions session from CUTTING → COMPLETED.
   * Updates production order statuses for completed cuts.
   */
  async completeSession(
    sessionId: string
  ): Promise<{ events: CuttingCompletedEvent[] }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Cutting session not found: ${sessionId}`);
    }

    // Rule: Cannot complete before start
    if (session.status !== "CUTTING" && session.status !== "PAUSED") {
      throw new Error(
        `Cannot complete session in status ${session.status}: ${sessionId}`
      );
    }

    // Rule: Unresolved validation — cannot complete if any item has broken status
    await withTenantSession(async (tx, ctx) => {
      for (const prodId of session.basketItems) {
        const prod = await this.productionRepository.findById(prodId);
        if (prod && prod.currentStatus === "broken") {
          throw new Error(
            `Cannot complete cutting with broken production order: ${prodId}`
          );
        }
      }
    });

    session.status = "COMPLETED";
    session.completedAt = new Date();

    const event: CuttingCompletedEvent = {
      eventType: "cutting.completed",
      sessionId,
      completedAt: session.completedAt,
      itemCount: session.basketItems.length,
    };

    const _completeResult = { events: [event] };
    await this.eventPublisher.publishMany(_completeResult.events);
    return _completeResult;
  }

  /**
   * Pause cutting — transitions session from CUTTING → PAUSED.
   */
  async pauseSession(
    sessionId: string
  ): Promise<{ events: CuttingPausedEvent[] }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Cutting session not found: ${sessionId}`);
    }

    // Rule: Cannot pause completed or cancelled session
    if (session.status === "COMPLETED") {
      throw new Error(`Cannot pause completed session: ${sessionId}`);
    }
    if (session.status === "CANCELLED") {
      throw new Error(`Cannot pause cancelled session: ${sessionId}`);
    }
    if (session.status !== "CUTTING") {
      throw new Error(
        `Cannot pause session in status ${session.status}: ${sessionId}`
      );
    }

    session.status = "PAUSED";
    session.pausedAt = new Date();
    session._pauseStart = new Date();

    const event: CuttingPausedEvent = {
      eventType: "cutting.paused",
      sessionId,
      pausedAt: session.pausedAt,
    };

    const _pauseResult = { events: [event] };
    await this.eventPublisher.publishMany(_pauseResult.events);
    return _pauseResult;
  }

  /**
   * Resume cutting — transitions session from PAUSED → CUTTING.
   */
  async resumeSession(
    sessionId: string
  ): Promise<{ events: CuttingResumedEvent[] }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Cutting session not found: ${sessionId}`);
    }

    // Rule: Cannot resume cancelled session
    if (session.status === "CANCELLED") {
      throw new Error(`Cannot resume cancelled session: ${sessionId}`);
    }
    if (session.status !== "PAUSED") {
      throw new Error(
        `Cannot resume session in status ${session.status}: ${sessionId}`
      );
    }

    // Track paused duration
    if (session._pauseStart) {
      session.pausedDurationMs +=
        Date.now() - session._pauseStart.getTime();
      session._pauseStart = undefined;
    }

    session.status = "CUTTING";
    session.pausedAt = undefined;

    const event: CuttingResumedEvent = {
      eventType: "cutting.resumed",
      sessionId,
      resumedAt: new Date(),
    };

    const _resumeResult = { events: [event] };
    await this.eventPublisher.publishMany(_resumeResult.events);
    return _resumeResult;
  }

  /**
   * Cancel cutting — transitions session from any active status → CANCELLED.
   */
  async cancelSession(
    sessionId: string,
    reason?: string
  ): Promise<{ events: CuttingCancelledEvent[] }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Cutting session not found: ${sessionId}`);
    }

    if (session.status === "COMPLETED") {
      throw new Error(`Cannot cancel completed session: ${sessionId}`);
    }
    if (session.status === "CANCELLED") {
      throw new Error(`Session already cancelled: ${sessionId}`);
    }

    session.status = "CANCELLED";
    session.cancelledAt = new Date();
    session.cancelReason = reason;

    const event: CuttingCancelledEvent = {
      eventType: "cutting.cancelled",
      sessionId,
      cancelledAt: session.cancelledAt,
      reason,
    };

    const _cancelResult = { events: [event] };
    await this.eventPublisher.publishMany(_cancelResult.events);
    return _cancelResult;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Work Basket
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Load the work queue for a session — returns order lines matching the material type.
   */
  async loadWorkQueue(sessionId: string): Promise<any[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Cutting session not found: ${sessionId}`);
    }

    return withTenantSession(async (tx, ctx) => {
      // Load approved orders filtered by tenant
      const options: any = {};
      if (session.tenantId) options.tenantId = session.tenantId;

      const lines =
        await this.productionQueueService.filterOrderLinesByMaterial(
          session.materialType,
          options
        );

      return lines;
    });
  }

  /**
   * Add a production order to the session basket.
   * Validates material compatibility and checks for duplicates.
   */
  async addItemToBasket(
    sessionId: string,
    productionOrderId: string
  ): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Cutting session not found: ${sessionId}`);
    }

    // Rule: Cannot add order lines after cutting starts
    if (session.status === "CUTTING" || session.status === "COMPLETED") {
      throw new Error(
        `Cannot add items after cutting has started: ${sessionId}`
      );
    }

    return withTenantSession(async (tx, ctx) => {
      // Verify the production order exists
      const prodOrder =
        await this.productionRepository.findById(productionOrderId);
      if (!prodOrder) {
        throw new Error(
          `Production order not found: ${productionOrderId}`
        );
      }

      // Rule: Cannot assign wrong material — verify material type matches session
      const prodType = (prodOrder.productType ?? "").toLowerCase();
      if (
        prodType &&
        prodType !== session.materialType.toLowerCase()
      ) {
        throw new Error(
          `Material mismatch: production ${productionOrderId} has type '${prodType}', session requires '${session.materialType}'`
        );
      }

      // Rule: Cannot add different material into same basket
      if (session.basketItems.length > 0) {
        const firstId = session.basketItems[0];
        if (firstId) {
          const firstProd = await this.productionRepository.findById(firstId);
          if (firstProd) {
            const firstType = (
              firstProd.productType ?? ""
            ).toLowerCase();
            if (prodType && firstType && prodType !== firstType) {
              throw new Error(
                `Cannot add different material type '${prodType}' to basket with type '${firstType}'`
              );
            }
          }
        }
      }

      // Duplicate prevention
      if (session.basketItems.includes(productionOrderId)) {
        throw new Error(
          `Production order already in basket: ${productionOrderId}`
        );
      }

      session.basketItems.push(productionOrderId);
      return { productionOrderId, status: "added" };
    });
  }

  /**
   * Remove a production order from the session basket.
   */
  async removeItemFromBasket(
    sessionId: string,
    productionOrderId: string
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Cutting session not found: ${sessionId}`);
    }

    const idx = session.basketItems.indexOf(productionOrderId);
    if (idx === -1) {
      throw new Error(
        `Production order not in basket: ${productionOrderId}`
      );
    }

    session.basketItems.splice(idx, 1);
  }

  /**
   * Get session statistics — basket size, status, duration, etc.
   */
  async getSessionStatistics(sessionId: string): Promise<{
    sessionId: string;
    status: CuttingSessionStatus;
    basketSize: number;
    totalDurationMs: number;
    activeDurationMs: number;
    pausedDurationMs: number;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Cutting session not found: ${sessionId}`);
    }

    const now = Date.now();
    const createdMs = session.createdAt.getTime();
    const totalDurationMs = now - createdMs;
    let activeMs = totalDurationMs - session.pausedDurationMs;

    // If currently paused, subtract current pause
    if (session._pauseStart) {
      activeMs -= now - session._pauseStart.getTime();
    }

    return {
      sessionId: session.id,
      status: session.status,
      basketSize: session.basketItems.length,
      totalDurationMs,
      activeDurationMs: Math.max(0, activeMs),
      pausedDurationMs: session.pausedDurationMs,
      createdAt: session.createdAt,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Breakage Registration
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Register breakage — the complete breakage workflow within a single transaction.
   *
   * 1. Creates Breakage Event
   * 2. Updates Order Line counters
   * 3. Updates Production counter status
   * 4. Creates Rework Order (Fire Depot ownership)
   * 5. Assigns Fire Depot ownership
   */
  async registerBreakage(input: {
    breakageId: string;
    tenantId: string;
    factoryId?: string;
    productionOrderId: string;
    orderLineId: string;
    orderId: string;
    customerId: string;
    brokenQuantity: number;
    reason: string;
    stationId: string;
    machineId?: string;
    operatorId?: string;
    shift?: string;
    notes?: string;
  }): Promise<{
    breakageEvent: BreakageRegisteredEvent;
    reworkResult: any;
    events: DomainEvent[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const prod =
        await this.productionRepository.findById(
          input.productionOrderId
        );
      if (!prod) {
        throw new Error(
          `Production order not found: ${input.productionOrderId}`
        );
      }

      // Rule: Cannot break completed rework
      if (prod.isRework && prod.currentStatus === "completed") {
        throw new Error(
          `Cannot register breakage for completed rework order: ${input.productionOrderId}`
        );
      }

      // Get order line to check counters
      const orderLine =
        await this.orderLineRepository.findById(input.orderLineId);
      if (!orderLine) {
        throw new Error(
          `Order line not found: ${input.orderLineId}`
        );
      }

      // Rule: Cannot register breakage greater than completed quantity
      const completedQty = Number(
        orderLine.completedQuantity ?? 0
      );
      if (input.brokenQuantity > completedQty) {
        throw new Error(
          `Cannot register breakage (${input.brokenQuantity}) greater than completed quantity (${completedQty}) for order line ${input.orderLineId}`
        );
      }

      // Step 1: Create Breakage Event — stored as breakageId reference
      // (no breakage_events table; carried via reworkOrder.breakageEventId)

      // Step 2: Update Order Line counters
      // Broken History never decreases
      // Missing = broken (needs rework)
      const newBroken =
        Number(orderLine.brokenQuantity ?? 0) + input.brokenQuantity;
      const newMissing =
        Number(orderLine.missingQuantity ?? 0) +
        input.brokenQuantity;

      await this.orderLineRepository.update(input.orderLineId, {
        brokenQuantity: newBroken,
        missingQuantity: newMissing,
      });

      // Step 3: Update Production order status to "broken"
      await this.productionRepository.update(
        input.productionOrderId,
        {
          currentStatus: "broken",
        }
      );

      // Step 4: Create rework order with Fire Depot ownership
      const reworkId = `RW-${input.breakageId}`;
      const reworkResult =
        await this.reworkService.createBreakageRework({
          id: reworkId,
          tenantId: input.tenantId,
          factoryId: input.factoryId,
          orderLineId: input.orderLineId,
          parentProductionOrderId: input.productionOrderId,
          parentOrderId: input.orderId,
          originalCustomerId: input.customerId,
          breakageEventId: input.breakageId,
          brokenQuantity: input.brokenQuantity,
          reason: input.reason,
          stationId: input.stationId,
          machineId: input.machineId,
          operatorId: input.operatorId,
          shift: input.shift,
        });

      // Step 5: Domain event for breakage
      const breakageEvent: BreakageRegisteredEvent = {
        eventType: "breakage.registered",
        breakageId: input.breakageId,
        orderLineId: input.orderLineId,
        productionOrderId: input.productionOrderId,
        brokenQuantity: input.brokenQuantity,
        reason: input.reason,
        stationId: input.stationId,
        machineId: input.machineId,
        operatorId: input.operatorId,
        shift: input.shift,
        createdAt: new Date(),
      };

      const _events: DomainEvent[] = [breakageEvent, ...(reworkResult?.events ?? [])];
      return { breakageEvent, reworkResult, events: _events };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Order Line Counters
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get order line counters according to GlassOS rules.
   */
  async getOrderLineCounters(orderLineId: string): Promise<{
    orderLineId: string;
    requested: number;
    completed: number;
    brokenHistory: number;
    missing: number;
    delivered: number;
    progress: number; // percentage 0-100
  }> {
    const line = await this.orderLineRepository.findById(orderLineId);
    if (!line) {
      throw new Error(`Order line not found: ${orderLineId}`);
    }

    const requested = Number(line.quantity ?? 0);
    const completed = Number(line.completedQuantity ?? 0);
    const brokenHistory = Number(line.brokenQuantity ?? 0);
    const missing = Number(line.missingQuantity ?? 0);
    const delivered = Number(line.deliveredQuantity ?? 0);
    const progress =
      requested > 0
        ? Math.round((completed / requested) * 100)
        : 0;

    return {
      orderLineId,
      requested,
      completed,
      brokenHistory,
      missing,
      delivered,
      progress,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Utilities
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Find session by ID.
   */
  async findSession(
    sessionId: string
  ): Promise<any | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    return this._snapshot(session);
  }

  /**
   * List all sessions (optionally filtered by tenant).
   */
  async listSessions(options: {
    tenantId?: string;
    status?: CuttingSessionStatus;
  } = {}): Promise<any[]> {
    let result = Array.from(this.sessions.values());
    if (options.tenantId) {
      result = result.filter(
        (s) => s.tenantId === options.tenantId
      );
    }
    if (options.status) {
      result = result.filter((s) => s.status === options.status);
    }
    return result.map((s) => this._snapshot(s));
  }

  private _snapshot(session: CuttingSession): any {
    return {
      ...session,
      _pauseStart: undefined,
    };
  }
}
