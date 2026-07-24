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
import { warehouses } from "./warehouses";
import { materialsMaster } from "./materials-master";

// ─── Aggregate Root ───────────────────────────────────────────────────────────
// Goods Receipt (Mal Kabul) — the sole entry point for physical inventory.
// stock is NOT held here; stock is created in inventory_items ONLY after
// goods_receipts.status transitions from "draft" to "completed".
//
// supplierId & purchaseOrderId are forward references (plain char(26)) to
// future suppliers and purchase_orders tables to avoid circular dependencies.
//
// vehicle/ document fields are ALL optional — they are operational metadata
// and may be left blank for simple receipts.

export const goodsReceipts = pgTable("goods_receipts", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  factoryId: char("factory_id", { length: 26 })
    .notNull()
    .references(() => factories.id, { onDelete: "restrict" }),

  // ── Core Identity ──
  receiptNumber: varchar("receipt_number", { length: 50 }).notNull(), // GR-{YYYY}-{FACTORY}-{SEQ}
  receiptDate: varchar("receipt_date", { length: 10 }).notNull(), // ISO date (YYYY-MM-DD)
  receiptTime: varchar("receipt_time", { length: 5 }).notNull(), // HH:mm

  // ── Delivery References (forward refs — plain char to avoid circular deps) ──
  supplierId: char("supplier_id", { length: 26 }), // FK → suppliers (future)
  purchaseOrderId: char("purchase_order_id", { length: 26 }), // FK → purchase_orders (future)
  warehouseId: char("warehouse_id", { length: 26 })
    .notNull()
    .references(() => warehouses.id, { onDelete: "restrict" }),
  receivedById: char("received_by_id", { length: 26 }) // FK → personnel (forward ref, plain char)
    .notNull(),

  // ── Vehicle (Optional) ──
  vehiclePlate: varchar("vehicle_plate", { length: 20 }),
  trailerPlate: varchar("trailer_plate", { length: 20 }),
  driverName: varchar("driver_name", { length: 100 }),
  driverPhone: varchar("driver_phone", { length: 50 }),
  carrierCompany: varchar("carrier_company", { length: 255 }),

  // ── Documents (Optional) ──
  despatchNumber: varchar("despatch_number", { length: 100 }),
  despatchDate: varchar("despatch_date", { length: 10 }),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  orderReference: varchar("order_reference", { length: 255 }),

  // ── Status ──
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  // draft | completed | cancelled

  notes: text("notes"),

  // ── Standard Audit Columns ──
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: char("created_by", { length: 26 }),
  updatedBy: char("updated_by", { length: 26 }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: char("deleted_by", { length: 26 }),
});

// ─── Aggregate Detail ─────────────────────────────────────────────────────────
// Each line represents a single material receipt entry within a goods receipt.
// Plates are only created when isPlateTracked = true.

export const goodsReceiptItems = pgTable("goods_receipt_items", {
  id: char("id", { length: 26 }).primaryKey(),
  goodsReceiptId: char("goods_receipt_id", { length: 26 })
    .notNull()
    .references(() => goodsReceipts.id, { onDelete: "cascade" }),
  lineNo: numeric("line_no").notNull(),

  // ── Material & Dimensions ──
  materialId: char("material_id", { length: 26 })
    .notNull()
    .references(() => materialsMaster.id, { onDelete: "restrict" }),
  formatId: char("format_id", { length: 26 }), // FK → glass_formats (forward ref, plain char)
  widthMm: numeric("width_mm", { precision: 8, scale: 1 }),
  heightMm: numeric("height_mm", { precision: 8, scale: 1 }),

  // ── Plate Count & Area ──
  plateCount: numeric("plate_count", { precision: 10, scale: 0 }), // Adet (plate sayısı)
  totalAreaM2: numeric("total_area_m2", { precision: 14, scale: 4 }), // Toplam metrekare (otomatik hesaplanır)

  // ── Quantity & Cost ──
  quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  lotNumber: varchar("lot_number", { length: 100 }), // Supplier lot
  internalLotNumber: varchar("internal_lot_number", { length: 100 }).notNull(), // LOT-{YYYYMM}-{SEQ}
  unitCost: numeric("unit_cost", { precision: 16, scale: 4 }),
  currency: varchar("currency", { length: 10 }),

  // ── Warehouse Override ──
  targetWarehouseId: char("target_warehouse_id", { length: 26 }), // FK → warehouses (forward ref, plain char)

  // ── Quality ──
  qualityStatus: varchar("quality_status", { length: 20 }).notNull().default("accepted"),
  // accepted | conditional | rejected
  qualityNotes: text("quality_notes"),
  damagedCount: numeric("damaged_count", { precision: 6, scale: 0 }), // Kırık adet
  missingCount: numeric("missing_count", { precision: 6, scale: 0 }), // Eksik adet

  // ── Plate Tracking ──
  isPlateTracked: boolean("is_plate_tracked").notNull().default(false),
});

// ─── Sub-Entity: Attachments ──────────────────────────────────────────────────
// Files/photos attached to a goods receipt (header-level) or a specific item.
// Actual files are stored in R2/S3 — DB holds only metadata.

export const goodsReceiptAttachments = pgTable("goods_receipt_attachments", {
  id: char("id", { length: 26 }).primaryKey(),
  goodsReceiptId: char("goods_receipt_id", { length: 26 })
    .notNull()
    .references(() => goodsReceipts.id, { onDelete: "cascade" }),
  goodsReceiptItemId: char("goods_receipt_item_id", { length: 26 }), // FK → goods_receipt_items (set null, plain char for simplicity)

  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 20 }).notNull(),
  // image | pdf | document

  fileUrl: varchar("file_url", { length: 1000 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSizeBytes: numeric("file_size_bytes", { precision: 14, scale: 0 }).notNull(),

  category: varchar("category", { length: 50 }).notNull(),
  // irsiye | fatura | quality_cert | ce_cert | photo_truck
  // | photo_package | photo_damage | photo_despatch | other

  description: text("description"),
});

// ─── Sub-Entity: Plates (Optional — only when isPlateTracked = true) ─────────

export const goodsReceiptPlates = pgTable("goods_receipt_plates", {
  id: char("id", { length: 26 }).primaryKey(),
  goodsReceiptItemId: char("goods_receipt_item_id", { length: 26 })
    .notNull()
    .references(() => goodsReceiptItems.id, { onDelete: "cascade" }),
  plateSerial: varchar("plate_serial", { length: 100 }).notNull(), // GR-{RECEIPT_NO}-{LINE}-{SEQ}
  widthMm: numeric("width_mm", { precision: 8, scale: 1 }).notNull(),
  heightMm: numeric("height_mm", { precision: 8, scale: 1 }).notNull(),
  thicknessMm: numeric("thickness_mm", { precision: 5, scale: 1 }),
  barcodeId: char("barcode_id", { length: 26 }), // FK → inventory_barcodes (future, plain char)
});
