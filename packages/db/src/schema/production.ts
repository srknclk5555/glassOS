import {
  pgTable,
  char,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  jsonb,
  timestamp,
  date,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";
import { factories } from "./factories";
import { orderLines } from "./orders";
import { stations } from "./stations";
import { machines } from "./machines";
import { materials } from "./materials-products";
import { personnel } from "./personnel";
import { personnelShifts } from "./personnel";

// ─── Aggregate Root ───────────────────────────────────────────────────────────

export const productionOrders = pgTable("production_orders", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  factoryId: char("factory_id", { length: 26 }).references(
    () => factories.id,
    { onDelete: "restrict" }
  ),
  orderLineId: char("order_line_id", { length: 26 })
    .notNull()
    .references(() => orderLines.id, { onDelete: "restrict" }),

  // GlassID — format: ULID or G-{orderno}-{seq}-{revision}; unique per tenant
  glassBarcode: varchar("glass_barcode", { length: 100 }).notNull(),

  // Business dimensions — never change after creation
  widthMm: numeric("width_mm", { precision: 8, scale: 2 }).notNull(),
  heightMm: numeric("height_mm", { precision: 8, scale: 2 }).notNull(),

  // Production dimensions — includes grinding allowance
  productionWidthMm: numeric("production_width_mm", {
    precision: 8,
    scale: 2,
  }),
  productionHeightMm: numeric("production_height_mm", {
    precision: 8,
    scale: 2,
  }),

  productType: varchar("product_type", { length: 50 }),
  currentOperation: varchar("current_operation", { length: 50 }),
  // cutting | grinding | tempering | insulating_glass | lamination
  // cnc | drilling | washing | painting | sandblasting | quality | dispatch

  currentStationId: char("current_station_id", { length: 26 }).references(
    () => stations.id,
    { onDelete: "restrict" }
  ),
  currentStatus: varchar("current_status", { length: 30 })
    .notNull()
    .default("pending"),
  // pending | in_progress | completed | broken | rework | cancelled

  isRework: boolean("is_rework").notNull().default(false),
  revisionNumber: integer("revision_number").notNull().default(0),
  // 0 = original, 1 = R1 first rework, 2 = R2 second rework, etc.

  parentId: char("parent_id", { length: 26 }), // FK → production_orders self-ref (plain char to avoid cycle)
  completedAt: timestamp("completed_at", { withTimezone: true }),
  notes: text("notes"),

  // Standard audit columns
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  createdBy: char("created_by", { length: 26 }),
  updatedBy: char("updated_by", { length: 26 }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: char("deleted_by", { length: 26 }),
});

// ─── Owned Objects ────────────────────────────────────────────────────────────

// Immutable event log — one row per station transition
export const productionEvents = pgTable(
  "production_events",
  {
    id: char("id", { length: 26 }).primaryKey(),
    productionOrderId: char("production_order_id", { length: 26 })
      .notNull()
      .references(() => productionOrders.id, { onDelete: "restrict" }),

    eventType: varchar("event_type", { length: 30 }).notNull(),
    // started | paused | completed | broken | transferred | rework_created

    fromOperation: varchar("from_operation", { length: 50 }),
    toOperation: varchar("to_operation", { length: 50 }),
    stationId: char("station_id", { length: 26 }).references(
      () => stations.id,
      { onDelete: "restrict" }
    ),
    machineId: char("machine_id", { length: 26 }).references(
      () => machines.id,
      { onDelete: "restrict" }
    ),
    operatorId: char("operator_id", { length: 26 }).references(
      () => personnel.id,
      { onDelete: "restrict" }
    ),
    shiftId: char("shift_id", { length: 26 }).references(
      () => personnelShifts.id,
      { onDelete: "restrict" }
    ),
    eventAt: timestamp("event_at", { withTimezone: true }).notNull(),
    notes: text("notes"),

    // ── Operation result data (added Sprint 6.0.0) ───────────────────────
    resultData: jsonb("result_data"),
    // operation-specific outcome data (e.g., cutting coordinates, tempering temperatures)
    qualityStatus: varchar("quality_status", { length: 30 }),
    // passed | failed | conditional_pass | pending_inspection

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    productionOrderIdIdx: index("idx_events_production_order_id").on(
      table.productionOrderId
    ),
  })
);

export const productionBreakageEvents = pgTable("production_breakage_events", {
  id: char("id", { length: 26 }).primaryKey(),
  productionOrderId: char("production_order_id", { length: 26 })
    .notNull()
    .references(() => productionOrders.id, { onDelete: "restrict" }),

  breakageStationId: char("breakage_station_id", { length: 26 }).references(
    () => stations.id,
    { onDelete: "restrict" }
  ),
  breakageMachineId: char("breakage_machine_id", { length: 26 }).references(
    () => machines.id,
    { onDelete: "restrict" }
  ),
  breakageOperatorId: char("breakage_operator_id", { length: 26 }).references(
    () => personnel.id,
    { onDelete: "restrict" }
  ),

  breakageReason: text("breakage_reason"),
  breakageCategory: varchar("breakage_category", { length: 30 }),
  // handling | machine_fault | quality | thermal | edge | other

  brokenAt: timestamp("broken_at", { withTimezone: true }).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Cutting batch record — one record per cutting batch
export const cuttingResults = pgTable("cutting_results", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  factoryId: char("factory_id", { length: 26 }).references(
    () => factories.id,
    { onDelete: "restrict" }
  ),
  stationId: char("station_id", { length: 26 }).references(
    () => stations.id,
    { onDelete: "restrict" }
  ),
  machineId: char("machine_id", { length: 26 }).references(
    () => machines.id,
    { onDelete: "restrict" }
  ),
  operatorId: char("operator_id", { length: 26 }).references(
    () => personnel.id,
    { onDelete: "restrict" }
  ),
  materialId: char("material_id", { length: 26 }).references(
    () => materials.id,
    { onDelete: "restrict" }
  ),

  sheetsPlanned: integer("sheets_planned").notNull(),
  sheetsUsed: integer("sheets_used"), // entered by operator — key fire input
  cuttingDate: date("cutting_date").notNull(),
  batchStatus: varchar("batch_status", { length: 20 })
    .notNull()
    .default("open"),
  // open | completed

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// Junction — which production_orders were in this cutting batch
export const cuttingResultItems = pgTable("cutting_result_items", {
  id: char("id", { length: 26 }).primaryKey(),
  cuttingResultId: char("cutting_result_id", { length: 26 })
    .notNull()
    .references(() => cuttingResults.id, { onDelete: "cascade" }),
  productionOrderId: char("production_order_id", { length: 26 })
    .notNull()
    .references(() => productionOrders.id, { onDelete: "restrict" }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
