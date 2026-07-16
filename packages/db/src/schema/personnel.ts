import { pgTable, char, varchar, text, timestamp, boolean, date, time, integer } from "drizzle-orm/pg-core";
import { tenants } from "./core";
import { factories } from "./factories";
import { users } from "./users";

// Title reference table
export const personnelTitles = pgTable("personnel_titles", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  titleName: varchar("title_name", { length: 100 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  
  // Standard columns
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  createdBy: char("created_by", { length: 26 }),
  updatedBy: char("updated_by", { length: 26 }),
});

// Personnel aggregate root
export const personnel = pgTable("personnel", {
  id: char("id", { length: 26 }).primaryKey(),
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  factoryId: char("factory_id", { length: 26 })
    .references(() => factories.id, { onDelete: "restrict" }),
  personnelCode: varchar("personnel_code", { length: 100 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  titleId: char("title_id", { length: 26 }).references(() => personnelTitles.id),
  role: varchar("role", { length: 50 }).notNull().default("operator"), // operator | senior_operator | supervisor | manager
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  hiredAt: date("hired_at"),
  notes: text("notes"),
  
  // Personnel ↔ User Relationship Link
  userId: char("user_id", { length: 26 }).references(() => users.id, { onDelete: "set null" }),

  // Standard columns
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  createdBy: char("created_by", { length: 26 }),
  updatedBy: char("updated_by", { length: 26 }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: char("deleted_by", { length: 26 }),
});

// Owned object: Emergency Contacts
export const emergencyContacts = pgTable("emergency_contacts", {
  id: char("id", { length: 26 }).primaryKey(),
  personnelId: char("personnel_id", { length: 26 })
    .notNull()
    .references(() => personnel.id, { onDelete: "cascade" }),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  relationship: varchar("relationship", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// Owned object: Personnel Health Information
export const personnelHealthInformation = pgTable("personnel_health_information", {
  id: char("id", { length: 26 }).primaryKey(),
  personnelId: char("personnel_id", { length: 26 })
    .notNull()
    .unique()
    .references(() => personnel.id, { onDelete: "cascade" }),
  bloodType: varchar("blood_type", { length: 10 }),
  hasDisability: boolean("has_disability").notNull().default(false),
  disabilityNotes: text("disability_notes"),
  medicalConditions: text("medical_conditions"),
  allergies: text("allergies"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// Shifts (Not soft-deleted, hard deleted)
export const personnelShifts = pgTable("personnel_shifts", {
  id: char("id", { length: 26 }).primaryKey(),
  personnelId: char("personnel_id", { length: 26 })
    .notNull()
    .references(() => personnel.id, { onDelete: "cascade" }),
  shiftName: varchar("shift_name", { length: 100 }).notNull(),
  startsAt: time("starts_at").notNull(),
  endsAt: time("ends_at").notNull(),
  daysOfWeek: integer("days_of_week").array(), // 0=Sun..6=Sat
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// Certificates
export const personnelCertificates = pgTable("personnel_certificates", {
  id: char("id", { length: 26 }).primaryKey(),
  personnelId: char("personnel_id", { length: 26 })
    .notNull()
    .references(() => personnel.id, { onDelete: "cascade" }),
  certificateType: varchar("certificate_type", { length: 100 }).notNull(), // forklift | crane | ohs | vocational | etc
  issuedAt: date("issued_at").notNull(),
  expiresAt: date("expires_at"),
  documentUrl: text("document_url"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// Station Permissions (Placeholder reference for stations)
export const personnelStationPermissions = pgTable("personnel_station_permissions", {
  id: char("id", { length: 26 }).primaryKey(),
  personnelId: char("personnel_id", { length: 26 })
    .notNull()
    .references(() => personnel.id, { onDelete: "cascade" }),
  stationId: char("station_id", { length: 26 }).notNull(),
  permissionLevel: varchar("permission_level", { length: 50 }).notNull().default("operate"), // view | operate | supervise
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
});

// Machine Assignments (Placeholder reference for machines)
export const personnelMachineAssignments = pgTable("personnel_machine_assignments", {
  id: char("id", { length: 26 }).primaryKey(),
  personnelId: char("personnel_id", { length: 26 })
    .notNull()
    .references(() => personnel.id, { onDelete: "cascade" }),
  machineId: char("machine_id", { length: 26 }).notNull(),
  assignmentType: varchar("assignment_type", { length: 50 }).notNull().default("primary"), // primary | assistant | temporary
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  releasedAt: timestamp("released_at", { withTimezone: true }),
});
