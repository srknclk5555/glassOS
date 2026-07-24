// ─── Production Record Repository (Sprint 6.0.0) ─────────────────────────────
// Persistence layer for the Production Record aggregate.
//
// This repository is responsible ONLY for persistence.
// No business logic. No calculations. No event publishing.
//
// Maps: ProductionRecordRow (flat DB) → ProductionRecord (nested domain aggregate)
// Never exposes raw database rows outside the repository.
//
// ── Immutability Rules ───────────────────────────────────────────────────────
// consumptionDetails  → IMMUTABLE after finalization (set once)
// costDetails         → MUTABLE (accounting adjustments allowed)
// analysisDetails     → IMMUTABLE after finalization (set once)
// traceability        → APPEND-ONLY (entries added, never removed)
// summary columns     → IMMUTABLE after finalization
// Production records cannot be deleted — use status 'archived'.

import { and, eq, asc, desc, sql, ilike, or } from "drizzle-orm";
import { productionRecords } from "../schema/index";
import { BaseRepository } from "./base.repository";

import type {
  ProductionRecord,
  ProductionRecordRow,
} from "../domain/production-record.types";

// ─── Filter Types ────────────────────────────────────────────────────────────

export interface ProductionRecordListFilters {
  status?: string;
  productType?: string;
  productionOrderId?: string;
  recipeId?: string;
  completedBy?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface ProductionRecordListResult {
  items: ProductionRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Repository ──────────────────────────────────────────────────────────────

export class ProductionRecordRepository extends BaseRepository<any> {
  constructor(db: any) {
    super(db, productionRecords, {
      softDelete: false,
      tenantScoped: true,
      factoryScoped: true,
    });
  }

  /* ─── Transaction-safe DB resolver ──────────────────────────────────── */

  private resolveTx(options?: { tx?: unknown }): any {
    return this.getDb(options?.tx);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     MAPPING
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Map a flat database row to the nested ProductionRecord domain aggregate.
   * JSONB columns are cast via their domain types — runtime validation is
   * the caller's responsibility (or a future Zod schema layer).
   */
  private toDomain(row: ProductionRecordRow): ProductionRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      factoryId: row.factoryId ?? undefined,
      productionOrderId: row.productionOrderId,
      status: row.status,
      summary: {
        productType: row.productType ?? undefined,
        businessWidthMm: row.businessWidthMm,
        businessHeightMm: row.businessHeightMm,
        quantityRequested: row.quantityRequested,
        quantityCompleted: row.quantityCompleted,
        quantityBroken: row.quantityBroken,
        totalSheetsUsed: row.totalSheetsUsed ?? undefined,
        totalGlassAreaM2: row.totalGlassAreaM2 ?? undefined,
        totalWasteM2: row.totalWasteM2 ?? undefined,
        yieldPercentage: row.yieldPercentage ?? undefined,
        totalCost: row.totalCost ?? undefined,
      },
      recipe: {
        recipeId: row.recipeId ?? "",
        recipeVersion: row.recipeVersion,
      },
      consumption: (row.consumptionDetails ?? undefined) as any,
      cost: (row.costDetails ?? undefined) as any,
      analysis: (row.analysisDetails ?? undefined) as any,
      traceability: (row.traceability ?? undefined) as any,
      collectingStartedAt: row.collectingStartedAt ?? undefined,
      completedAt: row.completedAt ?? undefined,
      completedBy: row.completedBy ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy ?? undefined,
      updatedBy: row.updatedBy ?? undefined,
    };
  }

  /* ══════════════════════════════════════════════════════════════════════════
     FINDERS
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Find a production record by its ULID.
   * Returns the nested domain aggregate, or undefined if not found.
   *
   * @param id - ULID of the production record
   * @param options - Transaction context (optional)
   */
  async findById(
    id: string,
    options?: { tx?: unknown },
  ): Promise<ProductionRecord | undefined> {
    const db = this.resolveTx(options);

    const row = await db
      .select()
      .from(productionRecords)
      .where(eq(productionRecords.id, id))
      .limit(1);

    if (!row[0]) return undefined;
    return this.toDomain(row[0] as ProductionRecordRow);
  }

  /**
   * Find a production record by its production order ID (1:1 relationship).
   * Returns the nested domain aggregate, or undefined if not found.
   *
   * @param productionOrderId - ULID of the production order
   * @param options - Transaction context (optional)
   */
  async findByProductionOrderId(
    productionOrderId: string,
    options?: { tx?: unknown },
  ): Promise<ProductionRecord | undefined> {
    const db = this.resolveTx(options);

    const row = await db
      .select()
      .from(productionRecords)
      .where(eq(productionRecords.productionOrderId, productionOrderId))
      .limit(1);

    if (!row[0]) return undefined;
    return this.toDomain(row[0] as ProductionRecordRow);
  }

  /**
   * Find production records with filtering, pagination, and sorting.
   * Uses SQL-level WHERE + ORDER BY + LIMIT/OFFSET for performance.
   *
   * All queries are tenant-scoped.
   *
   * @param tenantId - Tenant ULID (required)
   * @param filters - Optional filters (status, productType, date range, search, etc.)
   * @param options - Transaction context (optional)
   */
  async findForList(
    tenantId: string,
    filters?: ProductionRecordListFilters,
    options?: { tx?: unknown },
  ): Promise<ProductionRecordListResult> {
    const db = this.resolveTx(options);
    const conditions: any[] = [eq(productionRecords.tenantId, tenantId)];

    // ── Status filter ───────────────────────────────────────────────────
    if (filters?.status) {
      conditions.push(eq(productionRecords.status, filters.status));
    }

    // ── Product type filter ─────────────────────────────────────────────
    if (filters?.productType) {
      conditions.push(eq(productionRecords.productType, filters.productType));
    }

    // ── Production order filter ─────────────────────────────────────────
    if (filters?.productionOrderId) {
      conditions.push(
        eq(productionRecords.productionOrderId, filters.productionOrderId),
      );
    }

    // ── Recipe filter ───────────────────────────────────────────────────
    if (filters?.recipeId) {
      conditions.push(eq(productionRecords.recipeId, filters.recipeId));
    }

    // ── Completed-by filter ─────────────────────────────────────────────
    if (filters?.completedBy) {
      conditions.push(eq(productionRecords.completedBy, filters.completedBy));
    }

    // ── Date range filter ───────────────────────────────────────────────
    if (filters?.startDate) {
      conditions.push(
        sql`${productionRecords.createdAt} >= ${filters.startDate}`,
      );
    }
    if (filters?.endDate) {
      conditions.push(
        sql`${productionRecords.createdAt} <= ${filters.endDate}`,
      );
    }

    // ── Search filter ──────────────────────────────────────────────────
    if (filters?.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(productionRecords.productType, pattern),
          ilike(productionRecords.id, pattern),
        ),
      );
    }

    const where = and(...conditions);

    const page = Math.max(1, filters?.page ?? 1);
    const pageSize = Math.max(1, filters?.pageSize ?? 20);
    const offset = (page - 1) * pageSize;

    const orderColumn = filters?.sortBy ?? "createdAt";
    const orderDir = filters?.sortOrder === "desc" ? desc : asc;

    const rows = await db
      .select()
      .from(productionRecords)
      .where(where)
      .orderBy(
        orderDir(
          (productionRecords as any)[orderColumn] ??
            productionRecords.createdAt,
        ),
      )
      .limit(pageSize)
      .offset(offset);

    const totalResult = await db
      .select({ total: sql<number>`count(*)` })
      .from(productionRecords)
      .where(where);

    const total = Number(totalResult[0]?.total ?? 0);

    return {
      items: (rows as ProductionRecordRow[]).map((r) => this.toDomain(r)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /* ══════════════════════════════════════════════════════════════════════════
     CREATE
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Create a new production record in `collecting` status.
   *
   * Sets collectingStartedAt to the current timestamp.
   * All performance summary fields default to zero/null until finalization.
   *
   * Expects input with: id, productionOrderId, tenantId, businessWidthMm,
   * businessHeightMm, quantityRequested, recipeVersion, and optionally
   * factoryId, productType, recipeId, createdBy.
   *
   * @param input - Flat creation object (see ProductionRecordCreateInput shape)
   * @param options - Transaction context (optional)
   */
  async create(input: any = {}, options: any = {}): Promise<any> {
    const db = this.resolveTx(options);
    const now = new Date().toISOString();

    const record: Record<string, unknown> = {
      id: input.id,
      tenantId: input.tenantId,
      factoryId: input.factoryId ?? null,
      productionOrderId: input.productionOrderId,
      status: "collecting",
      productType: input.productType ?? null,
      businessWidthMm: input.businessWidthMm,
      businessHeightMm: input.businessHeightMm,
      quantityRequested: input.quantityRequested,
      quantityCompleted: 0,
      quantityBroken: 0,
      recipeId: input.recipeId ?? null,
      recipeVersion: input.recipeVersion,
      totalSheetsUsed: null,
      totalGlassAreaM2: null,
      totalWasteM2: null,
      yieldPercentage: null,
      totalCost: null,
      consumptionDetails: null,
      costDetails: null,
      analysisDetails: null,
      traceability: null,
      collectingStartedAt: now,
      completedAt: null,
      completedBy: null,
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy ?? null,
      updatedBy: input.createdBy ?? null,
    };

    const result = await db
      .insert(productionRecords)
      .values(record)
      .returning()
      .execute();

    return this.toDomain((result?.[0] ?? record) as ProductionRecordRow);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     UPDATE
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Update a production record.
   *
   * Maps update fields to flat DB columns. Only provided fields are
   * updated — partial updates are safe.
   *
   * Accepts any of the ProductionRecordUpdateInput fields: status,
   * quantityCompleted, quantityBroken, totalSheetsUsed, totalGlassAreaM2,
   * totalWasteM2, yieldPercentage, totalCost, consumptionDetails,
   * costDetails, analysisDetails, traceability, completedAt, completedBy.
   *
   * @param id - ULID of the production record to update
   * @param changes - Flat update object with fields to change
   * @param options - Transaction context (optional)
   */
  async update(id: string, changes: any = {}, options: any = {}): Promise<any> {
    const db = this.resolveTx(options);
    const now = new Date().toISOString();

    const allowedFields = [
      "status", "quantityCompleted", "quantityBroken",
      "totalSheetsUsed", "totalGlassAreaM2", "totalWasteM2",
      "yieldPercentage", "totalCost",
      "consumptionDetails", "costDetails", "analysisDetails", "traceability",
      "completedAt", "completedBy",
    ];

    const payload: Record<string, unknown> = {
      updatedAt: now,
      updatedBy: changes.updatedBy ?? null,
    };

    for (const field of allowedFields) {
      if (changes[field] !== undefined) {
        payload[field] = changes[field] as any;
      }
    }

    const result = await db
      .update(productionRecords)
      .set(payload)
      .where(eq(productionRecords.id, id))
      .returning()
      .execute();

    if (!result?.[0]) return undefined;
    return this.toDomain(result[0] as ProductionRecordRow);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     EXISTENCE
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Check if a production record exists by ID.
   * Uses a lightweight SELECT on id only — no full row fetch.
   *
   * @param id - ULID of the production record
   * @param options - Transaction context (optional)
   */
  async exists(
    id: string,
    options?: { tx?: unknown },
  ): Promise<boolean> {
    const db = this.resolveTx(options);

    const row = await db
      .select({ id: productionRecords.id })
      .from(productionRecords)
      .where(eq(productionRecords.id, id))
      .limit(1);

    return row.length > 0;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     COUNT
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Count production records matching the given filters.
   * Uses SQL count(*) for performance.
   *
   * @param tenantId - Tenant ULID (required)
   * @param filters - Optional filters (status, productType)
   * @param options - Transaction context (optional)
   */
  async count(
    tenantId: string,
    filters?: { status?: string; productType?: string },
    options?: { tx?: unknown },
  ): Promise<number> {
    const db = this.resolveTx(options);
    const conditions: any[] = [eq(productionRecords.tenantId, tenantId)];

    if (filters?.status) {
      conditions.push(eq(productionRecords.status, filters.status));
    }
    if (filters?.productType) {
      conditions.push(eq(productionRecords.productType, filters.productType));
    }

    const result = await db
      .select({ total: sql<number>`count(*)` })
      .from(productionRecords)
      .where(and(...conditions));

    return Number(result[0]?.total ?? 0);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     DELETE (NOT SUPPORTED)
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Delete is NOT supported for production records.
   *
   * Production records are immutable historical records — they capture the
   * "as-built" manufacturing history. Use status 'archived' instead.
   *
   * @throws {Error} Always throws — this operation is intentionally disabled.
   */
  async delete(_id: string): Promise<never> {
    throw new Error(
      "Production records cannot be deleted. They are immutable historical " +
        "records that capture as-built manufacturing data. " +
        "Use status 'archived' instead.",
    );
  }
}
