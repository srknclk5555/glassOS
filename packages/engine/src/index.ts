import { FactoryConfiguration } from "@repo/types";

const createEngineId = (prefix: string): string => {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export type EngineMetadata = Readonly<{
  version: number;
  createdAt: string;
  engineVersion: string;
  factoryConfigurationVersion: number;
}>;

export type GlassSheet = Readonly<{
  sheetId: string;
  barcode: string;
  materialId: string;
  materialCode: string;
  glassType: string;
  thickness: number;
  color: string;
  nominalWidth: number;
  nominalHeight: number;
  usableWidth: number;
  usableHeight: number;
  grossArea: number;
  usableArea: number;
  trimConfigurationSnapshot: Readonly<{
    enabled: boolean;
    leftMm: number;
    rightMm: number;
    topMm: number;
    bottomMm: number;
  }>;
  purchaseLotId: string;
  purchasePrice: number;
  receivedDate: string;
  status: string;
  metadata: EngineMetadata;
}>;

export type ProductionCalculationResult = Readonly<{
  dimensions: Readonly<{
    netWidth: number;
    netHeight: number;
    productionWidth: number;
    productionHeight: number;
  }>;
  areas: Readonly<{
    netArea: number;
    productionArea: number;
    glassConsumptionArea: number;
    trimLossArea: number | null;
    grindingLossArea: number | null;
    remnantArea: number | null;
    scrapArea: number | null;
    usedSheetArea: number | null;
    totalWasteArea: number | null;
  }>;
  grinding: Readonly<{
    enabled: boolean;
    leftMm: number;
    rightMm: number;
    topMm: number;
    bottomMm: number;
    totalWidthMm: number;
    totalHeightMm: number;
  }>;
  consumption: Readonly<{
    glassConsumptionArea: number;
  }>;
  statistics: Readonly<{
    yieldPercentage: number | null;
    wastePercentage: number | null;
  }>;
  metadata: Readonly<{
    materialId: string | null;
    glassType: string | null;
    factoryId: string | null;
    configurationVersion: number | null;
  }>;
  netWidth: number;
  netHeight: number;
  productionWidth: number;
  productionHeight: number;
  netArea: number;
  productionArea: number;
  grindingValues: Readonly<{
    leftMm: number;
    rightMm: number;
    topMm: number;
    bottomMm: number;
    totalWidthMm: number;
    totalHeightMm: number;
  }>;
  glassConsumptionArea: number;
  consumptionArea: number;
}>;

export type RemnantCandidate = Readonly<{
  width: number;
  height: number;
  area: number;
  isReusable: boolean;
  reason: string;
}>;

export type ScrapCandidate = Readonly<{
  width: number;
  height: number;
  area: number;
  reason: string;
}>;

export type CuttingStatistics = Readonly<{
  totalArea: number;
  totalWaste: number;
  totalRemnant: number;
  totalScrap: number;
  totalYield: number;
  totalSheetCount: number;
}>;

export type CuttingResult = Readonly<{
  productionResult: Readonly<{
    productionWidth: number;
    productionHeight: number;
    productionArea: number;
  }>;
  usedSheets: ReadonlyArray<string>;
  usedArea: number;
  orderedArea: number;
  productionArea: number;
  glassConsumptionArea: number;
  trimLossArea: number;
  grindingLossArea: number;
  scrapArea: number;
  remnantArea: number;
  totalWasteArea: number;
  yieldPercentage: number;
  wastePercentage: number;
  remnants: ReadonlyArray<RemnantCandidate>;
  scraps: ReadonlyArray<ScrapCandidate>;
  statistics: CuttingStatistics;
  metadata: EngineMetadata;
}>;

export type BatchCuttingOrder = Readonly<{
  orderId: string;
  orderLineId: string;
  customerReference: string;
  quantity: number;
  sheet: GlassSheet;
  orderWidthMm: number;
  orderHeightMm: number;
}>;

export type BatchCuttingSessionSummary = Readonly<{
  results: ReadonlyArray<CuttingResult>;
  session: CuttingSession;
}>;

export type SheetAllocationAssignment = Readonly<{
  orderId: string;
  orderLineId: string;
  sheetId: string;
  materialId: string;
  lotId: string;
  usedArea: number;
  remainingArea: number;
  remnantArea: number;
  scrapArea: number;
}>;

export type SheetAllocationSheet = Readonly<{
  sheetId: string;
  materialId: string;
  lotId: string;
  usedArea: number;
  remainingArea: number;
  remnantArea: number;
  scrapArea: number;
  allocations: ReadonlyArray<SheetAllocationAssignment>;
}>;

export type SheetAllocationResult = Readonly<{
  allocations: ReadonlyArray<SheetAllocationAssignment>;
  sheets: ReadonlyArray<SheetAllocationSheet>;
}>;

export class CuttingResultEngine {
  static calculate(
    sheet: GlassSheet,
    orderWidthMm: number,
    orderHeightMm: number,
    factoryConfiguration: FactoryConfiguration
  ): CuttingResult {
    const productionCalculation = ProductionCalculationService.calculate(
      orderWidthMm,
      orderHeightMm,
      factoryConfiguration
    );

    const productionWidth = productionCalculation.productionWidth;
    const productionHeight = productionCalculation.productionHeight;
    const productionArea = productionCalculation.productionArea;
    const usedArea = productionArea;
    const glassConsumptionArea = productionCalculation.glassConsumptionArea;

    const leftoverWidth = Math.max(0, sheet.usableWidth - productionWidth);
    const leftoverHeight = Math.max(0, sheet.usableHeight - productionHeight);
    const leftoverArea = Math.max(0, (leftoverWidth * leftoverHeight) / 1_000_000);

    const remnantDecision = RemnantDecisionService.decide(
      leftoverWidth,
      leftoverHeight,
      leftoverArea,
      factoryConfiguration
    );

    const scrapDecision = ScrapDecisionService.decide(
      leftoverWidth,
      leftoverHeight,
      leftoverArea,
      remnantDecision,
      factoryConfiguration
    );

    const remnantArea = scrapDecision.decision === "keep" ? leftoverArea : 0;
    const scrapArea = scrapDecision.decision === "scrap" ? leftoverArea : 0;

    const totalWasteArea = remnantArea + scrapArea;
    const yieldPercentage = productionArea > 0 ? (productionArea / Math.max(glassConsumptionArea, productionArea)) * 100 : 0;
    const wastePercentage = totalWasteArea > 0 ? (totalWasteArea / Math.max(glassConsumptionArea, productionArea)) * 100 : 0;

    const result: CuttingResult = {
      productionResult: {
        productionWidth,
        productionHeight,
        productionArea,
      },
      usedSheets: [sheet.sheetId],
      usedArea,
      orderedArea: productionArea,
      productionArea,
      glassConsumptionArea,
      trimLossArea: 0,
      grindingLossArea: 0,
      scrapArea,
      remnantArea,
      totalWasteArea,
      yieldPercentage,
      wastePercentage,
      remnants: remnantArea > 0 ? [{ width: leftoverWidth, height: leftoverHeight, area: leftoverArea, isReusable: true, reason: remnantDecision.reason }] : [],
      scraps: scrapArea > 0 ? [{ width: leftoverWidth, height: leftoverHeight, area: leftoverArea, reason: scrapDecision.reason }] : [],
      statistics: {
        totalArea: productionArea,
        totalWaste: totalWasteArea,
        totalRemnant: remnantArea,
        totalScrap: scrapArea,
        totalYield: yieldPercentage,
        totalSheetCount: 1,
      },
      metadata: {
        version: 1,
        createdAt: new Date().toISOString(),
        engineVersion: "2.3.7",
        factoryConfigurationVersion: factoryConfiguration.version,
      },
    };

    return result;
  }
}

export type CuttingSessionStatus = "draft" | "in_progress" | "completed" | "cancelled";

export type OrderReference = Readonly<{
  orderId: string;
  orderLineId: string;
  customerReference: string;
  quantity: number;
  netDimensions: Readonly<{
    width: number;
    height: number;
  }>;
  productionDimensions: Readonly<{
    width: number;
    height: number;
  }>;
}>;

export type SheetUsage = Readonly<{
  usedArea: number;
  remainingArea: number;
  trimArea: number;
  grindingArea: number;
  scrapArea: number;
  remnantArea: number;
}>;

export type CuttingSession = Readonly<{
  sessionId: string;
  factoryId: string;
  productionDate: string;
  operatorId: string;
  machineId: string;
  materialId: string;
  glassType: string;
  sheetSize: Readonly<{
    width: number;
    height: number;
  }>;
  sheetCount: number;
  totalOrderedArea: number;
  totalProductionArea: number;
  totalGlassConsumptionArea: number;
  totalTrimArea: number;
  totalGrindingArea: number;
  totalRemnantArea: number;
  totalScrapArea: number;
  yieldPercentage: number;
  wastePercentage: number;
  status: CuttingSessionStatus;
  sheets: ReadonlyArray<string>;
  orders: ReadonlyArray<OrderReference>;
  remnants: ReadonlyArray<RemnantCandidate>;
  scraps: ReadonlyArray<ScrapCandidate>;
  cuttingResultId: string | null;
  version: number;
  createdAt: string;
  engineVersion: string;
  factoryConfigurationVersion: number;
}>;

export type ExecutionStatus = "CREATED" | "READY" | "CUTTING" | "COMPLETED" | "CANCELLED";

export type ExecutionOrder = Readonly<{
  orderId: string;
  orderLineId: string;
  customerReference: string;
  quantity: number;
  sheet: GlassSheet;
  orderWidthMm: number;
  orderHeightMm: number;
  status: "PENDING" | "REMOVED";
}>;

export type ExecutionStatistics = Readonly<{
  orderCount: number;
  usedSheetCount: number;
  totalOrderedArea: number;
  totalProductionArea: number;
  totalGlassConsumptionArea: number;
  totalTrimArea: number;
  totalGrindingArea: number;
  totalRemnantArea: number;
  totalScrapArea: number;
  totalWasteArea: number;
  yieldPercentage: number;
  wastePercentage: number;
}>;

export type ExecutionBatch = Readonly<{
  batchId: string;
  operatorId: string;
  machineId: string;
  materialId: string | null;
  glassType: string | null;
  glassThickness: number | null;
  orderCount: number;
  usedSheetCount: number;
  startedAt: string | null;
  completedAt: string | null;
  status: ExecutionStatus;
  orders: ReadonlyArray<ExecutionOrder>;
  statistics: ExecutionStatistics;
  createdAt: string;
  version: number;
  engineVersion: string;
}>;

export type ExecutionResult = Readonly<{
  batch: ExecutionBatch;
  batchCuttingSummary: BatchCuttingSessionSummary;
  executionStatistics: ExecutionStatistics;
  productionCalculationResults: ReadonlyArray<ProductionCalculationResult>;
}>;

export type ProductionOperationCode =
  | "CUTTING"
  | "GRINDING"
  | "DRILLING"
  | "CNC"
  | "TEMPERING"
  | "LAMINATING"
  | "INSULATING_GLASS"
  | "QUALITY_CONTROL"
  | "PACKAGING"
  | "DISPATCH"
  | (string & {});

export type ProductionOperationStatus =
  | "WAITING"
  | "READY"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "REWORK"
  | "CANCELLED";

export type ProductionOperation = Readonly<{
  code: ProductionOperationCode;
  name: string;
  sequence: number;
  isTerminal?: boolean;
}>;

export type ProductionQueueItem = Readonly<{
  itemId: string;
  orderId: string;
  orderLineId: string;
  operationCode: ProductionOperationCode;
  materialId: string;
  status: ProductionOperationStatus;
  completedOperations: ReadonlyArray<ProductionOperationCode>;
  createdAt: string;
}>;

export type ProductionQueue = Readonly<{
  operation: ProductionOperation;
  items: ReadonlyArray<ProductionQueueItem>;
  createdAt: string;
}>;

export type ProductionProgress = Readonly<{
  orderId: string;
  orderLineId: string;
  completedOperations: number;
  totalOperations: number;
  percentage: number;
  isCompleted: boolean;
  currentOperation: ProductionOperationCode | null;
}>;

export class CuttingExecutionEngine {
  static createBatch(input: Readonly<{
    operatorId: string;
    machineId?: string;
    materialId?: string | null;
    glassType?: string | null;
    glassThickness?: number | null;
  }>): ExecutionBatch {
    return {
      batchId: `batch-${Date.now()}`,
      operatorId: input.operatorId,
      machineId: input.machineId ?? "machine-placeholder",
      materialId: input.materialId ?? null,
      glassType: input.glassType ?? null,
      glassThickness: input.glassThickness ?? null,
      orderCount: 0,
      usedSheetCount: 0,
      startedAt: null,
      completedAt: null,
      status: "CREATED",
      orders: [],
      statistics: {
        orderCount: 0,
        usedSheetCount: 0,
        totalOrderedArea: 0,
        totalProductionArea: 0,
        totalGlassConsumptionArea: 0,
        totalTrimArea: 0,
        totalGrindingArea: 0,
        totalRemnantArea: 0,
        totalScrapArea: 0,
        totalWasteArea: 0,
        yieldPercentage: 0,
        wastePercentage: 0,
      },
      createdAt: new Date().toISOString(),
      version: 1,
      engineVersion: "2.3.10",
    };
  }

  static addOrder(batch: ExecutionBatch, order: ExecutionOrder): ExecutionBatch {
    const nextOrders = [...batch.orders, { ...order, status: "PENDING" as const }];
    return {
      ...batch,
      orders: nextOrders,
      orderCount: nextOrders.length,
      status: nextOrders.length > 0 ? "READY" : "CREATED",
      statistics: {
        ...batch.statistics,
        orderCount: nextOrders.length,
      },
    };
  }

  static removeOrder(batch: ExecutionBatch, orderId: string): ExecutionBatch {
    const nextOrders = batch.orders.filter((order) => order.orderId !== orderId);
    return {
      ...batch,
      orders: nextOrders,
      orderCount: nextOrders.length,
      status: nextOrders.length > 0 ? "READY" : "CREATED",
      statistics: {
        ...batch.statistics,
        orderCount: nextOrders.length,
      },
    };
  }

  static calculateOrderCount(batch: ExecutionBatch): number {
    return batch.orders.length;
  }

  static setUsedSheetCount(batch: ExecutionBatch, usedSheetCount: number): ExecutionBatch {
    return {
      ...batch,
      usedSheetCount,
      statistics: {
        ...batch.statistics,
        usedSheetCount,
      },
    };
  }

  static startCutting(batch: ExecutionBatch): ExecutionBatch {
    return {
      ...batch,
      status: "CUTTING",
      startedAt: batch.startedAt ?? new Date().toISOString(),
    };
  }

  static completeCutting(batch: ExecutionBatch): ExecutionBatch {
    return {
      ...batch,
      status: "COMPLETED",
      completedAt: batch.completedAt ?? new Date().toISOString(),
    };
  }

  static execute(batch: ExecutionBatch, factoryConfiguration: FactoryConfiguration): ExecutionResult {
    const batchOrders: BatchCuttingOrder[] = batch.orders.map((order) => ({
      orderId: order.orderId,
      orderLineId: order.orderLineId,
      customerReference: order.customerReference,
      quantity: order.quantity,
      sheet: order.sheet,
      orderWidthMm: order.orderWidthMm,
      orderHeightMm: order.orderHeightMm,
    }));

    const batchCuttingSummary = BatchCuttingEngine.calculate(batchOrders, factoryConfiguration);
    const productionCalculationResults = batch.orders.map((order) =>
      ProductionCalculationService.calculate(order.orderWidthMm, order.orderHeightMm, factoryConfiguration)
    );

    const executionStatistics: ExecutionStatistics = {
      orderCount: batch.orders.length,
      usedSheetCount: batch.usedSheetCount,
      totalOrderedArea: batchCuttingSummary.session.totalOrderedArea,
      totalProductionArea: batchCuttingSummary.session.totalProductionArea,
      totalGlassConsumptionArea: batchCuttingSummary.session.totalGlassConsumptionArea,
      totalTrimArea: batchCuttingSummary.session.totalTrimArea,
      totalGrindingArea: batchCuttingSummary.session.totalGrindingArea,
      totalRemnantArea: batchCuttingSummary.session.totalRemnantArea,
      totalScrapArea: batchCuttingSummary.session.totalScrapArea,
      totalWasteArea: batchCuttingSummary.session.totalRemnantArea + batchCuttingSummary.session.totalScrapArea,
      yieldPercentage: batchCuttingSummary.session.yieldPercentage,
      wastePercentage: batchCuttingSummary.session.wastePercentage,
    };

    const completedBatch: ExecutionBatch = {
      ...batch,
      orderCount: batch.orders.length,
      usedSheetCount: batch.usedSheetCount,
      status: "COMPLETED",
      startedAt: batch.startedAt ?? new Date().toISOString(),
      completedAt: new Date().toISOString(),
      statistics: executionStatistics,
    };

    return {
      batch: completedBatch,
      batchCuttingSummary,
      executionStatistics,
      productionCalculationResults,
    };
  }
}

export type PersonnelStatus = "ACTIVE" | "PASSIVE";

export type PersonnelTitle = Readonly<{
  titleId: string;
  name: string;
  description?: string;
  createdAt: string;
}>;

export type PersonnelRole = Readonly<{
  roleId: string;
  name: string;
  description?: string;
  permissions: ReadonlyArray<string>;
  createdAt: string;
}>;

export type PersonnelCertificate = Readonly<{
  certificateId: string;
  name: string;
  issuedAt?: string;
  expiresAt?: string;
  notes?: string;
}>;

export type PersonnelHealthInformation = Readonly<{
  bloodGroup?: string;
  disabilityInformation?: string;
  medicalNotes?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}>;

export type EmergencyContact = Readonly<{
  contactId: string;
  name: string;
  relationship?: string;
  phone?: string;
}>;

export type PersonnelShift = Readonly<{
  shiftId: string;
  name: string;
  startTime: string;
  endTime: string;
  stations: ReadonlyArray<string>;
  machines: ReadonlyArray<string>;
  createdAt: string;
}>;

export type PersonnelMachineAssignment = Readonly<{
  machineId: string;
  assignmentType: "PRIMARY_OPERATOR" | "ASSISTANT_OPERATOR" | "TEMPORARY_ASSIGNMENT";
  isActive: boolean;
}>;

export type PersonnelFutureCompatibility = Readonly<{
  performanceReports: boolean;
  breakageReports: boolean;
  rework: boolean;
  productionStatistics: boolean;
  machineUtilization: boolean;
}>;

export type Personnel = Readonly<{
  personnelId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  titleId: string;
  roleId: string;
  status: PersonnelStatus;
  hireDate: string;
  notes?: string;
  activeStations: ReadonlyArray<string>;
  machineAssignments: ReadonlyArray<PersonnelMachineAssignment>;
  shifts: ReadonlyArray<string>;
  certificates: ReadonlyArray<PersonnelCertificate>;
  health?: PersonnelHealthInformation;
  emergencyContacts: ReadonlyArray<EmergencyContact>;
  futureCompatibility: PersonnelFutureCompatibility;
  createdAt: string;
}>;

export class PersonnelManagementEngine {
  static createTitle(input: Readonly<{ name: string; description?: string }>): PersonnelTitle {
    return {
      titleId: `title-${Date.now()}`,
      name: input.name,
      description: input.description,
      createdAt: new Date().toISOString(),
    };
  }

  static createRole(input: Readonly<{ name: string; description?: string; permissions?: ReadonlyArray<string> }>): PersonnelRole {
    return {
      roleId: `role-${Date.now()}`,
      name: input.name,
      description: input.description,
      permissions: input.permissions ?? [],
      createdAt: new Date().toISOString(),
    };
  }

  static createShift(input: Readonly<{
    name: string;
    startTime: string;
    endTime: string;
    stations?: ReadonlyArray<string>;
    machines?: ReadonlyArray<string>;
  }>): PersonnelShift {
    return {
      shiftId: `shift-${Date.now()}`,
      name: input.name,
      startTime: input.startTime,
      endTime: input.endTime,
      stations: input.stations ?? [],
      machines: input.machines ?? [],
      createdAt: new Date().toISOString(),
    };
  }

  static createPersonnel(input: Readonly<{
    employeeNumber: string;
    firstName: string;
    lastName: string;
    titleId: string;
    roleId: string;
    status: PersonnelStatus;
    hireDate: string;
    notes?: string;
  }>): Personnel {
    return {
      personnelId: `personnel-${Date.now()}`,
      employeeNumber: input.employeeNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      titleId: input.titleId,
      roleId: input.roleId,
      status: input.status,
      hireDate: input.hireDate,
      notes: input.notes,
      activeStations: [],
      machineAssignments: [],
      shifts: [],
      certificates: [],
      emergencyContacts: [],
      futureCompatibility: {
        performanceReports: true,
        breakageReports: true,
        rework: true,
        productionStatistics: true,
        machineUtilization: true,
      },
      createdAt: new Date().toISOString(),
    };
  }

  static assignStations(personnel: Personnel, stations: ReadonlyArray<string>): Personnel {
    return {
      ...personnel,
      activeStations: [...stations],
    };
  }

  static assignMachine(personnel: Personnel, assignment: PersonnelMachineAssignment): Personnel {
    return {
      ...personnel,
      machineAssignments: [...personnel.machineAssignments, assignment],
    };
  }

  static assignShift(personnel: Personnel, shiftId: string): Personnel {
    return {
      ...personnel,
      shifts: personnel.shifts.includes(shiftId) ? personnel.shifts : [...personnel.shifts, shiftId],
    };
  }

  static setHealthInformation(personnel: Personnel, health: PersonnelHealthInformation): Personnel {
    return {
      ...personnel,
      health,
    };
  }

  static addEmergencyContact(personnel: Personnel, contact: EmergencyContact): Personnel {
    return {
      ...personnel,
      emergencyContacts: [...personnel.emergencyContacts, contact],
    };
  }
}

export type MachineStatus = "ACTIVE" | "PASSIVE" | "RUNNING" | "MAINTENANCE" | "FAULT" | "RETIRED";

export type MachineMaintenanceType = "ROUTINE" | "REPAIR" | "INSPECTION" | "CALIBRATION" | "EMERGENCY";

export type MachineTimelineEventType =
  | "MAINTENANCE"
  | "REPAIR"
  | "CONSUMABLE_CHANGE"
  | "SPARE_PART_REPLACEMENT"
  | "SOFTWARE_UPDATE"
  | "WARRANTY_EXTENSION"
  | "OTHER";

export type MachineType = Readonly<{
  typeId: string;
  name: string;
  description?: string;
  category: string;
  createdAt: string;
}>;

export type MachineCapacity = Readonly<{
  hourlyCapacity?: number;
  dailyCapacity?: number;
  maxGlassSize?: string;
  minGlassSize?: string;
  maxThickness?: number;
  minThickness?: number;
}>;

export type MachineOperatorAssignment = Readonly<{
  personnelId: string;
  assignmentType: "PRIMARY_OPERATOR" | "ASSISTANT_OPERATOR" | "TEMPORARY_ASSIGNMENT";
  assignedAt: string;
  notes?: string;
}>;

export type MachineMaintenanceRecord = Readonly<{
  maintenanceRecordId: string;
  maintenanceDate: string;
  maintenanceType: MachineMaintenanceType;
  performedBy: string;
  durationHours: number;
  cost: number;
  description: string;
  technicalNotes?: string;
  attachments: ReadonlyArray<string>;
  createdAt: string;
}>;

export type MachineTimelineEvent = Readonly<{
  eventId: string;
  eventDate: string;
  eventType: MachineTimelineEventType;
  title: string;
  description?: string;
  createdAt: string;
}>;

export type SparePart = Readonly<{
  sparePartId: string;
  name: string;
  partNumber: string;
  supplierId: string;
  replacementDate?: string;
  cost?: number;
  notes?: string;
  createdAt: string;
}>;

export type ConsumablePart = Readonly<{
  consumableId: string;
  name: string;
  installationDate?: string;
  replacementDate?: string;
  expectedLifetimeHours?: number;
  actualLifetimeHours?: number;
  replacementReason?: string;
  cost?: number;
  supplierId?: string;
  notes?: string;
  createdAt: string;
}>;

export type Supplier = Readonly<{
  supplierId: string;
  companyName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  createdAt: string;
}>;

export type ServiceCompany = Readonly<{
  serviceCompanyId: string;
  companyName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  createdAt: string;
}>;

export type MachineDocument = Readonly<{
  documentId: string;
  documentType: "MANUAL" | "MAINTENANCE_GUIDE" | "ELECTRICAL_DIAGRAM" | "HYDRAULIC_DIAGRAM" | "WARRANTY_FILE" | "OTHER";
  title: string;
  reference: string;
  notes?: string;
  createdAt: string;
}>;

export type MachineFutureCompatibility = Readonly<{
  oee: boolean;
  machineCostEngine: boolean;
  maintenanceCostEngine: boolean;
  predictiveMaintenance: boolean;
  iot: boolean;
  machineAnalytics: boolean;
}>;

export type Machine = Readonly<{
  machineId: string;
  machineCode: string;
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  productionYear?: number;
  purchaseDate?: string;
  commissionDate?: string;
  warrantyStart?: string;
  warrantyEnd?: string;
  status: MachineStatus;
  notes?: string;
  machineType?: MachineType;
  capacity?: MachineCapacity;
  operatorAssignments: ReadonlyArray<MachineOperatorAssignment>;
  maintenanceRecords: ReadonlyArray<MachineMaintenanceRecord>;
  timelineEvents: ReadonlyArray<MachineTimelineEvent>;
  spareParts: ReadonlyArray<SparePart>;
  consumables: ReadonlyArray<ConsumablePart>;
  suppliers: ReadonlyArray<Supplier>;
  serviceCompanies: ReadonlyArray<ServiceCompany>;
  documents: ReadonlyArray<MachineDocument>;
  futureCompatibility: MachineFutureCompatibility;
  createdAt: string;
}>;

export type StationStatus = "ACTIVE" | "PASSIVE" | "MAINTENANCE" | "BUSY" | "CLOSED";

export type StationType = Readonly<{
  typeId: string;
  code: string;
  name: string;
  description?: string;
  createdAt: string;
}>;

export type StationMachineAssignment = Readonly<{
  machineId: string;
  machineCode?: string;
  assignedAt: string;
}>;

export type StationPersonnelAssignment = Readonly<{
  personnelId: string;
  employeeNumber?: string;
  assignedAt: string;
}>;

export type StationQueueReference = Readonly<{
  queueId: string;
  queueName?: string;
  assignedAt: string;
}>;

export type StationCapacity = Readonly<{
  maximumActiveJobs?: number;
  maximumConcurrentMachines?: number;
  maximumConcurrentOperators?: number;
}>;

export type StationStatistics = Readonly<{
  waitingJobs?: number;
  runningJobs?: number;
  completedJobs?: number;
  machineCount?: number;
  personnelCount?: number;
  faultCount?: number;
}>;

export type StationDashboard = Readonly<{
  waitingJobs: number;
  runningJobs: number;
  completedJobs: number;
  machineCount: number;
  personnelCount: number;
  faultCount: number;
}>;

export type Station = Readonly<{
  stationId: string;
  stationCode: string;
  name: string;
  description?: string;
  stationType?: StationType;
  status: StationStatus;
  displayOrder: number;
  notes?: string;
  machineAssignments: ReadonlyArray<StationMachineAssignment>;
  personnelAssignments: ReadonlyArray<StationPersonnelAssignment>;
  queueReferences: ReadonlyArray<StationQueueReference>;
  capacity?: StationCapacity;
  dashboard?: StationDashboard;
  createdAt: string;
}>;

export type RecipeStatus = "ACTIVE" | "INACTIVE" | "DRAFT";

export type RecipeItemType = "RAW_MATERIAL" | "AUXILIARY_MATERIAL" | "PACKAGING" | "CONSUMABLE" | "SERVICE" | "BY_PRODUCT" | (string & {});

export type RecipeMaterial = Readonly<{
  materialId: string;
  materialCode: string;
  name: string;
  quantity: number;
  unit: string;
  createdAt: string;
}>;

export type RecipeItem = Readonly<{
  itemId: string;
  materialCode: string;
  name: string;
  quantity: number;
  unit: string;
  itemType: RecipeItemType;
  formula?: string;
  notes?: string;
  createdAt: string;
}>;

export type RecipeYield = Readonly<{
  yieldId: string;
  name: string;
  quantity: number;
  unit: string;
  description?: string;
  createdAt: string;
}>;

export type RecipeVersion = Readonly<{
  versionId: string;
  versionNumber: number;
  effectiveDate: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}>;

export type RecipeOperation = Readonly<{
  operationId: string;
  operationCode: string;
  name: string;
  sequence: number;
  createdAt: string;
}>;

export type RecipeOperationRule = Readonly<{
  ruleId: string;
  ruleCode: string;
  description?: string;
  isRequired: boolean;
  createdAt: string;
}>;

export type RecipeValidation = Readonly<{
  validationId: string;
  validationCode: string;
  description?: string;
  severity: "INFO" | "WARNING" | "ERROR";
  createdAt: string;
}>;

export type RecipeConsumptionRule = Readonly<{
  consumptionRuleId: string;
  sourceMaterialCode: string;
  targetMaterialCode: string;
  quantity: number;
  unit: string;
  description?: string;
  createdAt: string;
}>;

export type RecipeCapacityRule = Readonly<{
  capacityRuleId: string;
  operationCode: string;
  multiplier: number;
  description?: string;
  createdAt: string;
}>;

export type ProductRecipe = Readonly<{
  recipeId: string;
  recipeCode: string;
  productName: string;
  name?: string;
  description?: string;
  status: RecipeStatus;
  notes?: string;
  version?: number;
  effectiveDate?: string;
  materials: ReadonlyArray<RecipeMaterial>;
  items: ReadonlyArray<RecipeItem>;
  versions: ReadonlyArray<RecipeVersion>;
  yields: ReadonlyArray<RecipeYield>;
  operations: ReadonlyArray<RecipeOperation>;
  operationRules: ReadonlyArray<RecipeOperationRule>;
  validations: ReadonlyArray<RecipeValidation>;
  consumptionRules: ReadonlyArray<RecipeConsumptionRule>;
  capacityRules: ReadonlyArray<RecipeCapacityRule>;
  createdAt: string;
  updatedAt?: string;
}>;

export type InventoryStatus = "ACTIVE" | "PASSIVE" | "DRAFT" | (string & {});

export type InventoryTypeCode = "RAW_MATERIAL" | "SEMI_FINISHED" | "FINISHED_PRODUCT" | "TRADED_GOODS" | "CONSUMABLE" | "SPARE_PART" | "PACKAGING" | "SERVICE" | "SCRAP" | "REMNANT" | "BY_PRODUCT" | (string & {});

export type InventoryCategory = Readonly<{
  categoryId: string;
  code: string;
  name: string;
  description?: string;
  createdAt: string;
}>;

export type InventoryType = Readonly<{
  typeId: string;
  code: InventoryTypeCode;
  name: string;
  description?: string;
  createdAt: string;
}>;

export type InventoryUnit = Readonly<{
  unitId: string;
  code: string;
  name: string;
  description?: string;
  conversionPrepared?: boolean;
  createdAt: string;
}>;

export type InventoryLocation = Readonly<{
  locationId: string;
  code: string;
  name: string;
  description?: string;
  createdAt: string;
}>;

export type InventoryLot = Readonly<{
  lotId: string;
  lotNumber: string;
  supplierLot?: string;
  productionLot?: string;
  expirationDate?: string;
  receivedDate?: string;
  status: "OPEN" | "CLOSED" | "EXPIRED" | "REJECTED" | (string & {});
  createdAt: string;
}>;

export type InventoryBarcode = Readonly<{
  barcodeId: string;
  internalBarcode?: string;
  supplierBarcode?: string;
  qrCode?: string;
  rfidTag?: string;
  createdAt: string;
}>;

export type InventoryReservation = Readonly<{
  reservationId: string;
  reservationType: "PRODUCTION" | "SALES" | "TRANSFER" | (string & {});
  referenceId: string;
  quantity: number;
  unit: string;
  createdAt: string;
}>;

export type InventoryMetadata = Readonly<{
  metadataId: string;
  recipeCompatibility: boolean;
  productionQueueCompatibility: boolean;
  machineCompatibility: boolean;
  personnelCompatibility: boolean;
  factoryConfigurationCompatibility: boolean;
  costEngineCompatibility: boolean;
  reworkCompatibility: boolean;
  createdAt: string;
}>;

export type InventoryValidation = Readonly<{
  validationId: string;
  validationCode: string;
  description?: string;
  severity: "INFO" | "WARNING" | "ERROR";
  createdAt: string;
}>;

export type InventoryItem = Readonly<{
  inventoryId: string;
  inventoryCode: string;
  name: string;
  description?: string;
  category?: InventoryCategory;
  type?: InventoryType;
  unit?: InventoryUnit;
  status: InventoryStatus;
  notes?: string;
  location?: InventoryLocation;
  lot?: InventoryLot;
  barcodes: ReadonlyArray<InventoryBarcode>;
  reservations: ReadonlyArray<InventoryReservation>;
  metadata?: InventoryMetadata;
  createdAt: string;
  updatedAt?: string;
}>;

export type InventoryConsumptionReason = "PRODUCTION" | "REWORK" | "MANUAL" | "ADJUSTMENT" | "SAMPLE" | "TRAINING" | (string & {});

export type InventoryConsumptionLine = Readonly<{
  lineId: string;
  inventoryCode: string;
  lotNumber?: string;
  quantity: number;
  unit: string;
  area?: number;
  notes?: string;
  createdAt: string;
}>;

export type ConsumptionSource = Readonly<{
  sourceId: string;
  sourceType: "INVENTORY_ITEM" | "INVENTORY_LOT" | (string & {});
  referenceId: string;
  createdAt: string;
}>;

export type ConsumptionRelationship = Readonly<{
  relationshipId: string;
  relationshipType: "RECIPE" | "PRODUCTION_QUEUE" | "REWORK" | "INVENTORY" | "PRODUCTION_CALCULATION" | (string & {});
  referenceId: string;
  createdAt: string;
}>;

export type InventoryConsumption = Readonly<{
  consumptionId: string;
  referenceId: string;
  reason: InventoryConsumptionReason;
  notes?: string;
  lines: ReadonlyArray<InventoryConsumptionLine>;
  sources: ReadonlyArray<ConsumptionSource>;
  relationships: ReadonlyArray<ConsumptionRelationship>;
  createdAt: string;
  updatedAt?: string;
}>;

export type ConsumptionValidation = Readonly<{
  validationId: string;
  validationCode: string;
  description?: string;
  severity: "INFO" | "WARNING" | "ERROR";
  createdAt: string;
}>;

export type ConsumptionResult = Readonly<{
  consumption: InventoryConsumption;
  validations: ReadonlyArray<ConsumptionValidation>;
}>;

export class InventoryConsumptionEngine {
  static createConsumption(input: Readonly<{ referenceId: string; reason: InventoryConsumptionReason; notes?: string }>): InventoryConsumption {
    return {
      consumptionId: createEngineId("consumption"),
      referenceId: input.referenceId,
      reason: input.reason,
      notes: input.notes,
      lines: [],
      sources: [],
      relationships: [],
      createdAt: new Date().toISOString(),
    };
  }

  static addLine(consumption: InventoryConsumption, input: Readonly<{ inventoryCode: string; lotNumber?: string; quantity: number; unit: string; area?: number; notes?: string }>): InventoryConsumption {
    return {
      ...consumption,
      lines: [
        ...consumption.lines,
        {
          lineId: createEngineId("consumption-line"),
          inventoryCode: input.inventoryCode,
          lotNumber: input.lotNumber,
          quantity: input.quantity,
          unit: input.unit,
          area: input.area,
          notes: input.notes,
          createdAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };
  }

  static addSource(consumption: InventoryConsumption, input: Readonly<{ sourceType: ConsumptionSource["sourceType"]; referenceId: string }>): InventoryConsumption {
    return {
      ...consumption,
      sources: [
        ...consumption.sources,
        {
          sourceId: createEngineId("consumption-source"),
          sourceType: input.sourceType,
          referenceId: input.referenceId,
          createdAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };
  }

  static addRelationship(consumption: InventoryConsumption, input: Readonly<{ relationshipType: ConsumptionRelationship["relationshipType"]; referenceId: string }>): InventoryConsumption {
    return {
      ...consumption,
      relationships: [
        ...consumption.relationships,
        {
          relationshipId: createEngineId("consumption-relationship"),
          relationshipType: input.relationshipType,
          referenceId: input.referenceId,
          createdAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };
  }

  static validateConsumption(
    consumption: InventoryConsumption,
    context: Readonly<{ inventoryCodes?: ReadonlyArray<string>; activeInventoryCodes?: ReadonlyArray<string>; activeLotNumbers?: ReadonlyArray<string> }> = {}
  ): ReadonlyArray<ConsumptionValidation> {
    const validations: ConsumptionValidation[] = [];

    if (consumption.lines.length === 0) {
      validations.push({
        validationId: createEngineId("validation"),
        validationCode: "MISSING_INVENTORY",
        description: "At least one consumption line is required.",
        severity: "ERROR",
        createdAt: new Date().toISOString(),
      });
    }

    const inventoryCodes = new Set(context.inventoryCodes ?? []);
    const activeInventoryCodes = new Set(context.activeInventoryCodes ?? []);
    const activeLotNumbers = new Set(context.activeLotNumbers ?? []);

    for (const line of consumption.lines) {
      if (!activeInventoryCodes.has(line.inventoryCode) && !inventoryCodes.has(line.inventoryCode)) {
        validations.push({
          validationId: createEngineId("validation"),
          validationCode: "MISSING_INVENTORY",
          description: `Inventory ${line.inventoryCode} does not exist in the current context.`,
          severity: "ERROR",
          createdAt: new Date().toISOString(),
        });
      }

      const duplicateLine = consumption.lines.filter((candidate) => candidate.inventoryCode === line.inventoryCode && candidate.lotNumber === line.lotNumber).length > 1;
      if (duplicateLine) {
        validations.push({
          validationId: createEngineId("validation"),
          validationCode: "DUPLICATE_LINE",
          description: `Duplicate consumption line detected for ${line.inventoryCode}.`,
          severity: "WARNING",
          createdAt: new Date().toISOString(),
        });
      }

      if (line.quantity <= 0) {
        validations.push({
          validationId: createEngineId("validation"),
          validationCode: "INVALID_QUANTITY",
          description: `Quantity for ${line.inventoryCode} must be greater than zero.`,
          severity: "ERROR",
          createdAt: new Date().toISOString(),
        });
      }

      if (line.lotNumber && !activeLotNumbers.has(line.lotNumber)) {
        validations.push({
          validationId: createEngineId("validation"),
          validationCode: "INACTIVE_LOT",
          description: `Lot ${line.lotNumber} is not active in the current context.`,
          severity: "WARNING",
          createdAt: new Date().toISOString(),
        });
      }
    }

    return validations;
  }

  static createResult(consumption: InventoryConsumption, validations: ReadonlyArray<ConsumptionValidation>): ConsumptionResult {
    return {
      consumption,
      validations,
    };
  }
}

export type ReworkReason = "BREAKAGE" | "MEASUREMENT_ERROR" | "QUALITY_REJECT" | "WRONG_PRODUCTION" | "EDGE_GRINDING" | "TRIM" | "UNKNOWN" | (string & {});

export type ReworkStatus = "DRAFT" | "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | (string & {});

export type BreakageLocation = Readonly<{
  locationId: string;
  station: string;
  machine?: string;
  area?: string;
  createdAt: string;
}>;

export type BreakageOwnership = "CUSTOMER" | "FACTORY_FIRE_INVENTORY" | (string & {});

export type FireInventoryStatus = "AVAILABLE" | "REWORK_REQUIRED" | "SCRAP" | "RETURNED_TO_STOCK" | "SOLD" | "DISPOSED" | (string & {});

export type FireInventoryCategory = "USABLE_OFFCUT" | "BROKEN_GLASS" | "TRIM" | "EDGE_GRINDING" | "MEASUREMENT_ERROR" | "WRONG_PRODUCTION" | "QUALITY_REJECT" | (string & {});

export type BreakageEvent = Readonly<{
  breakageId: string;
  breakageDate: string;
  breakageTime: string;
  station: string;
  machine: string;
  operator: string;
  shift: string;
  productionBatch: string;
  order: string;
  orderLine: string;
  glassPiece: string;
  reason: ReworkReason;
  notes?: string;
  ownership: BreakageOwnership;
  location?: BreakageLocation;
  supervisor?: string;
  createdAt: string;
  updatedAt?: string;
}>;

export type FireInventoryItem = Readonly<{
  fireInventoryId: string;
  category: FireInventoryCategory;
  quantity: number;
  unit: string;
  referenceId: string;
  status: FireInventoryStatus;
  breakageEventId?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}>;

export type ReworkRequest = Readonly<{
  reworkRequestId: string;
  breakageEventId: string;
  reason: ReworkReason;
  requestedFromStation: string;
  restartStation: string;
  status: ReworkStatus;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}>;

export type ReworkOrder = Readonly<{
  reworkOrderId: string;
  reworkRequestId: string;
  breakageEventId: string;
  reason: ReworkReason;
  status: ReworkStatus;
  restartStation: string;
  createdAt: string;
  updatedAt?: string;
}>;

export type BreakageStatistics = Readonly<{
  totalBreakages: number;
  breakagesByReason: Readonly<Record<string, number>>;
  breakagesByStation: Readonly<Record<string, number>>;
  breakagesByMachine: Readonly<Record<string, number>>;
  reworkRequiredCount: number;
}>;

export type ReworkValidation = Readonly<{
  validationId: string;
  validationCode: string;
  description?: string;
  severity: "INFO" | "WARNING" | "ERROR";
  createdAt: string;
}>;

export class ReworkManagementEngine {
  static createBreakageEvent(input: Readonly<{
    station: string;
    machine: string;
    operator: string;
    shift: string;
    productionBatch: string;
    order: string;
    orderLine: string;
    glassPiece: string;
    reason: ReworkReason;
    notes?: string;
    supervisor?: string;
    ownership?: BreakageOwnership;
    breakageDate?: string;
    breakageTime?: string;
  }>): BreakageEvent {
    const now = new Date();
    return {
      breakageId: createEngineId("breakage"),
      breakageDate: input.breakageDate ?? now.toISOString().slice(0, 10),
      breakageTime: input.breakageTime ?? now.toTimeString().slice(0, 8),
      station: input.station,
      machine: input.machine,
      operator: input.operator,
      shift: input.shift,
      productionBatch: input.productionBatch,
      order: input.order,
      orderLine: input.orderLine,
      glassPiece: input.glassPiece,
      reason: input.reason,
      notes: input.notes,
      ownership: input.ownership ?? "FACTORY_FIRE_INVENTORY",
      supervisor: input.supervisor,
      createdAt: now.toISOString(),
    };
  }

  static transferOwnership(breakageEvent: BreakageEvent, input: Readonly<{ ownership: BreakageOwnership }>): BreakageEvent {
    return {
      ...breakageEvent,
      ownership: input.ownership,
      updatedAt: new Date().toISOString(),
    };
  }

  static createFireInventoryItem(input: Readonly<{
    category: FireInventoryCategory;
    quantity: number;
    unit: string;
    referenceId: string;
    status?: FireInventoryStatus;
    breakageEventId?: string;
    notes?: string;
  }>): FireInventoryItem {
    return {
      fireInventoryId: createEngineId("fire-inventory"),
      category: input.category,
      quantity: input.quantity,
      unit: input.unit,
      referenceId: input.referenceId,
      status: input.status ?? "AVAILABLE",
      breakageEventId: input.breakageEventId,
      notes: input.notes,
      createdAt: new Date().toISOString(),
    };
  }

  static updateFireInventoryStatus(fireInventoryItem: FireInventoryItem, status: FireInventoryStatus): FireInventoryItem {
    return {
      ...fireInventoryItem,
      status,
      updatedAt: new Date().toISOString(),
    };
  }

  static createReworkRequest(input: Readonly<{
    breakageEventId: string;
    reason: ReworkReason;
    requestedFromStation: string;
    notes?: string;
    status?: ReworkStatus;
  }>): ReworkRequest {
    return {
      reworkRequestId: createEngineId("rework-request"),
      breakageEventId: input.breakageEventId,
      reason: input.reason,
      requestedFromStation: input.requestedFromStation,
      restartStation: "CUTTING",
      status: input.status ?? "OPEN",
      notes: input.notes,
      createdAt: new Date().toISOString(),
    };
  }

  static createReworkOrder(input: Readonly<{
    reworkRequestId: string;
    breakageEventId: string;
    reason: ReworkReason;
    restartStation?: string;
    status?: ReworkStatus;
  }>): ReworkOrder {
    return {
      reworkOrderId: createEngineId("rework-order"),
      reworkRequestId: input.reworkRequestId,
      breakageEventId: input.breakageEventId,
      reason: input.reason,
      status: input.status ?? "OPEN",
      restartStation: input.restartStation ?? "CUTTING",
      createdAt: new Date().toISOString(),
    };
  }

  static createStatistics(input: Readonly<{
    totalBreakages: number;
    breakagesByReason: Readonly<Record<string, number>>;
    breakagesByStation: Readonly<Record<string, number>>;
    breakagesByMachine: Readonly<Record<string, number>>;
    reworkRequiredCount: number;
  }>): BreakageStatistics {
    return {
      totalBreakages: input.totalBreakages,
      breakagesByReason: input.breakagesByReason,
      breakagesByStation: input.breakagesByStation,
      breakagesByMachine: input.breakagesByMachine,
      reworkRequiredCount: input.reworkRequiredCount,
    };
  }

  static validateRework(input: Readonly<{
    breakageEvent: BreakageEvent;
    reworkRequest?: ReworkRequest;
    existingRequests?: ReadonlyArray<ReworkRequest>;
    fireInventoryItems?: ReadonlyArray<FireInventoryItem>;
  }>): ReadonlyArray<ReworkValidation> {
    const validations: ReworkValidation[] = [];

    if (!input.breakageEvent.reason || input.breakageEvent.reason.trim().length === 0) {
      validations.push({
        validationId: createEngineId("validation"),
        validationCode: "MISSING_REASON",
        description: "A breakage reason is required.",
        severity: "ERROR",
        createdAt: new Date().toISOString(),
      });
    }

    if (!input.breakageEvent.operator || input.breakageEvent.operator.trim().length === 0) {
      validations.push({
        validationId: createEngineId("validation"),
        validationCode: "MISSING_OPERATOR",
        description: "The responsible operator is required.",
        severity: "ERROR",
        createdAt: new Date().toISOString(),
      });
    }

    if (!input.breakageEvent.station || input.breakageEvent.station.trim().length === 0) {
      validations.push({
        validationId: createEngineId("validation"),
        validationCode: "MISSING_STATION",
        description: "The station where the breakage occurred is required.",
        severity: "ERROR",
        createdAt: new Date().toISOString(),
      });
    }

    if (!input.breakageEvent.machine || input.breakageEvent.machine.trim().length === 0) {
      validations.push({
        validationId: createEngineId("validation"),
        validationCode: "MISSING_MACHINE",
        description: "The machine used at the time of breakage is required.",
        severity: "ERROR",
        createdAt: new Date().toISOString(),
      });
    }

    if (input.breakageEvent.ownership !== "FACTORY_FIRE_INVENTORY" && input.breakageEvent.ownership !== "CUSTOMER") {
      validations.push({
        validationId: createEngineId("validation"),
        validationCode: "INVALID_OWNERSHIP",
        description: "Ownership must be assigned to either customer or factory fire inventory.",
        severity: "ERROR",
        createdAt: new Date().toISOString(),
      });
    }

    const existingRequests = input.existingRequests ?? [];
    if (input.reworkRequest && existingRequests.some((request) => request.breakageEventId === input.reworkRequest?.breakageEventId)) {
      validations.push({
        validationId: createEngineId("validation"),
        validationCode: "DUPLICATE_REWORK_REQUEST",
        description: "A rework request for this breakage already exists.",
        severity: "WARNING",
        createdAt: new Date().toISOString(),
      });
    }

    for (const item of input.fireInventoryItems ?? []) {
      if (item.category === "BROKEN_GLASS" || item.category === "USABLE_OFFCUT" || item.category === "TRIM" || item.category === "EDGE_GRINDING" || item.category === "MEASUREMENT_ERROR" || item.category === "WRONG_PRODUCTION" || item.category === "QUALITY_REJECT") {
        continue;
      }
      validations.push({
        validationId: createEngineId("validation"),
        validationCode: "INVALID_FIRE_CATEGORY",
        description: `Fire inventory category ${item.category} is not supported.`,
        severity: "ERROR",
        createdAt: new Date().toISOString(),
      });
    }

    return validations;
  }
}

export class InventoryManagementEngine {
  static createCategory(input: Readonly<{ code: string; name: string; description?: string }>): InventoryCategory {
    return {
      categoryId: createEngineId("category"),
      code: input.code,
      name: input.name,
      description: input.description,
      createdAt: new Date().toISOString(),
    };
  }

  static createType(input: Readonly<{ code: InventoryTypeCode; name: string; description?: string }>): InventoryType {
    return {
      typeId: createEngineId("type"),
      code: input.code,
      name: input.name,
      description: input.description,
      createdAt: new Date().toISOString(),
    };
  }

  static createUnit(input: Readonly<{ code: string; name: string; description?: string; conversionPrepared?: boolean }>): InventoryUnit {
    return {
      unitId: createEngineId("unit"),
      code: input.code,
      name: input.name,
      description: input.description,
      conversionPrepared: input.conversionPrepared ?? true,
      createdAt: new Date().toISOString(),
    };
  }

  static createLocation(input: Readonly<{ code: string; name: string; description?: string }>): InventoryLocation {
    return {
      locationId: createEngineId("location"),
      code: input.code,
      name: input.name,
      description: input.description,
      createdAt: new Date().toISOString(),
    };
  }

  static createLot(input: Readonly<{
    lotNumber: string;
    supplierLot?: string;
    productionLot?: string;
    expirationDate?: string;
    receivedDate?: string;
    status?: InventoryLot["status"];
  }>): InventoryLot {
    return {
      lotId: createEngineId("lot"),
      lotNumber: input.lotNumber,
      supplierLot: input.supplierLot,
      productionLot: input.productionLot,
      expirationDate: input.expirationDate,
      receivedDate: input.receivedDate,
      status: input.status ?? "OPEN",
      createdAt: new Date().toISOString(),
    };
  }

  static createBarcode(input: Readonly<{ internalBarcode?: string; supplierBarcode?: string; qrCode?: string; rfidTag?: string }>): InventoryBarcode {
    return {
      barcodeId: createEngineId("barcode"),
      internalBarcode: input.internalBarcode,
      supplierBarcode: input.supplierBarcode,
      qrCode: input.qrCode,
      rfidTag: input.rfidTag,
      createdAt: new Date().toISOString(),
    };
  }

  static createReservation(input: Readonly<{ reservationType: InventoryReservation["reservationType"]; referenceId: string; quantity: number; unit: string }>): InventoryReservation {
    return {
      reservationId: createEngineId("reservation"),
      reservationType: input.reservationType,
      referenceId: input.referenceId,
      quantity: input.quantity,
      unit: input.unit,
      createdAt: new Date().toISOString(),
    };
  }

  static createMetadata(): InventoryMetadata {
    return {
      metadataId: createEngineId("metadata"),
      recipeCompatibility: true,
      productionQueueCompatibility: true,
      machineCompatibility: true,
      personnelCompatibility: true,
      factoryConfigurationCompatibility: true,
      costEngineCompatibility: true,
      reworkCompatibility: true,
      createdAt: new Date().toISOString(),
    };
  }

  static createInventoryItem(input: Readonly<{
    inventoryCode: string;
    name: string;
    description?: string;
    category?: InventoryCategory;
    type?: InventoryType;
    unit?: InventoryUnit;
    status?: InventoryStatus;
    notes?: string;
  }>): InventoryItem {
    return {
      inventoryId: createEngineId("inventory"),
      inventoryCode: input.inventoryCode,
      name: input.name,
      description: input.description,
      category: input.category,
      type: input.type,
      unit: input.unit,
      status: input.status ?? "ACTIVE",
      notes: input.notes,
      barcodes: [],
      reservations: [],
      metadata: this.createMetadata(),
      createdAt: new Date().toISOString(),
    };
  }

  static assignLocation(item: InventoryItem, location: InventoryLocation): InventoryItem {
    return {
      ...item,
      location,
      updatedAt: new Date().toISOString(),
    };
  }

  static assignLot(item: InventoryItem, lot: InventoryLot): InventoryItem {
    return {
      ...item,
      lot,
      updatedAt: new Date().toISOString(),
    };
  }

  static addBarcode(item: InventoryItem, barcode: InventoryBarcode): InventoryItem {
    return {
      ...item,
      barcodes: [...item.barcodes, barcode],
      updatedAt: new Date().toISOString(),
    };
  }

  static addReservation(item: InventoryItem, reservation: InventoryReservation): InventoryItem {
    return {
      ...item,
      reservations: [...item.reservations, reservation],
      updatedAt: new Date().toISOString(),
    };
  }

  static validateInventoryItem(item: InventoryItem, existingItems: ReadonlyArray<InventoryItem> = []): ReadonlyArray<InventoryValidation> {
    const validations: InventoryValidation[] = [];

    if (existingItems.some((existing) => existing.inventoryCode === item.inventoryCode && existing.inventoryId !== item.inventoryId)) {
      validations.push({
        validationId: createEngineId("validation"),
        validationCode: "DUPLICATE_INVENTORY_CODE",
        description: "Inventory code must be unique.",
        severity: "ERROR",
        createdAt: new Date().toISOString(),
      });
    }

    if (item.status === "PASSIVE") {
      validations.push({
        validationId: createEngineId("validation"),
        validationCode: "INACTIVE_INVENTORY",
        description: "Passive inventory items require review.",
        severity: "WARNING",
        createdAt: new Date().toISOString(),
      });
    }

    if (!item.unit) {
      validations.push({
        validationId: createEngineId("validation"),
        validationCode: "MISSING_UNIT",
        description: "Inventory item must define a unit.",
        severity: "ERROR",
        createdAt: new Date().toISOString(),
      });
    }

    if (!item.category) {
      validations.push({
        validationId: createEngineId("validation"),
        validationCode: "INVALID_CATEGORY",
        description: "Inventory item must define a category.",
        severity: "ERROR",
        createdAt: new Date().toISOString(),
      });
    }

    if (!item.type) {
      validations.push({
        validationId: createEngineId("validation"),
        validationCode: "INVALID_TYPE",
        description: "Inventory item must define a type.",
        severity: "ERROR",
        createdAt: new Date().toISOString(),
      });
    }

    if (item.barcodes.some((barcode) => barcode.internalBarcode || barcode.supplierBarcode || barcode.qrCode)) {
      const barcodeValues = item.barcodes.flatMap((barcode) => [barcode.internalBarcode, barcode.supplierBarcode, barcode.qrCode]).filter(Boolean) as string[];
      const duplicates = barcodeValues.filter((value, index) => barcodeValues.indexOf(value) !== index);
      if (duplicates.length > 0) {
        validations.push({
          validationId: createEngineId("validation"),
          validationCode: "DUPLICATE_BARCODE",
          description: "Inventory barcodes must be unique.",
          severity: "WARNING",
          createdAt: new Date().toISOString(),
        });
      }
    }

    return validations;
  }
}

export class RecipeManagementEngine {
  static createRecipe(input: Readonly<{
    recipeCode: string;
    productName: string;
    description?: string;
    status?: RecipeStatus;
    notes?: string;
    effectiveDate?: string;
  }>): ProductRecipe {
    const now = new Date().toISOString();

    return {
      recipeId: `recipe-${Date.now()}`,
      recipeCode: input.recipeCode,
      productName: input.productName,
      name: input.productName,
      description: input.description,
      status: input.status ?? "ACTIVE",
      notes: input.notes,
      version: 1,
      effectiveDate: input.effectiveDate ?? now,
      materials: [],
      items: [],
      versions: [],
      yields: [],
      operations: [],
      operationRules: [],
      validations: [],
      consumptionRules: [],
      capacityRules: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  static addMaterial(recipe: ProductRecipe, material: Readonly<{ materialCode: string; name: string; quantity: number; unit: string }>): ProductRecipe {
    const createdAt = new Date().toISOString();

    return {
      ...recipe,
      materials: [
        ...recipe.materials,
        {
          materialId: `material-${Date.now()}`,
          materialCode: material.materialCode,
          name: material.name,
          quantity: material.quantity,
          unit: material.unit,
          createdAt,
        },
      ],
      items: recipe.items.length > 0 ? recipe.items : [
        ...recipe.items,
        {
          itemId: `item-${Date.now()}`,
          materialCode: material.materialCode,
          name: material.name,
          quantity: material.quantity,
          unit: material.unit,
          itemType: "RAW_MATERIAL" as RecipeItemType,
          createdAt,
        },
      ],
      updatedAt: createdAt,
    };
  }

  static addRecipeItem(recipe: ProductRecipe, item: Readonly<{ materialCode: string; name: string; quantity: number; unit: string; itemType?: RecipeItemType; formula?: string; notes?: string }>): ProductRecipe {
    const createdAt = new Date().toISOString();

    return {
      ...recipe,
      materials: [
        ...recipe.materials,
        {
          materialId: `material-${Date.now()}`,
          materialCode: item.materialCode,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          createdAt,
        },
      ],
      items: [
        ...recipe.items,
        {
          itemId: `item-${Date.now()}`,
          materialCode: item.materialCode,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          itemType: item.itemType ?? "RAW_MATERIAL",
          formula: item.formula,
          notes: item.notes,
          createdAt,
        },
      ],
      updatedAt: createdAt,
    };
  }

  static addYield(recipe: ProductRecipe, yieldInput: Readonly<{ name: string; quantity: number; unit: string; description?: string }>): ProductRecipe {
    const createdAt = new Date().toISOString();

    return {
      ...recipe,
      yields: [
        ...recipe.yields,
        {
          yieldId: `yield-${Date.now()}`,
          name: yieldInput.name,
          quantity: yieldInput.quantity,
          unit: yieldInput.unit,
          description: yieldInput.description,
          createdAt,
        },
      ],
      updatedAt: createdAt,
    };
  }

  static addVersion(recipe: ProductRecipe, version: Readonly<{ versionNumber: number; effectiveDate: string; notes?: string; isActive?: boolean }>): ProductRecipe {
    const createdAt = new Date().toISOString();
    const nextVersions = recipe.versions.map((existingVersion) => ({
      ...existingVersion,
      isActive: version.isActive === true ? false : existingVersion.isActive,
    }));

    const nextVersion: RecipeVersion = {
      versionId: `version-${Date.now()}`,
      versionNumber: version.versionNumber,
      effectiveDate: version.effectiveDate,
      notes: version.notes,
      isActive: version.isActive ?? true,
      createdAt,
    };

    return {
      ...recipe,
      versions: [
        ...nextVersions,
        nextVersion,
      ],
      version: nextVersion.versionNumber,
      effectiveDate: nextVersion.effectiveDate,
      updatedAt: createdAt,
    };
  }

  static addOperation(recipe: ProductRecipe, operation: Readonly<{ operationCode: string; name: string; sequence: number }>): ProductRecipe {
    const createdAt = new Date().toISOString();

    return {
      ...recipe,
      operations: [
        ...recipe.operations,
        {
          operationId: `operation-${Date.now()}`,
          operationCode: operation.operationCode,
          name: operation.name,
          sequence: operation.sequence,
          createdAt,
        },
      ],
      updatedAt: createdAt,
    };
  }

  static addOperationRule(recipe: ProductRecipe, rule: Readonly<{ ruleCode: string; description?: string; isRequired: boolean }>): ProductRecipe {
    const createdAt = new Date().toISOString();

    return {
      ...recipe,
      operationRules: [
        ...recipe.operationRules,
        {
          ruleId: `rule-${Date.now()}`,
          ruleCode: rule.ruleCode,
          description: rule.description,
          isRequired: rule.isRequired,
          createdAt,
        },
      ],
      updatedAt: createdAt,
    };
  }

  static addCapacityRule(recipe: ProductRecipe, rule: Readonly<{ operationCode: string; multiplier: number; description?: string }>): ProductRecipe {
    const createdAt = new Date().toISOString();

    return {
      ...recipe,
      capacityRules: [
        ...recipe.capacityRules,
        {
          capacityRuleId: `capacity-rule-${Date.now()}`,
          operationCode: rule.operationCode,
          multiplier: rule.multiplier,
          description: rule.description,
          createdAt,
        },
      ],
      updatedAt: createdAt,
    };
  }

  static addConsumptionRule(recipe: ProductRecipe, rule: Readonly<{ sourceMaterialCode: string; targetMaterialCode: string; quantity: number; unit: string; description?: string }>): ProductRecipe {
    const createdAt = new Date().toISOString();

    return {
      ...recipe,
      consumptionRules: [
        ...recipe.consumptionRules,
        {
          consumptionRuleId: `consumption-rule-${Date.now()}`,
          sourceMaterialCode: rule.sourceMaterialCode,
          targetMaterialCode: rule.targetMaterialCode,
          quantity: rule.quantity,
          unit: rule.unit,
          description: rule.description,
          createdAt,
        },
      ],
      updatedAt: createdAt,
    };
  }

  static addValidation(recipe: ProductRecipe, validation: Readonly<{ validationCode: string; description?: string; severity: RecipeValidation["severity"] }>): ProductRecipe {
    const createdAt = new Date().toISOString();

    return {
      ...recipe,
      validations: [
        ...recipe.validations,
        {
          validationId: `validation-${Date.now()}`,
          validationCode: validation.validationCode,
          description: validation.description,
          severity: validation.severity,
          createdAt,
        },
      ],
      updatedAt: createdAt,
    };
  }

  static validateRecipe(recipe: ProductRecipe): ReadonlyArray<RecipeValidation> {
    const validations: RecipeValidation[] = [];

    if (!recipe.recipeCode.trim()) {
      validations.push({
        validationId: `validation-${Date.now()}`,
        validationCode: "MISSING_RECIPE",
        description: "Recipe code is required.",
        severity: "ERROR",
        createdAt: new Date().toISOString(),
      });
    }

    if (recipe.status === "INACTIVE") {
      validations.push({
        validationId: `validation-${Date.now()}`,
        validationCode: "INACTIVE_RECIPE",
        description: "Inactive recipes cannot be used in production planning.",
        severity: "WARNING",
        createdAt: new Date().toISOString(),
      });
    }

    const codeLookup = new Set<string>();
    const itemCodes = recipe.items.length > 0 ? recipe.items : recipe.materials.map((material) => ({
      materialCode: material.materialCode,
      quantity: material.quantity,
      name: material.name,
    }));

    for (const item of itemCodes) {
      const code = item.materialCode.toLowerCase();
      if (codeLookup.has(code)) {
        validations.push({
          validationId: `validation-${Date.now()}`,
          validationCode: "DUPLICATE_ITEM",
          description: `Duplicate material item detected for ${item.materialCode}.`,
          severity: "WARNING",
          createdAt: new Date().toISOString(),
        });
      } else {
        codeLookup.add(code);
      }

      if (item.quantity <= 0) {
        validations.push({
          validationId: `validation-${Date.now()}`,
          validationCode: "INVALID_QUANTITY",
          description: `Quantity for ${item.materialCode} must be greater than zero.`,
          severity: "ERROR",
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (recipe.versions.length === 0) {
      validations.push({
        validationId: `validation-${Date.now()}`,
        validationCode: "VERSION_VALIDATION",
        description: "At least one recipe version is required.",
        severity: "WARNING",
        createdAt: new Date().toISOString(),
      });
    } else if (!recipe.versions.some((version) => version.isActive)) {
      validations.push({
        validationId: `validation-${Date.now()}`,
        validationCode: "VERSION_VALIDATION",
        description: "Exactly one active recipe version is required.",
        severity: "WARNING",
        createdAt: new Date().toISOString(),
      });
    }

    return validations;
  }
}

export class StationManagementEngine {
  static createStation(input: Readonly<{
    stationCode: string;
    name: string;
    description?: string;
    status: StationStatus;
    displayOrder?: number;
    notes?: string;
  }>): Station {
    return {
      stationId: `station-${Date.now()}`,
      stationCode: input.stationCode,
      name: input.name,
      description: input.description,
      status: input.status,
      displayOrder: input.displayOrder ?? 0,
      notes: input.notes,
      machineAssignments: [],
      personnelAssignments: [],
      queueReferences: [],
      createdAt: new Date().toISOString(),
    };
  }

  static createStationType(input: Readonly<{ code: string; name: string; description?: string }>): StationType {
    return {
      typeId: `station-type-${Date.now()}`,
      code: input.code,
      name: input.name,
      description: input.description,
      createdAt: new Date().toISOString(),
    };
  }

  static assignMachine(station: Station, assignment: StationMachineAssignment): Station {
    return {
      ...station,
      machineAssignments: [...station.machineAssignments, assignment],
    };
  }

  static assignPersonnel(station: Station, assignment: StationPersonnelAssignment): Station {
    return {
      ...station,
      personnelAssignments: [...station.personnelAssignments, assignment],
    };
  }

  static addQueueReference(station: Station, queueReference: StationQueueReference): Station {
    return {
      ...station,
      queueReferences: [...station.queueReferences, queueReference],
    };
  }

  static setCapacity(station: Station, capacity: StationCapacity): Station {
    return {
      ...station,
      capacity,
    };
  }

  static setDashboard(station: Station, dashboard: StationDashboard): Station {
    return {
      ...station,
      dashboard,
    };
  }

  static setStationType(station: Station, stationType: StationType): Station {
    return {
      ...station,
      stationType,
    };
  }

  static updateStatus(station: Station, status: StationStatus): Station {
    return {
      ...station,
      status,
    };
  }
}

export class MachineManagementEngine {
  static createMachine(input: Readonly<{
    machineCode: string;
    name: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    productionYear?: number;
    purchaseDate?: string;
    commissionDate?: string;
    warrantyStart?: string;
    warrantyEnd?: string;
    status: MachineStatus;
    notes?: string;
  }>): Machine {
    return {
      machineId: `machine-${Date.now()}`,
      machineCode: input.machineCode,
      name: input.name,
      brand: input.brand,
      model: input.model,
      serialNumber: input.serialNumber,
      productionYear: input.productionYear,
      purchaseDate: input.purchaseDate,
      commissionDate: input.commissionDate,
      warrantyStart: input.warrantyStart,
      warrantyEnd: input.warrantyEnd,
      status: input.status,
      notes: input.notes,
      operatorAssignments: [],
      maintenanceRecords: [],
      timelineEvents: [],
      spareParts: [],
      consumables: [],
      suppliers: [],
      serviceCompanies: [],
      documents: [],
      futureCompatibility: {
        oee: true,
        machineCostEngine: true,
        maintenanceCostEngine: true,
        predictiveMaintenance: true,
        iot: true,
        machineAnalytics: true,
      },
      createdAt: new Date().toISOString(),
    };
  }

  static setMachineType(machine: Machine, input: Readonly<{ typeId: string; name: string; description?: string; category: string }>): Machine {
    return {
      ...machine,
      machineType: {
        typeId: input.typeId,
        name: input.name,
        description: input.description,
        category: input.category,
        createdAt: new Date().toISOString(),
      },
    };
  }

  static setCapacity(machine: Machine, capacity: MachineCapacity): Machine {
    return {
      ...machine,
      capacity,
    };
  }

  static updateMachineStatus(machine: Machine, status: MachineStatus): Machine {
    return {
      ...machine,
      status,
    };
  }

  static assignOperator(machine: Machine, assignment: MachineOperatorAssignment): Machine {
    return {
      ...machine,
      operatorAssignments: [...machine.operatorAssignments, assignment],
    };
  }

  static addMaintenanceRecord(machine: Machine, input: Readonly<{
    maintenanceDate: string;
    maintenanceType: MachineMaintenanceType;
    performedBy: string;
    durationHours: number;
    cost: number;
    description: string;
    technicalNotes?: string;
  }>): Machine {
    const maintenanceRecord: MachineMaintenanceRecord = {
      maintenanceRecordId: `maintenance-${Date.now()}`,
      maintenanceDate: input.maintenanceDate,
      maintenanceType: input.maintenanceType,
      performedBy: input.performedBy,
      durationHours: input.durationHours,
      cost: input.cost,
      description: input.description,
      technicalNotes: input.technicalNotes,
      attachments: [],
      createdAt: new Date().toISOString(),
    };

    const timelineEvent: MachineTimelineEvent = {
      eventId: `event-${Date.now()}`,
      eventDate: input.maintenanceDate,
      eventType: "MAINTENANCE",
      title: input.description,
      description: input.technicalNotes ?? input.description,
      createdAt: new Date().toISOString(),
    };

    return {
      ...machine,
      maintenanceRecords: [...machine.maintenanceRecords, maintenanceRecord],
      timelineEvents: [...machine.timelineEvents, timelineEvent],
    };
  }

  static addSparePart(machine: Machine, input: Readonly<{
    name: string;
    partNumber: string;
    supplierId: string;
    replacementDate?: string;
    cost?: number;
    notes?: string;
  }>): Machine {
    const sparePart: SparePart = {
      sparePartId: `sparepart-${Date.now()}`,
      name: input.name,
      partNumber: input.partNumber,
      supplierId: input.supplierId,
      replacementDate: input.replacementDate,
      cost: input.cost,
      notes: input.notes,
      createdAt: new Date().toISOString(),
    };

    return {
      ...machine,
      spareParts: [...machine.spareParts, sparePart],
      timelineEvents: [
        ...machine.timelineEvents,
        {
          eventId: `event-${Date.now()}`,
          eventDate: input.replacementDate ?? new Date().toISOString(),
          eventType: "SPARE_PART_REPLACEMENT",
          title: `Spare part replaced: ${input.name}`,
          description: input.notes,
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }

  static addConsumable(machine: Machine, input: Readonly<{
    name: string;
    installationDate?: string;
    replacementDate?: string;
    expectedLifetimeHours?: number;
    actualLifetimeHours?: number;
    replacementReason?: string;
    cost?: number;
    supplierId?: string;
    notes?: string;
  }>): Machine {
    const consumable: ConsumablePart = {
      consumableId: `consumable-${Date.now()}`,
      name: input.name,
      installationDate: input.installationDate,
      replacementDate: input.replacementDate,
      expectedLifetimeHours: input.expectedLifetimeHours,
      actualLifetimeHours: input.actualLifetimeHours,
      replacementReason: input.replacementReason,
      cost: input.cost,
      supplierId: input.supplierId,
      notes: input.notes,
      createdAt: new Date().toISOString(),
    };

    return {
      ...machine,
      consumables: [...machine.consumables, consumable],
      timelineEvents: [
        ...machine.timelineEvents,
        {
          eventId: `event-${Date.now()}`,
          eventDate: input.replacementDate ?? new Date().toISOString(),
          eventType: "CONSUMABLE_CHANGE",
          title: `Consumable replaced: ${input.name}`,
          description: input.replacementReason,
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }

  static addSupplier(machine: Machine, input: Readonly<{
    supplierId: string;
    companyName: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    website?: string;
  }>): Machine {
    return {
      ...machine,
      suppliers: [
        ...machine.suppliers,
        {
          supplierId: input.supplierId,
          companyName: input.companyName,
          contactPerson: input.contactPerson,
          phone: input.phone,
          email: input.email,
          address: input.address,
          website: input.website,
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }

  static addServiceCompany(machine: Machine, input: Readonly<{
    serviceCompanyId: string;
    companyName: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    website?: string;
  }>): Machine {
    return {
      ...machine,
      serviceCompanies: [
        ...machine.serviceCompanies,
        {
          serviceCompanyId: input.serviceCompanyId,
          companyName: input.companyName,
          contactPerson: input.contactPerson,
          phone: input.phone,
          email: input.email,
          address: input.address,
          website: input.website,
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }

  static addDocument(machine: Machine, input: Readonly<{
    documentId: string;
    documentType: MachineDocument["documentType"];
    title: string;
    reference: string;
    notes?: string;
  }>): Machine {
    return {
      ...machine,
      documents: [
        ...machine.documents,
        {
          documentId: input.documentId,
          documentType: input.documentType,
          title: input.title,
          reference: input.reference,
          notes: input.notes,
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }
}

export type WorkQueueStatus = "CREATED" | "READY" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED";

export type WorkQueueMaterial = Readonly<{
  materialId: string;
  code: string;
  name: string;
  createdAt: string;
}>;

export type WorkQueueMachine = Readonly<{
  machineId: string;
  code: string;
  name: string;
  station: string;
  createdAt: string;
}>;

export type WorkQueueOperator = Readonly<{
  operatorId: string;
  code: string;
  name: string;
  station: string;
  createdAt: string;
}>;

export type WorkQueueSession = Readonly<{
  sessionId: string;
  station: string;
  machineId: string;
  materialId: string;
  operatorId: string;
  createdAt: string;
}>;

export type WorkQueueItem = Readonly<{
  itemId: string;
  orderId: string;
  barcode: string;
  materialId: string;
  plannedSheetCount: number;
  actualSheetCount?: number;
  estimatedAreaM2?: number;
  notes?: string;
  createdAt: string;
}>;

export type ProductionWorkQueue = Readonly<{
  queueId: string;
  session: WorkQueueSession;
  station: string;
  machineId: string;
  materialId: string;
  operatorId: string;
  status: WorkQueueStatus;
  items: ReadonlyArray<WorkQueueItem>;
  createdAt: string;
  updatedAt?: string;
}>;

export type WorkQueueStatistics = Readonly<{
  orderCount: number;
  glassPieceCount: number;
  totalArea: number;
  plannedSheets: number;
  actualSheets: number;
  estimatedWaste: number;
  duration: number;
}>;

export type WorkQueueValidation = Readonly<{
  validationId: string;
  validationCode: string;
  description?: string;
  severity: "INFO" | "WARNING" | "ERROR";
  createdAt: string;
}>;

export class ProductionWorkQueueEngine {
  static createMaterial(input: Readonly<{ code: string; name: string }>): WorkQueueMaterial {
    return {
      materialId: createEngineId("work-material"),
      code: input.code,
      name: input.name,
      createdAt: new Date().toISOString(),
    };
  }

  static createMachine(input: Readonly<{ code: string; name: string; station: string }>): WorkQueueMachine {
    return {
      machineId: createEngineId("work-machine"),
      code: input.code,
      name: input.name,
      station: input.station,
      createdAt: new Date().toISOString(),
    };
  }

  static createOperator(input: Readonly<{ code: string; name: string; station: string }>): WorkQueueOperator {
    return {
      operatorId: createEngineId("work-operator"),
      code: input.code,
      name: input.name,
      station: input.station,
      createdAt: new Date().toISOString(),
    };
  }

  static createSession(input: Readonly<{ station: string; machineId: string; materialId: string; operatorId: string }>): WorkQueueSession {
    return {
      sessionId: createEngineId("work-session"),
      station: input.station,
      machineId: input.machineId,
      materialId: input.materialId,
      operatorId: input.operatorId,
      createdAt: new Date().toISOString(),
    };
  }

  static createQueue(input: Readonly<{ session: WorkQueueSession; station: string; machineId: string; materialId: string; operatorId: string }>): ProductionWorkQueue {
    return {
      queueId: createEngineId("work-queue"),
      session: input.session,
      station: input.station,
      machineId: input.machineId,
      materialId: input.materialId,
      operatorId: input.operatorId,
      status: "CREATED",
      items: [],
      createdAt: new Date().toISOString(),
    };
  }

  static createItem(input: Readonly<{ orderId: string; barcode: string; materialId: string; plannedSheetCount: number; actualSheetCount?: number; estimatedAreaM2?: number; notes?: string }>): WorkQueueItem {
    return {
      itemId: createEngineId("work-item"),
      orderId: input.orderId,
      barcode: input.barcode,
      materialId: input.materialId,
      plannedSheetCount: input.plannedSheetCount,
      actualSheetCount: input.actualSheetCount,
      estimatedAreaM2: input.estimatedAreaM2,
      notes: input.notes,
      createdAt: new Date().toISOString(),
    };
  }

  static addItem(queue: ProductionWorkQueue, item: WorkQueueItem): ProductionWorkQueue {
    if (queue.items.some((existing) => existing.orderId === item.orderId)) {
      return queue;
    }

    if (queue.items.some((existing) => existing.barcode === item.barcode)) {
      return queue;
    }

    return {
      ...queue,
      items: [...queue.items, item],
      updatedAt: new Date().toISOString(),
    };
  }

  static addScannedBarcode(queue: ProductionWorkQueue, input: Readonly<{ orderId: string; barcode: string; materialId: string; plannedSheetCount: number; actualSheetCount?: number; estimatedAreaM2?: number; notes?: string }>): ProductionWorkQueue {
    const item = this.createItem(input);
    return this.addItem(queue, item);
  }

  static filterItemsByMaterial(items: ReadonlyArray<WorkQueueItem>, materialId: string): ReadonlyArray<WorkQueueItem> {
    return items.filter((item) => item.materialId === materialId);
  }

  static transitionStatus(queue: ProductionWorkQueue, status: WorkQueueStatus): ProductionWorkQueue {
    const allowed: ReadonlyArray<WorkQueueStatus> = ["CREATED", "READY", "RUNNING", "PAUSED", "COMPLETED", "CANCELLED"];
    const currentIndex = allowed.indexOf(queue.status);
    const nextIndex = allowed.indexOf(status);

    if (currentIndex === -1 || nextIndex === -1 || nextIndex < currentIndex) {
      throw new Error(`Invalid status transition from ${queue.status} to ${status}`);
    }

    return {
      ...queue,
      status,
      updatedAt: new Date().toISOString(),
    };
  }

  static createStatistics(queue: ProductionWorkQueue): WorkQueueStatistics {
    return {
      orderCount: queue.items.length,
      glassPieceCount: queue.items.length,
      totalArea: queue.items.reduce((sum, item) => sum + (item.estimatedAreaM2 ?? 0), 0),
      plannedSheets: queue.items.reduce((sum, item) => sum + item.plannedSheetCount, 0),
      actualSheets: queue.items.reduce((sum, item) => sum + (item.actualSheetCount ?? 0), 0),
      estimatedWaste: queue.items.length * 0.5,
      duration: queue.items.length * 10,
    };
  }

  static validateQueue(queue: ProductionWorkQueue, input: Readonly<{ nextStatus?: WorkQueueStatus }> = {}): ReadonlyArray<WorkQueueValidation> {
    const validations: WorkQueueValidation[] = [];

    if (!queue.station || queue.station.trim().length === 0) {
      validations.push({ validationId: createEngineId("validation"), validationCode: "MISSING_STATION", description: "A station is required.", severity: "ERROR", createdAt: new Date().toISOString() });
    }

    if (!queue.machineId || queue.machineId.trim().length === 0) {
      validations.push({ validationId: createEngineId("validation"), validationCode: "MISSING_MACHINE", description: "A machine is required.", severity: "ERROR", createdAt: new Date().toISOString() });
    }

    if (!queue.materialId || queue.materialId.trim().length === 0) {
      validations.push({ validationId: createEngineId("validation"), validationCode: "MISSING_MATERIAL", description: "A material is required.", severity: "ERROR", createdAt: new Date().toISOString() });
    }

    if (queue.items.some((item) => item.orderId === queue.items[0]?.orderId) && queue.items.length > 1) {
      validations.push({ validationId: createEngineId("validation"), validationCode: "DUPLICATE_ORDER", description: "Duplicate order detected.", severity: "WARNING", createdAt: new Date().toISOString() });
    }

    if (queue.items.some((item) => item.barcode === queue.items[0]?.barcode) && queue.items.length > 1) {
      validations.push({ validationId: createEngineId("validation"), validationCode: "DUPLICATE_BARCODE", description: "Duplicate barcode detected.", severity: "WARNING", createdAt: new Date().toISOString() });
    }

    if (input.nextStatus && input.nextStatus === "COMPLETED" && queue.status !== "RUNNING") {
      validations.push({ validationId: createEngineId("validation"), validationCode: "INVALID_STATUS_TRANSITION", description: "A queue can only be completed while running.", severity: "ERROR", createdAt: new Date().toISOString() });
    }

    return validations;
  }
}

export class ProductionQueueEngine {
  static createOperation(code: ProductionOperationCode, name: string, sequence: number): ProductionOperation {
    return {
      code,
      name,
      sequence,
      isTerminal: false,
    };
  }

  static createQueue(operation: ProductionOperation): ProductionQueue {
    return {
      operation,
      items: [],
      createdAt: new Date().toISOString(),
    };
  }

  static createQueueItem(input: Readonly<{
    orderId: string;
    orderLineId: string;
    operationCode: ProductionOperationCode;
    materialId: string;
    status?: ProductionOperationStatus;
    completedOperations?: ReadonlyArray<ProductionOperationCode>;
  }>): ProductionQueueItem {
    return {
      itemId: `${input.orderId}-${input.orderLineId}-${input.operationCode}-${Date.now()}`,
      orderId: input.orderId,
      orderLineId: input.orderLineId,
      operationCode: input.operationCode,
      materialId: input.materialId,
      status: input.status ?? "WAITING",
      completedOperations: input.completedOperations ?? [],
      createdAt: new Date().toISOString(),
    };
  }

  static enqueueItem(queue: ProductionQueue, item: ProductionQueueItem): ProductionQueue {
    return {
      ...queue,
      items: [...queue.items, item],
    };
  }

  static getWaitingItems(queue: ProductionQueue): ReadonlyArray<ProductionQueueItem> {
    return queue.items.filter((item) => item.status === "WAITING");
  }

  static completeItem(
    currentQueue: ProductionQueue,
    itemId: string,
    operations: ReadonlyArray<ProductionOperation>,
    nextQueue?: ProductionQueue
  ): { currentQueue: ProductionQueue; nextQueue?: ProductionQueue } {
    const updatedCurrentItems = currentQueue.items.map((item) =>
      item.itemId === itemId
        ? { ...item, status: "COMPLETED" as const, completedOperations: [...item.completedOperations, currentQueue.operation.code] }
        : item
    );

    const nextQueueItem = updatedCurrentItems.find((item) => item.itemId === itemId);
    const nextQueueItems = nextQueue && nextQueueItem
      ? [
          {
            ...nextQueueItem,
            itemId: `${nextQueueItem.itemId}-next`,
            operationCode: nextQueue.operation.code,
            status: "READY" as const,
            completedOperations: nextQueueItem.completedOperations,
          },
        ]
      : [];

    const updatedNextQueue = nextQueue ? {
      ...nextQueue,
      items: [...nextQueue.items, ...nextQueueItems],
    } : undefined;

    return {
      currentQueue: {
        ...currentQueue,
        items: updatedCurrentItems,
      },
      nextQueue: updatedNextQueue,
    };
  }

  static calculateOrderProgress(
    lineItems: ReadonlyArray<ProductionQueueItem>,
    operations: ReadonlyArray<ProductionOperation>
  ): ProductionProgress {
    const completedOperations = lineItems.filter((item) => item.status === "COMPLETED").length;
    const totalOperations = operations.length;
    const percentage = totalOperations > 0 ? Math.round((completedOperations / totalOperations) * 100) : 0;
    const orderedOperations = [...operations].sort((left, right) => left.sequence - right.sequence);
    const currentOperation = orderedOperations.find((operation) => {
      const matchingItem = lineItems.find((item) => item.operationCode === operation.code);
      return matchingItem && (matchingItem.status === "IN_PROGRESS" || matchingItem.status === "READY" || matchingItem.status === "WAITING");
    })?.code ?? null;

    return {
      orderId: lineItems[0]?.orderId ?? "",
      orderLineId: lineItems[0]?.orderLineId ?? "",
      completedOperations,
      totalOperations,
      percentage,
      isCompleted: completedOperations >= totalOperations,
      currentOperation,
    };
  }
}

export class BatchCuttingEngine {
  static calculate(
    orders: ReadonlyArray<BatchCuttingOrder>,
    factoryConfiguration: FactoryConfiguration
  ): BatchCuttingSessionSummary {
    const results = orders.map((order) =>
      CuttingResultEngine.calculate(
        order.sheet,
        order.orderWidthMm,
        order.orderHeightMm,
        factoryConfiguration
      )
    );

    const totalOrderedArea = results.reduce((sum, result) => sum + result.orderedArea, 0);
    const totalProductionArea = results.reduce((sum, result) => sum + result.productionArea, 0);
    const totalGlassConsumptionArea = results.reduce((sum, result) => sum + result.glassConsumptionArea, 0);
    const totalTrimArea = results.reduce((sum, result) => sum + result.trimLossArea, 0);
    const totalGrindingArea = results.reduce((sum, result) => sum + result.grindingLossArea, 0);
    const totalRemnantArea = results.reduce((sum, result) => sum + result.remnantArea, 0);
    const totalScrapArea = results.reduce((sum, result) => sum + result.scrapArea, 0);
    const totalWasteArea = totalRemnantArea + totalScrapArea;
    const yieldPercentage = totalProductionArea > 0 ? (totalProductionArea / Math.max(totalGlassConsumptionArea, totalProductionArea)) * 100 : 0;
    const wastePercentage = totalWasteArea > 0 ? (totalWasteArea / Math.max(totalGlassConsumptionArea, totalProductionArea)) * 100 : 0;

    const session: CuttingSession = {
      sessionId: `batch-${Date.now()}`,
      factoryId: "factory-1",
      productionDate: new Date().toISOString(),
      operatorId: "operator-1",
      machineId: "machine-1",
      materialId: orders[0]?.sheet.materialId ?? "material-1",
      glassType: orders[0]?.sheet.glassType ?? "Float",
      sheetSize: {
        width: orders[0]?.sheet.usableWidth ?? 0,
        height: orders[0]?.sheet.usableHeight ?? 0,
      },
      sheetCount: results.length,
      totalOrderedArea,
      totalProductionArea,
      totalGlassConsumptionArea,
      totalTrimArea,
      totalGrindingArea,
      totalRemnantArea,
      totalScrapArea,
      yieldPercentage,
      wastePercentage,
      status: "completed",
      sheets: results
        .map((result) => result.usedSheets[0])
        .filter((sheetId): sheetId is string => Boolean(sheetId)),
      orders: orders.map((order) => ({
        orderId: order.orderId,
        orderLineId: order.orderLineId,
        customerReference: order.customerReference,
        quantity: order.quantity,
        netDimensions: {
          width: order.orderWidthMm,
          height: order.orderHeightMm,
        },
        productionDimensions: {
          width: order.orderWidthMm,
          height: order.orderHeightMm,
        },
      })),
      remnants: results.flatMap((result) => result.remnants),
      scraps: results.flatMap((result) => result.scraps),
      cuttingResultId: null,
      version: 1,
      createdAt: new Date().toISOString(),
      engineVersion: "2.3.8",
      factoryConfigurationVersion: factoryConfiguration.version,
    };

    return {
      results,
      session,
    };
  }
}

export class SheetAllocationEngine {
  static calculate(
    batchCuttingResult: BatchCuttingSessionSummary,
    machineSheets: ReadonlyArray<GlassSheet>,
    _factoryConfiguration: FactoryConfiguration
  ): SheetAllocationResult {
    const allocations: SheetAllocationAssignment[] = [];
    const sheetStates = machineSheets.map((sheet) => ({
      sheetId: sheet.sheetId,
      materialId: sheet.materialId,
      lotId: `lot-${sheet.sheetId}`,
      usedArea: 0,
      remainingArea: sheet.usableArea,
      remnantArea: 0,
      scrapArea: 0,
      allocations: [] as SheetAllocationAssignment[],
    }));

    batchCuttingResult.results.forEach((result, index) => {
      const order = batchCuttingResult.session.orders[index];
      const requiredArea = result.productionArea;
      const sheet = sheetStates.find((candidate) => candidate.remainingArea >= requiredArea);

      if (!sheet) {
        const fallbackSheet = sheetStates[0];
        if (!fallbackSheet) {
          return;
        }
        fallbackSheet.usedArea += requiredArea;
        fallbackSheet.remainingArea = Math.max(0, fallbackSheet.remainingArea - requiredArea);
        fallbackSheet.remnantArea = Math.max(0, fallbackSheet.remainingArea);
        fallbackSheet.scrapArea = 0;
        const allocation: SheetAllocationAssignment = {
          orderId: order?.orderId ?? `order-${index}`,
          orderLineId: order?.orderLineId ?? `line-${index}`,
          sheetId: fallbackSheet.sheetId,
          materialId: fallbackSheet.materialId,
          lotId: fallbackSheet.lotId,
          usedArea: requiredArea,
          remainingArea: fallbackSheet.remainingArea,
          remnantArea: fallbackSheet.remnantArea,
          scrapArea: fallbackSheet.scrapArea,
        };
        fallbackSheet.allocations.push(allocation);
        allocations.push(allocation);
        return;
      }

      sheet.usedArea += requiredArea;
      sheet.remainingArea = Math.max(0, sheet.remainingArea - requiredArea);
      sheet.remnantArea = Math.max(0, sheet.remainingArea);
      sheet.scrapArea = 0;
      const allocation: SheetAllocationAssignment = {
        orderId: order?.orderId ?? `order-${index}`,
        orderLineId: order?.orderLineId ?? `line-${index}`,
        sheetId: sheet.sheetId,
        materialId: sheet.materialId,
        lotId: sheet.lotId,
        usedArea: requiredArea,
        remainingArea: sheet.remainingArea,
        remnantArea: sheet.remnantArea,
        scrapArea: sheet.scrapArea,
      };
      sheet.allocations.push(allocation);
      allocations.push(allocation);
    });

    const sheets: SheetAllocationSheet[] = sheetStates.map((sheet) => ({
      sheetId: sheet.sheetId,
      materialId: sheet.materialId,
      lotId: sheet.lotId,
      usedArea: sheet.usedArea,
      remainingArea: sheet.remainingArea,
      remnantArea: sheet.remnantArea,
      scrapArea: sheet.scrapArea,
      allocations: sheet.allocations,
    }));

    return {
      allocations,
      sheets,
    };
  }
}

export type RemnantDecision = Readonly<{
  decision: "remnant" | "scrap";
  reason: string;
  isReusable: boolean;
  matchedRules: ReadonlyArray<string>;
}>;

export type ScrapReasonCode =
  | "TOO_SMALL"
  | "TRIM_LOSS"
  | "BROKEN"
  | "OPERATOR_REJECTED"
  | "REMNANT_DISABLED"
  | "CONFIGURATION_RULE"
  | "VALID_REMNANT";

export type ScrapDecisionResult = Readonly<{
  decision: "scrap" | "keep";
  reason: string;
  reasonCode: ScrapReasonCode;
  failedRules: ReadonlyArray<string>;
  passedRules: ReadonlyArray<string>;
  explanation: string;
  configurationVersion: number;
}>;

export class ScrapDecisionService {
  static decide(
    pieceWidth: number,
    pieceHeight: number,
    pieceArea: number,
    remnantDecision: RemnantDecision,
    factoryConfiguration: FactoryConfiguration
  ): ScrapDecisionResult {
    const remnantConfiguration = factoryConfiguration.remnantConfiguration;
    const configurationVersion = factoryConfiguration.version;

    if (!remnantConfiguration.enabled) {
      return {
        decision: "scrap",
        reason: "remnant system is disabled, so the piece is classified as scrap",
        reasonCode: "REMNANT_DISABLED",
        failedRules: ["remnant-enabled"],
        passedRules: [],
        explanation: "The remnant system is disabled in factory configuration, so no reusable remnant decision can be made.",
        configurationVersion,
      };
    }

    if (remnantDecision.decision === "remnant" && remnantDecision.isReusable) {
      return {
        decision: "keep",
        reason: "piece satisfies the remnant thresholds and is kept as a valid remnant",
        reasonCode: "VALID_REMNANT",
        failedRules: [],
        passedRules: remnantDecision.matchedRules,
        explanation: "The piece meets all configured remnant criteria and is not classified as scrap.",
        configurationVersion,
      };
    }

    const widthRule = pieceWidth >= remnantConfiguration.minimumWidthMm;
    const heightRule = pieceHeight >= remnantConfiguration.minimumHeightMm;
    const areaRule = pieceArea >= remnantConfiguration.minimumAreaMm2 / 1_000_000;

    const passedRules = [
      ...(widthRule ? ["minimum-width"] : []),
      ...(heightRule ? ["minimum-height"] : []),
      ...(areaRule ? ["minimum-area"] : []),
    ];

    const failedRules = [
      ...(!widthRule ? ["minimum-width"] : []),
      ...(!heightRule ? ["minimum-height"] : []),
      ...(!areaRule ? ["minimum-area"] : []),
    ];

    const explanation = failedRules.length === 0
      ? "The piece satisfies the remnant thresholds and is not classified as scrap."
      : `The piece failed the following remnant rules: ${failedRules.join(", ")}.`;

    return {
      decision: "scrap",
      reason: failedRules.length > 0 ? "piece does not meet the required remnant thresholds" : "piece failed the remnant evaluation",
      reasonCode: "TOO_SMALL",
      failedRules,
      passedRules,
      explanation,
      configurationVersion,
    };
  }
}

export class RemnantDecisionService {
  static decide(
    pieceWidth: number,
    pieceHeight: number,
    pieceArea: number,
    factoryConfiguration: FactoryConfiguration
  ): RemnantDecision {
    const remnantConfiguration = factoryConfiguration.remnantConfiguration;

    if (!remnantConfiguration.enabled) {
      return {
        decision: "scrap",
        reason: "remnant-system-disabled",
        isReusable: false,
        matchedRules: [],
      };
    }

    const widthOk = pieceWidth >= remnantConfiguration.minimumWidthMm;
    const heightOk = pieceHeight >= remnantConfiguration.minimumHeightMm;
    const areaOk = pieceArea >= remnantConfiguration.minimumAreaMm2 / 1_000_000;

    const matchedRules = [
      ...(widthOk ? ["minimum-width"] : []),
      ...(heightOk ? ["minimum-height"] : []),
      ...(areaOk ? ["minimum-area"] : []),
    ];

    const isReusable = widthOk && heightOk && areaOk;

    return {
      decision: isReusable ? "remnant" : "scrap",
      reason: isReusable ? "all-thresholds-met" : "thresholds-not-met",
      isReusable,
      matchedRules,
    };
  }
}

export class ProductionCalculationService {
  private static freezeDeep<T>(value: T): Readonly<T> {
    if (value === null || typeof value !== "object") {
      return value;
    }

    const obj = value as { [key: string]: any };
    for (const key of Reflect.ownKeys(obj)) {
      const child = obj[key as keyof typeof obj];
      if (child && typeof child === "object" && !Object.isFrozen(child)) {
        ProductionCalculationService.freezeDeep(child);
      }
    }

    return Object.freeze(obj) as Readonly<T>;
  }

  static calculateProductionDimensions(
    netWidth: number,
    netHeight: number,
    factoryConfiguration: FactoryConfiguration
  ) {
    const grinding = factoryConfiguration.grindingConfiguration;
    const productionWidth = netWidth + (grinding.enabled ? grinding.leftMm + grinding.rightMm : 0);
    const productionHeight = netHeight + (grinding.enabled ? grinding.topMm + grinding.bottomMm : 0);

    return {
      productionWidth,
      productionHeight,
      grindingValues: {
        leftMm: grinding.leftMm,
        rightMm: grinding.rightMm,
        topMm: grinding.topMm,
        bottomMm: grinding.bottomMm,
        totalWidthMm: grinding.leftMm + grinding.rightMm,
        totalHeightMm: grinding.topMm + grinding.bottomMm,
      },
    };
  }

  static calculateNetArea(netWidth: number, netHeight: number) {
    return (netWidth * netHeight) / 1_000_000;
  }

  static calculateProductionArea(productionWidth: number, productionHeight: number) {
    return (productionWidth * productionHeight) / 1_000_000;
  }

  static calculateGrindingAllowance(factoryConfiguration: FactoryConfiguration) {
    const grinding = factoryConfiguration.grindingConfiguration;
    return {
      enabled: grinding.enabled,
      leftMm: grinding.leftMm,
      rightMm: grinding.rightMm,
      topMm: grinding.topMm,
      bottomMm: grinding.bottomMm,
      totalWidthMm: grinding.leftMm + grinding.rightMm,
      totalHeightMm: grinding.topMm + grinding.bottomMm,
    };
  }

  static calculateGlassConsumptionArea(
    productionWidth: number,
    productionHeight: number,
    factoryConfiguration: FactoryConfiguration
  ) {
    return (productionWidth * productionHeight) / 1_000_000;
  }

  static calculate(
    netWidth: number,
    netHeight: number,
    factoryConfiguration: FactoryConfiguration
  ): ProductionCalculationResult {
    const { productionWidth, productionHeight, grindingValues } = ProductionCalculationService.calculateProductionDimensions(
      netWidth,
      netHeight,
      factoryConfiguration
    );
    const netArea = ProductionCalculationService.calculateNetArea(netWidth, netHeight);
    const productionArea = ProductionCalculationService.calculateProductionArea(productionWidth, productionHeight);
    const glassConsumptionArea = ProductionCalculationService.calculateGlassConsumptionArea(
      productionWidth,
      productionHeight,
      factoryConfiguration
    );

    const result: ProductionCalculationResult = {
      dimensions: {
        netWidth,
        netHeight,
        productionWidth,
        productionHeight,
      },
      areas: {
        netArea,
        productionArea,
        glassConsumptionArea,
        trimLossArea: null,
        grindingLossArea: null,
        remnantArea: null,
        scrapArea: null,
        usedSheetArea: null,
        totalWasteArea: null,
      },
      grinding: {
        enabled: grindingValues.leftMm > 0 || grindingValues.rightMm > 0 || grindingValues.topMm > 0 || grindingValues.bottomMm > 0,
        leftMm: grindingValues.leftMm,
        rightMm: grindingValues.rightMm,
        topMm: grindingValues.topMm,
        bottomMm: grindingValues.bottomMm,
        totalWidthMm: grindingValues.totalWidthMm,
        totalHeightMm: grindingValues.totalHeightMm,
      },
      consumption: {
        glassConsumptionArea,
      },
      statistics: {
        yieldPercentage: null,
        wastePercentage: null,
      },
      metadata: {
        materialId: null,
        glassType: null,
        factoryId: null,
        configurationVersion: factoryConfiguration.version,
      },
      netWidth,
      netHeight,
      productionWidth,
      productionHeight,
      netArea,
      productionArea,
      grindingValues,
      glassConsumptionArea,
      consumptionArea: glassConsumptionArea,
    };

    return ProductionCalculationService.freezeDeep(result) as ProductionCalculationResult;
  }
}
