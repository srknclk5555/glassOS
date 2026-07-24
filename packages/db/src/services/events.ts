// ─── Sprint 2.5.0 — Domain Event Contracts ───────────────────────────────────
// Lightweight event contracts for future event bus integration.
// These are pure data contracts — no event bus implementation.
// ─── Sprint 2.5.1 — Additional Event Contracts ───────────────────────────────

export interface OrderApprovedEvent {
  readonly eventType: "order.approved";
  readonly orderId: string;
  readonly orderNumber: string;
  readonly customerId: string;
  readonly approvedAt: Date;
  readonly approvedBy?: string;
  readonly lineCount: number;
}

export interface QueueCreatedEvent {
  readonly eventType: "queue.created";
  readonly queueId: string;
  readonly stationId: string;
  readonly operationCode: string;
  readonly createdAt: Date;
}

export interface QueueStartedEvent {
  readonly eventType: "queue.started";
  readonly queueId: string;
  readonly startedAt: Date;
  readonly itemCount: number;
}

export interface QueueCompletedEvent {
  readonly eventType: "queue.completed";
  readonly queueId: string;
  readonly completedAt: Date;
  readonly itemCount: number;
}

export interface ProductionTransferredEvent {
  readonly eventType: "production.transferred";
  readonly productionOrderId: string;
  readonly fromStationId: string | null;
  readonly toStationId: string;
  readonly transferredAt: Date;
}

export interface ReworkCreatedEvent {
  readonly eventType: "rework.created";
  readonly reworkOrderId: string;
  readonly parentProductionOrderId: string;
  readonly reason: string;
  readonly createdAt: Date;
}

// ─── Sprint 2.5.1 Events ─────────────────────────────────────────────────────

export interface CuttingSessionCreatedEvent {
  readonly eventType: "cutting.session.created";
  readonly sessionId: string;
  readonly queueId: string;
  readonly stationId: string;
  readonly machineId?: string;
  readonly operatorId?: string;
  readonly materialType: string;
  readonly createdAt: Date;
}

export interface CuttingStartedEvent {
  readonly eventType: "cutting.started";
  readonly sessionId: string;
  readonly startedAt: Date;
  readonly itemCount: number;
}

export interface CuttingCompletedEvent {
  readonly eventType: "cutting.completed";
  readonly sessionId: string;
  readonly completedAt: Date;
  readonly itemCount: number;
}

export interface CuttingPausedEvent {
  readonly eventType: "cutting.paused";
  readonly sessionId: string;
  readonly pausedAt: Date;
}

export interface CuttingResumedEvent {
  readonly eventType: "cutting.resumed";
  readonly sessionId: string;
  readonly resumedAt: Date;
}

export interface CuttingCancelledEvent {
  readonly eventType: "cutting.cancelled";
  readonly sessionId: string;
  readonly cancelledAt: Date;
  readonly reason?: string;
}

export interface BreakageRegisteredEvent {
  readonly eventType: "breakage.registered";
  readonly breakageId: string;
  readonly orderLineId: string;
  readonly productionOrderId: string;
  readonly brokenQuantity: number;
  readonly reason: string;
  readonly stationId: string;
  readonly machineId?: string;
  readonly operatorId?: string;
  readonly shift?: string;
  readonly createdAt: Date;
}

export interface FireDepotAssignedEvent {
  readonly eventType: "firedepot.assigned";
  readonly fireDepotItemId: string;
  readonly orderLineId: string;
  readonly productionOrderId: string;
  readonly brokenQuantity: number;
  readonly ownership: "reusable" | "scrap" | "unknown";
  readonly assignedAt: Date;
}

// ─── Sprint 2.5.2 Events — Production Transfer & Merge ────────────────────────

export interface TransferInitiatedEvent {
  readonly eventType: "transfer.initiated";
  readonly transferId: string;
  readonly productionOrderId: string;
  readonly fromStationId: string | null;
  readonly toStationId: string;
  readonly transferType: "automatic" | "manual" | "rework_merge" | "correction" | "return_to_previous" | "emergency";
  readonly operatorId?: string;
  readonly machineId?: string;
  readonly shift?: string;
  readonly reason?: string;
  readonly initiatedAt: Date;
}

export interface TransferCompletedEvent {
  readonly eventType: "transfer.completed";
  readonly transferId: string;
  readonly productionOrderId: string;
  readonly toStationId: string;
  readonly completedAt: Date;
}

export interface TransferCancelledEvent {
  readonly eventType: "transfer.cancelled";
  readonly transferId: string;
  readonly productionOrderId: string;
  readonly reason?: string;
  readonly cancelledAt: Date;
}

export interface TransferRejectedEvent {
  readonly eventType: "transfer.rejected";
  readonly transferId: string;
  readonly productionOrderId: string;
  readonly reason?: string;
  readonly rejectedAt: Date;
}

export interface ReworkMergedEvent {
  readonly eventType: "rework.merged";
  readonly reworkOrderId: string;
  readonly parentProductionOrderId: string;
  readonly orderLineId: string;
  readonly completedIncrease: number;
  readonly mergedAt: Date;
}

export interface ReadyStationAssignedEvent {
  readonly eventType: "ready.station.assigned";
  readonly productionOrderId: string;
  readonly stationId: string;
  readonly assignedAt: Date;
}

// ─── Sprint 2.5.3 Events — Station Operations ────────────────────────────────

export interface GrindingStartedEvent {
  readonly eventType: "grinding.started";
  readonly productionOrderId: string;
  readonly stationId: string;
  readonly startedAt: Date;
  readonly operatorId?: string;
  readonly machineId?: string;
  readonly shift?: string;
}

export interface GrindingCompletedEvent {
  readonly eventType: "grinding.completed";
  readonly productionOrderId: string;
  readonly stationId: string;
  readonly completedAt: Date;
}

export interface TemperStartedEvent {
  readonly eventType: "temper.started";
  readonly productionOrderId: string;
  readonly stationId: string;
  readonly startedAt: Date;
  readonly operatorId?: string;
  readonly machineId?: string;
  readonly shift?: string;
}

export interface TemperCompletedEvent {
  readonly eventType: "temper.completed";
  readonly productionOrderId: string;
  readonly stationId: string;
  readonly completedAt: Date;
}

export interface InsulatingGlassStartedEvent {
  readonly eventType: "insulating_glass.started";
  readonly productionOrderId: string;
  readonly stationId: string;
  readonly startedAt: Date;
  readonly glassType: "normal" | "tempered" | "low_e";
  readonly operatorId?: string;
  readonly machineId?: string;
}

export interface InsulatingGlassCompletedEvent {
  readonly eventType: "insulating_glass.completed";
  readonly productionOrderId: string;
  readonly stationId: string;
  readonly completedAt: Date;
}

export interface FurnaceCapacityCalculatedEvent {
  readonly eventType: "furnace.capacity.calculated";
  readonly productionOrderId: string;
  readonly actualArea: number;
  readonly effectiveArea: number;
  readonly isTemperedIG: boolean;
  readonly calculatedAt: Date;
}

export interface LowEValidationFailedEvent {
  readonly eventType: "low_e.validation.failed";
  readonly productionOrderId: string;
  readonly lowEType: string;
  readonly targetStationId: string;
  readonly reason: string;
  readonly failedAt: Date;
}

// ─── Sprint 2.5.4 Events — Quality Control ───────────────────────────────────

export interface InspectionStartedEvent {
  readonly eventType: "inspection.started";
  readonly inspectionId: string;
  readonly productionOrderId: string;
  readonly stationId: string;
  readonly inspectionType: string;
  readonly inspectorId: string;
  readonly machineId?: string;
  readonly shift?: string;
  readonly startedAt: Date;
}

export interface InspectionPassedEvent {
  readonly eventType: "inspection.passed";
  readonly inspectionId: string;
  readonly productionOrderId: string;
  readonly inspectionType: string;
  readonly result: "pass" | "conditional_pass";
  readonly passedAt: Date;
  readonly approvedBy?: string;
}

export interface InspectionFailedEvent {
  readonly eventType: "inspection.failed";
  readonly inspectionId: string;
  readonly productionOrderId: string;
  readonly inspectionType: string;
  readonly result: "fail" | "scrap";
  readonly reason: string;
  readonly failedAt: Date;
}

export interface InspectionRejectedEvent {
  readonly eventType: "inspection.rejected";
  readonly inspectionId: string;
  readonly productionOrderId: string;
  readonly reason: string;
  readonly rejectedAt: Date;
}

export interface ReworkRequestedEvent {
  readonly eventType: "rework.requested";
  readonly inspectionId: string;
  readonly productionOrderId: string;
  readonly reworkOrderId: string;
  readonly reason: string;
  readonly requestedAt: Date;
}

export interface ReadyApprovedEvent {
  readonly eventType: "ready.approved";
  readonly productionOrderId: string;
  readonly inspectionId: string;
  readonly approvedBy: string;
  readonly approvedAt: Date;
}

// ─── Sprint 2.5.5 Events — Dispatch & Delivery ──────────────────────────────

export interface DispatchCreatedEvent {
  readonly eventType: "dispatch.created";
  readonly dispatchId: string;
  readonly productionOrderId: string;
  readonly orderLineId: string;
  readonly customerId: string;
  readonly orderId: string;
  readonly createdAt: Date;
}

export interface VehicleAssignedEvent {
  readonly eventType: "vehicle.assigned";
  readonly deliveryId: string;
  readonly vehicleId: string;
  readonly driverId?: string;
  readonly dispatcherId?: string;
  readonly assignedAt: Date;
}

export interface LoadingStartedEvent {
  readonly eventType: "loading.started";
  readonly deliveryId: string;
  readonly itemCount: number;
  readonly loadedBy?: string;
  readonly startedAt: Date;
}

export interface LoadingCompletedEvent {
  readonly eventType: "loading.completed";
  readonly deliveryId: string;
  readonly itemCount: number;
  readonly completedAt: Date;
}

export interface ShipmentStartedEvent {
  readonly eventType: "shipment.started";
  readonly deliveryId: string;
  readonly vehicleId: string;
  readonly driverId?: string;
  readonly startedAt: Date;
}

export interface DeliveryCompletedEvent {
  readonly eventType: "delivery.completed";
  readonly deliveryId: string;
  readonly orderLineId: string;
  readonly productionOrderId: string;
  readonly deliveredBy?: string;
  readonly deliveredAt: Date;
}

export interface PartialDeliveryCompletedEvent {
  readonly eventType: "delivery.partial";
  readonly deliveryId: string;
  readonly deliveredOrderLineIds: string[];
  readonly pendingOrderLineIds: string[];
  readonly deliveredAt: Date;
}

export interface DispatchCancelledEvent {
  readonly eventType: "dispatch.cancelled";
  readonly deliveryId: string;
  readonly reason?: string;
  readonly cancelledAt: Date;
}

// ─── Sprint 2.8.0 — Machine Lifecycle Events ────────────────────────────────

export interface MachineCreatedEvent {
  readonly eventType: "machine.created";
  readonly machineId: string;
  readonly machineCode: string;
  readonly name: string;
  readonly machineType: string;
  readonly createdAt: Date;
}

export interface MachineUpdatedEvent {
  readonly eventType: "machine.updated";
  readonly machineId: string;
  readonly changes: string[];
  readonly updatedAt: Date;
}

export interface MachineDeactivatedEvent {
  readonly eventType: "machine.deactivated";
  readonly machineId: string;
  readonly deactivatedAt: Date;
}

export interface MachineStatusChangedEvent {
  readonly eventType: "machine.status.changed";
  readonly machineId: string;
  readonly fromStatus: string;
  readonly toStatus: string;
  readonly changedAt: Date;
}

// ─── Sprint 2.6.5A — Customer Lifecycle Events ───────────────────────────────

export interface CustomerCreatedEvent {
  readonly eventType: "customer.created";
  readonly customerId: string;
  readonly customerCode: string;
  readonly name: string;
  readonly createdAt: Date;
}

export interface CustomerUpdatedEvent {
  readonly eventType: "customer.updated";
  readonly customerId: string;
  readonly changes: string[];
  readonly updatedAt: Date;
}

export interface CustomerDeactivatedEvent {
  readonly eventType: "customer.deactivated";
  readonly customerId: string;
  readonly deactivatedAt: Date;
}

// ─── Event Union Type (for future dispatcher) ────────────────────────────────

export type DomainEvent =
  | CustomerCreatedEvent
  | CustomerUpdatedEvent
  | CustomerDeactivatedEvent
  | OrderApprovedEvent
  | QueueCreatedEvent
  | QueueStartedEvent
  | QueueCompletedEvent
  | ProductionTransferredEvent
  | ReworkCreatedEvent
  | CuttingSessionCreatedEvent
  | CuttingStartedEvent
  | CuttingCompletedEvent
  | CuttingPausedEvent
  | CuttingResumedEvent
  | CuttingCancelledEvent
  | BreakageRegisteredEvent
  | FireDepotAssignedEvent
  | TransferInitiatedEvent
  | TransferCompletedEvent
  | TransferCancelledEvent
  | TransferRejectedEvent
  | ReworkMergedEvent
  | ReadyStationAssignedEvent
  | GrindingStartedEvent
  | GrindingCompletedEvent
  | TemperStartedEvent
  | TemperCompletedEvent
  | InsulatingGlassStartedEvent
  | InsulatingGlassCompletedEvent
  | FurnaceCapacityCalculatedEvent
  | LowEValidationFailedEvent
  | InspectionStartedEvent
  | InspectionPassedEvent
  | InspectionFailedEvent
  | InspectionRejectedEvent
  | ReworkRequestedEvent
  | ReadyApprovedEvent
  | DispatchCreatedEvent
  | VehicleAssignedEvent
  | LoadingStartedEvent
  | LoadingCompletedEvent
  | ShipmentStartedEvent
  | DeliveryCompletedEvent
  | PartialDeliveryCompletedEvent
  | DispatchCancelledEvent
  | MachineCreatedEvent
  | MachineUpdatedEvent
  | MachineDeactivatedEvent
  | MachineStatusChangedEvent
  | RecipeCreatedEvent
  | RecipeUpdatedEvent
  | RecipeArchivedEvent
  | RecipeRestoredEvent
  | RecipeVersionCreatedEvent
  | RecipeClonedEvent;

// ─── Sprint 7.0 — Recipe Events ─────────────────────────────────────────────

export interface RecipeCreatedEvent {
  readonly eventType: "recipe.created";
  readonly recipeId: string;
  readonly recipeCode: string;
  readonly name: string;
  readonly createdAt: Date;
}

export interface RecipeUpdatedEvent {
  readonly eventType: "recipe.updated";
  readonly recipeId: string;
  readonly recipeCode: string;
  readonly changedFields: string[];
  readonly updatedAt: Date;
}

export interface RecipeArchivedEvent {
  readonly eventType: "recipe.archived";
  readonly recipeId: string;
  readonly recipeCode: string;
  readonly archivedAt: Date;
}

export interface RecipeRestoredEvent {
  readonly eventType: "recipe.restored";
  readonly recipeId: string;
  readonly recipeCode: string;
  readonly restoredAt: Date;
}

export interface RecipeVersionCreatedEvent {
  readonly eventType: "recipe.version.created";
  readonly recipeId: string;
  readonly recipeCode: string;
  readonly versionNumber: number;
  readonly createdAt: Date;
}

export interface RecipeClonedEvent {
  readonly eventType: "recipe.cloned";
  readonly recipeId: string;
  readonly sourceRecipeId: string;
  readonly newRecipeCode: string;
  readonly createdAt: Date;
}

// ─── Event Publisher Interface (for future DI) ───────────────────────────────

export interface EventPublisher {
  /** Publish a single domain event. */
  publish(event: DomainEvent): void | Promise<void>;

  /** Publish multiple domain events at once (order is preserved). */
  publishMany(events: DomainEvent[]): void | Promise<void>;
}
