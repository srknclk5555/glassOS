import {
  pgTable,
  char,
  varchar,
  text,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { tenants } from "./core";
import { factories } from "./factories";
import { users } from "./users";

// ─── Audit Log — Append-only, never updated or soft-deleted ──────────────────

export const auditLogs = pgTable("audit_logs", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  factoryId: char("factory_id", { length: 26 }).references(
    () => factories.id,
    { onDelete: "restrict" }
  ), // null for tenant-level operations

  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: varchar("record_id", { length: 26 }).notNull(), // ULID of affected row
  operation: varchar("operation", { length: 20 }).notNull(),
  // INSERT | UPDATE | DELETE | SOFT_DELETE

  beforeValue: jsonb("before_value"), // snapshot before change (null for INSERT)
  afterValue: jsonb("after_value"),   // snapshot after change (null for DELETE)

  changedBy: char("changed_by", { length: 26 }).references(
    () => users.id,
    { onDelete: "restrict" }
  ),
  changedAt: timestamp("changed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  reason: text("reason"),           // optional: user-provided reason for change
  workstation: varchar("workstation", { length: 255 }), // device, scanner, terminal ID
  device: varchar("device", { length: 255 }),           // mobile device or barcode scanner
  ipAddress: varchar("ip_address", { length: 45 }),     // source IP (supports IPv6)
  isManualOperation: boolean("is_manual_operation").notNull().default(true),
  isSystemOperation: boolean("is_system_operation").notNull().default(false),
  sessionId: varchar("session_id", { length: 255 }),    // auth session or job ID
});
