import { and, eq, or, like, ilike, isNull, isNotNull, asc, desc, sql, ne, inArray } from "drizzle-orm";
import {
  customers,
  customerContacts,
  deliveryPoints,
  customerGlassCatalog,
  customerInstructions,
  customerInstructionConditions,
} from "../schema/index";
import { BaseRepository, RepositoryQueryOptions, RepositoryListResult } from "./base.repository";

/* ══════════════════════════════════════════════════════════════════════════════
   PROJECTION TYPES
   ══════════════════════════════════════════════════════════════════════════════ */

export interface CustomerListItem {
  id: string;
  customerCode: string;
  name: string;
  shortName: string | null;
  isActive: boolean;
  operationalBlock: unknown | null;
  city: string | null;
  country: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerSearchResult {
  id: string;
  customerCode: string;
  name: string;
  shortName: string | null;
  isActive: boolean;
}

export interface CustomerSelectorItem {
  id: string;
  customerCode: string;
  name: string;
  shortName: string | null;
}

export interface CustomerDetailGeneral {
  id: string;
  customerCode: string;
  name: string;
  shortName: string | null;
  taxNumber: string | null;
  taxOffice: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  erpStatus: string | null;
  notes: string | null;
  isActive: boolean;
  operationalBlock: unknown | null;
  factoryId: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  contacts: CustomerContactProjection[];
  deliveryPoints: CustomerDeliveryPointProjection[];
}

export interface CustomerContactProjection {
  id: string;
  name: string;
  title: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
  isActive: boolean;
}

export interface CustomerDeliveryPointProjection {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface CustomerDetailProduction {
  id: string;
  customerCode: string;
  name: string;
  qualityProfile: unknown | null;
  productionPreferences: unknown | null;
  labelSpec: unknown | null;
  packagingProfile: unknown | null;
}

export interface CustomerDetailCommunication {
  id: string;
  customerCode: string;
  name: string;
  communicationProfile: unknown | null;
}

export interface CustomerOrderEntryData {
  id: string;
  customerCode: string;
  name: string;
  shortName: string | null;
  productionPreferences: unknown | null;
  labelSpec: unknown | null;
  packagingProfile: unknown | null;
  contacts: CustomerContactProjection[];
  deliveryPoints: CustomerDispatchDeliveryPoint[];
}

export interface CustomerDispatchDeliveryPoint {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  address: string | null;
  isDefault: boolean;
  schedulingProfile: unknown | null;
}

export interface CustomerDispatchData {
  id: string;
  customerCode: string;
  name: string;
  operationalBlock: unknown | null;
  deliveryPoints: CustomerDispatchDeliveryPoint[];
}

export interface CustomerAggregate {
  id: string;
  tenantId: string;
  factoryId: string | null;
  customerCode: string;
  name: string;
  shortName: string | null;
  taxNumber: string | null;
  taxOffice: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  erpStatus: string | null;
  notes: string | null;
  isActive: boolean;
  qualityProfile: unknown | null;
  productionPreferences: unknown | null;
  labelSpec: unknown | null;
  packagingProfile: unknown | null;
  communicationProfile: unknown | null;
  operationalBlock: unknown | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  contacts: CustomerAggregateContact[];
  deliveryPoints: CustomerAggregateDeliveryPoint[];
  glassCatalog: CustomerAggregateGlassCatalog[];
  instructions: CustomerAggregateInstruction[];
}

export interface CustomerAggregateContact {
  id: string;
  customerId: string;
  name: string;
  title: string | null;
  role: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
}

export interface CustomerAggregateDeliveryPoint {
  id: string;
  customerId: string;
  name: string;
  address: string | null;
  city: string | null;
  district: string | null;
  latitude: string | null;
  longitude: string | null;
  phone: string | null;
  note: string | null;
  isDefault: boolean;
  isActive: boolean;
  schedulingProfile: unknown | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
}

export interface CustomerAggregateGlassCatalog {
  id: string;
  customerId: string;
  productCode: string;
  glassType: string;
  thicknessMm: string | null;
  defaultWidthMm: string | null;
  defaultHeightMm: string | null;
  defaultPieces: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
}

export interface CustomerAggregateInstruction {
  id: string;
  customerId: string;
  title: string;
  instruction: string;
  isStanding: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  conditions: CustomerAggregateCondition[];
}

export interface CustomerAggregateCondition {
  id: string;
  instructionId: string;
  field: string;
  operator: string;
  value: string;
  valueType: string;
  logicalGroup: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
}

export interface CustomerListFilters {
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  activeOnly?: boolean;
}

export interface CustomerRepositoryPaginatedResult {
  items: CustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* ══════════════════════════════════════════════════════════════════════════════
   CUSTOMER REPOSITORY
   ══════════════════════════════════════════════════════════════════════════════ */

export class CustomerRepository extends BaseRepository<any> {
  constructor(db: any) {
    super(db, customers, {
      softDelete: true,
      tenantScoped: true,
      factoryScoped: true,
      activeFlag: true,
    });
  }

  /* ─── Transaction-safe DB resolver ──────────────────────────────────── */

  private resolveTx(options?: { tx?: unknown }): any {
    return this.getDb(options?.tx);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     LIST / SEARCH / SELECTOR PROJECTIONS
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * §10.1 — Customer List
   * Used by: /customers page
   * Loads: id, customer_code, name, short_name, is_active, operational_block,
   *        city, country, created_at, updated_at
   * Supports: pagination, ILIKE search, sorting, active-only filter
   */
  async findForList(
    tenantId: string,
    filters?: CustomerListFilters,
    options?: { tx?: unknown },
  ): Promise<CustomerRepositoryPaginatedResult> {
    const db = this.resolveTx(options);
    const conditions: any[] = [eq(customers.tenantId, tenantId), isNull(customers.deletedAt)];

    if (filters?.activeOnly) {
      conditions.push(eq(customers.isActive, true));
    }

    if (filters?.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(customers.name, pattern),
          ilike(customers.customerCode, pattern),
          ilike(customers.shortName, pattern),
        ),
      );
    }

    const where = and(...conditions);

    const page = Math.max(1, filters?.page ?? 1);
    const pageSize = Math.max(1, filters?.pageSize ?? 20);
    const offset = (page - 1) * pageSize;

    const orderColumn = filters?.sortBy ?? "name";
    const orderDir = filters?.sortOrder === "desc" ? desc : asc;

    const items = await db
      .select({
        id: customers.id,
        customerCode: customers.customerCode,
        name: customers.name,
        shortName: customers.shortName,
        isActive: customers.isActive,
        operationalBlock: customers.operationalBlock,
        city: customers.city,
        country: customers.country,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      })
      .from(customers)
      .where(where)
      .orderBy(orderDir((customers as any)[orderColumn] ?? customers.name))
      .limit(pageSize)
      .offset(offset);

    const totalResult = await db
      .select({ total: sql<number>`count(*)` })
      .from(customers)
      .where(where);

    const total = Number(totalResult[0]?.total ?? 0);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * §10.2 + §11.5 — Customer Search
   * Used by: search-as-you-type in CustomerSelector, global command palette
   * Loads: id, customer_code, name, short_name, is_active
   * Strategy: ILIKE on name, customer_code, short_name, phone
   * Limit: 20 results maximum
   */
  async search(
    tenantId: string,
    query: string,
    options?: { activeOnly?: boolean; limit?: number; tx?: unknown },
  ): Promise<CustomerSearchResult[]> {
    const db = this.resolveTx(options);
    const conditions: any[] = [eq(customers.tenantId, tenantId), isNull(customers.deletedAt)];

    if (query) {
      const pattern = `%${query}%`;
      conditions.push(
        or(
          ilike(customers.name, pattern),
          ilike(customers.customerCode, pattern),
          ilike(customers.shortName, pattern),
          ilike(customers.phone, pattern),
          ilike(customers.taxNumber, pattern),
        ),
      );
    }

    if (options?.activeOnly ?? true) {
      conditions.push(eq(customers.isActive, true));
    }

    const limit = Math.min(Math.max(1, options?.limit ?? 20), 100);

    return db
      .select({
        id: customers.id,
        customerCode: customers.customerCode,
        name: customers.name,
        shortName: customers.shortName,
        isActive: customers.isActive,
      })
      .from(customers)
      .where(and(...conditions))
      .orderBy(asc(customers.name))
      .limit(limit);
  }

  /**
   * §10.3 — Customer Selector
   * Used by: Goods Receipt, Material dialogs, Order creation, Dispatch
   * Loads: id, customer_code, name, short_name
   * Filters: is_active = true AND deleted_at IS NULL
   */
  async findForSelector(
    tenantId: string,
    options?: { search?: string; limit?: number; tx?: unknown },
  ): Promise<CustomerSelectorItem[]> {
    const db = this.resolveTx(options);
    const conditions: any[] = [
      eq(customers.tenantId, tenantId),
      eq(customers.isActive, true),
      isNull(customers.deletedAt),
    ];

    if (options?.search) {
      const pattern = `%${options.search}%`;
      conditions.push(
        or(
          ilike(customers.name, pattern),
          ilike(customers.customerCode, pattern),
        ),
      );
    }

    const limit = Math.min(Math.max(1, options?.limit ?? 50), 200);

    return db
      .select({
        id: customers.id,
        customerCode: customers.customerCode,
        name: customers.name,
        shortName: customers.shortName,
      })
      .from(customers)
      .where(and(...conditions))
      .orderBy(asc(customers.name))
      .limit(limit);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     DETAIL PROJECTIONS
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * §10.4 — Customer Detail — General Tab
   * Used by: Customer detail page, General tab
   * Loads: all identity columns, is_active, operational_block, audit columns
   * Joins: Contacts (projection), Delivery Points (projection)
   */
  async findDetailGeneral(
    id: string,
    tenantId: string,
    options?: { tx?: unknown },
  ): Promise<CustomerDetailGeneral | null> {
    const db = this.resolveTx(options);

    const condition =
      and(eq(customers.id, id), eq(customers.tenantId, tenantId));

    const row = await db
      .select({
        id: customers.id,
        customerCode: customers.customerCode,
        name: customers.name,
        shortName: customers.shortName,
        taxNumber: customers.taxNumber,
        taxOffice: customers.taxOffice,
        phone: customers.phone,
        email: customers.email,
        address: customers.address,
        city: customers.city,
        country: customers.country,
        erpStatus: customers.erpStatus,
        notes: customers.notes,
        isActive: customers.isActive,
        operationalBlock: customers.operationalBlock,
        factoryId: customers.factoryId,
        version: customers.version,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
        createdBy: customers.createdBy,
        updatedBy: customers.updatedBy,
        deletedAt: customers.deletedAt,
        deletedBy: customers.deletedBy,
      })
      .from(customers)
      .where(condition)
      .limit(1);

    if (!row[0]) return null;

    const [contacts, deliveryPointsResult] = await Promise.all([
      this.findContactProjections(id, options),
      this.findDeliveryPointProjections(id, options),
    ]);

    return {
      ...row[0],
      contacts,
      deliveryPoints: deliveryPointsResult,
    };
  }

  /**
   * §10.5 — Customer Detail — Production Tab
   * Used by: Customer detail page, Production tab
   * Loads: id, customer_code, name + 4 JSONB value objects
   * Joins: None (JSONB columns on root)
   */
  async findDetailProduction(
    id: string,
    tenantId: string,
    options?: { tx?: unknown },
  ): Promise<CustomerDetailProduction | null> {
    const db = this.resolveTx(options);

    const condition = and(eq(customers.id, id), eq(customers.tenantId, tenantId));

    const row = await db
      .select({
        id: customers.id,
        customerCode: customers.customerCode,
        name: customers.name,
        qualityProfile: customers.qualityProfile,
        productionPreferences: customers.productionPreferences,
        labelSpec: customers.labelSpec,
        packagingProfile: customers.packagingProfile,
      })
      .from(customers)
      .where(condition)
      .limit(1);

    return row[0] ?? null;
  }

  /**
   * §10.6 — Customer Detail — Communication Tab
   * Used by: Customer detail page, Communication tab
   * Loads: id, customer_code, name, communication_profile
   * Joins: None (JSONB column on root)
   */
  async findDetailCommunication(
    id: string,
    tenantId: string,
    options?: { tx?: unknown },
  ): Promise<CustomerDetailCommunication | null> {
    const db = this.resolveTx(options);

    const condition = and(eq(customers.id, id), eq(customers.tenantId, tenantId));

    const row = await db
      .select({
        id: customers.id,
        customerCode: customers.customerCode,
        name: customers.name,
        communicationProfile: customers.communicationProfile,
      })
      .from(customers)
      .where(condition)
      .limit(1);

    return row[0] ?? null;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     OPERATIONAL PROJECTIONS
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * §10.7 — Order Entry
   * Used by: Order creation / edit
   * Loads: Customer identity + production_preferences, label_spec, packaging_profile
   *        (for copy-on-write) + active contacts + active delivery points
   * Joins: Contacts (is_active = true), Delivery Points (is_active = true)
   */
  async findForOrderEntry(
    id: string,
    tenantId: string,
    options?: { tx?: unknown },
  ): Promise<CustomerOrderEntryData | null> {
    const db = this.resolveTx(options);

    const condition = and(
      eq(customers.id, id),
      eq(customers.tenantId, tenantId),
      isNull(customers.deletedAt),
    );

    const row = await db
      .select({
        id: customers.id,
        customerCode: customers.customerCode,
        name: customers.name,
        shortName: customers.shortName,
        productionPreferences: customers.productionPreferences,
        labelSpec: customers.labelSpec,
        packagingProfile: customers.packagingProfile,
      })
      .from(customers)
      .where(condition)
      .limit(1);

    if (!row[0]) return null;

    const [contacts, deliveryPointsResult] = await Promise.all([
      this.findActiveContactProjections(id, options),
      this.findActiveDeliveryPointProjections(id, options),
    ]);

    return {
      ...row[0],
      contacts,
      deliveryPoints: deliveryPointsResult,
    };
  }

  /**
   * §10.8 — Dispatch
   * Used by: Dispatch planning
   * Loads: id, customer_code, name, operational_block + active delivery points
   *        with scheduling_profile
   * Joins: Delivery Points (is_active = true AND deleted_at IS NULL)
   */
  async findForDispatch(
    id: string,
    tenantId: string,
    options?: { tx?: unknown },
  ): Promise<CustomerDispatchData | null> {
    const db = this.resolveTx(options);

    const condition = and(
      eq(customers.id, id),
      eq(customers.tenantId, tenantId),
      isNull(customers.deletedAt),
    );

    const row = await db
      .select({
        id: customers.id,
        customerCode: customers.customerCode,
        name: customers.name,
        operationalBlock: customers.operationalBlock,
      })
      .from(customers)
      .where(condition)
      .limit(1);

    if (!row[0]) return null;

    const deliveryPointsResult = await this.findDispatchDeliveryPoints(id, options);

    return {
      ...row[0],
      deliveryPoints: deliveryPointsResult,
    };
  }

  /* ══════════════════════════════════════════════════════════════════════════
     AGGREGATE LOADING
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Full aggregate load — customer root + all owned entities + value objects.
   * Loads every field. Use projection methods (findDetailGeneral, etc.) when
   * only specific data is needed.
   */
  async findAggregate(
    id: string,
    tenantId: string,
    options?: { includeDeleted?: boolean; tx?: unknown },
  ): Promise<CustomerAggregate | null> {
    const db = this.resolveTx(options);

    const conditions: any[] = [eq(customers.id, id), eq(customers.tenantId, tenantId)];
    if (!options?.includeDeleted) {
      conditions.push(isNull(customers.deletedAt));
    }

    const row = await db
      .select()
      .from(customers)
      .where(and(...conditions))
      .limit(1);

    if (!row[0]) return null;

    const [contacts, dps, glassCat, instructions] = await Promise.all([
      this.findAllContacts(id, options),
      this.findAllDeliveryPoints(id, options),
      this.findAllGlassCatalog(id, options),
      this.findAllInstructions(id, options),
    ]);

    return {
      ...row[0],
      contacts,
      deliveryPoints: dps,
      glassCatalog: glassCat,
      instructions,
    };
  }

  /* ══════════════════════════════════════════════════════════════════════════
     CHILD ENTITY QUERIES
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * List contacts for a customer (non-deleted only).
   */
  async findContactsByCustomerId(
    customerId: string,
    options?: { includeDeleted?: boolean; tx?: unknown },
  ): Promise<CustomerAggregateContact[]> {
    return this.findAllContacts(customerId, options);
  }

  /**
   * List delivery points for a customer (non-deleted only).
   */
  async findDeliveryPointsByCustomerId(
    customerId: string,
    options?: { includeDeleted?: boolean; tx?: unknown },
  ): Promise<CustomerAggregateDeliveryPoint[]> {
    return this.findAllDeliveryPoints(customerId, options);
  }

  /**
   * List glass catalog entries for a customer (non-deleted only).
   */
  async findGlassCatalogByCustomerId(
    customerId: string,
    options?: { includeDeleted?: boolean; tx?: unknown },
  ): Promise<CustomerAggregateGlassCatalog[]> {
    return this.findAllGlassCatalog(customerId, options);
  }

  /**
   * List instructions (with conditions) for a customer (non-deleted only).
   */
  async findInstructionsByCustomerId(
    customerId: string,
    options?: { includeDeleted?: boolean; tx?: unknown },
  ): Promise<CustomerAggregateInstruction[]> {
    return this.findAllInstructions(customerId, options);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     HELPERS — EXISTENCE, VERSION, COUNTS
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Find a customer by customer_code within a tenant (for duplicate check).
   */
  async findByCustomerCode(
    tenantId: string,
    code: string,
    options?: { tx?: unknown },
  ): Promise<{ id: string; name: string } | null> {
    const db = this.resolveTx(options);

    const row = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.customerCode, code)))
      .limit(1);

    return row[0] ?? null;
  }

  /**
   * Check if a customer_code already exists within a tenant, optionally
   * excluding a specific customer ID (for update scenarios).
   */
  async existsByCustomerCode(
    tenantId: string,
    code: string,
    excludeId?: string,
    options?: { tx?: unknown },
  ): Promise<boolean> {
    const db = this.resolveTx(options);

    const conditions: any[] = [
      eq(customers.tenantId, tenantId),
      eq(customers.customerCode, code),
    ];
    if (excludeId) {
      conditions.push(ne(customers.id, excludeId));
    }

    const row = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(...conditions))
      .limit(1);

    return row.length > 0;
  }

  /**
   * Read the current version for optimistic locking.
   */
  async getVersion(
    id: string,
    tenantId: string,
    options?: { tx?: unknown },
  ): Promise<number | null> {
    const db = this.resolveTx(options);

    const row = await db
      .select({ version: customers.version })
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .limit(1);

    return row[0]?.version ?? null;
  }

  /**
   * Count active customers within a tenant.
   */
  async countActiveByTenant(
    tenantId: string,
    options?: { tx?: unknown },
  ): Promise<number> {
    const db = this.resolveTx(options);

    const result = await db
      .select({ total: sql<number>`count(*)` })
      .from(customers)
      .where(
        and(
          eq(customers.tenantId, tenantId),
          eq(customers.isActive, true),
          isNull(customers.deletedAt),
        ),
      );

    return Number(result[0]?.total ?? 0);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     PRIVATE — CHILD LOADERS
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Contact projection for General tab (§10.4).
   */
  private async findContactProjections(
    customerId: string,
    options?: { tx?: unknown },
  ): Promise<CustomerContactProjection[]> {
    const db = this.resolveTx(options);

    return db
      .select({
        id: customerContacts.id,
        name: customerContacts.name,
        title: customerContacts.title,
        role: customerContacts.role,
        phone: customerContacts.phone,
        email: customerContacts.email,
        isPrimary: customerContacts.isPrimary,
        isActive: customerContacts.isActive,
      })
      .from(customerContacts)
      .where(
        and(
          eq(customerContacts.customerId, customerId),
          isNull(customerContacts.deletedAt),
        ),
      )
      .orderBy(asc(customerContacts.name));
  }

  /**
   * Active contact projection for Order Entry (§10.7).
   */
  private async findActiveContactProjections(
    customerId: string,
    options?: { tx?: unknown },
  ): Promise<CustomerContactProjection[]> {
    const db = this.resolveTx(options);

    return db
      .select({
        id: customerContacts.id,
        name: customerContacts.name,
        title: customerContacts.title,
        role: customerContacts.role,
        phone: customerContacts.phone,
        email: customerContacts.email,
        isPrimary: customerContacts.isPrimary,
        isActive: customerContacts.isActive,
      })
      .from(customerContacts)
      .where(
        and(
          eq(customerContacts.customerId, customerId),
          eq(customerContacts.isActive, true),
          isNull(customerContacts.deletedAt),
        ),
      )
      .orderBy(asc(customerContacts.name));
  }

  /**
   * Delivery point projection for General tab (§10.4).
   */
  private async findDeliveryPointProjections(
    customerId: string,
    options?: { tx?: unknown },
  ): Promise<CustomerDeliveryPointProjection[]> {
    const db = this.resolveTx(options);

    return db
      .select({
        id: deliveryPoints.id,
        name: deliveryPoints.name,
        city: deliveryPoints.city,
        district: deliveryPoints.district,
        isDefault: deliveryPoints.isDefault,
        isActive: deliveryPoints.isActive,
      })
      .from(deliveryPoints)
      .where(
        and(
          eq(deliveryPoints.customerId, customerId),
          isNull(deliveryPoints.deletedAt),
        ),
      )
      .orderBy(desc(deliveryPoints.isDefault), asc(deliveryPoints.name));
  }

  /**
   * Active delivery point projection for Order Entry (§10.7).
   */
  private async findActiveDeliveryPointProjections(
    customerId: string,
    options?: { tx?: unknown },
  ): Promise<CustomerDispatchDeliveryPoint[]> {
    const db = this.resolveTx(options);

    return db
      .select({
        id: deliveryPoints.id,
        name: deliveryPoints.name,
        city: deliveryPoints.city,
        district: deliveryPoints.district,
        address: deliveryPoints.address,
        isDefault: deliveryPoints.isDefault,
        schedulingProfile: deliveryPoints.schedulingProfile,
      })
      .from(deliveryPoints)
      .where(
        and(
          eq(deliveryPoints.customerId, customerId),
          eq(deliveryPoints.isActive, true),
          isNull(deliveryPoints.deletedAt),
        ),
      )
      .orderBy(desc(deliveryPoints.isDefault), asc(deliveryPoints.name));
  }

  /**
   * Active delivery point projection for Dispatch (§10.8).
   */
  private async findDispatchDeliveryPoints(
    customerId: string,
    options?: { tx?: unknown },
  ): Promise<CustomerDispatchDeliveryPoint[]> {
    return this.findActiveDeliveryPointProjections(customerId, options);
  }

  /**
   * Full contact load (all fields) — used by aggregate loading.
   */
  private async findAllContacts(
    customerId: string,
    options?: { includeDeleted?: boolean; tx?: unknown },
  ): Promise<CustomerAggregateContact[]> {
    const db = this.resolveTx(options);

    const conditions: any[] = [eq(customerContacts.customerId, customerId)];
    if (!options?.includeDeleted) {
      conditions.push(isNull(customerContacts.deletedAt));
    }

    return db
      .select()
      .from(customerContacts)
      .where(and(...conditions))
      .orderBy(asc(customerContacts.name));
  }

  /**
   * Full delivery point load (all fields) — used by aggregate loading.
   */
  private async findAllDeliveryPoints(
    customerId: string,
    options?: { includeDeleted?: boolean; tx?: unknown },
  ): Promise<CustomerAggregateDeliveryPoint[]> {
    const db = this.resolveTx(options);

    const conditions: any[] = [eq(deliveryPoints.customerId, customerId)];
    if (!options?.includeDeleted) {
      conditions.push(isNull(deliveryPoints.deletedAt));
    }

    return db
      .select()
      .from(deliveryPoints)
      .where(and(...conditions))
      .orderBy(desc(deliveryPoints.isDefault), asc(deliveryPoints.name));
  }

  /**
   * Full glass catalog load (all fields) — used by aggregate loading.
   */
  private async findAllGlassCatalog(
    customerId: string,
    options?: { includeDeleted?: boolean; tx?: unknown },
  ): Promise<CustomerAggregateGlassCatalog[]> {
    const db = this.resolveTx(options);

    const conditions: any[] = [eq(customerGlassCatalog.customerId, customerId)];
    if (!options?.includeDeleted) {
      conditions.push(isNull(customerGlassCatalog.deletedAt));
    }

    return db
      .select()
      .from(customerGlassCatalog)
      .where(and(...conditions))
      .orderBy(asc(customerGlassCatalog.productCode));
  }

  /**
   * Full instructions load (with conditions) — used by aggregate loading.
   */
  private async findAllInstructions(
    customerId: string,
    options?: { includeDeleted?: boolean; tx?: unknown },
  ): Promise<CustomerAggregateInstruction[]> {
    const db = this.resolveTx(options);

    const instrConditions: any[] = [eq(customerInstructions.customerId, customerId)];
    if (!options?.includeDeleted) {
      instrConditions.push(isNull(customerInstructions.deletedAt));
    }

    const instructions = await db
      .select()
      .from(customerInstructions)
      .where(and(...instrConditions))
      .orderBy(asc(customerInstructions.sortOrder), asc(customerInstructions.title));

    // Load conditions for each instruction in parallel
    if (instructions.length === 0) return [];

    const instructionIds = instructions.map((i: any) => i.id);
    const condConditions: any[] = [
      isNull(customerInstructionConditions.deletedAt),
    ];

    // Use inArray for batch loading instead of N+1
    const allConditions = await db
      .select()
      .from(customerInstructionConditions)
      .where(
        and(
          ...condConditions,
          inArray(customerInstructionConditions.instructionId, instructionIds),
        ),
      )
      .orderBy(
        asc(customerInstructionConditions.logicalGroup),
        asc(customerInstructionConditions.sortOrder),
      );

    // Group conditions by instructionId
    const conditionsByInstruction = new Map<string, CustomerAggregateCondition[]>();
    for (const cond of allConditions) {
      const key = (cond as any).instructionId;
      if (!conditionsByInstruction.has(key)) {
        conditionsByInstruction.set(key, []);
      }
      conditionsByInstruction.get(key)!.push(cond as CustomerAggregateCondition);
    }

    return instructions.map((i: any) => ({
      ...i,
      conditions: conditionsByInstruction.get(i.id) ?? [],
    }));
  }
}
