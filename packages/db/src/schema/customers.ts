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

// ─── Aggregate Root ───────────────────────────────────────────────────────────

export const customers = pgTable("customers", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  factoryId: char("factory_id", { length: 26 }).references(
    () => factories.id,
    { onDelete: "restrict" }
  ),

  customerCode: varchar("customer_code", { length: 50 }).notNull(), // unique per tenant — enforced by index
  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("short_name", { length: 100 }),
  taxNumber: varchar("tax_number", { length: 50 }),
  taxOffice: varchar("tax_office", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }),
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

// ─── Owned Objects ────────────────────────────────────────────────────────────

export const customerContacts = pgTable("customer_contacts", {
  id: char("id", { length: 26 }).primaryKey(),
  customerId: char("customer_id", { length: 26 })
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 255 }).notNull(),
  title: varchar("title", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  isPrimary: boolean("is_primary").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const customerDeliveryPoints = pgTable("customer_delivery_points", {
  id: char("id", { length: 26 }).primaryKey(),
  customerId: char("customer_id", { length: 26 })
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  gpsLat: numeric("gps_lat", { precision: 10, scale: 7 }),
  gpsLng: numeric("gps_lng", { precision: 10, scale: 7 }),
  isDefault: boolean("is_default").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
