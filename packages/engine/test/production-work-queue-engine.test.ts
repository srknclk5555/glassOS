import { describe, expect, it } from "vitest";
import { ProductionWorkQueueEngine } from "../src/index.js";

describe("ProductionWorkQueueEngine", () => {
  it("creates a work queue with material filtering and barcode additions", () => {
    const material = ProductionWorkQueueEngine.createMaterial({
      code: "MAT-8G",
      name: "8 mm Grey Float",
    });

    const machine = ProductionWorkQueueEngine.createMachine({
      code: "M-01",
      name: "Cutting Saw A",
      station: "CUTTING",
    });

    const operator = ProductionWorkQueueEngine.createOperator({
      code: "OP-01",
      name: "Ali Demir",
      station: "CUTTING",
    });

    const session = ProductionWorkQueueEngine.createSession({
      station: "CUTTING",
      machineId: machine.machineId,
      materialId: material.materialId,
      operatorId: operator.operatorId,
    });

    const queue = ProductionWorkQueueEngine.createQueue({
      session,
      station: session.station,
      machineId: session.machineId,
      materialId: session.materialId,
      operatorId: session.operatorId,
    });

    const matchingItem = ProductionWorkQueueEngine.createItem({
      orderId: "ORDER-1",
      barcode: "BAR-100",
      materialId: material.materialId,
      plannedSheetCount: 3,
      estimatedAreaM2: 12,
    });

    const nonMatchingItem = ProductionWorkQueueEngine.createItem({
      orderId: "ORDER-2",
      barcode: "BAR-200",
      materialId: "MAT-OTHER",
      plannedSheetCount: 2,
      estimatedAreaM2: 8,
    });

    const withItems = ProductionWorkQueueEngine.addItem(queue, matchingItem);
    const withMoreItems = ProductionWorkQueueEngine.addItem(withItems, nonMatchingItem);
    const scanned = ProductionWorkQueueEngine.addScannedBarcode(withMoreItems, {
      orderId: "ORDER-3",
      barcode: "BAR-300",
      materialId: material.materialId,
      plannedSheetCount: 1,
      estimatedAreaM2: 4,
    });

    const filtered = ProductionWorkQueueEngine.filterItemsByMaterial(scanned.items, material.materialId);

    expect(filtered).toHaveLength(2);
    expect(scanned.items).toHaveLength(3);
  });

  it("prevents duplicate orders and barcodes and tracks status transitions", () => {
    const queue = ProductionWorkQueueEngine.createQueue({
      session: ProductionWorkQueueEngine.createSession({
        station: "CUTTING",
        machineId: "M-02",
        materialId: "MAT-2",
        operatorId: "OP-02",
      }),
      station: "CUTTING",
      machineId: "M-02",
      materialId: "MAT-2",
      operatorId: "OP-02",
    });

    const first = ProductionWorkQueueEngine.addItem(queue, ProductionWorkQueueEngine.createItem({
      orderId: "ORDER-10",
      barcode: "BAR-10",
      materialId: "MAT-2",
      plannedSheetCount: 1,
    }));

    const duplicateOrder = ProductionWorkQueueEngine.addItem(first, ProductionWorkQueueEngine.createItem({
      orderId: "ORDER-10",
      barcode: "BAR-11",
      materialId: "MAT-2",
      plannedSheetCount: 1,
    }));

    const duplicateBarcode = ProductionWorkQueueEngine.addItem(duplicateOrder, ProductionWorkQueueEngine.createItem({
      orderId: "ORDER-11",
      barcode: "BAR-10",
      materialId: "MAT-2",
      plannedSheetCount: 1,
    }));

    const transitioned = ProductionWorkQueueEngine.transitionStatus(duplicateBarcode, "RUNNING");

    expect(duplicateBarcode.items).toHaveLength(1);
    expect(transitioned.status).toBe("RUNNING");
  });

  it("creates statistics and validates missing context", () => {
    const queue = ProductionWorkQueueEngine.createQueue({
      session: ProductionWorkQueueEngine.createSession({
        station: "",
        machineId: "",
        materialId: "",
        operatorId: "",
      }),
      station: "",
      machineId: "",
      materialId: "",
      operatorId: "",
    });

    const withItems = ProductionWorkQueueEngine.addItem(queue, ProductionWorkQueueEngine.createItem({
      orderId: "ORDER-20",
      barcode: "BAR-20",
      materialId: "MAT-20",
      plannedSheetCount: 2,
      estimatedAreaM2: 10,
    }));

    const statistics = ProductionWorkQueueEngine.createStatistics(withItems);
    const validations = ProductionWorkQueueEngine.validateQueue(withItems, { nextStatus: "COMPLETED" });

    expect(statistics.orderCount).toBe(1);
    expect(statistics.plannedSheets).toBe(2);
    expect(statistics.totalArea).toBe(10);
    expect(validations.some((validation) => validation.validationCode === "MISSING_STATION")).toBe(true);
    expect(validations.some((validation) => validation.validationCode === "MISSING_MACHINE")).toBe(true);
    expect(validations.some((validation) => validation.validationCode === "MISSING_MATERIAL")).toBe(true);
    expect(validations.some((validation) => validation.validationCode === "INVALID_STATUS_TRANSITION")).toBe(true);
  });
});
