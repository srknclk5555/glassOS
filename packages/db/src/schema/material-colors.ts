import {
  pgTable,
  char,
  varchar,
  boolean,
  integer,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";

// ─── Material Colors ─────────────────────────────────────────────────────────
// Predefined colors for material master. Users select from a Combobox instead
// of free-text entry, ensuring consistent data for reporting and filtering.
// Duplicate color names per tenant are prevented via a unique constraint.

export const materialColors = pgTable(
  "material_colors",
  {
    id: char("id", { length: 26 }).primaryKey(),
    tenantId: char("tenant_id", { length: 26 })
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 100 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    createdBy: char("created_by", { length: 26 }),
    updatedBy: char("updated_by", { length: 26 }),
  },
  (table) => ({
    uniqueTenantName: unique("uq_material_colors_tenant_name").on(
      table.tenantId,
      table.name
    ),
  })
);
