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
import { factories } from "./factories";

// ─── Factory Settings ─────────────────────────────────────────────────────────
// Operational settings per factory: shifts, costs, notifications, tolerances, etc.

export const settings = pgTable("settings", {
  id: char("id", { length: 26 }).primaryKey(),
  factoryId: char("factory_id", { length: 26 })
    .notNull()
    .references(() => factories.id, { onDelete: "cascade" }),
  tolerances: jsonb("tolerances"),
  trimMm: numeric("trim_mm", { precision: 8, scale: 2 }),
  qrType: varchar("qr_type", { length: 20 }).default("QR"),
  shiftSettings: jsonb("shift_settings"),
  costSettings: jsonb("cost_settings"),
  notificationSettings: jsonb("notification_settings"),
  factoryConfiguration: jsonb("factory_configuration"),
  logoUrl: varchar("logo_url", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  createdBy: char("created_by", { length: 26 }),
  updatedBy: char("updated_by", { length: 26 }),
});
