# REWORK_ARCHITECTURE

## Status

- Architecture Status: Implemented
- Implementation Status: Service Layer (Sprint 2.5.1 + 2.5.2) — CuttingExecutionService + enhanced ReworkService + Merge Workflow
- Validation Status: 119 tests passing, TypeScript zero errors
- Last Updated: 2026-07-16

## 1. Rework Definition

Rework, üretim hattında üretilen parçaların veya ürünlerin kalite kontrolleri sırasında yeniden işlenmesi gereken durumları ifade eder.

- Yüzey arızası
- Ölçü kaçıklığı
- Delik hatası
- Kenar hatası
- Isıl işlem hatası
- Laminasyon sorunu

## 2. Rework Flow

Rework süreci aşağıdaki adımlarla modellenmelidir:

- Ürün kalite kontrol istasyonuna gelir.
- Kalite kontrol sonucu rework gerekli ise ürün geriye gönderilir.
- Rework işlemi ayrı bir iş emrine veya operasyon kuyruğuna alınır.
- Rework tamamlandığında ürün tekrar kalite kontrol sürecine gönderilir.

## 3. Breakage Tracking

Kırılma ve fire kaydı üretim verimliliği için ayrı izlenmelidir.

- Kırılan parça sayısı
- Fire nedeni
- Fire kategorisi
- Kırılma yeri
- Üretim satırı
- Operasyon
- Operatör
- Zaman damgası

## 4. Rework Items

Rework için bir iş öğesi, orijinal üretim satırı referansını ve tekrar işlenecek parçaları içermelidir.

- Orijinal sipariş satırı
- Rework nedeni
- Rework tipleri
- Rework bekleyen operasyon
- Tahmini tamamlanma süresi

## 5. Consequences

- Rework işlemleri ana üretim akışından ayrılmalıdır.
- Rework, iş emri tamamlanma algoritmasını etkilemelidir ancak tamamlanma durumu yalnızca tüm orijinal ve rework operasyonları tamamlandığında true olmalıdır.
- Fire ve rework verisi kalite raporlaması için kullanılmalıdır.
- Bu mimari, ileride rework maliyeti hesaplamasına ve operatör verimliliği analizine altyapı sağlar.

## 6. Factory Loss Clarification

- Broken glass is no longer customer property.
- It becomes factory fire inventory ownership and is recorded as factory loss.
- This loss is used for production traceability and rework initiation only; it is not a valuation or accounting event.
- Rework items may reference the original order line, but the broken piece is accounted as factory fire inventory.

## 7. Implemented Sprint 2.3.18 Domain Models

The implemented rework engine now supports:

- ReworkOrder
- ReworkReason
- ReworkStatus
- BreakageEvent
- BreakageLocation
- BreakageOwnership
- FireInventoryItem
- FireInventoryStatus
- ReworkRequest
- BreakageStatistics

## 8. Implemented Rules

- Every broken glass returns to Cutting for rework.
- Customer ownership ends immediately after breakage.
- Fire inventory belongs to the factory.
- Usable offcuts may remain in fire inventory and later return to normal inventory in later extensions.
- Production always restarts from Cutting.

## 9. Rework as Internal Production Order (Sprint 2.3.21)

Sprint 2.3.21 kapsamında rework mantığı, bir görev değil bir Internal Production Order olarak dokümante edilmiştir.

- Rework, ana üretim akışından bağımsız olarak yürütülen bir üretim emri mantığına sahiptir.
- Her rework order, yapılandırılabilir bir internal customer'a bağlıdır. Örnek müşteriler: Fire Depot, Scrap Depot, Factory Loss.
- Rework Order, aşağıdaki zorunlu ilişkileri taşır: Parent Order, Parent Order Line, Parent Customer, Breakage Event, Breakage Reason, Breakage Station, Breakage Machine, Breakage Operator, Breakage Shift, Breakage Date, Broken Quantity.
- Rework tamamlandığında, Parent Order Line üzerinde Missing Quantity azalır, Completed Quantity artar; üretim Parent Order'ın bekleyen mevcut istasyonundan devam eder; Rework Order tamamlanıp arşivlenir.
- Fire Depot, yeniden kullanılabilir glass ve scrap glass'i birlikte saklar; yeniden kullanılabilir glass ileride normal inventory'ye geri dönebilir.

## 10. Sprint 2.5.1 Implementation — Breakage-Driven Rework (SERVICE LAYER)

Sprint 2.5.1 kapsamında revork süreci servis katmanında implemente edilmiştir.

### 10.1 Breakage Registration Flow

```
CuttingExecutionService.registerBreakage(input)
  ┌─ Transaction (withTransaction)
  │  ├── 1. Validate: production order exists
  │  ├── 2. Validate: not completed rework order
  │  ├── 3. Validate: order line exists
  │  ├── 4. Validate: brokenQuantity <= completedQuantity
  │  ├── 5. Update order line counters (broken, missing)
  │  ├── 6. Update production order status → "broken"
  │  └── 7. Call ReworkService.createBreakageRework()
  │        ├── Validate: parent production exists
  │        ├── Validate: parent order line exists
  │        ├── Validate: parent order exists
  │        ├── Validate: not completed parent
  │        ├── Validate: no duplicate active rework
  │        ├── Create rework order (internalCustomer: "fire_depot")
  │        ├── Create rework production order (isRework: true, status: pending)
  │        ├── Emit ReworkCreatedEvent
  │        └── Emit FireDepotAssignedEvent
  └── Return breakageEvent + reworkResult
```

### 10.2 Fire Depot Ownership

- Every breakage automatically creates a rework order with `internalCustomer = "fire_depot"`
- Broken glass becomes factory property (Fire Depot inventory)
- Fire Depot items carry: orderLineId, productionOrderId, brokenQuantity, ownership (reusable | scrap | unknown)

### 10.3 Merge Preparation

- `ReworkService.getMergePreparation()` returns metadata for future rework merge:
  - parentOrderId, parentOrderLineId
  - targetStationId, targetProductionOrderId
  - originalCustomerId
  - isReadyToMerge flag (true when rework status = "completed")
- Actual merge logic is NOT implemented — only preparation metadata

### 10.4 Implemented Services

- **ReworkService** (enhanced):
  - `createReworkOrder()` — existing (unchanged)
  - `createBreakageRework()` — new: full breakage-to-rework workflow with Fire Depot
  - `getMergePreparation()` — new: rework merge metadata
  - Constructors: now requires `OrderLineRepository`, `OrderRepository`

- **CuttingExecutionService** (new):
  - Session lifecycle: create, start, complete, pause, resume, cancel
  - Work basket: add, remove, material verification, duplicate prevention
  - Breakage registration: registerBreakage()
  - Order line counters: getOrderLineCounters()

### 10.5 Validation Rules

| Rule | Description                                              | Error                                                 |
| ---- | -------------------------------------------------------- | ----------------------------------------------------- |
| B1   | Cannot register breakage for completed rework order      | `Cannot register breakage for completed rework order` |
| B2   | Cannot register breakage greater than completed quantity | `greater than completed quantity`                     |
| B3   | Cannot create duplicate active rework                    | `Active rework already exists`                        |
| B4   | Parent production order must exist                       | `Parent production order not found`                   |
| B5   | Parent order line must exist                             | `Order line not found`                                |
| B6   | Parent order must exist                                  | `Parent order not found`                              |
| B7   | Cannot rework completed parent production                | `Cannot create rework for completed production order` |

### 10.6 Domain Events

| Event                   | Emitted By             | Payload                                                                                  |
| ----------------------- | ---------------------- | ---------------------------------------------------------------------------------------- |
| BreakageRegisteredEvent | registerBreakage()     | breakageId, orderLineId, productionOrderId, brokenQuantity, reason, stationId, createdAt |
| ReworkCreatedEvent      | createBreakageRework() | reworkOrderId, parentProductionOrderId, reason, createdAt                                |
| FireDepotAssignedEvent  | createBreakageRework() | fireDepotItemId, orderLineId, productionOrderId, brokenQuantity, ownership, assignedAt   |

## 11. Sprint 2.5.2 Implementation — Merge Workflow (SERVICE LAYER)

Sprint 2.5.2 kapsamında rework merge işlemi servis katmanında implemente edilmiştir.

### 11.1 Merge Flow

```
ReworkService.mergeRework(reworkOrderId, completedQuantity?)
  ┌─ Transaction (withTransaction)
  │  ├── 1. Validate: rework exists
  │  ├── 2. Validate: parent production exists
  │  ├── 3. Validate: parent order line exists
  │  ├── 4. Validate: missing quantity > 0 (not already fully completed)
  │  ├── 5. Validate: no duplicate merge (reworkStatus ≠ "completed")
  │  ├── 6. Validate: parent production not cancelled
  │  ├── 7. Validate: parent order not completed (if parent order exists)
  │  ├── 8. Validate: no unresolved active rework for same parent
  │  ├── 9. Increase completedQuantity on order line (default: 1, capped at missing)
  │  ├── 10. Close rework production order (status → "completed")
  │  ├── 11. Mark rework as completed (reworkStatus → "completed")
  │  ├── 12. Emit ReworkMergedEvent
  │  └── Return { reworkOrder, events: [ReworkMergedEvent] }
```

### 11.2 Merge Validation Rules

| #   | Rule                                           | Error Message                          |
| --- | ---------------------------------------------- | -------------------------------------- |
| M1  | Rework order must exist                        | `rework order not found`               |
| M2  | Parent production order must exist             | `Parent production order not found`    |
| M3  | Parent order line must have a valid reference  | `Order line not found`                 |
| M4  | Missing quantity must be > 0                   | `Order line is fully completed`        |
| M5  | Rework must not already be completed           | `Rework is already completed`          |
| M6  | Parent production must not be cancelled        | `Parent production order is cancelled` |
| M7  | Parent order must not be completed (if exists) | `Parent order is completed`            |
| M8  | No unresolved active rework for same parent    | `Active rework`                        |

### 11.3 Counter Semantics

| Counter           | Merge Effect                                          | Rationale                         |
| ----------------- | ----------------------------------------------------- | --------------------------------- |
| completedQuantity | Increases by merge amount (capped at missing)         | Reworked pieces count as produced |
| brokenQuantity    | NEVER modified                                        | Immutable breakage history        |
| missing           | Implicitly decreases (missing = quantity - completed) | Fewer pieces remain to produce    |

### 11.4 Domain Events

| Event             | Emitted By    | Payload                                                                                     |
| ----------------- | ------------- | ------------------------------------------------------------------------------------------- |
| ReworkMergedEvent | mergeRework() | eventType, reworkOrderId, parentProductionOrderId, orderLineId, completedIncrease, mergedAt |

---

Rework domaini, persistence katmanına hazırlanırken aşağıdaki temel yapı ile ele alınmalıdır:

- Expected database entity: breakage_events / rework_requests / fire_inventory_items
- Primary identifier: breakageId / reworkRequestId / fireInventoryId
- Future foreign-key references: orderId, orderLineId, glassPieceId, stationId, machineId, operatorId, inventoryId
- Aggregate ownership: Rework aggregate belongs to Rework & Breakage domain
- Expected repository: reworkRepository
- Expected API resource: /rework
- Expected service ownership: ReworkManagementEngine / rework service
