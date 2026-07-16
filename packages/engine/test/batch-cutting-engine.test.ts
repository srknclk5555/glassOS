import { describe, expect, it } from "vitest";
import { BatchCuttingEngine } from "../src/index.js";
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
});

describe("BatchCuttingEngine", () => {
  it("processes a single order into a cutting session", () => {
    const result = BatchCuttingEngine.calculate([createOrder(1, 300, 250)], baseFactoryConfig);

    expect(result.results).toHaveLength(1);
    expect(result.session.orders).toHaveLength(1);
    expect(result.session.totalProductionArea).toBeGreaterThan(0);
    expect(result.session.totalGlassConsumptionArea).toBeGreaterThan(0);
    expect(result.session.sheetCount).toBe(1);
  });

  it("processes five orders into a single batch session", () => {
    const orders = Array.from({ length: 5 }, (_, index) => createOrder(index + 1, 300 + index * 20, 250 + index * 10));

    const result = BatchCuttingEngine.calculate(orders, baseFactoryConfig);

    expect(result.results).toHaveLength(5);
    expect(result.session.orders).toHaveLength(5);
    expect(result.session.totalOrderedArea).toBeGreaterThan(0);
    expect(result.session.totalProductionArea).toBeGreaterThan(0);
  });

  it("processes twenty orders into a single batch session", () => {
    const orders = Array.from({ length: 20 }, (_, index) => createOrder(index + 1, 250 + index, 220 + index));

    const result = BatchCuttingEngine.calculate(orders, baseFactoryConfig);

    expect(result.results).toHaveLength(20);
    expect(result.session.orders).toHaveLength(20);
    expect(result.session.sheetCount).toBe(20);
    expect(result.session.totalScrapArea).toBeGreaterThanOrEqual(0);
  });

  it("respects different factory configuration thresholds", () => {
    const config = {
      ...baseFactoryConfig,
      remnantConfiguration: { ...baseFactoryConfig.remnantConfiguration, minimumWidthMm: 1000, minimumHeightMm: 1000, minimumAreaMm2: 1000000 },
    };

    const result = BatchCuttingEngine.calculate([createOrder(1, 400, 400)], config);

    expect(result.session.totalRemnantArea).toBe(0);
    expect(result.session.totalScrapArea).toBeGreaterThan(0);
  });

  it("tracks remnant output when remnant rules are enabled", () => {
    const result = BatchCuttingEngine.calculate([createOrder(1, 400, 400)], baseFactoryConfig);

    expect(result.session.totalRemnantArea).toBeGreaterThan(0);
    expect(result.session.totalScrapArea).toBe(0);
  });

  it("tracks scrap output when remnant rules are disabled", () => {
    const config = {
      ...baseFactoryConfig,
      remnantConfiguration: { ...baseFactoryConfig.remnantConfiguration, enabled: false },
    };

    const result = BatchCuttingEngine.calculate([createOrder(1, 400, 400)], config);

    expect(result.session.totalRemnantArea).toBe(0);
    expect(result.session.totalScrapArea).toBeGreaterThan(0);
  });

  it("handles mixed results across orders", () => {
    const orders = [
      createOrder(1, 400, 400),
      createOrder(2, 1400, 1000),
      createOrder(3, 300, 250),
    ];

    const result = BatchCuttingEngine.calculate(orders, baseFactoryConfig);

    expect(result.results).toHaveLength(3);
    expect(result.session.totalRemnantArea).toBeGreaterThan(0);
    expect(result.session.totalScrapArea).toBeGreaterThan(0);
  });
});
