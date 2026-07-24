import { z } from "zod";

// Tenant Zod schemas
export const createTenantSchema = z.object({
  name: z.string().min(2, "Company/Tenant name must be at least 2 characters long"),
  subscriptionPlan: z.enum(["trial", "basic", "pro"]).default("trial"),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;

// Factory Zod schemas
export const createFactorySchema = z.object({
  tenantId: z.string().uuid("Invalid tenant ID"),
  name: z.string().min(2, "Factory name must be at least 2 characters long"),
  address: z.string().optional(),
});

export type CreateFactoryInput = z.infer<typeof createFactorySchema>;

export const updateFactorySchema = z.object({
  id: z.string().uuid("Invalid factory ID"),
  name: z.string().min(2, "Factory name must be at least 2 characters long"),
  address: z.string().optional(),
  active: z.boolean().optional(),
});

export type UpdateFactoryInput = z.infer<typeof updateFactorySchema>;

export const factoryConfigurationSchema = z.object({
  version: z.number().int().min(1).default(1),
  trimConfiguration: z.object({
    enabled: z.boolean().default(true),
    strategy: z.enum(["PER_EDGE", "AXIS", "CUSTOM"]).default("PER_EDGE"),
    leftMm: z.number().min(0).default(10),
    rightMm: z.number().min(0).default(10),
    topMm: z.number().min(0).default(10),
    bottomMm: z.number().min(0).default(10),
  }),
  grindingConfiguration: z.object({
    enabled: z.boolean().default(true),
    strategy: z.enum(["PER_EDGE", "AXIS", "CUSTOM"]).default("PER_EDGE"),
    leftMm: z.number().min(0).default(0),
    rightMm: z.number().min(0).default(0),
    topMm: z.number().min(0).default(0),
    bottomMm: z.number().min(0).default(0),
  }),
  remnantConfiguration: z.object({
    enabled: z.boolean().default(true),
    minimumWidthMm: z.number().min(0).default(200),
    minimumHeightMm: z.number().min(0).default(200),
    minimumAreaMm2: z.number().min(0).default(60000),
  }),
  inventoryConfiguration: z.object({
    inventoryValuationMethod: z.enum([
      "FIFO",
      "LIFO",
      "MOVING_AVERAGE",
      "WEIGHTED_AVERAGE",
      "SPECIFIC_IDENTIFICATION",
      "LAST_PURCHASE",
      "STANDARD_COST",
      "REPLACEMENT_COST",
      "MANUAL",
    ]).default("SPECIFIC_IDENTIFICATION"),
    allowLotSelection: z.boolean().default(false),
    allowSpecificIdentification: z.boolean().default(false),
    negativeStockPolicy: z.string().nullable().optional().default(null),
    reservationPolicy: z.string().nullable().optional().default(null),
  }),
  kerfConfiguration: z.object({
    enabled: z.boolean().default(true),
    value: z.number().min(0).default(0),
    unit: z.enum(["MM", "IN", "CM"]).default("MM"),
  }),
  toleranceMatching: z.object({
    widthMm: z.number().min(0).default(10),
    heightMm: z.number().min(0).default(10),
  }),
});

export type FactoryConfiguration = z.infer<typeof factoryConfigurationSchema>;

export const updateFactorySettingsSchema = z.object({
  factoryId: z.string().uuid("Invalid factory ID"),
  tolerances: z.object({
    enToleranceMm: z.number().int().min(0).max(50),
    boyToleranceMm: z.number().int().min(0).max(50),
  }),
  trimMm: z.number().int().min(0).max(200).default(10),
  qrType: z.enum(["QR", "CODE128"]),
  factoryConfiguration: factoryConfigurationSchema.optional(),
  shiftSettings: z.array(
    z.object({
      name: z.string().min(2),
      start: z.string().regex(/^\d{2}:\d{2}$/, "Invalid start time"),
      end: z.string().regex(/^\d{2}:\d{2}$/, "Invalid end time"),
    })
  ),
  costSettings: z.object({
    electricityUnitCost: z.number().min(0),
    gasUnitCost: z.number().min(0),
    laborHourCost: z.number().min(0),
  }),
  notificationSettings: z.object({
    whatsappEnabled: z.boolean(),
    smsEnabled: z.boolean(),
    emailEnabled: z.boolean(),
  }),
  logoUrl: z.string().url("Invalid logo URL").optional(),
});

export type UpdateFactorySettingsInput = z.infer<typeof updateFactorySettingsSchema>;

export const createCustomerSchema = z.object({
  erpCode: z.string().min(1, "ERP customer code is required"),
  title: z.string().min(2, "Customer title is required"),
  shortTitle: z.string().min(2, "Short title is required"),
  taxNumber: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  address: z.string().optional(),
  latitude: z.string().regex(/^-?\d+(?:\.\d+)?$/, "Invalid latitude").optional(),
  longitude: z.string().regex(/^-?\d+(?:\.\d+)?$/, "Invalid longitude").optional(),
  erpStatus: z.enum(["Active", "Blocked", "Passive"]).default("Active"),
  notes: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.extend({
  id: z.string().uuid("Invalid customer ID"),
  active: z.boolean().optional(),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const createCustomerContactSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID"),
  name: z.string().min(2, "Contact name is required"),
  role: z.string().min(2, "Contact role is required"),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  active: z.boolean().optional(),
});

export type CreateCustomerContactInput = z.infer<typeof createCustomerContactSchema>;

export const updateCustomerContactSchema = createCustomerContactSchema.extend({
  id: z.string().uuid("Invalid contact ID"),
});

export type UpdateCustomerContactInput = z.infer<typeof updateCustomerContactSchema>;

export const createDeliveryPointSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID"),
  name: z.string().min(2, "Delivery point name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  latitude: z.string().regex(/^-?\d+(?:\.\d+)?$/, "Invalid latitude").optional(),
  longitude: z.string().regex(/^-?\d+(?:\.\d+)?$/, "Invalid longitude").optional(),
  phone: z.string().optional(),
  note: z.string().optional(),
  isDefault: z.boolean().optional(),
  active: z.boolean().optional(),
});

export type CreateDeliveryPointInput = z.infer<typeof createDeliveryPointSchema>;

export const updateDeliveryPointSchema = createDeliveryPointSchema.extend({
  id: z.string().uuid("Invalid delivery point ID"),
});

export type UpdateDeliveryPointInput = z.infer<typeof updateDeliveryPointSchema>;

// User roles list (as strict TS enum / union)
export const UserRole = {
  SUPER_ADMIN: "super_admin",
  TENANT_ADMIN: "tenant_admin",
  FACTORY_MANAGER: "factory_manager",
  OFFICE: "office",
  PLANNING: "planning",
  CUTTING: "cutting",
  GRINDING: "grinding",
  TEMPER: "temper",
  QUALITY: "quality",
  WAREHOUSE: "warehouse",
  DRIVER: "driver",
  CUSTOMER: "customer",
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// User Zod schemas
export const createUserSchema = z.object({
  tenantId: z.string().uuid("Invalid tenant ID"),
  factoryId: z.string().uuid("Invalid factory ID").optional(),
  roleId: z.string().uuid("Invalid role ID"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Factory settings validation
export const updateSettingsSchema = z.object({
  tolerances: z.object({
    enToleranceMm: z.number().int().min(0).max(50),
    boyToleranceMm: z.number().int().min(0).max(50),
  }),
  defaultColors: z.array(z.string()),
  qrType: z.enum(["QR", "CODE128"]),
  costSettings: z.object({
    electricityUnitCost: z.number().min(0),
    gasUnitCost: z.number().min(0),
    laborHourCost: z.number().min(0),
  }).optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

// Production Master Data schemas
export const createMaterialCategorySchema = z.object({
  name: z.string().min(2, "Material category name is required"),
  materialType: z.string().optional(),
  isActive: z.boolean().default(true),
});
export type CreateMaterialCategoryInput = z.infer<typeof createMaterialCategorySchema>;

export const updateMaterialCategorySchema = z.object({
  id: z.string().length(26, "Invalid material category ID"),
  name: z.string().min(2, "Material category name is required").optional(),
  materialType: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateMaterialCategoryInput = z.infer<typeof updateMaterialCategorySchema>;


export const createMaterialUnitProfileSchema = z.object({
  materialId: z.string().uuid("Invalid material ID"),
  purchaseUnit: z.string().optional(),
  storageUnit: z.string().optional(),
  consumptionUnit: z.string().optional(),
  weightUnit: z.string().optional(),
  lengthUnit: z.string().optional(),
  areaUnit: z.string().optional(),
  conversionFactorToConsumption: z.number().positive().optional(),
  densityKgPerM3: z.number().positive().optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
});
export type CreateMaterialUnitProfileInput = z.infer<typeof createMaterialUnitProfileSchema>;

export const updateMaterialUnitProfileSchema = createMaterialUnitProfileSchema.extend({
  id: z.string().uuid("Invalid material unit profile ID"),
});
export type UpdateMaterialUnitProfileInput = z.infer<typeof updateMaterialUnitProfileSchema>;

export const createMaterialPackagingSchema = z.object({
  tenantId: z.string().uuid("Invalid tenant ID"),
  materialId: z.string().uuid("Invalid material ID"),
  packageType: z.string().min(1, "Package type is required"),
  description: z.string().optional(),
  lengthMm: z.number().positive().optional(),
  widthMm: z.number().positive().optional(),
  heightMm: z.number().positive().optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
  weightKg: z.number().positive().optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
});
export type CreateMaterialPackagingInput = z.infer<typeof createMaterialPackagingSchema>;

export const updateMaterialPackagingSchema = createMaterialPackagingSchema.extend({
  id: z.string().uuid("Invalid material packaging ID"),
});
export type UpdateMaterialPackagingInput = z.infer<typeof updateMaterialPackagingSchema>;

export const createProductCategorySchema = z.object({
  tenantId: z.string().uuid("Invalid tenant ID"),
  name: z.string().min(2, "Product category name is required"),
  description: z.string().optional(),
  active: z.boolean().optional(),
});
export type CreateProductCategoryInput = z.infer<typeof createProductCategorySchema>;

export const updateProductCategorySchema = createProductCategorySchema.extend({
  id: z.string().uuid("Invalid product category ID"),
});
export type UpdateProductCategoryInput = z.infer<typeof updateProductCategorySchema>;

export const createProductSchema = z.object({
  tenantId: z.string().uuid("Invalid tenant ID").optional(),
  categoryId: z.string().uuid("Invalid product category ID"),
  productCode: z.string().min(1, "Product code is required"),
  name: z.string().min(2, "Product name is required"),
  description: z.string().optional(),
  thicknessMm: z.number().positive().optional(),
  color: z.string().optional(),
  isTemper: z.boolean().optional(),
  isInsulated: z.boolean().optional(),
  isLaminated: z.boolean().optional(),
  active: z.boolean().optional(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.extend({
  id: z.string().uuid("Invalid product ID"),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const createRecipeSchema = z.object({
  tenantId: z.string().uuid("Invalid tenant ID"),
  productId: z.string().uuid("Invalid product ID"),
  recipeCode: z.string().min(1, "Recipe code is required"),
  name: z.string().min(2, "Recipe name is required"),
  description: z.string().optional(),
  grindingAllowanceMm: z.number().min(0).optional(),
  trimEnabled: z.boolean().optional(),
  trimMm: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;

export const updateRecipeSchema = createRecipeSchema.extend({
  id: z.string().uuid("Invalid recipe ID"),
});
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;

export const createRecipeMaterialSchema = z.object({
  recipeId: z.string().uuid("Invalid recipe ID"),
  materialId: z.string().uuid("Invalid material ID"),
  consumptionBasis: z.string().min(1, "Consumption basis is required"),
  quantity: z.number().positive(),
  unit: z.string().min(1, "Unit is required"),
  notes: z.string().optional(),
});
export type CreateRecipeMaterialInput = z.infer<typeof createRecipeMaterialSchema>;

export const updateRecipeMaterialSchema = createRecipeMaterialSchema.extend({
  id: z.string().uuid("Invalid recipe material ID"),
});
export type UpdateRecipeMaterialInput = z.infer<typeof updateRecipeMaterialSchema>;

export const createRecipeOperationSchema = z.object({
  recipeId: z.string().uuid("Invalid recipe ID"),
  sequence: z.number().int().positive(),
  operationCode: z.string().min(1, "Operation code is required"),
  name: z.string().min(2, "Operation name is required"),
  description: z.string().optional(),
  durationSeconds: z.number().int().positive().optional(),
  machineGroup: z.string().optional(),
  requiresQualityCheck: z.boolean().optional(),
});
export type CreateRecipeOperationInput = z.infer<typeof createRecipeOperationSchema>;

export const updateRecipeOperationSchema = createRecipeOperationSchema.extend({
  id: z.string().uuid("Invalid recipe operation ID"),
});
export type UpdateRecipeOperationInput = z.infer<typeof updateRecipeOperationSchema>;

export const createRoutingTemplateSchema = z.object({
  tenantId: z.string().uuid("Invalid tenant ID"),
  productId: z.string().uuid("Invalid product ID").optional(),
  recipeId: z.string().uuid("Invalid recipe ID").optional(),
  name: z.string().min(2, "Routing template name is required"),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  active: z.boolean().optional(),
});
export type CreateRoutingTemplateInput = z.infer<typeof createRoutingTemplateSchema>;

export const updateRoutingTemplateSchema = createRoutingTemplateSchema.extend({
  id: z.string().uuid("Invalid routing template ID"),
});
export type UpdateRoutingTemplateInput = z.infer<typeof updateRoutingTemplateSchema>;

export const createRoutingStepSchema = z.object({
  routingTemplateId: z.string().uuid("Invalid routing template ID"),
  sequence: z.number().int().positive(),
  station: z.string().min(2, "Station is required"),
  operationCode: z.string().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  notes: z.string().optional(),
});
export type CreateRoutingStepInput = z.infer<typeof createRoutingStepSchema>;

export const updateRoutingStepSchema = createRoutingStepSchema.extend({
  id: z.string().uuid("Invalid routing step ID"),
});
export type UpdateRoutingStepInput = z.infer<typeof updateRoutingStepSchema>;

// ─── Machine Management Schemas (Sprint 2.8.0) ───────────────────────────────

export const MACHINE_TYPES = [
  "cutting", "grinding", "tempering", "insulating_glass",
  "cnc", "drilling", "lamination", "washing",
  "painting", "sandblasting", "quality", "dispatch",
] as const;

export const MACHINE_STATUSES = [
  "active", "maintenance", "idle", "decommissioned",
] as const;

export type MachineType = typeof MACHINE_TYPES[number];
export type MachineStatus = typeof MACHINE_STATUSES[number];

export const createMachineSchema = z.object({
  machineCode: z.string().min(1, "Machine code is required").max(50),
  name: z.string().min(1, "Machine name is required").max(255),
  machineType: z.enum(MACHINE_TYPES, { errorMap: () => ({ message: "Invalid machine type" }) }),
  factoryId: z.string().length(26).optional().nullable(),
  stationId: z.string().length(26).optional().nullable(),
  brand: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  serialNumber: z.string().max(100).optional().nullable(),
  manufactureYear: z.number().int().min(1900).max(2100).optional().nullable(),
  purchasedAt: z.string().optional().nullable(),
  commissionedAt: z.string().optional().nullable(),
  warrantyStartsAt: z.string().optional().nullable(),
  warrantyEndsAt: z.string().optional().nullable(),
  status: z.enum(MACHINE_STATUSES).default("active"),
  hourlyCapacity: z.number().positive().optional().nullable(),
  dailyCapacity: z.number().positive().optional().nullable(),
  maxGlassWidthMm: z.number().positive().optional().nullable(),
  maxGlassHeightMm: z.number().positive().optional().nullable(),
  maxThicknessMm: z.number().positive().optional().nullable(),
  minThicknessMm: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type CreateMachineInput = z.infer<typeof createMachineSchema>;

export const updateMachineSchema = createMachineSchema.partial().extend({
  id: z.string().length(26, "Invalid machine ID"),
});
export type UpdateMachineInput = z.infer<typeof updateMachineSchema>;

// ─── Station Management Schemas (Sprint 2.8.2) ───────────────────────────────

export const STATION_TYPES = [
  "cutting", "grinding", "tempering", "insulating_glass",
  "cnc", "drilling", "lamination", "washing",
  "painting", "sandblasting", "quality", "dispatch",
] as const;

export type StationType = typeof STATION_TYPES[number];

export const createStationSchema = z.object({
  stationCode: z.string().min(1, "Station code is required").max(50),
  name: z.string().min(1, "Station name is required").max(255),
  description: z.string().optional().nullable(),
  stationType: z.enum(STATION_TYPES, { errorMap: () => ({ message: "Invalid station type" }) }),
  factoryId: z.string().length(26).optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
  maxConcurrentJobs: z.number().int().min(1).default(1),
  maxMachines: z.number().int().min(0).optional().nullable(),
  maxOperators: z.number().int().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});
export type CreateStationInput = z.infer<typeof createStationSchema>;

export const updateStationSchema = createStationSchema.partial().extend({
  id: z.string().length(26, "Invalid station ID"),
});
export type UpdateStationInput = z.infer<typeof updateStationSchema>;

export const assignMachineToStationSchema = z.object({
  stationId: z.string().length(26),
  machineId: z.string().length(26),
  isPrimary: z.boolean().default(false),
});
export type AssignMachineToStationInput = z.infer<typeof assignMachineToStationSchema>;

export const assignPersonnelToStationSchema = z.object({
  stationId: z.string().length(26),
  personnelId: z.string().length(26),
  isHeadOperator: z.boolean().default(false),
});
export type AssignPersonnelToStationInput = z.infer<typeof assignPersonnelToStationSchema>;

// ─── Personnel Management Schemas (Sprint 2.8.1) ────────────────────────────

export const PERSONNEL_ROLES = [
  "operator", "senior_operator", "supervisor", "manager",
] as const;

export type PersonnelRole = typeof PERSONNEL_ROLES[number];

export const ASSIGNMENT_TYPES = [
  "primary", "assistant", "temporary",
] as const;

export type AssignmentType = typeof ASSIGNMENT_TYPES[number];

export const PERMISSION_LEVELS = [
  "view", "operate", "supervise",
] as const;

export type PermissionLevel = typeof PERMISSION_LEVELS[number];

export const createPersonnelSchema = z.object({
  personnelCode: z.string().min(1, "Personnel code is required").max(100),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  titleId: z.string().length(26).optional().nullable(),
  role: z.enum(PERSONNEL_ROLES).default("operator"),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  isActive: z.boolean().default(true),
  hiredAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type CreatePersonnelInput = z.infer<typeof createPersonnelSchema>;

export const updatePersonnelSchema = createPersonnelSchema.partial().extend({
  id: z.string().length(26, "Invalid personnel ID"),
});
export type UpdatePersonnelInput = z.infer<typeof updatePersonnelSchema>;

export const createMachineAssignmentSchema = z.object({
  personnelId: z.string().length(26),
  machineId: z.string().length(26),
  assignmentType: z.enum(ASSIGNMENT_TYPES).default("primary"),
});
export type CreateMachineAssignmentInput = z.infer<typeof createMachineAssignmentSchema>;

export const createStationPermissionSchema = z.object({
  personnelId: z.string().length(26),
  stationId: z.string().length(26),
  permissionLevel: z.enum(PERMISSION_LEVELS).default("operate"),
});
export type CreateStationPermissionInput = z.infer<typeof createStationPermissionSchema>;

export const createPersonnelCertificateSchema = z.object({
  personnelId: z.string().length(26),
  certificateType: z.string().min(1, "Certificate type is required").max(100),
  issuedAt: z.string().min(1, "Issue date is required"),
  expiresAt: z.string().optional().nullable(),
  documentUrl: z.string().optional().nullable(),
});
export type CreatePersonnelCertificateInput = z.infer<typeof createPersonnelCertificateSchema>;

export const createEmergencyContactSchema = z.object({
  personnelId: z.string().length(26),
  contactName: z.string().min(1, "Contact name is required").max(255),
  relationship: z.string().min(1, "Relationship is required").max(100),
  phone: z.string().min(1, "Phone is required").max(50),
});
export type CreateEmergencyContactInput = z.infer<typeof createEmergencyContactSchema>;

export const createPersonnelShiftSchema = z.object({
  personnelId: z.string().length(26),
  shiftName: z.string().min(1, "Shift name is required").max(100),
  startsAt: z.string().regex(/^\d{2}:\d{2}$/, "Invalid start time (HH:MM)"),
  endsAt: z.string().regex(/^\d{2}:\d{2}$/, "Invalid end time (HH:MM)"),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  isActive: z.boolean().default(true),
});
export type CreatePersonnelShiftInput = z.infer<typeof createPersonnelShiftSchema>;

// ─── Warehouse Management Schemas (Sprint 2.9.0) ─────────────────────────────

export const WAREHOUSE_TYPES = [
  "raw_material",
  "semi_finished",
  "finished_goods",
  "consumables",
  "quality",
  "scrap",
  "shipping",
  "spare_parts",
] as const;

export type WarehouseType = typeof WAREHOUSE_TYPES[number];

export const createWarehouseSchema = z.object({
  warehouseCode: z.string().min(1, "Warehouse code is required").max(50),
  name: z.string().min(1, "Warehouse name is required").max(255),
  warehouseType: z.enum(WAREHOUSE_TYPES, {
    errorMap: () => ({ message: "Invalid warehouse type" }),
  }),
  factoryId: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().length(26).optional(),
  ),
  description: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().optional(),
  ),
  managerId: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().length(26).optional(),
  ),
  isActive: z.boolean().default(true),
  notes: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().optional(),
  ),
});
export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;

export const updateWarehouseSchema = createWarehouseSchema.partial().extend({
  id: z.string().length(26, "Invalid warehouse ID"),
});
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;

// ─── Material Master Schemas (Sprint 2.9.0) ──────────────────────────────────

export const MATERIAL_TYPES = [
  "raw_material",
  "semi_finished",
  "finished_good",
  "consumable",
  "spare_part",
  "packaging",
  "chemical",
  "service",
  "other",
] as const;

export type MaterialType = typeof MATERIAL_TYPES[number];

export const MATERIAL_STATUS = ["active", "passive", "blocked"] as const;
export type MaterialStatus = typeof MATERIAL_STATUS[number];

export const MATERIAL_UNITS = [
  "piece",
  "kg",
  "g",
  "ton",
  "m",
  "mm",
  "m2",
  "m3",
  "l",
  "box",
  "roll",
  "package",
] as const;

export type MaterialUnit = typeof MATERIAL_UNITS[number];

export const MATERIAL_ORIGIN_TYPES = ["domestic", "imported"] as const;
export type MaterialOriginType = typeof MATERIAL_ORIGIN_TYPES[number];

// ─── Inventory Types ──────────────────────────────────────────────────────────

export const INVENTORY_TYPES = [
  "raw_material",
  "semi_finished",
  "finished_product",
  "traded_goods",
  "consumable",
  "spare_part",
  "packaging",
  "service",
  "scrap",
  "remnant",
  "by_product",
] as const;

export type InventoryType = typeof INVENTORY_TYPES[number];

/* ── Preprocess helper for optional ULID fields ── */
const optionalUlid = (label: string) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().length(26, { message: `${label} must be exactly 26 characters` }).optional()
  );

/* ── Preprocess helper for optional string fields ── */
const optionalString = () =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().optional()
  );

/* ── Preprocess helper for optional numeric fields ── */
const optionalNumeric = () =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().optional()
  );

export const createMaterialSchema = z.object({
  materialCode: z.string().min(1, "Material code is required").max(50),
  name: z.string().min(1, "Material name is required").max(255),
  shortName: optionalString(),
  description: optionalString(),

  materialType: z.enum(MATERIAL_TYPES, {
    errorMap: () => ({ message: "Invalid material type" }),
  }),
  materialGroupId: optionalUlid("Material group"),
  brand: optionalString(),
  model: optionalString(),

  // Physical Attributes
  thicknessMm: optionalNumeric(),
  color: optionalString(),

  originType: z.enum(MATERIAL_ORIGIN_TYPES).optional(),
  originCountry: optionalString(),

  factoryId: optionalUlid("Factory"),
  defaultWarehouseId: optionalUlid("Default warehouse"),
  defaultLocationId: optionalUlid("Default location"),
  defaultSupplierId: optionalUlid("Default supplier"),

  baseUnit: z.enum(MATERIAL_UNITS, {
    errorMap: () => ({ message: "Invalid base unit" }),
  }).default("piece"),

  stockTracking: z.boolean().default(true),
  inventoryItem: z.boolean().default(true),
  purchasable: z.boolean().default(false),
  sellable: z.boolean().default(false),
  manufacturable: z.boolean().default(false),
  qualityInspectionRequired: z.boolean().default(false),
  batchTracking: z.boolean().default(false),
  serialTracking: z.boolean().default(false),
  expirationTracking: z.boolean().default(false),

  minStock: optionalNumeric(),
  maxStock: optionalNumeric(),
  criticalStock: optionalNumeric(),
  safetyStock: optionalNumeric(),
  reorderPoint: optionalNumeric(),
  reorderQuantity: optionalNumeric(),

  standardCost: optionalNumeric(),
  averageCost: optionalNumeric(),
  lastPurchasePrice: optionalNumeric(),
  currency: optionalString(),

  barcode: optionalString(),
  qrCode: optionalString(),
  rfidCode: optionalString(),

  imageUrl: optionalString(),
  technicalDrawingUrl: optionalString(),
  documentUrl: optionalString(),

  customCode1: optionalString(),
  customCode2: optionalString(),
  customCode3: optionalString(),
  customCode4: optionalString(),
  customCode5: optionalString(),

  status: z.enum(MATERIAL_STATUS).default("active"),
  isActive: z.boolean().default(true),
  notes: optionalString(),
});
export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;

export const updateMaterialSchema = createMaterialSchema.partial().extend({
  id: z.string().length(26, "Invalid material ID"),
});
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;

// ─── Custom Code Definitions (Sprint 2.10.3) ─────────────────────────────────

export const createCustomCodeDefinitionSchema = z.object({
  fieldNumber: z.number().int().min(1).max(5),
  value: z.string().min(1, "Value is required").max(100),
  label: z.string().min(1, "Label is required").max(255),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type CreateCustomCodeDefinitionInput = z.infer<typeof createCustomCodeDefinitionSchema>;

export const updateCustomCodeDefinitionSchema = createCustomCodeDefinitionSchema.extend({
  id: z.string().length(26, "Invalid ID"),
});
export type UpdateCustomCodeDefinitionInput = z.infer<typeof updateCustomCodeDefinitionSchema>;

// ─── Goods Receipt Types (Sprint 2.10.0) ─────────────────────────────────────

export const GOODS_RECEIPT_STATUS = ["draft", "completed", "cancelled"] as const;
export type GoodsReceiptStatus = typeof GOODS_RECEIPT_STATUS[number];

export const QUALITY_STATUS = ["accepted", "conditional", "rejected"] as const;
export type QualityStatus = typeof QUALITY_STATUS[number];

export const ATTACHMENT_CATEGORIES = [
  "irsiye",
  "fatura",
  "quality_cert",
  "ce_cert",
  "photo_truck",
  "photo_package",
  "photo_damage",
  "photo_despatch",
  "other",
] as const;
export type AttachmentCategory = typeof ATTACHMENT_CATEGORIES[number];

export const ATTACHMENT_FILE_TYPES = ["image", "pdf", "document"] as const;
export type AttachmentFileType = typeof ATTACHMENT_FILE_TYPES[number];

/* ── Goods Receipt Item Schema ── */

/* ── Preprocess helper for optional integer fields ── */
const optionalInt = () =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().optional()
  );

export const createGoodsReceiptItemSchema = z.object({
  materialId: z.string().length(26, "Material ID must be exactly 26 characters"),
  formatId: optionalUlid("Format"),
  widthMm: optionalNumeric(),
  heightMm: optionalNumeric(),

  // Plate count (adet) — operator enters this (e.g. 56 plates)
  plateCount: optionalInt(),

  // Total area in m² — auto-calculated from plateCount × (width×height / 1,000,000)
  totalAreaM2: optionalNumeric(),

  quantity: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive("Quantity must be positive")
  ),
  unit: z.enum(MATERIAL_UNITS, {
    errorMap: () => ({ message: "Invalid unit" }),
  }),
  lotNumber: optionalString(),
  unitCost: optionalNumeric(),
  currency: optionalString(),
  targetWarehouseId: optionalUlid("Target warehouse"),
  qualityStatus: z.enum(QUALITY_STATUS, {
    errorMap: () => ({ message: "Invalid quality status" }),
  }).default("accepted"),
  qualityNotes: optionalString(),

  // Quality tracking — damaged/missing counts
  damagedCount: optionalInt(),
  missingCount: optionalInt(),

  isPlateTracked: z.boolean().default(false),
});

export type CreateGoodsReceiptItemInput = z.infer<typeof createGoodsReceiptItemSchema>;

/* ── Goods Receipt Attachment Schema ── */

export const createGoodsReceiptAttachmentSchema = z.object({
  goodsReceiptItemId: optionalUlid("Item"),
  fileName: z.string().min(1, "File name is required"),
  fileType: z.enum(ATTACHMENT_FILE_TYPES, {
    errorMap: () => ({ message: "Invalid file type" }),
  }),
  fileUrl: z.string().url("Invalid file URL"),
  mimeType: z.string().min(1, "MIME type is required"),
  fileSizeBytes: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().positive("File size must be positive")
  ),
  category: z.enum(ATTACHMENT_CATEGORIES, {
    errorMap: () => ({ message: "Invalid attachment category" }),
  }),
  description: optionalString(),
});

export type CreateGoodsReceiptAttachmentInput = z.infer<typeof createGoodsReceiptAttachmentSchema>;

/* ── Goods Receipt Plate Schema ── */

export const createGoodsReceiptPlateSchema = z.object({
  plateSerial: z.string().min(1, "Plate serial is required"),
  widthMm: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive("Width must be positive")
  ),
  heightMm: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive("Height must be positive")
  ),
  thicknessMm: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive("Thickness must be positive").optional()
  ),
});

export type CreateGoodsReceiptPlateInput = z.infer<typeof createGoodsReceiptPlateSchema>;

/* ── Goods Receipt Header Schema ── */

export const createGoodsReceiptSchema = z.object({
  // Core
  receiptDate: z.string().min(1, "Receipt date is required"),
  receiptTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time (HH:mm)"),
  warehouseId: z.string().length(26, "Warehouse ID must be exactly 26 characters"),
  receivedById: optionalUlid("Received by"),

  // Optional
  supplierId: optionalUlid("Supplier"),
  purchaseOrderId: optionalUlid("Purchase order"),

  // Vehicle (Optional)
  vehiclePlate: optionalString(),
  trailerPlate: optionalString(),
  driverName: optionalString(),
  driverPhone: optionalString(),
  carrierCompany: optionalString(),

  // Documents (Optional)
  despatchNumber: optionalString(),
  despatchDate: optionalString(),
  invoiceNumber: optionalString(),
  orderReference: optionalString(),

  // Notes
  notes: optionalString(),

  // Items (minimum 1)
  items: z.array(createGoodsReceiptItemSchema).min(1, "At least one item is required"),
});

export type CreateGoodsReceiptInput = z.infer<typeof createGoodsReceiptSchema>;

export const updateGoodsReceiptSchema = z.object({
  id: z.string().length(26, "Invalid goods receipt ID"),
  receiptDate: z.string().min(1).optional(),
  receiptTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time (HH:mm)").optional(),
  warehouseId: z.string().length(26).optional(),
  receivedById: optionalUlid("Received by"),
  supplierId: optionalUlid("Supplier"),
  purchaseOrderId: optionalUlid("Purchase order"),
  vehiclePlate: optionalString(),
  trailerPlate: optionalString(),
  driverName: optionalString(),
  driverPhone: optionalString(),
  carrierCompany: optionalString(),
  despatchNumber: optionalString(),
  despatchDate: optionalString(),
  invoiceNumber: optionalString(),
  orderReference: optionalString(),
  notes: optionalString(),
  status: z.enum(GOODS_RECEIPT_STATUS).optional(),
});

export type UpdateGoodsReceiptInput = z.infer<typeof updateGoodsReceiptSchema>;

/* ── ULID helper ── */
const ulid = () => z.string().length(26, "ID must be exactly 26 characters");

/* ══════════════════════════════════════════════════════════════════════════════
   CUSTOMER MODULE SCHEMAS (Phase 2 — CUSTOMER_ARCHITECTURE.md)
   ══════════════════════════════════════════════════════════════════════════════ */

/* ── JSONB Value Object Schemas ── */

export const qualityProfileSchema = z.object({
  version: z.number().int().min(1).default(1),
  edgeQualityMm: z.number().min(0).default(0.5),
  opticalQuality: z.enum(["architectural", "automotive", "mirror", "solar"]).default("architectural"),
  scratchTolerance: z.enum(["standard", "strict", "none"]).default("standard"),
  bubbleTolerance: z.enum(["standard", "strict", "none"]).default("standard"),
  inspectionLevel: z.enum(["100%", "sampling", "skip"]).default("100%"),
  acceptsBGrade: z.boolean().default(false),
  acceptsNearSize: z.boolean().default(false),
  requiresMillCert: z.boolean().default(false),
  maxDefectsPerSqm: z.number().int().min(0).default(2),
});

export type QualityProfile = z.infer<typeof qualityProfileSchema>;

export const productionPreferencesSchema = z.object({
  version: z.number().int().min(1).default(1),
  defaultEdgework: z.enum(["flat_ground", "arrissing", "seamed", "beveled", "polished"]).default("flat_ground"),
  defaultTempering: z.enum(["full_temper", "heat_strengthened", "annealed"]).default("full_temper"),
  defaultSpacerType: z.enum(["aluminum", "warm_edge", "tps", "swiggle", "none"]).default("aluminum"),
  defaultGasFill: z.enum(["air", "argon", "krypton", "xenon"]).default("argon"),
  defaultFilmType: z.enum(["low_e", "solar_control", "self_cleaning", "none"]).default("low_e"),
  defaultToleranceClass: z.enum(["±0.5mm", "±1.0mm", "±2.0mm"]).default("±1.0mm"),
  laminationPreference: z.enum(["pvb", "eva", "sgp", "acoustic", "none"]).default("pvb"),
});

export type ProductionPreferences = z.infer<typeof productionPreferencesSchema>;

export const labelSpecificationSchema = z.object({
  version: z.number().int().min(1).default(1),
  barcodeFormat: z.enum(["code128", "qr", "datamatrix", "none"]).default("code128"),
  fields: z.array(z.string()).default(["order_ref", "dimensions", "customer_code", "thickness", "date"]),
  labelPosition: z.enum(["top_left", "top_right", "edge"]).default("top_left"),
  labelsPerUnit: z.number().int().min(1).default(1),
  language: z.string().default("en"),
  includeLogo: z.boolean().default(true),
  protectiveFilmBeforeLabel: z.boolean().default(false),
});

export type LabelSpecification = z.infer<typeof labelSpecificationSchema>;

export const packagingProfileSchema = z.object({
  version: z.number().int().min(1).default(1),
  packagingType: z.enum(["stillage", "a_frame", "crate", "cardboard", "loose", "export_crate"]).default("stillage"),
  separationMaterial: z.enum(["paper", "cork_powder", "foam", "plastic_interleaf", "none"]).default("cork_powder"),
  interleaving: z.enum(["every_sheet", "every_5", "none"]).default("every_sheet"),
  strapping: z.enum(["metal_band", "plastic_band", "none"]).default("metal_band"),
  cornerProtection: z.enum(["cardboard", "plastic", "none"]).default("cardboard"),
  protectiveFilm: z.enum(["one_side", "both_sides", "none"]).default("one_side"),
  maxWeightKg: z.number().min(0).default(1500),
  maxPieces: z.number().int().min(0).default(50),
});

export type PackagingProfile = z.infer<typeof packagingProfileSchema>;

export const communicationProfileSchema = z.object({
  version: z.number().int().min(1).default(1),
  channels: z.record(
    z.enum(["order_confirmed", "production_started", "production_completed", "ready_for_dispatch", "dispatched", "delivered"]),
    z.object({
      type: z.enum(["email", "sms", "phone"]),
      contactId: ulid().optional(),
      phone: z.string().optional(),
    })
  ).default({}),
});

export type CommunicationProfile = z.infer<typeof communicationProfileSchema>;

export const operationalBlockSchema = z.object({
  blockedAt: z.string().datetime().optional(),
  blockedBy: ulid().optional(),
  blockReason: z.string().min(1, "Block reason is required"),
  blockCategory: z.enum(["quality", "documentation", "specification", "logistics", "other"]),
  blockReleasedAt: z.string().datetime().optional(),
  blockReleasedBy: ulid().optional(),
});

export type OperationalBlock = z.infer<typeof operationalBlockSchema>;

/* ─── Customer Aggregate Root Schemas ─── */

export const createCustomerSchemaV2 = z.object({
  customerCode: z.string().min(1, "Customer code is required"),
  name: z.string().min(2, "Customer name is required"),
  shortName: z.string().optional(),
  taxNumber: z.string().optional(),
  taxOffice: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type CreateCustomerInputV2 = z.infer<typeof createCustomerSchemaV2>;

export const updateCustomerSchemaV2 = createCustomerSchemaV2.extend({
  id: ulid(),
  version: z.number().int().min(1),
});

export type UpdateCustomerInputV2 = z.infer<typeof updateCustomerSchemaV2>;

/* ─── Contact Schemas ─── */

export const createCustomerContactSchemaV2 = z.object({
  customerId: ulid(),
  name: z.string().min(2, "Contact name is required"),
  title: z.string().optional(),
  role: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  isPrimary: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type CreateCustomerContactInputV2 = z.infer<typeof createCustomerContactSchemaV2>;

export const updateCustomerContactSchemaV2 = createCustomerContactSchemaV2.extend({
  id: ulid(),
});

export type UpdateCustomerContactInputV2 = z.infer<typeof updateCustomerContactSchemaV2>;

export const setPrimaryContactSchema = z.object({
  id: ulid(),
  customerId: ulid(),
});

export type SetPrimaryContactInput = z.infer<typeof setPrimaryContactSchema>;

/* ─── Delivery Point Schemas ─── */

export const createDeliveryPointSchemaV2 = z.object({
  customerId: ulid(),
  name: z.string().min(2, "Delivery point name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  phone: z.string().optional(),
  note: z.string().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type CreateDeliveryPointInputV2 = z.infer<typeof createDeliveryPointSchemaV2>;

export const updateDeliveryPointSchemaV2 = createDeliveryPointSchemaV2.extend({
  id: ulid(),
});

export type UpdateDeliveryPointInputV2 = z.infer<typeof updateDeliveryPointSchemaV2>;

export const setDefaultDeliveryPointSchema = z.object({
  id: ulid(),
  customerId: ulid(),
});

export type SetDefaultDeliveryPointInput = z.infer<typeof setDefaultDeliveryPointSchema>;

/* ─── Glass Catalog Schemas ─── */

export const createGlassCatalogSchema = z.object({
  customerId: ulid(),
  productCode: z.string().min(1, "Product code is required"),
  glassType: z.string().min(1, "Glass type is required"),
  thicknessMm: z.number().positive().optional(),
  defaultWidthMm: z.number().positive().optional(),
  defaultHeightMm: z.number().positive().optional(),
  defaultPieces: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

export type CreateGlassCatalogInput = z.infer<typeof createGlassCatalogSchema>;

export const updateGlassCatalogSchema = createGlassCatalogSchema.extend({
  id: ulid(),
});

export type UpdateGlassCatalogInput = z.infer<typeof updateGlassCatalogSchema>;

/* ─── Special Instruction Schemas ─── */

export const createCustomerInstructionSchema = z.object({
  customerId: ulid(),
  title: z.string().min(1, "Title is required"),
  instruction: z.string().min(1, "Instruction text is required"),
  isStanding: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type CreateCustomerInstructionInput = z.infer<typeof createCustomerInstructionSchema>;

export const updateCustomerInstructionSchema = createCustomerInstructionSchema.extend({
  id: ulid(),
});

export type UpdateCustomerInstructionInput = z.infer<typeof updateCustomerInstructionSchema>;

/* ─── Instruction Condition Schemas ─── */

export const createInstructionConditionSchema = z.object({
  instructionId: ulid(),
  field: z.string().min(1, "Field is required"),
  operator: z.string().min(1, "Operator is required"),
  value: z.string().min(1, "Value is required"),
  valueType: z.enum(["number", "string", "boolean", "enum"]).default("number"),
  logicalGroup: z.number().int().min(0).default(0),
  sortOrder: z.number().int().min(0).default(0),
});

export type CreateInstructionConditionInput = z.infer<typeof createInstructionConditionSchema>;

export const updateInstructionConditionSchema = createInstructionConditionSchema.extend({
  id: ulid(),
});

export type UpdateInstructionConditionInput = z.infer<typeof updateInstructionConditionSchema>;

/* ─── Value Object Update Schemas (scoped, include version for optimistic locking) ─── */

export const updateQualityProfileSchema = z.object({
  customerId: ulid(),
  version: z.number().int().min(1),
  qualityProfile: qualityProfileSchema,
});

export type UpdateQualityProfileInput = z.infer<typeof updateQualityProfileSchema>;

export const updateProductionPreferencesSchema = z.object({
  customerId: ulid(),
  version: z.number().int().min(1),
  productionPreferences: productionPreferencesSchema,
});

export type UpdateProductionPreferencesInput = z.infer<typeof updateProductionPreferencesSchema>;

export const updateLabelSpecificationSchema = z.object({
  customerId: ulid(),
  version: z.number().int().min(1),
  labelSpec: labelSpecificationSchema,
});

export type UpdateLabelSpecificationInput = z.infer<typeof updateLabelSpecificationSchema>;

export const updatePackagingProfileSchema = z.object({
  customerId: ulid(),
  version: z.number().int().min(1),
  packagingProfile: packagingProfileSchema,
});

export type UpdatePackagingProfileInput = z.infer<typeof updatePackagingProfileSchema>;

export const updateCommunicationProfileSchema = z.object({
  customerId: ulid(),
  version: z.number().int().min(1),
  communicationProfile: communicationProfileSchema,
});

export type UpdateCommunicationProfileInput = z.infer<typeof updateCommunicationProfileSchema>;

/* ─── Operational Block Schemas ─── */

export const blockCustomerSchema = z.object({
  customerId: ulid(),
  blockReason: z.string().min(1, "Block reason is required"),
  blockCategory: z.enum(["quality", "documentation", "specification", "logistics", "other"]),
});

export type BlockCustomerInput = z.infer<typeof blockCustomerSchema>;

export const releaseCustomerBlockSchema = z.object({
  customerId: ulid(),
});

export type ReleaseCustomerBlockInput = z.infer<typeof releaseCustomerBlockSchema>;

/* ─── Soft Delete Schema ─── */

export const softDeleteCustomerSchema = z.object({
  id: ulid(),
});

export type SoftDeleteCustomerInput = z.infer<typeof softDeleteCustomerSchema>;

export const restoreCustomerSchema = z.object({
  id: ulid(),
});

export type RestoreCustomerInput = z.infer<typeof restoreCustomerSchema>;

// ─── Production Record Types (Sprint 6.0.0) ──────────────────────────────────

export const PRODUCTION_RECORD_STATUS = ["collecting", "completed", "archived"] as const;
export type ProductionRecordStatus = typeof PRODUCTION_RECORD_STATUS[number];

/** Quality status for production events (passed/failed at a station, not goods receipt quality). */
export const PRODUCTION_QUALITY_STATUS = ["passed", "failed", "conditional_pass", "pending_inspection"] as const;
export type ProductionQualityStatus = typeof PRODUCTION_QUALITY_STATUS[number];
