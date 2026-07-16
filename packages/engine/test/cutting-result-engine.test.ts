import { describe, expect, it } from "vitest";
import { CuttingResultEngine } from "../src/index.js";
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

describe("CuttingResultEngine", () => {
  it("creates a normal production result when the leftover is not reusable", () => {
    const result = CuttingResultEngine.calculate(baseSheet, 1400, 1000, baseFactoryConfig);

    expect(result.productionResult.productionArea).toBeGreaterThan(0);
    expect(result.glassConsumptionArea).toBeGreaterThan(0);
    expect(result.remnantArea).toBe(0);
    expect(result.scrapArea).toBeGreaterThan(0);
    expect(result.statistics.totalRemnant).toBe(0);
    expect(result.statistics.totalScrap).toBeGreaterThan(0);
    expect(result.metadata.engineVersion).toBe("2.3.7");
  });

  it("creates a remnant when the leftover meets the thresholds", () => {
    const result = CuttingResultEngine.calculate(baseSheet, 400, 400, baseFactoryConfig);

    expect(result.remnantArea).toBeGreaterThan(0);
    expect(result.scrapArea).toBe(0);
    expect(result.statistics.totalRemnant).toBeGreaterThan(0);
    expect(result.statistics.totalScrap).toBe(0);
  });

  it("returns a fully scrap result when the leftover is below the remnant thresholds", () => {
    const result = CuttingResultEngine.calculate(baseSheet, 1000, 1000, baseFactoryConfig);

    expect(result.remnantArea).toBe(0);
    expect(result.scrapArea).toBeGreaterThan(0);
    expect(result.statistics.totalScrap).toBeGreaterThan(0);
  });

  it("returns scrap when the remnant system is disabled", () => {
    const config = {
      ...baseFactoryConfig,
      remnantConfiguration: { ...baseFactoryConfig.remnantConfiguration, enabled: false },
    };

    const result = CuttingResultEngine.calculate(baseSheet, 400, 400, config);

    expect(result.remnantArea).toBe(0);
    expect(result.scrapArea).toBeGreaterThan(0);
    expect(result.metadata.factoryConfigurationVersion).toBe(1);
  });

  it("uses different factory configuration thresholds for the decision", () => {
    const config = {
      ...baseFactoryConfig,
      remnantConfiguration: { ...baseFactoryConfig.remnantConfiguration, minimumWidthMm: 1000, minimumHeightMm: 1000, minimumAreaMm2: 1000000 },
    };

    const result = CuttingResultEngine.calculate(baseSheet, 400, 400, config);

    expect(result.remnantArea).toBe(0);
    expect(result.scrapArea).toBeGreaterThan(0);
  });
});
