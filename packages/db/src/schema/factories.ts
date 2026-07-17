import { pgTable, char, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { tenants } from "./core";

export const factories = pgTable("factories", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
