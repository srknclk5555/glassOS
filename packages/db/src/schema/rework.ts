import {
  pgTable,
  char,
  varchar,
  text,
  boolean,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";
import { factories } from "./factories";
import { users } from "./users";
import { productionOrders, productionBreakageEvents } from "./production";

// ─── Aggregate Root ───────────────────────────────────────────────────────────

export const reworkOrders = pgTable("rework_orders", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  factoryId: char("factory_id", { length: 26 }).references(
    () => factories.id,
    { onDelete: "restrict" }
  ),

  parentProductionOrderId: char("parent_production_order_id", { length: 26 })
    .notNull()
    .references(() => productionOrders.id, { onDelete: "restrict" }),
  breakageEventId: char("breakage_event_id", { length: 26 }).references(
    () => productionBreakageEvents.id,
    { onDelete: "restrict" }
  ),

  reworkReason: text("rework_reason"),
  reworkStatus: varchar("rework_status", { length: 30 })
    .notNull()
    .default("pending"),
  // pending | in_cutting | completed | cancelled

  newProductionOrderId: char("new_production_order_id", { length: 26 }).references(
    () => productionOrders.id,
    { onDelete: "restrict" }
  ),
  internalCustomer: varchar("internal_customer", { length: 50 }),
  // fire_depot | scrap_depot | factory_loss

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

// Usable offcuts and scrap from breakage
export const fireInventoryItems = pgTable("fire_inventory_items", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  factoryId: char("factory_id", { length: 26 }).references(
    () => factories.id,
    { onDelete: "restrict" }
  ),
  reworkOrderId: char("rework_order_id", { length: 26 }).references(
    () => reworkOrders.id,
    { onDelete: "restrict" }
  ),
  breakageEventId: char("breakage_event_id", { length: 26 }).references(
    () => productionBreakageEvents.id,
    { onDelete: "restrict" }
  ),

  inventoryType: varchar("inventory_type", { length: 20 }).notNull(),
  // reusable | scrap

  widthMm: numeric("width_mm", { precision: 8, scale: 2 }),
  heightMm: numeric("height_mm", { precision: 8, scale: 2 }),
  thicknessMm: numeric("thickness_mm", { precision: 5, scale: 2 }),
  glassType: varchar("glass_type", { length: 50 }),
  status: varchar("status", { length: 30 }).notNull().default("in_depot"),
  // in_depot | returned_to_inventory | scrapped

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Append-only status history for rework orders
export const reworkHistory = pgTable("rework_history", {
  id: char("id", { length: 26 }).primaryKey(),
  reworkOrderId: char("rework_order_id", { length: 26 })
    .notNull()
    .references(() => reworkOrders.id, { onDelete: "cascade" }),

  previousStatus: varchar("previous_status", { length: 30 }),
  newStatus: varchar("new_status", { length: 30 }).notNull(),
  changedBy: char("changed_by", { length: 26 }).references(
    () => users.id,
    { onDelete: "restrict" }
  ),
  changedAt: timestamp("changed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
