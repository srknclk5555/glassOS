import { describe, expect, it } from "vitest";
import { InventoryConsumptionEngine } from "../src/index.js";

describe("InventoryConsumptionEngine", () => {
  it("creates a consumption record with multiple lines", () => {
    const consumption = InventoryConsumptionEngine.createConsumption({
      referenceId: "PROD-1001",
      reason: "PRODUCTION",
      notes: "Material used for production",
    });

    const withLines = InventoryConsumptionEngine.addLine(consumption, {
      inventoryCode: "INV-1001",
      lotNumber: "LOT-001",
      quantity: 2,
      unit: "piece",
      area: 4,
      notes: "Primary glass",
    });

    const withSecondLine = InventoryConsumptionEngine.addLine(withLines, {
      inventoryCode: "INV-1002",
      lotNumber: "LOT-002",
      quantity: 1,
      unit: "box",
      area: 0,
      notes: "Packaging",
    });

    expect(withSecondLine.lines).toHaveLength(2);
    expect(withSecondLine.reason).toBe("PRODUCTION");
    expect(withSecondLine.lines[0]?.inventoryCode).toBe("INV-1001");
  });

  it("supports reasons and relationships", () => {
    const consumption = InventoryConsumptionEngine.createConsumption({
      referenceId: "REWORK-1",
      reason: "REWORK",
    });

    const withRelationship = InventoryConsumptionEngine.addRelationship(consumption, {
      relationshipType: "RECIPE",
      referenceId: "RC-1001",
    });

    expect(withRelationship.reason).toBe("REWORK");
    expect(withRelationship.relationships).toHaveLength(1);
    expect(withRelationship.relationships[0]?.relationshipType).toBe("RECIPE");
  });

  it("validates missing inventory, inactive lot, duplicate lines and invalid quantity", () => {
    const consumption = InventoryConsumptionEngine.createConsumption({
      referenceId: "TEST-1",
      reason: "MANUAL",
    });

    const withLine = InventoryConsumptionEngine.addLine(consumption, {
      inventoryCode: "INV-1003",
      lotNumber: "LOT-003",
      quantity: 1,
      unit: "piece",
      area: 1,
      notes: "Valid line",
    });

    const duplicateLine = InventoryConsumptionEngine.addLine(withLine, {
      inventoryCode: "INV-1003",
      lotNumber: "LOT-003",
      quantity: 1,
      unit: "piece",
      area: 1,
      notes: "Duplicate",
    });

    const invalidQuantity = InventoryConsumptionEngine.addLine(duplicateLine, {
      inventoryCode: "INV-1004",
      lotNumber: "LOT-004",
      quantity: 0,
      unit: "piece",
      area: 0,
      notes: "Invalid quantity",
    });

    const validations = InventoryConsumptionEngine.validateConsumption(invalidQuantity, {
      inventoryCodes: ["INV-1003"],
      activeInventoryCodes: ["INV-1003"],
      activeLotNumbers: ["LOT-003"],
    });

    expect(validations.some((validation) => validation.validationCode === "DUPLICATE_LINE")).toBe(true);
    expect(validations.some((validation) => validation.validationCode === "INVALID_QUANTITY")).toBe(true);
    expect(validations.some((validation) => validation.validationCode === "MISSING_INVENTORY")).toBe(true);
  });
});
