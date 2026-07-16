import { describe, expect, it } from "vitest";
import { ScrapDecisionService } from "../src/index.js";
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

describe("ScrapDecisionService", () => {
  it("returns scrap when the remnant system is disabled", () => {
    const config = {
      ...baseFactoryConfig,
      remnantConfiguration: { ...baseFactoryConfig.remnantConfiguration, enabled: false },
    };

    const result = ScrapDecisionService.decide(250, 400, 0.1, { decision: "scrap", reason: "remnant-system-disabled", isReusable: false, matchedRules: [] }, config);

    expect(result.decision).toBe("scrap");
    expect(result.reasonCode).toBe("REMNANT_DISABLED");
    expect(result.reason).toContain("remnant system is disabled");
  });

  it("returns scrap when the piece area is too small", () => {
    const result = ScrapDecisionService.decide(250, 400, 0.05, { decision: "scrap", reason: "thresholds-not-met", isReusable: false, matchedRules: ["minimum-width", "minimum-height"] }, baseFactoryConfig);

    expect(result.decision).toBe("scrap");
    expect(result.reasonCode).toBe("TOO_SMALL");
    expect(result.failedRules).toContain("minimum-area");
  });

  it("returns scrap when width is too small", () => {
    const result = ScrapDecisionService.decide(150, 400, 0.1, { decision: "scrap", reason: "thresholds-not-met", isReusable: false, matchedRules: ["minimum-height", "minimum-area"] }, baseFactoryConfig);

    expect(result.decision).toBe("scrap");
    expect(result.reasonCode).toBe("TOO_SMALL");
    expect(result.failedRules).toContain("minimum-width");
  });

  it("returns scrap when height is too small", () => {
    const result = ScrapDecisionService.decide(250, 250, 0.1, { decision: "scrap", reason: "thresholds-not-met", isReusable: false, matchedRules: ["minimum-width", "minimum-area"] }, baseFactoryConfig);

    expect(result.decision).toBe("scrap");
    expect(result.reasonCode).toBe("TOO_SMALL");
    expect(result.failedRules).toContain("minimum-height");
  });

  it("returns scrap when multiple rules fail", () => {
    const result = ScrapDecisionService.decide(150, 250, 0.05, { decision: "scrap", reason: "thresholds-not-met", isReusable: false, matchedRules: [] }, baseFactoryConfig);

    expect(result.decision).toBe("scrap");
    expect(result.reasonCode).toBe("TOO_SMALL");
    expect(result.failedRules).toEqual(["minimum-width", "minimum-height", "minimum-area"]);
  });

  it("does not return scrap when the piece is a valid remnant", () => {
    const result = ScrapDecisionService.decide(250, 400, 0.1, { decision: "remnant", reason: "all-thresholds-met", isReusable: true, matchedRules: ["minimum-width", "minimum-height", "minimum-area"] }, baseFactoryConfig);

    expect(result.decision).toBe("keep");
    expect(result.reasonCode).toBe("VALID_REMNANT");
    expect(result.reason).toContain("valid remnant");
  });
});
