import {
  pgTable,
  char,
  varchar,
  text,
  boolean,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";

// ─── Delivery Points ──────────────────────────────────────────────────────────
// Customer delivery addresses with contact details and geo-coordinates.

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
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
