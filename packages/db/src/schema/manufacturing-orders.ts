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
} from "drizzle-orm/pg-core";
import { tenants } from "./core";
import { factories } from "./factories";
import { customers } from "./customers";
import { recipes } from "./recipes";

// ─── Manufacturing Order (ERP-level production order) ────────────────────────
// This is distinct from the MES-level production_orders in production.ts.
// A Manufacturing Order represents a batch of items to produce based on recipes.
// It holds the order header, while items define individual products + recipes.

export const manufacturingOrders = pgTable("manufacturing_orders", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  factoryId: char("factory_id", { length: 26 }).references(
    () => factories.id,
    { onDelete: "restrict" }
  ),

  orderNo: varchar("order_no", { length: 50 }).notNull(),
  customerId: char("customer_id", { length: 26 }).references(
    () => customers.id,
    { onDelete: "restrict" }
  ),
  customerName: varchar("customer_name", { length: 255 }),

  productionDate: timestamp("production_date", { withTimezone: true }),
  dueDate: timestamp("due_date", { withTimezone: true }),
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  // draft | ready | released | cancelled

  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),

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

// ─── Manufacturing Order Items ───────────────────────────────────────────────
// Each item links a recipe with net dimensions and quantity.
// The engine snapshot stores the RecipeEngineOutput for this item.

export const manufacturingOrderItems = pgTable("manufacturing_order_items", {
  id: char("id", { length: 26 }).primaryKey(),
  orderId: char("order_id", { length: 26 })
    .notNull()
    .references(() => manufacturingOrders.id, { onDelete: "cascade" }),
  recipeId: char("recipe_id", { length: 26 })
    .notNull()
    .references(() => recipes.id, { onDelete: "restrict" }),

  // Denormalized recipe info (snapshotted at creation time)
  recipeCode: varchar("recipe_code", { length: 50 }),
  recipeName: varchar("recipe_name", { length: 255 }),

  // Production dimensions
  netWidthMm: numeric("net_width_mm", { precision: 8, scale: 1 }).notNull(),
  netHeightMm: numeric("net_height_mm", { precision: 8, scale: 1 }).notNull(),
  quantity: integer("quantity").notNull(),

  // Recipe engine output snapshot (JSON)
  engineSnapshot: jsonb("engine_snapshot"),

  sequence: integer("sequence").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
