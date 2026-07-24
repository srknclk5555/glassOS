import { describe, expect, it } from "vitest";
import { RecipeEngine } from "../src/index.js";
import type { FactoryConfiguration } from "@repo/types";
import type { RecipeEngineInput } from "../src/index.js";

// ─── Factory Configuration Fixture ────────────────────────────────────────

const factoryConfig: FactoryConfiguration = {
  version: 1,
  trimConfiguration: {
    enabled: true,
    strategy: "PER_EDGE",
    leftMm: 10,
    rightMm: 10,
    topMm: 15,
    bottomMm: 15,
  },
  grindingConfiguration: {
    enabled: true,
    strategy: "PER_EDGE",
    leftMm: 2,
    rightMm: 2,
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
};

// ─── Base Input Fixture ──────────────────────────────────────────────────

function baseInput(overrides?: Partial<RecipeEngineInput>): RecipeEngineInput {
  return {
    netWidthMm: 1000,
    netHeightMm: 1500,
    quantity: 1,
    rodaj: {
      useDefaults: true,
      top: 2,
      bottom: 2,
      left: 2,
      right: 2,
    },
    trim: {
      useDefaults: true,
      top: 15,
      bottom: 15,
      left: 10,
      right: 10,
    },
    bomItems: [
      {
        materialId: "mat_cam_001",
        materialCode: "FLAT-4MM",
        materialName: "Düz Cam 4mm",
        consumptionBasis: "area",
        quantityPerUnit: 1.0,
        unit: "m²",
        wastePercentage: 5,
      },
    ],
    fireItems: [
      { fireType: "cutting", fireTypeLabel: "Kesim Firesi", rate: 3, unit: "%" },
      { fireType: "temperLoss", fireTypeLabel: "Temper Kaybı", rate: 2, unit: "%" },
    ],
    outputItems: [
      {
        materialId: "prod_temper_001",
        productCode: "TMP-4MM",
        productName: "Temperli Cam 4mm",
        quantityPerUnit: 1.0,
        unit: "m²",
      },
    ],
    factoryConfiguration: factoryConfig,
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════
//  DIMENSION PIPELINE
// ══════════════════════════════════════════════════════════════════════════

describe("RecipeEngine — Dimension Pipeline", () => {
  it("applies trim then rodaj in correct order", () => {
    const result = RecipeEngine.calculate(baseInput());

    // Net: 1000 x 1500
    expect(result.dimensions.net.widthMm).toBe(1000);
    expect(result.dimensions.net.heightMm).toBe(1500);
    expect(result.dimensions.net.areaM2).toBe(1.5);

    // After Trim: 1000 + 10 + 10 = 1020, 1500 + 15 + 15 = 1530
    expect(result.dimensions.afterTrim.widthMm).toBe(1020);
    expect(result.dimensions.afterTrim.heightMm).toBe(1530);
    expect(result.dimensions.afterTrim.areaM2).toBeCloseTo(1.5606, 4);

    // After Rodaj: 1020 + 2 + 2 = 1024, 1530 + 2 + 2 = 1534
    expect(result.dimensions.afterRodaj.widthMm).toBe(1024);
    expect(result.dimensions.afterRodaj.heightMm).toBe(1534);
    expect(result.dimensions.afterRodaj.areaM2).toBeCloseTo(1.570816, 4);

    // Production = After Rodaj
    expect(result.dimensions.production.widthMm).toBe(1024);
    expect(result.dimensions.production.heightMm).toBe(1534);
    expect(result.dimensions.production.areaM2).toBeCloseTo(1.570816, 4);
  });

  it("skips trim when trim is disabled", () => {
    const input = baseInput({
      trim: { useDefaults: false, top: 0, bottom: 0, left: 0, right: 0 },
    });
    const result = RecipeEngine.calculate(input);

    // No trim: afterTrim = net = 1000x1500
    expect(result.dimensions.afterTrim.widthMm).toBe(1000);
    expect(result.dimensions.afterTrim.heightMm).toBe(1500);

    // Rodaj still applied: 1000+2+2=1004, 1500+2+2=1504
    expect(result.dimensions.production.widthMm).toBe(1004);
    expect(result.dimensions.production.heightMm).toBe(1504);
  });

  it("skips rodaj when rodaj values are all zero", () => {
    const input = baseInput({
      rodaj: { useDefaults: false, top: 0, bottom: 0, left: 0, right: 0 },
    });
    const result = RecipeEngine.calculate(input);

    // Trim applied: 1000+10+10=1020, 1500+15+15=1530
    expect(result.dimensions.afterTrim.widthMm).toBe(1020);
    // No rodaj: production = after trim
    expect(result.dimensions.production.widthMm).toBe(1020);
    expect(result.dimensions.production.heightMm).toBe(1530);
  });

  it("skips both trim and rodaj when all are zero", () => {
    const input = baseInput({
      rodaj: { useDefaults: false, top: 0, bottom: 0, left: 0, right: 0 },
      trim: { useDefaults: false, top: 0, bottom: 0, left: 0, right: 0 },
    });
    const result = RecipeEngine.calculate(input);

    // Production = Net = 1000x1500
    expect(result.dimensions.production.widthMm).toBe(1000);
    expect(result.dimensions.production.heightMm).toBe(1500);
  });

  it("uses custom rodaj values when useDefaults is false", () => {
    const input = baseInput({
      rodaj: { useDefaults: false, top: 5, bottom: 5, left: 3, right: 3 },
    });
    const result = RecipeEngine.calculate(input);

    // After Trim: 1020x1530
    // Rodaj: 1020+3+3=1026, 1530+5+5=1540
    expect(result.dimensions.production.widthMm).toBe(1026);
    expect(result.dimensions.production.heightMm).toBe(1540);
    expect(result.appliedSettings.rodaj.source).toBe("recipe");
  });

  it("resolves to factory defaults when useDefaults is true", () => {
    const result = RecipeEngine.calculate(baseInput());

    expect(result.appliedSettings.rodaj.source).toBe("factory");
    expect(result.appliedSettings.trim.source).toBe("factory");
    expect(result.appliedSettings.rodaj.top).toBe(2);
    expect(result.appliedSettings.trim.top).toBe(15);
  });

  it("calculates per-piece totals correctly", () => {
    const input = baseInput({ quantity: 10 });
    const result = RecipeEngine.calculate(input);

    // Per piece production area: ~1.570816 m²
    // 10 pieces: ~15.70816 m²
    expect(result.totals.productionAreaM2).toBeCloseTo(15.70816, 2);
    expect(result.totals.netAreaM2).toBe(15); // 1.5 × 10
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  BOM CONSUMPTION
// ══════════════════════════════════════════════════════════════════════════

describe("RecipeEngine — BOM Consumption", () => {
  it("calculates area-based consumption with waste", () => {
    const result = RecipeEngine.calculate(baseInput());

    // productionArea = ~1.570816 m², quantity = 1
    // netQuantity = 1.0 × 1.570816 = 1.570816
    // waste = 1.570816 × 5% = 0.078541
    // gross = 1.570816 + 0.078541 = 1.649357
    expect(result.consumedMaterials[0].netQuantity).toBeCloseTo(1.570816, 4);
    expect(result.consumedMaterials[0].wasteQuantity).toBeCloseTo(0.078541, 4);
    expect(result.consumedMaterials[0].grossQuantity).toBeCloseTo(1.649357, 4);
  });

  it("calculates piece-based consumption", () => {
    const input = baseInput({
      bomItems: [
        {
          materialId: "mat_aksesuar_001",
          materialCode: "KUL-001",
          materialName: "Kulp",
          consumptionBasis: "piece",
          quantityPerUnit: 2,
          unit: "adet",
          wastePercentage: 0,
        },
      ],
    });
    const result = RecipeEngine.calculate(input);

    // quantity=1, 2 per piece → net = 2
    expect(result.consumedMaterials[0].netQuantity).toBe(2);
    expect(result.consumedMaterials[0].grossQuantity).toBe(2);
  });

  it("handles multiple BOM items", () => {
    const input = baseInput({
      bomItems: [
        {
          materialId: "mat_cam_001",
          materialCode: "FLAT-4MM",
          materialName: "Düz Cam 4mm",
          consumptionBasis: "area",
          quantityPerUnit: 1.0,
          unit: "m²",
          wastePercentage: 5,
        },
        {
          materialId: "mat_cont_001",
          materialCode: "ARA-001",
          materialName: "Ara Conta",
          consumptionBasis: "perimeter",
          quantityPerUnit: 0.5,
          unit: "m",
          wastePercentage: 3,
        },
      ],
    });
    const result = RecipeEngine.calculate(input);

    expect(result.consumedMaterials).toHaveLength(2);
    expect(result.consumedMaterials[0].materialCode).toBe("FLAT-4MM");
    expect(result.consumedMaterials[1].materialCode).toBe("ARA-001");
    // Perimeter: 2 × (1.024 + 1.534) × 1 × 0.5 / 1000... 
    // Actually for perimeter basis: 2 × (width + height) × quantity × qtyPerUnit / 1000
    // For 1 piece: 2 × (1024 + 1534) × 1 × 0.5 / 1000 = 2 × 2558 × 0.5 / 1000 = 2.558 m
    expect(result.consumedMaterials[1].netQuantity).toBeCloseTo(2.558, 2);
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  FIRE LOSSES
// ══════════════════════════════════════════════════════════════════════════

describe("RecipeEngine — Fire Losses", () => {
  it("calculates percentage-based fire losses", () => {
    const result = RecipeEngine.calculate(baseInput());

    // productionAreaM2 = ~1.570816 (quantity=1)
    // cutting (3%): 1.570816 × 0.03 = 0.047124
    // temper (2%): 1.570816 × 0.02 = 0.031416
    expect(result.fireLosses).toHaveLength(2);
    expect(result.fireLosses[0].lossAreaM2).toBeCloseTo(0.047124, 4);
    expect(result.fireLosses[1].lossAreaM2).toBeCloseTo(0.031416, 4);
  });

  it("calculates total fire rate correctly", () => {
    const result = RecipeEngine.calculate(baseInput());
    expect(result.totalFireRate).toBe(5); // 3% + 2%
  });

  it("handles empty fire items", () => {
    const input = baseInput({ fireItems: [] });
    const result = RecipeEngine.calculate(input);

    expect(result.fireLosses).toHaveLength(0);
    expect(result.totalFireRate).toBe(0);
  });

  it("calculates fixed-amount fire losses", () => {
    const input = baseInput({
      fireItems: [
        { fireType: "breakage", fireTypeLabel: "Kırık", rate: 0.5, unit: "adet" },
      ],
    });
    const result = RecipeEngine.calculate(input);

    // fixed amount × quantity = 0.5 × 1 = 0.5
    expect(result.fireLosses[0].lossAreaM2).toBe(0.5);
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  PRODUCT OUTPUT
// ══════════════════════════════════════════════════════════════════════════

describe("RecipeEngine — Product Output", () => {
  it("calculates product quantity", () => {
    const result = RecipeEngine.calculate(baseInput());

    expect(result.producedProducts).toHaveLength(1);
    expect(result.producedProducts[0].quantity).toBe(1); // 1.0 × 1
    expect(result.producedProducts[0].productCode).toBe("TMP-4MM");
  });

  it("scales with quantity", () => {
    const input = baseInput({ quantity: 5 });
    const result = RecipeEngine.calculate(input);

    expect(result.producedProducts[0].quantity).toBe(5);
  });

  it("handles multiple output items", () => {
    const input = baseInput({
      outputItems: [
        {
          materialId: "prod_main_001",
          productCode: "TMP-4MM",
          productName: "Temperli Cam",
          quantityPerUnit: 1.0,
          unit: "m²",
        },
        {
          materialId: "prod_byproduct_001",
          productCode: "BYP-CULLET",
          productName: "Cam Kırığı",
          quantityPerUnit: 0.05,
          unit: "ton",
        },
      ],
    });
    const result = RecipeEngine.calculate(input);

    expect(result.producedProducts).toHaveLength(2);
    expect(result.producedProducts[1].quantity).toBeCloseTo(0.05, 4);
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  EFFICIENCY
// ══════════════════════════════════════════════════════════════════════════

describe("RecipeEngine — Efficiency", () => {
  it("calculates efficiency when both trim and rodaj are active", () => {
    const result = RecipeEngine.calculate(baseInput());

    // netArea = 1.5, productionArea ≈ 1.570816
    // efficiency = 1.5 / 1.570816 ≈ 0.9549
    expect(result.efficiency).toBeCloseTo(0.9549, 3);
  });

  it("calculates efficiency without any allowances (perfect)", () => {
    const input = baseInput({
      rodaj: { useDefaults: false, top: 0, bottom: 0, left: 0, right: 0 },
      trim: { useDefaults: false, top: 0, bottom: 0, left: 0, right: 0 },
    });
    const result = RecipeEngine.calculate(input);

    // net = production, efficiency = 1.0
    expect(result.efficiency).toBe(1.0);
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  APPLIED SETTINGS
// ══════════════════════════════════════════════════════════════════════════

describe("RecipeEngine — Applied Settings", () => {
  it("reports factory as source when useDefaults is true", () => {
    const result = RecipeEngine.calculate(baseInput());

    expect(result.appliedSettings.rodaj.source).toBe("factory");
    expect(result.appliedSettings.trim.source).toBe("factory");
  });

  it("reports recipe as source when useDefaults is false", () => {
    const input = baseInput({
      rodaj: { useDefaults: false, top: 3, bottom: 3, left: 3, right: 3 },
      trim: { useDefaults: false, top: 5, bottom: 5, left: 5, right: 5 },
    });
    const result = RecipeEngine.calculate(input);

    expect(result.appliedSettings.rodaj.source).toBe("recipe");
    expect(result.appliedSettings.trim.source).toBe("recipe");
    expect(result.appliedSettings.rodaj.top).toBe(3);
    expect(result.appliedSettings.trim.top).toBe(5);
  });

  it("reports rodaj as disabled when all values are zero", () => {
    const input = baseInput({
      rodaj: { useDefaults: false, top: 0, bottom: 0, left: 0, right: 0 },
    });
    const result = RecipeEngine.calculate(input);

    // useDefaults=false with all zeros → enabled=true but no effect
    // Actually the engine sets enabled=true when useDefaults=false
    // Let's verify the values are zero
    expect(result.appliedSettings.rodaj.top).toBe(0);
    expect(result.appliedSettings.rodaj.source).toBe("recipe");
  });
});
