# Numbering Architecture — GlassOS Numbering Strategy

> **Version:** 1.0
> **Date:** 2026-07-16
> **Sprint:** 2.4.1 — Database Schema (Identity & Organization)
> **Status:** Approved Architecture Standard

---

## 1. Vision & Strategy

GlassOS requires unique, human-readable, and sequential business identifiers for key aggregates (Orders, Order Lines, Production Execution, Reworks, Inventory items, Lots, and Barcodes).

To ensure clean isolation, horizontal scalability, and multi-tenant safety:

- **No shared sequences:** All business numbering sequences are scoped per tenant (and optionally per factory).
- **Format uniformity:** Prefix-based string templates containing Year, Month, Factory Code, and a zero-padded counter are used.
- **Independence from DB PK:** System primary keys (ULID) are strictly separate from business numbering codes.

---

## 2. Standardized Formats

| Entity             | Code Prefix | Schema Field                                  | Format Template                   | Example               |
| ------------------ | ----------- | --------------------------------------------- | --------------------------------- | --------------------- |
| **Order**          | `ORD`       | `orders.order_number`                         | `ORD-{YYYY}-{FACTORY_CODE}-{SEQ}` | `ORD-2026-F1-0001245` |
| **Production**     | `PRD`       | `production_orders.production_reference_code` | `PRD-{YYYY}-{FACTORY_CODE}-{SEQ}` | `PRD-2026-F1-0001245` |
| **Rework Order**   | `RWK`       | `rework_orders.rework_number`                 | `RWK-{YYYY}-{FACTORY_CODE}-{SEQ}` | `RWK-2026-F1-0000412` |
| **Inventory Item** | `INV`       | `inventory_items.inventory_code`              | `INV-{CAT_CODE}-{SEQ}`            | `INV-FLT-00042`       |
| **Inventory Lot**  | `LOT`       | `inventory_lots.lot_number`                   | `LOT-{YYYY}{MM}-{SEQ}`            | `LOT-202607-00012`    |
| **Barcode / QR**   | `BC`        | `inventory_barcodes.barcode`                  | `BC-{LOT_NUM}-{SEQ}`              | `BC-202607-00012-001` |

---

## 3. Format Definitions & Rules

### 3.1. Order Numbers (`orders.order_number`)

- **Format:** `ORD-{YYYY}-{FACTORY_CODE}-{SEQ_7_DIGIT}`
- **Examples:** `ORD-2026-F1-0001245`
- **Reset Policy:** Never resets. Continues incrementally per tenant to ensure continuous sequencing over fiscal years.
- **Factory Scope:** Scoped per factory within a tenant to prevent conflicts when multiple factories operate concurrently.

### 3.2. Production Reference Codes (`production_orders.production_reference_code`)

- **Format:** `PRD-{YYYY}-{FACTORY_CODE}-{SEQ}`
- **Examples:** `PRD-2026-F1-0001245`
- **Purpose:** Optional operational reference used for station routing, operator labels, and audit traceability. It is not a permanent per-piece identity and does not replace the order-line counters.
- **Rework Connection:** Rework lineage is preserved through the parent order line and revision counter, not through a permanent piece identity.

### 3.3. Rework Orders (`rework_orders.rework_number`)

- **Format:** `RWK-{YYYY}-{FACTORY_CODE}-{SEQ_7_DIGIT}`
- **Examples:** `RWK-2026-F1-0000412`
- **Reset Policy:** Annual reset on January 1st at 00:00:00 UTC.

### 3.4. Inventory Items (`inventory_items.inventory_code`)

- **Format:** `INV-{CATEGORY_CODE_3_CHAR}-{SEQ_5_DIGIT}`
- **Examples:** `INV-FLT-00042` (Float Glass), `INV-SPC-00012` (Spacer)
- **Rules:** Static, globally set per tenant. Never resets.

### 3.5. Inventory Lots (`inventory_lots.lot_number`)

- **Format:** `LOT-{YYYY}{MM}-{SEQ_5_DIGIT}`
- **Examples:** `LOT-202607-00012`
- **Reset Policy:** Monthly reset to track batch arrivals and age easily.

### 3.6. Barcode Numbers (`inventory_barcodes.barcode`)

- **Format:** `BC-{LOT_NUM}-{SEQ_3_DIGIT}`
- **Examples:** `BC-202607-00012-001`
- **Rules:** Sequential index per plate within a specific lot.

---

## 4. Multi-Factory & Tenant Prefix Segregation

- Each factory is assigned an alphanumeric code (`factory_code`, e.g., `F1`, `F2`, `IST`, `ANK`) at creation.
- Numbering generators prepend this code to guarantee that no two factories under the same tenant generate matching order or rework numbers.

---

## 5. Implementation Strategy (Planned for Sprint 2.4.3+)

- Number sequences will be generated using a dedicated database sequence table or a distributed lock generator in the Service Layer.
- **No Gap Guarantee Policy:** Since business numbers are critical for auditor checkups, generators will use database transactions to block number skips.
