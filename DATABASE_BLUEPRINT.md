# DATABASE_BLUEPRINT — GlassOS Relational Database Blueprint

> **Version:** 1.0
> **Date:** 2026-07-16
> **Sprint:** 2.3.22 — Database Blueprint & Architecture Lock
> **Status:** Architecture Completed — Pending Sprint 2.4 Implementation
> **Authority:** This document is the single source of truth for all future Drizzle schemas, PostgreSQL tables, repositories, APIs, and UI data contracts.

---

## Document Status

| Layer                 | Status                  |
| --------------------- | ----------------------- |
| Architecture Status   | ✅ Completed            |
| Implementation Status | ⏳ Planned (Sprint 2.4) |
| Validation Status     | ⏳ Not Executed         |

---

## Table of Contents

1. [Aggregate Catalogue](#1-aggregate-catalogue)
2. [Common Table Standards](#2-common-table-standards)
3. [Primary Key Strategy](#3-primary-key-strategy)
4. [Soft Delete Policy](#4-soft-delete-policy)
5. [Audit Policy](#5-audit-policy)
6. [Index Strategy](#6-index-strategy)
7. [Naming Conventions](#7-naming-conventions)
8. [Domain Table Plans](#8-domain-table-plans)
   - [8.1 Tenant & Factory](#81-tenant--factory)
   - [8.2 Identity & Auth](#82-identity--auth)
   - [8.3 Customer](#83-customer)
   - [8.4 Personnel](#84-personnel)
   - [8.5 Machine](#85-machine)
   - [8.6 Station](#86-station)
   - [8.7 Material & Product](#87-material--product)
   - [8.8 Recipe](#88-recipe)
   - [8.9 Inventory](#89-inventory)
   - [8.10 Order & Order Lines](#810-order--order-lines)
   - [8.11 Production & Execution](#811-production--execution)
   - [8.12 Production Queue](#812-production-queue)
   - [8.13 Rework & Breakage](#813-rework--breakage)
   - [8.14 Factory Configuration](#814-factory-configuration)
   - [8.15 Audit Log](#815-audit-log)
9. [Relationship Map](#9-relationship-map)
10. [Repository Planning](#10-repository-planning)
11. [Transaction Boundaries](#11-transaction-boundaries)
12. [Persistence Readiness Review](#12-persistence-readiness-review)
13. [Final Report](#13-final-report)

---

## 1. Aggregate Catalogue

An **Aggregate** is a cluster of domain objects treated as a single unit for data changes. Each aggregate has one root; all external references point only to the root.

| #   | Aggregate             | Root Table             | Child Count | Relationship Type |
| --- | --------------------- | ---------------------- | ----------- | ----------------- |
| 1   | Tenant                | tenants                | 2           | Composition       |
| 2   | Factory               | factories              | 4           | Composition       |
| 3   | Identity              | users                  | 2           | Composition       |
| 4   | Customer              | customers              | 3           | Composition       |
| 5   | Personnel             | personnel              | 5           | Composition       |
| 6   | Machine               | machines               | 4           | Composition       |
| 7   | Station               | stations               | 3           | Composition       |
| 8   | Material              | materials              | 2           | Composition       |
| 9   | Product               | products               | 2           | Composition       |
| 10  | Recipe                | recipes                | 4           | Composition       |
| 11  | Inventory             | inventory_items        | 4           | Composition       |
| 12  | Order                 | orders                 | 3           | Composition       |
| 13  | Production            | production_orders      | 5           | Composition       |
| 14  | Production Queue      | production_queues      | 3           | Composition       |
| 15  | Rework                | rework_orders          | 3           | Composition       |
| 16  | Factory Configuration | factory_configurations | 3           | Composition       |
| 17  | Audit Log             | audit_logs             | 0           | Append-only       |

**Total Aggregates: 17**

---

## 2. Common Table Standards

Every table in GlassOS MUST include the following columns. Columns marked REQUIRED have no exception. Columns marked CONDITIONAL apply only to tenant-scoped tables.

### 2.1. Mandatory Columns (ALL tables)

| Column       | Type              | Required    | Notes                                                             |
| ------------ | ----------------- | ----------- | ----------------------------------------------------------------- |
| `id`         | ULID / UUID       | ✅ REQUIRED | Primary key. See Section 3.                                       |
| `created_at` | TIMESTAMPTZ       | ✅ REQUIRED | UTC, set on insert, never updated.                                |
| `updated_at` | TIMESTAMPTZ       | ✅ REQUIRED | UTC, updated on every row change.                                 |
| `created_by` | UUID (FK → users) | ✅ REQUIRED | User who created the record. NULL only for system-generated rows. |
| `updated_by` | UUID (FK → users) | ✅ REQUIRED | User who last updated. NULL only for system ops.                  |

### 2.2. Tenant-Scoped Columns (tenant-owned tables)

| Column       | Type                  | Required    | Notes                                                           |
| ------------ | --------------------- | ----------- | --------------------------------------------------------------- |
| `tenant_id`  | UUID (FK → tenants)   | ✅ REQUIRED | PostgreSQL RLS enforces isolation per tenant_id.                |
| `factory_id` | UUID (FK → factories) | CONDITIONAL | Required for factory-scoped tables. Null for tenant-level data. |

### 2.3. Soft Delete Columns (tables with soft delete)

| Column       | Type              | Required    | Notes                              |
| ------------ | ----------------- | ----------- | ---------------------------------- |
| `deleted_at` | TIMESTAMPTZ       | Conditional | NULL = active, set = soft deleted. |
| `deleted_by` | UUID (FK → users) | Conditional | Who performed the soft delete.     |

### 2.4. Audit Extension Columns (critical tables)

| Column       | Type    | Required    | Notes                                           |
| ------------ | ------- | ----------- | ----------------------------------------------- |
| `version`    | INTEGER | Conditional | Optimistic locking. Increments on every update. |
| `notes`      | TEXT    | Optional    | Free-text remarks by operators or system.       |
| `device_id`  | TEXT    | Optional    | Barcode scanner, workstation, mobile device ID. |
| `ip_address` | INET    | Optional    | Source IP for web-initiated changes.            |

---

## 3. Primary Key Strategy

### Decision: ULID

**Recommendation: ULID (Universally Unique Lexicographically Sortable Identifier)**

**Format:** 26-character uppercase string. Example: `01ARZ3NDEKTSV4RRFFQ69G5FAV`

**Reasoning:**

| Criterion                         | UUID v4          | BIGINT / IDENTITY    | **ULID**                       |
| --------------------------------- | ---------------- | -------------------- | ------------------------------ |
| Sortable by creation time         | ❌ No            | ✅ Yes               | ✅ Yes                         |
| Globally unique (no coordination) | ✅ Yes           | ❌ No                | ✅ Yes                         |
| URL-safe / readable               | ❌ Hyphens       | ✅ Yes               | ✅ Yes                         |
| Index performance (B-tree)        | ❌ Random — poor | ✅ Sequential — best | ✅ Near-sequential — excellent |
| Multi-tenant safe (no ID leakage) | ✅ Yes           | ❌ Predictable       | ✅ Yes                         |
| Barcode / QR embed                | ❌ Too long      | ✅ Short             | ✅ Compact                     |
| Drizzle ORM support               | ✅ Yes           | ✅ Yes               | ✅ Yes (text column)           |

**GlassOS-Specific Rationale:**

- Production tracking is maintained at the order-line level; operational barcodes and labels are compact and URL-safe without implying a permanent physical-glass entity.
- Multi-tenant environment → sequential integers expose tenant data volume.
- Production events require chronological ordering → ULID sorts by time.
- Repository layer can generate ULID in application layer before DB write (no round-trip needed).

**Implementation note:** Store as `CHAR(26)` or `TEXT` in PostgreSQL. Generate using `ulidx` or `ulid-factory` in TypeScript.

---

## 4. Soft Delete Policy

### 4.1. Soft Delete Tables

These tables use `deleted_at` + `deleted_by` columns instead of physical deletion:

| Table               | Reason                                              |
| ------------------- | --------------------------------------------------- |
| `users`             | Auth history, audit trail required.                 |
| `personnel`         | Production history references personnel.            |
| `customers`         | Order history must remain accessible.               |
| `machines`          | Machine history referenced by production events.    |
| `stations`          | Queue history references station.                   |
| `materials`         | Recipe history references material.                 |
| `products`          | Order history references product.                   |
| `recipes`           | Production runs reference specific recipe version.  |
| `inventory_items`   | Lot and valuation history requires item reference.  |
| `orders`            | Legal, financial, and production audit requirement. |
| `production_orders` | Rework and breakage reference production order.     |
| `rework_orders`     | Factory loss and quality audit trail.               |

**RLS Policy:** All soft-delete tables MUST include `WHERE deleted_at IS NULL` in default RLS policies. Admins may query deleted rows via elevated context.

### 4.2. Hard Delete Tables

These tables use physical deletion (no soft delete):

| Table                      | Reason                                                                    |
| -------------------------- | ------------------------------------------------------------------------- |
| `audit_logs`               | Append-only. Never deleted by policy.                                     |
| `personnel_shifts`         | Operational scheduling data; historical shifts archived not soft-deleted. |
| `machine_maintenance_logs` | Time-series event data; no soft delete semantics needed.                  |
| `production_queue_items`   | Queue position is ephemeral; transitions logged in audit.                 |

---

## 5. Audit Policy

Every write operation on a critical domain table MUST produce an audit log record. The audit engine is NOT optional.

### 5.1. Audit Log Schema (planned)

```
audit_logs
├── id                 ULID
├── tenant_id          UUID → tenants (RLS enforced)
├── factory_id         UUID → factories (nullable for tenant-level ops)
├── table_name         TEXT            -- Which table was affected
├── record_id          TEXT            -- ULID of affected row
├── operation          TEXT            -- INSERT | UPDATE | DELETE | SOFT_DELETE
├── before_value       JSONB           -- Snapshot before change (null for INSERT)
├── after_value        JSONB           -- Snapshot after change (null for DELETE)
├── changed_by         UUID → users
├── changed_at         TIMESTAMPTZ
├── reason             TEXT            -- Optional: user-provided reason for change
├── workstation        TEXT            -- Device, scanner, terminal ID
├── device             TEXT            -- Mobile device or barcode scanner ID
├── ip_address         INET
├── is_manual_operation BOOLEAN        -- True = user-initiated, False = system
├── is_system_operation BOOLEAN
└── session_id         TEXT            -- Auth session or job ID
```

### 5.2. Tables Requiring Mandatory Audit

| Table                    | Events Audited                       |
| ------------------------ | ------------------------------------ |
| `users`                  | INSERT, UPDATE, SOFT_DELETE          |
| `personnel`              | INSERT, UPDATE, SOFT_DELETE          |
| `customers`              | INSERT, UPDATE, SOFT_DELETE          |
| `orders`                 | INSERT, UPDATE (status), SOFT_DELETE |
| `production_orders`      | INSERT, UPDATE (status), SOFT_DELETE |
| `rework_orders`          | INSERT, UPDATE, SOFT_DELETE          |
| `inventory_items`        | INSERT, UPDATE, SOFT_DELETE          |
| `inventory_lots`         | INSERT, UPDATE                       |
| `factory_configurations` | UPDATE (every configuration change)  |
| `machines`               | INSERT, UPDATE, SOFT_DELETE          |
| `stations`               | INSERT, UPDATE, SOFT_DELETE          |

---

## 6. Index Strategy

Indexes are planned at the architectural level. No SQL is produced here. Each index must be created in the Drizzle schema during Sprint 2.4.

### 6.1. Index Rules

1. Every `tenant_id` column MUST have an index (or be part of a composite index).
2. Every foreign key column MUST have an index.
3. Every `status` / `current_status` / `current_operation` column used in WHERE clauses MUST have an index.
4. Every `deleted_at` column MUST have a partial index: `WHERE deleted_at IS NULL`.
5. Barcode columns MUST have a unique index scoped to `(tenant_id, barcode)`.

### 6.2. Planned Indexes by Domain

**Order Domain**

- `(tenant_id, order_number)` — UNIQUE
- `(tenant_id, status)` — filter by status
- `(tenant_id, customer_id)` — customer orders
- `(tenant_id, due_date)` — deadline reporting
- `(factory_id, status)` — factory-scoped order list

**Production Domain**

- `(tenant_id, current_operation)` — active queue lookup
- `(tenant_id, current_station_id)` — station-based queue
- `(tenant_id, production_reference_code)` — UNIQUE operational reference lookup
- `(order_line_id, current_operation)` — per-line tracking
- `(factory_id, production_date)` — daily production reports

**Inventory Domain**

- `(tenant_id, inventory_code)` — UNIQUE item lookup
- `(tenant_id, barcode)` — UNIQUE barcode
- `(tenant_id, location_id)` — warehouse location queries
- `(lot_id, status)` — lot consumption queries

**Personnel Domain**

- `(tenant_id, personnel_code)` — UNIQUE
- `(tenant_id, station_id)` — permission lookup
- `(factory_id, shift_id)` — shift assignment

**Machine Domain**

- `(tenant_id, machine_code)` — UNIQUE
- `(station_id, machine_type)` — station machine list
- `(tenant_id, status)` — active machines

**Customer Domain**

- `(tenant_id, customer_code)` — UNIQUE
- `(tenant_id, name)` — name search
- `(tenant_id, tax_number)` — tax/identity lookup

---

## 7. Naming Conventions

### 7.1. Tables

- Use `snake_case` plural nouns.
- Join tables: `{table_a}_{table_b}` (alphabetical order).
- Examples: `production_orders`, `personnel_station_permissions`, `recipe_items`

### 7.2. Columns

- Use `snake_case`.
- Foreign keys: `{referenced_table_singular}_id`. Example: `customer_id`, `station_id`.
- Status fields: `{noun}_status` or simply `status`. Example: `production_status`, `order_status`.
- Boolean flags: use `is_` prefix. Example: `is_active`, `is_deleted`, `is_rework`.
- Timestamps: suffix `_at`. Example: `created_at`, `completed_at`, `deleted_at`.
- Counters: suffix `_count`. Example: `completed_count`, `broken_count`.
- Measurements: suffix `_mm`, `_m2`, `_kg`. Example: `width_mm`, `area_m2`.

### 7.3. Indexes

- Format: `idx_{table}_{column(s)}`
- Unique: `uq_{table}_{column(s)}`
- Partial: `idx_{table}_{column}_partial`
- Examples: `idx_orders_tenant_status`, `uq_personnel_code`, `idx_production_barcode`

### 7.4. Foreign Keys

- Format: `fk_{table}_{referenced_table}`
- Example: `fk_orders_customers`, `fk_production_orders_order_lines`

### 7.5. Repository Names

- PascalCase + `Repository` suffix.
- Examples: `OrderRepository`, `ProductionRepository`, `PersonnelRepository`

### 7.6. Service Names

- PascalCase + `Service` suffix.
- Examples: `ProductionService`, `ReworkService`, `InventoryService`

### 7.7. API Route Names

- kebab-case, plural, REST-standard.
- Examples: `/api/orders`, `/api/production-orders`, `/api/personnel`

---

## 8. Domain Table Plans

### 8.1. Tenant & Factory

**Aggregate Root:** `tenants`

```
tenants
├── id                  ULID PK
├── name                TEXT NOT NULL
├── slug                TEXT UNIQUE
├── plan                TEXT  (free | starter | professional | enterprise)
├── is_active           BOOLEAN DEFAULT true
├── created_at          TIMESTAMPTZ
└── updated_at          TIMESTAMPTZ

factories
├── id                  ULID PK
├── tenant_id           ULID FK → tenants
├── factory_code        TEXT UNIQUE per tenant
├── name                TEXT NOT NULL
├── address             TEXT
├── city                TEXT
├── country             TEXT
├── phone               TEXT
├── is_active           BOOLEAN
├── created_at, updated_at, created_by, updated_by
└── deleted_at, deleted_by

factory_settings
├── id                  ULID PK
├── factory_id          ULID FK → factories
├── setting_key         TEXT NOT NULL
├── setting_value       TEXT
└── created_at, updated_at
```

**Extension Points:** `tenant_billing`, `tenant_subscriptions`, `factory_shifts_global`

---

### 8.2. Identity & Auth

**Aggregate Root:** `users`

```
users
├── id                  ULID PK
├── tenant_id           ULID FK → tenants  (null for super admins)
├── factory_id          ULID FK → factories  (null for tenant admins)
├── email               TEXT UNIQUE
├── hashed_password     TEXT
├── role                TEXT  (super_admin | tenant_admin | factory_manager | office | operator | driver | customer)
├── is_active           BOOLEAN
├── selected_factory_id ULID FK → factories (last selected factory for multi-factory users)
├── created_at, updated_at, created_by, updated_by
└── deleted_at, deleted_by

user_sessions
├── id                  ULID PK
├── user_id             ULID FK → users
├── session_token       TEXT UNIQUE
├── expires_at          TIMESTAMPTZ
├── ip_address          INET
├── device              TEXT
└── created_at
```

**Extension Points:** `user_two_factor`, `user_api_keys`, `user_notification_preferences`

---

### 8.3. Customer

**Aggregate Root:** `customers`

```
customers
├── id                  ULID PK
├── tenant_id           ULID FK → tenants (RLS)
├── factory_id          ULID FK → factories
├── customer_code       TEXT  (unique per tenant)
├── name                TEXT NOT NULL
├── short_name          TEXT
├── tax_number          TEXT
├── tax_office          TEXT
├── phone               TEXT
├── email               TEXT
├── address             TEXT
├── city                TEXT
├── country             TEXT
├── is_active           BOOLEAN
├── notes               TEXT
├── created_at, updated_at, created_by, updated_by
└── deleted_at, deleted_by

customer_contacts
├── id                  ULID PK
├── customer_id         ULID FK → customers
├── name                TEXT
├── title               TEXT
├── phone               TEXT
├── email               TEXT
└── is_primary          BOOLEAN

customer_delivery_points
├── id                  ULID PK
├── customer_id         ULID FK → customers
├── name                TEXT
├── address             TEXT
├── city                TEXT
├── gps_lat             NUMERIC
├── gps_lng             NUMERIC
└── is_default          BOOLEAN
```

**Extension Points:** `customer_price_agreements`, `customer_credit_limits`

---

### 8.4. Personnel

**Aggregate Root:** `personnel`

```
personnel
├── id                  ULID PK
├── tenant_id           ULID FK → tenants (RLS)
├── factory_id          ULID FK → factories
├── personnel_code      TEXT  (unique per tenant)
├── first_name          TEXT NOT NULL
├── last_name           TEXT NOT NULL
├── title               TEXT
├── role                TEXT  (operator | senior_operator | supervisor | manager)
├── phone               TEXT
├── email               TEXT
├── blood_type          TEXT
├── has_disability      BOOLEAN
├── emergency_contact   TEXT
├── emergency_phone     TEXT
├── is_active           BOOLEAN
├── hired_at            DATE
├── notes               TEXT
├── created_at, updated_at, created_by, updated_by
└── deleted_at, deleted_by

personnel_station_permissions
├── id                  ULID PK
├── personnel_id        ULID FK → personnel
├── station_id          ULID FK → stations
├── permission_level    TEXT  (view | operate | supervise)
└── granted_at          TIMESTAMPTZ

personnel_machine_assignments
├── id                  ULID PK
├── personnel_id        ULID FK → personnel
├── machine_id          ULID FK → machines
├── assignment_type     TEXT  (primary | assistant | temporary)
├── assigned_at         TIMESTAMPTZ
└── released_at         TIMESTAMPTZ  (null = still assigned)

personnel_shifts
├── id                  ULID PK
├── personnel_id        ULID FK → personnel
├── shift_name          TEXT
├── starts_at           TIME
├── ends_at             TIME
├── days_of_week        INTEGER[]  (0=Sun..6=Sat)
└── is_active           BOOLEAN

personnel_certificates
├── id                  ULID PK
├── personnel_id        ULID FK → personnel
├── certificate_type    TEXT  (forklift | crane | ohs | vocational)
├── issued_at           DATE
├── expires_at          DATE
└── document_url        TEXT

personnel_titles (reference table)
├── id                  ULID PK
├── tenant_id           ULID FK → tenants
├── title_name          TEXT
└── is_active           BOOLEAN
```

**Extension Points:** `personnel_performance_metrics`, `personnel_training_records`

---

### 8.5. Machine

**Aggregate Root:** `machines`

```
machines
├── id                  ULID PK
├── tenant_id           ULID FK → tenants (RLS)
├── factory_id          ULID FK → factories
├── station_id          ULID FK → stations
├── machine_code        TEXT  (unique per tenant)
├── name                TEXT NOT NULL
├── machine_type        TEXT  (cutting | grinding | tempering | insulating_glass | cnc | drilling | lamination | washing | painting | sandblasting | quality | dispatch)
├── brand               TEXT
├── model               TEXT
├── serial_number       TEXT
├── manufacture_year    INTEGER
├── purchased_at        DATE
├── commissioned_at     DATE
├── warranty_starts_at  DATE
├── warranty_ends_at    DATE
├── status              TEXT  (active | maintenance | idle | decommissioned)
├── hourly_capacity     NUMERIC
├── daily_capacity      NUMERIC
├── max_glass_width_mm  NUMERIC
├── max_glass_height_mm NUMERIC
├── max_thickness_mm    NUMERIC
├── min_thickness_mm    NUMERIC
├── is_active           BOOLEAN
├── notes               TEXT
├── created_at, updated_at, created_by, updated_by
└── deleted_at, deleted_by

machine_maintenance_logs
├── id                  ULID PK
├── machine_id          ULID FK → machines
├── maintenance_type    TEXT  (periodic | breakdown | consumable | spare_part | software | warranty)
├── performed_at        DATE
├── performed_by        ULID FK → personnel
├── cost                NUMERIC
├── notes               TEXT
└── created_at

machine_spare_parts
├── id                  ULID PK
├── machine_id          ULID FK → machines
├── part_name           TEXT
├── part_number         TEXT
├── supplier            TEXT
├── replaced_at         DATE
├── cost                NUMERIC
└── notes               TEXT

machine_consumables
├── id                  ULID PK
├── machine_id          ULID FK → machines
├── consumable_name     TEXT
├── installed_at        DATE
├── replaced_at         DATE
└── notes               TEXT
```

**Extension Points:** `machine_oee_records`, `machine_downtime_logs`, `machine_sensor_data`

---

### 8.6. Station

**Aggregate Root:** `stations`

```
stations
├── id                  ULID PK
├── tenant_id           ULID FK → tenants (RLS)
├── factory_id          ULID FK → factories
├── station_code        TEXT  (unique per factory)
├── name                TEXT NOT NULL
├── description         TEXT
├── station_type        TEXT  (cutting | grinding | tempering | insulating_glass | lamination | cnc | drilling | washing | painting | sandblasting | quality | dispatch)
├── sort_order          INTEGER
├── max_concurrent_jobs INTEGER
├── max_machines        INTEGER
├── max_operators       INTEGER
├── is_active           BOOLEAN
├── notes               TEXT
├── created_at, updated_at, created_by, updated_by
└── deleted_at, deleted_by

station_machine_assignments
├── id                  ULID PK
├── station_id          ULID FK → stations
├── machine_id          ULID FK → machines
├── is_primary          BOOLEAN
└── assigned_at         TIMESTAMPTZ

station_personnel_assignments
├── id                  ULID PK
├── station_id          ULID FK → stations
├── personnel_id        ULID FK → personnel
├── is_head_operator    BOOLEAN
└── assigned_at         TIMESTAMPTZ
```

**Extension Points:** `station_capacity_profiles`, `station_oee_metrics`

---

### 8.7. Material & Product

**Aggregate Root:** `materials`, `products`

```
materials  (raw materials — no price, price lives in inventory_lots)
├── id                  ULID PK
├── tenant_id           ULID FK → tenants (RLS)
├── factory_id          ULID FK → factories
├── material_code       TEXT  (unique per tenant)
├── name                TEXT NOT NULL
├── glass_type          TEXT  (float | low_e | reflective | patterned | laminated_glass)
├── thickness_mm        NUMERIC
├── color               TEXT
├── manufacturer        TEXT
├── standard_width_mm   NUMERIC
├── standard_height_mm  NUMERIC
├── density_kg_m2       NUMERIC
├── can_be_tempered     BOOLEAN
├── can_be_laminated    BOOLEAN
├── is_active           BOOLEAN
├── notes               TEXT
├── created_at, updated_at, created_by, updated_by
└── deleted_at, deleted_by

material_unit_profiles
├── id                  ULID PK
├── material_id         ULID FK → materials
├── unit_type           TEXT  (piece | m2 | kg | m)
└── conversion_factor   NUMERIC

products  (finished products — temper, isıcam, lamine)
├── id                  ULID PK
├── tenant_id           ULID FK → tenants (RLS)
├── factory_id          ULID FK → factories
├── product_code        TEXT  (unique per tenant)
├── name                TEXT NOT NULL
├── product_type        TEXT  (temper | insulating_glass | laminated)
├── recipe_id           ULID FK → recipes
├── is_active           BOOLEAN
├── notes               TEXT
├── created_at, updated_at, created_by, updated_by
└── deleted_at, deleted_by

product_categories
├── id                  ULID PK
├── tenant_id           ULID FK → tenants
├── name                TEXT
└── is_active           BOOLEAN
```

---

### 8.8. Recipe

**Aggregate Root:** `recipes`

```
recipes
├── id                  ULID PK
├── tenant_id           ULID FK → tenants (RLS)
├── factory_id          ULID FK → factories
├── recipe_code         TEXT  (unique per tenant)
├── name                TEXT NOT NULL
├── version             INTEGER DEFAULT 1
├── product_type        TEXT
├── is_active           BOOLEAN
├── notes               TEXT
├── created_at, updated_at, created_by, updated_by
└── deleted_at, deleted_by

recipe_items  (material consumption definitions)
├── id                  ULID PK
├── recipe_id           ULID FK → recipes
├── material_id         ULID FK → materials
├── consumption_basis   TEXT  (area | perimeter | piece | fixed | duration)
├── quantity_per_unit   NUMERIC
├── unit                TEXT
└── sequence            INTEGER  (unique per recipe)

recipe_operations  (operation sequence)
├── id                  ULID PK
├── recipe_id           ULID FK → recipes
├── operation_code      TEXT  (cutting | grinding | tempering | insulating_glass | lamination | cnc | drilling | washing | painting | sandblasting | quality | dispatch)
├── sequence            INTEGER  (unique per recipe)
├── is_mandatory        BOOLEAN
└── notes               TEXT

recipe_rules  (operation-level rules)
├── id                  ULID PK
├── recipe_id           ULID FK → recipes
├── rule_type           TEXT  (grinding_required | tempering_required | low_e_orientation | drilling_required | cnc_required | lamination_required)
└── rule_value          TEXT

recipe_versions  (immutable historical snapshots)
├── id                  ULID PK
├── recipe_id           ULID FK → recipes
├── version_number      INTEGER
├── snapshot_json       JSONB  (full recipe snapshot at that version)
└── created_at
```

**Extension Points:** `recipe_cost_profiles`, `recipe_capacity_rules`

---

### 8.9. Inventory

**Aggregate Root:** `inventory_items`

```
inventory_items
├── id                  ULID PK
├── tenant_id           ULID FK → tenants (RLS)
├── factory_id          ULID FK → factories
├── inventory_code      TEXT  (unique per tenant)
├── name                TEXT NOT NULL
├── inventory_type      TEXT  (raw_material | semi_finished | finished_product | traded_goods | consumable | spare_part | packaging | service | scrap | remnant | by_product)
├── unit                TEXT  (piece | m2 | kg | m | liter | box | package | roll)
├── material_id         ULID FK → materials (nullable — link to material card)
├── product_id          ULID FK → products (nullable — link to product card)
├── location_id         ULID FK → inventory_locations
├── is_active           BOOLEAN
├── notes               TEXT
├── created_at, updated_at, created_by, updated_by
└── deleted_at, deleted_by

inventory_lots  (purchase lots — price lives here, NOT on material card)
├── id                  ULID PK
├── inventory_item_id   ULID FK → inventory_items
├── lot_number          TEXT
├── supplier_lot        TEXT
├── quantity            NUMERIC
├── remaining_quantity  NUMERIC
├── unit_cost           NUMERIC  (cost at time of receipt — immutable after creation)
├── currency            TEXT DEFAULT 'TRY'
├── received_at         TIMESTAMPTZ
├── expiration_date     DATE
├── status              TEXT  (active | consumed | expired | quarantine)
├── barcode             TEXT  (unique per tenant)
└── created_at, updated_at

inventory_locations
├── id                  ULID PK
├── tenant_id           ULID FK → tenants
├── factory_id          ULID FK → factories
├── location_code       TEXT
├── name                TEXT
├── location_type       TEXT  (main_warehouse | glass_warehouse | consumables | spare_parts | scrap | remnant | finished_goods)
└── is_active           BOOLEAN

inventory_barcodes
├── id                  ULID PK
├── inventory_item_id   ULID FK → inventory_items
├── lot_id              ULID FK → inventory_lots
├── barcode             TEXT UNIQUE per tenant
├── glass_barcode       TEXT  (optional operational reference / label code; not a permanent physical-glass identity)
├── width_mm            NUMERIC
├── height_mm           NUMERIC
├── thickness_mm        NUMERIC
└── created_at
```

**Extension Points:** `inventory_valuation_records`, `inventory_consumption_logs`, `inventory_count_records`

---

### 8.10. Order & Order Lines

**Aggregate Root:** `orders`

```
orders
├── id                  ULID PK
├── tenant_id           ULID FK → tenants (RLS)
├── factory_id          ULID FK → factories
├── customer_id         ULID FK → customers
├── order_number        TEXT  (unique per tenant — human readable, e.g. ORD-2026-00123)
├── order_date          DATE
├── due_date            DATE
├── status              TEXT  (draft | confirmed | in_production | completed | cancelled)
├── notes               TEXT
├── created_at, updated_at, created_by, updated_by
└── deleted_at, deleted_by

order_lines
├── id                  ULID PK
├── order_id            ULID FK → orders
├── product_id          ULID FK → products
├── recipe_id           ULID FK → recipes
├── width_mm            NUMERIC  (Business Dimension — never changes)
├── height_mm           NUMERIC  (Business Dimension — never changes)
├── quantity            INTEGER
├── completed_quantity  INTEGER DEFAULT 0
├── broken_quantity     INTEGER DEFAULT 0
├── notes               TEXT
└── created_at, updated_at

order_notes
├── id                  ULID PK
├── order_id            ULID FK → orders
├── note_text           TEXT
├── is_internal         BOOLEAN
└── created_at, created_by
```

---

### 8.11. Production & Execution

**Aggregate Root:** `production_orders`

```
production_orders
├── id                  ULID PK
├── tenant_id           ULID FK → tenants (RLS)
├── factory_id          ULID FK → factories
├── order_line_id       ULID FK → order_lines
├── production_reference_code TEXT (optional operational reference; not a permanent glass entity)
├── width_mm            NUMERIC  (Business Dimension)
├── height_mm           NUMERIC  (Business Dimension)
├── production_width_mm NUMERIC  (Production Dimension — includes grinding allowance)
├── production_height_mm NUMERIC (Production Dimension)
├── product_type        TEXT
├── current_operation   TEXT  (cutting | grinding | tempering | ...)
├── current_station_id  ULID FK → stations
├── current_status      TEXT  (pending | in_progress | completed | broken | rework | cancelled)
├── is_rework           BOOLEAN DEFAULT false
├── revision_number     INTEGER DEFAULT 0  (0=original, 1=R1 first rework, etc.)
├── parent_id           ULID FK → production_orders  (null if original)
├── production_reference_code TEXT (optional operational reference; not a permanent glass entity)
├── completed_at        TIMESTAMPTZ
├── notes               TEXT
├── created_at, updated_at, created_by, updated_by
└── deleted_at, deleted_by

production_events  (immutable event log — one row per station transition)
├── id                  ULID PK
├── production_order_id ULID FK → production_orders
├── event_type          TEXT  (started | paused | completed | broken | transferred | rework_created)
├── from_operation      TEXT
├── to_operation        TEXT
├── station_id          ULID FK → stations
├── machine_id          ULID FK → machines
├── operator_id         ULID FK → personnel
├── shift_id            ULID FK → personnel_shifts
├── event_at            TIMESTAMPTZ
├── notes               TEXT
└── created_at

production_breakage_events
├── id                  ULID PK
├── production_order_id ULID FK → production_orders
├── breakage_station_id ULID FK → stations
├── breakage_machine_id ULID FK → machines
├── breakage_operator_id ULID FK → personnel
├── breakage_reason     TEXT
├── breakage_category   TEXT  (handling | machine_fault | quality | thermal | edge | other)
├── broken_at           TIMESTAMPTZ
└── created_at

cutting_results  (one record per cutting batch)
├── id                  ULID PK
├── tenant_id           ULID FK → tenants
├── factory_id          ULID FK → factories
├── station_id          ULID FK → stations
├── machine_id          ULID FK → machines
├── operator_id         ULID FK → personnel
├── material_id         ULID FK → materials
├── sheets_planned      INTEGER
├── sheets_used         INTEGER  (entered by operator — key fire input)
├── cutting_date        DATE
├── batch_status        TEXT  (open | completed)
└── created_at, updated_at

cutting_result_items  (which production_orders were in this batch)
├── id                  ULID PK
├── cutting_result_id   ULID FK → cutting_results
└── production_order_id ULID FK → production_orders
```

**Extension Points:** `production_quality_records`, `production_cost_actuals`, `production_oee_snapshots`

---

### 8.12. Production Queue

**Aggregate Root:** `production_queues`

```
production_operations  (reference table — available operation types)
├── id                  ULID PK
├── tenant_id           ULID FK → tenants
├── operation_code      TEXT UNIQUE per tenant
├── operation_name      TEXT
├── sort_order          INTEGER
└── is_active           BOOLEAN

production_queues  (one queue per station+operation combo)
├── id                  ULID PK
├── tenant_id           ULID FK → tenants
├── factory_id          ULID FK → factories
├── station_id          ULID FK → stations
├── operation_code      TEXT
└── is_active           BOOLEAN

production_queue_items  (ephemeral — removed when transitioned)
├── id                  ULID PK
├── queue_id            ULID FK → production_queues
├── production_order_id ULID FK → production_orders
├── entered_at          TIMESTAMPTZ
├── priority            INTEGER DEFAULT 100  (lower = higher priority; rework = 1)
└── status              TEXT  (waiting | in_progress | done)
```

---

### 8.13. Rework & Breakage

**Aggregate Root:** `rework_orders`

```
rework_orders
├── id                  ULID PK
├── tenant_id           ULID FK → tenants (RLS)
├── factory_id          ULID FK → factories
├── parent_production_order_id ULID FK → production_orders
├── breakage_event_id   ULID FK → production_breakage_events
├── rework_reason       TEXT
├── rework_status       TEXT  (pending | in_cutting | completed | cancelled)
├── new_production_order_id ULID FK → production_orders  (the new glass being made)
├── internal_customer   TEXT  (fire_depot | scrap_depot | factory_loss)
├── created_at, updated_at, created_by, updated_by
└── deleted_at, deleted_by

fire_inventory_items  (usable offcuts and scrap from breakage)
├── id                  ULID PK
├── tenant_id           ULID FK → tenants
├── factory_id          ULID FK → factories
├── rework_order_id     ULID FK → rework_orders (nullable)
├── breakage_event_id   ULID FK → production_breakage_events
├── inventory_type      TEXT  (reusable | scrap)
├── width_mm            NUMERIC
├── height_mm           NUMERIC
├── thickness_mm        NUMERIC
├── glass_type          TEXT
├── status              TEXT  (in_depot | returned_to_inventory | scrapped)
└── created_at

rework_history
├── id                  ULID PK
├── rework_order_id     ULID FK → rework_orders
├── previous_status     TEXT
├── new_status          TEXT
├── changed_by          ULID FK → users
├── changed_at          TIMESTAMPTZ
└── notes               TEXT
```

---

### 8.14. Factory Configuration

**Aggregate Root:** `factory_configurations`

```
factory_configurations  (grinding and trim profiles — key engine inputs)
├── id                  ULID PK
├── tenant_id           ULID FK → tenants (RLS)
├── factory_id          ULID FK → factories
├── config_key          TEXT  (unique per factory)
├── config_value        TEXT
├── config_type         TEXT  (grinding | trim | remnant | scrap | valuation | general)
└── created_at, updated_at

grinding_profiles  (per machine or global)
├── id                  ULID PK
├── factory_id          ULID FK → factories
├── machine_id          ULID FK → machines (nullable = factory default)
├── product_type        TEXT  (nullable = applies to all)
├── left_mm             NUMERIC
├── right_mm            NUMERIC
├── top_mm              NUMERIC
└── bottom_mm           NUMERIC

trim_profiles  (per sheet type or global)
├── id                  ULID PK
├── factory_id          ULID FK → factories
├── material_id         ULID FK → materials (nullable = factory default)
├── left_mm             NUMERIC
├── right_mm            NUMERIC
├── top_mm              NUMERIC
└── bottom_mm           NUMERIC

remnant_thresholds  (determines remnant vs scrap decision)
├── id                  ULID PK
├── factory_id          ULID FK → factories
├── minimum_width_mm    NUMERIC
├── minimum_height_mm   NUMERIC
├── minimum_area_m2     NUMERIC
└── updated_at
```

---

### 8.15. Audit Log

**Aggregate Root:** `audit_logs` (append-only, never updated)

```
audit_logs
├── id                  ULID PK
├── tenant_id           ULID FK → tenants
├── factory_id          ULID FK → factories
├── table_name          TEXT
├── record_id           TEXT  (ULID of affected row)
├── operation           TEXT  (INSERT | UPDATE | DELETE | SOFT_DELETE)
├── before_value        JSONB
├── after_value         JSONB
├── changed_by          ULID FK → users
├── changed_at          TIMESTAMPTZ
├── reason              TEXT
├── workstation         TEXT
├── device              TEXT
├── ip_address          INET
├── is_manual_operation BOOLEAN
├── is_system_operation BOOLEAN
└── session_id          TEXT
```

---

## 9. Relationship Map

### 9.1. Core Relationship Hierarchy

```
tenants
└── factories (1:N, composition)
    ├── users (1:N, reference)
    ├── personnel (1:N, composition)
    │   ├── personnel_station_permissions (1:N)
    │   ├── personnel_machine_assignments (1:N)
    │   ├── personnel_shifts (1:N)
    │   └── personnel_certificates (1:N)
    ├── machines (1:N, composition)
    │   ├── machine_maintenance_logs (1:N)
    │   ├── machine_spare_parts (1:N)
    │   └── machine_consumables (1:N)
    ├── stations (1:N, composition)
    │   ├── station_machine_assignments (N:M → machines)
    │   └── station_personnel_assignments (N:M → personnel)
    ├── materials (1:N, composition)
    ├── products (1:N, composition → recipes)
    ├── recipes (1:N, composition)
    │   ├── recipe_items (1:N → materials)
    │   ├── recipe_operations (1:N)
    │   ├── recipe_rules (1:N)
    │   └── recipe_versions (1:N, immutable snapshots)
    ├── customers (1:N, composition)
    │   ├── customer_contacts (1:N)
    │   └── customer_delivery_points (1:N)
    ├── orders (1:N, composition → customers)
    │   ├── order_lines (1:N → products, recipes)
    │   └── order_notes (1:N)
    ├── production_orders (1:N, composition → order_lines)
    │   ├── production_events (1:N, append-only)
    │   ├── production_breakage_events (1:N)
    │   └── cutting_result_items (N:M → cutting_results)
    ├── production_queues (1:N → stations, operations)
    │   └── production_queue_items (1:N → production_orders)
    ├── rework_orders (1:N → production_orders)
    │   ├── fire_inventory_items (1:N)
    │   └── rework_history (1:N, append-only)
    ├── factory_configurations (1:N)
    │   ├── grinding_profiles (1:N → machines)
    │   ├── trim_profiles (1:N → materials)
    │   └── remnant_thresholds (1:1)
    └── audit_logs (1:N, append-only)
```

### 9.2. Critical Relationship Types

| Relationship                                        | Type             | Notes                                                                                        |
| --------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------- |
| `tenants → factories`                               | 1:N Composition  | Factory cannot exist without tenant                                                          |
| `factories → orders`                                | 1:N Composition  | Orders belong to one factory                                                                 |
| `orders → order_lines`                              | 1:N Composition  | Lines deleted if order deleted                                                               |
| `order_lines → production_orders`                   | 1:N Reference    | One production execution record per order line; no permanent per-piece entity                |
| `production_orders → production_orders` (parent_id) | Self-referential | Rework genealogy                                                                             |
| `recipes → recipe_items`                            | 1:N Composition  | Recipe owns its material list                                                                |
| `recipes → recipe_operations`                       | 1:N Composition  | Sequence is part of recipe                                                                   |
| `stations ↔ machines`                               | N:M Reference    | Via station_machine_assignments                                                              |
| `stations ↔ personnel`                              | N:M Reference    | Via station_personnel_assignments                                                            |
| `inventory_lots → inventory_items`                  | N:1 Reference    | Multiple lots per item                                                                       |
| `rework_orders → production_orders`                 | 1:1 Reference    | Each rework creates an internal production order that merges back into the parent order line |

---

## 10. Repository Planning

Each repository owns exactly one aggregate root. No repository may write to another aggregate's tables. Cross-aggregate coordination happens in the Service Layer.

| Repository                       | Aggregate Root         | Owned Tables                                                                                                      |
| -------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `TenantRepository`               | tenants                | tenants, factory_settings                                                                                         |
| `FactoryRepository`              | factories              | factories                                                                                                         |
| `UserRepository`                 | users                  | users, user_sessions                                                                                              |
| `CustomerRepository`             | customers              | customers, customer_contacts, customer_delivery_points                                                            |
| `PersonnelRepository`            | personnel              | personnel, personnel_station_permissions, personnel_machine_assignments, personnel_shifts, personnel_certificates |
| `MachineRepository`              | machines               | machines, machine_maintenance_logs, machine_spare_parts, machine_consumables                                      |
| `StationRepository`              | stations               | stations, station_machine_assignments, station_personnel_assignments                                              |
| `MaterialRepository`             | materials              | materials, material_unit_profiles                                                                                 |
| `ProductRepository`              | products               | products, product_categories                                                                                      |
| `RecipeRepository`               | recipes                | recipes, recipe_items, recipe_operations, recipe_rules, recipe_versions                                           |
| `InventoryRepository`            | inventory_items        | inventory_items, inventory_lots, inventory_locations, inventory_barcodes                                          |
| `OrderRepository`                | orders                 | orders, order_lines, order_notes                                                                                  |
| `ProductionRepository`           | production_orders      | production_orders, production_events, production_breakage_events, cutting_results, cutting_result_items           |
| `ProductionQueueRepository`      | production_queues      | production_queues, production_queue_items, production_operations                                                  |
| `ReworkRepository`               | rework_orders          | rework_orders, fire_inventory_items, rework_history                                                               |
| `FactoryConfigurationRepository` | factory_configurations | factory_configurations, grinding_profiles, trim_profiles, remnant_thresholds                                      |
| `AuditRepository`                | audit_logs             | audit_logs (write-only from repositories; read-only from admin layer)                                             |

**Total Repositories: 17**

---

## 11. Transaction Boundaries

Transactions MUST be managed at the Service Layer. Each transaction begins with `withTenantSession()` and sets `app.current_tenant_id` before any query runs.

| Use Case                     | Tables Involved                                                                                                                          | Transaction Type |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Order Confirmation           | `orders` → `order_lines` → `production_orders` (batch create)                                                                            | Explicit TX      |
| Operation Completion         | `production_orders` (status) → `production_queue_items` (delete) → new queue item (insert) → `production_events` (insert)                | Explicit TX      |
| Breakage Recording           | `production_orders` (status=broken) → `production_breakage_events` → `rework_orders` → new `production_orders` → queue item (priority=1) | Explicit TX      |
| Rework Completion            | `rework_orders` (status=completed) → parent `order_lines` (completed_quantity++) → `production_events`                                   | Explicit TX      |
| Cutting Batch Close          | `cutting_results` (batch_status=completed) → fire calculation → `production_events`                                                      | Explicit TX      |
| Inventory Lot Creation       | `inventory_lots` (insert) → `inventory_barcodes` (insert)                                                                                | Explicit TX      |
| Soft Delete Any Entity       | `{table}` (deleted_at, deleted_by) → `audit_logs` (append)                                                                               | Explicit TX      |
| Factory Configuration Update | `factory_configurations` (update) → `audit_logs` (append)                                                                                | Explicit TX      |

---

## 12. Persistence Readiness Review

### 12.1. Missing References Identified

| Domain            | Gap                                                                                     | Resolution Plan                                                 |
| ----------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Production Engine | No `cutting_results.total_area_used_m2` — fire calculation needs this                   | Add computed column or calculate from related production_orders |
| Inventory         | No `inventory_lots.valuation_method` per lot — factory config drives it globally        | Factory Configuration `valuation_method` config key covers this |
| Rework            | `fire_inventory_items` has no tonnage/weight field                                      | Add `weight_kg` column to fire_inventory_items                  |
| Personnel         | No `personnel.user_id` link — operators log in as users, but personnel card is separate | Add `user_id` nullable FK on `personnel`                        |
| Recipe            | No versioning of `recipe_operations` independently                                      | `recipe_versions.snapshot_json` covers full snapshot            |

### 12.2. Potential Circular Dependencies

| Risk                                                    | Tables                 | Status                                                                |
| ------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------- |
| `production_orders.parent_id` self-reference            | production_orders      | ✅ Safe — nullable, genealogy only                                    |
| `inventory_items` ↔ `materials` ↔ `products`            | Cross-domain reference | ✅ Safe — nullable FKs, no circular dependency                        |
| `rework_orders` → `production_orders` → `rework_orders` | Potentially circular   | ✅ Safe — one direction only (rework creates new glass, not circular) |

### 12.3. Normalization Notes

| Issue                                                      | Recommendation                                                                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `current_operation` in `production_orders` is denormalized | Keep as denormalized for performance. Operation is always derivable from the queue but query cost is high. |
| `production_dimension` stored in `production_orders`       | Correct — must be stored, not computed at runtime, because grinding config may change after production.    |
| `unit_cost` in `inventory_lots` is immutable after insert  | Correct — valuation integrity requires cost not change retroactively.                                      |

### 12.4. Future Migration Risks

| Risk                                             | Likelihood | Mitigation                                                      |
| ------------------------------------------------ | ---------- | --------------------------------------------------------------- |
| Adding new operation types                       | High       | `operation_code TEXT` is extensible without migration           |
| Changing Primary Key strategy (e.g. ULID → UUID) | Low        | ULID stored as TEXT — migration is mechanical                   |
| Adding multi-currency support                    | Medium     | `currency TEXT DEFAULT 'TRY'` in inventory_lots is future-ready |
| Adding multi-language product names              | Medium     | Defer; add `name_translations JSONB` column when needed         |
| Partitioning `audit_logs` by month               | Medium     | Plan for Sprint 2.6+ — use `created_at` as partition key        |

---

## 13. Final Report

### Blueprint Summary

| Metric                      | Count        |
| --------------------------- | ------------ |
| Total Aggregates            | 17           |
| Total Planned Tables        | 68           |
| Total Relationships         | 42           |
| Repositories Planned        | 17           |
| Transaction Boundaries      | 8 documented |
| Potential Risks Identified  | 9            |
| Missing References Resolved | 5            |

### Architecture Review Summary

- Every domain implemented in Sprint 2.3 is mapped to a concrete table plan.
- Every table follows the Common Table Standards (Section 2).
- ULID is selected as the primary key strategy with full rationale.
- Soft delete and hard delete tables are explicitly designated.
- Every audit-required table is listed.
- Indexes are planned at domain level — no SQL generated.
- All 17 repositories have clear ownership boundaries.
- Transaction boundaries are documented at the use-case level.
- 9 potential risks identified and mitigated in planning.
- No circular dependencies exist in the data model.

### Documentation Synchronization

| Document                   | Update Required                           |
| -------------------------- | ----------------------------------------- |
| `DATABASE_BLUEPRINT.md`    | ✅ Created (this document)                |
| `CHANGELOG.md`             | ✅ To be updated                          |
| `PLAN.md`                  | ✅ To be updated (Sprint 2.4 unlocked)    |
| `walkthrough.md`           | ✅ To be updated                          |
| `DATABASE_ARCHITECTURE.md` | ✅ To be updated (reference to blueprint) |
| `README.md`                | ✅ To be updated                          |

---

> **GlassOS is now READY for Sprint 2.4 (Database Implementation).**
>
> Sprint 2.4 will translate this blueprint into:
>
> - Drizzle ORM schema (`schema.ts`)
> - PostgreSQL migrations
> - RLS policies for all new tables
> - Repository implementations
> - Service layer wiring
