import { pgTable, char, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: char("id", { length: 26 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  plan: varchar("plan", { length: 50 }).notNull().default("trial"),
  isActive: boolean("is_active").notNull().default(true),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const roles = pgTable("roles", {
  id: char("id", { length: 26 }).primaryKey(),
  name: varchar("name", { length: 50 }).unique().notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const permissions = pgTable("permissions", {
  id: char("id", { length: 26 }).primaryKey(),
  name: varchar("name", { length: 100 }).unique().notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
