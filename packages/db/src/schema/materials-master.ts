import {
  pgTable,
  char,
  varchar,
  text,
  boolean,
  numeric,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";
import { factories } from "./factories";
import { warehouses } from "./warehouses";

// ─── Aggregate Root ───────────────────────────────────────────────────────────
// Material Master — ERP foundation. Purchasing, inventory, BOM, manufacturing,
// MRP, quality, sales, shipping and cost modules all reference this table.
//
// Future Feature: Custom Fields
// When the Company Settings module is implemented, users will be able to
// define custom fields per material type. The architecture should support
// a material_custom_fields EAV (Entity-Attribute-Value) table joinable on
// material_master.id. This allows adding UI-configurable fields without
// schema migrations.
//
// Future Feature: Custom Code Labels
// custom_code_1 through custom_code_5 are reserved for user-defined labels
// (e.g., "HS Code", "Customs Tariff", "Supplier Code"). The Company Settings
// module will let tenants rename these fields in the UI. Until then they are
// shown as "Özel Kod 1-5" / "Custom Code 1-5".

export const materialsMaster = pgTable("materials_master", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  factoryId: char("factory_id", { length: 26 }).references(
    () => factories.id,
    { onDelete: "restrict" }
  ),

  // ── Core Identity ──
  materialCode: varchar("material_code", { length: 50 }).notNull(), // unique per tenant — index enforced
  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("short_name", { length: 100 }),
  description: text("description"),

  // ── Classification ──
  materialType: varchar("material_type", { length: 50 }).notNull(),
  // raw_material | semi_finished | finished_good | consumable | spare_part
  // | packaging | chemical | service | other

  materialGroupId: char("material_group_id", { length: 26 }), // FK → material_categories (forward ref, plain char)

  // ── Origin Information ──
  originType: varchar("origin_type", { length: 20 }), // domestic | imported
  originCountry: varchar("origin_country", { length: 100 }),
  brand: varchar("brand", { length: 255 }),
  model: varchar("model", { length: 255 }),

  // ── Physical Attributes ──
  thicknessMm: numeric("thickness_mm", { precision: 5, scale: 2 }), // material thickness in mm (e.g., 4mm, 6mm, 8mm, 10mm)
  color: varchar("color", { length: 100 }), // material color (e.g., "Clear", "Bronze", "Gray", "Dark Gray")

  // ── Default References (forward refs — plain char to avoid circular deps) ──
  defaultWarehouseId: char("default_warehouse_id", { length: 26 }).references(
    () => warehouses.id,
    { onDelete: "set null" }
  ),
  defaultLocationId: char("default_location_id", { length: 26 }), // FK → inventory_locations (future)
  defaultSupplierId: char("default_supplier_id", { length: 26 }), // FK → suppliers (future)

  // ── Business Characteristics ──
  baseUnit: varchar("base_unit", { length: 50 }).notNull().default("piece"),
  // piece | kg | g | ton | m | mm | m2 | m3 | l | box | roll | package

  stockTracking: boolean("stock_tracking").notNull().default(true),
  inventoryItem: boolean("inventory_item").notNull().default(true),
  purchasable: boolean("purchasable").notNull().default(false),
  sellable: boolean("sellable").notNull().default(false),
  manufacturable: boolean("manufacturable").notNull().default(false),
  qualityInspectionRequired: boolean("quality_inspection_required").notNull().default(false),
  batchTracking: boolean("batch_tracking").notNull().default(false),
  serialTracking: boolean("serial_tracking").notNull().default(false),
  expirationTracking: boolean("expiration_tracking").notNull().default(false),

  // ── Stock Limits ──
  minStock: numeric("min_stock", { precision: 14, scale: 4 }),
  maxStock: numeric("max_stock", { precision: 14, scale: 4 }),
  criticalStock: numeric("critical_stock", { precision: 14, scale: 4 }),
  safetyStock: numeric("safety_stock", { precision: 14, scale: 4 }),
  reorderPoint: numeric("reorder_point", { precision: 14, scale: 4 }),
  reorderQuantity: numeric("reorder_quantity", { precision: 14, scale: 4 }),

  // ── Costing ──
  standardCost: numeric("standard_cost", { precision: 16, scale: 4 }),
  averageCost: numeric("average_cost", { precision: 16, scale: 4 }),
  lastPurchasePrice: numeric("last_purchase_price", { precision: 16, scale: 4 }),
  currency: varchar("currency", { length: 10 }),

  // ── Identification ──
  barcode: varchar("barcode", { length: 100 }),
  qrCode: varchar("qr_code", { length: 500 }),
  rfidCode: varchar("rfid_code", { length: 100 }),

  // ── Media & Documents ──
  imageUrl: varchar("image_url", { length: 500 }),
  technicalDrawingUrl: varchar("technical_drawing_url", { length: 500 }),
  documentUrl: varchar("document_url", { length: 500 }),

  // ── Custom Codes (reserved for user-defined labels) ──
  // Future: Company Settings module will allow tenants to rename these fields.
  customCode1: varchar("custom_code_1", { length: 100 }),
  customCode2: varchar("custom_code_2", { length: 100 }),
  customCode3: varchar("custom_code_3", { length: 100 }),
  customCode4: varchar("custom_code_4", { length: 100 }),
  customCode5: varchar("custom_code_5", { length: 100 }),

  // ── Status & Lifecycle ──
  status: varchar("status", { length: 20 }).notNull().default("active"),
  // active | passive | blocked

  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),

  // ── Standard Audit Columns ──
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  createdBy: char("created_by", { length: 26 }),
  updatedBy: char("updated_by", { length: 26 }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: char("deleted_by", { length: 26 }),
});

// ─── Material Tags (Many-to-Many) ────────────────────────────────────────────

export const materialTags = pgTable("material_tags", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }), // hex color for UI badge

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const materialTagMap = pgTable(
  "material_tag_map",
  {
    materialId: char("material_id", { length: 26 })
      .notNull()
      .references(() => materialsMaster.id, { onDelete: "cascade" }),
    tagId: char("tag_id", { length: 26 })
      .notNull()
      .references(() => materialTags.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.materialId, table.tagId] }),
  })
);
