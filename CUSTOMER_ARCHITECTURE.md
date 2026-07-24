# CUSTOMER ARCHITECTURE

> **Versiyon:** Sprint 2.10.x — Customer Master Completion & Master Data Standardization
> **Durum:** ✅ Implemented — Tüm müşteri modülü canlıda çalışıyor
> **Son Güncelleme:** 2026-07-19

---

## Document Status

| Layer                 | Status                                           |
| --------------------- | ------------------------------------------------ |
| Architecture Status   | ✅ Completed                                     |
| Database Status       | ✅ Implemented — 6 tablo, 72 toplam schema       |
| Service Status        | ✅ Implemented — CustomerService + tüm actions   |
| UI Status             | ✅ Implemented — 7 sekme, tümü HTTP 200          |
| Validation Status     | ✅ Verified — Browser doğrulaması tamamlandı     |
| Last Updated          | 2026-07-19                                       |

---

## Table of Contents

1. [Domain Philosophy](#1-domain-philosophy)
2. [Aggregate Definition](#2-aggregate-definition)
   - [2.3 Aggregate Invariants](#23-aggregate-invariants)
3. [Entity vs. Value Object Distinction](#3-entity-vs-value-object-distinction)
4. [Complete Field Inventory](#4-complete-field-inventory)
5. [Relationship Map](#5-relationship-map)
   - [5.1 Foreign Key Standards](#51-foreign-key-standards)
6. [Inheritance & Override Strategy](#6-inheritance--override-strategy)
7. [ERP Synchronization Strategy](#7-erp-synchronization-strategy)
8. [Domain Events](#8-domain-events)
   - [8.1 Customer Aggregate Events](#81-customer-aggregate-events)
   - [8.2 Customer Contact Events](#82-customer-contact-events)
   - [8.3 Customer Delivery Point Events](#83-customer-delivery-point-events)
   - [8.4 Customer Glass Catalog Events](#84-customer-glass-catalog-events)
   - [8.5 Customer Instruction Events](#85-customer-instruction-events)
   - [8.6 Event Publishing Contract](#86-event-publishing-contract)
9. [Extension Points (Future Modules)](#9-extension-points-future-modules)
10. [Query Strategy](#10-query-strategy)
11. [Search & Index Strategy](#11-search--index-strategy)
12. [Row Level Security (RLS) Strategy](#12-row-level-security-rls-strategy)
13. [Soft Delete Strategy](#13-soft-delete-strategy)
14. [Implementation Sprint Plan](#14-implementation-sprint-plan)

---

## 1. Domain Philosophy

### 1.1. GlassOS Customer is NOT an ERP Customer

In an ERP, the Customer is a **financial counterparty** — they owe money, receive invoices, and have credit limits.

In GlassOS, the Customer is a **production specification source**. Every piece of glass is made differently per customer. The customer's quality tolerance, edgework preference, label format, and packaging requirements determine how production executes.

```
ERP:     Customer → Financial Entity (balance, debt, credit)
GlassOS: Customer → Production Spec Source (tolerances, preferences, packaging)
```

### 1.2. Boundary Rule

The Customer aggregate in GlassOS covers:

| ✅ GlassOS Scope | ❌ ERP Scope |
|---|---|
| Customer identity & status | Credit limit |
| Quality acceptance criteria | Payment terms |
| Production preferences (edge, temper, spacer, film) | Balance / debt |
| Label specifications | Invoice history |
| Packaging profile | Price agreements |
| Delivery scheduling constraints | Sales commissions |
| Communication preferences per event | Contract management |
| Operational hold (production block) | Financial hold (credit block) |
| Customer-specific glass catalog (frequent products) | — |

### 1.3. Integration Principle

GlassOS receives the Customer **identity** from ERP (via CSV import, API poll, or manual entry). The **MES-specific extensions** (quality profile, production preferences, label specs) are created and maintained **within GlassOS only**.

The ERP never writes MES fields. GlassOS never writes financial fields.

---

## 2. Aggregate Definition

```
┌────────────────────────────────────────────────────────────────────┐
│                    CUSTOMER (Aggregate Root)                       │
│                                                                    │
│  Identity Layer (ERP-sourced)                                      │
│  ├── customer_code         — Unique per tenant                    │
│  ├── name                  — Legal / trading name                 │
│  ├── short_name            — Operational abbreviation             │
│  ├── tax_number / tax_office                                      │
│  ├── phone / email / address / city / country                     │
│  └── notes                                                       │
│                                                                    │
│  Status Layer (MES-controlled)                                     │
│  ├── is_active             — Operational flag                     │
│  ├── erp_status            — Synced from ERP (active/blocked/     │
│  │                           passive) — advisory only             │
│  └── operational_block     — MES production hold (see §2.1)       │
│                                                                    │
│  Owned Entities (MES-specific)                                     │
│  ├── Contacts [*]          — Persons with role, channel, primary  │
│  ├── Delivery Points [*]   — Addresses with schedule, equipment   │
│  ├── Quality Profile [0..1]— Tolerance & acceptance criteria      │
│  ├── Production Prefs [0..1]— Default edge/temper/spacer etc.     │
│  ├── Label Spec [0..1]    — Barcode format, fields, position      │
│  ├── Packaging Profile [0..1]— Crate/stillage/interleaf config    │
│  ├── Communication Profile [0..1]— Event notification channels    │
│  ├── Glass Catalog [*]    — Frequently ordered product templates  │
│  └── Special Instructions [*]— Reusable templates + standing      │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 2.1. Operational Block (NOT Financial Hold)

The operational block is an MES-level production hold. It stops new orders from entering production and prevents dispatch of existing finished goods. It is **not** related to credit or payment.

| Field | Type | Description |
|---|---|---|
| `blocked_at` | timestamp | When the block was applied |
| `blocked_by` | char(26) | Who applied the block |
| `block_reason` | text | Human-readable reason |
| `block_category` | varchar(50) | Category: quality, documentation, specification, logistics, other |
| `block_released_at` | timestamp | When released |
| `block_released_by` | char(26) | Who released |

### 2.2. Aggregate Rules

1. **Customer identity is required** — `customer_code` and `name` must exist before any MES operation. A missing contact generates an advisory warning in the UI; it does NOT prevent order creation, production, or dispatch.
2. **Contact presence** — at least one active contact is a **precondition for the communication profile to function** (see §4.6). For dispatch, the delivery point is the critical requirement, not the contact.
3. **At least one default delivery point** must exist before dispatch is allowed.
4. **Quality profile is optional** — if absent, system-wide default tolerances are used.
5. **Production preferences are optional** — if absent, order-level entry is required.
6. **Blocked customers** cannot receive new production orders and cannot be dispatched. Existing in-progress production is not automatically stopped (factory floor decision).
7. **Soft delete** — customers are never hard-deleted. Deletion sets `deleted_at` and blocks all operations.

### 2.3. Aggregate Invariants

Aggregate invariants are rules that MUST always hold true at the database level. They are enforced through a combination of database constraints (the hard boundary), service-layer validation (the business logic gate), and UI validation (the user experience guard).

---

#### Invariant 1: Only ONE Primary Contact Per Customer

| Layer | Enforcement |
|---|---|
| **Business Rule** | A customer may have zero or one primary contact. If a primary exists, it is the default recipient for all communication unless overridden per event in the Communication Profile. |
| **Database** | Partial unique index — only one row with `is_primary = true` per `customer_id` among non-deleted records. |
| **Service** | `CustomerService.setPrimaryContact()`: before setting a new primary, unset the previous primary in the same transaction. |
| **UI** | Radio-style toggle or "Set as Primary" button. Setting a new primary visually deselects the old one. |

```sql
-- Only one primary contact per customer among active (non-deleted) records
CREATE UNIQUE INDEX idx_customer_primary_contact
  ON customer_contacts (customer_id)
  WHERE is_primary = true AND deleted_at IS NULL;
```

---

#### Invariant 2: Only ONE Default Delivery Point Per Customer

| Layer | Enforcement |
|---|---|
| **Business Rule** | A customer may have zero or one default delivery point. If a default exists, it is pre-selected on new orders. Dispatch requires a delivery point but not necessarily the default. |
| **Database** | Partial unique index — only one row with `is_default = true` per `customer_id` among non-deleted records. |
| **Service** | `CustomerService.setDefaultDeliveryPoint()`: before setting a new default, unset the previous default in the same transaction. |
| **UI** | "Set as Default" action on delivery point rows. Only one is highlighted as default. |

```sql
-- Only one default delivery point per customer among active (non-deleted) records
CREATE UNIQUE INDEX idx_customer_default_delivery
  ON delivery_points (customer_id)
  WHERE is_default = true AND deleted_at IS NULL;
```

---

#### Invariant 3: Customer Code Must Be Unique Within a Tenant

| Layer | Enforcement |
|---|---|
| **Business Rule** | `customer_code` is the operational identifier. Two customers in the same tenant cannot share a code. |
| **Database** | Composite unique index on `(tenant_id, customer_code)`. No partial condition — uniqueness applies at all times. |
| **Service** | `CustomerService.createCustomer()` and `updateCustomerCode()` check for duplicates before writing. Returns a user-facing error with the conflicting customer name. |
| **UI** | Debounced async validation on the customer code field. Shows inline error "This code is already used by [Customer Name]". |

```sql
CREATE UNIQUE INDEX idx_customers_tenant_code
  ON customers (tenant_id, customer_code);
```

---

#### Invariant 4: Deleted Customers Cannot Have Active Communication Routing

| Layer | Enforcement |
|---|---|
| **Business Rule** | A soft-deleted customer must not have active event notifications routing to its contacts or channels. The communication profile is effectively disabled when `deleted_at IS NOT NULL`. |
| **Database** | No direct constraint — enforced by application logic since `communication_profile` is JSONB. Triggers could validate but are avoided per GlassOS policy. |
| **Service** | `CustomerService.softDeleteCustomer()` clears the `communication_profile` to `NULL` in the same transaction that sets `deleted_at`. |
| **UI** | Communication tab is hidden for deleted customers. Before delete, a confirmation dialog warns that all communication routing will be cleared. |

---

#### Invariant 5: Communication Profile Cannot Reference Deleted Contacts

| Layer | Enforcement |
|---|---|
| **Business Rule** | If a contact referenced in `communication_profile.channels.*.contact_id` is soft-deleted, the profile channel entry must be removed or the contact must be restored. |
| **Database** | No FK from JSONB to `customer_contacts`. Enforced at service layer. |
| **Service** | `CustomerService.deleteContact()` scans `communication_profile` and removes any channel entries referencing the deleted contact. Both operations happen in the same transaction. |
| **UI** | When deleting a contact that is referenced in the communication profile, the confirmation dialog lists the affected event channels and warns they will be unconfigured. |

---

#### Invariant 6: Deleted Delivery Points Cannot Be Selected for New Orders

| Layer | Enforcement |
|---|---|
| **Business Rule** | A soft-deleted delivery point must not appear in the delivery point selector for new orders. Existing orders referencing the deleted delivery point remain unchanged. |
| **Database** | All delivery point queries for order creation filter `WHERE deleted_at IS NULL`. Partial index supports this. |
| **Service** | `OrderService.createOrder()` queries only non-deleted delivery points. If the customer's only delivery point was deleted, a warning is shown but order creation is not blocked (dispatch can be configured later). |
| **UI** | Delivery point selector excludes deleted delivery points. If a previously saved order references a now-deleted delivery point, it shows as "Delivery Point: [Name] (removed)" with a warning badge. |

---

#### Why Partial Unique Indexes?

Partial unique indexes are preferred over standard `UNIQUE` constraints for invariants 1 and 2 because:

| Approach | Behavior with Soft Delete |
|---|---|
| **Standard UNIQUE** | Deleted rows with `is_primary = true` still count toward uniqueness. Restoring a soft-deleted contact would conflict with the current primary contact. |
| **Partial UNIQUE (✅)** | Only active (non-deleted) rows participate in the uniqueness check. A deleted primary contact does not block creating a new primary. |

For invariant 3 (customer code), a standard unique index `(tenant_id, customer_code)` is used without a partial condition because:

- Customer codes are business-critical identifiers.
- Even deleted customers must retain unique codes for audit trail and historical reference.
- Restoring a deleted customer must not conflict with a newer customer using the same code.

---

## 3. Entity vs. Value Object Distinction

### 3.1. Entities (Have Identity — Separate Table, Own ID)

| Entity | Table | Identity | Lifespan |
|---|---|---|---|
| **Customer** | `customers` | `id` (ULID) | Independent |
| **Contact** | `customer_contacts` | `id` (ULID) | Owned by Customer |
| **Delivery Point** | `delivery_points` | `id` (ULID) | Owned by Customer |
| **Glass Catalog Entry** | `customer_glass_catalog` | `id` (ULID) | Owned by Customer |
| **Special Instruction** | `customer_instructions` | `id` (ULID) | Owned by Customer |
| **Instruction Condition** | `customer_instruction_conditions` | `id` (ULID) | Owned by Instruction |

### 3.2. Value Objects (No Separate Identity — Embedded JSONB or Columns on Parent)

| Value Object | Storage Strategy | Rationale |
|---|---|---|
| **Quality Profile** | JSONB column on `customers` | Single-value, always loaded with customer, rarely queried independently |
| **Production Preferences** | JSONB column on `customers` | Single-value, always loaded with customer |
| **Label Specification** | JSONB column on `customers` | Single-value, always loaded with customer |
| **Packaging Profile** | JSONB column on `customers` | Single-value, always loaded with customer |
| **Communication Profile** | JSONB column on `customers` | Collection of channel mappings, always with customer |
| **Operational Block** | JSONB column on `customers` | Nullable single-value, always with customer |

**Why JSONB for Value Objects instead of separate tables:**
- These are **always loaded** with the Customer aggregate — there is no use case for querying Quality Profiles independently.
- They are **single-value** per customer — not collections.
- They reduce join complexity and improve read performance.
- They follow the PostgreSQL JSONB pattern already established in GlassOS (see `settings.tolerances`, `settings.cost_settings`).
- If a Value Object needs to become a collection in the future (e.g., multiple quality profiles per customer), it can be promoted to an entity with a migration.

### 3.3. Column Storage Strategy Summary

```
customers table:
├── (regular columns)         — identity, status, audit fields
├── quality_profile           — JSONB (nullable)
├── production_preferences    — JSONB (nullable)
├── label_spec                — JSONB (nullable)
├── packaging_profile         — JSONB (nullable)
├── communication_profile     — JSONB (nullable)
├── operational_block         — JSONB (nullable)

Child tables (entities with own identity):
├── customer_contacts         — owned, ON DELETE CASCADE
├── delivery_points           — owned, ON DELETE CASCADE
├── customer_glass_catalog    — owned, ON DELETE CASCADE
├── customer_instructions     — owned, ON DELETE CASCADE
└── customer_instruction_conditions  — owned by instruction, ON DELETE CASCADE
```

---

## 4. Complete Field Inventory

### 4.1. Customer Table (`customers`)

#### Identity (ERP-sourced)

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | `char(26)` | ✅ | ULID | Primary key |
| `tenant_id` | `char(26)` | ✅ | — | FK → tenants |
| `factory_id` | `char(26)` | ❌ | null | FK → factories |
| `customer_code` | `varchar(50)` | ✅ | — | Unique per tenant |
| `name` | `varchar(255)` | ✅ | — | Legal/trading name |
| `short_name` | `varchar(100)` | ❌ | null | Operational abbreviation |
| `tax_number` | `varchar(50)` | ❌ | null | |
| `tax_office` | `varchar(100)` | ❌ | null | |
| `phone` | `varchar(50)` | ❌ | null | |
| `email` | `varchar(255)` | ❌ | null | |
| `address` | `text` | ❌ | null | |
| `city` | `varchar(100)` | ❌ | null | |
| `country` | `varchar(100)` | ❌ | null | |
| `erp_status` | `varchar(20)` | ❌ | null | Synced: active/blocked/passive |

#### MES Status

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| `is_active` | `boolean` | ✅ | `true` | Operational flag |
| `operational_block` | `jsonb` | ❌ | null | See §2.1 structure |

#### Value Objects (JSONB)

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| `quality_profile` | `jsonb` | ❌ | null | See §4.2 |
| `production_preferences` | `jsonb` | ❌ | null | See §4.3 |
| `label_spec` | `jsonb` | ❌ | null | See §4.4 |
| `packaging_profile` | `jsonb` | ❌ | null | See §4.5 |
| `communication_profile` | `jsonb` | ❌ | null | See §4.6 |

#### Audit

| Column | Type | Required | Default |
|---|---|---|---|
| `created_at` | `timestamptz` | ✅ | `now()` |
| `updated_at` | `timestamptz` | ✅ | — |
| `created_by` | `char(26)` | ❌ | null |
| `updated_by` | `char(26)` | ❌ | null |
| `deleted_at` | `timestamptz` | ❌ | null |
| `deleted_by` | `char(26)` | ❌ | null |

#### Optimistic Locking

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| `version` | `integer` | ✅ | `1` | Incremented on every UPDATE. Used for optimistic concurrency control. |

**How it works:**
1. When reading a customer row, the application reads the current `version` value.
2. When updating, the UPDATE statement includes `WHERE id = :id AND version = :read_version`.
3. If another user modified the record between read and write, the version has changed and the UPDATE affects zero rows.
4. The application detects zero affected rows and either retries (re-reads current state and re-applies the change) or reports a conflict to the user.
5. On successful update, `version` is incremented by 1.

**Scope of locking:** The `version` column on `customers` protects ONLY the aggregate root row — identity columns, audit fields, and all JSONB value objects (quality_profile, production_preferences, label_spec, packaging_profile, communication_profile, operational_block).

Child entities (`customer_contacts`, `delivery_points`, `customer_glass_catalog`, `customer_instructions`, `customer_instruction_conditions`) are NOT covered by the root's `version`. They have independent lifecycles:
- Adding a contact does NOT increment `customers.version`.
- Editing a delivery point does NOT increment `customers.version`.
- Two users editing different contacts on the same customer do NOT conflict.

**Rationale:** Child entity conflicts are rare and self-resolving. Adding optimistic locking to child tables would force every contact edit and catalog entry to bump the root, creating false conflicts on the aggregate root for unrelated changes. This is intentional: the root version protects master data integrity; child entities operate independently.

### 4.2. Quality Profile (JSONB Value Object)

```jsonc
{
  "version": 1,
  "edge_quality_mm": 0.5,           // Max edge chip size (mm)
  "optical_quality": "architectural", // architectural | automotive | mirror | solar
  "scratch_tolerance": "standard",    // standard | strict | none
  "bubble_tolerance": "standard",     // standard | strict | none
  "inspection_level": "100%",         // 100% | sampling | skip
  "accepts_b_grade": false,           // Accept B-quality substitution?
  "accepts_near_size": false,         // Accept ±1mm / ±2mm?
  "requires_mill_cert": false,        // Require mill certificate?
  "max_defects_per_sqm": 2            // Maximum visual defects per m²
}
```

### 4.3. Production Preferences (JSONB Value Object)

```jsonc
{
  "version": 1,
  "default_edgework": "flat_ground",  // flat_ground | arrissing | seamed | beveled | polished
  "default_tempering": "full_temper", // full_temper | heat_strengthened | annealed
  "default_spacer_type": "aluminum",  // aluminum | warm_edge | tps | swiggle | none
  "default_gas_fill": "argon",        // air | argon | krypton | xenon
  "default_film_type": "low_e",       // low_e | solar_control | self_cleaning | none
  "default_tolerance_class": "±1.0mm",// ±0.5mm | ±1.0mm | ±2.0mm
  "lamination_preference": "pvb",     // pvb | eva | sgp | acoustic | none
}
```

### 4.4. Label Specification (JSONB Value Object)

```jsonc
{
  "version": 1,
  "barcode_format": "code128",        // code128 | qr | datamatrix | none
  "fields": ["order_ref", "dimensions", "customer_code", "thickness", "date"],
  "label_position": "top_left",       // top_left | top_right | edge
  "labels_per_unit": 1,
  "language": "en",
  "include_logo": true,
  "protective_film_before_label": false
}
```

### 4.5. Packaging Profile (JSONB Value Object)

```jsonc
{
  "version": 1,
  "packaging_type": "stillage",       // stillage | a_frame | crate | cardboard | loose | export_crate
  "separation_material": "cork_powder",// paper | cork_powder | foam | plastic_interleaf | none
  "interleaving": "every_sheet",      // every_sheet | every_5 | none
  "strapping": "metal_band",          // metal_band | plastic_band | none
  "corner_protection": "cardboard",   // cardboard | plastic | none
  "protective_film": "one_side",      // one_side | both_sides | none
  "max_weight_kg": 1500,
  "max_pieces": 50
}
```

### 4.6. Communication Profile (JSONB Value Object)

```jsonc
{
  "version": 1,
  "channels": {
    "order_confirmed": { "type": "email", "contact_id": "..." },
    "production_started": { "type": "email", "contact_id": "..." },
    "production_completed": { "type": "email", "contact_id": "..." },
    "ready_for_dispatch": { "type": "phone", "contact_id": "..." },
    "dispatched": { "type": "sms", "phone": "+905551234567" },
    "delivered": { "type": "email", "contact_id": "..." }
  }
}
```

### 4.7. Contact Entity (`customer_contacts`)

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | `char(26)` | ✅ | PK |
| `customer_id` | `char(26)` | ✅ | FK → customers, CASCADE |
| `name` | `varchar(255)` | ✅ | Full name |
| `title` | `varchar(100)` | ❌ | Job title |
| `role` | `varchar(100)` | ❌ | Functional role (sales, logistics, quality) |
| `phone` | `varchar(50)` | ❌ | |
| `whatsapp` | `varchar(50)` | ❌ | |
| `email` | `varchar(255)` | ❌ | |
| `is_primary` | `boolean` | ✅ | Default false — one primary per customer |
| `is_active` | `boolean` | ✅ | Default true |
| `created_at` | `timestamptz` | ✅ | |
| `updated_at` | `timestamptz` | ✅ | |
| `created_by` | `char(26)` | ❌ | null |
| `updated_by` | `char(26)` | ❌ | null |
| `deleted_at` | `timestamptz` | ❌ | null |
| `deleted_by` | `char(26)` | ❌ | null |

> **RLS Note:** Child tables do NOT carry a denormalized `tenant_id`. Tenant isolation is enforced at the DB level via RLS subquery policies (see §12.2). At the application level, `tenant_id` is injected into the WHERE clause of every query.

### 4.8. Delivery Point Entity (`delivery_points`)

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | `char(26)` | ✅ | PK |
| `customer_id` | `char(26)` | ✅ | FK → customers, CASCADE |
| `name` | `varchar(255)` | ✅ | Location name |
| `address` | `text` | ❌ | |
| `city` | `varchar(100)` | ❌ | |
| `district` | `varchar(100)` | ❌ | |
| `latitude` | `numeric(10,7)` | ❌ | |
| `longitude` | `numeric(10,7)` | ❌ | |
| `phone` | `varchar(50)` | ❌ | On-site contact number |
| `note` | `text` | ❌ | Delivery instructions |
| `is_default` | `boolean` | ✅ | Default false |
| `is_active` | `boolean` | ✅ | Default true |
| `scheduling_profile` | `jsonb` | ❌ | See §4.9 |
| `created_at` | `timestamptz` | ✅ | |
| `updated_at` | `timestamptz` | ✅ | |
| `created_by` | `char(26)` | ❌ | null |
| `updated_by` | `char(26)` | ❌ | null |
| `deleted_at` | `timestamptz` | ❌ | null |
| `deleted_by` | `char(26)` | ❌ | null |

### 4.9. Delivery Point Scheduling Profile (JSONB Value Object on `delivery_points`)

```jsonc
{
  "preferred_window_start": "09:00",
  "preferred_window_end": "12:00",
  "vehicle_restrictions": ["flatbed", "curtain_sider"],
  "max_vehicle_length_m": 16.5,
  "max_vehicle_height_m": 4.0,
  "has_dock_leveler": true,
  "unloading_equipment": ["forklift"],
  "notification_lead_minutes": 120,
  "access_notes": "Ring bell at gate B"
}
```

### 4.10. Glass Catalog Entity (`customer_glass_catalog`)

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | `char(26)` | ✅ | PK |
| `customer_id` | `char(26)` | ✅ | FK → customers, CASCADE |
| `product_code` | `varchar(100)` | ✅ | Customer's internal product reference |
| `glass_type` | `varchar(100)` | ✅ | e.g., "4mm Clear Float" |
| `thickness_mm` | `numeric(5,1)` | ❌ | |
| `default_width_mm` | `numeric(8,1)` | ❌ | |
| `default_height_mm` | `numeric(8,1)` | ❌ | |
| `default_pieces` | `numeric(8,0)` | ❌ | |
| `is_active` | `boolean` | ✅ | Default true |
| `notes` | `text` | ❌ | |
| `created_at` | `timestamptz` | ✅ | |
| `updated_at` | `timestamptz` | ✅ | |
| `created_by` | `char(26)` | ❌ | null |
| `updated_by` | `char(26)` | ❌ | null |
| `deleted_at` | `timestamptz` | ❌ | null |
| `deleted_by` | `char(26)` | ❌ | null |

### 4.11. Special Instruction Entity (`customer_instructions`)

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | `char(26)` | ✅ | PK |
| `customer_id` | `char(26)` | ✅ | FK → customers, CASCADE |
| `title` | `varchar(255)` | ✅ | Short summary |
| `instruction` | `text` | ✅ | Full instruction text |
| `is_standing` | `boolean` | ✅ | Default false — applies to all orders |
| `sort_order` | `integer` | ✅ | Default 0 |
| `is_active` | `boolean` | ✅ | Default true |
| `created_at` | `timestamptz` | ✅ | |
| `updated_at` | `timestamptz` | ✅ | |
| `created_by` | `char(26)` | ❌ | null |
| `updated_by` | `char(26)` | ❌ | null |
| `deleted_at` | `timestamptz` | ❌ | null |
| `deleted_by` | `char(26)` | ❌ | null |

### 4.12. Instruction Condition Entity (`customer_instruction_conditions`)

The `condition_expression` free-text field has been replaced with a structured relational model. Each special instruction can have zero or more conditions. All conditions for an instruction are combined with AND logic.

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | `char(26)` | ✅ | PK |
| `instruction_id` | `char(26)` | ✅ | FK → customer_instructions, CASCADE |
| `field` | `varchar(100)` | ✅ | Field name: `quantity`, `width`, `height`, `thickness`, `pieces` |
| `operator` | `varchar(20)` | ✅ | `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `between` |
| `value` | `text` | ✅ | Single value or comma-separated for `in`/`between` |
| `value_type` | `varchar(20)` | ✅ | `number`, `string`, `boolean` |
| `logical_group` | `integer` | ✅ | Default 0. Groups conditions for OR logic within the same group number. |
| `sort_order` | `integer` | ✅ | Default 0 |
| `created_at` | `timestamptz` | ✅ | |
| `updated_at` | `timestamptz` | ✅ | |
| `created_by` | `char(26)` | ❌ | null |
| `updated_by` | `char(26)` | ❌ | null |
| `deleted_at` | `timestamptz` | ❌ | null |
| `deleted_by` | `char(26)` | ❌ | null |

**How conditions work:**
- All conditions within the same `logical_group` are combined with **OR**.
- Different `logical_group` values are combined with **AND**.
- If no conditions exist, the instruction applies unconditionally.

**Example:** An instruction that applies only when quantity > 100 AND (width > 2000 OR thickness = 19):

| instruction_id | field | operator | value | logical_group |
|---|---|---|---|---|
| ... | quantity | gt | 100 | 0 |
| ... | width | gt | 2000 | 1 |
| ... | thickness | eq | 19 | 1 |

**SQL:** `WHERE (quantity > 100) AND (width > 2000 OR thickness = 19)`

---

## 5. Relationship Map

```
┌──────────────────────────────────────────────────────────────┐
│                        TENANT                                 │
│  id: char(26) PK                                              │
└──────────────────┬───────────────────────────────────────────┘
                   │ 1
                   │
                   │ *
┌──────────────────▼───────────────────────────────────────────┐
│                        CUSTOMER                               │
│  id: char(26) PK                     Aggregate Root          │
│  tenant_id: char(26) FK → tenants                             │
│  factory_id: char(26) FK → factories (optional)               │
│  quality_profile: jsonb          Value Object                 │
│  production_preferences: jsonb   Value Object                 │
│  label_spec: jsonb               Value Object                 │
│  packaging_profile: jsonb        Value Object                 │
│  communication_profile: jsonb    Value Object                 │
│  operational_block: jsonb        Value Object                 │
└──┬──────────┬──────────┬──────────┬──────────┬───────────────┘
   │ 1        │ 1        │ 1        │ 1        │ 1
   │ *        │ *        │ *        │ *        │ *
┌──▼──────┐┌─▼────────┐┌─▼──────────┐┌─▼──────────┐┌─▼──────────┐
│CONTACTS ││ DELIVERY ││ GLASS      ││INSTRUCTIONS││ (FUTURE)   │
│(entity) ││ POINTS   ││ CATALOG    ││(entity)    ││ PRODUCTION │
│         ││ (entity) ││ (entity)   ││            ││ HISTORY    │
└─────────┘└──────────┘└────────────┘└────────────┘└────────────┘

                  CUSTOMER → ORDER
                  ─────────────────
                  Customer 1 ──── * Orders
                  (FK: order.customer_id)

                  ORDER → PRODUCTION
                  ───────────────────
                  Order 1 ──── * Production Orders
                  (FK: production_order.order_id)

                  CUSTOMER → DISPATCH
                  ────────────────────
                  Customer 1 ──── * Dispatches
                  (FK: dispatch.customer_id)
```

### 5.1. Foreign Key Standards

Every foreign key in the Customer aggregate must follow consistent naming, index, and delete/update behavior. The standard for all **owned** (composition) relationships is `ON DELETE CASCADE | ON UPDATE CASCADE`.

---

#### FK Matrix

| Parent Table | Child Table | FK Column | ON DELETE | ON UPDATE | Required Index | Constraint Name |
|---|---|---|---|---|---|---|
| `customers` | `customer_contacts` | `customer_id` | `CASCADE` | `CASCADE` | `idx_contacts_customer` | `fk_contacts_customer` |
| `customers` | `delivery_points` | `customer_id` | `CASCADE` | `CASCADE` | `idx_delivery_points_customer` | `fk_delivery_points_customer` |
| `customers` | `customer_glass_catalog` | `customer_id` | `CASCADE` | `CASCADE` | `idx_glass_catalog_customer` | `fk_glass_catalog_customer` |
| `customers` | `customer_instructions` | `customer_id` | `CASCADE` | `CASCADE` | `idx_instructions_customer` | `fk_instructions_customer` |
| `customer_instructions` | `customer_instruction_conditions` | `instruction_id` | `CASCADE` | `CASCADE` | `idx_conditions_instruction` | `fk_conditions_instruction` |

---

#### Why `ON DELETE CASCADE`?

All child entities in the Customer aggregate are **composition relationships** (ownership), not **association relationships** (reference). This means:

| Property | Composition (Owned) |
|---|---|
| **Lifespan** | Child cannot exist without its parent Customer. |
| **Identity** | Child identity is scoped to its parent. Contact #5 only makes sense as "Contact of Customer X". |
| **Cascading delete** | If the parent is deleted, children must be deleted too. There is no valid state where a `customer_contact` row exists for a non-existent `customers` row. |
| **Database enforcement** | `ON DELETE CASCADE` enforces this at the DB level. Even if application code has a bug, the database guarantees referential integrity. |

**Important note on soft delete:** The `ON DELETE CASCADE` FK constraint applies to **hard** `DELETE` statements only. Soft delete (setting `deleted_at`) is executed at the Service Layer (see §13.5) and does NOT trigger the FK cascade. The cascade is a safety net — it guarantees that if a record is ever hard-deleted (e.g., by a DBA during maintenance), orphaned child rows cannot exist.

---

#### Why `ON UPDATE CASCADE`?

GlassOS uses ULID (`char(26)`) as primary keys. Since ULIDs are immutable (never updated after creation), `ON UPDATE CASCADE` is technically never triggered. It is included for:

1. **Defensive design** — if future requirements change the PK strategy, the cascade behavior is already correct.
2. **PostgreSQL standard practice** — `CASCADE` on both delete and update is the idiomatic default for owned entities.

---

#### Index Convention

Every FK column MUST have a corresponding B-tree index. Without an index:

| Operation | Without Index | With Index |
|---|---|---|
| `SELECT ... WHERE customer_id = $1` | Sequential scan | Index scan (fast) |
| `DELETE FROM customers WHERE id = $1` (cascade) | Sequential scan on child | Index scan (fast) |
| `UPDATE child SET ... WHERE customer_id = $1` | Sequential scan | Index scan (fast) |

All indexes follow the naming convention: `idx_{child_table}_{fk_column_without_id_suffix}`.

---

#### Constraint Name Convention

All FK constraints follow the naming convention: `fk_{child_table}_{referenced_table}`.

Example DDL:

```sql
ALTER TABLE customer_contacts
  ADD CONSTRAINT fk_contacts_customer
  FOREIGN KEY (customer_id) REFERENCES customers (id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

CREATE INDEX idx_contacts_customer ON customer_contacts (customer_id);
```

---

---

## 6. Inheritance & Override Strategy

### 6.1. The Override Chain

Customer-level defaults flow down to Orders, then to Order Lines, then to Production. Each level can override the level above.

```
CUSTOMER (defaults)
    │
    ▼
ORDER (customer-scoped overrides per order)
    │
    ▼
ORDER LINE (order-scoped overrides per line item)
    │
    ▼
PRODUCTION ORDER (execution-time overrides)
```

### 6.2. Override Rules

| Concept | Customer Level | Order Level | Order Line Level | Production Level |
|---|---|---|---|---|
| **Edgework** | ✅ Default | ✅ Override | ✅ Override | ❌ Execution only |
| **Tempering** | ✅ Default | ✅ Override | ✅ Override | ❌ Execution only |
| **Spacer type** | ✅ Default | ✅ Override | ✅ Override | ❌ Execution only |
| **Gas fill** | ✅ Default | ✅ Override | ✅ Override | ❌ Execution only |
| **Tolerance class** | ✅ Default | ✅ Override | ✅ Override | ❌ Execution only |
| **Label spec** | ✅ Default | ✅ Override | ❌ Line inherits order | ❌ |
| **Packaging** | ✅ Default | ✅ Override | ❌ Line inherits order | ❌ |
| **Quality profile** | ✅ Default | ❌ Not overrideable | ❌ | ✅ QC decision |
| **Block status** | ✅ Set here | ❌ Blocked = no new orders | ❌ | ❌ Existing OK |
| **Delivery point** | ✅ Defined here | ✅ Selected per order | ❌ | ❌ |

### 6.3. Implementation Pattern

The Order aggregate will store its own `production_preferences` as a JSONB column. On order creation, the system **copies** the customer's defaults into the order's JSONB field, creating a snapshot that can be edited independently of the customer master.

```
Order.production_preferences = copy(Customer.production_preferences)
Order.label_spec = copy(Customer.label_spec)
Order.packaging_profile = copy(Customer.packaging_profile)
```

**This is a copy-on-write pattern, NOT a live reference.** Once the order is created, changing the customer master does not change existing orders. This preserves order history integrity.

### 6.4. Why Copy-on-Write Instead of Live Reference?

| Consideration | Live Reference | Copy-on-Write (✅) |
|---|---|---|
| Customer changes affect existing orders | ❌ Breaks history | ✅ Orders unchanged |
| Order-level override complexity | High (merge logic) | Low (edit copy) |
| Historical reproducibility | ❌ Impossible | ✅ Complete |
| Data duplication | Minimal | Acceptable (JSONB) |
| Implementation complexity | High | Low |

---

## 7. ERP Synchronization Strategy

### 7.1. Direction

```
ERP ──► GlassOS
```

Customer identity flows from ERP to GlassOS. GlassOS **never writes** customer identity back to ERP.

### 7.2. Sync Methods

| Method | Trigger | Use Case |
|---|---|---|
| **CSV Import** | Manual (UI button) | Initial load, one-off corrections |
| **API Poll** | Scheduled (cron) | Periodic sync from ERP API |
| **Manual Entry** | User creates in GlassOS | When no ERP integration exists |

### 7.3. Sync Rules

| Rule | Behaviour |
|---|---|
| **New customer in ERP** | Created in GlassOS with defaults. MES fields remain empty until configured. |
| **Customer code changed in ERP** | GlassOS updates `customer_code` if no orders reference the old code. If orders exist, old code is preserved and new code is updated — orders retain historical code. |
| **Customer deactivated in ERP** | `erp_status` set to `passive`. GlassOS does NOT auto-block. Operational block is a manual decision. |
| **Customer deleted in ERP** | GlassOS sets `erp_status` to `passive`. Does not soft-delete (MES records reference this customer). |
| **Conflicts** | ERP wins for identity fields. MES fields are GlassOS-authoritative. |

### 7.4. MES Fields (Never Touched by ERP)

The following fields are GlassOS-only. The ERP sync process must never write to them:

- `quality_profile`
- `production_preferences`
- `label_spec`
- `packaging_profile`
- `communication_profile`
- `operational_block`
- `is_active` (MES operational flag)
- All owned entities: contacts, delivery points, glass catalog, instructions

---

## 8. Domain Events

All domain events follow a strict contract: every event is published **after transaction commit** (never inside the transaction). This ensures consumers never receive events for state that was rolled back.

### 8.1. Customer Aggregate Events

Events that affect the aggregate root directly. Published by `CustomerService`.

---

#### `customer.created`

| Property | Value |
|---|---|
| **Trigger** | A new customer record is created (via ERP import, API poll, or manual entry). |
| **Transactional Boundary** | After `INSERT INTO customers` commits. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, customerCode, name, tenantId, source: 'erp_csv' | 'erp_api' | 'manual' }` |
| **Consumers** | Audit log, analytics pipeline, ERP sync status tracker. |

---

#### `customer.updated`

| Property | Value |
|---|---|
| **Trigger** | Any identity field on the customer root row is updated (name, short_name, tax_number, phone, email, address, city, country). |
| **Transactional Boundary** | After `UPDATE customers SET ...` commits. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, changedFields: string[], updatedBy }` |
| **Consumers** | Audit log, search index refresh (if using external search). |

---

#### `customer.deleted`

| Property | Value |
|---|---|
| **Trigger** | `CustomerService.softDeleteCustomer()` completes the cascade transaction (see §13.5). All child entities are also soft-deleted. |
| **Transactional Boundary** | Entire cascade in one transaction. |
| **Publish Timing** | After cascade transaction commits. |
| **Payload** | `{ customerId, customerCode, name, deletedBy }` |
| **Consumers** | Order service (validate no new orders), Dispatch (exclude from planning), Search index (remove), Audit log. |

---

#### `customer.restored`

| Property | Value |
|---|---|
| **Trigger** | `CustomerService.restoreCustomer()` completes the restore cascade transaction. All child entities are also restored. |
| **Transactional Boundary** | Entire restore cascade in one transaction. |
| **Publish Timing** | After restore transaction commits. |
| **Payload** | `{ customerId, customerCode, name }` |
| **Consumers** | Search index (re-add), Audit log. |

---

#### `customer.operational_blocked`

| Property | Value |
|---|---|
| **Trigger** | `CustomerService.blockCustomer()` sets `operational_block` JSONB with block details. |
| **Transactional Boundary** | Single `UPDATE customers SET operational_block = ...` commit. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, customerCode, blockReason, blockCategory, blockedBy }` |
| **Consumers** | Order service (reject new orders for this customer), Dispatch (flag existing dispatches for review), Notification service (email/SMS to internal ops). |

---

#### `customer.operational_released`

| Property | Value |
|---|---|
| **Trigger** | `CustomerService.releaseCustomerBlock()` sets `operational_block.block_released_at` and `block_released_by`. |
| **Transactional Boundary** | Single `UPDATE customers SET operational_block = ...` commit. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, customerCode, releasedBy }` |
| **Consumers** | Order service (allow new orders), Dispatch (resume planning), Notification service. |

---

#### `customer.preferences_updated`

| Property | Value |
|---|---|
| **Trigger** | `production_preferences` JSONB column is updated. |
| **Transactional Boundary** | Single `UPDATE customers SET production_preferences = ...` commit. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, changedPrefs: string[], updatedBy }` |
| **Consumers** | Order service (future orders only — copy-on-write means existing orders are unaffected). |

---

#### `customer.quality_profile_updated`

| Property | Value |
|---|---|
| **Trigger** | `quality_profile` JSONB column is updated. |
| **Transactional Boundary** | Single `UPDATE customers SET quality_profile = ...` commit. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, updatedBy }` |
| **Consumers** | QC engine (re-evaluate active inspections only if policy dictates), Order service (future orders). |

---

#### `customer.packaging_profile_updated`

| Property | Value |
|---|---|
| **Trigger** | `packaging_profile` JSONB column is updated. |
| **Transactional Boundary** | Single `UPDATE customers SET packaging_profile = ...` commit. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, updatedBy }` |
| **Consumers** | Order service (future orders), Dispatch (packaging preparation). |

---

#### `customer.label_spec_updated`

| Property | Value |
|---|---|
| **Trigger** | `label_spec` JSONB column is updated. |
| **Transactional Boundary** | Single `UPDATE customers SET label_spec = ...` commit. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, updatedBy }` |
| **Consumers** | Label printing service (future labels only — existing printed labels are not regenerated), Order service (future orders). |

---

#### `customer.communication_profile_updated`

| Property | Value |
|---|---|
| **Trigger** | `communication_profile` JSONB column is updated. |
| **Transactional Boundary** | Single `UPDATE customers SET communication_profile = ...` commit. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, channelCount: number, updatedBy }` |
| **Consumers** | Notification routing engine (reload channel config for this customer). |

---

### 8.2. Customer Contact Events

Published by `CustomerService` for child entity mutations on `customer_contacts`.

---

#### `customer.contact.created`

| Property | Value |
|---|---|
| **Trigger** | New contact row inserted. |
| **Transactional Boundary** | Single `INSERT INTO customer_contacts` commit. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, contactId, name, isPrimary, role }` |
| **Consumers** | Audit log, UI cache invalidation. |

---

#### `customer.contact.updated`

| Property | Value |
|---|---|
| **Trigger** | Contact row updated (name, title, role, phone, email, is_active). |
| **Transactional Boundary** | Single `UPDATE customer_contacts SET ...` commit. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, contactId, changedFields: string[], updatedBy }` |
| **Consumers** | Audit log, Communication profile validation (if `is_active` changed to false and contact is referenced). |

---

#### `customer.contact.deleted`

| Property | Value |
|---|---|
| **Trigger** | Contact soft-deleted. Service also removes this contact from `communication_profile` channels (see Invariant 5, §2.3). |
| **Transactional Boundary** | Soft delete + communication profile cleanup in one transaction. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, contactId, name, deletedBy }` |
| **Consumers** | Audit log, Search index, UI cache invalidation. |

---

#### `customer.contact.primary_changed`

| Property | Value |
|---|---|
| **Trigger** | `CustomerService.setPrimaryContact()` — old primary unset and new primary set in one transaction. |
| **Transactional Boundary** | Two `UPDATE customer_contacts` statements in one transaction. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, previousPrimaryContactId, newPrimaryContactId, changedBy }` |
| **Consumers** | Communication profile (update default channel recipient if no explicit channel config exists), Audit log. |

---

### 8.3. Customer Delivery Point Events

---

#### `customer.delivery_point.created`

| Property | Value |
|---|---|
| **Trigger** | New delivery point row inserted. |
| **Transactional Boundary** | Single `INSERT INTO delivery_points` commit. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, deliveryPointId, name, isDefault, city }` |
| **Consumers** | Audit log, Dispatch (new delivery option available). |

---

#### `customer.delivery_point.updated`

| Property | Value |
|---|---|
| **Trigger** | Delivery point row updated (name, address, city, scheduling_profile, is_active). |
| **Transactional Boundary** | Single `UPDATE delivery_points SET ...` commit. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, deliveryPointId, changedFields: string[], updatedBy }` |
| **Consumers** | Dispatch (refresh delivery constraints if scheduling_profile changed), Audit log. |

---

#### `customer.delivery_point.deleted`

| Property | Value |
|---|---|
| **Trigger** | Delivery point soft-deleted. |
| **Transactional Boundary** | Single `UPDATE delivery_points SET deleted_at = ...` commit. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, deliveryPointId, name, deletedBy }` |
| **Consumers** | Dispatch (remove from selector for new orders), Audit log. |

---

#### `customer.delivery_point.default_changed`

| Property | Value |
|---|---|
| **Trigger** | `CustomerService.setDefaultDeliveryPoint()` — old default unset and new default set in one transaction. |
| **Transactional Boundary** | Two `UPDATE delivery_points` statements in one transaction. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, previousDefaultId, newDefaultId, changedBy }` |
| **Consumers** | Order service (pre-select new default for future orders), Audit log. |

---

### 8.4. Customer Glass Catalog Events

---

#### `customer.glass_catalog.created`

| Property | Value |
|---|---|
| **Trigger** | New catalog entry inserted. |
| **Transactional Boundary** | Single `INSERT INTO customer_glass_catalog` commit. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, catalogId, productCode, glassType, createdBy }` |
| **Consumers** | Audit log, Order creation (new template available in quick-select). |

---

#### `customer.glass_catalog.updated`

| Property | Value |
|---|---|
| **Trigger** | Catalog entry updated. |
| **Transactional Boundary** | Single `UPDATE customer_glass_catalog SET ...` commit. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, catalogId, productCode, changedFields: string[], updatedBy }` |
| **Consumers** | Audit log. |

---

#### `customer.glass_catalog.deleted`

| Property | Value |
|---|---|
| **Trigger** | Catalog entry soft-deleted. |
| **Transactional Boundary** | Single `UPDATE customer_glass_catalog SET deleted_at = ...` commit. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, catalogId, productCode, deletedBy }` |
| **Consumers** | Audit log, Order creation (template removed from quick-select). |

---

### 8.5. Customer Instruction Events

---

#### `customer.instruction.created`

| Property | Value |
|---|---|
| **Trigger** | New instruction inserted with its conditions. |
| **Transactional Boundary** | `INSERT INTO customer_instructions` + `INSERT INTO customer_instruction_conditions` in one transaction. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, instructionId, title, isStanding, conditionCount, createdBy }` |
| **Consumers** | Audit log, Production planning (standing instructions auto-apply to new orders). |

---

#### `customer.instruction.updated`

| Property | Value |
|---|---|
| **Trigger** | Instruction row updated (title, instruction text, is_standing, is_active). |
| **Transactional Boundary** | Single `UPDATE customer_instructions SET ...` commit. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, instructionId, changedFields: string[], updatedBy }` |
| **Consumers** | Audit log. |

---

#### `customer.instruction.deleted`

| Property | Value |
|---|---|
| **Trigger** | Instruction soft-deleted. Conditions are also soft-deleted (cascade via Service Layer). |
| **Transactional Boundary** | Soft delete of instruction + all its conditions in one transaction. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, instructionId, title, deletedBy }` |
| **Consumers** | Audit log, Production planning (standing instruction removed from auto-apply). |

---

#### `customer.instruction.condition_changed`

| Property | Value |
|---|---|
| **Trigger** | One or more conditions for an instruction are created, updated, or deleted. |
| **Transactional Boundary** | All condition mutations for the same instruction in one transaction. |
| **Publish Timing** | After transaction commit. |
| **Payload** | `{ customerId, instructionId, action: 'added' | 'updated' | 'removed', conditionCount, changedBy }` |
| **Consumers** | Audit log, Production planning (re-evaluate which orders match this instruction). |

---

### 8.6. Event Publishing Contract

```typescript
interface CustomerDomainEvent {
  eventId: string;          // ULID — unique per event occurrence
  eventType: string;        // e.g., 'customer.created'
  tenantId: string;         // char(26) — for tenant-scoped consumers
  customerId: string;       // char(26) — aggregate identity
  timestamp: string;        // ISO 8601 — when the event occurred
  payload: Record<string, unknown>;
}
```

All events:
- Are **immutable** after publishing.
- Carry `tenantId` for tenant-scoped consumers.
- Are published **asynchronously** after the DB transaction commits.
- Follow the naming convention `{aggregate}.{entity?}.{action}`.
- Use past-tense verbs (`created`, `updated`, `deleted`, `changed`) to express that the state change has already occurred.

---

## 9. Extension Points (Future Modules)

### 9.1. Customer Pricing Module (Future)

**Not in sprint scope** — listed as extension point.

The Glass Catalog entity is designed so that a future `customer_pricing` module can add:
- Price per m² per product code
- Volume discount tiers
- Currency preference
- Price valid-from/valid-to dates

No schema changes needed — pricing would be a new aggregate referencing `customer_id` and `customer_glass_catalog.id`.

### 9.2. Customer Contract Module (Future)

**Not in sprint scope** — listed as extension point.

The `operational_block` JSONB can naturally extend to include:
- Contract-based blocking (e.g., "contract expired")
- Auto-release rules (e.g., "release after new contract uploaded")

No schema changes needed — the JSONB structure can evolve.

### 9.3. Customer Portal (Future)

**Not in sprint scope** — listed as extension point.

The communication profile's channel definitions naturally support a `portal` channel type. The special instructions entity provides structured data that a customer portal can surface.

### 9.4. Customer Analytics (Future)

**Not in sprint scope** — listed as extension point.

| Analytics Concept | Data Source |
|---|---|
| Order frequency | `orders` table |
| Quality pass rate | `quality_control` records, filtered by customer |
| On-time delivery % | `dispatch` records |
| Average production cycle time | `production_events` time calculations |
| Glass catalog usage | Order lines referencing catalog entries |

These are query-time aggregations. No schema changes needed.

### 9.5. Customer-Specific Machine Parameters (Future)

**Not in sprint scope** — listed as extension point.

Some customers require specific machine settings (e.g., temper furnace temperature profiles for specific glass types). The `production_preferences` JSONB can naturally extend with a `machine_params` object:

```jsonc
{
  "machine_params": {
    "temper_furnace_temp_c": 680,
    "temper_furnace_speed_mm_s": 120,
    "cooling_rate": "standard"
  }
}
```

## 10. Query Strategy

The Customer aggregate contains 6 JSONB value objects and 4 owned entity types. Loading the full aggregate in every context would be inefficient. GlassOS uses **projection-based loading**: each context loads only the data it needs.

### 10.1. Customer List

Used by: `/customers` page

**Loaded columns:**
`id, customer_code, name, short_name, is_active, operational_block, city, country, created_at, updated_at`

**Joins:** None (single-table query)

**Sorting:** `name` ASC, `customer_code` ASC

**Filtering:** `tenant_id`, `is_active`, search query

### 10.2. Customer Search

Used by: Search-as-you-type in CustomerSelector, global command palette

**Loaded columns:**
`id, customer_code, name, short_name, is_active`

**Joins:** None

**Strategy:** `WHERE (name ILIKE '%query%' OR customer_code ILIKE '%query%') AND is_active = true AND deleted_at IS NULL`

**Limit:** 20 results maximum

### 10.3. Customer Selector

Used by: Goods Receipt, Material dialogs, Order creation, Dispatch

**Loaded columns:**
`id, customer_code, name, short_name`

**Joins:** None

**Filtering:** `is_active = true AND deleted_at IS NULL`

### 10.4. Customer Detail — General Tab

Used by: Customer detail page, General tab

**Loaded columns:**
All identity columns, `is_active`, `operational_block`, all audit columns

**Joins:** Contacts (id, name, title, role, phone, email, is_primary, is_active), Delivery Points (id, name, city, district, is_default, is_active)

### 10.5. Customer Detail — Production Tab

Used by: Customer detail page, Production tab (Quality, Production Prefs, Labels, Packaging)

**Loaded columns:**
`id, customer_code, name, quality_profile, production_preferences, label_spec, packaging_profile`

**Joins:** None (JSONB columns on root)

### 10.6. Customer Detail — Communication Tab

Used by: Customer detail page, Communication tab

**Loaded columns:**
`id, customer_code, name, communication_profile`

**Joins:** None

### 10.7. Order Entry

Used by: Order creation / edit

**Loaded columns:**
Customer identity + `production_preferences`, `label_spec`, `packaging_profile` (for copy-on-write)
Contacts (for communication)
Delivery Points (for delivery selection)

**Joins:** Contacts (`is_active = true`), Delivery Points (`is_active = true`)

### 10.8. Dispatch

Used by: Dispatch planning

**Loaded columns:**
`id, customer_code, name, operational_block` (to verify not blocked)
Delivery Points (for destination selection) with `scheduling_profile`

**Joins:** Delivery Points (`is_active = true AND deleted_at IS NULL`)

### 10.9. Production

Used by: Production screens at machine level

**Loaded columns:**
None — production uses Order-level copy, not Customer-level data

**Joins:** None

---

## 11. Search & Index Strategy

### 11.1. Search Columns

Customer search operates on the following columns:
- `customer_code` — exact prefix match and partial match
- `name` — partial match across words
- `short_name` — partial match
- `phone` — partial digit match
- `tax_number` — partial match

### 11.2. Index Strategy

PostgreSQL provides three complementary search approaches:

| Approach | Index Type | Use Case |
|---|---|---|
| **B-tree** | Standard B-tree on `(tenant_id, name)` | Exact match, prefix search, sorting |
| **Trigram (pg_trgm)** | GiST index | Fuzzy partial match on name, code, phone — any position |
| **Full Text Search (tsvector)** | GIN index | Language-aware ranked search across multiple fields |

### 11.3. PostgreSQL Full Text Search (FTS)

For high-quality search with Turkish language support, use a generated `tsvector` column:

```sql
-- Add generated tsvector column
ALTER TABLE customers ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('turkish', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(customer_code, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(short_name, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(phone, '')), 'D')
  ) STORED;

-- GIN index on the tsvector
CREATE INDEX idx_customers_fts ON customers USING gin (search_vector);
```

**Weight priority:** `name` (A, highest) > `customer_code` (B) > `short_name` (C) > `phone` (D, lowest).

**FTS query pattern:**

```sql
SELECT id, customer_code, name, short_name,
       ts_rank(search_vector, query) AS rank
FROM customers,
     plainto_tsquery('turkish', 'cam fabrikasi') AS query
WHERE tenant_id = $1
  AND search_vector @@ query
  AND deleted_at IS NULL
ORDER BY rank DESC
LIMIT 20;
```

**When to use FTS vs ILIKE:**

| Scenario | Use |
|---|---|
| Single search box ("Google-style") | FTS with `plainto_tsquery` |
| Type-ahead / autocomplete | ILIKE with trigram index |
| Exact customer code lookup | B-tree `= $1` |
| Phone number lookup (last 4 digits) | ILIKE `%1234` with trigram |
| Multi-word query with ranking | FTS with `ts_rank` |

### 11.4. Trigram Search

Install the `pg_trgm` extension and create trigram indexes for fast ILIKE queries:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_customers_trgm_name ON customers USING gin (name gin_trgm_ops);
CREATE INDEX idx_customers_trgm_code ON customers USING gin (customer_code gin_trgm_ops);
CREATE INDEX idx_customers_trgm_phone ON customers USING gin (phone gin_trgm_ops);
```

### 11.5. ILIKE Search Query Pattern

```typescript
async function searchCustomers(
  tenantId: string,
  query: string,
  activeOnly: boolean = true,
  limit: number = 20
): Promise<CustomerSearchResult[]> {
  const conditions = [eq(customers.tenant_id, tenantId)];

  if (query) {
    conditions.push(
      or(
        ilike(customers.name, `%${query}%`),
        ilike(customers.customer_code, `%${query}%`),
        ilike(customers.short_name, `%${query}%`),
        ilike(customers.phone, `%${query}%`)
      )
    );
  }

  if (activeOnly) {
    conditions.push(eq(customers.is_active, true));
  }

  conditions.push(isNull(customers.deleted_at));

  return db
    .select({
      id: customers.id,
      customerCode: customers.customer_code,
      name: customers.name,
      shortName: customers.short_name,
    })
    .from(customers)
    .where(and(...conditions))
    .orderBy(customers.name)
    .limit(limit);
}
```

### 11.6. Specialized Lookups

| Lookup | Strategy | Index |
|---|---|---|
| **Exact customer code** | `customer_code = $1` | Unique B-tree |
| **Prefix code search** | `customer_code ILIKE 'ABC%'` | B-tree (prefix) |
| **Fuzzy name search** | `name ILIKE '%term%'` | Trigram GiST |
| **Phone search** | `phone ILIKE '%last4'` | Trigram GiST |
| **Active customers list** | `is_active = true` | Partial B-tree |

---

## 12. Row Level Security (RLS) Strategy

### 12.1. Tenant Isolation

Every table in the Customer aggregate is tenant-isolated. The `customers` table stores `tenant_id` directly. Child entities are isolated via a subquery through their parent customer. RLS policies ensure that users from Tenant A can never see or modify records belonging to Tenant B.

### 12.2. RLS Policies

```sql
-- customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY customer_tenant_isolation ON customers
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id')::char(26));

-- customer_contacts table
ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contact_tenant_isolation ON customer_contacts
  FOR ALL
  USING (
    customer_id IN (
      SELECT id FROM customers
      WHERE tenant_id = current_setting('app.tenant_id')::char(26)
    )
  );

-- delivery_points table
ALTER TABLE delivery_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY delivery_point_tenant_isolation ON delivery_points
  FOR ALL
  USING (
    customer_id IN (
      SELECT id FROM customers
      WHERE tenant_id = current_setting('app.tenant_id')::char(26)
    )
  );

-- customer_glass_catalog table
ALTER TABLE customer_glass_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY glass_catalog_tenant_isolation ON customer_glass_catalog
  FOR ALL
  USING (
    customer_id IN (
      SELECT id FROM customers
      WHERE tenant_id = current_setting('app.tenant_id')::char(26)
    )
  );

-- customer_instructions table
ALTER TABLE customer_instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY instruction_tenant_isolation ON customer_instructions
  FOR ALL
  USING (
    customer_id IN (
      SELECT id FROM customers
      WHERE tenant_id = current_setting('app.tenant_id')::char(26)
    )
  );

-- customer_instruction_conditions table
ALTER TABLE customer_instruction_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY instruction_conditions_tenant_isolation ON customer_instruction_conditions
  FOR ALL
  USING (
    instruction_id IN (
      SELECT ci.id FROM customer_instructions ci
      JOIN customers c ON c.id = ci.customer_id
      WHERE c.tenant_id = current_setting('app.tenant_id')::char(26)
    )
  );
```

### 12.3. Policy Design Decisions

| Decision | Rationale |
|---|---|
| **Subquery pattern** instead of denormalized `tenant_id` on children | Single source of truth for tenant membership is the `customers` table. Avoids data duplication. |
| **FOR ALL** instead of separate SELECT/INSERT/UPDATE/DELETE policies | Simplifies management. All operations use the same isolation check. |
| **`current_setting('app.tenant_id')`** instead of JWT claim | Compatible with both application-level and connection-pooler usage. Set once per request. |

### 12.4. Factory-Level Isolation

For multi-factory tenants, an additional policy layer can filter by `factory_id`:

```sql
CREATE POLICY customer_factory_isolation ON customers
  FOR ALL
  USING (
    factory_id = current_setting('app.factory_id')::char(26)
    OR factory_id IS NULL
  );
```

This allows tenant-level visibility (all factories see shared customers) while restricting factory-specific customers.

---

## 13. Soft Delete Strategy

### 13.1. Rationale

Customers are never hard-deleted. Production orders, dispatches, and quality records reference customers. Hard deletion would break historical integrity. Soft deletion preserves referential integrity while allowing recovery.

### 13.2. Soft Delete Columns

Every table in the Customer aggregate includes:

| Column | Type | Description |
|---|---|---|
| `deleted_at` | `timestamptz` | NULL = active. Non-NULL = deleted. Set on delete operation. |
| `deleted_by` | `char(26)` | FK → users.id. Who performed the delete. NULL for system operations. |

### 13.3. Partial Indexes

Every table with soft delete MUST have a partial index to optimize active-record queries:

```sql
CREATE INDEX idx_customers_active ON customers (tenant_id, is_active)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_customer_contacts_active ON customer_contacts (customer_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_delivery_points_active ON delivery_points (customer_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_glass_catalog_active ON customer_glass_catalog (customer_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_customer_instructions_active ON customer_instructions (customer_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_instruction_conditions_active ON customer_instruction_conditions (instruction_id)
  WHERE deleted_at IS NULL;
```

These partial indexes are critical for performance:
- The majority of queries filter `WHERE deleted_at IS NULL`
- Without partial indexes, the index includes deleted records, wasting space and slowing scans
- With partial indexes, only active records are indexed — smaller, faster, more cache-efficient

### 13.4. Repository Behavior

```typescript
class CustomerRepository extends BaseRepository<typeof customers> {
  async findActive(options: FindOptions) {
    return this.findMany({
      where: and(
        isNull(customers.deleted_at),
        eq(customers.tenant_id, options.tenantId),
        ...options.filters
      ),
    });
  }

  async softDelete(id: string, deletedBy: string) {
    return this.update(id, {
      deleted_at: new Date(),
      deleted_by: deletedBy,
    });
  }

  async restore(id: string) {
    return this.update(id, {
      deleted_at: null,
      deleted_by: null,
    });
  }
}
```

### 13.5. Cascade Execution Layer

Soft delete cascade is handled at the **Service Layer** (`CustomerService`), NOT at the DB level (no `ON DELETE CASCADE` trigger for soft delete) and NOT via domain events.

**Why Service Layer:**

| Layer | Suitability |
|---|---|
| **Database triggers** | ❌ Bypasses ULID generation for `deleted_by`. No access to `current_setting('app.user_id')`. |
| **Repository** | ❌ Single-table scope. Cascade requires cross-repository orchestration. |
| **Domain events** | ❌ Fire-and-forget. Cascade must be synchronous and transactional. A failed child delete must roll back the entire operation. |
| **Service Layer ✅** | Orchestrates the full cascade inside a single DB transaction. Sets `deleted_at`/`deleted_by` on every entity. Emits events after commit. |

**Implementation pattern:**

```typescript
class CustomerService {
  async softDeleteCustomer(customerId: string, deletedBy: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Root
      await tx.update(customers).set({
        deleted_at: new Date(),
        deleted_by: deletedBy,
      }).where(eq(customers.id, customerId));

      // Children
      await tx.update(customerContacts).set({
        deleted_at: new Date(),
        deleted_by: deletedBy,
      }).where(eq(customerContacts.customer_id, customerId));

      await tx.update(deliveryPoints).set({
        deleted_at: new Date(),
        deleted_by: deletedBy,
      }).where(eq(deliveryPoints.customer_id, customerId));

      await tx.update(customerGlassCatalog).set({
        deleted_at: new Date(),
        deleted_by: deletedBy,
      }).where(eq(customerGlassCatalog.customer_id, customerId));

      // Instructions cascade: find all instruction IDs, then delete conditions
      const instructionIds = await tx
        .update(customerInstructions)
        .set({ deleted_at: new Date(), deleted_by: deletedBy })
        .where(eq(customerInstructions.customer_id, customerId))
        .returning({ id: customerInstructions.id });

      if (instructionIds.length > 0) {
        await tx.update(instructionConditions).set({
          deleted_at: new Date(),
          deleted_by: deletedBy,
        }).where(inArray(
          instructionConditions.instruction_id,
          instructionIds.map(i => i.id)
        ));
      }
    });

    // Events emitted AFTER successful commit
    await this.events.publish('customer.deleted', { customerId, deletedBy });
  }

  async restoreCustomer(customerId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Root
      await tx.update(customers).set({
        deleted_at: null,
        deleted_by: null,
      }).where(eq(customers.id, customerId));

      // Children — same pattern, setting deleted_at/delete_by to NULL
      await tx.update(customerContacts).set({
        deleted_at: null, deleted_by: null,
      }).where(eq(customerContacts.customer_id, customerId));

      await tx.update(deliveryPoints).set({
        deleted_at: null, deleted_by: null,
      }).where(eq(deliveryPoints.customer_id, customerId));

      await tx.update(customerGlassCatalog).set({
        deleted_at: null, deleted_by: null,
      }).where(eq(customerGlassCatalog.customer_id, customerId));

      await tx.update(customerInstructions).set({
        deleted_at: null, deleted_by: null,
      }).where(eq(customerInstructions.customer_id, customerId));

      await tx.update(instructionConditions).set({
        deleted_at: null, deleted_by: null,
      }).where(inArray(
        instructionConditions.instruction_id,
        tx.select({ id: customerInstructions.id })
          .from(customerInstructions)
          .where(eq(customerInstructions.customer_id, customerId))
      ));
    });

    await this.events.publish('customer.restored', { customerId });
  }
}
```

### 13.6. Cascade Behavior

When a Customer is soft-deleted:
- Child entities (contacts, delivery points, glass catalog, instructions, conditions) are also soft-deleted
- Existing production orders referencing the customer are NOT affected
- No new orders can be created for the deleted customer
- The customer is excluded from all search and list results
- Operational block is independent — a deleted customer may or may not have been blocked

### 13.7. Restore Behavior

When a Customer is restored:
- All child entities are restored (`deleted_at` set to NULL)
- The operational block is preserved but can be released separately
- The customer reappears in search and list results
- The `is_active` flag is NOT automatically set — restore and reactivation are separate operations

---

## 14. Implementation Sprint Plan

### Phase 1 — Database & Infrastructure

| # | Task | Scope |
|---|---|---|
| 1.1 | Add JSONB columns to `customers` table | `quality_profile`, `production_preferences`, `label_spec`, `packaging_profile`, `communication_profile`, `operational_block` |
| 1.2 | Add `version` column to `customers` | Optimistic locking (INTEGER DEFAULT 1) |
| 1.3 | Consolidate delivery point tables | Drop `customer_delivery_points`, keep `delivery_points`, add `scheduling_profile` JSONB |
| 1.4 | Add audit columns to `delivery_points` | `created_by`, `updated_by`, `deleted_at`, `deleted_by` |
| 1.5 | Add audit columns to `customer_contacts` | `created_by`, `updated_by`, `deleted_at`, `deleted_by` |
| 1.6 | Create `customer_glass_catalog` table | Entity table with FK → customers (includes audit columns) |
| 1.7 | Create `customer_instructions` table | Entity table with FK → customers (includes audit columns) |
| 1.8 | Create `customer_instruction_conditions` table | Structured conditions replacing `condition_expression` |
| 1.9 | Add tenant-scoped unique index on `(tenant_id, customer_code)` | Data integrity |
| 1.10 | Add partial indexes `WHERE deleted_at IS NULL` | All 6 tables for soft-delete performance |
| 1.11 | Add trigram indexes for search | `name`, `customer_code`, `phone` via `pg_trgm` |
| 1.12 | Add `search_vector` tsvector generated column + GIN index | PostgreSQL Full Text Search (Turkish dictionary) |
| 1.13 | Add partial unique index for primary contact | `idx_customer_primary_contact` — one primary per customer |
| 1.14 | Add partial unique index for default delivery point | `idx_customer_default_delivery` — one default per customer |
| 1.15 | Standardize all FK constraints | Explicit `ON DELETE CASCADE | ON UPDATE CASCADE` with named constraints per §5.1 |
| 1.16 | Enable RLS and create isolation policies | All 6 tables |

### Phase 2 — Server Actions

| # | Task | Scope |
|---|---|---|
| 2.1 | Extract customer actions from `identity.ts` to `customers.ts` | Match material/machine pattern |
| 2.2 | Add `customers:read` / `customers:write` permissions | `authorization.ts` |
| 2.3 | Add Zod schemas for all new entities and value objects | `packages/types` |
| 2.4 | Build `updateCustomerQualityProfileAction`, `updateCustomerPreferencesAction`, etc. | Per-value-object update actions |
| 2.5 | Build CRUD for glass catalog and instructions | Entity actions |
| 2.6 | Build `blockCustomerAction` / `releaseCustomerBlockAction` | Operational block |
| 2.7 | Build contact and delivery point edit/delete actions | Complete CRUD parity |

### Phase 3 — UI Modernization

| # | Task | Scope |
|---|---|---|
| 3.1 | Move pages to `(dashboard)/customers/` layout | Sidebar + breadcrumbs |
| 3.2 | Replace list page with `DataGrid` + pagination/search | Match material/machine pattern |
| 3.3 | Build customer detail page with `Tabs` | General, Quality, Production, Labels, Packaging, Contacts, Delivery, Catalog, Instructions |
| 3.4 | Build edit dialogs for each value object | QualityProfileDialog, PreferencesDialog, etc. |
| 3.5 | Add contact and delivery point management UI | Full CRUD with Dialog |
| 3.6 | Add glass catalog management UI | DataGrid + Dialog |
| 3.7 | Add special instructions management UI | DataGrid + Dialog |
| 3.8 | Add i18n keys for all customer UI | EN + TR |

### Phase 4 — Integration

| # | Task | Scope |
|---|---|---|
| 4.1 | Connect CustomerSelector to `isActive` filter | Only show active customers |
| 4.2 | Add operational block indicator to customer list | Badge in DataGrid |
| 4.3 | Add customer profile summary to order creation | Pre-fill production preferences, label spec, packaging |
| 4.4 | Wire domain events to event publisher | customer.created, customer.updated, customer.operational_blocked |

---

## Appendix A: Migration from Current to Target Schema

```sql
-- Phase 1: Add JSONB columns + version to customers
ALTER TABLE customers ADD COLUMN quality_profile jsonb;
ALTER TABLE customers ADD COLUMN production_preferences jsonb;
ALTER TABLE customers ADD COLUMN label_spec jsonb;
ALTER TABLE customers ADD COLUMN packaging_profile jsonb;
ALTER TABLE customers ADD COLUMN communication_profile jsonb;
ALTER TABLE customers ADD COLUMN operational_block jsonb;
ALTER TABLE customers ADD COLUMN version integer NOT NULL DEFAULT 1;

-- Phase 2: Add scheduling + audit columns to delivery_points
ALTER TABLE delivery_points ADD COLUMN scheduling_profile jsonb;
ALTER TABLE delivery_points ADD COLUMN created_by char(26);
ALTER TABLE delivery_points ADD COLUMN updated_by char(26);
ALTER TABLE delivery_points ADD COLUMN deleted_at timestamptz;
ALTER TABLE delivery_points ADD COLUMN deleted_by char(26);

-- Phase 3: Rename active to is_active in delivery_points
ALTER TABLE delivery_points RENAME COLUMN active TO is_active;

-- Phase 4: Add audit columns to customer_contacts
ALTER TABLE customer_contacts ADD COLUMN created_by char(26);
ALTER TABLE customer_contacts ADD COLUMN updated_by char(26);
ALTER TABLE customer_contacts ADD COLUMN deleted_at timestamptz;
ALTER TABLE customer_contacts ADD COLUMN deleted_by char(26);

-- Phase 5: New tables
CREATE TABLE customer_glass_catalog (
  id char(26) PRIMARY KEY,
  customer_id char(26) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_code varchar(100) NOT NULL,
  glass_type varchar(100) NOT NULL,
  thickness_mm numeric(5,1),
  default_width_mm numeric(8,1),
  default_height_mm numeric(8,1),
  default_pieces numeric(8,0),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL,
  created_by char(26),
  updated_by char(26),
  deleted_at timestamptz,
  deleted_by char(26)
);

CREATE TABLE customer_instructions (
  id char(26) PRIMARY KEY,
  customer_id char(26) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  instruction text NOT NULL,
  is_standing boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL,
  created_by char(26),
  updated_by char(26),
  deleted_at timestamptz,
  deleted_by char(26)
);

CREATE TABLE customer_instruction_conditions (
  id char(26) PRIMARY KEY,
  instruction_id char(26) NOT NULL REFERENCES customer_instructions(id) ON DELETE CASCADE,
  field varchar(100) NOT NULL,
  operator varchar(20) NOT NULL,
  value text NOT NULL,
  value_type varchar(20) NOT NULL DEFAULT 'number',
  logical_group integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL,
  created_by char(26),
  updated_by char(26),
  deleted_at timestamptz,
  deleted_by char(26)
);

-- Phase 6: Standard indexes
CREATE UNIQUE INDEX idx_customers_tenant_code ON customers (tenant_id, customer_code);
CREATE INDEX idx_customers_tenant_active ON customers (tenant_id, is_active);
CREATE INDEX idx_customers_tenant_name ON customers (tenant_id, name);
CREATE INDEX idx_customer_contacts_customer ON customer_contacts (customer_id);
CREATE INDEX idx_delivery_points_customer ON delivery_points (customer_id);
CREATE INDEX idx_glass_catalog_customer ON customer_glass_catalog (customer_id);
CREATE INDEX idx_customer_instructions_customer ON customer_instructions (customer_id);
CREATE INDEX idx_instruction_conditions_instruction ON customer_instruction_conditions (instruction_id);

-- Phase 7: Partial indexes for soft delete (WHERE deleted_at IS NULL)
CREATE INDEX idx_customers_active ON customers (tenant_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_customer_contacts_active ON customer_contacts (customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_delivery_points_active ON delivery_points (customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_glass_catalog_active ON customer_glass_catalog (customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customer_instructions_active ON customer_instructions (customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_instruction_conditions_active ON customer_instruction_conditions (instruction_id) WHERE deleted_at IS NULL;

-- Phase 8: Trigram indexes for search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_customers_trgm_name ON customers USING gin (name gin_trgm_ops);
CREATE INDEX idx_customers_trgm_code ON customers USING gin (customer_code gin_trgm_ops);
CREATE INDEX idx_customers_trgm_phone ON customers USING gin (phone gin_trgm_ops);

-- Phase 9: Partial unique indexes for aggregate invariants
-- Ensures only one primary contact per customer (among non-deleted)
CREATE UNIQUE INDEX idx_customer_primary_contact
  ON customer_contacts (customer_id)
  WHERE is_primary = true AND deleted_at IS NULL;

-- Ensures only one default delivery point per customer (among non-deleted)
CREATE UNIQUE INDEX idx_customer_default_delivery
  ON delivery_points (customer_id)
  WHERE is_default = true AND deleted_at IS NULL;

-- Phase 10: Full Text Search vector
ALTER TABLE customers ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('turkish', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(customer_code, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(short_name, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(phone, '')), 'D')
  ) STORED;
CREATE INDEX idx_customers_fts ON customers USING gin (search_vector);
```

---

## Appendix B: Data Migration from `customer_delivery_points` to `delivery_points`

If data exists in `customer_delivery_points`, a one-time migration is needed:

```sql
INSERT INTO delivery_points (id, customer_id, name, address, city, latitude, longitude, is_default, is_active, created_at, updated_at)
SELECT id, customer_id, name, address, city, gps_lat, gps_lng, is_default, true, created_at, updated_at
FROM customer_delivery_points
ON CONFLICT (id) DO NOTHING;
```
