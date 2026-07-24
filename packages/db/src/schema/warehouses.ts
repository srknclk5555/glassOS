import {
  pgTable,
  char,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";
import { factories } from "./factories";

// ─── Aggregate Root ───────────────────────────────────────────────────────────
// Warehouse Master — foundation for future inventory, purchasing, and
// manufacturing workflows. managerId is a plain char(26) forward reference
// to personnel (defined in personnel.ts) to avoid circular dependencies.

export const warehouses = pgTable("warehouses", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  factoryId: char("factory_id", { length: 26 }).references(
    () => factories.id,
    { onDelete: "restrict" }
  ),

  warehouseCode: varchar("warehouse_code", { length: 50 }).notNull(), // unique per tenant — enforced by index
  name: varchar("name", { length: 255 }).notNull(),
  warehouseType: varchar("warehouse_type", { length: 50 }).notNull(),
  // raw_material | semi_finished | finished_goods | consumables
  // quality | scrap | shipping | spare_parts

  description: text("description"),
  managerId: char("manager_id", { length: 26 }), // FK → personnel (forward ref, plain char)

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
