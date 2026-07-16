import {
  pgTable,
  char,
  varchar,
  text,
  boolean,
  numeric,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";
import { factories } from "./factories";
import { materials, products } from "./materials-products";

// ─── Inventory Locations (referenced by inventory_items) ──────────────────────

export const inventoryLocations = pgTable("inventory_locations", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  factoryId: char("factory_id", { length: 26 }).references(
    () => factories.id,
    { onDelete: "restrict" }
  ),

  locationCode: varchar("location_code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  locationType: varchar("location_type", { length: 50 }).notNull(),
  // main_warehouse | glass_warehouse | consumables | spare_parts
  // scrap | remnant | finished_goods

  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// ─── Aggregate Root ───────────────────────────────────────────────────────────

export const inventoryItems = pgTable("inventory_items", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  factoryId: char("factory_id", { length: 26 }).references(
    () => factories.id,
    { onDelete: "restrict" }
  ),

  inventoryCode: varchar("inventory_code", { length: 50 }).notNull(), // unique per tenant — enforced by index
  name: varchar("name", { length: 255 }).notNull(),
  inventoryType: varchar("inventory_type", { length: 50 }).notNull(),
  // raw_material | semi_finished | finished_product | traded_goods
  // consumable | spare_part | packaging | service | scrap | remnant | by_product

  unit: varchar("unit", { length: 20 }).notNull(),
  // piece | m2 | kg | m | liter | box | package | roll

  materialId: char("material_id", { length: 26 }).references(
    () => materials.id,
    { onDelete: "restrict" }
  ),
  productId: char("product_id", { length: 26 }).references(
    () => products.id,
    { onDelete: "restrict" }
  ),
  locationId: char("location_id", { length: 26 }).references(
    () => inventoryLocations.id,
    { onDelete: "restrict" }
  ),

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

export const inventoryLots = pgTable("inventory_lots", {
  id: char("id", { length: 26 }).primaryKey(),
  inventoryItemId: char("inventory_item_id", { length: 26 })
    .notNull()
    .references(() => inventoryItems.id, { onDelete: "restrict" }),

  lotNumber: varchar("lot_number", { length: 100 }),
  supplierLot: varchar("supplier_lot", { length: 100 }),
  quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
  remainingQuantity: numeric("remaining_quantity", {
    precision: 14,
    scale: 4,
  }).notNull(),
  unitCost: numeric("unit_cost", { precision: 14, scale: 4 }).notNull(), // immutable after creation
  currency: varchar("currency", { length: 10 }).notNull().default("TRY"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  expirationDate: date("expiration_date"),
  status: varchar("status", { length: 30 }).notNull().default("active"),
  // active | consumed | expired | quarantine

  barcode: varchar("barcode", { length: 100 }), // unique per tenant — enforced by index

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const inventoryBarcodes = pgTable("inventory_barcodes", {
  id: char("id", { length: 26 }).primaryKey(),
  inventoryItemId: char("inventory_item_id", { length: 26 })
    .notNull()
    .references(() => inventoryItems.id, { onDelete: "cascade" }),
  lotId: char("lot_id", { length: 26 }).references(() => inventoryLots.id, {
    onDelete: "set null",
  }),

  barcode: varchar("barcode", { length: 100 }).notNull().unique(),
  glassBarcode: varchar("glass_barcode", { length: 100 }), // GlassID — ULID based
  widthMm: numeric("width_mm", { precision: 8, scale: 2 }),
  heightMm: numeric("height_mm", { precision: 8, scale: 2 }),
  thicknessMm: numeric("thickness_mm", { precision: 5, scale: 2 }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
