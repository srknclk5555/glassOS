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
  tenantId: z.string().uuid("Invalid tenant ID"),
  name: z.string().min(2, "Material category name is required"),
  description: z.string().optional(),
  active: z.boolean().optional(),
});
export type CreateMaterialCategoryInput = z.infer<typeof createMaterialCategorySchema>;

export const updateMaterialCategorySchema = createMaterialCategorySchema.extend({
  id: z.string().uuid("Invalid material category ID"),
});
export type UpdateMaterialCategoryInput = z.infer<typeof updateMaterialCategorySchema>;

export const createMaterialSchema = z.object({
  tenantId: z.string().uuid("Invalid tenant ID").optional(),
  categoryId: z.string().uuid("Invalid material category ID"),
  materialCode: z.string().min(1, "Material code is required"),
  name: z.string().min(2, "Material name is required"),
  description: z.string().optional(),
  thicknessMm: z.number().positive().optional(),
  color: z.string().optional(),
  manufacturer: z.string().optional(),
  standardSheetWidthMm: z.number().positive().optional(),
  standardSheetHeightMm: z.number().positive().optional(),
  stockTracked: z.boolean().optional(),
  temperable: z.boolean().optional(),
  laminateCompatible: z.boolean().optional(),
  densityKgPerM3: z.number().positive().optional(),
  defaultUnit: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
});
export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;

export const updateMaterialSchema = createMaterialSchema.extend({
  id: z.string().uuid("Invalid material ID"),
});
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;

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
