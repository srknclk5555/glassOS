import { ProductionRepository } from "../repositories/production.repository.js";
import { OrderLineRepository } from "../repositories/order-line.repository.js";
import { OrderRepository } from "../repositories/order.repository.js";
import { ReworkRepository } from "../repositories/rework.repository.js";
import { withTenantSession } from "../db/transactions.js";

import type {
  InspectionStartedEvent,
  InspectionPassedEvent,
  InspectionFailedEvent,
  InspectionRejectedEvent,
  ReworkRequestedEvent,
  ReadyApprovedEvent,
  EventPublisher,
} from "./events.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export type InspectionType = "visual" | "dimension" | "edge" | "temper" | "insulating_glass" | "final";

export type InspectionResult = "pass" | "fail" | "conditional_pass" | "rework_required" | "scrap";

// Future compatible: "customer_inspection"

export interface Measurement {
  widthMm?: number;
  heightMm?: number;
  diagonalMm?: number;
  thicknessMm?: number;
  areaM2?: number;
  toleranceMm?: number;
  measuredBy?: string;
  measuredAt: Date;
  notes?: string;
}

export interface TemperInspectionDetails {
  visualBreakage?: string;
  edgeQuality?: string;
  surfaceQuality?: string;
  rollerMarks?: string;
  stressObservation?: string;
  inspectionNotes?: string;
}

export interface InsulatingGlassInspectionDetails {
  spacer?: string;
  sealQuality?: string;
  lowEOrientation?: string;
  gasInformation?: string;
  visualContamination?: string;
  alignment?: string;
}

export interface VisualInspectionDetails {
  appearance?: string;
  scratches?: string;
  chips?: string;
  cleanliness?: string;
  coating?: string;
  inspectionNotes?: string;
}

export interface StartInspectionInput {
  id: string;
  productionOrderId: string;
  stationId: string;
  inspectionType: InspectionType;
  inspectorId: string;
  machineId?: string;
  shift?: string;
  notes?: string;
}

export interface InspectionRecord {
  id: string;
  productionOrderId: string;
  stationId: string;
  inspectionType: InspectionType;
  result: InspectionResult | "in_progress";
  inspectorId: string;
  machineId?: string;
  shift?: string;
  measurements?: Measurement;
  temperDetails?: TemperInspectionDetails;
  igDetails?: InsulatingGlassInspectionDetails;
  visualDetails?: VisualInspectionDetails;
  notes?: string;
  timestamp: Date;
  approvedAt?: Date;
  approvedBy?: string;
  reworkOrderId?: string;
  rejectionReason?: string;
}

export interface QualityStats {
  totalInspections: number;
  passedInspections: number;
  failedInspections: number;
  rejectedInspections: number;
  conditionalPassInspections: number;
  reworkRequiredInspections: number;
  scrapInspections: number;
  byType: Record<string, number>;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class QualityControlService {
  // In-memory immutable inspection history
  private inspectionHistory: InspectionRecord[] = [];

  constructor(
    private readonly productionRepository: ProductionRepository,
    private readonly orderLineRepository: OrderLineRepository,
    private readonly orderRepository: OrderRepository,
    private readonly reworkRepository: ReworkRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly db: any
  ) {}

  // ═════════════════════════════════════════════════════════════════════════
  // 1. START INSPECTION
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Start a new quality inspection for a production order.
   * Validates that the production order exists and is in a valid state.
   */
  async startInspection(
    input: StartInspectionInput
  ): Promise<{
    record: InspectionRecord;
    events: InspectionStartedEvent[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const { productionOrderId } = input;

      const prod = await this.productionRepository.findById(productionOrderId);
      if (!prod) {
        throw new Error(`Production order not found: ${productionOrderId}`);
      }
      if (prod.currentStatus === "completed") {
        throw new Error(`Cannot inspect completed production order: ${productionOrderId}`);
      }
      if (prod.currentStatus === "cancelled") {
        throw new Error(`Cannot inspect cancelled production order: ${productionOrderId}`);
      }

      const now = new Date();
      const record: InspectionRecord = {
        id: input.id,
        productionOrderId,
        stationId: input.stationId,
        inspectionType: input.inspectionType,
        result: "in_progress",
        inspectorId: input.inspectorId,
        machineId: input.machineId,
        shift: input.shift,
        notes: input.notes,
        timestamp: now,
      };
      this.inspectionHistory.push(record);

      const event: InspectionStartedEvent = {
        eventType: "inspection.started",
        inspectionId: input.id,
        productionOrderId,
        stationId: input.stationId,
        inspectionType: input.inspectionType,
        inspectorId: input.inspectorId,
        machineId: input.machineId,
        shift: input.shift,
        startedAt: now,
      };

      return { record, events: [event] };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. RECORD MEASUREMENTS
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Record dimensional measurements for an inspection.
   * Manual entry only — no automatic machine integration.
   */
  async recordMeasurements(
    inspectionId: string,
    measurement: Measurement
  ): Promise<{
    record: InspectionRecord;
  }> {
    return withTenantSession(async (tx, ctx) => {
      const record = this.inspectionHistory.find((r) => r.id === inspectionId);
      if (!record) {
        throw new Error(`Inspection record not found: ${inspectionId}`);
      }
      if (record.result !== "in_progress") {
        throw new Error(`Cannot record measurements on completed inspection: ${inspectionId}`);
      }

      record.measurements = measurement;
      return { record };
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 3. RECORD VISUAL INSPECTION
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Record visual inspection details.
   */
  async recordVisualInspection(
    inspectionId: string,
    details: VisualInspectionDetails
  ): Promise<{
    record: InspectionRecord;
  }> {
    return withTenantSession(async (tx, ctx) => {
      const record = this.inspectionHistory.find((r) => r.id === inspectionId);
      if (!record) {
        throw new Error(`Inspection record not found: ${inspectionId}`);
      }
      if (record.result !== "in_progress") {
        throw new Error(`Cannot record visual inspection on completed inspection: ${inspectionId}`);
      }

      record.visualDetails = details;
      return { record };
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 4. RECORD NOTES
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Record notes for an inspection.
   */
  async recordNotes(
    inspectionId: string,
    notes: string
  ): Promise<{
    record: InspectionRecord;
  }> {
    return withTenantSession(async (tx, ctx) => {
      const record = this.inspectionHistory.find((r) => r.id === inspectionId);
      if (!record) {
        throw new Error(`Inspection record not found: ${inspectionId}`);
      }

      record.notes = record.notes
        ? `${record.notes}\n${notes}`
        : notes;
      return { record };
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 5. COMPLETE INSPECTION
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Complete an inspection with a final result.
   *
   * PASS: production may proceed to READY
   * CONDITIONAL_PASS: requires approval before READY
   * FAIL: inspection recorded as failed
   * REWORK_REQUIRED: creates a rework order (no duplicates)
   * SCRAP: marks production as scrapped
   *
   * Single transaction: Inspection → Validation → History → Counters → Rework → Events
   */
  async completeInspection(
    inspectionId: string,
    result: InspectionResult,
    completedBy?: string
  ): Promise<{
    record: InspectionRecord;
    events: any[];
    reworkOrder?: any;
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const record = this.inspectionHistory.find((r) => r.id === inspectionId);
      if (!record) {
        throw new Error(`Inspection record not found: ${inspectionId}`);
      }
      if (record.result !== "in_progress") {
        throw new Error(`Inspection already completed: ${inspectionId}`);
      }

      const prod = await this.productionRepository.findById(record.productionOrderId);
      if (!prod) {
        throw new Error(`Production order not found: ${record.productionOrderId}`);
      }

      // Update the record
      record.result = result;
      record.timestamp = new Date();

      const events: any[] = [];
      let reworkOrder: any = undefined;

      if (result === "pass" || result === "conditional_pass") {
        // PASS or CONDITIONAL_PASS — emit InspectionPassedEvent
        const passedEvent: InspectionPassedEvent = {
          eventType: "inspection.passed",
          inspectionId,
          productionOrderId: record.productionOrderId,
          inspectionType: record.inspectionType,
          result,
          passedAt: new Date(),
          approvedBy: completedBy,
        };
        events.push(passedEvent);

        if (result === "pass") {
          // Direct PASS — production may proceed to READY
          // (READY station assignment is handled by the caller or transfer service)
        }
      } else if (result === "fail") {
        // FAIL — emit InspectionFailedEvent
        const failedEvent: InspectionFailedEvent = {
          eventType: "inspection.failed",
          inspectionId,
          productionOrderId: record.productionOrderId,
          inspectionType: record.inspectionType,
          result: "fail",
          reason: record.notes ?? "Quality inspection failed",
          failedAt: new Date(),
        };
        events.push(failedEvent);
      } else if (result === "rework_required") {
        // REWORK_REQUIRED — create rework (no duplicates)
        const reason = record.notes ?? "Quality inspection: rework required";

        // Check for existing unresolved rework
        const existingReworks = await this.reworkRepository.findOpenReworks();
        const existingForProd = existingReworks.filter(
          (r: any) => r.parentProductionOrderId === record.productionOrderId
        );
        if (existingForProd.length > 0) {
          throw new Error(
            `Unresolved rework already exists for production order: ${record.productionOrderId}`
          );
        }

        // Create rework order via rework repository
        // Use tenantId from production or default
        const tenantId = prod.tenantId ?? "01TENANT000000000000000001";
        reworkOrder = await this.reworkRepository.create({
          id: `RW_QC_${inspectionId}`,
          tenantId,
          factoryId: prod.factoryId,
          parentProductionOrderId: record.productionOrderId,
          reworkReason: reason,
          reworkStatus: "pending",
          source: "quality_control",
        });

        record.reworkOrderId = reworkOrder.id;

        const reworkEvent: ReworkRequestedEvent = {
          eventType: "rework.requested",
          inspectionId,
          productionOrderId: record.productionOrderId,
          reworkOrderId: reworkOrder.id,
          reason,
          requestedAt: new Date(),
        };
        events.push(reworkEvent);

        // Also emit InspectionFailedEvent for tracking
        const failedEvent: InspectionFailedEvent = {
          eventType: "inspection.failed",
          inspectionId,
          productionOrderId: record.productionOrderId,
          inspectionType: record.inspectionType,
          result: "fail",
          reason,
          failedAt: new Date(),
        };
        events.push(failedEvent);
      } else if (result === "scrap") {
        // SCRAP — mark production as scrapped
        const reason = record.notes ?? "Quality inspection: scrap";

        await this.productionRepository.update(record.productionOrderId, {
          currentStatus: "scrapped",
        } as any);

        record.rejectionReason = reason;

        const failedEvent: InspectionFailedEvent = {
          eventType: "inspection.failed",
          inspectionId,
          productionOrderId: record.productionOrderId,
          inspectionType: record.inspectionType,
          result: "scrap",
          reason,
          failedAt: new Date(),
        };
        events.push(failedEvent);
      }

      return { record, events, reworkOrder };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 6. REJECT INSPECTION
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Reject an inspection outright.
   * This is used when the inspection itself is invalid or should be discarded.
   */
  async rejectInspection(
    inspectionId: string,
    reason: string
  ): Promise<{
    record: InspectionRecord;
    events: InspectionRejectedEvent[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const record = this.inspectionHistory.find((r) => r.id === inspectionId);
      if (!record) {
        throw new Error(`Inspection record not found: ${inspectionId}`);
      }

      record.result = "fail";
      record.rejectionReason = reason;
      record.timestamp = new Date();

      const event: InspectionRejectedEvent = {
        eventType: "inspection.rejected",
        inspectionId,
        productionOrderId: record.productionOrderId,
        reason,
        rejectedAt: new Date(),
      };

      return { record, events: [event] };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 7. APPROVE INSPECTION (Conditional Pass → READY)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Approve a conditional pass inspection.
   * Validates that the inspection result is conditional_pass.
   * After approval, the production may proceed to READY.
   */
  async approveInspection(
    inspectionId: string,
    approvedBy: string
  ): Promise<{
    record: InspectionRecord;
    events: ReadyApprovedEvent[];
  }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const record = this.inspectionHistory.find((r) => r.id === inspectionId);
      if (!record) {
        throw new Error(`Inspection record not found: ${inspectionId}`);
      }
      if (record.result !== "conditional_pass") {
        throw new Error(
          `Only conditional pass inspections can be approved. Current result: ${record.result}`
        );
      }
      if (record.approvedAt) {
        throw new Error(`Inspection already approved: ${inspectionId}`);
      }

      const prod = await this.productionRepository.findById(record.productionOrderId);
      if (!prod) {
        throw new Error(`Production order not found: ${record.productionOrderId}`);
      }
      if (prod.currentStatus === "completed") {
        throw new Error(`Cannot approve inspection for completed production order`);
      }
      if (prod.currentStatus === "cancelled") {
        throw new Error(`Cannot approve inspection for cancelled production order`);
      }

      const now = new Date();
      record.approvedAt = now;
      record.approvedBy = approvedBy;

      const event: ReadyApprovedEvent = {
        eventType: "ready.approved",
        productionOrderId: record.productionOrderId,
        inspectionId,
        approvedBy,
        approvedAt: now,
      };

      return { record, events: [event] };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 8. HISTORY
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Get inspection history for a specific production order,
   * or all history if no productionOrderId provided.
   * Returns immutable copies.
   */
  async getHistory(productionOrderId?: string): Promise<InspectionRecord[]> {
    if (productionOrderId) {
      return this.inspectionHistory
        .filter((r) => r.productionOrderId === productionOrderId)
        .map((r) => ({ ...r }));
    }
    return this.inspectionHistory.map((r) => ({ ...r }));
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 9. STATISTICS
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Get quality control statistics.
   */
  async getStatistics(): Promise<QualityStats> {
    const stats: QualityStats = {
      totalInspections: this.inspectionHistory.length,
      passedInspections: 0,
      failedInspections: 0,
      rejectedInspections: 0,
      conditionalPassInspections: 0,
      reworkRequiredInspections: 0,
      scrapInspections: 0,
      byType: {},
    };

    for (const r of this.inspectionHistory) {
      // Count by type
      stats.byType[r.inspectionType] = (stats.byType[r.inspectionType] ?? 0) + 1;

      // Count by result
      if (r.result === "pass") {
        stats.passedInspections++;
      } else if (r.result === "conditional_pass") {
        stats.conditionalPassInspections++;
      } else if (r.result === "rework_required") {
        stats.reworkRequiredInspections++;
      } else if (r.result === "scrap") {
        stats.scrapInspections++;
      } else if (r.result === "fail") {
        if (r.rejectionReason && !r.reworkOrderId) {
          stats.rejectedInspections++;
        } else {
          stats.failedInspections++;
        }
      }
    }

    return stats;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 10. READY VALIDATION
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Check if a production order is eligible for READY station.
   * Production may enter READY only if:
   * - Has at least one PASS inspection, OR
   * - Has an approved conditional pass inspection
   */
  async canProceedToReady(productionOrderId: string): Promise<{
    eligible: boolean;
    reason?: string;
  }> {
    const prodRecords = this.inspectionHistory.filter(
      (r) => r.productionOrderId === productionOrderId
    );

    if (prodRecords.length === 0) {
      return { eligible: false, reason: "No inspection records found" };
    }

    const hasPass = prodRecords.some((r) => r.result === "pass");
    if (hasPass) {
      return { eligible: true };
    }

    const hasApprovedConditional = prodRecords.some(
      (r) => r.result === "conditional_pass" && r.approvedAt
    );
    if (hasApprovedConditional) {
      return { eligible: true, reason: "Approved conditional pass" };
    }

    const hasUnapprovedConditional = prodRecords.some(
      (r) => r.result === "conditional_pass" && !r.approvedAt
    );
    if (hasUnapprovedConditional) {
      return { eligible: false, reason: "Conditional pass not yet approved" };
    }

    return { eligible: false, reason: "No passing inspection result" };
  }
}
