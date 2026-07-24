# Stock Settings — Documentation

> **Sprint 2.10.3 — Material Master Completion & Master Data Standardization**

This document reviews all 9 toggle switches in the **Stock Settings** section of the Material dialog.

---

## 1. Stock Tracking

| Field | Value |
|---|---|
| **DB column** | `materials_master.stock_tracking` |
| **Type** | `boolean`, default `true` |
| **Used in modules** | Inventory, Goods Receipt |
| **Current behavior** | Enables inventory quantity tracking for this material. When `true`, the material appears in stock queries and inventory reports. |
| **Missing implementation** | No dedicated stock transaction ledger exists yet. Quantity is tracked indirectly. |
| **Recommended behavior** | When enabled, material movements (receipts, issues, transfers) create stock ledger entries. When disabled, the material is treated as a non-stocked item. |

---

## 2. Inventory Item

| Field | Value |
|---|---|
| **DB column** | `materials_master.inventory_item` |
| **Type** | `boolean`, default `true` |
| **Used in modules** | Inventory |
| **Current behavior** | Marks the material as countable in physical inventory counts. |
| **Missing implementation** | No physical inventory module exists yet. |
| **Recommended behavior** | When enabled, the material should appear in physical inventory count sheets. When disabled, it is excluded from counts. |

---

## 3. Purchasable

| Field | Value |
|---|---|
| **DB column** | `materials_master.purchasable` |
| **Type** | `boolean`, default `false` |
| **Used in modules** | Goods Receipt |
| **Current behavior** | Controls whether the material can appear in purchase receipt workflows. |
| **Missing implementation** | No purchase order module exists yet. |
| **Recommended behavior** | When enabled, the material is selectable in purchase orders and goods receipt. When disabled, it cannot be procured externally. |

---

## 4. Sellable

| Field | Value |
|---|---|
| **DB column** | `materials_master.sellable` |
| **Type** | `boolean`, default `false` |
| **Used in modules** | Dispatch |
| **Current behavior** | Field exists but not actively used in current dispatch flows. |
| **Missing implementation** | No sales order or dispatch integration. |
| **Recommended behavior** | When enabled, the material can be added to sales orders and dispatch notes. When disabled, it is for internal use only. |

---

## 5. Manufacturable

| Field | Value |
|---|---|
| **DB column** | `materials_master.manufacturable` |
| **Type** | `boolean`, default `false` |
| **Used in modules** | Production, Recipes |
| **Current behavior** | Controls whether the material can be produced internally via recipes. |
| **Missing implementation** | No production order / manufacturing execution integration yet. |
| **Recommended behavior** | When enabled, the material can be a production output. When disabled, it is purchased or consumed only. |

---

## 6. Quality Inspection Required

| Field | Value |
|---|---|
| **DB column** | `materials_master.quality_inspection_required` |
| **Type** | `boolean`, default `false` |
| **Used in modules** | Goods Receipt (quality status: accepted / conditional / rejected) |
| **Current behavior** | In Goods Receipt, material receipt items have quality status. This flag could enforce mandatory inspection. Currently used for reference. |
| **Missing implementation** | No mandatory inspection gate or quality module enforcement. |
| **Recommended behavior** | When enabled, goods receipt requires a quality decision before stock is updated. |

---

## 7. Batch Tracking

| Field | Value |
|---|---|
| **DB column** | `materials_master.batch_tracking` |
| **Type** | `boolean`, default `false` |
| **Used in modules** | None yet |
| **Current behavior** | Flag exists but no batch tracking logic is implemented. |
| **Missing implementation** | No batch master table, no batch number assignment, no batch traceability. |
| **Recommended behavior** | When enabled, each receipt requires a batch/lot number. Stock movements track by batch. Full forward/backward traceability. |

---

## 8. Serial Tracking

| Field | Value |
|---|---|
| **DB column** | `materials_master.serial_tracking` |
| **Type** | `boolean`, default `false` |
| **Used in modules** | None yet |
| **Current behavior** | Flag exists but no serial tracking logic is implemented. |
| **Missing implementation** | No serial number master table, no serial assignment. |
| **Recommended behavior** | When enabled, each unit receives a unique serial number. Track individual unit history through its lifecycle. |

---

## 9. Expiration Tracking

| Field | Value |
|---|---|
| **DB column** | `materials_master.expiration_tracking` |
| **Type** | `boolean`, default `false` |
| **Used in modules** | None yet |
| **Current behavior** | Flag exists but no expiration tracking logic is implemented. |
| **Missing implementation** | No expiry date capture on receipt, no shelf-life alerts, no FEFO logic. |
| **Recommended behavior** | When enabled, capture expiry date on receipt. Implement FEFO (First Expiry, First Out) picking logic. Alert before expiry. |

---

## Summary

| # | Setting | DB Column | Implemented | Missing |
|---|---|---|---|---|
| 1 | Stock Tracking | `stock_tracking` | ✅ Partial (flag only) | Stock ledger |
| 2 | Inventory Item | `inventory_item` | ✅ Partial (flag only) | Physical inventory |
| 3 | Purchasable | `purchasable` | ✅ Partial (flag only) | Purchase orders |
| 4 | Sellable | `sellable` | ✅ Partial (flag only) | Sales orders |
| 5 | Manufacturable | `manufacturable` | ✅ Partial (flag only) | Production orders |
| 6 | Quality Inspection | `quality_inspection_required` | ✅ Partial (flag only) | Mandatory gate |
| 7 | Batch Tracking | `batch_tracking` | ❌ Flag only | Full batch system |
| 8 | Serial Tracking | `serial_tracking` | ❌ Flag only | Full serial system |
| 9 | Expiration Tracking | `expiration_tracking` | ❌ Flag only | Expiry/FEFO system |

All 9 switches are stored in the `materials_master` table. They are toggled in the Material dialog under the **Stock Settings** section. Currently all function as feature flags — their downstream logic has not been implemented.
