import { describe, expect, it } from "vitest";
import { PersonnelManagementEngine } from "../src/index.js";

describe("PersonnelManagementEngine", () => {
  it("creates personnel with required card fields and independent title/role", () => {
    const title = PersonnelManagementEngine.createTitle({ name: "Operator" });
    const role = PersonnelManagementEngine.createRole({ name: "Production Operator", permissions: ["CUTTING"] });
    const personnel = PersonnelManagementEngine.createPersonnel({
      employeeNumber: "EMP-1001",
      firstName: "Ali",
      lastName: "Yılmaz",
      titleId: title.titleId,
      roleId: role.roleId,
      status: "ACTIVE",
      hireDate: "2026-01-15",
      notes: "Production operator",
    });

    expect(personnel.employeeNumber).toBe("EMP-1001");
    expect(personnel.firstName).toBe("Ali");
    expect(personnel.lastName).toBe("Yılmaz");
    expect(personnel.titleId).toBe(title.titleId);
    expect(personnel.roleId).toBe(role.roleId);
    expect(personnel.status).toBe("ACTIVE");
    expect(personnel.roleId).not.toBe(personnel.titleId);
  });

  it("assigns stations for operator visibility", () => {
    const personnel = PersonnelManagementEngine.createPersonnel({
      employeeNumber: "EMP-1002",
      firstName: "Merve",
      lastName: "Kaya",
      titleId: "title-operator",
      roleId: "role-operator",
      status: "ACTIVE",
      hireDate: "2026-02-01",
    });

    const withStations = PersonnelManagementEngine.assignStations(personnel, ["CUTTING", "GRINDING"]);

    expect(withStations.activeStations).toEqual(["CUTTING", "GRINDING"]);
  });

  it("assigns machines with primary, assistant, and temporary roles", () => {
    const personnel = PersonnelManagementEngine.createPersonnel({
      employeeNumber: "EMP-1003",
      firstName: "Can",
      lastName: "Demir",
      titleId: "title-chief",
      roleId: "role-chief",
      status: "ACTIVE",
      hireDate: "2026-02-10",
    });

    const withAssignments = PersonnelManagementEngine.assignMachine(personnel, {
      machineId: "machine-1",
      assignmentType: "PRIMARY_OPERATOR",
      isActive: true,
    });

    const withAssistant = PersonnelManagementEngine.assignMachine(withAssignments, {
      machineId: "machine-2",
      assignmentType: "ASSISTANT_OPERATOR",
      isActive: true,
    });

    const withTemporary = PersonnelManagementEngine.assignMachine(withAssistant, {
      machineId: "machine-3",
      assignmentType: "TEMPORARY_ASSIGNMENT",
      isActive: true,
    });

    expect(withTemporary.machineAssignments).toHaveLength(3);
    expect(withTemporary.machineAssignments[0]?.assignmentType).toBe("PRIMARY_OPERATOR");
    expect(withTemporary.machineAssignments[1]?.assignmentType).toBe("ASSISTANT_OPERATOR");
    expect(withTemporary.machineAssignments[2]?.assignmentType).toBe("TEMPORARY_ASSIGNMENT");
  });

  it("assigns shifts with stations and machines", () => {
    const shift = PersonnelManagementEngine.createShift({
      name: "Morning",
      startTime: "06:00",
      endTime: "14:00",
      stations: ["CUTTING", "QUALITY"],
      machines: ["machine-1", "machine-2"],
    });

    const personnel = PersonnelManagementEngine.createPersonnel({
      employeeNumber: "EMP-1004",
      firstName: "Eda",
      lastName: "Sarı",
      titleId: "title-operator",
      roleId: "role-operator",
      status: "ACTIVE",
      hireDate: "2026-02-15",
    });

    const withShift = PersonnelManagementEngine.assignShift(personnel, shift.shiftId);

    expect(withShift.shifts).toEqual([shift.shiftId]);
  });

  it("stores health information and emergency contact reference data", () => {
    const personnel = PersonnelManagementEngine.createPersonnel({
      employeeNumber: "EMP-1005",
      firstName: "Deniz",
      lastName: "Açık",
      titleId: "title-driver",
      roleId: "role-driver",
      status: "ACTIVE",
      hireDate: "2026-03-01",
    });

    const withHealth = PersonnelManagementEngine.setHealthInformation(personnel, {
      bloodGroup: "A+",
      disabilityInformation: "None",
      medicalNotes: "No limitations",
      emergencyContact: "Ayşe Açık",
      emergencyPhone: "05551234567",
    });

    const withContact = PersonnelManagementEngine.addEmergencyContact(withHealth, {
      contactId: "contact-1",
      name: "Ayşe Açık",
      relationship: "Spouse",
      phone: "05551234567",
    });

    expect(withContact.health?.bloodGroup).toBe("A+");
    expect(withContact.health?.emergencyPhone).toBe("05551234567");
    expect(withContact.emergencyContacts).toHaveLength(1);
    expect(withContact.emergencyContacts[0]?.name).toBe("Ayşe Açık");
  });

  it("prepares future compatibility relationships without calculating reports", () => {
    const personnel = PersonnelManagementEngine.createPersonnel({
      employeeNumber: "EMP-1006",
      firstName: "Selin",
      lastName: "Toprak",
      titleId: "title-maintenance",
      roleId: "role-maintenance",
      status: "ACTIVE",
      hireDate: "2026-03-08",
    });

    expect(personnel.futureCompatibility.performanceReports).toBe(true);
    expect(personnel.futureCompatibility.breakageReports).toBe(true);
    expect(personnel.futureCompatibility.rework).toBe(true);
    expect(personnel.futureCompatibility.productionStatistics).toBe(true);
    expect(personnel.futureCompatibility.machineUtilization).toBe(true);
  });
});
