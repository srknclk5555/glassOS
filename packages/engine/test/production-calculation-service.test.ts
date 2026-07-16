import { describe, expect, it } from "vitest";
import { ProductionCalculationService } from "../src/index.js";
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
    minimumHeightMm: 200,
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

describe("ProductionCalculationService", () => {
  it("calculates dimensions without grinding when disabled", () => {
    const config = { ...baseFactoryConfig, grindingConfiguration: { ...baseFactoryConfig.grindingConfiguration, enabled: false } };
    const result = ProductionCalculationService.calculate(1000, 2000, config);

    expect(result.dimensions.productionWidth).toBe(1000);
    expect(result.dimensions.productionHeight).toBe(2000);
    expect(result.grinding.totalWidthMm).toBe(10);
    expect(result.grinding.totalHeightMm).toBe(4);
    expect(result.areas.netArea).toBe(2);
    expect(result.areas.productionArea).toBe(2);
    expect(result.consumption.glassConsumptionArea).toBe(2);
    expect(result.metadata.configurationVersion).toBe(1);
  });

  it("calculates dimensions with grinding enabled", () => {
    const result = ProductionCalculationService.calculate(1000, 2000, baseFactoryConfig);

    expect(result.dimensions.productionWidth).toBe(1010);
    expect(result.dimensions.productionHeight).toBe(2004);
    expect(result.areas.netArea).toBe(2);
    expect(result.areas.productionArea).toBe(2.02404);
    expect(result.consumption.glassConsumptionArea).toBe(2.02404);
    expect(result.glassConsumptionArea).toBe(2.02404);
  });

  it("calculates single-side grinding values correctly", () => {
    const config = { ...baseFactoryConfig, grindingConfiguration: { ...baseFactoryConfig.grindingConfiguration, leftMm: 10, rightMm: 0, topMm: 0, bottomMm: 0 } };
    const result = ProductionCalculationService.calculate(1000, 1000, config);

    expect(result.dimensions.productionWidth).toBe(1010);
    expect(result.dimensions.productionHeight).toBe(1000);
    expect(result.grinding.leftMm).toBe(10);
    expect(result.grinding.rightMm).toBe(0);
    expect(result.grinding.totalWidthMm).toBe(10);
    expect(result.areas.netArea).toBe(1);
    expect(result.areas.productionArea).toBe(1.01);
  });

  it("calculates four-side grinding correctly", () => {
    const config = { ...baseFactoryConfig, grindingConfiguration: { ...baseFactoryConfig.grindingConfiguration, leftMm: 20, rightMm: 20, topMm: 10, bottomMm: 10 } };
    const result = ProductionCalculationService.calculate(1200, 2400, config);

    expect(result.dimensions.productionWidth).toBe(1240);
    expect(result.dimensions.productionHeight).toBe(2420);
    expect(result.areas.netArea).toBe(2.88);
    expect(result.areas.productionArea).toBe(3.0008);
  });

  it("calculates areas using net and production dimensions", () => {
    const netArea = ProductionCalculationService.calculateNetArea(1500, 2500);
    const productionArea = ProductionCalculationService.calculateProductionArea(1510, 2510);

    expect(netArea).toBe(3.75);
    expect(productionArea).toBe(3.7901);
  });
});
