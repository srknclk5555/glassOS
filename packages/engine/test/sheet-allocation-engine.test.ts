import { describe, expect, it } from "vitest";
import { BatchCuttingEngine, SheetAllocationEngine } from "../src/index.js";
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

const createSheet = (sheetId: string, usableArea: number, usableWidth: number, usableHeight: number) => ({
  ...baseSheet,
  sheetId,
  usableArea,
  usableWidth,
  usableHeight,
  nominalWidth: usableWidth,
  nominalHeight: usableHeight,
  grossArea: usableArea,
});

const createOrder = (index: number, widthMm: number, heightMm: number) => ({
  orderId: `order-${index}`,
  orderLineId: `line-${index}`,
  customerReference: `customer-${index}`,
  quantity: 1,
  sheet: { ...baseSheet, sheetId: `sheet-${index}` },
  orderWidthMm: widthMm,
  orderHeightMm: heightMm,
});

describe("SheetAllocationEngine", () => {
  it("allocates a single order to a single sheet", () => {
    const batchResult = BatchCuttingEngine.calculate([createOrder(1, 300, 250)], baseFactoryConfig);
    const allocation = SheetAllocationEngine.calculate(batchResult, [createSheet("sheet-a", 1.65, 1500, 1100)], baseFactoryConfig);

    expect(allocation.allocations).toHaveLength(1);
    expect(allocation.sheets).toHaveLength(1);
    expect(allocation.allocations[0]?.sheetId).toBe("sheet-a");
    expect(allocation.sheets[0]?.remainingArea).toBeLessThan(1.65);
  });

  it("spreads allocations across multiple sheets when capacity is exceeded", () => {
    const batchResult = BatchCuttingEngine.calculate([
      createOrder(1, 1200, 1200),
      createOrder(2, 500, 500),
    ], baseFactoryConfig);
    const allocation = SheetAllocationEngine.calculate(batchResult, [
      createSheet("sheet-a", 1.65, 1500, 1100),
      createSheet("sheet-b", 1.65, 1500, 1100),
    ], baseFactoryConfig);

    expect(allocation.allocations).toHaveLength(2);
    expect(new Set(allocation.allocations.map((item) => item.sheetId)).size).toBe(2);
  });

  it("returns empty allocations for an empty batch", () => {
    const allocation = SheetAllocationEngine.calculate(
      { results: [], session: { orders: [], remnants: [], scraps: [], cuttingResultId: null, version: 1, createdAt: "", engineVersion: "1.0.0", factoryConfigurationVersion: 1, sessionId: "session-empty", factoryId: "factory-1", productionDate: "", operatorId: "operator-1", machineId: "machine-1", materialId: "mat-1", glassType: "Float", sheetSize: { width: 0, height: 0 }, sheetCount: 0, totalOrderedArea: 0, totalProductionArea: 0, totalGlassConsumptionArea: 0, totalTrimArea: 0, totalGrindingArea: 0, totalRemnantArea: 0, totalScrapArea: 0, yieldPercentage: 0, wastePercentage: 0, status: "completed", sheets: [] } },
      [createSheet("sheet-a", 1.65, 1500, 1100)],
      baseFactoryConfig
    );

    expect(allocation.allocations).toHaveLength(0);
    expect(allocation.sheets[0]?.allocations).toHaveLength(0);
  });

  it("records remnant area for sheets that still have leftover capacity", () => {
    const batchResult = BatchCuttingEngine.calculate([createOrder(1, 300, 250)], baseFactoryConfig);
    const allocation = SheetAllocationEngine.calculate(batchResult, [createSheet("sheet-a", 1.65, 1500, 1100)], baseFactoryConfig);

    expect(allocation.sheets[0]?.remnantArea).toBeGreaterThan(0);
    expect(allocation.sheets[0]?.usedArea).toBeGreaterThan(0);
  });

  it("marks a sheet as fully used when the order consumes all available area", () => {
    const batchResult = BatchCuttingEngine.calculate([createOrder(1, 1000, 1000)], baseFactoryConfig);
    const allocation = SheetAllocationEngine.calculate(batchResult, [createSheet("sheet-a", 1.0, 1000, 1000)], baseFactoryConfig);

    expect(allocation.sheets[0]?.remainingArea).toBe(0);
    expect(allocation.sheets[0]?.usedArea).toBeGreaterThan(0);
  });
});
