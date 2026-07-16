import { describe, expect, it } from "vitest";
import { InventoryManagementEngine } from "../src/index.js";

describe("InventoryManagementEngine", () => {
  it("creates inventory cards with category, type, unit and status", () => {
    const category = InventoryManagementEngine.createCategory({ code: "RAW", name: "Raw Material" });
    const type = InventoryManagementEngine.createType({ code: "RAW_MATERIAL", name: "Raw Material" });
    const unit = InventoryManagementEngine.createUnit({ code: "m2", name: "Square Meter" });

    const item = InventoryManagementEngine.createInventoryItem({
      inventoryCode: "INV-1001",
      name: "Float Glass 4mm",
      description: "Base inventory item",
      category,
      type,
      unit,
      status: "ACTIVE",
      notes: "Primary stock",
    });

    expect(item.inventoryCode).toBe("INV-1001");
    expect(item.category?.code).toBe("RAW");
    expect(item.type?.code).toBe("RAW_MATERIAL");
    expect(item.unit?.code).toBe("m2");
    expect(item.status).toBe("ACTIVE");
  });

  it("supports locations, lots, barcodes and reservation preparation", () => {
    const location = InventoryManagementEngine.createLocation({ code: "GLASS_WH", name: "Glass Warehouse" });
    const lot = InventoryManagementEngine.createLot({ lotNumber: "LOT-001", supplierLot: "SUP-001", receivedDate: "2026-07-01" });
    const barcode = InventoryManagementEngine.createBarcode({ internalBarcode: "INT-001", qrCode: "QR-001" });
    const reservation = InventoryManagementEngine.createReservation({ reservationType: "PRODUCTION", referenceId: "ORDER-1", quantity: 2, unit: "piece" });

    const category = InventoryManagementEngine.createCategory({ code: "RAW", name: "Raw Material" });
    const type = InventoryManagementEngine.createType({ code: "RAW_MATERIAL", name: "Raw Material" });
    const unit = InventoryManagementEngine.createUnit({ code: "piece", name: "Piece" });

    const item = InventoryManagementEngine.createInventoryItem({
      inventoryCode: "INV-1002",
      name: "Spacer",
      category,
      type,
      unit,
      status: "ACTIVE",
    });

    const withLocation = InventoryManagementEngine.assignLocation(item, location);
    const withLot = InventoryManagementEngine.assignLot(withLocation, lot);
    const withBarcode = InventoryManagementEngine.addBarcode(withLot, barcode);
    const withReservation = InventoryManagementEngine.addReservation(withBarcode, reservation);

    expect(withLocation.location?.code).toBe("GLASS_WH");
    expect(withLot.lot?.lotNumber).toBe("LOT-001");
    expect(withBarcode.barcodes).toHaveLength(1);
    expect(withReservation.reservations).toHaveLength(1);
  });

  it("validates duplicate codes, missing units, inactive status and invalid types", () => {
    const category = InventoryManagementEngine.createCategory({ code: "RAW", name: "Raw Material" });
    const type = InventoryManagementEngine.createType({ code: "RAW_MATERIAL", name: "Raw Material" });
    const existing = InventoryManagementEngine.createInventoryItem({
      inventoryCode: "INV-1003",
      name: "Existing Item",
      category,
      type,
      unit: InventoryManagementEngine.createUnit({ code: "m2", name: "Square Meter" }),
      status: "ACTIVE",
    });

    const invalid = InventoryManagementEngine.createInventoryItem({
      inventoryCode: "INV-1003",
      name: "Duplicate Code",
      category,
      type,
      unit: undefined as never,
      status: "PASSIVE",
    });

    const validations = InventoryManagementEngine.validateInventoryItem(invalid, [existing]);

    expect(validations.some((validation) => validation.validationCode === "DUPLICATE_INVENTORY_CODE")).toBe(true);
    expect(validations.some((validation) => validation.validationCode === "MISSING_UNIT")).toBe(true);
    expect(validations.some((validation) => validation.validationCode === "INACTIVE_INVENTORY")).toBe(true);
  });
});
