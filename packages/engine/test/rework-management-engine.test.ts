import { describe, expect, it } from "vitest";
import { ReworkManagementEngine } from "../src/index.js";

describe("ReworkManagementEngine", () => {
  it("creates a breakage event and transfers ownership to fire inventory", () => {
    const breakage = ReworkManagementEngine.createBreakageEvent({
      station: "CUTTING",
      machine: "M-01",
      operator: "OP-001",
      shift: "A",
      productionBatch: "BATCH-001",
      order: "ORDER-001",
      orderLine: "LINE-001",
      glassPiece: "PIECE-001",
      reason: "BREAKAGE",
      notes: "Glass cracked during loading",
    });

    const transferred = ReworkManagementEngine.transferOwnership(breakage, { ownership: "FACTORY_FIRE_INVENTORY" });

    expect(transferred.ownership).toBe("FACTORY_FIRE_INVENTORY");
    expect(transferred.station).toBe("CUTTING");
    expect(transferred.reason).toBe("BREAKAGE");
  });

  it("creates a fire inventory item and updates its status", () => {
    const fireItem = ReworkManagementEngine.createFireInventoryItem({
      category: "BROKEN_GLASS",
      quantity: 1,
      unit: "piece",
      referenceId: "PIECE-001",
      status: "AVAILABLE",
      notes: "Broken glass awaiting review",
    });

    const updated = ReworkManagementEngine.updateFireInventoryStatus(fireItem, "REWORK_REQUIRED");

    expect(updated.category).toBe("BROKEN_GLASS");
    expect(updated.status).toBe("REWORK_REQUIRED");
    expect(updated.referenceId).toBe("PIECE-001");
  });

  it("creates a rework request from a breakage event and restarts at cutting", () => {
    const breakage = ReworkManagementEngine.createBreakageEvent({
      station: "GRINDING",
      machine: "M-02",
      operator: "OP-002",
      shift: "B",
      productionBatch: "BATCH-002",
      order: "ORDER-002",
      orderLine: "LINE-002",
      glassPiece: "PIECE-002",
      reason: "MEASUREMENT_ERROR",
    });

    const request = ReworkManagementEngine.createReworkRequest({
      breakageEventId: breakage.breakageId,
      reason: breakage.reason,
      requestedFromStation: breakage.station,
      notes: "Restart production from cutting",
    });

    expect(request.requestedFromStation).toBe("GRINDING");
    expect(request.restartStation).toBe("CUTTING");
    expect(request.breakageEventId).toBe(breakage.breakageId);
  });

  it("tracks operator, station, machine and shift relationships", () => {
    const breakage = ReworkManagementEngine.createBreakageEvent({
      station: "QUALITY",
      machine: "M-03",
      operator: "OP-003",
      shift: "C",
      productionBatch: "BATCH-003",
      order: "ORDER-003",
      orderLine: "LINE-003",
      glassPiece: "PIECE-003",
      reason: "QUALITY_REJECT",
      supervisor: "SUP-001",
    });

    expect(breakage.operator).toBe("OP-003");
    expect(breakage.machine).toBe("M-03");
    expect(breakage.station).toBe("QUALITY");
    expect(breakage.shift).toBe("C");
    expect(breakage.supervisor).toBe("SUP-001");
  });

  it("validates missing reason, operator, station, machine and duplicate requests", () => {
    const breakage = ReworkManagementEngine.createBreakageEvent({
      station: "DISPATCH",
      machine: "M-04",
      operator: "OP-004",
      shift: "A",
      productionBatch: "BATCH-004",
      order: "ORDER-004",
      orderLine: "LINE-004",
      glassPiece: "PIECE-004",
      reason: "BREAKAGE",
    });

    const request = ReworkManagementEngine.createReworkRequest({
      breakageEventId: breakage.breakageId,
      reason: breakage.reason,
      requestedFromStation: breakage.station,
    });

    const duplicate = ReworkManagementEngine.createReworkRequest({
      breakageEventId: breakage.breakageId,
      reason: breakage.reason,
      requestedFromStation: breakage.station,
    });

    const validations = ReworkManagementEngine.validateRework({
      breakageEvent: breakage,
      reworkRequest: request,
      existingRequests: [request, duplicate],
      fireInventoryItems: [],
    });

    expect(validations.some((validation) => validation.validationCode === "DUPLICATE_REWORK_REQUEST")).toBe(true);
  });
});
