import {
  pgTable,
  char,
  varchar,
  integer,
  numeric,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";
import { factories } from "./factories";
import { productionOrders } from "./production";
import { recipes } from "./recipes";
import { users } from "./users";

// ─── Aggregate Root ───────────────────────────────────────────────────────────
// Production Record — the "as-built" manufacturing history of a Production Order.
// Created when completion operation starts (status = collecting),
// finalized when all data is assembled (status = completed).
// Recipe remains immutable. Events remain append-only.
// This is the read-model for actual production state.

export const productionRecords = pgTable(
  "production_records",
  {
    id: char("id", { length: 26 }).primaryKey(),
    tenantId: char("tenant_id", { length: 26 })
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    factoryId: char("factory_id", { length: 26 }).references(
      () => factories.id,
      { onDelete: "restrict" }
    ),
    productionOrderId: char("production_order_id", { length: 26 })
      .notNull()
      .references(() => productionOrders.id, { onDelete: "restrict" }),

    // ── Status lifecycle ──────────────────────────────────────────────────
    status: varchar("status", { length: 20 }).notNull().default("collecting"),
    // collecting | completed | archived

    // ── Production summary (normalized for querying) ──────────────────────
    productType: varchar("product_type", { length: 50 }),
    businessWidthMm: numeric("business_width_mm", { precision: 8, scale: 2 }).notNull(),
    businessHeightMm: numeric("business_height_mm", { precision: 8, scale: 2 }).notNull(),
    quantityRequested: integer("quantity_requested").notNull(),
    quantityCompleted: integer("quantity_completed").notNull().default(0),
    quantityBroken: integer("quantity_broken").notNull().default(0),

    // ── Recipe snapshot (version at time of production) ───────────────────
    recipeId: char("recipe_id", { length: 26 }).references(
      () => recipes.id,
      { onDelete: "restrict" }
    ),
    recipeVersion: integer("recipe_version").notNull(),

    // ── Consumption summary (normalized for fast queries) ─────────────────
    totalSheetsUsed: integer("total_sheets_used"),
    totalGlassAreaM2: numeric("total_glass_area_m2", { precision: 12, scale: 4 }),
    totalWasteM2: numeric("total_waste_m2", { precision: 12, scale: 4 }),
    yieldPercentage: numeric("yield_percentage", { precision: 5, scale: 2 }),

    // ── Cost summary (normalized; detailed breakdown in JSONB) ────────────
    totalCost: numeric("total_cost", { precision: 14, scale: 4 }),

    // ── Detailed breakdowns (JSONB for variable-schema data) ──────────────
    consumptionDetails: jsonb("consumption_details"),
    // itemized materials consumed — immutable after finalization
    costDetails: jsonb("cost_details"),
    // full cost breakdown — MUTABLE (accounting adjustments)
    analysisDetails: jsonb("analysis_details"),
    // waste analysis + variance — immutable after finalization
    traceability: jsonb("traceability"),
    // lot trace + batch references — append-only

    // ── Timeline ──────────────────────────────────────────────────────────
    collectingStartedAt: timestamp("collecting_started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: char("completed_by", { length: 26 }).references(
      () => users.id,
      { onDelete: "restrict" }
    ),

    // ── Standard audit columns ────────────────────────────────────────────
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    createdBy: char("created_by", { length: 26 }),
    updatedBy: char("updated_by", { length: 26 }),
  },
  (table) => ({
    // ── Indexes ───────────────────────────────────────────────────────────
    tenantOrderIdx: index("idx_pr_tenant_order").on(
      table.tenantId,
      table.productionOrderId
    ),
    tenantIdx: index("idx_pr_tenant").on(table.tenantId),
    completedAtIdx: index("idx_pr_completed_at").on(table.completedAt),
    productTypeIdx: index("idx_pr_product_type").on(table.productType),
    yieldIdx: index("idx_pr_yield").on(table.yieldPercentage),
  })
);
