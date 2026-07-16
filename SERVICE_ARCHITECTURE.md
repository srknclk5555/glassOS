# 🏗️ GlassOS Service Architecture

> **Sürüm:** 2.5 — Sprint 2.6.5  
> **Tarih:** 2026-07-16  
> **Durum:** Architecture Baseline + Event Publisher Infrastructure

---

## 1. Architecture Overview

The Service Layer sits between the Repository Layer (data persistence) and the future API/UI Layer. Services encapsulate **business logic, validation rules, transaction boundaries, and domain events.**

```
┌─────────────────────────────────────────────┐
│  API / UI Layer (Future)                     │
├─────────────────────────────────────────────┤
│  Service Layer ◄── YOU ARE HERE (Sprint 2.5) │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ Customer │ │  Order   │ │ Production   │ │
│  │ Service  │ │ Service  │ │ Service      │ │
│  ├──────────┤ ├──────────┤ ├──────────────┤ │
│  │Queue Svc │ │Rework Svc│ │              │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
├─────────────────────────────────────────────┤
│  Repository Layer (Sprint 2.4.5 + 2.4.6)    │
├─────────────────────────────────────────────┤
│  Database Schema (Sprint 2.2 + 2.4)         │
└─────────────────────────────────────────────┘
```

---

## 2. Service Inventory

| Service                   | File                                          | Methods                                                                                                                                                                                                                                                                                                                                                              | Events Emitted                                                                                                                                                                                                |
| ------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CustomerService           | `src/services/customer.service.ts`            | create, update, deactivate, findById, findByCode, validateExists, findActive                                                                                                                                                                                                                                                                                         | —                                                                                                                                                                                                             |
| OrderService              | `src/services/order.service.ts`               | create, update, approveOrder, cancelOrder, loadOrderLines, validateOrder, findById, findApproved                                                                                                                                                                                                                                                                     | OrderApprovedEvent                                                                                                                                                                                            |
| ProductionService         | `src/services/production.service.ts`          | createProductionOrder, findById, findByOrderLine, findPendingCutting, assignToStation, transferProduction, updateStatus, validateProduction                                                                                                                                                                                                                          | ProductionTransferredEvent                                                                                                                                                                                    |
| ProductionQueueService    | `src/services/production-queue.service.ts`    | createWorkQueue, selectMaterial, loadApprovedOrders, loadApprovedOrderLines, filterOrderLinesByMaterial, addOrderLineToBasket, removeOrderLineFromBasket, startQueue, completeQueue, getQueueStatistics, findActiveQueues                                                                                                                                            | QueueCreatedEvent, QueueStartedEvent, QueueCompletedEvent                                                                                                                                                     |
| ReworkService             | `src/services/rework.service.ts`              | createReworkOrder, createBreakageRework, getMergePreparation, findById, findOpenReworks, findByParentOrder                                                                                                                                                                                                                                                           | ReworkCreatedEvent, FireDepotAssignedEvent                                                                                                                                                                    |
| CuttingExecutionService   | `src/services/cutting-execution.service.ts`   | createSession, startSession, completeSession, pauseSession, resumeSession, cancelSession, loadWorkQueue, addItemToBasket, removeItemFromBasket, getSessionStatistics, findSession, listSessions, registerBreakage, getOrderLineCounters                                                                                                                              | CuttingSessionCreatedEvent, CuttingStartedEvent, CuttingCompletedEvent, CuttingPausedEvent, CuttingResumedEvent, CuttingCancelledEvent, BreakageRegisteredEvent                                               |
| ProductionTransferService | `src/services/production-transfer.service.ts` | initiateTransfer, completeTransfer, cancelTransfer, rejectTransfer, returnToPreviousStation, manualTransfer, assignReadyStation, getTransferHistory, getAllTransfers, getTransferStats, findTransferById                                                                                                                                                             | TransferInitiatedEvent, TransferCompletedEvent, TransferCancelledEvent, TransferRejectedEvent, ReadyStationAssignedEvent                                                                                      |
| StationOperationService   | `src/services/station-operation.service.ts`   | startOperation, completeOperation, cancelOperation, rejectOperation, validateOperation, validateLowE, calculateFurnaceCapacity, addToWaitingPool, removeFromWaitingPool, getWaitingPool, getWaitingPoolStatistics, loadWaitingProduction, getOperationHistory, getStationOperationHistory, getStationStatistics, getAllStationStatistics                             | GrindingStartedEvent, GrindingCompletedEvent, TemperStartedEvent, TemperCompletedEvent, InsulatingGlassStartedEvent, InsulatingGlassCompletedEvent, FurnaceCapacityCalculatedEvent, LowEValidationFailedEvent |
| QualityControlService     | `src/services/quality-control.service.ts`     | startInspection, completeInspection, rejectInspection, approveInspection, recordMeasurements, recordVisualInspection, recordNotes, getHistory, getStatistics, canProceedToReady                                                                                                                                                                                      | InspectionStartedEvent, InspectionPassedEvent, InspectionFailedEvent, InspectionRejectedEvent, ReworkRequestedEvent, ReadyApprovedEvent                                                                       |
| DispatchService           | `src/services/dispatch.service.ts`            | getReadyProductions, getReadyOrderLines, addToBasket, removeFromBasket, getBasket, getBasketStatistics, createDispatch, createDelivery, assignVehicle, assignDriver, assignDispatcher, loadVehicle, unloadVehicle, startShipment, completeDelivery, completePartialDelivery, cancelDispatch, getOrderLineDeliveryCounters, getDeliveryHistory, getDeliveryStatistics | DispatchCreatedEvent, VehicleAssignedEvent, LoadingStartedEvent, LoadingCompletedEvent, ShipmentStartedEvent, DeliveryCompletedEvent, PartialDeliveryCompletedEvent, DispatchCancelledEvent                   |

---

## 3. Domain Events

All events are defined as pure TypeScript interfaces in `src/services/events.ts`:

| Event                          | Trigger                                                      | Fields                                                                                                            |
| ------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| OrderApprovedEvent             | OrderService.approveOrder()                                  | eventType, orderId, customerId, approvedBy, approvedAt, lineCount                                                 |
| QueueCreatedEvent              | ProductionQueueService.createWorkQueue()                     | eventType, queueId, stationId, operationCode, createdAt                                                           |
| QueueStartedEvent              | ProductionQueueService.startQueue()                          | eventType, queueId, startedAt, itemCount                                                                          |
| QueueCompletedEvent            | ProductionQueueService.completeQueue()                       | eventType, queueId, completedAt, itemCount                                                                        |
| ProductionTransferredEvent     | ProductionService.transferProduction()                       | eventType, productionId, fromStation, toStation, transferredAt                                                    |
| ReworkCreatedEvent             | ReworkService.createReworkOrder()                            | eventType, reworkId, parentProductionId, reason, createdAt                                                        |
| CuttingSessionCreatedEvent     | CuttingExecutionService.createSession()                      | eventType, sessionId, queueId, stationId, materialType, createdAt                                                 |
| CuttingStartedEvent            | CuttingExecutionService.startSession()                       | eventType, sessionId, startedAt, itemCount                                                                        |
| CuttingCompletedEvent          | CuttingExecutionService.completeSession()                    | eventType, sessionId, completedAt, itemCount                                                                      |
| CuttingPausedEvent             | CuttingExecutionService.pauseSession()                       | eventType, sessionId, pausedAt                                                                                    |
| CuttingResumedEvent            | CuttingExecutionService.resumeSession()                      | eventType, sessionId, resumedAt                                                                                   |
| CuttingCancelledEvent          | CuttingExecutionService.cancelSession()                      | eventType, sessionId, cancelledAt, reason?                                                                        |
| BreakageRegisteredEvent        | CuttingExecutionService.registerBreakage()                   | eventType, breakageId, orderLineId, productionOrderId, brokenQuantity, reason, stationId, createdAt               |
| FireDepotAssignedEvent         | ReworkService.createBreakageRework()                         | eventType, fireDepotItemId, orderLineId, productionOrderId, brokenQuantity, ownership, assignedAt                 |
| TransferInitiatedEvent         | ProductionTransferService.initiateTransfer()                 | eventType, transferId, productionOrderId, fromStationId, toStationId, transferType, initiatedAt                   |
| TransferCompletedEvent         | ProductionTransferService.completeTransfer()                 | eventType, transferId, productionOrderId, toStationId, completedAt                                                |
| TransferCancelledEvent         | ProductionTransferService.cancelTransfer()                   | eventType, transferId, productionOrderId, cancelledAt, reason?                                                    |
| TransferRejectedEvent          | ProductionTransferService.rejectTransfer()                   | eventType, transferId, productionOrderId, rejectedAt, reason?                                                     |
| ReadyStationAssignedEvent      | ProductionTransferService.assignReadyStation()               | eventType, transferId, productionOrderId, stationId, assignedAt                                                   |
| GrindingStartedEvent           | StationOperationService.startOperation()                     | eventType, productionOrderId, stationId, startedAt, operatorId?, machineId?, shift?                               |
| GrindingCompletedEvent         | StationOperationService.completeOperation()                  | eventType, productionOrderId, stationId, completedAt                                                              |
| TemperStartedEvent             | StationOperationService.startOperation()                     | eventType, productionOrderId, stationId, startedAt, operatorId?, machineId?, shift?                               |
| TemperCompletedEvent           | StationOperationService.completeOperation()                  | eventType, productionOrderId, stationId, completedAt                                                              |
| InsulatingGlassStartedEvent    | StationOperationService.startOperation()                     | eventType, productionOrderId, stationId, startedAt, glassType, operatorId?, machineId?                            |
| InsulatingGlassCompletedEvent  | StationOperationService.completeOperation()                  | eventType, productionOrderId, stationId, completedAt                                                              |
| FurnaceCapacityCalculatedEvent | StationOperationService.startOperation() (Temper)            | eventType, productionOrderId, actualArea, effectiveArea, isTemperedIG, calculatedAt                               |
| LowEValidationFailedEvent      | StationOperationService.validateLowE()                       | eventType, productionOrderId, lowEType, targetStationId, reason, failedAt                                         |
| InspectionStartedEvent         | QualityControlService.startInspection()                      | eventType, inspectionId, productionOrderId, stationId, inspectionType, inspectorId, startedAt, machineId?, shift? |
| InspectionPassedEvent          | QualityControlService.completeInspection()                   | eventType, inspectionId, productionOrderId, inspectionType, result, passedAt, approvedBy?                         |
| InspectionFailedEvent          | QualityControlService.completeInspection()                   | eventType, inspectionId, productionOrderId, inspectionType, result, reason, failedAt                              |
| InspectionRejectedEvent        | QualityControlService.rejectInspection()                     | eventType, inspectionId, productionOrderId, reason, rejectedAt                                                    |
| ReworkRequestedEvent           | QualityControlService.completeInspection() (rework_required) | eventType, inspectionId, productionOrderId, reworkOrderId, reason, requestedAt                                    |
| ReadyApprovedEvent             | QualityControlService.approveInspection()                    | eventType, productionOrderId, inspectionId, approvedBy, approvedAt                                                |
| DispatchCreatedEvent           | DispatchService.createDispatch()                             | eventType, dispatchId, productionOrderId, orderLineId, customerId, orderId, createdAt                             |
| VehicleAssignedEvent           | DispatchService.assignVehicle()                              | eventType, deliveryId, vehicleId, driverId?, dispatcherId?, assignedAt                                            |
| LoadingStartedEvent            | DispatchService.loadVehicle()                                | eventType, deliveryId, itemCount, loadedBy?, startedAt                                                            |
| LoadingCompletedEvent          | DispatchService.unloadVehicle()                              | eventType, deliveryId, itemCount, completedAt                                                                     |
| ShipmentStartedEvent           | DispatchService.startShipment()                              | eventType, deliveryId, vehicleId, driverId?, startedAt                                                            |
| DeliveryCompletedEvent         | DispatchService.completeDelivery()                           | eventType, deliveryId, orderLineId, productionOrderId, deliveredBy?, deliveredAt                                  |
| PartialDeliveryCompletedEvent  | DispatchService.completePartialDelivery()                    | eventType, deliveryId, deliveredOrderLineIds, pendingOrderLineIds, deliveredAt                                    |
| DispatchCancelledEvent         | DispatchService.cancelDispatch()                             | eventType, deliveryId, reason?, cancelledAt                                                                       |

Events are published through the `EventPublisher` interface immediately after successful transaction commit — never before. This guarantees that no event is published if a transaction rolls back.

### Event Publishing Architecture

All event-returning service methods follow a strict two-phase pattern:

```
const _txResult = await withTenantSession(async (tx, ctx) => {
  // Phase 1: Business logic + DB mutations inside transaction
  // ...
  return { ..., events: [event] };
});
// Phase 2: Publish ONLY after transaction commits successfully
await this.eventPublisher.publishMany(_txResult.events);
return _txResult;
```

**Key Rules:**

- Events are NEVER published inside the `withTenantSession()` callback
- If the transaction throws, `publishMany()` is never reached
- In-memory-only operations (no DB transaction) publish directly

### Publisher Implementations

| Implementation           | File                                      | Purpose                                                                                        |
| ------------------------ | ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `LocalEventPublisher`    | `src/events/local-event-publisher.ts`     | Default production publisher — calls registered handlers via `onPublish()`                     |
| `InMemoryEventPublisher` | `src/events/in-memory-event-publisher.ts` | Test publisher — records events for assertions (`events[]`, `ofType<T>()`, `any()`, `reset()`) |

### Constructor Injection Pattern

### Production Wiring (Composition Root)

In production, the composition root (`apps/api/src/services.ts`) creates a **single** `LocalEventPublisher` instance and injects it into all 10 services:

```typescript
const eventPublisher = new LocalEventPublisher();

const customerService = new CustomerService(eventPublisher, db);
const orderService = new OrderService(repositories, eventPublisher, db);
// ... all 10 services receive the SAME eventPublisher instance
```

All 10 services accept `EventPublisher` before `db: any`:

```typescript
constructor(
  ...otherDependencies...,
  private readonly eventPublisher: EventPublisher,
  private readonly db: any
)
```

Services import from `"./events.js"` (not the barrel) to avoid circular dependencies.

---

### Background Job Integration (Architecture Ready)

The domain event system is architected to feed into the background job system (see `BACKGROUND_ARCHITECTURE.md`). In a future sprint, event handlers will enqueue background jobs for asynchronous processing — ERP sync, email, notifications, etc.

Current state: no business events are connected to the job system. The `BackgroundService` can receive events via its `enqueue()` API when integration is wired.

---

## 4. Business Rules

### 4.1 Order Approval Flow

```
approveOrder(orderId)
  ├── ❌ Reject if order.status === "cancelled"
  ├── ❌ Reject if order.status === "confirmed" (already approved)
  ├── ❌ Reject if customer not found or inactive
  ├── ❌ Reject if order has 0 lines (empty order)
  ├── ❌ Reject if any line lacks productId (missing product reference)
  ├── ✅ Update order.status = "confirmed"
  ├── ✅ Create 1 ProductionOrder per order line (status: pending, queue: cutting)
  └── ✅ Emit OrderApprovedEvent
```

### 4.2 Production Status Transitions

```
pending ──► in_progress
pending ──► cancelled
in_progress ──► completed (sets completedAt)
in_progress ──► broken
in_progress ──► rework
broken ──► rework
broken ──► cancelled
rework ──► in_progress
rework ──► completed
```

Station transfer (currentStationId updates) does NOT change production status — it only updates the station pointer. Status changes are orthogonal to station transfers.

### 4.3 Cutting Queue Rules

- Queue is **material-specific** — filtering is done via `filterOrderLinesByMaterial()`
- **Orders are never added to queue** — only ProductionOrders (one per order line) are added
- **Duplicate prevention**: same ProductionOrder cannot be added twice to the same queue
- **Cannot start empty queue**: requires ≥1 item in "waiting" status
- **Cannot complete unstarted queue**: requires ≥1 item in "in_progress" status
- On queue completion: all "in_progress" items → "done", associated ProductionOrders → "completed"

### 4.4 Cutting Session Rules

```
createSession() → CREATED
startSession()  → CREATED / READY → CUTTING
  ├── ❌ Reject if already completed or cancelled
  ├── ❌ Reject if basket is empty
  └── ✅ Transition to CUTTING
completeSession() → CUTTING / PAUSED → COMPLETED
  ├── ❌ Reject if not started
  ├── ❌ Reject if any item has broken status
  └── ✅ Transition to COMPLETED
pauseSession() → CUTTING → PAUSED
  ├── ❌ Reject if completed or cancelled
  └── ✅ Transition to PAUSED
resumeSession() → PAUSED → CUTTING
  ├── ❌ Reject if cancelled
  └── ✅ Transition to CUTTING
cancelSession() → any active → CANCELLED
  ├── ❌ Reject if completed
  ├── ❌ Reject if already cancelled
  └── ✅ Transition to CANCELLED
```

### 4.5 Work Basket Rules

- **Material verification**: item productType must match session materialType
- **Material consistency**: all items in basket must have same material type
- **Duplicate prevention**: same production order cannot be added twice
- **Cutting lock**: items cannot be added after cutting has started

### 4.6 Breakage Registration Rules

```
registerBreakage()
  ├── ❌ Reject if completed rework order
  ├── ❌ Reject if brokenQuantity > completedQuantity on order line
  ├── ❌ Reject if duplicate active rework exists (same production order)
  ├── ✅ Update order line counters: brokenHistory += brokenQuantity, missing += brokenQuantity
  ├── ✅ Update production order status: → "broken"
  ├── ✅ Create rework order with Fire Depot ownership
  ├── ✅ Create internal rework production order (status: pending, operation: cutting)
  ├── ✅ Emit BreakageRegisteredEvent
  └── ✅ Emit ReworkCreatedEvent + FireDepotAssignedEvent
```

### 4.7 Order Line Counter Rules

- **BrokenHistory** never decreases — append-only counter for production traceability
- **Missing** decreases after successful rework (future implementation)
- **Completed** increases after successful production
- **Delivered** tracks shipped quantity
- **missing = requested - completed** (implicitly)

### 4.8 Production Transfer Rules

```
initiateTransfer(productionOrderId, toStationId, transferType)
  ├── ❌ Reject if production order not found
  ├── ❌ Reject if toStationId is missing
  ├── ❌ Reject if production is completed
  ├── ❌ Reject if production is cancelled
  ├── ✅ Create TransferRecord (status: initiated)
  ├── ✅ Update production order currentStationId
  └── ✅ Emit TransferInitiatedEvent

completeTransfer(transferId)
  ├── ❌ Reject if transfer not found
  ├── ❌ Reject if transfer already completed/cancelled/rejected
  ├── ✅ Update transfer status → completed
  └── ✅ Emit TransferCompletedEvent

cancelTransfer(transferId)
  ├── ❌ Reject if transfer not found
  ├── ❌ Reject if transfer already completed
  ├── ✅ Update transfer status → cancelled
  └── ✅ Emit TransferCancelledEvent

rejectTransfer(transferId, reason?)
  ├── ❌ Reject if transfer not found
  ├── ❌ Reject if transfer already completed/cancelled
  ├── ✅ Update transfer status → rejected
  └── ✅ Emit TransferRejectedEvent
```

**Transfer Types (6 active):**

| Type               | Description                                         |
| ------------------ | --------------------------------------------------- |
| automatic          | System-initiated station-to-station transfer        |
| manual             | Operator-initiated transfer                         |
| rework_merge       | Transfer after rework completion back to production |
| correction         | Correction routing                                  |
| return_to_previous | Return to previous station                          |
| emergency          | Emergency station routing                           |

**Transfer Lifecycle:**

```
initiated ──► completed
initiated ──► cancelled
initiated ──► rejected
```

**History & Statistics:**

- Transfer history is immutable — stored in-memory as TransferRecord[]
- getTransferHistory() returns copies (immutable)
- getTransferStats() returns counts by type and status
- getAllTransfers() supports optional filters by type and status

### 4.9 Station Operation Rules (Sprint 2.5.3)

```
startOperation(productionOrderId, stationId)
  ├── ❌ Reject if production not found
  ├── ❌ Reject if production is completed or cancelled
  ├── ── Station-specific entry validation:
  │     ├── Grinding: warn if not from CUTTING or REWORK_CUTTING
  │     ├── Temper:  ❌ reject if grinding not completed
  │     │             ❌ reject if non-temperable Low-E
  │     ├── IG:       validate basic state
  │     └── Hole/Vent/CNC: flexible — no strict blocking
  ├── ✅ Remove from waiting pool (if present)
  ├── ✅ Update production order station
  ├── ✅ Record operation in history
  ├── ✅ Emit station-specific event (grinding.started, temper.started, etc.)
  └── ✅ If Temper: calculate furnace capacity + emit FurnaceCapacityCalculatedEvent

completeOperation(productionOrderId, stationId)
  ├── ❌ Reject if production not found
  ├── ❌ Reject if completed or cancelled
  ├── ✅ Record completion in history
  └── ✅ Emit station-specific completion event
```

**Grinding Station Rules:**

- Receives from: CUTTING, REWORK_CUTTING
- Sends to: TEMPER, READY, MANUAL_TRANSFER
- Breakage follows existing Rework workflow

**Temper Station Rules:**

- Production MUST have grinding completed before entering
- Non-temperable Low-E glass cannot enter Temper
- Furnace capacity: normal glass = actual area, tempered IG = 2 × actual area
- Furnace capacity is a pure calculation — no optimization algorithm

**Insulating Glass Rules:**

- Supports: normal IG, tempered IG, Low-E IG
- Validation only — no inventory consumption

**Low-E Validation:**

- System prevents sending non-temperable Low-E to Temper
- LowEType: "temperable" | "non_temperable"

**Hole / Vent / CNC:**

- Flexible intermediate operations between stations
- No strict entry validation — routing remains configurable

**Waiting Pools:**

- In-memory pools per station
- Operations: add, remove, get, statistics
- loadWaitingProduction() returns production records with metadata

### 4.10 Quality Control Rules (Sprint 2.5.4)

```
startInspection(productionOrderId, inspectionType)
  ├── ❌ Reject if production not found
  ├── ❌ Reject if completed or cancelled
  ├── ✅ Create InspectionRecord (result: in_progress)
  └── ✅ Emit InspectionStartedEvent

recordMeasurements(inspectionId, measurement)
  ├── ❌ Reject if inspection not found
  ├── ❌ Reject if inspection already completed
  └── ✅ Store dimensional measurements (width, height, diagonal, thickness, area, tolerance)

recordVisualInspection(inspectionId, details)
  ├── ❌ Reject if inspection not found
  ├── ❌ Reject if inspection already completed
  └── ✅ Store visual inspection details

recordNotes(inspectionId, notes)
  ├── ❌ Reject if inspection not found
  └── ✅ Append to existing notes

completeInspection(inspectionId, result)
  ├── ❌ Reject if inspection not found
  ├── ❌ Reject if already completed
  ├── ── Result handling:
  │     ├── PASS:  emit InspectionPassedEvent → eligible for READY
  │     ├── CONDITIONAL_PASS: emit InspectionPassedEvent → requires approval for READY
  │     ├── FAIL:  emit InspectionFailedEvent
  │     ├── REWORK_REQUIRED:
  │     │     ├── ❌ Reject if unresolved rework exists (no duplicates)
  │     │     ├── ✅ Create rework order via rework repository
  │     │     ├── ✅ Emit ReworkRequestedEvent + InspectionFailedEvent
  │     └── SCRAP:
  │           ├── ✅ Update production status → "scrapped"
  │           └── ✅ Emit InspectionFailedEvent
  ├── ✅ Update InspectionRecord result
  └── ✅ All within single transaction

rejectInspection(inspectionId, reason)
  ├── ❌ Reject if inspection not found
  ├── ✅ Mark inspection as rejected
  └── ✅ Emit InspectionRejectedEvent

approveInspection(inspectionId, approvedBy)
  ├── ❌ Reject if inspection not found
  ├── ❌ Reject if result !== "conditional_pass"
  ├── ❌ Reject if already approved
  ├── ❌ Reject if completed/cancelled production
  ├── ✅ Record approval (approvedAt, approvedBy)
  └── ✅ Emit ReadyApprovedEvent

canProceedToReady(productionOrderId)
  ├── ❌ No inspection records found
  ├── ✅ Has PASS inspection result
  ├── ✅ Has approved conditional pass
  └── ❌ Otherwise
```

**Inspection Types (6 supported):** visual, dimension, edge, temper, insulating_glass, final

**Inspection Results (5 supported):** pass, fail, conditional_pass, rework_required, scrap

**Measurements (manual entry only — no machine integration):** width, height, diagonal, thickness, area, tolerance, measuredBy, measuredAt, notes

**Temper Inspection details:** visualBreakage, edgeQuality, surfaceQuality, rollerMarks, stressObservation, notes

**Insulating Glass Inspection details:** spacer, sealQuality, lowEOrientation, gasInformation, visualContamination, alignment

**READY Validation Rules:**

- PASS inspection → eligible for READY
- Approved conditional pass → eligible for READY
- Unapproved conditional pass → NOT eligible (requires approval)
- No inspection → NOT eligible

### 4.11 Rework Merge Rules

```
mergeRework(reworkOrderId, completedQuantity?)
  ├── ❌ Reject if rework not found
  ├── ❌ Reject if parent production not found
  ├── ❌ Reject if parent order line not found (missing line reference)
  ├── ❌ Reject if missing quantity === 0 (line fully completed already)
  ├── ❌ Reject if rework already completed (no duplicate merge)
  ├── ❌ Reject if parent production is cancelled
  ├── ❌ Reject if parent order is completed (if parent order exists)
  ├── ❌ Reject if unresolved active rework exists for same parent
  ├── ✅ Increase completedQuantity on order line (default: 1, capped at missing)
  ├── ✅ Close rework production order (status → "completed")
  ├── ✅ Mark rework as completed (reworkStatus → "completed")
  ├── ✅ Emit ReworkMergedEvent
  └── ✅ All within single transaction

**Counter semantics during merge:**
- completedQuantity increases by merge amount (capped at missing)
- brokenQuantity is NEVER modified during merge (immutable breakage history)
- missing = quantity - completed (implicit decrease)
```

## 5. Transaction Strategy

All mutations are wrapped in `withTransaction()` from `src/db/transactions.ts`:

```typescript
async approveOrder(orderId: string): Promise<{...}> {
  return withTransaction(async () => {
    // All operations within this callback share one DB transaction
    // In FakeDb tests, executes synchronously without transaction
  });
}
```

This ensures atomicity: if any step fails, the entire operation rolls back.

---

## 6. Vertical Slice #1: Customer → Order → Approval → Cutting Queue

The complete production workflow that serves as the integration test:

```
1. Create Customer (active)
2. Create Order (draft) with 2 lines (float glass, low-e glass)
3. Approve Order
   ├── Status: draft → confirmed
   ├── 2 ProductionOrders created (one per line, queue: cutting)
   └── OrderApprovedEvent emitted
4. Load Approved Orders → returns the confirmed order
5. Select Material → "float"
6. Filter Lines by Material → returns 1 float line
7. Create Work Queue (station: cutting, operation: cutting)
8. Add Production Order (from float line) to Basket
9. Start Queue → QueueStartedEvent
10. Complete Queue → QueueCompletedEvent
11. Verify: ProductionOrder.status === "completed"
```

### 4.11 Dispatch & Delivery Rules (Sprint 2.5.5)

```text
getReadyProductions(filter?)
  ├── ✅ Returns all productions that passed quality control (canProceedToReady === true)
  ├── ✅ Filterable by: customerId, orderId, orderLineId, productType, minAreaM2, maxAreaM2
  └── ✅ Excludes completed, cancelled, or scrapped productions

addToBasket(productionOrderId)
  ├── ❌ Reject if production already in basket (duplicate prevention)
  ├── ❌ Reject if production not found
  ├── ❌ Reject if production not READY (canProceedToReady === false)
  ├── ❌ Reject if production is cancelled
  └── ✅ Add to in-memory basket with metadata (customer, order, product type, area)

removeFromBasket(productionOrderId)
  ├── ❌ Reject if production not in basket
  └── ✅ Remove from basket

createDelivery(input)
  ├── ❌ Reject if any production not found
  ├── ❌ Reject if any production is cancelled
  ├── ❌ Reject if any production not READY
  ├── ❌ Reject if any production belongs to different customer (wrong customer check)
  ├── ✅ Remove delivered productions from basket
  └── ✅ Create DeliveryRecord with status "created"

assignVehicle(deliveryId, vehicleId, driverId?, dispatcherId?)
  ├── ❌ Reject if delivery not found
  ├── ❌ Reject if delivery status is not "created" or "loading"
  └── ✅ Update delivery with vehicle, driver, dispatcher info

loadVehicle(deliveryId, loadedBy?)
  ├── ❌ Reject if delivery not found
  ├── ❌ Reject if delivery status is not "created"
  └── ✅ Transition: "created" → "loading"

unloadVehicle(deliveryId)
  ├── ❌ Reject if delivery not found
  ├── ❌ Reject if delivery status is not "loading"
  └── ✅ Transition: "loading" → "ready_to_ship"

startShipment(deliveryId)
  ├── ❌ Reject if delivery not found
  ├── ❌ Reject if delivery status is not "ready_to_ship"
  └── ✅ Transition: "ready_to_ship" → "in_transit"

completeDelivery(deliveryId, deliveredBy?)
  ├── ❌ Reject if delivery not found
  ├── ❌ Reject if delivery status is not "in_transit"
  ├── ✅ Update order line deliveredQuantity counter
  └── ✅ Transition: "in_transit" → "delivered"

completePartialDelivery(deliveryId, deliveredOrderLineIds, deliveredBy?)
  ├── ❌ Reject if delivery not found
  ├── ❌ Reject if delivery status is not "in_transit"
  ├── ✅ Update counters only for delivered order line IDs
  └── ✅ Transition: "in_transit" → "partially_delivered"

cancelDispatch(deliveryId, reason?)
  ├── ❌ Reject if delivery not found
  ├── ❌ Reject if already delivered
  ├── ❌ Reject if already partially delivered
  ├── ❌ Reject if already cancelled
  └── ✅ Transition: * → "cancelled"

getOrderLineDeliveryCounters(orderLineId)
  ├── requested = orderLine.quantity
  ├── ready = number of READY productions for this order line
  ├── loaded = productions in deliveries with status >= loading
  ├── delivered = orderLine.deliveredQuantity
  └── remaining = max(0, requested - delivered)

Delivery Status Transitions:
  created ──► loading ──► ready_to_ship ──► in_transit ──► delivered
                                                                 └──► partially_delivered
  * ──► cancelled (except delivered, partially_delivered)
```

---

## 7. File Map

```
packages/db/src/
  services/
    events.ts                        # Domain event interfaces + EventPublisher (42 events)
    customer.service.ts              # Customer lifecycle
    order.service.ts                 # Order lifecycle + approval
    production.service.ts            # Production order lifecycle
    production-queue.service.ts      # Cutting queue management
    rework.service.ts                # Rework order creation + breakage rework + merge prep + mergeRework
    cutting-execution.service.ts     # Cutting session lifecycle + work basket + breakage
    production-transfer.service.ts   # Production transfer lifecycle + history + statistics
    station-operation.service.ts     # Station operation lifecycle + rules + waiting pools
    quality-control.service.ts       # Quality inspection lifecycle + measurements + READY validation
    dispatch.service.ts              # Dispatch basket + delivery lifecycle + vehicle assignment + counters + history
    index.ts                         # Exports all services + events + transfer types + station + quality + dispatch types
  index.ts                           # Updated: exports ./services/index.js

packages/db/test/
  service.test.ts                    # 188 tests across 10 services + 3 vertical slices
```

---

## 8. Architecture Freeze Compliance

Sprint 2.5.0 through 2.5.5 strictly observe the architecture freeze:

| Layer                 | Changed? | Verification                                                                                                                                                                                                              |
| --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema (`schema.ts`)  | ❌ No    | Not modified                                                                                                                                                                                                              |
| Migrations            | ❌ No    | Not modified                                                                                                                                                                                                              |
| Repositories          | ❌ No    | Not modified                                                                                                                                                                                                              |
| Repository base class | ❌ No    | Not modified                                                                                                                                                                                                              |
| Infrastructure        | ❌ No    | Not modified                                                                                                                                                                                                              |
| Services              | ✅ Yes   | 10 services total (9 existing + 1 new: DispatchService)                                                                                                                                                                   |
| Test infrastructure   | ✅ Yes   | FakeDb per-table fix (2.5.0), test helper updates (2.5.1), service reference simplifications (2.5.2), station-aware helper additions (2.5.3), quality control helper additions (2.5.4), dispatch helper additions (2.5.5) |
