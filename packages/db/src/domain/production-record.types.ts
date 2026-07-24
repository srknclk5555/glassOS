// ─── Production Record Domain Types (Sprint 6.0.0) ───────────────────────────
// Domain model for the Production Record aggregate.
//
// ProductionRecord represents the "as-built" manufacturing history of a
// Production Order. It is created when the completion operation starts
// (status = collecting) and finalized when all production data is assembled
// (status = completed).
//
// Recipe remains immutable. Production Events remain append-only.
// This aggregate is the read model for actual production state.
//
// ── Immutability Rules ───────────────────────────────────────────────────────
// consumptionDetails  → IMMUTABLE after finalization (physical fact)
// costDetails         → MUTABLE (accounting adjustments)
// analysisDetails     → IMMUTABLE after finalization (computed from facts)
// traceability        → APPEND-ONLY (grows as lots/batches are linked)
// summary fields      → IMMUTABLE after finalization

import type {
  ProductionRecordStatus,
  ProductionQualityStatus,
} from "@repo/types";

// ─── Value Objects ───────────────────────────────────────────────────────────

/**
 * Snapshot of the recipe used at time of production.
 * Immutable — captures the engineering intent that governed production.
 */
export interface ProductionSnapshot {
  /** ULID of the recipe used. */
  recipeId: string;
  /** Recipe version number at time of production. */
  recipeVersion: number;
  /** Human-readable recipe code for display purposes. */
  recipeCode?: string;
  /** Human-readable recipe name. */
  recipeName?: string;
}

/**
 * Summary fields that are directly queryable for list views and analytics.
 * These are stored as normalized columns (not JSONB) for performance.
 */
export interface ProductionSummary {
  /** Product type classification (temper, insulating_glass, laminated). */
  productType?: string;
  /** Business dimension — never changes after order creation. */
  businessWidthMm: string;
  /** Business dimension — never changes after order creation. */
  businessHeightMm: string;
  /** Total quantity ordered. */
  quantityRequested: number;
  /** Quantity successfully produced. */
  quantityCompleted: number;
  /** Quantity broken during production. */
  quantityBroken: number;
  /** Total glass sheets consumed (operator-reported). */
  totalSheetsUsed?: number;
  /** Total glass area in square meters. */
  totalGlassAreaM2?: string;
  /** Total waste material in square meters. */
  totalWasteM2?: string;
  /** Yield percentage (completed / total area × 100). */
  yieldPercentage?: string;
  /** Total production cost in currency units. */
  totalCost?: string;
}

/**
 * Itemized material consumption details.
 * Stored as JSONB. IMMUTABLE after finalization.
 */
export interface ProductionConsumptionDetails {
  /** Per-material consumption breakdown. */
  materials: ProductionConsumptionMaterial[];
  /** Total number of sheets used across all materials. */
  totalSheetsUsed: number;
}

/** Single material entry within the consumption breakdown. */
export interface ProductionConsumptionMaterial {
  /** ULID of the material. */
  materialId: string;
  /** Material code for display. */
  materialCode: string;
  /** Material name for display. */
  materialName: string;
  /** Quantity consumed. */
  quantity: number;
  /** Unit of measure (m2, piece, kg, etc.). */
  unit: string;
  /** Consumption basis used (area, perimeter, piece, fixed, duration). */
  consumptionBasis: string;
}

/**
 * Full cost breakdown for the production record.
 * Stored as JSONB. MUTABLE (accounting adjustments are normal).
 */
export interface ProductionCostDetails {
  /** Total cost before adjustments. */
  estimatedTotal: string;
  /** Final cost after all adjustments. */
  actualTotal: string;
  /** Per-material cost breakdown. */
  materialCosts: ProductionCostMaterial[];
  /** Labor cost breakdown. */
  laborCosts?: ProductionCostLabor[];
  /** Energy/machine cost breakdown. */
  overheadCosts?: ProductionCostOverhead[];
  /** Currency code (e.g., TRY, USD, EUR). */
  currency: string;
  /** Timestamp of the last cost adjustment. */
  lastAdjustedAt?: string;
  /** Reason for the last adjustment. */
  lastAdjustmentReason?: string;
}

/** Material cost entry. */
export interface ProductionCostMaterial {
  /** ULID of the material. */
  materialId: string;
  /** Cost per unit. */
  unitCost: string;
  /** Quantity consumed. */
  quantity: number;
  /** Total cost for this material (unitCost × quantity). */
  totalCost: string;
}

/** Labor cost entry. */
export interface ProductionCostLabor {
  /** Operation code where labor was performed. */
  operationCode: string;
  /** Hours worked. */
  hours: number;
  /** Hourly rate. */
  hourlyRate: string;
  /** Total labor cost. */
  totalCost: string;
}

/** Overhead cost entry. */
export interface ProductionCostOverhead {
  /** Category (energy, machine_depreciation, etc.). */
  category: string;
  /** Cost amount. */
  amount: string;
  /** Description of the overhead cost. */
  description?: string;
}

/**
 * Waste analysis and variance breakdown.
 * Stored as JSONB. IMMUTABLE after finalization.
 */
export interface ProductionAnalysisDetails {
  /** Waste analysis by category. */
  waste: ProductionWasteAnalysis;
  /** Variance between recipe standard and actual. */
  variance: ProductionVarianceAnalysis;
}

/** Waste analysis breakdown. */
export interface ProductionWasteAnalysis {
  /** Trim loss in square meters. */
  trimLossM2?: string;
  /** Grinding loss in square meters. */
  grindingLossM2?: string;
  /** Optimization/nesting loss in square meters. */
  optimizationLossM2?: string;
  /** Breakage in square meters. */
  breakageM2?: string;
  /** Total waste across all categories. */
  totalWasteM2: string;
  /** Waste as percentage of total glass area. */
  wastePercentage: string;
}

/** Variance between recipe standard and actual production. */
export interface ProductionVarianceAnalysis {
  /** Variance in material consumption (positive = more used than standard). */
  materialVariancePct?: string;
  /** Variance in waste (positive = more waste than standard). */
  wasteVariancePct?: string;
  /** Variance in yield (negative = lower yield than standard). */
  yieldVariancePct?: string;
  /** Variance in total cost (positive = more expensive than standard). */
  costVariancePct?: string;
}

/**
 * Traceability data — lot trace and batch references.
 * Stored as JSONB. APPEND-ONLY — entries are added but never removed.
 */
export interface ProductionTraceability {
  /** Lot trace entries — which inventory lots were consumed. */
  lotReferences: ProductionLotReference[];
  /** Cutting batch references. */
  batchReferences: ProductionBatchReference[];
  /** Rework chain references (parent/child ProductionRecords). */
  reworkReferences: ProductionReworkReference[];
}

/** Reference to an inventory lot consumed in production. */
export interface ProductionLotReference {
  /** ULID of the inventory lot. */
  lotId: string;
  /** ULID of the inventory item. */
  inventoryItemId: string;
  /** Material code for display. */
  materialCode: string;
  /** Quantity consumed from this lot. */
  quantityConsumed: number;
  /** Unit of measure. */
  unit: string;
  /** Timestamp when this lot reference was recorded. */
  recordedAt: string;
}

/** Reference to a cutting batch. */
export interface ProductionBatchReference {
  /** ULID of the cutting result (batch). */
  cuttingResultId: string;
  /** Cutting date. */
  cuttingDate: string;
  /** Sheets used in the batch. */
  sheetsUsed?: number;
}

/** Reference to a rework chain entry. */
export interface ProductionReworkReference {
  /** ULID of the related ProductionRecord (parent or child). */
  relatedRecordId: string;
  /** Direction of the relationship (parent = this record was reworked from). */
  direction: "parent" | "child";
  /** ULID of the related production order. */
  productionOrderId: string;
  /** Reason for the rework. */
  reason?: string;
}

// ─── Aggregate Root ──────────────────────────────────────────────────────────

/**
 * Production Record — the full aggregate root for a completed Production Order.
 *
 * Combines the production summary, recipe snapshot, consumption data,
 * cost breakdown, waste/variance analysis, and traceability links into
 * a single "as-built" record.
 *
 * Created in `collecting` status when the completion operation starts.
 * Finalized to `completed` status when all data is assembled.
 */
export interface ProductionRecord {
  /** ULID (26 characters). */
  id: string;
  /** ULID of the tenant. */
  tenantId: string;
  /** ULID of the factory (nullable for cross-factory queries). */
  factoryId?: string;
  /** ULID of the production order this record belongs to (1:1). */
  productionOrderId: string;

  /** Current status of the record. */
  status: ProductionRecordStatus;

  /** Normalized queryable summary fields. */
  summary: ProductionSummary;

  /** Snapshot of the recipe used. */
  recipe: ProductionSnapshot;

  /** Itemized material consumption — IMMUTABLE after finalization. */
  consumption?: ProductionConsumptionDetails;

  /** Full cost breakdown — MUTABLE (accounting adjustments). */
  cost?: ProductionCostDetails;

  /** Waste analysis + variance — IMMUTABLE after finalization. */
  analysis?: ProductionAnalysisDetails;

  /** Lot trace + batch references — APPEND-ONLY. */
  traceability?: ProductionTraceability;

  /** Timestamp when collecting started. */
  collectingStartedAt?: string;
  /** Timestamp when the record was finalized. */
  completedAt?: string;
  /** ULID of the user who finalized the record. */
  completedBy?: string;

  /** Standard audit timestamps. */
  createdAt: string;
  updatedAt: string;
  /** ULID of the user who created the record. */
  createdBy?: string;
  /** ULID of the user who last updated the record. */
  updatedBy?: string;
}

// ─── Flat Database Row Model ─────────────────────────────────────────────────

/**
 * Flat representation mirroring the `production_records` database row.
 * Used internally by repositories for direct DB access.
 * Domain logic should use the nested `ProductionRecord` aggregate instead.
 */
export interface ProductionRecordRow {
  id: string;
  tenantId: string;
  factoryId: string | null;
  productionOrderId: string;
  status: ProductionRecordStatus;
  productType: string | null;
  businessWidthMm: string;
  businessHeightMm: string;
  quantityRequested: number;
  quantityCompleted: number;
  quantityBroken: number;
  recipeId: string | null;
  recipeVersion: number;
  totalSheetsUsed: number | null;
  totalGlassAreaM2: string | null;
  totalWasteM2: string | null;
  yieldPercentage: string | null;
  totalCost: string | null;
  consumptionDetails: Record<string, unknown> | null;
  costDetails: Record<string, unknown> | null;
  analysisDetails: Record<string, unknown> | null;
  traceability: Record<string, unknown> | null;
  collectingStartedAt: string | null;
  completedAt: string | null;
  completedBy: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// ─── Input / Update Models ───────────────────────────────────────────────────

/**
 * Input required to create a ProductionRecord.
 *
 * The record is created in `collecting` status when the completion operation
 * starts. Most fields are populated later during finalization.
 */
export interface ProductionRecordCreateInput {
  /** ULID of the production order. */
  productionOrderId: string;
  /** ULID of the tenant. */
  tenantId: string;
  /** ULID of the factory. */
  factoryId?: string;
  /** Product type classification. */
  productType?: string;
  /** Business dimension in mm. */
  businessWidthMm: string;
  /** Business dimension in mm. */
  businessHeightMm: string;
  /** Total quantity ordered. */
  quantityRequested: number;
  /** ULID of the recipe used. */
  recipeId?: string;
  /** Recipe version at time of production. */
  recipeVersion: number;
}

/**
 * Fields that can be updated on a ProductionRecord.
 *
 * Most fields are populated during finalization (collecting → completed).
 * `costDetails` can be mutated after finalization for accounting adjustments.
 * `traceability` entries can be appended.
 */
export interface ProductionRecordUpdateInput {
  /** New status. Only valid transitions: collecting → completed, completed → archived. */
  status?: ProductionRecordStatus;
  /** Quantity successfully produced. */
  quantityCompleted?: number;
  /** Quantity broken during production. */
  quantityBroken?: number;
  /** Total glass sheets consumed. */
  totalSheetsUsed?: number;
  /** Total glass area in square meters. */
  totalGlassAreaM2?: string;
  /** Total waste in square meters. */
  totalWasteM2?: string;
  /** Yield percentage. */
  yieldPercentage?: string;
  /** Total cost. */
  totalCost?: string;
  /** Itemized consumption data — set once during finalization. */
  consumptionDetails?: ProductionConsumptionDetails;
  /** Cost breakdown — can be updated for accounting adjustments. */
  costDetails?: ProductionCostDetails;
  /** Waste analysis + variance data — set once during finalization. */
  analysisDetails?: ProductionAnalysisDetails;
  /** Traceability data — entries can be appended. */
  traceability?: ProductionTraceability;
  /** Timestamp when the record was finalized. */
  completedAt?: string;
  /** ULID of the user who finalized the record. */
  completedBy?: string;
}

// ─── API Response Model ──────────────────────────────────────────────────────

/**
 * Production Record response returned by the API.
 *
 * Aligned with the domain `ProductionRecord` aggregate structure.
 * All timestamps are ISO 8601 strings.
 * All numeric values are returned as strings to preserve precision.
 */
export interface ProductionRecordResponse {
  id: string;
  productionOrderId: string;
  status: ProductionRecordStatus;

  /** Production summary (readable list view data). */
  productType?: string;
  businessWidthMm: string;
  businessHeightMm: string;
  quantityRequested: number;
  quantityCompleted: number;
  quantityBroken: number;
  totalSheetsUsed?: number;
  totalGlassAreaM2?: string;
  totalWasteM2?: string;
  yieldPercentage?: string;
  totalCost?: string;

  /** Recipe snapshot. */
  recipeId?: string;
  recipeVersion: number;

  /** Nested detail objects (included when full detail is requested). */
  consumption?: ProductionConsumptionDetails;
  cost?: ProductionCostDetails;
  analysis?: ProductionAnalysisDetails;
  traceability?: ProductionTraceability;

  /** Timeline. */
  collectingStartedAt?: string;
  completedAt?: string;
  completedBy?: string;

  /** Audit timestamps. */
  createdAt: string;
  updatedAt: string;
}

// ─── Event Models ────────────────────────────────────────────────────────────

/**
 * Payload for ProductionRecordOpenedEvent.
 * Fired when a completion operation starts and the record is created
 * in `collecting` status.
 */
export interface ProductionRecordOpenedEventPayload {
  productionRecordId: string;
  productionOrderId: string;
  tenantId: string;
  factoryId?: string;
  recipeId?: string;
  recipeVersion: number;
  openedAt: string;
}

/**
 * Payload for ProductionRecordFinalizedEvent.
 * Fired when all production data has been assembled and the record
 * transitions to `completed` status.
 */
export interface ProductionRecordFinalizedEventPayload {
  productionRecordId: string;
  productionOrderId: string;
  tenantId: string;
  summary: {
    quantityCompleted: number;
    quantityBroken: number;
    totalSheetsUsed?: number;
    totalGlassAreaM2?: string;
    yieldPercentage?: string;
    totalCost?: string;
  };
  finalizedAt: string;
}

/**
 * Payload for ProductionRecordCostAdjustedEvent.
 * Fired when accounting adjusts the cost after finalization.
 */
export interface ProductionRecordCostAdjustedEventPayload {
  productionRecordId: string;
  productionOrderId: string;
  previousTotalCost: string;
  newTotalCost: string;
  reason: string;
  adjustedAt: string;
}
