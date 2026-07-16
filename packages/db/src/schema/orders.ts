import {
  pgTable,
  char,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";
import { factories } from "./factories";
import { customers } from "./customers";
import { products } from "./materials-products";
import { recipes } from "./recipes";

// ─── Aggregate Root ───────────────────────────────────────────────────────────

export const orders = pgTable("orders", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  factoryId: char("factory_id", { length: 26 }).references(
    () => factories.id,
    { onDelete: "restrict" }
  ),
  customerId: char("customer_id", { length: 26 })
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),

  orderNumber: varchar("order_number", { length: 50 }).notNull(), // unique per tenant — enforced by index
  orderDate: date("order_date").notNull(),
  dueDate: date("due_date"),
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  // draft | confirmed | in_production | completed | cancelled

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

export const orderLines = pgTable("order_lines", {
  id: char("id", { length: 26 }).primaryKey(),
  orderId: char("order_id", { length: 26 })
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: char("product_id", { length: 26 })
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  recipeId: char("recipe_id", { length: 26 }).references(() => recipes.id, {
    onDelete: "restrict",
  }),

  widthMm: numeric("width_mm", { precision: 8, scale: 2 }).notNull(), // Business Dimension — never changes
  heightMm: numeric("height_mm", { precision: 8, scale: 2 }).notNull(), // Business Dimension — never changes
  quantity: integer("quantity").notNull(),
  completedQuantity: integer("completed_quantity").notNull().default(0),
  brokenQuantity: integer("broken_quantity").notNull().default(0),
  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const orderNotes = pgTable("order_notes", {
  id: char("id", { length: 26 }).primaryKey(),
  orderId: char("order_id", { length: 26 })
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),

  noteText: text("note_text").notNull(),
  isInternal: boolean("is_internal").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: char("created_by", { length: 26 }),
});
