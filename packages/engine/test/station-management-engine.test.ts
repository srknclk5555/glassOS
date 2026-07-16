import { describe, expect, it } from "vitest";
import { StationManagementEngine } from "../src/index.js";

describe("StationManagementEngine", () => {
  it("creates a station card with the required production fields", () => {
    const station = StationManagementEngine.createStation({
      stationCode: "ST-1001",
      name: "Kesim İstasyonu",
      description: "Sipariş kesim akışı",
      status: "ACTIVE",
      displayOrder: 1,
      notes: "Ana üretim istasyonu",
    });

    expect(station.stationCode).toBe("ST-1001");
    expect(station.name).toBe("Kesim İstasyonu");
    expect(station.status).toBe("ACTIVE");
    expect(station.displayOrder).toBe(1);
  });

  it("creates a configurable station type", () => {
    const stationType = StationManagementEngine.createStationType({
      code: "CUTTING",
      name: "Cutting",
      description: "Kesim istasyonu",
    });

    expect(stationType.code).toBe("CUTTING");
    expect(stationType.name).toBe("Cutting");
  });

  it("assigns machines without duplicating machine management models", () => {
    const station = StationManagementEngine.createStation({
      stationCode: "ST-1002",
      name: "Rodaj İstasyonu",
      description: "Rodaj akışı",
      status: "ACTIVE",
      displayOrder: 2,
    });

    const withMachine = StationManagementEngine.assignMachine(station, {
      machineId: "machine-1",
      machineCode: "M-1001",
      assignedAt: "2026-07-16",
    });

    expect(withMachine.machineAssignments).toHaveLength(1);
    expect(withMachine.machineAssignments[0]?.machineId).toBe("machine-1");
  });

  it("assigns personnel without duplicating personnel management models", () => {
    const station = StationManagementEngine.createStation({
      stationCode: "ST-1003",
      name: "Temper İstasyonu",
      description: "Temper akışı",
      status: "BUSY",
      displayOrder: 3,
    });

    const withPersonnel = StationManagementEngine.assignPersonnel(station, {
      personnelId: "personnel-1",
      employeeNumber: "EMP-1001",
      assignedAt: "2026-07-16",
    });

    expect(withPersonnel.personnelAssignments).toHaveLength(1);
    expect(withPersonnel.personnelAssignments[0]?.personnelId).toBe("personnel-1");
  });

  it("stores queue references without owning queue logic", () => {
    const station = StationManagementEngine.createStation({
      stationCode: "ST-1004",
      name: "Kalite İstasyonu",
      description: "Kalite kontrol",
      status: "MAINTENANCE",
      displayOrder: 4,
    });

    const withQueue = StationManagementEngine.addQueueReference(station, {
      queueId: "queue-1",
      queueName: "Quality Queue",
      assignedAt: "2026-07-16",
    });

    expect(withQueue.queueReferences).toHaveLength(1);
    expect(withQueue.queueReferences[0]?.queueId).toBe("queue-1");
  });

  it("stores capacity metadata without calculations", () => {
    const station = StationManagementEngine.createStation({
      stationCode: "ST-1005",
      name: "Yıkama İstasyonu",
      description: "Yıkama",
      status: "ACTIVE",
      displayOrder: 5,
    });

    const withCapacity = StationManagementEngine.setCapacity(station, {
      maximumActiveJobs: 8,
      maximumConcurrentMachines: 3,
      maximumConcurrentOperators: 4,
    });

    expect(withCapacity.capacity?.maximumActiveJobs).toBe(8);
    expect(withCapacity.capacity?.maximumConcurrentMachines).toBe(3);
    expect(withCapacity.capacity?.maximumConcurrentOperators).toBe(4);
  });

  it("prepares dashboard data for future reporting", () => {
    const station = StationManagementEngine.createStation({
      stationCode: "ST-1006",
      name: "Sevkiyat İstasyonu",
      description: "Sevkiyat",
      status: "CLOSED",
      displayOrder: 6,
    });

    const withDashboard = StationManagementEngine.setDashboard(station, {
      waitingJobs: 2,
      runningJobs: 1,
      completedJobs: 5,
      machineCount: 1,
      personnelCount: 2,
      faultCount: 0,
    });

    expect(withDashboard.dashboard?.waitingJobs).toBe(2);
    expect(withDashboard.dashboard?.runningJobs).toBe(1);
    expect(withDashboard.dashboard?.completedJobs).toBe(5);
    expect(withDashboard.dashboard?.faultCount).toBe(0);
  });
});
