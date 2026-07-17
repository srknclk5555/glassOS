import {
  pgTable,
  char,
  varchar,
  boolean,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";
import { factories } from "./factories";
import { stations } from "./stations";
import { productionOrders } from "./production";

// ─── Reference Table — Available Operation Types ──────────────────────────────

export const productionOperations = pgTable("production_operations", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),

  operationCode: varchar("operation_code", { length: 50 }).notNull(), // unique per tenant — enforced by index
  operationName: varchar("operation_name", { length: 100 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// ─── Queue Aggregate Root ─────────────────────────────────────────────────────
// One queue per station + operation combination

export const productionQueues = pgTable("production_queues", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  factoryId: char("factory_id", { length: 26 }).references(
    () => factories.id,
    { onDelete: "restrict" }
  ),
  stationId: char("station_id", { length: 26 })
    .notNull()
    .references(() => stations.id, { onDelete: "restrict" }),

  operationCode: varchar("operation_code", { length: 50 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// ─── Queue Items — Ephemeral ──────────────────────────────────────────────────
// Rows are removed when a production order transitions to the next station.
// Hard delete by design — no soft delete (per DATABASE_BLUEPRINT.md §4.2).

export const productionQueueItems = pgTable(
  "production_queue_items",
  {
    id: char("id", { length: 26 }).primaryKey(),
    queueId: char("queue_id", { length: 26 })
      .notNull()
      .references(() => productionQueues.id, { onDelete: "cascade" }),
    productionOrderId: char("production_order_id", { length: 26 })
      .notNull()
      .references(() => productionOrders.id, { onDelete: "cascade" }),

    enteredAt: timestamp("entered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    priority: integer("priority").notNull().default(100),
    // lower value = higher priority; rework items get priority = 1

    status: varchar("status", { length: 20 }).notNull().default("waiting"),
    // waiting | in_progress | done
  },
  (table) => ({
    queueIdIdx: index("idx_queue_items_queue_id").on(table.queueId),
    productionOrderIdIdx: index("idx_queue_items_production_order_id").on(
      table.productionOrderId
    ),
  })
);
