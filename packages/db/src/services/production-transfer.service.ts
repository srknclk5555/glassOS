import { ProductionRepository } from "../repositories/production.repository";
import { OrderLineRepository } from "../repositories/order-line.repository";
import { OrderRepository } from "../repositories/order.repository";
import { withTenantSession } from "../db/transactions";

import type {
  TransferInitiatedEvent,
  TransferCompletedEvent,
  TransferCancelledEvent,
  TransferRejectedEvent,
  ReadyStationAssignedEvent,
  ProductionTransferredEvent,
  EventPublisher,
  DomainEvent,
} from "./events";

// ─── Transfer Types ──────────────────────────────────────────────────────────

export type TransferType =
  | "automatic"
  | "manual"
  | "rework_merge"
  | "correction"
  | "return_to_previous"
  | "emergency";

// ─── Transfer Status ─────────────────────────────────────────────────────────

export type TransferStatus = "initiated" | "completed" | "cancelled" | "rejected";

// ─── Transfer Record ─────────────────────────────────────────────────────────

export interface TransferRecord {
  id: string;
  productionOrderId: string;
  fromStationId: string | null;
  toStationId: string;
  transferType: TransferType;
  status: TransferStatus;
  operatorId?: string;
  machineId?: string;
  shift?: string;
  reason?: string;
  notes?: string;
  initiatedAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  rejectedAt?: Date;
  cancelReason?: string;
  rejectReason?: string;
}

// ─── Station Route Definition ────────────────────────────────────────────────
// Not hard-coded — routes are defined per production requirements.
// This is a simple definition of which stations exist and in what order.

export interface StationRoute {
  stationId: string;
  stationName: string;
  order: number;
}

// ─── Transfer Statistics ─────────────────────────────────────────────────────

export interface TransferStats {
  totalTransfers: number;
  byType: Record<TransferType, number>;
  byStatus: Record<TransferStatus, number>;
  byStation: Record<string, number>;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class ProductionTransferService {
  // In-memory transfer history (immutable records)
  private transferHistory: TransferRecord[] = [];

  constructor(
    private readonly productionRepository: ProductionRepository,
    private readonly orderLineRepository: OrderLineRepository,
    private readonly orderRepository: OrderRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly db: any
  ) {}

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Initiate a transfer for a production order to a target station.
   * This creates a transfer record and updates the production order's station.
   * Does NOT modify order lines or counters — pure station movement.
   */
  async initiateTransfer(input: {
    id: string;
    productionOrderId: string;
    toStationId: string;
    transferType: TransferType;
    operatorId?: string;
    machineId?: string;
    shift?: string;
    reason?: string;
    notes?: string;
  }): Promise<{
    transfer: TransferRecord;
    production: any;
    events: (TransferInitiatedEvent | ProductionTransferredEvent)[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      // Validate production order exists
      const prod = await this.productionRepository.findById(input.productionOrderId);
      if (!prod) {
        throw new Error(`Production order not found: ${input.productionOrderId}`);
      }

      // Validate target station
      if (!input.toStationId) {
        throw new Error(`Invalid target station: ${input.toStationId}`);
      }

      // Cannot transfer completed or cancelled orders
      if (prod.currentStatus === "completed") {
        throw new Error(`Cannot transfer completed production order: ${input.productionOrderId}`);
      }
      if (prod.currentStatus === "cancelled") {
        throw new Error(`Cannot transfer cancelled production order: ${input.productionOrderId}`);
      }

      const previousStationId = prod.currentStationId;

      // Update production order station
      const updated = await this.productionRepository.update(input.productionOrderId, {
        currentStationId: input.toStationId,
      });

      // Create transfer record
      const transfer: TransferRecord = {
        id: input.id,
        productionOrderId: input.productionOrderId,
        fromStationId: previousStationId ?? null,
        toStationId: input.toStationId,
        transferType: input.transferType,
        status: "initiated",
        operatorId: input.operatorId,
        machineId: input.machineId,
        shift: input.shift,
        reason: input.reason,
        notes: input.notes,
        initiatedAt: new Date(),
      };

      this.transferHistory.push(transfer);

      const initiatedEvent: TransferInitiatedEvent = {
        eventType: "transfer.initiated",
        transferId: input.id,
        productionOrderId: input.productionOrderId,
        fromStationId: previousStationId ?? null,
        toStationId: input.toStationId,
        transferType: input.transferType,
        operatorId: input.operatorId,
        machineId: input.machineId,
        shift: input.shift,
        reason: input.reason,
        initiatedAt: transfer.initiatedAt,
      };

      const transferredEvent: ProductionTransferredEvent = {
        eventType: "production.transferred",
        productionOrderId: input.productionOrderId,
        fromStationId: previousStationId ?? null,
        toStationId: input.toStationId,
        transferredAt: transfer.initiatedAt,
      };

      return { transfer, production: updated, events: [initiatedEvent, transferredEvent] };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  /**
   * Complete a transfer — marks it as completed successfully.
   */
  async completeTransfer(
    transferId: string
  ): Promise<{
    transfer: TransferRecord;
    events: TransferCompletedEvent[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const record = this.findTransferById(transferId);
      if (!record) {
        throw new Error(`Transfer not found: ${transferId}`);
      }
      if (record.status !== "initiated") {
        throw new Error(`Cannot complete transfer in status: ${record.status}`);
      }

      const completedAt = new Date();
      const updated: TransferRecord = {
        id: record.id,
        productionOrderId: record.productionOrderId,
        fromStationId: record.fromStationId,
        toStationId: record.toStationId,
        transferType: record.transferType,
        status: "completed",
        operatorId: record.operatorId,
        machineId: record.machineId,
        shift: record.shift,
        reason: record.reason,
        notes: record.notes,
        initiatedAt: record.initiatedAt,
        completedAt,
      };
      this.transferHistory = this.transferHistory.map((t) =>
        t.id === transferId ? updated : t
      );

      const event: TransferCompletedEvent = {
        eventType: "transfer.completed",
        transferId,
        productionOrderId: record.productionOrderId,
        toStationId: record.toStationId,
        completedAt,
      };

      return { transfer: updated, events: [event] };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  /**
   * Cancel a pending transfer.
   */
  async cancelTransfer(
    transferId: string,
    reason?: string
  ): Promise<{
    transfer: TransferRecord;
    events: TransferCancelledEvent[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const record = this.findTransferById(transferId);
      if (!record) {
        throw new Error(`Transfer not found: ${transferId}`);
      }
      if (record.status !== "initiated") {
        throw new Error(`Cannot cancel transfer in status: ${record.status}`);
      }

      const cancelledAt = new Date();
      const updated: TransferRecord = {
        id: record.id,
        productionOrderId: record.productionOrderId,
        fromStationId: record.fromStationId,
        toStationId: record.toStationId,
        transferType: record.transferType,
        status: "cancelled",
        operatorId: record.operatorId,
        machineId: record.machineId,
        shift: record.shift,
        reason: record.reason,
        notes: record.notes,
        initiatedAt: record.initiatedAt,
        cancelledAt,
        cancelReason: reason,
      };
      this.transferHistory = this.transferHistory.map((t) =>
        t.id === transferId ? updated : t
      );

      const event: TransferCancelledEvent = {
        eventType: "transfer.cancelled",
        transferId,
        productionOrderId: record.productionOrderId,
        reason,
        cancelledAt,
      };

      return { transfer: updated, events: [event] };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  /**
   * Reject a pending transfer.
   */
  async rejectTransfer(
    transferId: string,
    reason?: string
  ): Promise<{
    transfer: TransferRecord;
    events: TransferRejectedEvent[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const record = this.findTransferById(transferId);
      if (!record) {
        throw new Error(`Transfer not found: ${transferId}`);
      }
      if (record.status !== "initiated") {
        throw new Error(`Cannot reject transfer in status: ${record.status}`);
      }

      const rejectedAt = new Date();
      const updated: TransferRecord = {
        id: record.id,
        productionOrderId: record.productionOrderId,
        fromStationId: record.fromStationId,
        toStationId: record.toStationId,
        transferType: record.transferType,
        status: "rejected",
        operatorId: record.operatorId,
        machineId: record.machineId,
        shift: record.shift,
        reason: record.reason,
        notes: record.notes,
        initiatedAt: record.initiatedAt,
        rejectedAt,
        rejectReason: reason,
      };
      this.transferHistory = this.transferHistory.map((t) =>
        t.id === transferId ? updated : t
      );

      const event: TransferRejectedEvent = {
        eventType: "transfer.rejected",
        transferId,
        productionOrderId: record.productionOrderId,
        reason,
        rejectedAt,
      };

      return { transfer: updated, events: [event] };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  /**
   * Return a production order to a previous station.
   * Creates a transfer record with return_to_previous type.
   * No counter calculations — pure station movement.
   */
  async returnToPreviousStation(
    input: {
      id: string;
      productionOrderId: string;
      targetStationId: string;
      operatorId?: string;
      machineId?: string;
      shift?: string;
      reason?: string;
      notes?: string;
    }
  ): Promise<{
    transfer: TransferRecord;
    production: any;
    events: (TransferInitiatedEvent | ProductionTransferredEvent)[];
  }> {
    return this.initiateTransfer({
      id: input.id,
      productionOrderId: input.productionOrderId,
      toStationId: input.targetStationId,
      transferType: "return_to_previous",
      operatorId: input.operatorId,
      machineId: input.machineId,
      shift: input.shift,
      reason: input.reason,
      notes: input.notes,
    });
  }

  /**
   * Execute a manual transfer with full operator context.
   */
  async manualTransfer(
    input: {
      id: string;
      productionOrderId: string;
      toStationId: string;
      operatorId?: string;
      machineId?: string;
      shift?: string;
      reason?: string;
      notes?: string;
    }
  ): Promise<{
    transfer: TransferRecord;
    production: any;
    events: (TransferInitiatedEvent | ProductionTransferredEvent)[];
  }> {
    return this.initiateTransfer({
      ...input,
      transferType: "manual",
    });
  }

  /**
   * Assign a production order to the ready (completed) station.
   * This marks the production as ready for the next stage.
   */
  async assignReadyStation(
    input: {
      id: string;
      productionOrderId: string;
      stationId: string;
      operatorId?: string;
      machineId?: string;
      shift?: string;
      notes?: string;
    }
  ): Promise<{
    transfer: TransferRecord;
    production: any;
    events: (TransferInitiatedEvent | ProductionTransferredEvent | ReadyStationAssignedEvent)[];
  }> {
    const _transferResult = await this.initiateTransfer({
      id: input.id,
      productionOrderId: input.productionOrderId,
      toStationId: input.stationId,
      transferType: "manual",
      operatorId: input.operatorId,
      machineId: input.machineId,
      shift: input.shift,
      notes: input.notes,
    });

    const readyEvent: ReadyStationAssignedEvent = {
      eventType: "ready.station.assigned",
      productionOrderId: input.productionOrderId,
      stationId: input.stationId,
      assignedAt: new Date(),
    };

    const _allEvents: (TransferInitiatedEvent | ProductionTransferredEvent | ReadyStationAssignedEvent)[] = [..._transferResult.events, readyEvent];
    const _assignResult = { ..._transferResult, events: _allEvents };
    await this.eventPublisher.publishMany(_assignResult.events);
    return _assignResult;
  }

  // ─── History & Statistics ────────────────────────────────────────────────

  /**
   * Get transfer history for a specific production order.
   * Returns immutable records.
   */
  getTransferHistory(productionOrderId: string): TransferRecord[] {
    return this.transferHistory
      .filter((t) => t.productionOrderId === productionOrderId)
      .sort((a, b) => b.initiatedAt.getTime() - a.initiatedAt.getTime())
      .map((t) => ({ ...t }));
  }

  /**
   * Get all transfers (optionally filtered by type/status).
   */
  getAllTransfers(options: {
    transferType?: TransferType;
    status?: TransferStatus;
  } = {}): TransferRecord[] {
    let result = [...this.transferHistory];
    if (options.transferType) {
      result = result.filter((t) => t.transferType === options.transferType);
    }
    if (options.status) {
      result = result.filter((t) => t.status === options.status);
    }
    return result
      .sort((a, b) => b.initiatedAt.getTime() - a.initiatedAt.getTime())
      .map((t) => ({ ...t }));
  }

  /**
   * Get transfer statistics.
   */
  getTransferStats(): TransferStats {
    const stats: TransferStats = {
      totalTransfers: this.transferHistory.length,
      byType: { automatic: 0, manual: 0, rework_merge: 0, correction: 0, return_to_previous: 0, emergency: 0 },
      byStatus: { initiated: 0, completed: 0, cancelled: 0, rejected: 0 },
      byStation: {},
    };

    for (const t of this.transferHistory) {
      stats.byType[t.transferType]++;
      stats.byStatus[t.status]++;
      if (t.toStationId) {
        stats.byStation[t.toStationId] = (stats.byStation[t.toStationId] ?? 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Find transfer by ID.
   */
  findTransferById(transferId: string): TransferRecord | undefined {
    const found = this.transferHistory.find((t) => t.id === transferId);
    return found ? { ...found } : undefined;
  }
}
