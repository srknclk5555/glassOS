import { describe, expect, it } from "vitest";
import { RemnantDecisionService } from "../src/index.js";
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

describe("RemnantDecisionService", () => {
  it("marks every piece as scrap when remnant system is disabled", () => {
    const config = {
      ...baseFactoryConfig,
      remnantConfiguration: { ...baseFactoryConfig.remnantConfiguration, enabled: false },
    };

    const result = RemnantDecisionService.decide(250, 400, 0.1, config);

    expect(result.decision).toBe("scrap");
    expect(result.isReusable).toBe(false);
    expect(result.reason).toBe("remnant-system-disabled");
  });

  it("marks the piece as scrap when width is below minimum", () => {
    const result = RemnantDecisionService.decide(150, 400, 0.1, baseFactoryConfig);

    expect(result.decision).toBe("scrap");
    expect(result.isReusable).toBe(false);
    expect(result.matchedRules).not.toContain("minimum-width");
    expect(result.matchedRules).toContain("minimum-height");
    expect(result.matchedRules).toContain("minimum-area");
  });

  it("marks the piece as scrap when height is below minimum", () => {
    const result = RemnantDecisionService.decide(250, 250, 0.1, baseFactoryConfig);

    expect(result.decision).toBe("scrap");
    expect(result.isReusable).toBe(false);
    expect(result.matchedRules).not.toContain("minimum-height");
    expect(result.matchedRules).toContain("minimum-width");
    expect(result.matchedRules).toContain("minimum-area");
  });

  it("marks the piece as scrap when area is below minimum", () => {
    const result = RemnantDecisionService.decide(250, 400, 0.05, baseFactoryConfig);

    expect(result.decision).toBe("scrap");
    expect(result.isReusable).toBe(false);
    expect(result.matchedRules).not.toContain("minimum-area");
    expect(result.matchedRules).toContain("minimum-width");
    expect(result.matchedRules).toContain("minimum-height");
  });

  it("marks the piece as reusable remnant when all thresholds are met", () => {
    const result = RemnantDecisionService.decide(250, 400, 0.1, baseFactoryConfig);

    expect(result.decision).toBe("remnant");
    expect(result.isReusable).toBe(true);
    expect(result.reason).toBe("all-thresholds-met");
    expect(result.matchedRules).toEqual(["minimum-width", "minimum-height", "minimum-area"]);
  });

  it("treats the boundary values as valid remnant candidates", () => {
    const result = RemnantDecisionService.decide(200, 300, 0.06, baseFactoryConfig);

    expect(result.decision).toBe("remnant");
    expect(result.isReusable).toBe(true);
  });
});
