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
import { materials, products } from "./materials-products";

// ─── Aggregate Root ───────────────────────────────────────────────────────────

export const recipes = pgTable("recipes", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  factoryId: char("factory_id", { length: 26 }).references(
    () => factories.id,
    { onDelete: "restrict" }
  ),

  recipeCode: varchar("recipe_code", { length: 50 }).notNull(), // unique per tenant — enforced by index
  name: varchar("name", { length: 255 }).notNull(),
  version: integer("version").notNull().default(1),
  productType: varchar("product_type", { length: 50 }),
  // temper | insulating_glass | laminated
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

// ─── Owned Objects ────────────────────────────────────────────────────────────

export const recipeItems = pgTable("recipe_items", {
  id: char("id", { length: 26 }).primaryKey(),
  recipeId: char("recipe_id", { length: 26 })
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  materialId: char("material_id", { length: 26 })
    .notNull()
    .references(() => materials.id, { onDelete: "restrict" }),

  consumptionBasis: varchar("consumption_basis", { length: 30 }).notNull(),
  // area | perimeter | piece | fixed | duration

  quantityPerUnit: numeric("quantity_per_unit", {
    precision: 12,
    scale: 6,
  }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  wastePercentage: numeric("waste_percentage", { precision: 5, scale: 2 }),
  sequence: integer("sequence").notNull(), // unique per recipe — enforced by index

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const recipeOperations = pgTable("recipe_operations", {
  id: char("id", { length: 26 }).primaryKey(),
  recipeId: char("recipe_id", { length: 26 })
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),

  operationCode: varchar("operation_code", { length: 50 }).notNull(),
  // cutting | grinding | tempering | insulating_glass | lamination
  // cnc | drilling | washing | painting | sandblasting | quality | dispatch

  sequence: integer("sequence").notNull(), // unique per recipe — enforced by index
  isMandatory: boolean("is_mandatory").notNull().default(true),
  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const recipeRules = pgTable("recipe_rules", {
  id: char("id", { length: 26 }).primaryKey(),
  recipeId: char("recipe_id", { length: 26 })
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),

  ruleType: varchar("rule_type", { length: 100 }).notNull(),
  // grinding_required | tempering_required | low_e_orientation
  // drilling_required | cnc_required | lamination_required

  ruleValue: text("rule_value"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const recipeOutputs = pgTable("recipe_outputs", {
  id: char("id", { length: 26 }).primaryKey(),
  recipeId: char("recipe_id", { length: 26 })
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  productId: char("product_id", { length: 26 })
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),

  quantityPerUnit: numeric("quantity_per_unit", {
    precision: 12,
    scale: 6,
  }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  sequence: integer("sequence").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const recipeFires = pgTable("recipe_fires", {
  id: char("id", { length: 26 }).primaryKey(),
  recipeId: char("recipe_id", { length: 26 })
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),

  fireType: varchar("fire_type", { length: 50 }).notNull(),
  // grinding | cutting | breakage | temper_loss | operator_loss | custom

  calculationMethod: varchar("calculation_method", { length: 30 }).notNull(),
  // percentage | per_edge_mm | per_axis_mm | fixed | custom

  rate: numeric("rate", { precision: 8, scale: 4 }).notNull(),
  // For percentage: 0.05 = 5%
  // For per_edge_mm: mm amount per edge
  // For fixed: absolute quantity

  fireStockCardId: char("fire_stock_card_id", { length: 26 }),
  // Optional: if fire is tracked as a separate stock item (waste stock card)

  sequence: integer("sequence").notNull(),
  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const recipeVersions = pgTable("recipe_versions", {
  id: char("id", { length: 26 }).primaryKey(),
  recipeId: char("recipe_id", { length: 26 })
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),

  versionNumber: integer("version_number").notNull(),
  snapshotJson: jsonb("snapshot_json").notNull(), // full recipe snapshot at that version

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
