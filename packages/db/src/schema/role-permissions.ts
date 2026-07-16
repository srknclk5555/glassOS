import { pgTable, char, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { roles, permissions } from "./core";

export const rolePermissions = pgTable("role_permissions", {
  roleId: char("role_id", { length: 26 })
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  permissionId: char("permission_id", { length: 26 })
    .notNull()
    .references(() => permissions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.roleId, table.permissionId] })
]);
