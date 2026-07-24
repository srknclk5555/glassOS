# Production Record Architecture — Domain Validation Review

> **Self-Critique Report**
> **Date:** 2026-07-19
> **Status:** Challenging previous conclusions
> **Rule:** I will NOT defend my previous design. I will find its weaknesses.

---

## 1. Domain Lifecycle

### Original Claim

> ProductionRecord is created ONCE when Completion Operation finishes, becomes immutable at `status = completed`, and corrections require amendments.

### Self-Critique

**Problem 1: The lifecycle has a missing "active/in-progress" state.**

My design says the ProductionRecord is created only when the completion operation finishes. But what about long-running production orders (e.g., insulating glass that takes hours)? Between "completion operation starts" and "completion operation finishes," there is no record. If the system crashes during the 12-step pipeline, the entire computation is lost.

**Fix needed:** Create the ProductionRecord EARLIER — when the completion operation STARTS, not finishes. Set status = `collecting`. This gives us a recovery point.

**Problem 2: "Immutable after completed" is too strict for corrections.**

In real flat glass production, cost adjustments happen regularly. An accountant might need to adjust the unit cost of a consumed lot a week later. Making the entire aggregate immutable forces an amendment pattern for EVERY correction, even trivial ones. This adds complexity without business value.

**Better rule:**
- `actual_consumption` is immutable (physical fact — cannot un-use glass)
- `actual_cost` is mutable (cost adjustments are normal accounting practice)
- Core data (dimensions, quantities) is immutable
- Amendments are reserved for STRUCTURAL corrections (wrong order linked, wrong recipe version)

**Problem 3: When exactly during the completion operation?**

The completion operation (e.g., tempering) has a START event and a COMPLETE event. Between them, the glass is in the furnace. If I create the record at operation start, I don't have the final results yet. If I create it at operation complete, I risk losing data on crash.

**Resolution:** Two-phase creation:
1. Phase 1 (operation started): Create ProductionRecord in `collecting` status — captures the metadata (which order, which recipe version, which station)
2. Phase 2 (operation completed): Run the pipeline, populate consumption/cost/fire data, set status to `completed`

---

## 2. Aggregate Design

### Original Claim

> ProductionRecord is the aggregate root with 6 value objects + 1 owned entity.

### Self-Critique

**Problem 1: The aggregate is TOO LARGE for DDD correctness.**

In proper DDD, an aggregate should be a consistency boundary — things that MUST change together. My design puts these in one aggregate:

| Component | Must change together? | Could it be separate? |
|-----------|---------------------|----------------------|
| ProductionRecord metadata | — | — |
| Actual Consumption | Yes (with completion) | Maybe |
| Actual Cost | No (accounting adjusts later) | **YES** |
| Fire Analysis | Yes (with completion) | Maybe |
| Variance Analysis | Yes (with completion) | Maybe |
| Genealogy/Traceability | No (added later via rework) | **YES** |
| Operation Results | No (results arrive at different times) | **YES** |

**Critique:** `actual_cost` should NOT be in the same aggregate as consumption. Cost is a separate concern that changes independently (accounting corrections, exchange rates). `genealogy` is also wrong — traceability links are added as rework happens, days after completion. `operation_results` arrive at different times (grinding result before tempering result).

**Better split:**

1. **ProductionRecord** (Aggregate Root) — Metadata + Consumption + Fire Analysis + Variance
   - Created at completion, immutable afterwards
   - This is the "as-built recipe" — the truth about what happened

2. **ProductionCost** (Separate Aggregate Root) — Cost breakdown
   - Created at completion with estimated costs
   - Mutable for accounting corrections
   - Separate repository, separate service

3. **OperationResult** (Owned by ProductionRecord? Or separate?)
   - NOT owned by ProductionRecord — they arrive asynchronously
   - Better: make them an extension of `production_events` with result data
   - Or: separate table with FK to production_record

4. **TraceabilityLink** (Separate Value Object collection)
   - Parent/child relationships between ProductionRecords
   - Lot consumption links
   - Grows over time — shouldn't be in the immutable aggregate

**Problem 2: Value Objects are too complex to be embedded JSONB.**

DDD says Value Objects should be immutable, self-contained, and comparable by value. My JSONB approach makes them opaque — the DB can't validate them, and the app layer has to deserialize everything just to read one field.

**Better approach:** Use normalized tables for the core value objects, reserve JSONB only for truly variable data (operation-specific result data).

**Problem 3: No Aggregate boundaries for multi-operation overlap.**

Consider a tempering line that processes 50 pieces simultaneously. The "completion operation" for tempered glass is tempering. When tempering completes, all 50 pieces finish at once. But each piece is a separate ProductionOrder. My design doesn't handle batch completion — it's per-order.

---

## 3. Naming

### Critical Self-Corrections

| Original Name | Problem | Better Name | Rationale |
|--------------|---------|-------------|-----------|
| `ProductionRecord` | Acceptable | — | Engineers understand "record" as "what happened" |
| `ProductionRecordFireAnalysis` | **WRONG** | `ProductionRecordWasteAnalysis` | "Fire" is Turkish (fire = waste). International users will think "fire = fire in the factory." This is the Turkish word leaking into the English codebase. ADR-2026-07-15-05 calls it "fire" in the ADR title but the classes are "Trim Loss, Grinding Loss, Optimization Loss..." — the concept is **waste** or **loss**, not fire. |
| `ProductionRecordGenealogy` | **WRONG** | `ProductionRecordTraceability` | "Genealogy" is biological — implies parent/child lineage of living things. Manufacturing engineers say "traceability" or "lot trace." ERP consultants say "traceability." |
| `ProductionRecordOperationResult` | **TOO VERBOSE** | `OperationRecord` or `OperationResult` | Simpler. The context (ProductionRecord) is already clear from the FK. |
| `ProductionRecordConsumption` | Acceptable | — | Clear to both engineers and ERP consultants |
| `ProductionRecordVariance` | Acceptable | — | Standard manufacturing term |
| `status = "pending"` | **MISLEADING** | `collecting` or `assembling` | "Pending" sounds like nothing is happening. The record is actively being built. |
| `product_completion_config` | Acceptable | — | Describes exactly what it is |
| `completion_operation_code` | Acceptable | — | Clear |
| `ProductionRecordService.createFromCompletion()` | **AMBIGUOUS** | `ProductionRecordService.assemble()` or `ProductionRecordService.finalize()` | What does "fromCompletion" mean? From the completion operation? From the completion of the order? Ambiguous. |

### Industry Term Check

| Term | Manufacturing Engineer | ERP Consultant | Verdict |
|------|----------------------|----------------|---------|
| Production Record | ✅ "Where's the batch record?" | ✅ "Production record is standard" | OK |
| As-Built Recipe | ✅ "Show me the as-built" | ✅ "As-built BOM" | Also valid, more specific |
| Waste Analysis | ✅ "Where's the waste report?" | ✅ "Waste analysis" | Better than "Fire Analysis" |
| Traceability | ✅ "Lot trace number?" | ✅ "Full traceability required" | Better than "Genealogy" |
| Variance | ✅ "Variance report" | ✅ "Material variance" | OK |
| Operation Result | ✅ "Cutting results" | ✅ "Operation results" | OK |
| Consumption | ✅ "How much glass?" | ✅ "Material consumption" | OK |
| Completion Operation | ❓ "Last station?" | ✅ "Completion operation" | Engineers say "last operation" or "final station" |

---

## 4. Existing Architecture Compatibility

### 4.1. Does ProductionRecord duplicate existing functionality?

**Original claim:** No duplication.

**Self-critique: PARTIALLY WRONG.**

**Finding 1: `production_orders` already has `completedAt` and `currentStatus = completed`.**

When a production order reaches status `completed`, the system already knows it's done. The question is: does the ProductionRecord add enough value beyond updating counters on `order_lines.completedQuantity`?

The `order_lines` table already has:
- `completedQuantity` — how many pieces completed
- `brokenQuantity` — how many pieces broke

If the only purpose of ProductionRecord is to track "production happened," the existing system already does this through order line counters.

**Justification for new aggregate:** The counters track *quantity* but not *what actually happened* — no actual consumption, no actual cost, no waste breakdown, no operation-level results. The counters are bookkeeping; the ProductionRecord is forensic data.

**Finding 2: `production_events` already captures station transitions with full detail.**

My proposed `OperationRecord` (or `ProductionRecordOperationResult`) duplicates fields from `production_events`:

| OperationRecord field | Equivalent in production_events |
|---------------------|-------------------------------|
| `operationCode` | `toOperation` |
| `startedAt` | `eventAt` WHERE `eventType = 'started'` |
| `completedAt` | `eventAt` WHERE `eventType = 'completed'` |
| `stationId` | `stationId` |
| `machineId` | `machineId` |
| `operatorId` | `operatorId` |
| `shiftId` | `shiftId` |
| `durationMinutes` | COMPUTED from started + completed events |
| `qualityStatus` | NOT in events |

**Conclusion:** The OperationRecord is largely DERIVABLE from `production_events`. The only new field is `resultData` (operation-specific results) and `qualityStatus`. Creating an entire new table for this is wasteful.

**Better approach:** 
- Add `result_data` JSONB column to `production_events` where `eventType = 'completed'`
- Or: Create a single `production_event_details` table for extended operation data, keyed by eventId
- This avoids duplicating station/machine/operator/shift data already in events

### 4.2. Does it overlap with another aggregate?

**Finding: Cutting results are batch-oriented.**

My design expects per-production-order cutting data. But `cutting_results` is batch-oriented — one result for multiple production orders (via `cutting_result_items` junction). Extracting "this order's share" of the batch's `sheetsUsed` requires proportional allocation.

**Problem:** If a batch cuts 10 orders from 5 sheets, each order's share of the 5 sheets is... 5 sheets? 0.5 sheets? The operator reports `sheetsUsed = 5` for the entire batch, not per order. The actual glass area per order is calculable (order dimensions), but the sheet count per order is NOT directly available.

**This breaks my assumption that `sheetsUsed` is accessible per order.**

### 4.3. Can existing services already perform this work?

**Finding: `order_lines.completedQuantity` already serves as a basic "production record."**

When `InspectionPassedEvent` fires, `QualityControlService` updates `order_lines.completedQuantity`. When `DeliveryCompletedEvent` fires, `DispatchService` updates delivery counters.

The system already has a working completion flow — it just doesn't capture the "how" (consumption, cost, waste).

### 4.4. Single Responsibility Violation

The `ProductionRecordService.createFromCompletion()` pipeline has 12+ responsibilities:
1. Load production order
2. Load cutting results
3. Load recipe
4. Load factory config
5. Calculate consumption (engine)
6. Calculate fire analysis (engine)
7. Calculate variance (engine)
8. Calculate cost (engine)
9. Create operation results
10. Create inventory movements
11. Persist record
12. Emit events

This is a **God Method** — violates Single Responsibility Principle badly.

---

## 5. Configuration

### Original Claim

> Completion operation belongs in a NEW `product_completion_config` table.

### Self-Critique: THIS IS WRONG. Three reasons:

**Reason 1: The `products` table already has `productType` and `recipeId`.**

The products table is:
```typescript
products = {
  id, productCode, name, productType, 
  recipeId,  // ← already links to recipe
  isActive, notes, ...
}
```

The `productType` determines the production flow (see `PRODUCTION_FLOW_ARCHITECTURE.md`):
- `temper` → CUTTING → GRINDING → TEMPERING → QC → DISPATCH
- `insulating_glass` → CUTTING → WASHING → IG_ASSEMBLY → QC → DISPATCH
- `laminated` → CUTTING → QC → LAMINATING → QC → DISPATCH

The **completion operation is the LAST operation in the product type's mandatory route** — which is already defined in the production flow architecture document. Creating a new table duplicates routing knowledge.

**Reason 2: The `recipe_operations` table already defines operation sequences.**

Every recipe has `recipe_operations` with `sequence`. The last operation in the sequence is the logical completion point. We can determine completion deterministically from the recipe.

**Reason 3: A new table adds unnecessary configuration overhead.**

Every product created would need a completion config entry (or we'd need factory defaults). This is CRUD bloat for something that can be derived.

### Revised Recommendation

**DO NOT create `product_completion_config`.**

Instead, use ONE of these approaches (in order of preference):

**Option A (Best — No config needed):**
Completion operation = the LAST operation in `recipe_operations` (by `sequence` DESC) where `isMandatory = true`.
- Zero configuration
- Works for all product types
- Portable across industries
- If factory needs to override, add `recipe_rules` entry with `ruleType = 'completion_operation'` and `ruleValue = 'cutting'`

**Option B (Explicit — if override is needed):**
Add a nullable `completionOperationCode` column to `products` table.
- Single column, no new table
- NULL = use recipe's last mandatory operation
- Set value = override
- Fits naturally in the Product aggregate

**Verdict:** Option A is the most DDD-correct approach. The completion is an **invariant of the recipe**, not a separate configuration concern. Option B only if product managers explicitly need per-product override capability.

---

## 6. Event Lifecycle

### Original Claim

> 5 new events: created, completed, consumption_recorded, cost_calculated, variance_recorded.

### Self-Critique: Event granularity is wrong.

**Problem 1: Too many fine-grained events.**

The original design emits 5 events for a single completion. Each event carries overlapping data. The consumer would need to correlate them by `productionRecordId` — that's complexity without benefit.

**Better approach:** Two events only:
1. `ProductionRecordOpenedEvent` — fired when completion operation STARTS (status = collecting)
2. `ProductionRecordFinalizedEvent` — fired when ALL data is collected (status = completed)
   - Contains the COMPLETE record data (consumption, cost, waste, variance, traceability)
   - Consumers get everything in one event; no correlation needed

**Problem 2: No event for the "collecting" phase.**

If the completion operation starts at 08:00 and completes at 08:45, between those times the system has no record that a ProductionRecord is being created. If a crash happens at 08:30, the work is lost.

**Fix:** `ProductionRecordOpenedEvent` at operation START provides a recovery point.

**Problem 3: Event sourcing consideration.**

Could the ProductionRecord be fully event-sourced? Yes — but with caveats:
- The aggregate is primarily a REPORT (read model), not a transactional entity
- Event sourcing would mean replaying all production events to get the "as-built" state
- This is architecturally clean but computationally expensive for frequent queries
- **Hybrid approach is correct:** Store the state (table) + append events (existing event system)

**My design is correct on this point — hybrid approach is the right call.**

### Revised Event Set

```typescript
// Fired when completion operation STARTS collecting data
interface ProductionRecordOpenedEvent {
  eventType: "production_record.opened";
  productionRecordId: string;
  productionOrderId: string;
  orderLineId: string;
  recipeId: string;
  recipeVersion: number;
  completionOperationCode: string;
  openedAt: string;
}

// Fired when ALL data is collected and record is finalized
interface ProductionRecordFinalizedEvent {
  eventType: "production_record.finalized";
  productionRecordId: string;
  productionOrderId: string;
  orderLineId: string;
  summary: {
    totalCost: number;
    yieldPercentage: number;
    quantityCompleted: number;
    quantityBroken: number;
  };
  finalizedAt: string;
}

// Optional — fired when cost is adjusted after finalization
interface ProductionRecordCostAdjustedEvent {
  eventType: "production_record.cost_adjusted";
  productionRecordId: string;
  previousTotalCost: number;
  newTotalCost: number;
  reason: string;
  adjustedAt: string;
}
```

---

## 7. Database Validation

### Original Claim

> Create `production_records` and `production_record_operation_results` tables.

### Self-Critique: The operation results table is WRONG.

**Problem 1: `production_record_operation_results` duplicates `production_events`.**

As analyzed in Section 4, almost every field in the proposed `OperationResult` table already exists in `production_events`. The only new fields are `resultData` (JSONB) and `qualityStatus`.

**Fix:** Instead of a new table, extend `production_events`:
- Add nullable `result_data` JSONB column to `production_events`
- Add nullable `quality_status` column
- This avoids table bloat and keeps the event-as-fact pattern intact

**Problem 2: Too many JSONB columns.**

Original design has 6 JSONB columns in one table:
```sql
actual_consumption JSONB,
actual_cost JSONB,
fire_analysis JSONB,
variance_analysis JSONB,
genealogy JSONB,
result_data JSONB  -- in operation_results table
```

This is a JSONB dump disguised as a normalized schema. It's neither fish nor fowl — not truly normalized (can't query individual fields efficiently), not truly document-based (still has a fixed schema).

**Fix:** Reduce to 2-3 JSONB columns maximum:
1. `consumption_data` JSONB — operator-reported consumption details
2. `cost_data` JSONB — cost breakdown (mutable for accounting)
3. `analysis_data` JSONB — waste analysis + variance (computed at finalization)

Or better: normalize the core fields:
- `total_sheets_used`, `total_glass_area_m2`, `total_waste_m2`, `total_cost`, `yield_percentage` as NUMERIC columns
- JSONB only for: breakdown details (itemized per material), operation-specific data

**Problem 3: `order_line_id` in production_records is redundant.**

`production_orders` already has `order_line_id`. The ProductionRecord can reach the order line through the production order FK. Adding `order_line_id` directly violates DRY and risks inconsistency.

**Fix:** Remove `order_line_id` from `production_records`. Derive from `production_orders.order_line_id`.

### Revised Schema

```sql
CREATE TABLE production_records (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL REFERENCES tenants(id),
  factory_id CHAR(26) REFERENCES factories(id),
  production_order_id CHAR(26) NOT NULL REFERENCES production_orders(id),
  
  -- Status lifecycle
  status VARCHAR(20) NOT NULL DEFAULT 'collecting',
  -- collecting | completed | archived
  
  -- Production summary (normalized columns for querying)
  product_type VARCHAR(50),
  business_width_mm NUMERIC(8,2) NOT NULL,
  business_height_mm NUMERIC(8,2) NOT NULL,
  quantity_requested INTEGER NOT NULL,
  quantity_completed INTEGER NOT NULL DEFAULT 0,
  quantity_broken INTEGER NOT NULL DEFAULT 0,
  
  -- Recipe snapshot (which recipe version was used)
  recipe_id CHAR(26) REFERENCES recipes(id),
  recipe_version INTEGER NOT NULL,
  
  -- Consumption summary (normalized for fast queries)
  total_sheets_used INTEGER,
  total_glass_area_m2 NUMERIC(12,4),
  total_waste_m2 NUMERIC(12,4),
  yield_percentage NUMERIC(5,2),
  
  -- Cost summary (normalized; detailed breakdown in JSONB)
  total_cost NUMERIC(14,4),
  
  -- Detailed breakdowns (JSONB for variable-schema data)
  consumption_details JSONB,    -- itemized materials consumed
  cost_details JSONB,           -- full cost breakdown (MUTABLE)
  analysis_details JSONB,       -- waste analysis + variance (IMMUTABLE)
  traceability JSONB,           -- lot trace + batch references (APPEND-ONLY)
  
  -- Timeline
  collecting_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by CHAR(26) REFERENCES users(id),
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL,
  created_by CHAR(26),
  updated_by CHAR(26)
);

CREATE UNIQUE INDEX idx_pr_order ON production_records(tenant_id, production_order_id);
CREATE INDEX idx_pr_tenant ON production_records(tenant_id);
CREATE INDEX idx_pr_completed ON production_records(completed_at);
CREATE INDEX idx_pr_product ON production_records(product_type);
CREATE INDEX idx_pr_yield ON production_records(yield_percentage);
```

**Modification to `production_events` instead of new table:**

```sql
ALTER TABLE production_events
  ADD COLUMN result_data JSONB,
  ADD COLUMN quality_status VARCHAR(30);
```

---

## 8. Future Scalability

### Original Claim

> The design works for multi-industry.

### Self-Critique: My assumption is WEAK. Let me test each industry.

| Industry | Would ProductionRecord work? | What breaks? |
|----------|---------------------------|---------------|
| Flat Glass | ✅ Yes — designed for this | Nothing |
| PVC / Aluminium (profiles) | ⚠️ Partially | "Cutting results" don't apply — profiles are cut to length, not sheets. `sheetsUsed` concept doesn't exist. Need length-based consumption. |
| Furniture (panel-based) | ⚠️ Partially | Panel cutting exists but edge-banding, drilling, and assembly are different operations. `productType` enum doesn't include "furniture." |
| Steel (plate-based) | ⚠️ Partially | Cutting exists, but no tempering/IG. Different waste categories (no trim in steel). |
| Stone | ⚠️ Partially | Slab cutting similar to glass, but no grinding allowance concept. |
| Wood | ❌ Problems | No "sheets," no "trim." Waste is sawdust, not remnant. |
| Food | ❌ Breaks | No glass, no cutting sheets. Production is batch/continuous, not piece-based. Completely different ontology. |
| Chemical | ❌ Breaks | Continuous process, not discrete manufacturing. No "order lines," no "operations" in the station sense. |

**Key assumption that breaks outside glass:**

My entire design assumes **discrete piece-based manufacturing** with:
- Individual production orders per piece
- Station-based operation transitions
- Sheet/area-based consumption tracking
- Trim/grinding/remnant waste classification

For **process manufacturing** (chemical, food, paint), none of these concepts apply. Production records in those industries track:
- Batch quantities (kg, liters)
- Temperature/time profiles
- Ingredient mixing ratios
- Lab test results

**This is not a design flaw — it's a domain boundary.** GlassOS is a flat glass MES. The ProductionRecord should be designed for flat glass, not generalized prematurely. But the report should be honest about these assumptions.

**Verdict:** The design is correct for its domain. Preemptive generalization would violate YAGNI. However, the code should avoid hardcoding glass-specific terms where a neutral alternative exists (use "waste" not "fire," use "traceability" not "genealogy").

---

## 9. Risks

### 🔴 HIGH RISKS

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Pipeline crash on completion** | The 12-step pipeline is called synchronously during `completeOperation()`. If step 5 (inventory movement) fails after step 4 (consumption calculated), the system is in inconsistent state. | Use database transaction wrapping the entire pipeline. Or: use Saga pattern (compensating transactions). |
| **Cutting batch allocation ambiguity** | `sheetsUsed` is per batch, not per order. Exact per-order sheet consumption is unknowable. | Proportional allocation based on area. Or: require operators to report per-order sheet use (process change). |
| **Recipe version drift** | If recipe is updated between order creation and completion, which version to use? | Must use the recipe version assigned to the order line at creation time (`order_lines.recipeId` + `recipes.version`). Never the latest version. |
| **Performance on high-volume production** | Reading all events, cutting results, and factory config for EACH completed production order could be slow (1000+ orders/day). | Batch processing? Async pipeline? Caching factory config (rarely changes). |

### 🟡 MEDIUM RISKS

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Duplicate ProductionRecord** | If `StationOperationService.completeOperation()` is called twice (e.g., network retry), two ProductionRecords could be created for the same order. | Idempotency check: `SELECT ... WHERE production_order_id = ?`. If record exists, skip or update. |
| **Factory config SSOT unresolved** | My report says "resolve before implementation" but doesn't specify how. The 5-way duplication (Section 9.1 of original report) blocks accurate cost calculation. | Must resolve in pre-implementation. Recommended: `factory_configurations` as SSOT for key-value, `grinding_profiles`/`trim_profiles`/`remnant_thresholds` as SSOT for structured edge data. |
| **Cost calculation is business logic, not architecture** | Sprint says "This sprint DOES NOT implement business logic." But my engine design includes cost calculation formulas. | Defer cost calculation to a future sprint. In Sprint 6.0.0, store the schema and repository only. Cost engine = Sprint 6.1. |
| **`recipe_items.materialId` references wrong table** | FK points to `materials` (old) instead of `materials_master` (new). ProductionRecord reads recipe baseline — it needs correct material references. | Fix FK before or during Sprint 6.0.0. Migration: ALTER recipe_items to reference `materials_master` and drop old FK. |

### 🟢 LOW RISKS

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Missing unique indexes** | 4 indexes documented in schema comments but never created. Not blocking but reduces data integrity. | Add as pre-requisite migration. |
| **In-memory cutting sessions** | Not persisted. ProductionRecord reads from `cutting_results` table which IS persisted. Only active (in-progress) sessions are in-memory, which are not relevant for ProductionRecord. | No action needed. |
| **Soft delete complexity** | ProductionRecord is immutable after completion — soft delete is probably never needed. | Can omit `deletedAt`/`deletedBy` from schema. |

### ⚫ HIDDEN RISKS

| Risk | Description | Severity |
|------|-------------|----------|
| **StationOperationService circular dependency** | `StationOperationService.completeOperation()` would call `ProductionRecordService.createFromCompletion()`, which reads `production_events`. But `production_events` are written by `StationOperationService` itself. Within the same transaction, the events might not be visible yet. | 🔴 HIGH |
| **OrderLine counter inconsistency** | When ProductionRecord is finalized, `order_lines.completedQuantity` should be updated. But the cutting execution service already updates this on breakage. Which service owns the counter? | 🟡 MEDIUM |
| **Rework creates a new ProductionOrder** | When a piece breaks and rework is created, a NEW ProductionOrder is made with `parentId`. Does this new rework order get its OWN ProductionRecord? If yes, the genealogy chain links records. But the original record already captured the breakage as part of its waste analysis. Double-counting risk. | 🟡 MEDIUM |
| **Offline-first impact** | If the production record is created during an offline period (mobile/field device), the pipeline can't run (needs DB access). The record would need to be assembled later when online. | 🟡 MEDIUM |

### 🔴 LONG-TERM MAINTENANCE RISKS

| Risk | Description |
|------|-------------|
| **JSONB schema drift** | Over time, different engineers add different fields to `consumption_details` JSONB. No schema validation → data rot. |
| **Pipeline coupling** | The 12-step pipeline in `ProductionRecordService` is tightly coupled to 5+ other services. Any change in those services can break the pipeline. |

---

## 10. Alternative Designs

### Alternative A: Extend `production_orders` (Minimalist)

Instead of a new aggregate, add summary columns directly to `production_orders`:

```sql
ALTER TABLE production_orders ADD COLUMN actual_sheets_used INTEGER;
ALTER TABLE production_orders ADD COLUMN actual_glass_area_m2 NUMERIC(12,4);
ALTER TABLE production_orders ADD COLUMN total_waste_m2 NUMERIC(12,4);
ALTER TABLE production_orders ADD COLUMN yield_percentage NUMERIC(5,2);
ALTER TABLE production_orders ADD COLUMN actual_cost NUMERIC(14,4);
ALTER TABLE production_orders ADD COLUMN consumption_details JSONB;
ALTER TABLE production_orders ADD COLUMN cost_details JSONB;
```

**Pros:**
- Zero new tables
- No new FK relationships
- Simpler queries (no JOIN needed)
- Faster to implement

**Cons:**
- `production_orders` becomes a god table (13 → ~20 columns)
- Violates SRP (tracking WIP + storing historical summary in one table)
- Can't enforce immutability (the same row that tracks `currentStatus` also stores the historical record)
- Harder to permissions-separate (operators writing to the same row that stores final costs)
- NOT DDD-correct — two different lifecycle phases in one aggregate

**Verdict:** Simpler but architecturally weaker. Not recommended.

### Alternative B: Event-Sourced ProductionRecord (Purist)

No `production_records` table. Instead, the ProductionRecord is a **projection** built by replaying events:

```typescript
class ProductionRecordProjection {
  static build(productionOrderId: string): ProductionRecord {
    const events = await eventStore.findByProductionOrderId(productionOrderId);
    const cuttingResult = await cuttingRepo.findByProductionOrderId(productionOrderId);
    // ... replay events + cutting data into a ProductionRecord
  }
}
```

**Pros:**
- Zero new tables (just event store)
- Full traceability by design
- No sync issues (events are the source of truth)
- Naturally append-only
- Trivially supports amendments (just append a correction event)

**Cons:**
- Query performance: replaying dozens/hundreds of events on every read
- Complex CQRS setup (separate read model for frequent queries)
- Existing system is NOT event-sourced — mixing paradigms is risky
- Event store would need to be built first (Kafka? PostgreSQL event table?)
- Far beyond Sprint 6.0.0 scope
- Violates "do not redesign architecture" constraint

**Verdict:** Architecturally beautiful but practically over-engineered for current needs. Good for a future phase.

### Alternative C: Split Into Three Small Aggregates (DDD-Correct)

Instead of one monolithic ProductionRecord:

**Aggregate 1: ProductionSummary**
- 1:1 with production_orders
- Created when completion operation starts
- Stores: quantities, dimensions, dates, status
- Immutable after completion

**Aggregate 2: ProductionConsumption**
- 1:1 with production_orders (separate table)
- Created after pipeline runs
- Stores: sheets used, materials consumed, waste analysis, variance
- Immutable after creation

**Aggregate 3: ProductionCost**
- 1:1 with production_orders (separate table)
- Created with estimated costs, mutable for accounting adjustments
- Stores: full cost breakdown
- MUTABLE (accounting needs)

**Plus:** Extend `production_events` with `result_data` (avoid separate table for operation results)

**Plus:** Extend `products` with nullable `completion_operation_code` (avoid separate config table)

**Comparison:**

| Criterion | Original (Monolithic) | Alternative C (Split) |
|-----------|----------------------|----------------------|
| Complexity | Medium | Medium-High |
| DDD Correctness | ⚠️ Borderline | ✅ Correct |
| Performance | Single query | 2-3 queries |
| Cost Adjustments | ❌ Needs amendments | ✅ Natural |
| Traceability Growth | ❌ Bloats aggregate | ✅ Separate |
| Implementation Effort | 12 commits | 14 commits |
| Query Convenience | ✅ One record = everything | ⚠️ Join needed |

### Comparison Table of All Alternatives

| Criterion | A: Extend prod_orders | B: Event Sourcing | C: Split Aggregates | Original (Monolithic) |
|-----------|---------------------|-------------------|---------------------|----------------------|
| **Complexity** | 🟢 Low | 🔴 High | 🟡 Medium | 🟡 Medium |
| **Performance** | 🟢 Best | 🔴 Worst (replay) | 🟡 Medium | 🟢 Good |
| **Maintainability** | 🔴 Poor (god table) | 🟢 Good | 🟢 Good | 🟡 Medium |
| **DDD Correctness** | ❌ Wrong | ✅ Best | ✅ Good | ⚠️ Borderline |
| **Manufacturing Fit** | 🟡 Ok | 🟡 Ok | 🟢 Good | 🟢 Good |
| **Implementation Speed** | 🟢 Fastest | 🔴 Slowest | 🟡 Medium | 🟡 Medium |
| **Data Integrity** | ❌ Weak | ✅ Strong | ✅ Strong | 🟡 Medium |
| **Future Flexibility** | ❌ Rigid | ✅ Flexible | ✅ Flexible | 🟡 Medium |

---

## 11. Final Self-Criticism

### What I Got Wrong in My Original Report

1. **❌ `product_completion_config` as a new table** — Unnecessary. The completion operation is derivable from the recipe's last mandatory operation. A simple override field on `products` is sufficient if needed.

2. **❌ `production_record_operation_results` as a new table** — Duplicates `production_events`. The only new data is `result_data` and `quality_status`, which can be added to the existing events table.

3. **❌ Aggregate too large** — 6 value objects + 1 owned entity in one aggregate violates DDD's "small aggregates" guideline. Cost should be separate (mutable). Traceability should be append-only.

4. **❌ "Fire Analysis" naming** — "Fire" is Turkish, not English. International manufacturing engineers will misunderstand. Should be "Waste Analysis" or "Loss Analysis."

5. **❌ "Genealogy" naming** — Too biological. Should be "Traceability."

6. **❌ Too many JSONB columns** — 6 JSONB columns is excessive. Normalize the frequently-queried fields (sheets used, area, cost total, yield percentage). Keep JSONB only for truly variable breakdown data.

7. **❌ 12-step pipeline in one method** — Violates Single Responsibility. Should delegate to engine for calculations, use a coordinator pattern or event-driven pipeline.

8. **❌ Cost calculation in Sprint 6.0.0** — Sprint explicitly says "does NOT implement business logic." Cost calculation IS business logic. Should be deferred to Sprint 6.1.

### What I Got Right

1. ✅ **ProductionRecord as a new concept** — Despite the flaws, the core insight is correct. The system needs an "as-built" record.
2. ✅ **Immutable after completion for core data** — Physical facts (how many sheets used, how much waste) should not change.
3. ✅ **Recipe version snapshot** — Must capture recipe version at time of production, not re-read latest.
4. ✅ **Hybrid state + events** — Event sourcing alone is over-engineered; state table + domain events is the right balance.
5. ✅ **Dependency map** — The analysis of existing components and their relationships is accurate.
6. ✅ **Staged commit plan** — The 12-commit plan with independent testability is sound, though the implementation order needs adjustment.
7. ✅ **Factory config SSOT problem** — The 5-way duplication is real and must be resolved.

### Assumptions That Were Weak

1. **"Per-order sheet consumption is available"** — It's NOT. Cutting is batch-oriented. `sheetsUsed` is per-batch, not per-order. Allocation needs proportional math.

2. **"The pipeline runs synchronously without performance impact"** — Reading all events, cutting results, breakage events, recipe versions, and factory config for each production order could be slow. Need async consideration.

3. **"Amendments are rare"** — In real factories, cost adjustments, corrections, and data fixes are COMMON. Making everything immutable creates friction.

4. **"Event consumers will exist immediately"** — Events are published but no consumers are implemented. Events without consumers are noise. Should consider whether events are needed in Sprint 6.0.0 or can be added in Sprint 6.1 when consumers exist.

---

## 12. Implementation Readiness

### Decision: NOT READY — Needs Minor Revisions

**After self-critique, my original proposal has 7 issues that must be fixed before implementation:**

| Issue | Fix | Impact |
|-------|-----|--------|
| 1. Remove `product_completion_config` table | Use recipe's last mandatory operation (deterministic). Override via `products.completionOperationCode` nullable column | Simplifies configuration, removes one table |
| 2. Remove `production_record_operation_results` table | Add `result_data` + `quality_status` to `production_events` | Removes duplicate table, leverages existing schema |
| 3. Split aggregate into ProductionSummary + ProductionConsumption + ProductionCost | Three smaller aggregates with clear ownership boundaries | Better DDD compliance, separates mutable cost from immutable consumption |
| 4. Rename "Fire Analysis" → "Waste Analysis" | Update all references | International comprehension |
| 5. Rename "Genealogy" → "Traceability" | Update all references | Industry-standard terminology |
| 6. Normalize key fields, reduce JSONB | Add NUMERIC columns for sheets_used, area, cost, yield. Keep JSONB for breakdown details only | Queryable, indexable, maintainable |
| 7. Defer cost calculation to Sprint 6.1 | Engine cost logic is business logic, not architecture. Sprint 6.0.0 = schema + repository + service skeleton only | Keeps sprint scope clean |

### Revised Implementation Roadmap

```
Sprint 6.0.0 — Production Record Foundation (ARCHITECTURE ONLY)
  Commit 1: Schema — production_records table (revised, normalized)
  Commit 2: Extend production_events — add result_data + quality_status
  Commit 3: Types — ProductionSummary, ProductionConsumption, domain events
  Commit 4: Repository — ProductionRecordRepository
  Commit 5: Service skeleton — ProductionRecordService (collect + finalize stubs)
  Commit 6: Domain events — ProductionRecordOpenedEvent + FinalizedEvent
  Commit 7: API — GET endpoints only (read existing records)
  Commit 8: Migration — add missing unique indexes (pre-requisite)
  Commit 9: Extend products — add completionOperationCode nullable column

Sprint 6.1.0 — Production Record Engine
  Commit 10: Engine — consumption calculation (from cutting results)
  Commit 11: Engine — waste analysis calculation
  Commit 12: Engine — variance calculation
  Commit 13: Wire pipeline trigger in StationOperationService
  Commit 14: Integration tests — full completion flow

Sprint 6.2.0 — Production Cost (DEFERRED — business logic)
  Commit 15: Engine — cost calculation
  Commit 16: ProductionCost aggregate (mutable)
  Commit 17: Accounting adjustment API

Sprint 6.3.0 — Traceability & Analytics
  Commit 18: Traceability links (rework chain, lot trace)
  Commit 19: Analytics integration
  Commit 20: Reporting views
```

### Immediate Action Items (Before Any Code)

1. ✅ Write this validation report (DONE)
2. ⏳ Update original `production-record-architecture.md` with corrections
3. ⏳ Wait for architecture approval
4. ⏳ Resolve factory config SSOT (separate decision needed)
5. ⏳ Resolve `recipe_items.materialId` FK issue (separate decision needed)

---

## Summary

| Question | Original Answer | Revised Answer |
|----------|----------------|----------------|
| New tables? | 2 (`production_records` + `operation_results`) | 1 (`production_records` — revised) |
| New config table? | 1 (`product_completion_config`) | 0 (extend `products` instead) |
| JSONB columns? | 6 | 3 (consumption_details, cost_details, analysis_details) |
| Normalized columns? | Minimal | Add key numeric fields |
| Aggregate count? | 1 monolithic | 3 small (summary + consumption + cost deferred) |
| Events? | 5 | 2 (+ 1 optional for cost adjustments) |
| Pipeline steps? | 12 in one method | Decomposed: coordinator + engine + async where possible |
| Naming issues? | Fire, Genealogy | Waste, Traceability |
| Ready to implement? | ✅ Yes | ⚠️ After fixing 7 issues |

---

**End of Domain Validation Review**
*Status: Self-critique complete. Recommending revision before implementation.*
