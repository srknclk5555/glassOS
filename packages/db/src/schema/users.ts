import { pgTable, char, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { tenants, roles } from "./core";
import { factories } from "./factories";

export const users = pgTable("users", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .references(() => tenants.id, { onDelete: "restrict" }), // Nullable for super admins
  factoryId: char("factory_id", { length: 26 })
    .references(() => factories.id, { onDelete: "restrict" }), // Nullable for tenant admins
  selectedFactoryId: char("selected_factory_id", { length: 26 })
    .references(() => factories.id, { onDelete: "restrict" }),
  roleId: char("role_id", { length: 26 })
    .notNull()
    .references(() => roles.id),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const userSessions = pgTable("user_sessions", {
  id: char("id", { length: 26 }).primaryKey(),
  userId: char("user_id", { length: 26 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionToken: varchar("session_token", { length: 255 }).unique().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }), // Can store IPv6
  device: text("device"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
