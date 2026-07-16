import { describe, expect, it } from "vitest";
import { MachineManagementEngine } from "../src/index.js";

describe("MachineManagementEngine", () => {
  it("creates a machine card with the required production fields", () => {
    const machine = MachineManagementEngine.createMachine({
      machineCode: "M-1001",
      name: "Kesim Makinesi 01",
      brand: "GlassLine",
      model: "CUT-200",
      serialNumber: "SN-1001",
      productionYear: 2024,
      purchaseDate: "2024-01-10",
      commissionDate: "2024-02-01",
      warrantyStart: "2024-02-01",
      warrantyEnd: "2026-02-01",
      status: "ACTIVE",
      notes: "Üretim hattı kesim",
    });

    expect(machine.machineCode).toBe("M-1001");
    expect(machine.name).toBe("Kesim Makinesi 01");
    expect(machine.status).toBe("ACTIVE");
    expect(machine.notes).toContain("Üretim hattı");
  });

  it("stores machine type from configurable categories", () => {
    const machine = MachineManagementEngine.createMachine({
      machineCode: "M-1002",
      name: "Temper Fırını 01",
      brand: "HeatTech",
      model: "TEM-300",
      serialNumber: "SN-1002",
      productionYear: 2023,
      purchaseDate: "2023-04-05",
      commissionDate: "2023-05-01",
      warrantyStart: "2023-05-01",
      warrantyEnd: "2025-05-01",
      status: "ACTIVE",
    });

    const withType = MachineManagementEngine.setMachineType(machine, {
      typeId: "type-tempering",
      name: "Tempering",
      description: "Temper fırını",
      category: "TEMPERING",
    });

    expect(withType.machineType?.name).toBe("Tempering");
    expect(withType.machineType?.category).toBe("TEMPERING");
  });

  it("supports production statuses", () => {
    const machine = MachineManagementEngine.createMachine({
      machineCode: "M-1003",
      name: "Yıkama Makinesi",
      brand: "CleanFlow",
      model: "WASH-100",
      serialNumber: "SN-1003",
      productionYear: 2022,
      purchaseDate: "2022-09-01",
      commissionDate: "2022-10-01",
      warrantyStart: "2022-10-01",
      warrantyEnd: "2024-10-01",
      status: "MAINTENANCE",
    });

    const updated = MachineManagementEngine.updateMachineStatus(machine, "FAULT");

    expect(updated.status).toBe("FAULT");
  });

  it("assigns primary, assistant, and temporary operators using existing personnel references", () => {
    const machine = MachineManagementEngine.createMachine({
      machineCode: "M-1004",
      name: "CNC Makinesi",
      brand: "CNCPro",
      model: "CNC-01",
      serialNumber: "SN-1004",
      productionYear: 2025,
      purchaseDate: "2025-01-15",
      commissionDate: "2025-02-01",
      warrantyStart: "2025-02-01",
      warrantyEnd: "2027-02-01",
      status: "ACTIVE",
    });

    const withPrimary = MachineManagementEngine.assignOperator(machine, {
      personnelId: "personnel-1",
      assignmentType: "PRIMARY_OPERATOR",
      assignedAt: "2026-07-01",
      notes: "Ana operatör",
    });

    const withAssistant = MachineManagementEngine.assignOperator(withPrimary, {
      personnelId: "personnel-2",
      assignmentType: "ASSISTANT_OPERATOR",
      assignedAt: "2026-07-01",
    });

    const withTemporary = MachineManagementEngine.assignOperator(withAssistant, {
      personnelId: "personnel-3",
      assignmentType: "TEMPORARY_ASSIGNMENT",
      assignedAt: "2026-07-02",
    });

    expect(withTemporary.operatorAssignments).toHaveLength(3);
    expect(withTemporary.operatorAssignments[0]?.assignmentType).toBe("PRIMARY_OPERATOR");
    expect(withTemporary.operatorAssignments[1]?.assignmentType).toBe("ASSISTANT_OPERATOR");
    expect(withTemporary.operatorAssignments[2]?.assignmentType).toBe("TEMPORARY_ASSIGNMENT");
  });

  it("records maintenance entries and keeps the timeline", () => {
    const machine = MachineManagementEngine.createMachine({
      machineCode: "M-1005",
      name: "Laminasyon Makinesi",
      brand: "LaminaTech",
      model: "LAM-400",
      serialNumber: "SN-1005",
      productionYear: 2024,
      purchaseDate: "2024-03-10",
      commissionDate: "2024-04-01",
      warrantyStart: "2024-04-01",
      warrantyEnd: "2026-04-01",
      status: "ACTIVE",
    });

    const withMaintenance = MachineManagementEngine.addMaintenanceRecord(machine, {
      maintenanceDate: "2026-07-01",
      maintenanceType: "ROUTINE",
      performedBy: "Teknik Servis",
      durationHours: 4,
      cost: 1800,
      description: "Periyodik bakım",
      technicalNotes: "Filtre kontrol edildi",
    });

    expect(withMaintenance.maintenanceRecords).toHaveLength(1);
    expect(withMaintenance.maintenanceRecords[0]?.description).toBe("Periyodik bakım");
    expect(withMaintenance.timelineEvents).toHaveLength(1);
    expect(withMaintenance.timelineEvents[0]?.eventType).toBe("MAINTENANCE");
  });

  it("stores spare parts with supplier reference", () => {
    const machine = MachineManagementEngine.createMachine({
      machineCode: "M-1006",
      name: "Delik Makinesi",
      brand: "DrillTech",
      model: "DRL-50",
      serialNumber: "SN-1006",
      productionYear: 2021,
      purchaseDate: "2021-06-20",
      commissionDate: "2021-07-01",
      warrantyStart: "2021-07-01",
      warrantyEnd: "2023-07-01",
      status: "ACTIVE",
    });

    const withSparePart = MachineManagementEngine.addSparePart(machine, {
      name: "Fırça",
      partNumber: "SP-001",
      supplierId: "supplier-1",
      replacementDate: "2026-07-10",
      cost: 350,
      notes: "Yedek parçalar",
    });

    expect(withSparePart.spareParts).toHaveLength(1);
    expect(withSparePart.spareParts[0]?.partNumber).toBe("SP-001");
    expect(withSparePart.spareParts[0]?.supplierId).toBe("supplier-1");
  });

  it("stores consumables with lifecycle information", () => {
    const machine = MachineManagementEngine.createMachine({
      machineCode: "M-1007",
      name: "Yüzey İşleme Makinesi",
      brand: "SurfacePro",
      model: "SUR-200",
      serialNumber: "SN-1007",
      productionYear: 2024,
      purchaseDate: "2024-08-01",
      commissionDate: "2024-09-01",
      warrantyStart: "2024-09-01",
      warrantyEnd: "2026-09-01",
      status: "ACTIVE",
    });

    const withConsumable = MachineManagementEngine.addConsumable(machine, {
      name: "Kesme Elmas",
      installationDate: "2026-06-01",
      replacementDate: "2026-07-01",
      expectedLifetimeHours: 200,
      actualLifetimeHours: 180,
      replacementReason: "Aşınma",
      cost: 950,
      supplierId: "supplier-2",
      notes: "Sürekli kullanım",
    });

    expect(withConsumable.consumables).toHaveLength(1);
    expect(withConsumable.consumables[0]?.name).toBe("Kesme Elmas");
    expect(withConsumable.consumables[0]?.replacementReason).toBe("Aşınma");
  });

  it("stores supplier and service company references", () => {
    const machine = MachineManagementEngine.createMachine({
      machineCode: "M-1008",
      name: "Kalite Kontrol Makinesi",
      brand: "QualityLine",
      model: "QLT-100",
      serialNumber: "SN-1008",
      productionYear: 2023,
      purchaseDate: "2023-10-01",
      commissionDate: "2023-11-01",
      warrantyStart: "2023-11-01",
      warrantyEnd: "2025-11-01",
      status: "ACTIVE",
    });

    const withSupplier = MachineManagementEngine.addSupplier(machine, {
      supplierId: "supplier-3",
      companyName: "Glass Parts A.Ş.",
      contactPerson: "Selin Demir",
      phone: "02125551234",
      email: "sales@glassparts.com",
      address: "İstanbul",
      website: "https://glassparts.com",
    });

    const withServiceCompany = MachineManagementEngine.addServiceCompany(withSupplier, {
      serviceCompanyId: "service-1",
      companyName: "Teknik Destek Ltd.",
      contactPerson: "Ahmet Yıldız",
      phone: "02125557654",
      email: "service@teknikdestek.com",
      address: "Kocaeli",
      website: "https://teknikdestek.com",
    });

    expect(withServiceCompany.suppliers).toHaveLength(1);
    expect(withServiceCompany.serviceCompanies).toHaveLength(1);
    expect(withServiceCompany.suppliers[0]?.companyName).toBe("Glass Parts A.Ş.");
  });

  it("stores machine documents as references for future integrations", () => {
    const machine = MachineManagementEngine.createMachine({
      machineCode: "M-1009",
      name: "Boya Makinesi",
      brand: "PaintLine",
      model: "PAI-90",
      serialNumber: "SN-1009",
      productionYear: 2022,
      purchaseDate: "2022-11-01",
      commissionDate: "2022-12-01",
      warrantyStart: "2022-12-01",
      warrantyEnd: "2024-12-01",
      status: "ACTIVE",
    });

    const withDocument = MachineManagementEngine.addDocument(machine, {
      documentId: "doc-1",
      documentType: "MANUAL",
      title: "Kullanım Kılavuzu",
      reference: "manuals/paint.pdf",
      notes: "PDF referansı",
    });

    expect(withDocument.documents).toHaveLength(1);
    expect(withDocument.documents[0]?.documentType).toBe("MANUAL");
    expect(withDocument.documents[0]?.title).toBe("Kullanım Kılavuzu");
  });

  it("prepares future compatibility relationships without implementing calculations", () => {
    const machine = MachineManagementEngine.createMachine({
      machineCode: "M-1010",
      name: "Sandblasting Makinesi",
      brand: "BlastLine",
      model: "SBL-120",
      serialNumber: "SN-1010",
      productionYear: 2024,
      purchaseDate: "2024-12-01",
      commissionDate: "2025-01-01",
      warrantyStart: "2025-01-01",
      warrantyEnd: "2027-01-01",
      status: "ACTIVE",
    });

    expect(machine.futureCompatibility.oee).toBe(true);
    expect(machine.futureCompatibility.machineCostEngine).toBe(true);
    expect(machine.futureCompatibility.maintenanceCostEngine).toBe(true);
    expect(machine.futureCompatibility.predictiveMaintenance).toBe(true);
    expect(machine.futureCompatibility.iot).toBe(true);
    expect(machine.futureCompatibility.machineAnalytics).toBe(true);
  });
});
