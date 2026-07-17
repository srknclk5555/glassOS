import {
  pgTable,
  char,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";
import { factories } from "./factories";
import { machines } from "./machines";
import { personnel } from "./personnel";

// ─── Aggregate Root ───────────────────────────────────────────────────────────

export const stations = pgTable("stations", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  factoryId: char("factory_id", { length: 26 }).references(
    () => factories.id,
    { onDelete: "restrict" }
  ),

  stationCode: varchar("station_code", { length: 50 }).notNull(), // unique per factory — enforced by index
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  stationType: varchar("station_type", { length: 50 }).notNull(),
  // cutting | grinding | tempering | insulating_glass | lamination
  // cnc | drilling | washing | painting | sandblasting | quality | dispatch

  sortOrder: integer("sort_order").notNull().default(0),
  maxConcurrentJobs: integer("max_concurrent_jobs").notNull().default(1),
  maxMachines: integer("max_machines"),
  maxOperators: integer("max_operators"),
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

export const stationMachineAssignments = pgTable(
  "station_machine_assignments",
  {
    id: char("id", { length: 26 }).primaryKey(),
    stationId: char("station_id", { length: 26 })
      .notNull()
      .references(() => stations.id, { onDelete: "cascade" }),
    machineId: char("machine_id", { length: 26 })
      .notNull()
      .references(() => machines.id, { onDelete: "restrict" }),

    isPrimary: boolean("is_primary").notNull().default(false),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    stationIdIdx: index("idx_sma_station_id").on(table.stationId),
    machineIdIdx: index("idx_sma_machine_id").on(table.machineId),
  })
);

export const stationPersonnelAssignments = pgTable(
  "station_personnel_assignments",
  {
    id: char("id", { length: 26 }).primaryKey(),
    stationId: char("station_id", { length: 26 })
      .notNull()
      .references(() => stations.id, { onDelete: "cascade" }),
    personnelId: char("personnel_id", { length: 26 })
      .notNull()
      .references(() => personnel.id, { onDelete: "restrict" }),

    isHeadOperator: boolean("is_head_operator").notNull().default(false),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  }
);
