export type SeedRecord = {
  code: string;
  name: string;
  description?: string;
};

export type SeedPlanItem = {
  domain: string;
  kind: string;
  items: SeedRecord[];
};

export const referenceDataByKind = {
  roles: [
    { code: "tenant_admin", name: "Tenant Admin" },
    { code: "factory_admin", name: "Factory Admin" },
    { code: "operator", name: "Operator" },
  ],
  permissions: [
    { code: "tenant.manage", name: "Manage Tenant" },
    { code: "factory.manage", name: "Manage Factory" },
    { code: "production.execute", name: "Execute Production" },
  ],
  machineTypes: [
    { code: "cutting", name: "Cutting Machine" },
    { code: "grinding", name: "Grinding Machine" },
    { code: "inspection", name: "Inspection Machine" },
  ],
  stationTypes: [
    { code: "cutting", name: "Cutting Station" },
    { code: "grinding", name: "Grinding Station" },
    { code: "inspection", name: "Inspection Station" },
  ],
  personnelTitles: [
    { code: "operator", name: "Operator" },
    { code: "supervisor", name: "Supervisor" },
    { code: "maintenance", name: "Maintenance Technician" },
  ],
  bloodGroups: [
    { code: "a_positive", name: "A+" },
    { code: "a_negative", name: "A-" },
    { code: "o_positive", name: "O+" },
  ],
  inventoryUnits: [
    { code: "m2", name: "Square Meter" },
    { code: "kg", name: "Kilogram" },
    { code: "piece", name: "Piece" },
  ],
  statusValues: [
    { code: "active", name: "Active" },
    { code: "inactive", name: "Inactive" },
    { code: "pending", name: "Pending" },
  ],
} satisfies Record<string, SeedRecord[]>;

export function buildSeedPlan(): SeedPlanItem[] {
  return Object.entries(referenceDataByKind).map(([kind, items]) => ({
    domain: "system_reference",
    kind,
    items,
  }));
}
