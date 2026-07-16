import {
  pgTable,
  char,
  varchar,
  text,
  boolean,
  numeric,
  integer,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";
import { factories } from "./factories";

// ─── Aggregate Root ───────────────────────────────────────────────────────────
// NOTE: stations FK is a forward reference — defined here as plain char
// to avoid circular dependency (stations.ts will reference machines.ts).

export const machines = pgTable("machines", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  factoryId: char("factory_id", { length: 26 }).references(
    () => factories.id,
    { onDelete: "restrict" }
  ),
  // stationId is stored as plain char; FK added in stations.ts to avoid cycle
  stationId: char("station_id", { length: 26 }),

  machineCode: varchar("machine_code", { length: 50 }).notNull(), // unique per tenant — enforced by index
  name: varchar("name", { length: 255 }).notNull(),
  machineType: varchar("machine_type", { length: 50 }).notNull(),
  // cutting | grinding | tempering | insulating_glass | cnc | drilling
  // lamination | washing | painting | sandblasting | quality | dispatch

  brand: varchar("brand", { length: 100 }),
  model: varchar("model", { length: 100 }),
  serialNumber: varchar("serial_number", { length: 100 }),
  manufactureYear: integer("manufacture_year"),
  purchasedAt: date("purchased_at"),
  commissionedAt: date("commissioned_at"),
  warrantyStartsAt: date("warranty_starts_at"),
  warrantyEndsAt: date("warranty_ends_at"),

  status: varchar("status", { length: 30 }).notNull().default("active"),
  // active | maintenance | idle | decommissioned

  hourlyCapacity: numeric("hourly_capacity", { precision: 10, scale: 2 }),
  dailyCapacity: numeric("daily_capacity", { precision: 10, scale: 2 }),
  maxGlassWidthMm: numeric("max_glass_width_mm", { precision: 8, scale: 2 }),
  maxGlassHeightMm: numeric("max_glass_height_mm", { precision: 8, scale: 2 }),
  maxThicknessMm: numeric("max_thickness_mm", { precision: 5, scale: 2 }),
  minThicknessMm: numeric("min_thickness_mm", { precision: 5, scale: 2 }),

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

export const machineMaintenance = pgTable("machine_maintenance_logs", {
  id: char("id", { length: 26 }).primaryKey(),
  machineId: char("machine_id", { length: 26 })
    .notNull()
    .references(() => machines.id, { onDelete: "cascade" }),

  maintenanceType: varchar("maintenance_type", { length: 50 }).notNull(),
  // periodic | breakdown | consumable | spare_part | software | warranty

  performedAt: date("performed_at").notNull(),
  performedBy: char("performed_by", { length: 26 }), // FK → personnel (forward ref, plain char)
  cost: numeric("cost", { precision: 12, scale: 2 }),
  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const machineSpareParts = pgTable("machine_spare_parts", {
  id: char("id", { length: 26 }).primaryKey(),
  machineId: char("machine_id", { length: 26 })
    .notNull()
    .references(() => machines.id, { onDelete: "cascade" }),

  partName: varchar("part_name", { length: 255 }).notNull(),
  partNumber: varchar("part_number", { length: 100 }),
  supplier: varchar("supplier", { length: 255 }),
  replacedAt: date("replaced_at"),
  cost: numeric("cost", { precision: 12, scale: 2 }),
  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const machineConsumables = pgTable("machine_consumables", {
  id: char("id", { length: 26 }).primaryKey(),
  machineId: char("machine_id", { length: 26 })
    .notNull()
    .references(() => machines.id, { onDelete: "cascade" }),

  consumableName: varchar("consumable_name", { length: 255 }).notNull(),
  installedAt: date("installed_at"),
  replacedAt: date("replaced_at"),
  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
