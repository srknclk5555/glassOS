import { describe, expect, it } from "vitest";
import { ProductionQueueEngine } from "../src/index.js";

describe("ProductionQueueEngine", () => {
  it("creates an operation queue and exposes waiting items", () => {
    const cuttingOperation = ProductionQueueEngine.createOperation("CUTTING", "Cutting", 1);
    const queue = ProductionQueueEngine.createQueue(cuttingOperation);
    const item = ProductionQueueEngine.createQueueItem({
      orderId: "order-1",
      orderLineId: "line-1",
      operationCode: "CUTTING",
      materialId: "mat-1",
    });

    const queued = ProductionQueueEngine.enqueueItem(queue, item);
    const waitingItems = ProductionQueueEngine.getWaitingItems(queued);

    expect(waitingItems).toHaveLength(1);
    expect(waitingItems[0]?.status).toBe("WAITING");
  });

  it("moves a completed item to the next operation queue", () => {
    const cuttingOperation = ProductionQueueEngine.createOperation("CUTTING", "Cutting", 1);
    const grindingOperation = ProductionQueueEngine.createOperation("GRINDING", "Grinding", 2);
    const cuttingQueue = ProductionQueueEngine.createQueue(cuttingOperation);
    const grindingQueue = ProductionQueueEngine.createQueue(grindingOperation);
    const item = ProductionQueueEngine.createQueueItem({
      orderId: "order-1",
      orderLineId: "line-1",
      operationCode: "CUTTING",
      materialId: "mat-1",
    });

    const queued = ProductionQueueEngine.enqueueItem(cuttingQueue, item);
    const result = ProductionQueueEngine.completeItem(
      queued,
      item.itemId,
      [cuttingOperation, grindingOperation],
      grindingQueue
    );

    expect(result.currentQueue.items[0]?.status).toBe("COMPLETED");
    expect(result.nextQueue?.items[0]?.status).toBe("READY");
    expect(result.nextQueue?.items[0]?.operationCode).toBe("GRINDING");
  });

  it("calculates partial and full progress for an order line", () => {
    const cuttingOperation = ProductionQueueEngine.createOperation("CUTTING", "Cutting", 1);
    const grindingOperation = ProductionQueueEngine.createOperation("GRINDING", "Grinding", 2);
    const operations = [cuttingOperation, grindingOperation];

    const cuttingItem = ProductionQueueEngine.createQueueItem({
      orderId: "order-1",
      orderLineId: "line-1",
      operationCode: "CUTTING",
      materialId: "mat-1",
      completedOperations: ["CUTTING"],
      status: "COMPLETED",
    });

    const grindingItem = ProductionQueueEngine.createQueueItem({
      orderId: "order-1",
      orderLineId: "line-1",
      operationCode: "GRINDING",
      materialId: "mat-1",
      status: "WAITING",
    });

    const partial = ProductionQueueEngine.calculateOrderProgress([cuttingItem, grindingItem], operations);
    expect(partial.percentage).toBe(50);
    expect(partial.isCompleted).toBe(false);

    const completed = ProductionQueueEngine.calculateOrderProgress([
      { ...cuttingItem, status: "COMPLETED" as const },
      { ...grindingItem, status: "COMPLETED" as const, completedOperations: ["CUTTING", "GRINDING"] },
    ], operations);

    expect(completed.percentage).toBe(100);
    expect(completed.isCompleted).toBe(true);
  });

  it("supports multi-operation order tracking", () => {
    const operations = [
      ProductionQueueEngine.createOperation("CUTTING", "Cutting", 1),
      ProductionQueueEngine.createOperation("GRINDING", "Grinding", 2),
      ProductionQueueEngine.createOperation("QUALITY_CONTROL", "Quality Control", 3),
    ];

    const lineItems = [
      ProductionQueueEngine.createQueueItem({ orderId: "order-2", orderLineId: "line-2", operationCode: "CUTTING", materialId: "mat-2", status: "COMPLETED", completedOperations: ["CUTTING"] }),
      ProductionQueueEngine.createQueueItem({ orderId: "order-2", orderLineId: "line-2", operationCode: "GRINDING", materialId: "mat-2", status: "IN_PROGRESS" }),
      ProductionQueueEngine.createQueueItem({ orderId: "order-2", orderLineId: "line-2", operationCode: "QUALITY_CONTROL", materialId: "mat-2", status: "WAITING" }),
    ];

    const progress = ProductionQueueEngine.calculateOrderProgress(lineItems, operations);

    expect(progress.completedOperations).toBe(1);
    expect(progress.totalOperations).toBe(3);
    expect(progress.percentage).toBe(33);
    expect(progress.currentOperation).toBe("GRINDING");
  });
});
