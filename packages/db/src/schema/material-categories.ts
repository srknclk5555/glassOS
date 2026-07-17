import {
  pgTable,
  char,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";

// ─── Material Categories ──────────────────────────────────────────────────────
// Categorization for materials (e.g. Float Glass, Low-E, Reflective, etc.)

export const materialCategories = pgTable("material_categories", {
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
  createdBy: char("created_by", { length: 26 }),
  updatedBy: char("updated_by", { length: 26 }),
});
