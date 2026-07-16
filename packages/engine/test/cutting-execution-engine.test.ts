import { describe, expect, it } from "vitest";
import { CuttingExecutionEngine } from "../src/index.js";
import { factoryConfigurationSchema } from "@repo/types";

const baseFactoryConfig = factoryConfigurationSchema.parse({
  version: 1,
  trimConfiguration: {
    enabled: false,
    strategy: "PER_EDGE",
    leftMm: 10,
    rightMm: 10,
    topMm: 10,
    bottomMm: 10,
  },
  grindingConfiguration: {
    enabled: true,
    strategy: "PER_EDGE",
    leftMm: 5,
    rightMm: 5,
    topMm: 2,
    bottomMm: 2,
  },
  remnantConfiguration: {
    enabled: true,
    minimumWidthMm: 200,
    minimumHeightMm: 300,
    minimumAreaMm2: 60000,
  },
  inventoryConfiguration: {
    inventoryValuationMethod: "SPECIFIC_IDENTIFICATION",
    allowLotSelection: false,
    allowSpecificIdentification: false,
    negativeStockPolicy: null,
    reservationPolicy: null,
  },
  kerfConfiguration: {
    enabled: true,
    value: 0,
    unit: "MM",
  },
  toleranceMatching: {
    widthMm: 10,
    heightMm: 10,
  },
});

const baseSheet = {
  sheetId: "sheet-1",
  barcode: "BAR-1",
  materialId: "mat-1",
  materialCode: "GL-001",
  glassType: "Float",
  thickness: 4,
  color: "clear",
  nominalWidth: 1600,
  nominalHeight: 1200,
  usableWidth: 1500,
  usableHeight: 1100,
  grossArea: 1.92,
  usableArea: 1.65,
  trimConfigurationSnapshot: {
    enabled: false,
    leftMm: 0,
    rightMm: 0,
    topMm: 0,
    bottomMm: 0,
  },
  purchaseLotId: "lot-1",
  purchasePrice: 100,
  receivedDate: "2026-01-01",
  status: "available",
  metadata: {
    version: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    engineVersion: "1.0.0",
    factoryConfigurationVersion: 1,
  },
};

const createOrder = (index: number, widthMm: number, heightMm: number) => ({
  orderId: `order-${index}`,
  orderLineId: `line-${index}`,
  customerReference: `customer-${index}`,
  quantity: 1,
  sheet: { ...baseSheet, sheetId: `sheet-${index}` },
  orderWidthMm: widthMm,
  orderHeightMm: heightMm,
  status: "PENDING" as const,
});

describe("CuttingExecutionEngine", () => {
  it("creates an empty batch with default state", () => {
    const batch = CuttingExecutionEngine.createBatch({
      operatorId: "operator-1",
      machineId: "machine-1",
      materialId: "mat-1",
      glassType: "Float",
      glassThickness: 4,
    });

    expect(batch.status).toBe("CREATED");
    expect(batch.orderCount).toBe(0);
    expect(batch.usedSheetCount).toBe(0);
  });

  it("adds and removes orders from a batch", () => {
    const batch = CuttingExecutionEngine.createBatch({ operatorId: "operator-1" });
    const withOrder = CuttingExecutionEngine.addOrder(batch, createOrder(1, 300, 250));
    const withoutOrder = CuttingExecutionEngine.removeOrder(withOrder, "order-1");

    expect(CuttingExecutionEngine.calculateOrderCount(withOrder)).toBe(1);
    expect(withOrder.status).toBe("READY");
    expect(CuttingExecutionEngine.calculateOrderCount(withoutOrder)).toBe(0);
  });

  it("transitions from created to cutting to completed", () => {
    const batch = CuttingExecutionEngine.createBatch({ operatorId: "operator-1" });
    const started = CuttingExecutionEngine.startCutting(batch);
    const completed = CuttingExecutionEngine.completeCutting(started);

    expect(started.status).toBe("CUTTING");
    expect(completed.status).toBe("COMPLETED");
    expect(completed.startedAt).not.toBeNull();
    expect(completed.completedAt).not.toBeNull();
  });

  it("executes a batch and produces execution statistics", () => {
    const batch = CuttingExecutionEngine.createBatch({ operatorId: "operator-1" });
    const withOrder = CuttingExecutionEngine.addOrder(batch, createOrder(1, 300, 250));
    const withUsedSheets = CuttingExecutionEngine.setUsedSheetCount(withOrder, 2);
    const result = CuttingExecutionEngine.execute(withUsedSheets, baseFactoryConfig);

    expect(result.batch.orderCount).toBe(1);
    expect(result.batch.status).toBe("COMPLETED");
    expect(result.executionStatistics.orderCount).toBe(1);
    expect(result.executionStatistics.usedSheetCount).toBe(2);
    expect(result.executionStatistics.totalProductionArea).toBeGreaterThan(0);
    expect(result.batchCuttingSummary.session.totalProductionArea).toBeGreaterThan(0);
  });
});
