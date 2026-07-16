import {
  pgTable,
  char,
  varchar,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";
import { factories } from "./factories";
import { machines } from "./machines";
import { materials } from "./materials-products";

// ─── Factory Configurations (key-value store for engine inputs) ───────────────

export const factoryConfigurations = pgTable("factory_configurations", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  factoryId: char("factory_id", { length: 26 })
    .notNull()
    .references(() => factories.id, { onDelete: "restrict" }),

  configKey: varchar("config_key", { length: 100 }).notNull(), // unique per factory — enforced by index
  configValue: varchar("config_value", { length: 500 }),
  configType: varchar("config_type", { length: 50 }).notNull(),
  // grinding | trim | remnant | scrap | valuation | general

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// ─── Grinding Profiles (per machine or factory-wide default) ──────────────────

export const grindingProfiles = pgTable("grinding_profiles", {
  id: char("id", { length: 26 }).primaryKey(),
  factoryId: char("factory_id", { length: 26 })
    .notNull()
    .references(() => factories.id, { onDelete: "restrict" }),
  machineId: char("machine_id", { length: 26 }).references(
    () => machines.id,
    { onDelete: "restrict" }
  ), // null = factory-wide default

  productType: varchar("product_type", { length: 50 }), // null = applies to all product types

  leftMm: numeric("left_mm", { precision: 5, scale: 2 }).notNull(),
  rightMm: numeric("right_mm", { precision: 5, scale: 2 }).notNull(),
  topMm: numeric("top_mm", { precision: 5, scale: 2 }).notNull(),
  bottomMm: numeric("bottom_mm", { precision: 5, scale: 2 }).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// ─── Trim Profiles (per sheet type or factory-wide default) ──────────────────

export const trimProfiles = pgTable("trim_profiles", {
  id: char("id", { length: 26 }).primaryKey(),
  factoryId: char("factory_id", { length: 26 })
    .notNull()
    .references(() => factories.id, { onDelete: "restrict" }),
  materialId: char("material_id", { length: 26 }).references(
    () => materials.id,
    { onDelete: "restrict" }
  ), // null = factory-wide default

  leftMm: numeric("left_mm", { precision: 5, scale: 2 }).notNull(),
  rightMm: numeric("right_mm", { precision: 5, scale: 2 }).notNull(),
  topMm: numeric("top_mm", { precision: 5, scale: 2 }).notNull(),
  bottomMm: numeric("bottom_mm", { precision: 5, scale: 2 }).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// ─── Remnant Thresholds (remnant vs scrap decision boundary) ─────────────────

export const remnantThresholds = pgTable("remnant_thresholds", {
  id: char("id", { length: 26 }).primaryKey(),
  factoryId: char("factory_id", { length: 26 })
    .notNull()
    .references(() => factories.id, { onDelete: "restrict" }),

  minimumWidthMm: numeric("minimum_width_mm", {
    precision: 8,
    scale: 2,
  }).notNull(),
  minimumHeightMm: numeric("minimum_height_mm", {
    precision: 8,
    scale: 2,
  }).notNull(),
  minimumAreaM2: numeric("minimum_area_m2", { precision: 8, scale: 4 }),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
