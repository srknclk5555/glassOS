import { ProductionRepository } from "../repositories/production.repository";
import { OrderLineRepository } from "../repositories/order-line.repository";
import { OrderRepository } from "../repositories/order.repository";
import { QualityControlService } from "./quality-control.service";
import { withTenantSession } from "../db/transactions";

import type {
  DispatchCreatedEvent,
  VehicleAssignedEvent,
  LoadingStartedEvent,
  LoadingCompletedEvent,
  ShipmentStartedEvent,
  DeliveryCompletedEvent,
  PartialDeliveryCompletedEvent,
  DispatchCancelledEvent,
  EventPublisher,
} from "./events";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DeliveryStatus =
  | "created"
  | "loading"
  | "ready_to_ship"
  | "in_transit"
  | "delivered"
  | "partially_delivered"
  | "cancelled";

export interface DispatchBasketEntry {
  productionOrderId: string;
  orderLineId: string;
  customerId: string;
  orderId: string;
  productType?: string;
  widthMm?: number;
  heightMm?: number;
  areaM2?: number;
  addedAt: Date;
}

export interface DeliveryRecord {
  id: string;
  productionOrderIds: string[];
  orderLineIds: string[];
  customerId: string;
  orderId: string;
  vehicleId?: string;
  driverId?: string;
  dispatcherId?: string;
  status: DeliveryStatus;
  loadedBy?: string;
  deliveredBy?: string;
  loadingDate?: Date;
  estimatedArrival?: Date;
  notes?: string;
  createdAt: Date;
  loadedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
}

export interface ReadyProduction {
  productionOrderId: string;
  orderLineId: string;
  customerId: string;
  orderId: string;
  glassBarcode: string;
  widthMm?: number;
  heightMm?: number;
  productType?: string;
  areaM2?: number;
}

export interface ReadyOrderLine {
  orderLineId: string;
  orderId: string;
  customerId: string;
  customerName?: string;
  productType?: string;
  quantity: number;
  completedQuantity: number;
  readyCount: number;
}

export interface DeliveryCounters {
  requested: number;
  ready: number;
  loaded: number;
  delivered: number;
  remaining: number;
}

export interface DeliveryStats {
  totalDeliveries: number;
  byStatus: Record<string, number>;
  totalLoaded: number;
  totalDelivered: number;
  totalPartiallyDelivered: number;
  totalCancelled: number;
}

export interface BasketStats {
  totalItems: number;
  uniqueCustomers: number;
  uniqueOrders: number;
  totalAreaM2: number;
}

export interface CreateDispatchInput {
  id: string;
  productionOrderId: string;
  orderLineId: string;
  customerId: string;
  orderId: string;
}

export interface CreateDeliveryInput {
  id: string;
  productionOrderIds: string[];
  orderLineIds: string[];
  customerId: string;
  orderId: string;
  vehicleId?: string;
  driverId?: string;
  dispatcherId?: string;
  loadingDate?: Date;
  estimatedArrival?: Date;
  notes?: string;
}

export interface ReadyPoolFilter {
  customerId?: string;
  orderId?: string;
  orderLineId?: string;
  productType?: string;
  minAreaM2?: number;
  maxAreaM2?: number;
  priority?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class DispatchService {
  // In-memory dispatch basket
  private basket: DispatchBasketEntry[] = [];

  // In-memory delivery history (immutable records)
  private deliveryHistory: DeliveryRecord[] = [];

  constructor(
    private readonly productionRepository: ProductionRepository,
    private readonly orderLineRepository: OrderLineRepository,
    private readonly orderRepository: OrderRepository,
    private readonly qualityControlService: QualityControlService,
    private readonly eventPublisher: EventPublisher,
    private readonly db: any
  ) {}

  // ═════════════════════════════════════════════════════════════════════════
  // 1. READY POOL
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Load all READY productions (approved by quality control).
   * Supports filtering by customer, product type, area, order, order line.
   */
  async getReadyProductions(
    filter?: ReadyPoolFilter
  ): Promise<ReadyProduction[]> {
    return withTenantSession(async (tx, ctx) => {
      const allProds = await this.productionRepository.list();
      const ready: ReadyProduction[] = [];

      for (const prod of allProds) {
        if (prod.currentStatus === "completed" || prod.currentStatus === "cancelled" || prod.currentStatus === "scrapped") {
          continue;
        }

        const canProceed = await this.qualityControlService.canProceedToReady(prod.id);
        if (!canProceed.eligible) {
          continue;
        }

        // Apply filters
        if (filter?.customerId || filter?.orderId || filter?.orderLineId) {
          const orderLine = await this.orderLineRepository.findById(prod.orderLineId);
          if (!orderLine) continue;
          if (filter?.orderLineId && orderLine.id !== filter.orderLineId) continue;
          if (filter?.orderId && orderLine.orderId !== filter.orderId) continue;

          if (filter?.customerId) {
            const order = await this.orderRepository.findById(orderLine.orderId);
            if (!order || order.customerId !== filter.customerId) continue;
          }
        }

        if (filter?.productType && prod.productType !== filter.productType) continue;
        if (filter?.minAreaM2 && ((prod.widthMm ?? 0) * (prod.heightMm ?? 0) / 1_000_000) < filter.minAreaM2) continue;
        if (filter?.maxAreaM2 && ((prod.widthMm ?? 0) * (prod.heightMm ?? 0) / 1_000_000) > filter.maxAreaM2) continue;

        const areaM2 = prod.widthMm && prod.heightMm
          ? (prod.widthMm * prod.heightMm) / 1_000_000
          : undefined;

        ready.push({
          productionOrderId: prod.id,
          orderLineId: prod.orderLineId,
          customerId: filter?.customerId ?? "",
          orderId: filter?.orderId ?? "",
          glassBarcode: prod.glassBarcode ?? "",
          widthMm: prod.widthMm,
          heightMm: prod.heightMm,
          productType: prod.productType,
          areaM2,
        });
      }

      return ready;
    });
  }

  /**
   * Load READY order lines — distinct order lines with READY productions.
   * Supports the same filtering as getReadyProductions.
   */
  async getReadyOrderLines(
    filter?: ReadyPoolFilter
  ): Promise<ReadyOrderLine[]> {
    return withTenantSession(async (tx, ctx) => {
      const readyProds = await this.getReadyProductions(filter);

      // Group by order line
      const grouped = new Map<string, {
        line: any;
        readyCount: number;
        customerId: string;
        customerName?: string;
      }>();

      for (const rp of readyProds) {
        if (grouped.has(rp.orderLineId)) {
          grouped.get(rp.orderLineId)!.readyCount++;
          continue;
        }

        const line = await this.orderLineRepository.findById(rp.orderLineId);
        if (!line) continue;

        let customerName: string | undefined;
        const order = await this.orderRepository.findById(line.orderId);
        if (order?.customerId) {
          // Try to get customer name via order context
          customerName = order.customerId;
        }

        grouped.set(rp.orderLineId, {
          line,
          readyCount: 1,
          customerId: rp.customerId || order?.customerId || "",
          customerName,
        });
      }

      const result: ReadyOrderLine[] = [];
      for (const [, entry] of grouped) {
        result.push({
          orderLineId: entry.line.id,
          orderId: entry.line.orderId,
          customerId: entry.customerId,
          customerName: entry.customerName,
          productType: entry.line.productType,
          quantity: entry.line.quantity ?? 0,
          completedQuantity: entry.line.completedQuantity ?? 0,
          readyCount: entry.readyCount,
        });
      }

      return result;
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. DISPATCH BASKET
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Add a READY production to the dispatch basket.
   * Prevents duplicates — same production cannot be added twice.
   */
  async addToBasket(productionOrderId: string): Promise<{
    entry: DispatchBasketEntry;
  }> {
    return withTenantSession(async (tx, ctx) => {
      // Check duplicate
      const existing = this.basket.find(
        (b) => b.productionOrderId === productionOrderId
      );
      if (existing) {
        throw new Error(
          `Production already in dispatch basket: ${productionOrderId}`
        );
      }

      // Verify production exists and is READY
      const prod = await this.productionRepository.findById(productionOrderId);
      if (!prod) {
        throw new Error(`Production order not found: ${productionOrderId}`);
      }

      const canProceed = await this.qualityControlService.canProceedToReady(productionOrderId);
      if (!canProceed.eligible) {
        throw new Error(
          `Production not READY for dispatch: ${productionOrderId}. ${canProceed.reason ?? ""}`
        );
      }

      // Check cancelled production
      if (prod.currentStatus === "cancelled") {
        throw new Error(`Cannot dispatch cancelled production: ${productionOrderId}`);
      }

      // Get order line for customer/order info
      const orderLine = await this.orderLineRepository.findById(prod.orderLineId);
      const customerId = orderLine?.orderId
        ? (await this.orderRepository.findById(orderLine.orderId))?.customerId ?? ""
        : "";
      const orderId = orderLine?.orderId ?? "";

      const areaM2 = prod.widthMm && prod.heightMm
        ? (prod.widthMm * prod.heightMm) / 1_000_000
        : undefined;

      const entry: DispatchBasketEntry = {
        productionOrderId,
        orderLineId: prod.orderLineId,
        customerId,
        orderId,
        productType: prod.productType,
        widthMm: prod.widthMm,
        heightMm: prod.heightMm,
        areaM2,
        addedAt: new Date(),
      };

      this.basket.push(entry);
      return { entry };
    });
  }

  /**
   * Remove a production from the dispatch basket.
   */
  async removeFromBasket(productionOrderId: string): Promise<void> {
    return withTenantSession(async (tx, ctx) => {
      const index = this.basket.findIndex(
        (b) => b.productionOrderId === productionOrderId
      );
      if (index === -1) {
        throw new Error(
          `Production not found in dispatch basket: ${productionOrderId}`
        );
      }
      this.basket.splice(index, 1);
    });
  }

  /**
   * Get the current dispatch basket contents.
   */
  getBasket(): DispatchBasketEntry[] {
    return [...this.basket];
  }

  /**
   * Get dispatch basket statistics.
   */
  getBasketStatistics(): BasketStats {
    const uniqueCustomers = new Set(this.basket.map((b) => b.customerId));
    const uniqueOrders = new Set(this.basket.map((b) => b.orderId));
    const totalAreaM2 = this.basket.reduce(
      (sum, b) => sum + (b.areaM2 ?? 0),
      0
    );

    return {
      totalItems: this.basket.length,
      uniqueCustomers: uniqueCustomers.size,
      uniqueOrders: uniqueOrders.size,
      totalAreaM2,
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 3. CREATE DISPATCH
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Create a dispatch entry for a READY production.
   * This registers the production for delivery planning.
   * Also adds the production to the dispatch basket.
   */
  async createDispatch(
    input: CreateDispatchInput
  ): Promise<{
    entry: DispatchBasketEntry;
    events: DispatchCreatedEvent[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      // First add to basket (validates READY state)
      const { entry } = await this.addToBasket(input.productionOrderId);

      const event: DispatchCreatedEvent = {
        eventType: "dispatch.created",
        dispatchId: input.id,
        productionOrderId: input.productionOrderId,
        orderLineId: input.orderLineId,
        customerId: input.customerId,
        orderId: input.orderId,
        createdAt: new Date(),
      };

      return { entry, events: [event] };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 4. CREATE DELIVERY
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Create a delivery from the dispatch basket or specified productions.
   * Transitions to "created" status.
   */
  async createDelivery(
    input: CreateDeliveryInput
  ): Promise<{
    delivery: DeliveryRecord;
    events: DispatchCreatedEvent[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      // Validate production orders exist and are READY
      for (const prodId of input.productionOrderIds) {
        const prod = await this.productionRepository.findById(prodId);
        if (!prod) {
          throw new Error(`Production order not found: ${prodId}`);
        }
        if (prod.currentStatus === "cancelled") {
          throw new Error(`Cannot deliver cancelled production: ${prodId}`);
        }

        const canProceed = await this.qualityControlService.canProceedToReady(prodId);
        if (!canProceed.eligible) {
          throw new Error(
            `Production not READY for delivery: ${prodId}. ${canProceed.reason ?? ""}`
          );
        }

        // Wrong customer check
        const orderLine = await this.orderLineRepository.findById(prod.orderLineId);
        if (orderLine?.orderId) {
          const order = await this.orderRepository.findById(orderLine.orderId);
          if (order && order.customerId !== input.customerId) {
            throw new Error(
              `Wrong customer: production ${prodId} belongs to a different customer`
            );
          }
        }
      }

      const now = new Date();
      const delivery: DeliveryRecord = {
        id: input.id,
        productionOrderIds: [...input.productionOrderIds],
        orderLineIds: [...input.orderLineIds],
        customerId: input.customerId,
        orderId: input.orderId,
        vehicleId: input.vehicleId,
        driverId: input.driverId,
        dispatcherId: input.dispatcherId,
        status: "created",
        loadingDate: input.loadingDate,
        estimatedArrival: input.estimatedArrival,
        notes: input.notes,
        createdAt: now,
      };

      this.deliveryHistory.push(delivery);

      // Remove delivered productions from basket
      for (const prodId of input.productionOrderIds) {
        const idx = this.basket.findIndex(
          (b) => b.productionOrderId === prodId
        );
        if (idx >= 0) {
          this.basket.splice(idx, 1);
        }
      }

      const events: DispatchCreatedEvent[] = input.productionOrderIds.map(
        (prodId, i) => ({
          eventType: "dispatch.created" as const,
          dispatchId: `${input.id}_${i}`,
          productionOrderId: prodId,
          orderLineId: input.orderLineIds[i] ?? "",
          customerId: input.customerId,
          orderId: input.orderId,
          createdAt: now,
        })
      );

      return { delivery, events };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 5. ASSIGN VEHICLE
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Assign a vehicle to a delivery.
   * Also optionally assign driver and dispatcher.
   */
  async assignVehicle(
    deliveryId: string,
    vehicleId: string,
    driverId?: string,
    dispatcherId?: string
  ): Promise<{
    delivery: DeliveryRecord;
    events: VehicleAssignedEvent[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const record = this.findDeliveryById(deliveryId);
      if (!record) {
        throw new Error(`Delivery not found: ${deliveryId}`);
      }
      if (record.status !== "created" && record.status !== "loading") {
        throw new Error(
          `Cannot assign vehicle to delivery in status: ${record.status}`
        );
      }

      const updated: DeliveryRecord = {
        ...record,
        vehicleId,
        driverId: driverId ?? record.driverId,
        dispatcherId: dispatcherId ?? record.dispatcherId,
      };
      this.updateDelivery(updated);

      const event: VehicleAssignedEvent = {
        eventType: "vehicle.assigned",
        deliveryId,
        vehicleId,
        driverId: driverId ?? record.driverId,
        dispatcherId: dispatcherId ?? record.dispatcherId,
        assignedAt: new Date(),
      };

      return { delivery: updated, events: [event] };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  /**
   * Assign a driver to a delivery.
   */
  async assignDriver(
    deliveryId: string,
    driverId: string
  ): Promise<{
    delivery: DeliveryRecord;
  }> {
    return withTenantSession(async (tx, ctx) => {
      const record = this.findDeliveryById(deliveryId);
      if (!record) {
        throw new Error(`Delivery not found: ${deliveryId}`);
      }

      const updated: DeliveryRecord = { ...record, driverId };
      this.updateDelivery(updated);
      return { delivery: updated };
    });
  }

  /**
   * Assign a dispatcher to a delivery.
   */
  async assignDispatcher(
    deliveryId: string,
    dispatcherId: string
  ): Promise<{
    delivery: DeliveryRecord;
  }> {
    return withTenantSession(async (tx, ctx) => {
      const record = this.findDeliveryById(deliveryId);
      if (!record) {
        throw new Error(`Delivery not found: ${deliveryId}`);
      }

      const updated: DeliveryRecord = { ...record, dispatcherId };
      this.updateDelivery(updated);
      return { delivery: updated };
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 6. LOAD VEHICLE
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Start loading a vehicle — transitions from "created" to "loading".
   */
  async loadVehicle(
    deliveryId: string,
    loadedBy?: string
  ): Promise<{
    delivery: DeliveryRecord;
    events: LoadingStartedEvent[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const record = this.findDeliveryById(deliveryId);
      if (!record) {
        throw new Error(`Delivery not found: ${deliveryId}`);
      }
      if (record.status !== "created") {
        throw new Error(
          `Cannot load vehicle in status: ${record.status}. Must be "created".`
        );
      }

      const now = new Date();
      const updated: DeliveryRecord = {
        ...record,
        status: "loading",
        loadedBy,
        loadedAt: now,
      };
      this.updateDelivery(updated);

      const event: LoadingStartedEvent = {
        eventType: "loading.started",
        deliveryId,
        itemCount: record.productionOrderIds.length,
        loadedBy,
        startedAt: now,
      };

      return { delivery: updated, events: [event] };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  /**
   * Complete loading — transitions from "loading" to "ready_to_ship".
   */
  async unloadVehicle(
    deliveryId: string
  ): Promise<{
    delivery: DeliveryRecord;
    events: LoadingCompletedEvent[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const record = this.findDeliveryById(deliveryId);
      if (!record) {
        throw new Error(`Delivery not found: ${deliveryId}`);
      }
      if (record.status !== "loading") {
        throw new Error(
          `Cannot complete loading in status: ${record.status}. Must be "loading".`
        );
      }

      const now = new Date();
      const updated: DeliveryRecord = {
        ...record,
        status: "ready_to_ship",
      };
      this.updateDelivery(updated);

      const event: LoadingCompletedEvent = {
        eventType: "loading.completed",
        deliveryId,
        itemCount: record.productionOrderIds.length,
        completedAt: now,
      };

      return { delivery: updated, events: [event] };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 7. SHIP & DELIVER
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Start shipment — transitions from "ready_to_ship" to "in_transit".
   */
  async startShipment(
    deliveryId: string
  ): Promise<{
    delivery: DeliveryRecord;
    events: ShipmentStartedEvent[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const record = this.findDeliveryById(deliveryId);
      if (!record) {
        throw new Error(`Delivery not found: ${deliveryId}`);
      }
      if (record.status !== "ready_to_ship") {
        throw new Error(
          `Cannot start shipment in status: ${record.status}. Must be "ready_to_ship".`
        );
      }

      const now = new Date();
      const updated: DeliveryRecord = {
        ...record,
        status: "in_transit",
        shippedAt: now,
      };
      this.updateDelivery(updated);

      const event: ShipmentStartedEvent = {
        eventType: "shipment.started",
        deliveryId,
        vehicleId: record.vehicleId ?? "",
        driverId: record.driverId,
        startedAt: now,
      };

      return { delivery: updated, events: [event] };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  /**
   * Complete a delivery — transitions from "in_transit" to "delivered".
   * Updates order line delivery counters.
   */
  async completeDelivery(
    deliveryId: string,
    deliveredBy?: string
  ): Promise<{
    delivery: DeliveryRecord;
    events: DeliveryCompletedEvent[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const record = this.findDeliveryById(deliveryId);
      if (!record) {
        throw new Error(`Delivery not found: ${deliveryId}`);
      }
      if (record.status !== "in_transit") {
        throw new Error(
          `Cannot complete delivery in status: ${record.status}. Must be "in_transit".`
        );
      }

      const now = new Date();
      const updated: DeliveryRecord = {
        ...record,
        status: "delivered",
        deliveredBy,
        deliveredAt: now,
      };
      this.updateDelivery(updated);

      // Update order line delivery counters
      for (const olId of record.orderLineIds) {
        const line = await this.orderLineRepository.findById(olId);
        if (line) {
          const currentDelivered = line.deliveredQuantity ?? 0;
          await this.orderLineRepository.update(olId, {
            deliveredQuantity: currentDelivered + 1,
          });
        }
      }

      const events: DeliveryCompletedEvent[] = record.productionOrderIds.map(
        (prodId, i) => ({
          eventType: "delivery.completed",
          deliveryId,
          orderLineId: record.orderLineIds[i] ?? "",
          productionOrderId: prodId,
          deliveredBy,
          deliveredAt: now,
        })
      );

      return { delivery: updated, events };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  /**
   * Complete a partial delivery — transitions from "in_transit" to "partially_delivered".
   * Some order lines are delivered, others remain pending.
   * Updates counters only for delivered order lines.
   */
  async completePartialDelivery(
    deliveryId: string,
    deliveredOrderLineIds: string[],
    deliveredBy?: string
  ): Promise<{
    delivery: DeliveryRecord;
    events: PartialDeliveryCompletedEvent[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const record = this.findDeliveryById(deliveryId);
      if (!record) {
        throw new Error(`Delivery not found: ${deliveryId}`);
      }
      if (record.status !== "in_transit") {
        throw new Error(
          `Cannot complete partial delivery in status: ${record.status}. Must be "in_transit".`
        );
      }

      const pendingOrderLineIds = record.orderLineIds.filter(
        (olId) => !deliveredOrderLineIds.includes(olId)
      );

      const now = new Date();
      const updated: DeliveryRecord = {
        ...record,
        status: "partially_delivered",
        deliveredBy,
        deliveredAt: now,
      };
      this.updateDelivery(updated);

      // Update counters only for delivered order lines
      for (const olId of deliveredOrderLineIds) {
        const line = await this.orderLineRepository.findById(olId);
        if (line) {
          const currentDelivered = line.deliveredQuantity ?? 0;
          await this.orderLineRepository.update(olId, {
            deliveredQuantity: currentDelivered + 1,
          });
        }
      }

      const event: PartialDeliveryCompletedEvent = {
        eventType: "delivery.partial",
        deliveryId,
        deliveredOrderLineIds,
        pendingOrderLineIds,
        deliveredAt: now,
      };

      return { delivery: updated, events: [event] };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 8. CANCEL DISPATCH / DELIVERY
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Cancel a delivery. Any status can be cancelled except "delivered" and "partially_delivered".
   */
  async cancelDispatch(
    deliveryId: string,
    reason?: string
  ): Promise<{
    delivery: DeliveryRecord;
    events: DispatchCancelledEvent[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const record = this.findDeliveryById(deliveryId);
      if (!record) {
        throw new Error(`Delivery not found: ${deliveryId}`);
      }
      if (record.status === "delivered") {
        throw new Error(`Cannot cancel already delivered delivery: ${deliveryId}`);
      }
      if (record.status === "partially_delivered") {
        throw new Error(`Cannot cancel partially delivered delivery: ${deliveryId}`);
      }
      if (record.status === "cancelled") {
        throw new Error(`Delivery already cancelled: ${deliveryId}`);
      }

      const now = new Date();
      const updated: DeliveryRecord = {
        ...record,
        status: "cancelled",
        cancelledAt: now,
        cancelReason: reason,
      };
      this.updateDelivery(updated);

      const event: DispatchCancelledEvent = {
        eventType: "dispatch.cancelled",
        deliveryId,
        reason,
        cancelledAt: now,
      };

      return { delivery: updated, events: [event] };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 9. DELIVERY COUNTERS
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Get delivery counters for an order line.
   * Counters: requested (from order line), ready (from READY pool),
   * loaded (from deliveries in loading+ status), delivered, remaining.
   */
  async getOrderLineDeliveryCounters(
    orderLineId: string
  ): Promise<DeliveryCounters> {
    return withTenantSession(async (tx, ctx) => {
      const line = await this.orderLineRepository.findById(orderLineId);
      const requested = line?.quantity ?? 0;

      // Count ready productions
      const readyProds = await this.getReadyProductions({ orderLineId });
      const ready = readyProds.length;

      // Count loaded (in deliveries with status >= loading)
      const loaded = this.deliveryHistory
        .filter(
          (d) =>
            d.orderLineIds.includes(orderLineId) &&
            (d.status === "loading" ||
              d.status === "ready_to_ship" ||
              d.status === "in_transit" ||
              d.status === "delivered" ||
              d.status === "partially_delivered")
        )
        .reduce((sum, d) => sum + d.productionOrderIds.length, 0);

      // Count delivered
      const delivered = line?.deliveredQuantity ?? 0;
      const remaining = Math.max(0, requested - delivered);

      return {
        requested,
        ready,
        loaded,
        delivered,
        remaining,
      };
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 10. HISTORY
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Get delivery history. Optionally filter by production order id.
   * Returns immutable copies.
   */
  getDeliveryHistory(
    productionOrderId?: string
  ): DeliveryRecord[] {
    if (productionOrderId) {
      return this.deliveryHistory
        .filter((d) => d.productionOrderIds.includes(productionOrderId))
        .map((d) => ({ ...d }));
    }
    return this.deliveryHistory.map((d) => ({ ...d }));
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 11. STATISTICS
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Get delivery statistics.
   */
  getDeliveryStatistics(): DeliveryStats {
    const byStatus: Record<string, number> = {};
    let totalLoaded = 0;
    let totalDelivered = 0;
    let totalPartiallyDelivered = 0;
    let totalCancelled = 0;

    for (const d of this.deliveryHistory) {
      byStatus[d.status] = (byStatus[d.status] ?? 0) + 1;
      if (d.status === "loading" || d.status === "ready_to_ship" || d.status === "in_transit" || d.status === "delivered") {
        totalLoaded += d.productionOrderIds.length;
      }
      if (d.status === "delivered") {
        totalDelivered += d.productionOrderIds.length;
      }
      if (d.status === "partially_delivered") {
        totalPartiallyDelivered++;
      }
      if (d.status === "cancelled") {
        totalCancelled++;
      }
    }

    return {
      totalDeliveries: this.deliveryHistory.length,
      byStatus,
      totalLoaded,
      totalDelivered,
      totalPartiallyDelivered,
      totalCancelled,
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═════════════════════════════════════════════════════════════════════════

  private findDeliveryById(id: string): DeliveryRecord | undefined {
    return this.deliveryHistory.find((d) => d.id === id);
  }

  private updateDelivery(updated: DeliveryRecord): void {
    this.deliveryHistory = this.deliveryHistory.map((d) =>
      d.id === updated.id ? updated : d
    );
  }
}
