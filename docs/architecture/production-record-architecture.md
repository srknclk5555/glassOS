# Production Record Architecture — Sprint 6.0.0

> **Technical Implementation Report**
> **Date:** 2026-07-19
> **Status:** Draft — Awaiting Approval
> **Sprint:** 6.0.0 — Production Record Foundation

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Existing Related Components](#2-existing-related-components)
3. [Dependency Map](#3-dependency-map)
4. [Recommended Production Record Aggregate](#4-recommended-production-record-aggregate)
5. [Folder & Repository Structure](#5-folder--repository-structure)
6. [Database Design Proposal](#6-database-design-proposal)
7. [Domain Events](#7-domain-events)
8. [Integration Points](#8-integration-points)
9. [Conflicts & Risks Identified](#9-conflicts--risks-identified)
10. [Migration Strategy](#10-migration-strategy)
11. [Safe Commit Plan](#11-safe-commit-plan)
12. [Completion Operation Configuration Design](#12-completion-operation-configuration-design)

---

## 1. Current Architecture Analysis

### 1.1. Production Orders (Aggregate Root #13)

**File:** `packages/db/src/schema/production.ts`

The `production_orders` table is the current central production aggregate. It tracks:

| Aspect | Current State |
|--------|---------------|
| **Dimensions** | Business (widthMm/heightMm) + Production (productionWidthMm/productionHeightMm) — ADR-2026-07-15-01 compliant |
| **Status** | `pending → in_progress → completed/broken/rework → cancelled` |
| **Operation** | `currentOperation` — free-text pointer to current station |
| **Rework** | `isRework`, `revisionNumber`, `parentId` (self-referencing) |
| **Lifecycle** | Created when Order is approved (1 per order line) |

**Critical observation:** `production_orders` is a **work-in-progress tracker**, NOT a historical record. When status becomes `completed`, the record stops being updated. There is no aggregate that captures the *final as-built summary* of a production run.

### 1.2. Production Events (Owned by Production Orders)

**Table:** `production_events`

Append-only log of station transitions. Event types: `started`, `paused`, `completed`, `broken`, `transferred`, `rework_created`.

Each event captures: `fromOperation`, `toOperation`, `stationId`, `machineId`, `operatorId`, `shiftId`, `eventAt`.

**Gap:** Events are granular and numerous. There is no summary-level object that aggregates all events for a production order into a cohesive "record."

### 1.3. Production Breakage Events (Owned by Production Orders)

**Table:** `production_breakage_events`

Breakage tracking with `breakageCategory`: `handling`, `machine_fault`, `quality`, `thermal`, `edge`, `other`.

**Gap:** Breakage is tracked per-event but never aggregated into a production order's total losses. No link to actual consumption impact.

### 1.4. Cutting Results (Separate Aggregate)

**Tables:** `cutting_results` + `cutting_result_items`

| Column | Purpose |
|--------|---------|
| `sheetsPlanned` | Theoretical sheet count |
| `sheetsUsed` | Operator-reported actual sheet count |
| `batchStatus` | `open` / `completed` |
| `cuttingDate` | When cutting happened |

**Junction (`cutting_result_items`):** Maps cutting results → production orders.

**Critical observation:** Cutting results are **batch-oriented**, not production-order-oriented. A single cutting batch can serve multiple production orders. The current schema links them via junction table but there is no entity that represents "this production order's cutting result."

### 1.5. Inventory (Aggregate Root #11)

**Tables:** `inventory_items`, `inventory_lots`, `inventory_barcodes`, `inventory_locations`

**Key finding:** Inventory currently has:
- `InventoryConsumptionEngine` in engine layer (theoretical consumption only)
- No actual consumption tracking linked to production
- `inventory_items.materialId` → FK to `materials` (old table, not `materials_master`) — ✅ **Çözüldü:** Sprint 2.10.0'da FK `materials_master.id`'ye yönlendirildi
- `inventory_items.productId` → FK to `products`
- Lot-level `unitCost` is immutable after creation

**Gap:** There is NO mechanism to consume inventory from production completion. No `production_consumption` or `inventory_movements` table exists. The architectural decision states "Inventory MUST NOT consume theoretical recipe quantities" — but there is no alternative mechanism yet.

### 1.6. Recipe (Aggregate Root #10)

**Tables:** `recipes`, `recipe_items`, `recipe_operations`, `recipe_rules`, `recipe_versions`

Recipe is **immutable engineering data** — it describes HOW IT SHOULD BE BUILT. Key attributes:
- `recipeCode`, `version`, `productType`
- `recipe_items`: materials with `consumptionBasis` (area/perimeter/piece/fixed/duration)
- `recipe_operations`: operation sequence
- `recipe_rules`: business rules (grinding_required, tempering_required, etc.)
- `recipe_versions`: immutable snapshots

**Issue identified:** `recipe_items.materialId` points to `materials` table, but ADR-2026-07-18-01 created `materials_master`. This FK will need reconciliation.

### 1.7. Factory Configuration (Aggregate Root #16)

**Tables:** `factory_configurations`, `grinding_profiles`, `trim_profiles`, `remnant_thresholds`

**Plus in `settings` table:** `trim_mm` (numeric — ADR violation per ADR-2026-07-15-02), `factoryConfiguration` (JSONB — redundant)

**5-way duplication identified:**
1. `factory_configurations` table (key-value per type)
2. `grinding_profiles` table (per-machine edges)
3. `trim_profiles` table (per-material edges)
4. `remnant_thresholds` table (per-factory thresholds)
5. `settings.factory_configuration` JSONB (redundant copy)
6. `settings.trim_mm` numeric (ADR violation — single value instead of 4 independent edges)

### 1.8. Services Layer (10 Services)

All services are wired in `apps/api/src/services.ts`:

```
OrderService → OrderRepo + OrderLineRepo + CustomerRepo + ProductionRepo
ProductionService → ProductionRepo
ProductionQueueService → ProductionQueueRepo + ProductionRepo + OrderRepo + OrderLineRepo
CuttingExecutionService → ProductionRepo + OrderLineRepo + OrderRepo + QueueService + ReworkService
ProductionTransferService → ProductionRepo + OrderLineRepo + OrderRepo
StationOperationService → ProductionRepo + OrderLineRepo + OrderRepo
QualityControlService → ProductionRepo + OrderLineRepo + OrderRepo + ReworkRepo
ReworkService → ReworkRepo + ProductionRepo + OrderLineRepo + OrderRepo
DispatchService → ProductionRepo + OrderLineRepo + OrderRepo + QualityControlService
CustomerService → CustomerRepo
```

**Key finding:** No `ProductionRecordService` exists. No service currently aggregates production results.

---

## 2. Existing Related Components

### 2.1. Engine Layer (`packages/engine/src/index.ts`)

| Engine Class | Relevance to Production Record |
|-------------|-------------------------------|
| `CuttingResultEngine` | Calculates per-order cutting results (trim/grinding/remnant/scrap) |
| `CuttingExecutionEngine` | Batch lifecycle management |
| `ProductionCalculationService` | Production dimension calculation |
| `RemnantDecisionService` | Remnant vs scrap classification |
| `ScrapDecisionService` | Scrap decision logic |
| `InventoryConsumptionEngine` | Theoretical consumption (NOT for production record) |
| `InventoryManagementEngine` | Inventory item/lot/barcode management |
| `RecipeManagementEngine` | **Disconnected** — 11 static methods, no DB wiring |

### 2.2. Domain Events (35+ Events)

Existing events relevant to Production Record:

| Event | Source | When |
|-------|--------|------|
| `CuttingCompletedEvent` | CuttingExecutionService | Cutting batch completes |
| `GrindingCompletedEvent` | StationOperationService | Grinding operation completes |
| `TemperCompletedEvent` | StationOperationService | Tempering completes |
| `InsulatingGlassCompletedEvent` | StationOperationService | IG assembly completes |
| `InspectionPassedEvent` | QualityControlService | QC passes |
| `InspectionFailedEvent` | QualityControlService | QC fails |
| `BreakageRegisteredEvent` | CuttingExecutionService | Breakage occurs |
| `FireDepotAssignedEvent` | ReworkService | Fire inventory assigned |
| `TransferCompletedEvent` | ProductionTransferService | Station transfer completes |
| `DeliveryCompletedEvent` | DispatchService | Final delivery |

**Gap:** No `ProductionRecordCreatedEvent`, `ProductionRecordCompletedEvent`, or `ConsumptionRecordedEvent`.

### 2.3. Current Data Flow

```
Order → OrderLine → ProductionOrder
                           ↓
                    Cutting (batch)
                           ↓
              ┌────────────┼────────────┐
              ↓            ↓            ↓
         Grinding     Temper        IG Assembly
              ↓            ↓            ↓
              └────────────┼────────────┘
                           ↓
                    Quality Control
                           ↓
                       Dispatch
                           ↓
                      Delivery
```

**At each step:** events are emitted, but NO aggregate accumulates the results.

---

## 3. Dependency Map

```
ProductionRecord
  │
  ├──► ProductionOrders (1:1 — every completed PO gets a PR)
  │     ├──► OrderLines (parent order reference)
  │     │     ├──► Products (productType determines completion operation)
  │     │     └──► Recipes (engineering baseline for variance)
  │     └──► ProductionEvents (station transition history)
  │
  ├──► CuttingResults (via cuttingResultItems junction)
  │     ├──► sheetsUsed (operator reported — ACTUAL)
  │     └──► sheetsPlanned (THEORETICAL)
  │
  ├──► ProductionBreakageEvents (loss events)
  │
  ├──► FactoryConfiguration (trim/grinding/remnant thresholds)
  │     ├──► grindingProfiles (per-machine edges)
  │     ├──► trimProfiles (per-material edges)
  │     └──► remnantThresholds (reuse boundaries)
  │
  ├──► Inventory (actual consumption tracking — NEW)
  │     ├──► inventoryLots (source lots consumed)
  │     └──► inventoryItems (finished goods created)
  │
  └──► Recipe (baseline for variance calculation)
        ├──► recipeItems (theoretical materials)
        ├──► recipeOperations (theoretical operations)
        └──► recipeVersions (snapshot at time of production)
```

### Key Dependency Rules

1. **ProductionRecord is created ONCE** when the Completion Operation finishes.
2. **ProductionRecord is READ-ONLY** after creation (append-only extensions for genealogy).
3. **ProductionRecord references Recipe version** (snapshot at time of production — do NOT re-read latest recipe).
4. **Cutting results are batch-level** — ProductionRecord needs its share of the batch.
5. **Inventory consumption is triggered BY** ProductionRecord creation, not by recipe calculation.
6. **Factory configuration is captured at time of completion** (snapshot, not live reference).

---

## 4. Recommended Production Record Aggregate

### 4.1. Aggregate Root

```
ProductionRecord
├── id: ULID
├── productionOrderId: FK → production_orders (1:1)
├── orderLineId: FK → order_lines
├── recipeId: FK → recipes
├── recipeVersion: integer (snapshot version used)
├── tenantId, factoryId (RLS)
│
├── Status & Lifecycle
│   ├── status: pending | in_progress | completed | archived
│   ├── completedAt: timestamp
│   └── completedBy: FK → users
│
├── Production Summary
│   ├── productType: varchar (temper | insulating_glass | laminated | float)
│   ├── businessWidthMm, businessHeightMm (immutable from order line)
│   ├── productionWidthMm, productionHeightMm (actual as-built)
│   ├── quantityRequested: integer
│   ├── quantityCompleted: integer
│   └── quantityBroken: integer
│
├── Actual Consumption (Value Object — embedded)
│   ├── totalSheetsUsed: integer (from cutting operator report)
│   ├── totalGlassAreaM2: numeric
│   ├── totalTrimLossM2: numeric
│   ├── totalGrindingLossM2: numeric
│   ├── totalScrapM2: numeric
│   ├── totalRemnantM2: numeric
│   └── consumptionDetails: JSONB (itemized per material)
│
├── Actual Cost (Value Object — embedded)
│   ├── rawMaterialCost: numeric
│   ├── trimLossCost: numeric
│   ├── grindingLossCost: numeric
│   ├── scrapCredit: numeric (negative — scrap revenue)
│   ├── energyCost: numeric
│   ├── laborCost: numeric
│   ├── overheadCost: numeric
│   └── totalCost: numeric (computed)
│
├── Fire Analysis (Value Object — embedded)
│   ├── fireClassSummary: JSONB (per fire class totals)
│   ├── yieldPercentage: numeric
│   ├── wastePercentage: numeric
│   └── fireDetails: JSONB
│
├── Variance Analysis (Value Object — embedded)
│   ├── recipeBaselineConsumption: JSONB (theoretical)
│   ├── actualConsumption: JSONB (actual)
│   ├── varianceQuantity: JSONB (actual - theoretical)
│   ├── variancePercentage: JSONB
│   └── varianceReason: text (operator notes)
│
├── Genealogy (Value Object — embedded)
│   ├── sourceLotIds: text[] (raw material lots consumed)
│   ├── parentProductionRecordId: ULID (for rework chain)
│   ├── childProductionRecordIds: ULID[] (rework results)
│   ├── cuttingResultId: FK → cutting_results
│   └── batchReferences: JSONB (furnace batch, IG batch, etc.)
│
└── Standard Audit
    ├── createdAt, updatedAt, createdBy, updatedBy
    └── deletedAt, deletedBy (soft delete — records are permanent)
```

### 4.2. Entities

| Entity | Type | Description |
|--------|------|-------------|
| `ProductionRecord` | Aggregate Root | The main record — one per completed production order |
| `ProductionRecordConsumption` | Value Object | Actual material consumption details |
| `ProductionRecordCost` | Value Object | Actual production cost breakdown |
| `ProductionRecordFireAnalysis` | Value Object | Fire classification breakdown |
| `ProductionRecordVariance` | Value Object | Variance from recipe baseline |
| `ProductionRecordGenealogy` | Value Object | Traceability data |
| `ProductionRecordOperationResult` | Entity (owned) | Per-operation result (cutting, grinding, tempering, etc.) |

### 4.3. ProductionRecordOperationResult (Owned Entity)

Each operation that was completed for this production order gets a result record:

```
ProductionRecordOperationResult
├── id: ULID
├── productionRecordId: FK → production_records
├── operationCode: varchar (cutting | grinding | tempering | ...)
├── sequence: integer (from recipe)
├── status: completed | skipped | failed
├── startedAt: timestamp
├── completedAt: timestamp
├── stationId: FK → stations
├── machineId: FK → machines
├── operatorId: FK → personnel
├── shiftId: FK → personnel_shifts
├── durationMinutes: integer (computed)
├── resultData: JSONB (operation-specific — grinding edges, furnace load, etc.)
├── qualityStatus: passed | failed | rework_required
└── notes: text
```

### 4.4. Lifecycle

```
Production Order completed
  │
  ▼
Trigger: Completion Operation finished
  │
  ▼
ProductionRecord created (status: pending)
  │
  ├── Collect cutting results → link via cuttingResultItems
  ├── Collect breakage events → aggregate losses
  ├── Collect operation results → build operation timeline
  ├── Calculate actual consumption → from operator-reported sheetsUsed
  ├── Calculate fire analysis → classify all losses
  ├── Calculate variance → compare actual vs recipe baseline
  ├── Calculate cost → use actual consumption + cost settings
  ├── Generate inventory movements → consume raw materials, create finished goods
  │
  ▼
ProductionRecord completed (status: completed)
  │
  ▼
Emit ProductionRecordCompletedEvent
  │
  ▼
Trigger downstream: analytics, genealogy, cost updates
```

### 4.5. Immutability Rules

1. **Once `status = completed`, the ProductionRecord is IMMUTABLE.**
2. No field can be updated after completion except `notes`.
3. Corrections require a **ProductionRecordAmendment** (new child record with reference to original).
4. Rework creates a **new ProductionRecord** linked via `genealogy.parentProductionRecordId`.

---

## 5. Folder & Repository Structure

### 5.1. Recommended Bounded Context

**Decision:** Production Record belongs in the **Production** bounded context.

**Rationale:**
- ProductionRecord is the *output* of the production process
- It shares the same tenant/factory scope as Production Orders
- It references production_orders, production_events, cutting_results — all in the Production context
- Recipe is engineering data (separate concern) — ProductionRecord *references* recipe but doesn't own it
- Inventory consumption is triggered by ProductionRecord but executed by Inventory service

### 5.2. Folder Structure

```
packages/db/src/
  schema/
    production-record.ts          ← NEW: ProductionRecord + OperationResult tables
    production.ts                 ← EXISTING: add FK reference to production_records
  repositories/
    production-record.repository.ts   ← NEW
  services/
    production-record.service.ts      ← NEW (orchestration)

packages/engine/src/
  production-record-engine.ts         ← NEW: calculation logic (consumption, cost, variance)

apps/api/src/
  controllers/
    production-record.controller.ts   ← NEW
  dto/
    production-record.dto.ts          ← NEW
  routes/
    production-record.router.ts       ← NEW
  services.ts                         ← MODIFY: wire new service
```

### 5.3. Recommended Repository Structure

```
ProductionRecordRepository
├── findById(id): ProductionRecord
├── findByProductionOrderId(productionOrderId): ProductionRecord
├── findByOrderLineId(orderLineId): ProductionRecord[]
├── findCompletedByDateRange(from, to): ProductionRecord[]
├── save(record): ProductionRecord (insert-only after completion)
├── softDelete(id): void
│
└── Operation Results (owned)
    ├── findOperationResults(recordId): ProductionRecordOperationResult[]
    ├── saveOperationResult(result): void
    └── saveOperationResults(results[]): void
```

### 5.4. Recommended Service Structure

```
ProductionRecordService
├── createFromCompletion(productionOrderId): ProductionRecord
│   Orchestrates the entire Production Finalization Pipeline:
│   1. Load production order + all related data
│   2. Engine: calculate consumption
│   3. Engine: calculate fire analysis
│   4. Engine: calculate variance
│   5. Engine: calculate cost
│   6. Create inventory movements (via InventoryService)
│   7. Persist ProductionRecord
│   8. Emit ProductionRecordCompletedEvent
│
├── findById(id): ProductionRecord
├── findByProductionOrder(id): ProductionRecord
├── findByOrderLine(id): ProductionRecord[]
├── getGenealogy(id): ProductionRecordGenealogy
└── getVarianceReport(id): VarianceReport
```

### 5.5. Service Dependency Graph

```
ProductionRecordService
  ├── ProductionRepository (load production order + events)
  ├── CuttingExecutionService (load cutting results)
  ├── InventoryService (record consumption)
  ├── ProductionRecordRepository (persist record)
  ├── ProductionRecordEngine (calculations)
  ├── RecipeManagementEngine (load recipe baseline)
  └── EventPublisher (emit events)
```

**Note:** ProductionRecordService should NOT depend on OrderService or CustomerService. It receives data through the ProductionRepository.

---

## 6. Database Design Proposal

### 6.1. New Tables

#### `production_records` (Aggregate Root)

```sql
CREATE TABLE production_records (
  -- Identity
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL REFERENCES tenants(id),
  factory_id CHAR(26) REFERENCES factories(id),

  -- Relationships (1:1 with production order)
  production_order_id CHAR(26) NOT NULL REFERENCES production_orders(id),
  order_line_id CHAR(26) NOT NULL REFERENCES order_lines(id),
  recipe_id CHAR(26) REFERENCES recipes(id),
  recipe_version INTEGER NOT NULL,  -- snapshot version

  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  -- pending | completed | archived

  -- Production Summary
  product_type VARCHAR(50),
  business_width_mm NUMERIC(8,2) NOT NULL,
  business_height_mm NUMERIC(8,2) NOT NULL,
  production_width_mm NUMERIC(8,2),
  production_height_mm NUMERIC(8,2),
  quantity_requested INTEGER NOT NULL,
  quantity_completed INTEGER NOT NULL DEFAULT 0,
  quantity_broken INTEGER NOT NULL DEFAULT 0,

  -- Actual Consumption (JSONB for flexibility)
  actual_consumption JSONB,
  -- {
  --   "totalSheetsUsed": 5,
  --   "totalGlassAreaM2": 12.5,
  --   "totalTrimLossM2": 0.8,
  --   "totalGrindingLossM2": 0.3,
  --   "totalScrapM2": 0.5,
  --   "totalRemnantM2": 1.2,
  --   "details": [{ "materialId": "...", "quantity": 2.5, "unit": "m2" }]
  -- }

  -- Actual Cost (JSONB)
  actual_cost JSONB,
  -- {
  --   "rawMaterialCost": 150.00,
  --   "trimLossCost": 9.60,
  --   "grindingLossCost": 3.60,
  --   "scrapCredit": -6.00,
  --   "energyCost": 25.00,
  --   "laborCost": 40.00,
  --   "overheadCost": 15.00,
  --   "totalCost": 237.20
  -- }

  -- Fire Analysis (JSONB)
  fire_analysis JSONB,
  -- {
  --   "trimLossM2": 0.8,
  --   "grindingLossM2": 0.3,
  --   "optimizationLossM2": 0.4,
  --   "scrapLossM2": 0.5,
  --   "breakageLossM2": 0.2,
  --   "yieldPercentage": 85.5,
  --   "wastePercentage": 14.5
  -- }

  -- Variance Analysis (JSONB)
  variance_analysis JSONB,
  -- {
  --   "recipeBaselineConsumption": { "glass": 10.0 },
  --   "actualConsumption": { "glass": 12.5 },
  --   "varianceM2": 2.5,
  --   "variancePercentage": 25.0,
  --   "varianceReason": "Additional sheet due to breakage"
  -- }

  -- Genealogy (JSONB)
  genealogy JSONB,
  -- {
  --   "sourceLotIds": ["...", "..."],
  --   "parentProductionRecordId": null,
  --   "childProductionRecordIds": [],
  --   "cuttingResultId": "...",
  --   "batchReferences": { "furnaceBatchId": "..." }
  -- }

  -- Timeline
  completed_at TIMESTAMPTZ,
  completed_by CHAR(26) REFERENCES users(id),

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL,
  created_by CHAR(26),
  updated_by CHAR(26),
  deleted_at TIMESTAMPTZ,
  deleted_by CHAR(26)
);

-- Indexes
CREATE UNIQUE INDEX idx_production_records_order ON production_records(tenant_id, production_order_id);
CREATE INDEX idx_production_records_tenant ON production_records(tenant_id);
CREATE INDEX idx_production_records_factory ON production_records(factory_id);
CREATE INDEX idx_production_records_completed ON production_records(completed_at);
CREATE INDEX idx_production_records_product ON production_records(product_type);
```

#### `production_record_operation_results` (Owned Entity)

```sql
CREATE TABLE production_record_operation_results (
  id CHAR(26) PRIMARY KEY,
  production_record_id CHAR(26) NOT NULL REFERENCES production_records(id) ON DELETE CASCADE,

  operation_code VARCHAR(50) NOT NULL,
  sequence INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  -- completed | skipped | failed

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  station_id CHAR(26) REFERENCES stations(id),
  machine_id CHAR(26) REFERENCES machines(id),
  operator_id CHAR(26) REFERENCES personnel(id),
  shift_id CHAR(26) REFERENCES personnel_shifts(id),
  duration_minutes INTEGER,

  result_data JSONB,
  -- operation-specific data:
  -- cutting: { sheetsUsed, sheetsPlanned, trimValues, grindingValues }
  -- grinding: { leftMm, rightMm, topMm, bottomMm }
  -- tempering: { furnaceLoad, temperatureProfile }
  -- ig: { spacerType, gasFill, sealantType }

  quality_status VARCHAR(30),
  -- passed | failed | rework_required

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pro_record_ops_record ON production_record_operation_results(production_record_id);
CREATE INDEX idx_pro_record_ops_operation ON production_record_operation_results(operation_code);
```

### 6.2. Existing Table Modifications

#### `production_orders` — Add FK reference

```sql
-- Add nullable FK to production_records
ALTER TABLE production_orders
  ADD COLUMN production_record_id CHAR(26) REFERENCES production_records(id);
```

#### `cutting_results` — No structural changes needed

The junction table `cutting_result_items` already links cutting results to production orders. Production Record reads through this junction.

### 6.3. JSONB Strategy

**Decision: JSONB for variable-schema value objects.**
- `actual_consumption`, `actual_cost`, `fire_analysis`, `variance_analysis`, `genealogy`, `result_data` are JSONB
- Each has a documented schema (TypeScript interface) but no DB-level constraint
- Rationale: These structures will evolve as the costing engine matures; JSONB avoids migration churn
- Query pattern: read the full record, deserialize in application layer

---

## 7. Domain Events

### 7.1. New Events

```typescript
interface ProductionRecordCreatedEvent {
  eventType: "production_record.created";
  productionRecordId: string;
  productionOrderId: string;
  orderLineId: string;
  recipeId: string;
  recipeVersion: number;
  productType: string;
  completedAt: string;
}

interface ProductionRecordCompletedEvent {
  eventType: "production_record.completed";
  productionRecordId: string;
  productionOrderId: string;
  orderLineId: string;
  totalCost: number;
  yieldPercentage: number;
  completedAt: string;
}

interface ProductionRecordConsumptionRecordedEvent {
  eventType: "production_record.consumption_recorded";
  productionRecordId: string;
  productionOrderId: string;
  consumption: {
    totalSheetsUsed: number;
    totalGlassAreaM2: number;
    materialDetails: Array<{ materialId: string; quantity: number; unit: string }>;
  };
}

interface ProductionRecordCostCalculatedEvent {
  eventType: "production_record.cost_calculated";
  productionRecordId: string;
  productionOrderId: string;
  totalCost: number;
  costBreakdown: Record<string, number>;
}

interface ProductionRecordVarianceRecordedEvent {
  eventType: "production_record.variance_recorded";
  productionRecordId: string;
  productionOrderId: string;
  recipeId: string;
  variancePercentage: number;
  significantVariances: Array<{ material: string; expected: number; actual: number; variance: number }>;
}
```

### 7.2. Event Publishing Pattern

Follows the existing two-phase pattern from `SERVICE_ARCHITECTURE.md`:
```
const result = await withTenantSession(async (tx, ctx) => {
  // Phase 1: Business logic + DB mutations inside transaction
  const record = await productionRecordRepo.save(recordData);
  return { record, events: [ProductionRecordCreatedEvent] };
});
// Phase 2: Publish ONLY after transaction commits
await eventPublisher.publishMany(result.events);
return result;
```

### 7.3. Event Consumers (Future)

| Event | Consumer | Action |
|-------|----------|--------|
| `ProductionRecordCompletedEvent` | Analytics Service | Update production KPIs |
| `ProductionRecordCompletedEvent` | Inventory Service | Trigger inventory valuation |
| `ProductionRecordCompletedEvent` | Order Service | Update order line completed quantity |
| `ProductionRecordCostCalculatedEvent` | Cost Engine | Update product cost averages |
| `ProductionRecordVarianceRecordedEvent` | Recipe Service | Flag recipes with high variance |

---

## 8. Integration Points

### 8.1. Production Finalization Pipeline

```
StationOperationService.completeOperation()
  │
  ├── Check: is this the Completion Operation for this product type?
  │     (configurable per product type — see Section 12)
  │
  ├── If YES → call ProductionRecordService.createFromCompletion()
  │     │
  │     ├── 1. Load ProductionOrder + all events
  │     ├── 2. Load cutting results (via cuttingResultItems)
  │     ├── 3. Load recipe snapshot (recipe_versions)
  │     ├── 4. Load factory configuration (trim/grinding/remnant profiles)
  │     │
  │     ├── 5. Engine: Calculate actual consumption
  │     │     - From cutting_result.sheetsUsed (operator reported)
  │     │     - From recipe_items.consumptionBasis (theoretical baseline)
  │     │     - Result: actual_consumption JSONB
  │     │
  │     ├── 6. Engine: Calculate fire analysis
  │     │     - Aggregate all breakage events
  │     │     - Calculate trim/grinding/scrap/remnant from cutting result
  │     │     - Classify per ADR-2026-07-15-05 (9 fire classes)
  │     │     - Result: fire_analysis JSONB
  │     │
  │     ├── 7. Engine: Calculate variance
  │     │     - Compare actual consumption vs recipe baseline
  │     │     - Result: variance_analysis JSONB
  │     │
  │     ├── 8. Engine: Calculate cost
  │     │     - Use actual consumption × unit costs from inventory
  │     │     - Use factory cost settings (energy, labor, overhead)
  │     │     - Result: actual_cost JSONB
  │     │
  │     ├── 9. Create production_record_operation_results
  │     │     - Iterate production_events, group by operation
  │     │     - For each operation: create result record
  │     │
  │     ├── 10. Create Inventory Movements
  │     │      - Consume raw materials (glass from inventory lots)
  │     │      - Create finished goods (if productType)
  │     │      - Create remnant/scrap inventory entries
  │     │
  │     ├── 11. Persist ProductionRecord
  │     │
  │     └── 12. Emit ProductionRecordCompletedEvent
  │
  └── If NO → continue normal station operation flow
```

### 8.2. Integration with Existing Services

| Integration Point | Existing Service | Direction |
|------------------|-----------------|-----------|
| Load production order | `ProductionService.findById()` | ProductionRecord → Production |
| Load cutting results | `CuttingExecutionService.findSession()` | ProductionRecord → Cutting |
| Load events | `ProductionRepository` (direct query) | ProductionRecord → DB |
| Load recipe | `RecipeManagementEngine` (future) | ProductionRecord → Recipe |
| Create inventory movements | `InventoryManagementEngine` | ProductionRecord → Inventory |
| Update order counters | `OrderService` | ProductionRecord → Order |
| Analytics update | New `AnalyticsService` (future) | ProductionRecord → Analytics |

### 8.3. What Does NOT Change

- **Order creation flow** — unchanged
- **Production Order lifecycle** — unchanged (status transitions remain the same)
- **Cutting sessions** — unchanged (still batch-oriented)
- **Station operations** — unchanged (start/complete/cancel remain)
- **Queue management** — unchanged
- **Quality control** — unchanged
- **Dispatch** — unchanged
- **Recipe** — unchanged (remains immutable engineering data)

---

## 9. Conflicts & Risks Identified

### 9.1. HIGH: Missing SSOT for Factory Configuration

**Problem:** Five different storage locations for the same factory configuration data. Production Record needs to snapshot configuration at completion time — which source is authoritative?

**Recommendation:** Before Production Record implementation, resolve the 5-way duplication. The `factory_configurations` key-value table should be the SSOT. `grinding_profiles`, `trim_profiles`, and `remnant_thresholds` tables are already structured and ADR-compliant. `settings.trim_mm` (numeric single value) violates ADR-2026-07-15-02 and should be deprecated. `settings.factory_configuration` JSONB is redundant.

### 9.2. MEDIUM: `recipe_items.materialId` References Wrong Table

**Problem:** `recipe_items.materialId` → FK to `materials` (old table). ADR-2026-07-18-01 created `materials_master` as the new material table. Production Record will read recipe baselines — it needs the correct material reference.

**Recommendation:** Reconcile FK before or during Production Record implementation. Either update `recipe_items.materialId` to reference `materials_master`, or create a migration to consolidate.

### 9.3. LOW: 4 Missing Unique Indexes

**Problem:** Four unique indexes documented in schema comments but never created in migrations:
- `recipes(tenant_id, recipe_code)` — documented in schema
- `recipe_items(recipe_id, sequence)` — documented in schema
- `recipe_operations(recipe_id, sequence)` — documented in schema
- `factory_configurations(factory_id, config_key)` — documented in schema

**Recommendation:** Create these indexes as a pre-requisite migration. Low risk, high data integrity value.

### 9.4. MEDIUM: In-Memory State for Cutting Sessions

**Problem:** Cutting sessions, transfers, and waiting pools are in-memory (`Map` objects in services), not persisted. Production Record needs to read cutting results — if a session is in-memory and the server restarts, the data is lost.

**Recommendation:** Ensure `cutting_results` table is populated before Production Record reads it. The current flow writes to `cutting_results` on session complete, so this should work for completed sessions. Active (in-memory) sessions are not relevant for Production Record.

### 9.5. MEDIUM: RecipeManagementEngine is Disconnected

**Problem:** `RecipeManagementEngine` exists with 11 static methods but has no DB repository, no service wiring, and is not used by any API controller.

**Recommendation:** For Production Record v1, read recipe data directly via Drizzle queries (not through the engine). The engine can be wired later. This avoids delaying Production Record for engine refactoring.

---

## 10. Migration Strategy

### 10.1. Pre-Migration (Sprint 6.0.0 — Safe, Independent)

| Step | Change | Risk | Rollback |
|------|--------|------|----------|
| 1 | Add missing unique indexes (4 indexes) | Low | `DROP INDEX` |
| 2 | Add `production_record_id` to `production_orders` (nullable) | Low | `ALTER TABLE DROP COLUMN` |
| 3 | Create `production_records` table | Low | `DROP TABLE` |
| 4 | Create `production_record_operation_results` table | Low | `DROP TABLE` |

### 10.2. Post-Migration (Future Sprint — Higher Risk)

| Step | Change | Risk | Rollback |
|------|--------|------|----------|
| 5 | Reconcile `recipe_items.materialId` FK → `materials_master` | Medium | Complex |
| 6 | Resolve factory config SSOT (deprecate `settings.trim_mm`) | Medium | Data loss |
| 7 | Wire RecipeManagementEngine to DB | Medium | Engine not used yet |

### 10.3. Rollback Strategy

All migrations in Sprint 6.0.0 are additive (new tables, nullable columns, indexes). Zero risk to existing data. Full rollback:
```sql
DROP TABLE IF EXISTS production_record_operation_results;
DROP TABLE IF EXISTS production_records;
ALTER TABLE production_orders DROP COLUMN IF EXISTS production_record_id;
DROP INDEX IF EXISTS idx_production_records_*;
```

---

## 11. Safe Commit Plan

### Commit 1: Schema Foundation
**Files:** `packages/db/src/schema/production-record.ts`
**Changes:** Create `production_records` and `production_record_operation_results` tables
**Testable:** Run `drizzle-kit generate` + `drizzle-kit push` → verify tables exist
**Rollback:** `DROP TABLE`
**Dependencies:** None (new tables only)

### Commit 2: Add Missing Indexes + FK
**Files:** Migration SQL file
**Changes:** Add 4 missing unique indexes + `production_record_id` FK on `production_orders`
**Testable:** Verify indexes in `pg_indexes`, verify FK in `information_schema`
**Rollback:** `DROP INDEX`, `ALTER TABLE DROP COLUMN`
**Dependencies:** None (safe additive changes)

### Commit 3: TypeScript Types
**Files:** `packages/types/src/index.ts`
**Changes:** Add `ProductionRecord`, `ProductionRecordOperationResult`, `ProductionRecordConsumption`, `ProductionRecordCost`, `ProductionRecordFireAnalysis`, `ProductionRecordVariance`, `ProductionRecordGenealogy` types
**Testable:** `tsc --noEmit` passes
**Dependencies:** Commits 1-2

### Commit 4: Repository Layer
**Files:** `packages/db/src/repositories/production-record.repository.ts`
**Changes:** `ProductionRecordRepository` with findById, findByProductionOrder, save, softDelete
**Testable:** Unit tests with mock DB
**Dependencies:** Commit 3 (types)

### Commit 5: Engine — Consumption Calculation
**Files:** `packages/engine/src/production-record-engine.ts`
**Changes:** Core calculation logic:
- `calculateActualConsumption()` — from cutting results + breakage
- `calculateFireAnalysis()` — classify all losses per ADR-2026-07-15-05
- `calculateVariance()` — compare actual vs recipe baseline
**Testable:** Pure function tests (no DB needed) + existing test patterns from `recipe-management-engine.test.ts`
**Dependencies:** Commit 3 (types)

### Commit 6: Engine — Cost Calculation
**Files:** `packages/engine/src/production-record-engine.ts` (extension)
**Changes:** Add `calculateActualCost()`:
- Read material unit costs from inventory lots
- Apply factory cost settings (energy, labor, overhead)
- Compute total cost
**Testable:** Pure function tests with mock cost data
**Dependencies:** Commit 5

### Commit 7: Domain Events
**Files:** `packages/db/src/services/events.ts`
**Changes:** Add 5 new event interfaces + wire into LocalEventPublisher
**Testable:** Unit tests verify event structure
**Dependencies:** Commit 4

### Commit 8: Production Record Service
**Files:** `packages/db/src/services/production-record.service.ts`
**Changes:** `ProductionRecordService.createFromCompletion()` — the full pipeline orchestrator
**Testable:** Integration tests with actual DB + mock event publisher
**Dependencies:** Commits 4, 5, 6, 7

### Commit 9: API Controller
**Files:** `apps/api/src/controllers/production-record.controller.ts`, `apps/api/src/dto/production-record.dto.ts`, `apps/api/src/router.ts`
**Changes:** REST endpoints for Production Record
**Testable:** API integration tests
**Dependencies:** Commit 8

### Commit 10: Wire Service in Composition Root
**Files:** `apps/api/src/services.ts`
**Changes:** Add `ProductionRecordService` to `AppServices` + wire into dependency graph
**Testable:** Application boots without errors
**Dependencies:** Commits 8, 9

### Commit 11: Initialize Production Records for Existing Completed Orders (Optional)
**Files:** Migration script
**Changes:** Backfill Production Records for historical completed orders
**Testable:** Verify record count matches completed production order count
**Dependencies:** Commit 1

### Commit 12: Integrate Completion Operation Trigger
**Files:** `packages/db/src/services/station-operation.service.ts`
**Changes:** After `completeOperation()`, check if operation is the Completion Operation → call `ProductionRecordService.createFromCompletion()`
**Testable:** End-to-end: complete a tempering operation → verify ProductionRecord created
**Dependencies:** Commits 8, 10

---

## 12. Completion Operation Configuration Design

### 12.1. Analysis of Existing Configuration System

The current system has:

| Storage | What It Stores | Suitable for Completion Op? |
|---------|---------------|---------------------------|
| `factory_configurations` | Key-value config per type | Partial — no product-type context |
| `grinding_profiles` | Per-machine edge values | No — grinding-specific |
| `trim_profiles` | Per-material edge values | No — trim-specific |
| `remnant_thresholds` | Per-factory remnant thresholds | No — remnant-specific |
| `settings` | Factory-level operational settings | No — too broad |
| `recipes` | Product recipe with `productType` | Partial — has product type but not completion logic |
| `products` | Product catalog with `productType` | Partial — product-level but no factory variant |

### 12.2. Recommendation: Product Configuration

**Decision:** Completion Operation belongs in **Product Configuration**, not Factory Configuration or Recipe.

**Rationale:**
1. **Product Type** determines completion (Float → CUTTING, Tempered → TEMPERING, etc.)
2. **Factory** may override (Factory A completes tempered at CUTTING, Factory B at TEMPERING)
3. **Recipe** is engineering data — completion is production logistics, not engineering
4. **Factory Configuration** is for physical parameters (trim, grinding, remnant) — completion is operational

### 12.3. Proposed Location

**Option A (Recommended):** New table `product_completion_config`

```sql
CREATE TABLE product_completion_config (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL REFERENCES tenants(id),
  factory_id CHAR(26) REFERENCES factories(id),  -- NULL = factory-wide default

  product_type VARCHAR(50) NOT NULL,  -- temper | insulating_glass | laminated | float
  completion_operation_code VARCHAR(50) NOT NULL,
  -- cutting | grinding | tempering | ig_assembly

  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL,
  created_by CHAR(26),
  updated_by CHAR(26)
);

-- Unique constraint: one completion config per (tenant, factory, product_type)
CREATE UNIQUE INDEX idx_completion_config_unique
  ON product_completion_config(tenant_id, COALESCE(factory_id, 'factory-default'), product_type);
```

**Option B (Alternative):** Extend `factory_configurations` with new config type

Add entries with `configType = 'completion'`:
```
configKey = "completion_operation.temper"
configValue = "tempering"
```

**Recommended: Option A** — Strong typing, FK support, clearer semantics.

### 12.4. Default Configuration

| Product Type | Completion Operation |
|-------------|---------------------|
| `float` (Float Glass) | `cutting` |
| `temper` (Tempered Glass) | `tempering` |
| `insulating_glass` | `ig_assembly` |
| `laminated` | `lamination` |

Factory admins can override per factory via the `product_completion_config` table.

### 12.5. Integration with Station Operation Service

When `StationOperationService.completeOperation()` is called:

```typescript
async completeOperation(productionOrderId, operationCode) {
  // ... existing completion logic ...

  // NEW: Check if this is the completion operation
  const productionOrder = await this.productionRepo.findById(productionOrderId);
  const completionConfig = await this.completionConfigRepo.findByProductType(
    productionOrder.productType,
    productionOrder.factoryId
  );

  if (completionConfig && operationCode === completionConfig.completionOperationCode) {
    // This is the Completion Operation — trigger Production Finalization Pipeline
    await this.productionRecordService.createFromCompletion(productionOrderId);
  }
}
```

### 12.6. Configuration Management

- **CRUD API** under `/api/v1/production/completion-config`
- **Defaults** seeded in seed data
- **Factory overrides** managed by Factory Manager role
- **Validation:** Operation code must exist in `production_operations` table

---

## Summary of Decisions

| Question | Decision |
|----------|----------|
| New aggregate name? | `ProductionRecord` |
| Where does it live? | Production bounded context |
| Is it mutable? | NO — immutable after `status = completed` |
| When is it created? | When Completion Operation finishes |
| Who triggers creation? | `StationOperationService.completeOperation()` |
| Data format for variable fields? | JSONB with documented TypeScript interfaces |
| Recipe reference? | Snapshot version (`recipe_versions`), not live |
| Inventory consumption? | Triggered BY ProductionRecord, not recipe |
| Completion config location? | New `product_completion_config` table |
| Factory config SSOT? | `factory_configurations` + `grinding_profiles` + `trim_profiles` + `remnant_thresholds` (not `settings`) |
| Implementation order? | Schema → Types → Repository → Engine → Events → Service → API → Integration |

---

*End of Technical Implementation Report — Sprint 6.0.0*
*Status: Draft — Awaiting Approval*
