import {
  pgTable,
  char,
  varchar,
  text,
  boolean,
  numeric,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";

// ─── Delivery Points ──────────────────────────────────────────────────────────
// Customer delivery addresses with contact details and geo-coordinates.
// This is the canonical delivery points table — customer_delivery_points is deprecated.
// See §4.8 of CUSTOMER_ARCHITECTURE.md for full field inventory.

export const deliveryPoints = pgTable("delivery_points", {
  id: char("id", { length: 26 }).primaryKey(),
  customerId: char("customer_id", { length: 26 })
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  district: varchar("district", { length: 100 }),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  phone: varchar("phone", { length: 50 }),
  note: text("note"),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),

  // Scheduling constraints (see §4.9 of CUSTOMER_ARCHITECTURE.md)
  schedulingProfile: jsonb("scheduling_profile"),

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
