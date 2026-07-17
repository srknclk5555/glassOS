import { ProductionRepository } from "../repositories/production.repository";
import { OrderLineRepository } from "../repositories/order-line.repository";
import { OrderRepository } from "../repositories/order.repository";
import { withTenantSession } from "../db/transactions";

import type {
  GrindingStartedEvent,
  GrindingCompletedEvent,
  TemperStartedEvent,
  TemperCompletedEvent,
  InsulatingGlassStartedEvent,
  InsulatingGlassCompletedEvent,
  FurnaceCapacityCalculatedEvent,
  LowEValidationFailedEvent,
  EventPublisher,
} from "./events";

// ─── Constants ───────────────────────────────────────────────────────────────

export const STATION_IDS = {
  CUTTING: "STATION_CUTTING",
  REWORK_CUTTING: "STATION_REWORK_CUTTING",
  GRINDING: "STATION_GRINDING",
  TEMPER: "STATION_TEMPER",
  INSULATING_GLASS: "STATION_INSULATING_GLASS",
  READY: "STATION_READY",
  HOLE: "STATION_HOLE",
  VENT: "STATION_VENT",
  CNC: "STATION_CNC",
  LAMINATION: "STATION_LAMINATION",
  QUALITY: "STATION_QUALITY",
  DISPATCH: "STATION_DISPATCH",
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export type OperationType = "started" | "completed" | "cancelled" | "rejected";

export interface StationOperationRecord {
  id: string;
  productionOrderId: string;
  stationId: string;
  operationType: OperationType;
  operatorId?: string;
  machineId?: string;
  shift?: string;
  reason?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface WaitingPoolEntry {
  productionOrderId: string;
  stationId: string;
  addedAt: Date;
  priority?: number;
  notes?: string;
}

export interface StationStats {
  stationId: string;
  totalOperations: number;
  activeOperations: number;
  completedOperations: number;
  cancelledOperations: number;
  rejectedOperations: number;
  waitingCount: number;
}

export interface WaitingPoolStats {
  byStation: Record<string, number>;
  totalWaiting: number;
}

export interface FurnaceCapacityResult {
  actualAreaM2: number;
  effectiveAreaM2: number;
  isTemperedIG: boolean;
  capacityMultiplier: number;
}

export type LowEType = "temperable" | "non_temperable";

export type GlassType = "normal" | "tempered" | "low_e";

export interface StartOperationInput {
  id: string;
  productionOrderId: string;
  stationId: string;
  operatorId?: string;
  machineId?: string;
  shift?: string;
  lowEType?: LowEType;
  isTemperedIG?: boolean;
  glassType?: GlassType;
}

export interface CompleteOperationInput {
  productionOrderId: string;
  stationId: string;
  operatorId?: string;
  machineId?: string;
}

export interface RejectOperationInput {
  productionOrderId: string;
  stationId: string;
  reason: string;
  operatorId?: string;
}

// ─── Validation Result ───────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  stationId: string;
  productionOrderId: string;
  errors: string[];
  warnings: string[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class StationOperationService {
  // In-memory operation history
  private operationHistory: StationOperationRecord[] = [];
  // In-memory waiting pools (productionOrderId per station)
  private waitingPools: Map<string, WaitingPoolEntry[]> = new Map();

  constructor(
    private readonly productionRepository: ProductionRepository,
    private readonly orderLineRepository: OrderLineRepository,
    private readonly orderRepository: OrderRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly db: any
  ) {}

  // ═════════════════════════════════════════════════════════════════════════
  // 1. CORE LIFECYCLE
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Start an operation at a station.
   * Validates entry rules based on the target station type,
   * updates the production order's station, records history,
   * and emits appropriate events.
   */
  async startOperation(
    input: StartOperationInput
  ): Promise<{
    operation: StationOperationRecord;
    production: any;
    events: any[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const { productionOrderId, stationId } = input;

      // Validate production exists
      const prod = await this.productionRepository.findById(productionOrderId);
      if (!prod) {
        throw new Error(`Production order not found: ${productionOrderId}`);
      }

      // Cannot operate on completed or cancelled orders
      if (prod.currentStatus === "completed") {
        throw new Error(`Cannot start operation on completed production order: ${productionOrderId}`);
      }
      if (prod.currentStatus === "cancelled") {
        throw new Error(`Cannot start operation on cancelled production order: ${productionOrderId}`);
      }

      // Station-specific entry validation
      const validation = await this.validateOperation(productionOrderId, stationId, input.lowEType);
      if (!validation.valid) {
        throw new Error(`Operation validation failed: ${validation.errors.join("; ")}`);
      }

      // Remove from waiting pool if present
      this.removeFromWaitingPoolInternal(productionOrderId, stationId);

      // Update production order station
      const updated = await this.productionRepository.update(productionOrderId, {
        currentStationId: stationId,
      });

      // Create operation record
      const now = new Date();
      const operation: StationOperationRecord = {
        id: input.id,
        productionOrderId,
        stationId,
        operationType: "started",
        operatorId: input.operatorId,
        machineId: input.machineId,
        shift: input.shift,
        timestamp: now,
      };
      this.operationHistory.push(operation);

      // Build events based on station type
      const events: any[] = [];

      if (stationId === STATION_IDS.GRINDING) {
        const event: GrindingStartedEvent = {
          eventType: "grinding.started",
          productionOrderId,
          stationId,
          startedAt: now,
          operatorId: input.operatorId,
          machineId: input.machineId,
          shift: input.shift,
        };
        events.push(event);
      } else if (stationId === STATION_IDS.TEMPER) {
        const event: TemperStartedEvent = {
          eventType: "temper.started",
          productionOrderId,
          stationId,
          startedAt: now,
          operatorId: input.operatorId,
          machineId: input.machineId,
          shift: input.shift,
        };
        events.push(event);
      } else if (stationId === STATION_IDS.INSULATING_GLASS) {
        const event: InsulatingGlassStartedEvent = {
          eventType: "insulating_glass.started",
          productionOrderId,
          stationId,
          startedAt: now,
          glassType: input.glassType ?? "normal",
          operatorId: input.operatorId,
          machineId: input.machineId,
        };
        events.push(event);
      }

      // If temper with furnace capacity calculation
      if (stationId === STATION_IDS.TEMPER && prod.widthMm && prod.heightMm) {
        const areaM2 = (prod.widthMm * prod.heightMm) / 1_000_000;
        const isTemperedIG = input.isTemperedIG ?? false;
        const capacityResult = this.calculateFurnaceCapacity(areaM2, isTemperedIG);

        const capacityEvent: FurnaceCapacityCalculatedEvent = {
          eventType: "furnace.capacity.calculated",
          productionOrderId,
          actualArea: capacityResult.actualAreaM2,
          effectiveArea: capacityResult.effectiveAreaM2,
          isTemperedIG: capacityResult.isTemperedIG,
          calculatedAt: now,
        };
        events.push(capacityEvent);
      }

      return { operation, production: updated, events };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  /**
   * Complete an operation at a station.
   * Records the completion in history and emits events.
   */
  async completeOperation(
    input: CompleteOperationInput
  ): Promise<{
    operation: StationOperationRecord;
    events: any[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const { productionOrderId, stationId } = input;

      const prod = await this.productionRepository.findById(productionOrderId);
      if (!prod) {
        throw new Error(`Production order not found: ${productionOrderId}`);
      }
      if (prod.currentStatus === "completed") {
        throw new Error(`Cannot complete operation on already completed production order: ${productionOrderId}`);
      }
      if (prod.currentStatus === "cancelled") {
        throw new Error(`Cannot complete operation on cancelled production order: ${productionOrderId}`);
      }

      const now = new Date();
      const operation: StationOperationRecord = {
        id: `${productionOrderId}_${stationId}_completed_${now.getTime()}`,
        productionOrderId,
        stationId,
        operationType: "completed",
        operatorId: input.operatorId,
        machineId: input.machineId,
        timestamp: now,
      };
      this.operationHistory.push(operation);

      const events: any[] = [];

      if (stationId === STATION_IDS.GRINDING) {
        const event: GrindingCompletedEvent = {
          eventType: "grinding.completed",
          productionOrderId,
          stationId,
          completedAt: now,
        };
        events.push(event);
      } else if (stationId === STATION_IDS.TEMPER) {
        const event: TemperCompletedEvent = {
          eventType: "temper.completed",
          productionOrderId,
          stationId,
          completedAt: now,
        };
        events.push(event);
      } else if (stationId === STATION_IDS.INSULATING_GLASS) {
        const event: InsulatingGlassCompletedEvent = {
          eventType: "insulating_glass.completed",
          productionOrderId,
          stationId,
          completedAt: now,
        };
        events.push(event);
      }

      return { operation, events };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  /**
   * Cancel an operation at a station.
   */
  async cancelOperation(
    productionOrderId: string,
    stationId: string,
    reason?: string
  ): Promise<{
    operation: StationOperationRecord;
    events: any[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const prod = await this.productionRepository.findById(productionOrderId);
      if (!prod) {
        throw new Error(`Production order not found: ${productionOrderId}`);
      }

      const now = new Date();
      const operation: StationOperationRecord = {
        id: `${productionOrderId}_${stationId}_cancelled_${now.getTime()}`,
        productionOrderId,
        stationId,
        operationType: "cancelled",
        reason,
        timestamp: now,
      };
      this.operationHistory.push(operation);

      return { operation, events: [] };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  /**
   * Reject an operation at a station.
   */
  async rejectOperation(
    input: RejectOperationInput
  ): Promise<{
    operation: StationOperationRecord;
    events: any[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const { productionOrderId, stationId, reason } = input;

      const prod = await this.productionRepository.findById(productionOrderId);
      if (!prod) {
        throw new Error(`Production order not found: ${productionOrderId}`);
      }
      if (!reason) {
        throw new Error(`Rejection reason is required`);
      }

      const now = new Date();
      const operation: StationOperationRecord = {
        id: `${productionOrderId}_${stationId}_rejected_${now.getTime()}`,
        productionOrderId,
        stationId,
        operationType: "rejected",
        reason,
        operatorId: input.operatorId,
        timestamp: now,
      };
      this.operationHistory.push(operation);

      return { operation, events: [] };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. STATION-SPECIFIC ENTRY VALIDATION
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Validate that a production order can enter a specific station.
   * Returns a ValidationResult with all errors and warnings.
   */
  async validateOperation(
    productionOrderId: string,
    targetStationId: string,
    lowEType?: LowEType
  ): Promise<ValidationResult> {
    return withTenantSession(async (tx, ctx) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      const prod = await this.productionRepository.findById(productionOrderId);
      if (!prod) {
        return {
          valid: false,
          stationId: targetStationId,
          productionOrderId,
          errors: ["Production order not found"],
          warnings: [],
        };
      }

      switch (targetStationId) {
        case STATION_IDS.GRINDING:
          this.validateGrindingEntry(prod, errors, warnings);
          break;
        case STATION_IDS.TEMPER:
          await this.validateTemperEntry(productionOrderId, prod, errors, warnings, lowEType);
          break;
        case STATION_IDS.INSULATING_GLASS:
          await this.validateIGEntry(productionOrderId, prod, errors, warnings);
          break;
        // Hole, Vent, CNC — flexible intermediate, no strict validation needed
        case STATION_IDS.HOLE:
        case STATION_IDS.VENT:
        case STATION_IDS.CNC:
          warnings.push(`Intermediate operation: ensure routing is configured`);
          break;
        default:
          // Generic station — minimal validation
          break;
      }

      return {
        valid: errors.length === 0,
        stationId: targetStationId,
        productionOrderId,
        errors,
        warnings,
      };
    });
  }

  /**
   * Validate that a production order can enter Grinding.
   * Grinding may receive from: CUTTING, REWORK_CUTTING
   */
  private validateGrindingEntry(
    prod: any,
    errors: string[],
    warnings: string[]
  ): void {
    const allowedPreviousStations = [
      STATION_IDS.CUTTING,
      STATION_IDS.REWORK_CUTTING,
    ];

    const previousStation = prod.currentStationId;

    if (previousStation && !allowedPreviousStations.includes(previousStation)) {
      // Warning instead of error — routing may be flexible
      warnings.push(
        `Grinding received from unexpected station: ${previousStation}. Expected: CUTTING or REWORK_CUTTING.`
      );
    }

    // Allow if no previous station (first operation scenario)
    if (!previousStation) {
      warnings.push(`No previous station recorded for grinding entry validation`);
    }
  }

  /**
   * Validate that a production order can enter Temper.
   * Production MUST have grinding completed.
   * Low-E check: non-temperable cannot enter temper.
   */
  private async validateTemperEntry(
    productionOrderId: string,
    prod: any,
    errors: string[],
    warnings: string[],
    lowEType?: LowEType
  ): Promise<void> {
    // Check grinding completion via operation history
    const grindingCompleted = this.operationHistory.some(
      (op) =>
        op.productionOrderId === productionOrderId &&
        op.stationId === STATION_IDS.GRINDING &&
        op.operationType === "completed"
    );

    if (!grindingCompleted) {
      errors.push("Grinding must be completed before entering Temper");
    }

    // Check Low-E validation
    if (lowEType === "non_temperable") {
      errors.push("Non-temperable Low-E glass cannot enter Temper");
    }

    // Check if product type suggests Low-E
    if (prod.productType?.toLowerCase().includes("low-e") && !lowEType) {
      warnings.push("Low-E product detected: please specify lowEType (temperable or non_temperable)");
    }
  }

  /**
   * Validate that a production order can enter Insulating Glass.
   */
  private async validateIGEntry(
    productionOrderId: string,
    prod: any,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    // IG can receive from various upstream stations
    // No strict blocking unless something is clearly wrong
    if (prod.currentStatus === "completed") {
      errors.push("Cannot process completed production order at Insulating Glass");
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 3. LOW-E VALIDATION
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Validate Low-E glass type against a target station.
   * Non-temperable Low-E cannot be sent to Temper.
   */
  async validateLowE(
    productionOrderId: string,
    lowEType: LowEType,
    targetStationId: string
  ): Promise<{
    valid: boolean;
    event?: LowEValidationFailedEvent;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (lowEType === "non_temperable" && targetStationId === STATION_IDS.TEMPER) {
      const msg = "Non-temperable Low-E glass cannot be sent to Temper station";
      errors.push(msg);

      const event: LowEValidationFailedEvent = {
        eventType: "low_e.validation.failed",
        productionOrderId,
        lowEType,
        targetStationId,
        reason: msg,
        failedAt: new Date(),
      };

      return { valid: false, event, errors };
    }

    return { valid: true, errors: [] };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 4. FURNACE CAPACITY (Temper Only)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Calculate furnace occupancy.
   * Normal glass: actual area
   * Tempered Insulating Glass: 2 × actual area
   *
   * This is a pure calculation — no optimization algorithm.
   */
  calculateFurnaceCapacity(
    areaM2: number,
    isTemperedIG: boolean
  ): FurnaceCapacityResult {
    const capacityMultiplier = isTemperedIG ? 2 : 1;
    const effectiveAreaM2 = areaM2 * capacityMultiplier;

    return {
      actualAreaM2: areaM2,
      effectiveAreaM2,
      isTemperedIG,
      capacityMultiplier,
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 5. WAITING POOLS
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Add a production order to a station's waiting pool.
   */
  async addToWaitingPool(
    productionOrderId: string,
    stationId: string,
    priority?: number,
    notes?: string
  ): Promise<void> {
    await withTenantSession(async (tx, ctx) => {
      const prod = await this.productionRepository.findById(productionOrderId);
      if (!prod) {
        throw new Error(`Production order not found: ${productionOrderId}`);
      }
    });

    const pool = this.waitingPools.get(stationId) ?? [];
    // Prevent duplicates
    if (pool.some((e) => e.productionOrderId === productionOrderId)) {
      return; // Already in pool — idempotent
    }
    pool.push({
      productionOrderId,
      stationId,
      addedAt: new Date(),
      priority,
      notes,
    });
    this.waitingPools.set(stationId, pool);
  }

  /**
   * Remove a production order from a station's waiting pool.
   */
  async removeFromWaitingPool(
    productionOrderId: string,
    stationId: string
  ): Promise<boolean> {
    return this.removeFromWaitingPoolInternal(productionOrderId, stationId);
  }

  private removeFromWaitingPoolInternal(
    productionOrderId: string,
    stationId: string
  ): boolean {
    const pool = this.waitingPools.get(stationId);
    if (!pool) return false;

    const filtered = pool.filter((e) => e.productionOrderId !== productionOrderId);
    if (filtered.length === pool.length) return false;

    if (filtered.length === 0) {
      this.waitingPools.delete(stationId);
    } else {
      this.waitingPools.set(stationId, filtered);
    }
    return true;
  }

  /**
   * Get all entries in a station's waiting pool.
   */
  async getWaitingPool(stationId: string): Promise<WaitingPoolEntry[]> {
    return [...(this.waitingPools.get(stationId) ?? [])];
  }

  /**
   * Get a snapshot of all waiting pools across all stations.
   */
  async getWaitingPoolStatistics(): Promise<WaitingPoolStats> {
    const byStation: Record<string, number> = {};
    let totalWaiting = 0;

    for (const [stationId, entries] of this.waitingPools.entries()) {
      byStation[stationId] = entries.length;
      totalWaiting += entries.length;
    }

    return { byStation, totalWaiting };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 6. LOAD WAITING PRODUCTION
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Load all production orders waiting at a specific station.
   * Returns the actual production order records from the repository.
   */
  async loadWaitingProduction(stationId: string): Promise<any[]> {
    return withTenantSession(async (tx, ctx) => {
      const pool = this.waitingPools.get(stationId) ?? [];
      const results: any[] = [];

      for (const entry of pool) {
        const prod = await this.productionRepository.findById(entry.productionOrderId);
        if (prod) {
          results.push({ ...prod, _waitingSince: entry.addedAt, _priority: entry.priority });
        }
      }

      return results;
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 7. HISTORY
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Get operation history for a specific production order,
   * or all history if no productionOrderId is provided.
   */
  async getOperationHistory(productionOrderId?: string): Promise<StationOperationRecord[]> {
    if (productionOrderId) {
      return this.operationHistory
        .filter((op) => op.productionOrderId === productionOrderId)
        .map((op) => ({ ...op }));
    }
    return this.operationHistory.map((op) => ({ ...op }));
  }

  /**
   * Get operation history filtered by station.
   */
  async getStationOperationHistory(stationId: string): Promise<StationOperationRecord[]> {
    return this.operationHistory
      .filter((op) => op.stationId === stationId)
      .map((op) => ({ ...op }));
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 8. STATION STATISTICS
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Get statistics for a specific station.
   */
  async getStationStatistics(stationId: string): Promise<StationStats> {
    const stationOps = this.operationHistory.filter((op) => op.stationId === stationId);

    const totalOperations = stationOps.length;
    const completedOps = stationOps.filter((op) => op.operationType === "completed").length;
    const cancelledOps = stationOps.filter((op) => op.operationType === "cancelled").length;
    const rejectedOps = stationOps.filter((op) => op.operationType === "rejected").length;
    const startedOps = stationOps.filter((op) => op.operationType === "started").length;

    // Active = started but not yet completed
    const activeOperations = Math.max(0, startedOps - completedOps);

    const pool = this.waitingPools.get(stationId) ?? [];

    return {
      stationId,
      totalOperations,
      activeOperations,
      completedOperations: completedOps,
      cancelledOperations: cancelledOps,
      rejectedOperations: rejectedOps,
      waitingCount: pool.length,
    };
  }

  /**
   * Get statistics for all stations.
   */
  async getAllStationStatistics(): Promise<StationStats[]> {
    const stationIds = new Set(this.operationHistory.map((op) => op.stationId));
    const results: StationStats[] = [];

    for (const stationId of stationIds) {
      const stats = await this.getStationStatistics(stationId);
      results.push(stats);
    }

    return results;
  }
}
