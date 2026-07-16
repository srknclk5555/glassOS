import { describe, expect, it } from "vitest";
import { type GlassSheet, type CuttingResult, type RemnantCandidate, type ScrapCandidate, type CuttingStatistics, type EngineMetadata } from "../src/index.js";

const metadata: EngineMetadata = {
  version: 1,
  createdAt: "2026-07-15T00:00:00.000Z",
  engineVersion: "2.3.3",
  factoryConfigurationVersion: 1,
};

describe("cutting domain models", () => {
  it("creates a glass sheet model with sheet-level fields and metadata", () => {
    const sheet: GlassSheet = {
      sheetId: "sheet-001",
      barcode: "BAR-001",
      materialId: "mat-001",
      materialCode: "GL-101",
      glassType: "float",
      thickness: 4,
      color: "clear",
      nominalWidth: 3200,
      nominalHeight: 6000,
      usableWidth: 3180,
      usableHeight: 5960,
      grossArea: 19.2,
      usableArea: 18.9568,
      trimConfigurationSnapshot: {
        enabled: true,
        leftMm: 10,
        rightMm: 10,
        topMm: 10,
        bottomMm: 10,
      },
      purchaseLotId: "lot-001",
      purchasePrice: 1250,
      receivedDate: "2026-07-10",
      status: "received",
      metadata,
    };

    expect(sheet.sheetId).toBe("sheet-001");
    expect(sheet.usableArea).toBeCloseTo(18.9568);
    expect(sheet.metadata.engineVersion).toBe("2.3.3");
  });

  it("creates a cutting result shell with future-ready sections", () => {
    const result: CuttingResult = {
      productionResult: {
        productionWidth: 1000,
        productionHeight: 2000,
        productionArea: 2,
      },
      usedSheets: ["sheet-001"],
      usedArea: 2,
      orderedArea: 2,
      productionArea: 2,
      glassConsumptionArea: 2,
      trimLossArea: 0.1,
      grindingLossArea: 0.05,
      scrapArea: 0.02,
      remnantArea: 0.03,
      totalWasteArea: 0.2,
      yieldPercentage: 90,
      wastePercentage: 10,
      remnants: [{ width: 500, height: 1000, area: 0.5, isReusable: true, reason: "available-size" }],
      scraps: [{ width: 100, height: 100, area: 0.01, reason: "small-piece" }],
      statistics: {
        totalArea: 2,
        totalWaste: 0.2,
        totalRemnant: 0.03,
        totalScrap: 0.02,
        totalYield: 90,
        totalSheetCount: 1,
      },
      metadata,
    };

    expect(result.usedSheets).toHaveLength(1);
    const [remnant] = result.remnants;
    expect(remnant?.isReusable).toBe(true);
    expect(result.statistics.totalSheetCount).toBe(1);
    expect(result.metadata.factoryConfigurationVersion).toBe(1);
  });

  it("creates remnant and scrap candidates without applying decision logic", () => {
    const remnant: RemnantCandidate = {
      width: 500,
      height: 400,
      area: 0.2,
      isReusable: true,
      reason: "meets-minimum-size",
    };

    const scrap: ScrapCandidate = {
      width: 80,
      height: 80,
      area: 0.0064,
      reason: "below-minimum-size",
    };

    expect(remnant.area).toBe(0.2);
    expect(scrap.area).toBe(0.0064);
  });

  it("uses a shared stats model for future aggregations", () => {
    const stats: CuttingStatistics = {
      totalArea: 10,
      totalWaste: 1.5,
      totalRemnant: 0.75,
      totalScrap: 0.75,
      totalYield: 85,
      totalSheetCount: 3,
    };

    expect(stats.totalYield).toBe(85);
    expect(stats.totalSheetCount).toBe(3);
  });
});
