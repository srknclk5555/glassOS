import { describe, expect, it } from "vitest";
import {
  type CuttingSession,
  type OrderReference,
  type SheetUsage,
  type CuttingSessionStatus,
} from "../src/index.js";

const baseStatus: CuttingSessionStatus = "draft";

describe("cutting session domain models", () => {
  it("creates a cutting session shell with related collections", () => {
    const session: CuttingSession = {
      sessionId: "session-001",
      factoryId: "factory-001",
      productionDate: "2026-07-15",
      operatorId: "operator-001",
      machineId: "machine-001",
      materialId: "material-001",
      glassType: "float",
      sheetSize: {
        width: 3200,
        height: 6000,
      },
      sheetCount: 2,
      totalOrderedArea: 5.5,
      totalProductionArea: 5.2,
      totalGlassConsumptionArea: 5.3,
      totalTrimArea: 0.1,
      totalGrindingArea: 0.05,
      totalRemnantArea: 0.03,
      totalScrapArea: 0.02,
      yieldPercentage: 94,
      wastePercentage: 6,
      status: baseStatus,
      sheets: ["sheet-001", "sheet-002"],
      orders: [
        {
          orderId: "order-001",
          orderLineId: "order-line-001",
          customerReference: "CUST-001",
          quantity: 2,
          netDimensions: { width: 1000, height: 2000 },
          productionDimensions: { width: 1010, height: 2004 },
        },
      ],
      remnants: [
        {
          width: 500,
          height: 400,
          area: 0.2,
          isReusable: true,
          reason: "meets-threshold",
        },
      ],
      scraps: [
        {
          width: 80,
          height: 80,
          area: 0.0064,
          reason: "below-threshold",
        },
      ],
      cuttingResultId: "cutting-result-001",
      version: 1,
      createdAt: "2026-07-15T00:00:00.000Z",
      engineVersion: "2.3.4",
      factoryConfigurationVersion: 1,
    };

    expect(session.sheets).toHaveLength(2);
    expect(session.orders[0]?.customerReference).toBe("CUST-001");
    expect(session.remnants[0]?.isReusable).toBe(true);
    expect(session.cuttingResultId).toBe("cutting-result-001");
  });

  it("creates sheet usage and order reference placeholders", () => {
    const usage: SheetUsage = {
      usedArea: 2.1,
      remainingArea: 0.4,
      trimArea: 0.05,
      grindingArea: 0.03,
      scrapArea: 0.01,
      remnantArea: 0.01,
    };

    const order: OrderReference = {
      orderId: "order-002",
      orderLineId: "order-line-002",
      customerReference: "CUST-002",
      quantity: 1,
      netDimensions: { width: 1200, height: 1800 },
      productionDimensions: { width: 1210, height: 1804 },
    };

    expect(usage.remainingArea).toBe(0.4);
    expect(order.productionDimensions.width).toBe(1210);
  });
});
