import {
  pgTable,
  char,
  varchar,
  text,
  boolean,
  numeric,
  integer,
  jsonb,
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
  district: varchar("district", { length: 100 }),
  country: varchar("country", { length: 100 }),
  erpStatus: varchar("erp_status", { length: 20 }),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),

  // JSONB Value Objects (see §4.2–§4.6 of CUSTOMER_ARCHITECTURE.md)
  qualityProfile: jsonb("quality_profile"),
  productionPreferences: jsonb("production_preferences"),
  labelSpec: jsonb("label_spec"),
  packagingProfile: jsonb("packaging_profile"),
  communicationProfile: jsonb("communication_profile"),
  operationalBlock: jsonb("operational_block"),

  // Optimistic locking (see §4.1 of CUSTOMER_ARCHITECTURE.md)
  version: integer("version").notNull().default(1),

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
  role: varchar("role", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  whatsapp: varchar("whatsapp", { length: 50 }),
  email: varchar("email", { length: 255 }),
  isPrimary: boolean("is_primary").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),

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

// ─── Deprecated: customer_delivery_points ─────────────────────────────────────
// This table is being consolidated into delivery_points (see delivery-points.ts).
// Kept temporarily for migration — to be removed after data migration completes.
// See §4.8 of CUSTOMER_ARCHITECTURE.md and Sprint Plan task 1.3.
