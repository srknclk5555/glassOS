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

// ─── Material Aggregate Root ──────────────────────────────────────────────────

export const materials = pgTable("materials", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  factoryId: char("factory_id", { length: 26 }).references(
    () => factories.id,
    { onDelete: "restrict" }
  ),

  materialCode: varchar("material_code", { length: 50 }).notNull(), // unique per tenant — enforced by index
  name: varchar("name", { length: 255 }).notNull(),
  glassType: varchar("glass_type", { length: 50 }),
  // float | low_e | reflective | patterned | laminated_glass

  thicknessMm: numeric("thickness_mm", { precision: 5, scale: 2 }),
  color: varchar("color", { length: 100 }),
  manufacturer: varchar("manufacturer", { length: 255 }),
  standardWidthMm: numeric("standard_width_mm", { precision: 8, scale: 2 }),
  standardHeightMm: numeric("standard_height_mm", { precision: 8, scale: 2 }),
  densityKgM2: numeric("density_kg_m2", { precision: 6, scale: 3 }),
  canBeTempered: boolean("can_be_tempered").notNull().default(false),
  canBeLaminated: boolean("can_be_laminated").notNull().default(false),
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

// ─── Material Owned Object ────────────────────────────────────────────────────

export const materialUnitProfiles = pgTable("material_unit_profiles", {
  id: char("id", { length: 26 }).primaryKey(),
  materialId: char("material_id", { length: 26 })
    .notNull()
    .references(() => materials.id, { onDelete: "cascade" }),

  unitType: varchar("unit_type", { length: 20 }).notNull(),
  // piece | m2 | kg | m

  conversionFactor: numeric("conversion_factor", {
    precision: 12,
    scale: 6,
  }).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// ─── Product Aggregate Root ───────────────────────────────────────────────────
// NOTE: recipe_id is a forward reference to recipes.ts — stored as plain char
// to avoid circular dependency (recipes.ts imports materials).

export const products = pgTable("products", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  factoryId: char("factory_id", { length: 26 }).references(
    () => factories.id,
    { onDelete: "restrict" }
  ),

  productCode: varchar("product_code", { length: 50 }).notNull(), // unique per tenant — enforced by index
  name: varchar("name", { length: 255 }).notNull(),
  productType: varchar("product_type", { length: 50 }).notNull(),
  // temper | insulating_glass | laminated

  recipeId: char("recipe_id", { length: 26 }), // FK → recipes (forward ref, plain char)
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

// ─── Product Owned Object ─────────────────────────────────────────────────────

export const productCategories = pgTable("product_categories", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),

  name: varchar("name", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
