# DATABASE_STANDARDS — GlassOS Database Development Standards

> **Version:** 1.0
> **Date:** 2026-07-16
> **Sprint:** 2.4.0 — Database Standards
> **Authority:** This document defines the permanent, non-negotiable database development standards for GlassOS.
> **Scope:** Every Drizzle schema file, migration, index, constraint, and repository MUST comply with these standards without exception.

---

## Document Status

| Layer                 | Status                                     |
| --------------------- | ------------------------------------------ |
| Architecture Status   | ✅ Completed                               |
| Implementation Status | ✅ Active Standard — Sprint 2.4 and beyond |
| Validation Status     | ⏳ Enforced per migration PR review        |

---

## Table of Contents

1. [Table Naming](#1-table-naming)
2. [Column Naming](#2-column-naming)
3. [Primary Key Standard](#3-primary-key-standard)
4. [Foreign Key Standard](#4-foreign-key-standard)
5. [Index Naming](#5-index-naming)
6. [Constraint Naming](#6-constraint-naming)
7. [Timestamp Policy](#7-timestamp-policy)
8. [Decimal & Numeric Precision](#8-decimal--numeric-precision)
9. [Enum Policy](#9-enum-policy)
10. [JSONB Policy](#10-jsonb-policy)
11. [Soft Delete Policy](#11-soft-delete-policy)
12. [Audit Columns](#12-audit-columns)
13. [Migration Naming](#13-migration-naming)
14. [RLS Policy Standards](#14-rls-policy-standards)
15. [Drizzle ORM Standards](#15-drizzle-orm-standards)

---

## 1. Table Naming

### 1.1. General Rules

| Rule         | Standard                                                          | Example                                             |
| ------------ | ----------------------------------------------------------------- | --------------------------------------------------- |
| Case         | `snake_case` — all lowercase, words separated by underscores      | `order_lines`, `inventory_lots`                     |
| Number       | **Plural** — tables represent collections of records              | `orders`, `customers`, `machines`                   |
| Language     | **English only** — no Turkish words in table names                | `personnel` NOT `personel`                          |
| Prefix       | **No global prefix** — do not add `tbl_`, `t_`, `glassos_`        | `orders` NOT `tbl_orders`                           |
| Abbreviation | **No abbreviations** — full descriptive names                     | `customers` NOT `cust`, `inventory_items` NOT `inv` |
| Max length   | PostgreSQL limit is 63 characters — stay under 50 for readability | —                                                   |

### 1.2. Junction / Join Tables

Junction tables (many-to-many) use the two related table names joined with an underscore, in alphabetical order:

```
{table_a}_{table_b}
```

**Examples:**

| Relationship         | Junction Table                  |
| -------------------- | ------------------------------- |
| Machines ↔ Stations  | `machine_station_assignments`   |
| Personnel ↔ Stations | `personnel_station_permissions` |
| Personnel ↔ Machines | `personnel_machine_assignments` |
| Recipes ↔ Operations | `recipe_operations`             |

> **Exception:** If the junction table carries additional data (e.g., `assigned_at`, `permission_level`), it may have a more descriptive name that reflects its purpose rather than strict alphabetical join.

### 1.3. Aggregate vs. Child Tables

- **Aggregate Root:** Use the domain noun in plural. Example: `orders`, `recipes`, `personnel`.
- **Child Entity:** Prefix with the parent singular noun. Example: `order_lines`, `recipe_items`, `personnel_certificates`.
- **Reference Data:** Use descriptive plural. Example: `inventory_locations`, `production_operations`.
- **Event / Log / History:** Suffix with `_events`, `_logs`, or `_history`. Example: `production_events`, `rework_history`, `audit_logs`.
- **Snapshots:** Suffix with `_versions` or `_snapshots`. Example: `recipe_versions`.

### 1.4. Correct Examples

```
tenants
factories
factory_settings
users
user_sessions
customers
customer_contacts
customer_delivery_points
personnel
personnel_certificates
personnel_shifts
personnel_station_permissions
personnel_machine_assignments
machines
machine_maintenance_logs
machine_spare_parts
machine_consumables
stations
station_machine_assignments
station_personnel_assignments
materials
material_unit_profiles
products
product_categories
recipes
recipe_items
recipe_operations
recipe_rules
recipe_versions
inventory_items
inventory_lots
inventory_locations
inventory_barcodes
orders
order_lines
order_notes
production_orders
production_events
production_breakage_events
cutting_results
cutting_result_items
production_queues
production_operations
production_queue_items
rework_orders
rework_history
fire_inventory_items
factory_configurations
grinding_profiles
trim_profiles
remnant_thresholds
audit_logs
```

---

## 2. Column Naming

### 2.1. General Rules

| Rule               | Standard                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| Case               | `snake_case` — all lowercase                                                                   |
| Language           | English only                                                                                   |
| Clarity            | Self-describing — avoid `data`, `info`, `value` as standalone names                            |
| Abbreviation       | No abbreviations — use full words                                                              |
| Boolean prefix     | Always `is_` prefix: `is_active`, `is_rework`, `is_primary`                                    |
| Timestamp suffix   | Always `_at` suffix: `created_at`, `deleted_at`, `completed_at`                                |
| Counter suffix     | Always `_count` suffix: `broken_count`, `completed_count`                                      |
| Measurement suffix | Unit appended: `_mm` for millimeters, `_m2` for square meters, `_kg` for kilograms             |
| FK suffix          | Always `_id` suffix referencing the singular of the related table: `customer_id`, `station_id` |

### 2.2. Standard Column Definitions

Every column below has a fixed name, type, and semantic. Deviation is NOT permitted.

#### `id`

- **Type:** `CHAR(26)` — ULID stored as uppercase string
- **Rule:** Primary key of every table. Never use `serial`, `bigint`, or `uuid` for new tables.
- **Generated:** In application layer before DB write. Never auto-generated by PostgreSQL.
- **Example value:** `01ARZ3NDEKTSV4RRFFQ69G5FAV`

#### `tenant_id`

- **Type:** `CHAR(26)` FK → `tenants.id`
- **Rule:** REQUIRED on every table that stores tenant-scoped data. No exception.
- **RLS:** PostgreSQL Row Level Security policy uses this column to enforce isolation.
- **Nullable:** Only on system-level tables (`users` for super admins, `tenants` itself).

#### `factory_id`

- **Type:** `CHAR(26)` FK → `factories.id`
- **Rule:** REQUIRED on factory-scoped tables. Nullable on tenant-level data (e.g., `users` where role = `tenant_admin`).
- **RLS:** RLS policies may further filter by `factory_id` where applicable.

#### `created_at`

- **Type:** `TIMESTAMPTZ` — timestamp with time zone
- **Rule:** Set on INSERT. NEVER updated afterwards. Has a database default: `NOW()`.
- **Value:** Always UTC. Conversion to local timezone happens in application/UI layer only.

#### `updated_at`

- **Type:** `TIMESTAMPTZ`
- **Rule:** Updated on EVERY row change. Drizzle `.$onUpdate(() => new Date())` must be set.
- **Value:** Always UTC.

#### `deleted_at`

- **Type:** `TIMESTAMPTZ` — nullable
- **Rule:** `NULL` means record is active. Non-null means soft-deleted. Set on soft delete operation.
- **Partial Index:** Every table with `deleted_at` MUST have a partial index `WHERE deleted_at IS NULL`.

#### `created_by`

- **Type:** `CHAR(26)` FK → `users.id`
- **Rule:** Set on INSERT. NEVER updated. Nullable only for system-generated rows (e.g., migration seeds).

#### `updated_by`

- **Type:** `CHAR(26)` FK → `users.id`
- **Rule:** Updated on EVERY row change alongside `updated_at`. Nullable only for system operations.

#### `deleted_by`

- **Type:** `CHAR(26)` FK → `users.id`
- **Rule:** Set only when `deleted_at` is set. NEVER set on active records.

#### `version`

- **Type:** `INTEGER` DEFAULT 1
- **Rule:** Optimistic locking. Incremented on every UPDATE. Used in Service Layer to detect concurrent modifications.
- **Applies to:** Critical aggregate roots: `orders`, `production_orders`, `recipes`, `inventory_lots`.

#### `status`

- **Type:** `TEXT`
- **Rule:** Uses predefined string enum values defined in application TypeScript types. Never use integer status codes.
- **Column name:** If a table has multiple status fields, use descriptive names: `production_status`, `rework_status`, `lot_status`.
- **Example values:** `'active'`, `'completed'`, `'cancelled'`, `'in_progress'`

#### `code`

- **Type:** `TEXT`
- **Rule:** Human-readable unique identifier within a tenant. Format: `{PREFIX}-{YEAR}-{SEQ}` or similar. Business-facing. Separate from `id`.
- **Unique Constraint:** Always unique per `(tenant_id, code)`.
- **Examples:** `order_number TEXT`, `machine_code TEXT`, `personnel_code TEXT`

#### `name`

- **Type:** `TEXT NOT NULL`
- **Rule:** Display name of the record. Human-readable. Not unique by itself (use `code` for uniqueness).

#### `notes`

- **Type:** `TEXT`
- **Rule:** Free-text optional remarks. Nullable. No length limit at DB level. Length validation in application layer.

---

## 3. Primary Key Standard

### 3.1. Decision: ULID

**All new tables use ULID as the primary key.**

ULID (Universally Unique Lexicographically Sortable Identifier) is a 128-bit identifier encoded in 26 characters using Crockford's Base32 alphabet.

**Format:** `01ARZ3NDEKTSV4RRFFQ69G5FAV`

### 3.2. Why ULID

| Criterion                         | UUID v4          | BIGINT SERIAL             | **ULID (Chosen)**                       |
| --------------------------------- | ---------------- | ------------------------- | --------------------------------------- |
| Globally unique                   | ✅               | ❌ Requires coordination  | ✅                                      |
| Chronologically sortable          | ❌ Random        | ✅ Sequential             | ✅ Near-sequential (millisecond prefix) |
| B-tree index performance          | ❌ Poor (random) | ✅ Best                   | ✅ Excellent (near-sequential)          |
| Multi-tenant safe (no ID leakage) | ✅               | ❌ Exposes row count      | ✅                                      |
| URL-safe / barcode-embeddable     | ❌ Hyphens       | ✅                        | ✅ 26 chars, no hyphens                 |
| Application-layer generation      | ✅               | ❌ DB round-trip required | ✅ No DB round-trip                     |
| Human-readable in logs            | ❌               | ✅                        | ✅                                      |
| Drizzle ORM support               | ✅               | ✅                        | ✅ `text()` column                      |

**GlassOS-Specific Reasons:**

1. Glass barcode labels embed the `production_orders.id` → compact, URL-safe ULID fits label constraints.
2. Multi-tenant SaaS — sequential integers expose data volume per tenant.
3. Application generates ULID before INSERT → reduces DB round-trips in batch operations (cutting batch).
4. Events are naturally time-ordered → `audit_logs`, `production_events` sorted by `id` gives chronological order for free.

### 3.3. Generation Policy

```
Rule 1: ULID is always generated in the application layer (TypeScript), never in PostgreSQL.
Rule 2: Use the `ulidx` npm package (or equivalent) for generation.
Rule 3: ULIDs are generated in the Service Layer before passing to the Repository.
Rule 4: Never allow NULL primary keys. The id column is always NOT NULL.
Rule 5: ULIDs are stored as CHAR(26) — uppercase, fixed length.
```

**TypeScript usage:**

```typescript
import { ulid } from "ulidx";

const newId = ulid(); // '01ARZ3NDEKTSV4RRFFQ69G5FAV'
```

**Drizzle column definition:**

```typescript
id: char("id", { length: 26 }).primaryKey();
```

### 3.4. What NOT To Do

```
❌ Do NOT use uuid() or gen_random_uuid() in PostgreSQL DEFAULT
❌ Do NOT use SERIAL or BIGSERIAL
❌ Do NOT use auto-increment integers
❌ Do NOT mix ULID and UUID in the same system
❌ Do NOT store ULID in lowercase
```

---

## 4. Foreign Key Standard

### 4.1. Column Naming

Foreign key columns are named using the **singular form** of the referenced table, followed by `_id`:

```
{referenced_table_singular}_id
```

**Examples:**

| References Table    | FK Column Name        |
| ------------------- | --------------------- |
| `customers`         | `customer_id`         |
| `orders`            | `order_id`            |
| `order_lines`       | `order_line_id`       |
| `production_orders` | `production_order_id` |
| `stations`          | `station_id`          |
| `machines`          | `machine_id`          |
| `personnel`         | `personnel_id`        |
| `inventory_lots`    | `lot_id`              |
| `recipes`           | `recipe_id`           |
| `rework_orders`     | `rework_order_id`     |

> **Exception — Disambiguated FKs:** When a table references the same table multiple times (e.g., `production_orders.parent_id` for rework genealogy), use a descriptive prefix: `parent_id`, `primary_machine_id`, `head_operator_id`.

### 4.2. Constraint Naming

Foreign key constraints follow this format:

```
fk_{table}_{column}
```

**Examples:**

| Table               | Column                       | Constraint Name                               |
| ------------------- | ---------------------------- | --------------------------------------------- |
| `orders`            | `customer_id`                | `fk_orders_customer_id`                       |
| `order_lines`       | `order_id`                   | `fk_order_lines_order_id`                     |
| `production_orders` | `order_line_id`              | `fk_production_orders_order_line_id`          |
| `production_orders` | `current_station_id`         | `fk_production_orders_current_station_id`     |
| `rework_orders`     | `parent_production_order_id` | `fk_rework_orders_parent_production_order_id` |
| `audit_logs`        | `changed_by`                 | `fk_audit_logs_changed_by`                    |

### 4.3. ON DELETE / ON UPDATE Rules

| Relationship Type               | ON DELETE  | ON UPDATE  | Rationale                                                                               |
| ------------------------------- | ---------- | ---------- | --------------------------------------------------------------------------------------- |
| Composition (parent owns child) | `RESTRICT` | `CASCADE`  | Prevent orphan deletion; e.g., cannot delete a recipe if production_orders reference it |
| Reference (lookup/shared data)  | `RESTRICT` | `RESTRICT` | Referenced data must not disappear                                                      |
| Soft-deleted parent             | `RESTRICT` | `RESTRICT` | Soft delete is used; hard delete never fires                                            |
| Self-referential (genealogy)    | `SET NULL` | `RESTRICT` | e.g., `production_orders.parent_id` — if parent deleted, child still exists             |

> **Rule:** NEVER use `ON DELETE CASCADE` in production tables. Data is soft-deleted, not physically removed.

---

## 5. Index Naming

### 5.1. Standard Index

```
idx_{table}_{column(s)}
```

**Examples:**

| Table               | Columns             | Index Name                                |
| ------------------- | ------------------- | ----------------------------------------- |
| `orders`            | `tenant_id, status` | `idx_orders_tenant_id_status`             |
| `production_orders` | `current_operation` | `idx_production_orders_current_operation` |
| `customers`         | `tenant_id`         | `idx_customers_tenant_id`                 |
| `personnel`         | `factory_id`        | `idx_personnel_factory_id`                |
| `audit_logs`        | `changed_at`        | `idx_audit_logs_changed_at`               |

### 5.2. Unique Index

```
uq_{table}_{column(s)}
```

**Examples:**

| Table                | Columns                                | Index Name                                                 |
| -------------------- | -------------------------------------- | ---------------------------------------------------------- |
| `customers`          | `tenant_id, customer_code`             | `uq_customers_tenant_id_customer_code`                     |
| `orders`             | `tenant_id, order_number`              | `uq_orders_tenant_id_order_number`                         |
| `machines`           | `tenant_id, machine_code`              | `uq_machines_tenant_id_machine_code`                       |
| `personnel`          | `tenant_id, personnel_code`            | `uq_personnel_tenant_id_personnel_code`                    |
| `inventory_items`    | `tenant_id, inventory_code`            | `uq_inventory_items_tenant_id_inventory_code`              |
| `inventory_barcodes` | `tenant_id, barcode`                   | `uq_inventory_barcodes_tenant_id_barcode`                  |
| `production_orders`  | `tenant_id, production_reference_code` | `uq_production_orders_tenant_id_production_reference_code` |

### 5.3. Partial Index (Soft Delete)

Every table with `deleted_at` MUST have a partial index filtering only active records:

```
idx_{table}_active
```

**Definition pattern:**

```sql
CREATE INDEX idx_customers_active ON customers (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_active ON orders (tenant_id, status) WHERE deleted_at IS NULL;
```

**Examples:**

| Table               | Index Name                     | Filter                     |
| ------------------- | ------------------------------ | -------------------------- |
| `customers`         | `idx_customers_active`         | `WHERE deleted_at IS NULL` |
| `orders`            | `idx_orders_active`            | `WHERE deleted_at IS NULL` |
| `personnel`         | `idx_personnel_active`         | `WHERE deleted_at IS NULL` |
| `machines`          | `idx_machines_active`          | `WHERE deleted_at IS NULL` |
| `production_orders` | `idx_production_orders_active` | `WHERE deleted_at IS NULL` |

### 5.4. Composite Index Rules

- Column order matters: put the most selective column first.
- `tenant_id` is almost always first in a composite index for tenant-scoped tables.
- Do NOT index every column. Only columns used in `WHERE`, `ORDER BY`, or `JOIN` conditions.

```
Correct:   (tenant_id, status)     -- filters by tenant first, then status
Correct:   (tenant_id, due_date)   -- filters by tenant first, then sorts/filters by date
Incorrect: (status, tenant_id)     -- status alone is rarely selective enough to lead
```

---

## 6. Constraint Naming

### 6.1. Primary Key

```
pk_{table}
```

| Table               | Constraint Name        |
| ------------------- | ---------------------- |
| `orders`            | `pk_orders`            |
| `production_orders` | `pk_production_orders` |
| `audit_logs`        | `pk_audit_logs`        |

### 6.2. Foreign Key

```
fk_{table}_{column}
```

_(See Section 4.2 for examples.)_

### 6.3. Unique Constraint

```
uq_{table}_{column(s)}
```

_(Same name as unique index — in PostgreSQL, a unique constraint automatically creates a unique index.)_

### 6.4. Check Constraint

```
chk_{table}_{description}
```

**Examples:**

| Table               | Rule                                                                | Constraint Name                               |
| ------------------- | ------------------------------------------------------------------- | --------------------------------------------- |
| `order_lines`       | `quantity > 0`                                                      | `chk_order_lines_quantity_positive`           |
| `inventory_lots`    | `unit_cost >= 0`                                                    | `chk_inventory_lots_unit_cost_non_negative`   |
| `grinding_profiles` | `left_mm >= 0 AND right_mm >= 0 AND top_mm >= 0 AND bottom_mm >= 0` | `chk_grinding_profiles_dimensions_positive`   |
| `production_orders` | `revision_number >= 0`                                              | `chk_production_orders_revision_non_negative` |

### 6.5. Not Null Constraint

Not null constraints are enforced at the column level in Drizzle with `.notNull()`. No separate naming required.

---

## 7. Timestamp Policy

### 7.1. Storage Format

**All timestamps are stored in UTC.**

```
Rule 1: Every TIMESTAMPTZ column stores UTC.
Rule 2: Application layer reads UTC from the database.
Rule 3: UI layer converts UTC to the user's local timezone for display only.
Rule 4: No timezone conversion happens in SQL queries or Drizzle schema.
Rule 5: Never store LOCAL time in the database.
```

### 7.2. Column Type

Use **`TIMESTAMPTZ`** (timestamp with time zone) exclusively. Never use `TIMESTAMP` (without time zone).

| Type          | Allowed          | Reason                                                                                              |
| ------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| `TIMESTAMPTZ` | ✅ YES           | Stores UTC, timezone-aware                                                                          |
| `TIMESTAMP`   | ❌ NO            | No timezone context — dangerous in multi-region setups                                              |
| `DATE`        | ✅ Conditionally | Only for calendar dates where time is irrelevant (e.g., `due_date`, `hired_at`, `warranty_ends_at`) |
| `TIME`        | ✅ Conditionally | Only for daily schedule times (e.g., shift start/end times)                                         |

### 7.3. Application-Layer Timezone Conversion

```typescript
// CORRECT: Convert UTC to display timezone in application/UI layer
const displayDate = new Intl.DateTimeFormat("tr-TR", {
  timeZone: userFactory.timezone, // e.g., 'Europe/Istanbul'
  dateStyle: "short",
  timeStyle: "short",
}).format(new Date(record.created_at));

// WRONG: Never do this in SQL
// SELECT created_at AT TIME ZONE 'Europe/Istanbul' FROM orders  -- ❌
```

### 7.4. Default Values

```
created_at: DEFAULT NOW()  (Drizzle: .defaultNow())
updated_at: Set by application. Drizzle .$onUpdate(() => new Date())
deleted_at: NULL by default. Set explicitly on soft delete.
```

---

## 8. Decimal & Numeric Precision

All numeric columns must use explicitly defined precision to prevent rounding errors and ambiguity.

### 8.1. Physical Dimensions (Glass Manufacturing)

| Measurement    | Column Suffix | PostgreSQL Type  | Precision           | Unit          |
| -------------- | ------------- | ---------------- | ------------------- | ------------- |
| Length / Width | `_mm`         | `NUMERIC(10, 2)` | Up to 9999999.99 mm | Millimeters   |
| Height         | `_mm`         | `NUMERIC(10, 2)` | Up to 9999999.99 mm | Millimeters   |
| Thickness      | `_mm`         | `NUMERIC(6, 2)`  | Up to 9999.99 mm    | Millimeters   |
| Area           | `_m2`         | `NUMERIC(14, 6)` | 6 decimal places    | Square meters |
| Perimeter      | `_mm`         | `NUMERIC(12, 2)` | 2 decimal places    | Millimeters   |
| Weight         | `_kg`         | `NUMERIC(10, 3)` | 3 decimal places    | Kilograms     |
| Volume         | `_m3`         | `NUMERIC(14, 6)` | 6 decimal places    | Cubic meters  |

**Examples:**

```
order_lines.width_mm      NUMERIC(10, 2)   -- Customer dimension
order_lines.height_mm     NUMERIC(10, 2)   -- Customer dimension
materials.thickness_mm    NUMERIC(6, 2)
production_orders.area_m2 NUMERIC(14, 6)
grinding_profiles.left_mm NUMERIC(6, 2)
```

### 8.2. Financial / Monetary Values

| Field             | PostgreSQL Type  | Precision        | Notes                               |
| ----------------- | ---------------- | ---------------- | ----------------------------------- |
| Unit cost / price | `NUMERIC(15, 4)` | 4 decimal places | Supports sub-cent precision         |
| Total amount      | `NUMERIC(18, 4)` | 4 decimal places | Prevents overflow on large orders   |
| Tax amount        | `NUMERIC(15, 4)` | 4 decimal places |                                     |
| Exchange rate     | `NUMERIC(12, 6)` | 6 decimal places | Forex rates need sub-cent precision |

> **Rule:** NEVER use `FLOAT` or `DOUBLE PRECISION` for monetary values. Floating-point arithmetic introduces rounding errors that accumulate in financial calculations.

### 8.3. Ratios and Percentages

| Field                    | PostgreSQL Type  | Precision            | Notes                      |
| ------------------------ | ---------------- | -------------------- | -------------------------- |
| Yield / efficiency ratio | `NUMERIC(7, 4)`  | e.g. 0.9523 = 95.23% | Stored as decimal fraction |
| Consumption factor       | `NUMERIC(10, 6)` | e.g. 1.042857        | Recipe consumption ratios  |
| OEE / performance %      | `NUMERIC(7, 4)`  |                      |                            |

### 8.4. Drizzle Notation

```typescript
// Physical dimensions
widthMm: numeric("width_mm", { precision: 10, scale: 2 }).notNull();
heightMm: numeric("height_mm", { precision: 10, scale: 2 }).notNull();
thicknessMm: numeric("thickness_mm", { precision: 6, scale: 2 });
areaM2: numeric("area_m2", { precision: 14, scale: 6 });

// Financial
unitCost: numeric("unit_cost", { precision: 15, scale: 4 }).notNull();
totalAmount: numeric("total_amount", { precision: 18, scale: 4 });
```

---

## 9. Enum Policy

### 9.1. When to Use PostgreSQL ENUM

**Do NOT use PostgreSQL native ENUM type.**

Reason: PostgreSQL ENUMs cannot be modified without a full schema migration (`ALTER TYPE ... ADD VALUE`). In a SaaS multi-tenant system with continuous deployment, this is operationally dangerous.

### 9.2. What to Use Instead

**Use `TEXT` columns with application-layer TypeScript union types or `as const` objects.**

```typescript
// Define in TypeScript types layer (packages/types)
export const OrderStatus = {
  DRAFT: "draft",
  CONFIRMED: "confirmed",
  IN_PRODUCTION: "in_production",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];
```

```typescript
// In Drizzle schema
status: text("status").notNull().default("draft");
```

This allows adding new status values without any migration.

### 9.3. When to Use Lookup Tables

Use a **lookup table** (reference table) when:

1. The list of valid values is managed by the tenant or admin (configurable at runtime).
2. The values need localization (multiple language names).
3. The values carry additional attributes (color, icon, sort order, description).
4. The list has more than ~20 values that users manage.

**Examples of lookup tables:**

- `product_categories` — tenant configures their own product categories.
- `personnel_titles` — tenant defines their own job titles.
- `production_operations` — factory configures their operation sequence.
- `inventory_locations` — factory manages their own warehouse structure.

**Examples of TEXT with TS type (NOT lookup tables):**

- `order_lines.status` — fixed lifecycle statuses, not user-configured.
- `production_orders.current_operation` — fixed operation codes.
- `machines.machine_type` — fixed machine type codes.
- `inventory_items.inventory_type` — fixed inventory categories.

### 9.4. Decision Matrix

| Situation                                        | Use                       |
| ------------------------------------------------ | ------------------------- |
| Fixed, non-configurable values (statuses, types) | `TEXT` + TypeScript const |
| User-configurable categories or lists            | Lookup table              |
| Values need translations                         | Lookup table              |
| Values carry attributes (color, icon)            | Lookup table              |
| Less than ~15 values, never changes              | `TEXT` + TypeScript const |
| PostgreSQL native ENUM                           | ❌ Never                  |

---

## 10. JSONB Policy

### 10.1. Acceptable JSONB Usage

JSONB is permitted **only** in the following specific scenarios:

| Use Case                       | Example                                                                      | Acceptable |
| ------------------------------ | ---------------------------------------------------------------------------- | ---------- |
| **Immutable Snapshots**        | `recipe_versions.snapshot_json` — full recipe state at version point         | ✅ YES     |
| **Flexible Settings / Config** | `factory_configurations.config_value` — key-value pairs that vary by factory | ✅ YES     |
| **Audit Before/After Values**  | `audit_logs.before_value`, `audit_logs.after_value`                          | ✅ YES     |
| **External Payload / Webhook** | Incoming ERP payload before mapping                                          | ✅ YES     |
| **Device Metadata**            | Scanner, workstation, browser metadata                                       | ✅ YES     |
| **Relational Data**            | Customer list, order items, personnel list                                   | ❌ NEVER   |
| **Data that needs querying**   | Any field used in WHERE or JOIN                                              | ❌ NEVER   |
| **Foreign key relationships**  | Any relationship between aggregates                                          | ❌ NEVER   |
| **Status or type fields**      | `{"status": "active"}` in JSONB                                              | ❌ NEVER   |

### 10.2. JSONB Rules

```
Rule 1: If a field inside JSONB will ever be queried with WHERE, move it to a proper column.
Rule 2: If a field inside JSONB references another table, make it a proper FK column.
Rule 3: Snapshots are write-once, read-only. Never mutate snapshot JSONB.
Rule 4: JSONB config/settings must have a corresponding TypeScript type for validation.
Rule 5: Never store arrays of related objects in JSONB — use child tables instead.
```

### 10.3. Correct vs Incorrect Examples

```typescript
// ✅ CORRECT — immutable snapshot
recipeVersions.snapshotJson = {
  recipeId: '01ARZ...',
  version: 3,
  items: [...],
  operations: [...]
};

// ✅ CORRECT — flexible settings
factoryConfigurations.configValue = '{"fifo": true, "allow_remnant": true}';

// ✅ CORRECT — audit trail
auditLogs.beforeValue = { status: 'draft', notes: 'old notes' };
auditLogs.afterValue  = { status: 'confirmed', notes: 'new notes' };

// ❌ WRONG — relational data in JSONB
orders.customerData = { id: '01ARZ...', name: 'ABC Ltd' };
// → Use customer_id FK instead.

// ❌ WRONG — status in JSONB
productionOrders.meta = { currentStatus: 'in_progress' };
// → Use current_status TEXT column instead.

// ❌ WRONG — array of child entities in JSONB
orders.lines = [{ productId: '...', quantity: 5 }];
// → Use order_lines table instead.
```

---

## 11. Soft Delete Policy

### 11.1. Soft Delete Tables

These tables use `deleted_at TIMESTAMPTZ` + `deleted_by CHAR(26)` columns. Physical deletion is NEVER performed on these tables.

| Table                    | Reason                                                                  |
| ------------------------ | ----------------------------------------------------------------------- |
| `users`                  | Auth history and audit trail must be preserved                          |
| `personnel`              | All production events reference personnel; deletion would break history |
| `customers`              | All order history is linked to customer records                         |
| `orders`                 | Legal requirement; financial and production records must remain         |
| `order_lines`            | Part of order; cannot be physically deleted if order exists             |
| `machines`               | Machine referenced by production_events and maintenance_logs            |
| `stations`               | Station referenced by production_events and queue_items                 |
| `materials`              | Referenced by recipe_items and inventory_items                          |
| `products`               | Referenced by order_lines and production_orders                         |
| `recipes`                | Referenced by order_lines and production_orders (specific version)      |
| `inventory_items`        | Referenced by lots, barcodes, and consumption records                   |
| `production_orders`      | Referenced by rework_orders and production_events                       |
| `rework_orders`          | Required for factory loss audit trail                                   |
| `factory_configurations` | Configuration history must be traceable                                 |

**RLS Default Policy for Soft Delete Tables:**

```sql
-- All queries automatically filter out soft-deleted rows
CREATE POLICY "{table}_tenant_isolation" ON {table}
  USING (
    tenant_id = current_setting('app.current_tenant_id')::char(26)
    AND deleted_at IS NULL
  );
```

### 11.2. Hard Delete Tables

These tables use physical deletion. No `deleted_at` column.

| Table                      | Reason                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `audit_logs`               | Append-only by definition. Never deleted by policy. Archive to cold storage if needed. |
| `production_queue_items`   | Ephemeral positioning data. Transitions are logged in `production_events`.             |
| `user_sessions`            | Expired sessions cleaned up by scheduled job.                                          |
| `machine_maintenance_logs` | Time-series events. Old entries archived, not soft-deleted.                            |

### 11.3. Soft Delete Rules

```
Rule 1: Do NOT use DELETE statements in repositories for soft-delete tables.
Rule 2: Always use UPDATE ... SET deleted_at = NOW(), deleted_by = {userId}.
Rule 3: Every SELECT on soft-delete tables MUST include WHERE deleted_at IS NULL
        (automatically enforced by RLS in production, and by withTenantSession in development).
Rule 4: Soft-deleted records are never returned to the UI unless the user has admin role.
Rule 5: Cascade soft-delete: if a parent is soft-deleted, child records must also be soft-deleted
        in the same transaction. Example: soft-deleting an order soft-deletes its order_lines.
```

---

## 12. Audit Columns

### 12.1. Mandatory Audit Columns

Every table (unless explicitly exempted) MUST include the following audit columns:

```typescript
// Mandatory on ALL tables
id: char("id", { length: 26 }).primaryKey();
createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
updatedAt: timestamp("updated_at", { withTimezone: true }).notNull();

// Mandatory on tenant-scoped tables
tenantId: char("tenant_id", { length: 26 })
  .notNull()
  .references(() => tenants.id);

// Mandatory on factory-scoped tables
factoryId: char("factory_id", { length: 26 }).references(() => factories.id);

// Mandatory on user-initiated tables
createdBy: char("created_by", { length: 26 }).references(() => users.id);
updatedBy: char("updated_by", { length: 26 }).references(() => users.id);
```

### 12.2. Soft Delete Audit Columns

Required on all soft-delete tables:

```typescript
deletedAt: timestamp("deleted_at", { withTimezone: true });
deletedBy: char("deleted_by", { length: 26 }).references(() => users.id);
```

### 12.3. Extended Audit Columns (Critical Tables)

For tables where every change must be fully traceable (orders, production_orders, recipes, inventory_lots):

```typescript
version: integer("version").notNull().default(1); // Optimistic locking
notes: text("notes"); // Optional remarks
```

### 12.4. Audit Log Table (Dedicated Event Log)

High-importance operations produce a dedicated row in `audit_logs`. This is SEPARATE from the audit columns above. Audit columns provide "who last touched this row" — the audit log provides "full before/after history."

```
audit_logs mandatory fields:
- id, tenant_id, factory_id
- table_name         -- which table was affected
- record_id          -- ULID of affected row
- operation          -- INSERT | UPDATE | DELETE | SOFT_DELETE
- before_value       -- JSONB snapshot before change
- after_value        -- JSONB snapshot after change
- changed_by         -- FK → users
- changed_at         -- TIMESTAMPTZ UTC
- reason             -- optional user-provided reason
- workstation        -- device/terminal ID
- ip_address         -- INET
- is_manual_operation -- BOOLEAN
- is_system_operation -- BOOLEAN
```

### 12.5. Tables Requiring Dedicated Audit Log Entries

| Table                    | Events                                                |
| ------------------------ | ----------------------------------------------------- |
| `users`                  | INSERT, UPDATE, SOFT_DELETE                           |
| `personnel`              | INSERT, UPDATE, SOFT_DELETE                           |
| `customers`              | INSERT, UPDATE, SOFT_DELETE                           |
| `orders`                 | INSERT, UPDATE (status changes), SOFT_DELETE          |
| `order_lines`            | INSERT, UPDATE, SOFT_DELETE                           |
| `production_orders`      | INSERT, UPDATE (every status transition), SOFT_DELETE |
| `rework_orders`          | INSERT, UPDATE, SOFT_DELETE                           |
| `inventory_lots`         | INSERT, UPDATE (quantity changes)                     |
| `factory_configurations` | UPDATE (every config change)                          |
| `machines`               | INSERT, UPDATE, SOFT_DELETE                           |
| `stations`               | INSERT, UPDATE, SOFT_DELETE                           |
| `recipes`                | INSERT, UPDATE, SOFT_DELETE                           |

---

## 13. Migration Naming

### 13.1. File Naming Convention

Migrations are numbered sequentially using a 4-digit zero-padded counter followed by a descriptive name:

```
{NNNN}_{snake_case_description}.sql
```

**Examples:**

```
0001_initial_schema.sql
0002_add_rls_policies.sql
0003_production_master_data.sql
0004_personnel_domain.sql
0005_machine_station_domain.sql
0006_recipe_domain.sql
0007_inventory_domain.sql
0008_order_domain.sql
0009_production_domain.sql
0010_production_queue_domain.sql
0011_rework_domain.sql
0012_factory_configuration_domain.sql
0013_audit_log_domain.sql
0014_add_grinding_profiles.sql
0015_add_remnant_thresholds.sql
```

### 13.2. Naming Rules

```
Rule 1: Sequential 4-digit numbering starting from 0001. Never skip numbers.
Rule 2: snake_case description. No spaces, no special characters except underscores.
Rule 3: Description must reflect the primary domain or change in the migration.
Rule 4: One domain per migration file where possible.
Rule 5: Never modify an existing migration file after it has been applied to any environment.
Rule 6: Add-only migrations for schema additions (new columns, new tables).
Rule 7: Destructive migrations (dropping columns/tables) require a separate numbered file.
```

### 13.3. Migration File Structure

Each migration file must include a header comment:

```sql
-- Migration: 0004_personnel_domain.sql
-- Sprint: 2.4.X
-- Date: 2026-07-XX
-- Author: GlassOS
-- Description: Creates personnel, personnel_certificates, personnel_shifts,
--              personnel_station_permissions, personnel_machine_assignments,
--              personnel_titles tables with RLS policies.
-- Dependencies: 0001_initial_schema.sql, 0002_add_rls_policies.sql

-- [migration SQL here]
```

### 13.4. Drizzle Migration Management

- Drizzle generates migration SQL via `drizzle-kit generate`.
- Migration files are stored in `packages/db/migrations/`.
- Applied migrations are tracked in `drizzle.__drizzle_migrations` table.
- Never manually edit Drizzle-generated migration files. If a change is needed, create a new migration.

---

## 14. RLS Policy Standards

### 14.1. Policy Naming

```
{table}_{policy_description}_policy
```

**Examples:**

```sql
CREATE POLICY "orders_tenant_isolation_policy" ON orders ...
CREATE POLICY "production_orders_tenant_isolation_policy" ON production_orders ...
CREATE POLICY "audit_logs_tenant_read_policy" ON audit_logs ...
```

### 14.2. Standard RLS Pattern (Tenant-Scoped Tables)

Every tenant-scoped table uses this exact pattern:

```sql
-- Enable RLS
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
ALTER TABLE {table} FORCE ROW LEVEL SECURITY;

-- Tenant isolation policy (applies to glassos_app role — no BYPASSRLS)
CREATE POLICY "{table}_tenant_isolation_policy" ON {table}
  AS PERMISSIVE
  FOR ALL
  TO glassos_app
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    AND deleted_at IS NULL
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::char(26)
  );
```

### 14.3. RLS Session Context

The session context MUST be set inside every transaction before any query:

```typescript
// Set in withTenantSession() before any query
await tx.execute(sql`
  SELECT set_config('app.current_tenant_id', ${session.user.tenantId}, true),
         set_config('app.current_user_id', ${session.user.id}, true),
         set_config('app.current_factory_id', ${session.user.factoryId ?? ""}, true)
`);
```

### 14.4. Role Rules

| Role                         | BYPASSRLS        | Allowed Operations                                |
| ---------------------------- | ---------------- | ------------------------------------------------- |
| `glassos_app` (runtime)      | ❌ `NOBYPASSRLS` | SELECT, INSERT, UPDATE, DELETE via RLS            |
| `glassos_owner` (migrations) | ❌ `NOBYPASSRLS` | DDL: CREATE, ALTER, DROP, GRANT                   |
| `postgres` / superuser       | ✅ BYPASSRLS     | Emergency access only — never used by application |

---

## 15. Drizzle ORM Standards

### 15.1. Schema File Organization

```
packages/db/src/
├── schema/
│   ├── index.ts              -- re-exports all schemas
│   ├── tenants.ts
│   ├── factories.ts
│   ├── users.ts
│   ├── customers.ts
│   ├── personnel.ts
│   ├── machines.ts
│   ├── stations.ts
│   ├── materials.ts
│   ├── products.ts
│   ├── recipes.ts
│   ├── inventory.ts
│   ├── orders.ts
│   ├── production.ts
│   ├── production-queue.ts
│   ├── rework.ts
│   ├── factory-configuration.ts
│   └── audit-logs.ts
├── migrations/
│   ├── 0001_initial_schema.sql
│   └── ...
└── index.ts                  -- exports db client
```

### 15.2. Schema Naming Conventions

```typescript
// Table definition variable: camelCase plural
export const orderLines = pgTable('order_lines', { ... });

// Relation definition variable: camelCase + 'Relations'
export const orderLinesRelations = relations(orderLines, ({ one, many }) => ({ ... }));

// Insert type: 'NewXxx'
export type NewOrderLine = typeof orderLines.$inferInsert;

// Select type: 'Xxx'
export type OrderLine = typeof orderLines.$inferSelect;
```

### 15.3. Mandatory Column Template

Every new table MUST start with this base column set:

```typescript
import { pgTable, char, timestamp, text } from "drizzle-orm/pg-core";

export const myTable = pgTable("my_table", {
  // Primary key
  id: char("id", { length: 26 }).primaryKey(),

  // Tenant scope (if tenant-scoped)
  tenantId: char("tenant_id", { length: 26 })
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),

  // Factory scope (if factory-scoped)
  factoryId: char("factory_id", { length: 26 }).references(() => factories.id, {
    onDelete: "restrict",
  }),

  // ... domain-specific columns ...

  // Soft delete (if applicable)
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: char("deleted_by", { length: 26 }).references(() => users.id),

  // Audit
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  createdBy: char("created_by", { length: 26 }).references(() => users.id),
  updatedBy: char("updated_by", { length: 26 }).references(() => users.id),
});
```

---

## Quick Reference Card

| Standard          | Rule                                                    |
| ----------------- | ------------------------------------------------------- |
| Table names       | `snake_case` plural English                             |
| Column names      | `snake_case` English, no abbreviations                  |
| Primary key       | ULID `CHAR(26)` — app-generated                         |
| FK column         | `{referenced_table_singular}_id`                        |
| FK constraint     | `fk_{table}_{column}`                                   |
| PK constraint     | `pk_{table}`                                            |
| Unique constraint | `uq_{table}_{column(s)}`                                |
| Check constraint  | `chk_{table}_{description}`                             |
| Index             | `idx_{table}_{column(s)}`                               |
| Unique index      | `uq_{table}_{column(s)}`                                |
| Partial index     | `idx_{table}_active` with `WHERE deleted_at IS NULL`    |
| Timestamps        | `TIMESTAMPTZ`, UTC always                               |
| Dimensions        | `NUMERIC(10,2)` for mm, `NUMERIC(14,6)` for m²          |
| Money             | `NUMERIC(15,4)` — never FLOAT                           |
| Enum              | TEXT + TypeScript const — never PostgreSQL ENUM         |
| JSONB             | Snapshots, settings, audit only — never relational data |
| Soft delete       | `deleted_at TIMESTAMPTZ` + `deleted_by CHAR(26)`        |
| Migration naming  | `{NNNN}_{description}.sql` — sequential, no gaps        |
| RLS policy        | `{table}_{description}_policy`                          |
| ON DELETE         | `RESTRICT` always — never CASCADE                       |
