import {
  pgTable,
  char,
  varchar,
  numeric,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { materials } from "./materials-products";

// ─── Material Packaging ───────────────────────────────────────────────────────
// Packaging definitions per material (e.g. crate sizes, bundle quantities, etc.)

export const materialPackagings = pgTable("material_packagings", {
  id: char("id", { length: 26 }).primaryKey(),
  materialId: char("material_id", { length: 26 })
    .notNull()
    .references(() => materials.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  quantityPerPackage: numeric("quantity_per_package", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
