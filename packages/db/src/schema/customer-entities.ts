import {
  pgTable,
  char,
  varchar,
  text,
  boolean,
  numeric,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";

// ─── Glass Catalog ────────────────────────────────────────────────────────────
// Frequently ordered product templates per customer.
// See §4.10 of CUSTOMER_ARCHITECTURE.md for full field inventory.

export const customerGlassCatalog = pgTable("customer_glass_catalog", {
  id: char("id", { length: 26 }).primaryKey(),
  customerId: char("customer_id", { length: 26 })
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),

  productCode: varchar("product_code", { length: 100 }).notNull(),
  glassType: varchar("glass_type", { length: 100 }).notNull(),
  thicknessMm: numeric("thickness_mm", { precision: 5, scale: 1 }),
  defaultWidthMm: numeric("default_width_mm", { precision: 8, scale: 1 }),
  defaultHeightMm: numeric("default_height_mm", { precision: 8, scale: 1 }),
  defaultPieces: numeric("default_pieces", { precision: 8, scale: 0 }),
  isActive: boolean("is_active").notNull().default(true),
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

// ─── Special Instructions ─────────────────────────────────────────────────────
// Reusable instruction templates with conditional application.
// See §4.11 of CUSTOMER_ARCHITECTURE.md for full field inventory.

export const customerInstructions = pgTable("customer_instructions", {
  id: char("id", { length: 26 }).primaryKey(),
  customerId: char("customer_id", { length: 26 })
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),

  title: varchar("title", { length: 255 }).notNull(),
  instruction: text("instruction").notNull(),
  isStanding: boolean("is_standing").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
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

// ─── Instruction Conditions ──────────────────────────────────────────────────
// Structured conditions replacing free-text condition_expression.
// See §4.12 of CUSTOMER_ARCHITECTURE.md for full field inventory.

export const customerInstructionConditions = pgTable(
  "customer_instruction_conditions",
  {
    id: char("id", { length: 26 }).primaryKey(),
    instructionId: char("instruction_id", { length: 26 })
      .notNull()
      .references(() => customerInstructions.id, { onDelete: "cascade" }),

    field: varchar("field", { length: 100 }).notNull(),
    operator: varchar("operator", { length: 20 }).notNull(),
    value: text("value").notNull(),
    valueType: varchar("value_type", { length: 20 }).notNull().default("number"),
    logicalGroup: integer("logical_group").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),

    // Standard audit columns
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    createdBy: char("created_by", { length: 26 }),
    updatedBy: char("updated_by", { length: 26 }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: char("deleted_by", { length: 26 }),
  }
);
