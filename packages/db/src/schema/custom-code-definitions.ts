import {
  pgTable,
  char,
  varchar,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";

// ─── Custom Code Definitions ─────────────────────────────────────────────────
// Users define allowed values for Custom Code 1–5 here.
// Material cards then use Combobox selectors instead of free text.

export const customCodeDefinitions = pgTable("custom_code_definitions", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  fieldNumber: integer("field_number").notNull(), // 1–5
  value: varchar("value", { length: 100 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  createdBy: char("created_by", { length: 26 }),
  updatedBy: char("updated_by", { length: 26 }),
});
