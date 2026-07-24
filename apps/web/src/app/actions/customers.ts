"use server";

import { revalidatePath } from "next/cache";
import {
  customers,
  customerContacts,
  deliveryPoints,
  customerGlassCatalog,
  customerInstructions,
  customerInstructionConditions,
  auditLogs,
} from "@repo/db";
import { eq, and, like, or, asc, desc, sql } from "drizzle-orm";
import {
  createCustomerSchemaV2,
  updateCustomerSchemaV2,
  createCustomerContactSchemaV2,
  updateCustomerContactSchemaV2,
  setPrimaryContactSchema,
  createDeliveryPointSchemaV2,
  updateDeliveryPointSchemaV2,
  setDefaultDeliveryPointSchema,
  createGlassCatalogSchema,
  updateGlassCatalogSchema,
  createCustomerInstructionSchema,
  updateCustomerInstructionSchema,
  createInstructionConditionSchema,
  updateInstructionConditionSchema,
  updateQualityProfileSchema,
  updateProductionPreferencesSchema,
  updateLabelSpecificationSchema,
  updatePackagingProfileSchema,
  updateCommunicationProfileSchema,
  blockCustomerSchema,
  releaseCustomerBlockSchema,
  softDeleteCustomerSchema,
  restoreCustomerSchema,
} from "@repo/types";
import { requireSession } from "@/lib/session";
import { withTenantSession } from "@/lib/dbSession";
import { ensurePermission } from "@/lib/authorization";
import { perfLog, perfStart, perfEnd } from "@/lib/perf";

// Simple ULID generator for char(26) ULID primary keys
function generateULID(): string {
  const chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const timestamp = Date.now().toString(36).toUpperCase().padStart(10, "0");
  let random = "";
  for (let i = 0; i < 16; i++) {
    random += chars[Math.floor(Math.random() * 32)];
  }
  return (timestamp + random).slice(0, 26);
}

/** Helper: insert an audit log entry with auto-generated ULID id. */
async function auditLog(
  tx: any,
  data: {
    tenantId: string;
    changedBy: string;
    tableName: string;
    recordId: string;
    operation: string;
    beforeValue?: Record<string, unknown> | null;
    afterValue?: Record<string, unknown> | null;
  }
) {
  await tx.insert(auditLogs).values({
    id: generateULID(),
    tenantId: data.tenantId,
    changedBy: data.changedBy,
    tableName: data.tableName,
    recordId: data.recordId,
    operation: data.operation,
    beforeValue: data.beforeValue ?? null,
    afterValue: data.afterValue ?? null,
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   LIST / QUERY ACTIONS
   ══════════════════════════════════════════════════════════════════════════════ */

export interface CustomerListFilters {
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  /** "active" | "passive" | "blocked" — filters by isActive + operationalBlock */
  status?: string;
}

export async function getCustomersAction(filters?: CustomerListFilters) {
  const tActionStart = perfStart("[getCustomersAction]");
  perfLog("[getCustomersAction]", "Started", Date.now());
  const session = await requireSession();

  const res = await withTenantSession(session, async (tx: any) => {
    const conditions: any[] = [
      eq(customers.tenantId, session.user.tenantId),
      sql`${customers.deletedAt} IS NULL`,
    ];

    // ── Search: ILIKE on customer_code, name, short_name, phone, tax_number ──
    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(customers.customerCode, searchPattern),
          like(customers.name, searchPattern),
          like(customers.shortName, searchPattern),
          like(customers.phone, searchPattern),
          like(customers.taxNumber, searchPattern),
        )
      );
    }

    // ── Status filter ──
    if (filters?.status === "active") {
      conditions.push(eq(customers.isActive, true));
      conditions.push(
        or(
          sql`${customers.operationalBlock} IS NULL`,
          sql`${customers.operationalBlock}->>'blockReleasedAt' IS NOT NULL`,
        )
      );
    } else if (filters?.status === "passive") {
      conditions.push(eq(customers.isActive, false));
    } else if (filters?.status === "blocked") {
      conditions.push(eq(customers.isActive, true));
      conditions.push(sql`${customers.operationalBlock}->>'blockReleasedAt' IS NULL`);
      conditions.push(sql`${customers.operationalBlock} IS NOT NULL`);
    }

    const where = and(...conditions);
    const orderByColumn = filters?.sortBy ?? "createdAt";
    const orderByDir = filters?.sortOrder === "asc" ? asc : desc;
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const tFirstSql = perfStart("[getCustomersAction] SQL");
    perfLog("[getCustomersAction]", "Executing select query", Date.now());
    const items = await tx
      .select()
      .from(customers)
      .where(where)
      .orderBy(orderByDir((customers as any)[orderByColumn] ?? customers.createdAt))
      .limit(pageSize)
      .offset(offset);
    perfEnd("[getCustomersAction] SQL", tFirstSql);

    const tLastSql = perfStart("[getCustomersAction] Count");
    perfLog("[getCustomersAction]", "Executing count query", Date.now());
    const totalResult = await tx
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(where);
    perfEnd("[getCustomersAction] Count", tLastSql);

    const total = Number(totalResult[0]?.count ?? 0);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  });

  perfEnd("[getCustomersAction]", tActionStart);
  return res;
}

export async function getCustomerByIdAction(id: string) {
  const tActionStart = perfStart("[getCustomerByIdAction]");
  perfLog("[getCustomerByIdAction]", `Fetching customer ${id}`, Date.now());
  const session = await requireSession();
  if (typeof id !== "string" || id.length !== 26) throw new Error("Invalid customer ID");

  const res = await withTenantSession(session, async (tx: any) => {
    const condition = session.user.role === "super_admin"
      ? eq(customers.id, id)
      : and(eq(customers.id, id), eq(customers.tenantId, session.user.tenantId));

    const customer = await tx.query.customers.findFirst({
      where: condition,
      with: {
        contacts: true,
        deliveryPoints: true,
        glassCatalog: true,
        instructions: {
          with: { conditions: true },
        },
      },
    });

    perfEnd("[getCustomerByIdAction]", tActionStart);
    return customer ?? null;
  });

  return res;
}

/* ══════════════════════════════════════════════════════════════════════════════
   CUSTOMER AGGREGATE ROOT CRUD
   ══════════════════════════════════════════════════════════════════════════════ */

export async function createCustomerAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");

  const parsed = createCustomerSchemaV2.safeParse(input);
  if (!parsed.success) throw new Error("Invalid customer payload");

  return await withTenantSession(session, async (tx: any) => {
    // Check duplicate customer code within tenant
    const existing = await tx.query.customers.findFirst({
      where: and(
        eq(customers.tenantId, session.user.tenantId),
        eq(customers.customerCode, parsed.data.customerCode),
      ),
    });
    if (existing) {
      throw new Error(`Customer code "${parsed.data.customerCode}" is already used by ${existing.name}`);
    }

    const inserted = await tx.insert(customers).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      factoryId: session.user.selectedFactoryId ?? null,
      customerCode: parsed.data.customerCode,
      name: parsed.data.name,
      shortName: parsed.data.shortName ?? null,
      taxNumber: parsed.data.taxNumber ?? null,
      taxOffice: parsed.data.taxOffice ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      district: parsed.data.district ?? null,
      country: parsed.data.country ?? null,
      notes: parsed.data.notes ?? null,
      isActive: parsed.data.isActive,
      version: 1,
      updatedAt: new Date(),
    }).returning({ id: customers.id });

    const createdCustomer = inserted[0];
    if (!createdCustomer) throw new Error("Customer creation failed");

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customers",
      recordId: createdCustomer.id,
      operation: "create",
      afterValue: { customerCode: parsed.data.customerCode, name: parsed.data.name },
    });

    revalidatePath("/customers");
    return createdCustomer;
  });
}

export async function updateCustomerAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");

  const parsed = updateCustomerSchemaV2.safeParse(input);
  if (!parsed.success) throw new Error("Invalid customer update payload");

  return await withTenantSession(session, async (tx: any) => {
    const condition = session.user.role === "super_admin"
      ? eq(customers.id, parsed.data.id)
      : and(eq(customers.id, parsed.data.id), eq(customers.tenantId, session.user.tenantId));

    // Optimistic locking: only update if version matches
    const updatedRows = await tx.update(customers)
      .set({
        customerCode: parsed.data.customerCode,
        name: parsed.data.name,
        shortName: parsed.data.shortName ?? null,
        taxNumber: parsed.data.taxNumber ?? null,
        taxOffice: parsed.data.taxOffice ?? null,
        phone: parsed.data.phone ?? null,
        email: parsed.data.email ?? null,
        address: parsed.data.address ?? null,
        city: parsed.data.city ?? null,
        district: parsed.data.district ?? null,
        country: parsed.data.country ?? null,
        notes: parsed.data.notes ?? null,
        isActive: parsed.data.isActive,
        updatedAt: new Date(),
        updatedBy: session.user.id,
        version: sql`version + 1`,
      })
      .where(and(condition, eq(customers.version, parsed.data.version)))
      .returning({ id: customers.id, customerCode: customers.customerCode, name: customers.name, version: customers.version });

    const updatedCustomer = updatedRows[0];
    if (!updatedCustomer) {
      // Check if row exists at all vs version conflict
      const exists = await tx.query.customers.findFirst({ where: condition, columns: { id: true } });
      if (!exists) throw new Error("Customer not found or access denied");
      throw new Error("Customer was modified by another user. Please reload and try again.");
    }

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customers",
      recordId: updatedCustomer.id,
      operation: "update",
      afterValue: { customerCode: updatedCustomer.customerCode, name: updatedCustomer.name },
    });

    revalidatePath("/customers");
    return updatedCustomer;
  });
}

export async function deactivateCustomerAction(id: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");

  if (typeof id !== "string" || id.length !== 26) throw new Error("Invalid customer ID");

  return await withTenantSession(session, async (tx: any) => {
    const condition = session.user.role === "super_admin"
      ? eq(customers.id, id)
      : and(eq(customers.id, id), eq(customers.tenantId, session.user.tenantId));

    const updatedRows = await tx.update(customers)
      .set({ isActive: false, updatedAt: new Date(), updatedBy: session.user.id })
      .where(condition)
      .returning({ id: customers.id, customerCode: customers.customerCode, name: customers.name });

    const updatedCustomer = updatedRows[0];
    if (!updatedCustomer) throw new Error("Customer not found or access denied");

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customers",
      recordId: updatedCustomer.id,
      operation: "deactivate",
      afterValue: { customerCode: updatedCustomer.customerCode, name: updatedCustomer.name },
    });

    revalidatePath("/customers");
    return updatedCustomer;
  });
}

export async function activateCustomerAction(id: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");

  if (typeof id !== "string" || id.length !== 26) throw new Error("Invalid customer ID");

  return await withTenantSession(session, async (tx: any) => {
    const condition = session.user.role === "super_admin"
      ? eq(customers.id, id)
      : and(eq(customers.id, id), eq(customers.tenantId, session.user.tenantId));

    const updatedRows = await tx.update(customers)
      .set({ isActive: true, updatedAt: new Date(), updatedBy: session.user.id })
      .where(condition)
      .returning({ id: customers.id, customerCode: customers.customerCode, name: customers.name });

    const updatedCustomer = updatedRows[0];
    if (!updatedCustomer) throw new Error("Customer not found or access denied");

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customers",
      recordId: updatedCustomer.id,
      operation: "activate",
      afterValue: { customerCode: updatedCustomer.customerCode, name: updatedCustomer.name },
    });

    revalidatePath("/customers");
    return updatedCustomer;
  });
}

export async function softDeleteCustomerAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");

  const parsed = softDeleteCustomerSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid customer ID");

  return await withTenantSession(session, async (tx: any) => {
    const condition = session.user.role === "super_admin"
      ? eq(customers.id, parsed.data.id)
      : and(eq(customers.id, parsed.data.id), eq(customers.tenantId, session.user.tenantId));

    // Check customer exists and is not already deleted
    const existing = await tx.query.customers.findFirst({
      where: condition,
      columns: { id: true, name: true, customerCode: true, deletedAt: true },
    });
    if (!existing) throw new Error("Customer not found or access denied");
    if (existing.deletedAt) throw new Error("Customer is already deleted");

    // Cascade soft-delete: customer → contacts, deliveryPoints, glassCatalog, instructions → conditions
    const now = new Date();

    // Soft-delete all child entities
    await tx.update(customerContacts).set({ deletedAt: now, deletedBy: session.user.id }).where(eq(customerContacts.customerId, parsed.data.id));
    await tx.update(deliveryPoints).set({ deletedAt: now, deletedBy: session.user.id }).where(eq(deliveryPoints.customerId, parsed.data.id));
    await tx.update(customerGlassCatalog).set({ deletedAt: now, deletedBy: session.user.id }).where(eq(customerGlassCatalog.customerId, parsed.data.id));

    // For instructions, we need to get their IDs to cascade to conditions
    const instrs = await tx.select({ id: customerInstructions.id }).from(customerInstructions).where(eq(customerInstructions.customerId, parsed.data.id));
    const instrIds = instrs.map((r: any) => r.id);
    if (instrIds.length > 0) {
      await tx.update(customerInstructionConditions).set({ deletedAt: now, deletedBy: session.user.id }).where(sql`${customerInstructionConditions.instructionId} = ANY(ARRAY[${instrIds.join(",")}]::char(26)[])`);      // eslint-disable-line
      await tx.update(customerInstructions).set({ deletedAt: now, deletedBy: session.user.id }).where(eq(customerInstructions.customerId, parsed.data.id));
    }

    // Soft-delete the customer itself
    const updatedRows = await tx.update(customers)
      .set({
        deletedAt: now,
        deletedBy: session.user.id,
        communicationProfile: null, // Invariant 4: clear communication routing
        isActive: false,
        updatedAt: now,
        updatedBy: session.user.id,
      })
      .where(condition)
      .returning({ id: customers.id, customerCode: customers.customerCode, name: customers.name });

    const deletedCustomer = updatedRows[0];
    if (!deletedCustomer) throw new Error("Customer delete failed");

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customers",
      recordId: deletedCustomer.id,
      operation: "soft_delete",
      afterValue: { customerCode: deletedCustomer.customerCode, name: deletedCustomer.name },
    });

    revalidatePath("/customers");
    return deletedCustomer;
  });
}

export async function restoreCustomerAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");

  const parsed = restoreCustomerSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid customer ID");

  return await withTenantSession(session, async (tx: any) => {
    const condition = session.user.role === "super_admin"
      ? eq(customers.id, parsed.data.id)
      : and(eq(customers.id, parsed.data.id), eq(customers.tenantId, session.user.tenantId));

    const existing = await tx.query.customers.findFirst({
      where: condition,
      columns: { id: true, name: true, customerCode: true, deletedAt: true },
    });
    if (!existing) throw new Error("Customer not found or access denied");
    if (!existing.deletedAt) throw new Error("Customer is not deleted");

    // Restore customer and all children
    const now = new Date();
    await tx.update(customerContacts).set({ deletedAt: null, deletedBy: null }).where(eq(customerContacts.customerId, parsed.data.id));
    await tx.update(deliveryPoints).set({ deletedAt: null, deletedBy: null }).where(eq(deliveryPoints.customerId, parsed.data.id));
    await tx.update(customerGlassCatalog).set({ deletedAt: null, deletedBy: null }).where(eq(customerGlassCatalog.customerId, parsed.data.id));

    const instrs = await tx.select({ id: customerInstructions.id }).from(customerInstructions).where(eq(customerInstructions.customerId, parsed.data.id));
    const instrIds = instrs.map((r: any) => r.id);
    if (instrIds.length > 0) {
      await tx.update(customerInstructionConditions).set({ deletedAt: null, deletedBy: null }).where(sql`${customerInstructionConditions.instructionId} = ANY(ARRAY[${instrIds.join(",")}]::char(26)[])`);
      await tx.update(customerInstructions).set({ deletedAt: null, deletedBy: null }).where(eq(customerInstructions.customerId, parsed.data.id));
    }

    const updatedRows = await tx.update(customers)
      .set({
        deletedAt: null,
        deletedBy: null,
        updatedAt: now,
        updatedBy: session.user.id,
      })
      .where(condition)
      .returning({ id: customers.id, customerCode: customers.customerCode, name: customers.name });

    const restoredCustomer = updatedRows[0];
    if (!restoredCustomer) throw new Error("Customer restore failed");

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customers",
      recordId: restoredCustomer.id,
      operation: "restore",
      afterValue: { customerCode: restoredCustomer.customerCode, name: restoredCustomer.name },
    });

    revalidatePath("/customers");
    return restoredCustomer;
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   VALUE OBJECT UPDATE ACTIONS (Task 2.4)
   Each action: validate → authorize → optimistic locking → audit → transaction → invalidate cache
   ══════════════════════════════════════════════════════════════════════════════ */

async function updateCustomerJsonbAction(
  session: any,
  tx: any,
  customerId: string,
  version: number,
  column: any,
  value: any,
  fieldName: string,
  operation: string,
) {
  const condition = session.user.role === "super_admin"
    ? eq(customers.id, customerId)
    : and(eq(customers.id, customerId), eq(customers.tenantId, session.user.tenantId));

  const updatedRows = await tx.update(customers)
    .set({
      [column.name]: value,
      updatedAt: new Date(),
      updatedBy: session.user.id,
      version: sql`version + 1`,
    })
    .where(and(condition, eq(customers.version, version)))
    .returning({ id: customers.id, version: customers.version });

  const updated = updatedRows[0];
  if (!updated) {
    const exists = await tx.query.customers.findFirst({ where: condition, columns: { id: true } });
    if (!exists) throw new Error("Customer not found or access denied");
    throw new Error("Customer was modified by another user. Please reload and try again.");
  }

  await auditLog(tx, {
    tenantId: session.user.tenantId,
    changedBy: session.user.id,
    tableName: "customers",
    recordId: customerId,
    operation,
    afterValue: { [`${fieldName}_updated`]: true, version: updated.version },
  });

  revalidatePath(`/customers/${customerId}`);
  return updated;
}

export async function updateCustomerQualityProfileAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");
  const parsed = updateQualityProfileSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid quality profile payload");
  return await withTenantSession(session, async (tx: any) =>
    updateCustomerJsonbAction(session, tx, parsed.data.customerId, parsed.data.version, customers.qualityProfile, parsed.data.qualityProfile, "qualityProfile", "quality_profile_update")
  );
}

export async function updateCustomerProductionPreferencesAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");
  const parsed = updateProductionPreferencesSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid production preferences payload");
  return await withTenantSession(session, async (tx: any) =>
    updateCustomerJsonbAction(session, tx, parsed.data.customerId, parsed.data.version, customers.productionPreferences, parsed.data.productionPreferences, "productionPreferences", "production_preferences_update")
  );
}

export async function updateCustomerLabelSpecificationAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");
  const parsed = updateLabelSpecificationSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid label specification payload");
  return await withTenantSession(session, async (tx: any) =>
    updateCustomerJsonbAction(session, tx, parsed.data.customerId, parsed.data.version, customers.labelSpec, parsed.data.labelSpec, "labelSpec", "label_spec_update")
  );
}

export async function updateCustomerPackagingProfileAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");
  const parsed = updatePackagingProfileSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid packaging profile payload");
  return await withTenantSession(session, async (tx: any) =>
    updateCustomerJsonbAction(session, tx, parsed.data.customerId, parsed.data.version, customers.packagingProfile, parsed.data.packagingProfile, "packagingProfile", "packaging_profile_update")
  );
}

export async function updateCustomerCommunicationProfileAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");
  const parsed = updateCommunicationProfileSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid communication profile payload");

  return await withTenantSession(session, async (tx: any) => {
    // Advisory rule: check that at least one contact exists if channels reference contact_id
    const profile = parsed.data.communicationProfile;
    const channels = profile.channels ?? {};
    const channelValues = Object.values(channels);
    const contactRefs = channelValues.filter((ch: any) => ch.contactId).map((ch: any) => ch.contactId);

    if (contactRefs.length > 0) {
      const contact = await tx.query.customerContacts.findFirst({
        where: and(
          eq(customerContacts.customerId, parsed.data.customerId),
          eq(customerContacts.isActive, true),
          sql`${customerContacts.deletedAt} IS NULL`,
        ),
        columns: { id: true },
      });
      if (!contact) {
        throw new Error("Communication profile requires at least one active contact. Please add a contact first.");
      }
    }

    return updateCustomerJsonbAction(session, tx, parsed.data.customerId, parsed.data.version, customers.communicationProfile, profile, "communicationProfile", "communication_profile_update");
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   CONTACT CRUD (Task 2.5)
   ══════════════════════════════════════════════════════════════════════════════ */

export async function createCustomerContactAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");

  const parsed = createCustomerContactSchemaV2.safeParse(input);
  if (!parsed.success) throw new Error("Invalid customer contact payload");

  return await withTenantSession(session, async (tx: any) => {
    const customer = await tx.query.customers.findFirst({
      where: and(eq(customers.id, parsed.data.customerId), eq(customers.tenantId, session.user.tenantId)),
      columns: { id: true, deletedAt: true },
    });
    if (!customer) throw new Error("Customer not found or access denied");
    if (customer.deletedAt) throw new Error("Cannot add contact to a deleted customer");

    // If setting as primary, unset any existing primary for this customer
    if (parsed.data.isPrimary) {
      await tx.update(customerContacts)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(and(eq(customerContacts.customerId, parsed.data.customerId), eq(customerContacts.isPrimary, true)));
    }

    const inserted = await tx.insert(customerContacts).values({
      customerId: parsed.data.customerId,
      name: parsed.data.name,
      title: parsed.data.title ?? null,
      role: parsed.data.role ?? null,
      phone: parsed.data.phone ?? null,
      whatsapp: parsed.data.whatsapp ?? null,
      email: parsed.data.email ?? null,
      isPrimary: parsed.data.isPrimary,
      isActive: parsed.data.isActive,
      createdBy: session.user.id,
    }).returning({ id: customerContacts.id });

    const createdContact = inserted[0];
    if (!createdContact) throw new Error("Contact creation failed");

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customer_contacts",
      recordId: createdContact.id,
      operation: "create",
      afterValue: { name: parsed.data.name },
    });

    revalidatePath(`/customers/${parsed.data.customerId}`);
    return createdContact;
  });
}

export async function updateCustomerContactAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");

  const parsed = updateCustomerContactSchemaV2.safeParse(input);
  if (!parsed.success) throw new Error("Invalid customer contact update payload");

  return await withTenantSession(session, async (tx: any) => {
    const contact = await tx.query.customerContacts.findFirst({
      where: eq(customerContacts.id, parsed.data.id),
    });
    if (!contact) throw new Error("Contact not found");

    const customer = await tx.query.customers.findFirst({
      where: and(eq(customers.id, contact.customerId), eq(customers.tenantId, session.user.tenantId)),
      columns: { id: true },
    });
    if (!customer) throw new Error("Customer not found or access denied");

    // If setting as primary, unset any existing primary (excluding this contact)
    if (parsed.data.isPrimary) {
      await tx.update(customerContacts)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(and(
          eq(customerContacts.customerId, contact.customerId),
          eq(customerContacts.isPrimary, true),
          sql`${customerContacts.id} != ${parsed.data.id}`,
        ));
    }

    const updatedRows = await tx.update(customerContacts)
      .set({
        name: parsed.data.name,
        title: parsed.data.title ?? null,
        role: parsed.data.role ?? null,
        phone: parsed.data.phone ?? null,
        whatsapp: parsed.data.whatsapp ?? null,
        email: parsed.data.email ?? null,
        isPrimary: parsed.data.isPrimary,
        isActive: parsed.data.isActive,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(eq(customerContacts.id, parsed.data.id))
      .returning({ id: customerContacts.id, name: customerContacts.name });

    const updatedContact = updatedRows[0];
    if (!updatedContact) throw new Error("Contact update failed");

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customer_contacts",
      recordId: updatedContact.id,
      operation: "update",
      afterValue: { name: updatedContact.name },
    });

    revalidatePath(`/customers/${contact.customerId}`);
    return updatedContact;
  });
}

export async function deleteCustomerContactAction(id: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");
  if (typeof id !== "string" || id.length !== 26) throw new Error("Invalid contact ID");

  return await withTenantSession(session, async (tx: any) => {
    const contact = await tx.query.customerContacts.findFirst({
      where: eq(customerContacts.id, id),
    });
    if (!contact) throw new Error("Contact not found");
    if (contact.deletedAt) throw new Error("Contact is already deleted");

    const customer = await tx.query.customers.findFirst({
      where: and(eq(customers.id, contact.customerId), eq(customers.tenantId, session.user.tenantId)),
      columns: { id: true },
    });
    if (!customer) throw new Error("Customer not found or access denied");

    const now = new Date();
    await tx.update(customerContacts)
      .set({ deletedAt: now, deletedBy: session.user.id, updatedAt: now })
      .where(eq(customerContacts.id, id));

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customer_contacts",
      recordId: id,
      operation: "soft_delete",
      afterValue: { name: contact.name },
    });

    revalidatePath(`/customers/${contact.customerId}`);
    return { success: true };
  });
}

export async function setPrimaryContactAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");

  const parsed = setPrimaryContactSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid input");

  return await withTenantSession(session, async (tx: any) => {
    const customer = await tx.query.customers.findFirst({
      where: and(eq(customers.id, parsed.data.customerId), eq(customers.tenantId, session.user.tenantId)),
      columns: { id: true, deletedAt: true },
    });
    if (!customer) throw new Error("Customer not found or access denied");
    if (customer.deletedAt) throw new Error("Cannot modify contacts on a deleted customer");

    const contact = await tx.query.customerContacts.findFirst({
      where: and(eq(customerContacts.id, parsed.data.id), eq(customerContacts.customerId, parsed.data.customerId)),
      columns: { id: true, deletedAt: true },
    });
    if (!contact || contact.deletedAt) throw new Error("Contact not found or is deleted");

    // Unset all primaries for this customer, then set the chosen one
    await tx.update(customerContacts)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(eq(customerContacts.customerId, parsed.data.customerId));

    await tx.update(customerContacts)
      .set({ isPrimary: true, updatedAt: new Date(), updatedBy: session.user.id })
      .where(eq(customerContacts.id, parsed.data.id));

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customer_contacts",
      recordId: parsed.data.id,
      operation: "set_primary",
      afterValue: { contactId: parsed.data.id },
    });

    revalidatePath(`/customers/${parsed.data.customerId}`);
    return { success: true };
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   DELIVERY POINT CRUD (Task 2.5)
   ══════════════════════════════════════════════════════════════════════════════ */

export async function createDeliveryPointAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");

  const parsed = createDeliveryPointSchemaV2.safeParse(input);
  if (!parsed.success) throw new Error("Invalid delivery point payload");

  return await withTenantSession(session, async (tx: any) => {
    const customer = await tx.query.customers.findFirst({
      where: and(eq(customers.id, parsed.data.customerId), eq(customers.tenantId, session.user.tenantId)),
      columns: { id: true, deletedAt: true },
    });
    if (!customer) throw new Error("Customer not found or access denied");
    if (customer.deletedAt) throw new Error("Cannot add delivery point to a deleted customer");

    // If setting as default, unset any existing default for this customer
    if (parsed.data.isDefault) {
      await tx.update(deliveryPoints)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(and(eq(deliveryPoints.customerId, parsed.data.customerId), eq(deliveryPoints.isDefault, true)));
    }

    const inserted = await tx.insert(deliveryPoints).values({
      customerId: parsed.data.customerId,
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      district: parsed.data.district ?? null,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
      phone: parsed.data.phone ?? null,
      note: parsed.data.note ?? null,
      isDefault: parsed.data.isDefault,
      isActive: parsed.data.isActive,
      createdBy: session.user.id,
    }).returning({ id: deliveryPoints.id });

    const createdPoint = inserted[0];
    if (!createdPoint) throw new Error("Delivery point creation failed");

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "delivery_points",
      recordId: createdPoint.id,
      operation: "create",
      afterValue: { name: parsed.data.name },
    });

    revalidatePath(`/customers/${parsed.data.customerId}`);
    return createdPoint;
  });
}

export async function updateDeliveryPointAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");

  const parsed = updateDeliveryPointSchemaV2.safeParse(input);
  if (!parsed.success) throw new Error("Invalid delivery point update payload");

  return await withTenantSession(session, async (tx: any) => {
    const point = await tx.query.deliveryPoints.findFirst({
      where: eq(deliveryPoints.id, parsed.data.id),
    });
    if (!point) throw new Error("Delivery point not found");

    const customer = await tx.query.customers.findFirst({
      where: and(eq(customers.id, point.customerId), eq(customers.tenantId, session.user.tenantId)),
      columns: { id: true },
    });
    if (!customer) throw new Error("Customer not found or access denied");

    // If setting as default, unset any existing default (excluding this point)
    if (parsed.data.isDefault) {
      await tx.update(deliveryPoints)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(and(
          eq(deliveryPoints.customerId, point.customerId),
          eq(deliveryPoints.isDefault, true),
          sql`${deliveryPoints.id} != ${parsed.data.id}`,
        ));
    }

    const updatedRows = await tx.update(deliveryPoints)
      .set({
        name: parsed.data.name,
        address: parsed.data.address ?? null,
        city: parsed.data.city ?? null,
        district: parsed.data.district ?? null,
        latitude: parsed.data.latitude ?? null,
        longitude: parsed.data.longitude ?? null,
        phone: parsed.data.phone ?? null,
        note: parsed.data.note ?? null,
        isDefault: parsed.data.isDefault,
        isActive: parsed.data.isActive,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(eq(deliveryPoints.id, parsed.data.id))
      .returning({ id: deliveryPoints.id, name: deliveryPoints.name });

    const updatedPoint = updatedRows[0];
    if (!updatedPoint) throw new Error("Delivery point update failed");

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "delivery_points",
      recordId: updatedPoint.id,
      operation: "update",
      afterValue: { name: updatedPoint.name },
    });

    revalidatePath(`/customers/${point.customerId}`);
    return updatedPoint;
  });
}

export async function deleteDeliveryPointAction(id: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");
  if (typeof id !== "string" || id.length !== 26) throw new Error("Invalid delivery point ID");

  return await withTenantSession(session, async (tx: any) => {
    const point = await tx.query.deliveryPoints.findFirst({
      where: eq(deliveryPoints.id, id),
    });
    if (!point) throw new Error("Delivery point not found");
    if (point.deletedAt) throw new Error("Delivery point is already deleted");

    const customer = await tx.query.customers.findFirst({
      where: and(eq(customers.id, point.customerId), eq(customers.tenantId, session.user.tenantId)),
      columns: { id: true },
    });
    if (!customer) throw new Error("Customer not found or access denied");

    const now = new Date();
    await tx.update(deliveryPoints)
      .set({ deletedAt: now, deletedBy: session.user.id, updatedAt: now })
      .where(eq(deliveryPoints.id, id));

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "delivery_points",
      recordId: id,
      operation: "soft_delete",
      afterValue: { name: point.name },
    });

    revalidatePath(`/customers/${point.customerId}`);
    return { success: true };
  });
}

export async function setDefaultDeliveryPointAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");

  const parsed = setDefaultDeliveryPointSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid input");

  return await withTenantSession(session, async (tx: any) => {
    const customer = await tx.query.customers.findFirst({
      where: and(eq(customers.id, parsed.data.customerId), eq(customers.tenantId, session.user.tenantId)),
      columns: { id: true, deletedAt: true },
    });
    if (!customer) throw new Error("Customer not found or access denied");
    if (customer.deletedAt) throw new Error("Cannot modify delivery points on a deleted customer");

    const point = await tx.query.deliveryPoints.findFirst({
      where: and(eq(deliveryPoints.id, parsed.data.id), eq(deliveryPoints.customerId, parsed.data.customerId)),
      columns: { id: true, deletedAt: true },
    });
    if (!point || point.deletedAt) throw new Error("Delivery point not found or is deleted");

    // Unset all defaults for this customer, then set the chosen one
    await tx.update(deliveryPoints)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(deliveryPoints.customerId, parsed.data.customerId));

    await tx.update(deliveryPoints)
      .set({ isDefault: true, updatedAt: new Date(), updatedBy: session.user.id })
      .where(eq(deliveryPoints.id, parsed.data.id));

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "delivery_points",
      recordId: parsed.data.id,
      operation: "set_default",
      afterValue: { pointId: parsed.data.id },
    });

    revalidatePath(`/customers/${parsed.data.customerId}`);
    return { success: true };
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   GLASS CATALOG CRUD (Task 2.5)
   ══════════════════════════════════════════════════════════════════════════════ */

export async function createGlassCatalogAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");

  const parsed = createGlassCatalogSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid glass catalog payload");

  return await withTenantSession(session, async (tx: any) => {
    const customer = await tx.query.customers.findFirst({
      where: and(eq(customers.id, parsed.data.customerId), eq(customers.tenantId, session.user.tenantId)),
      columns: { id: true, deletedAt: true },
    });
    if (!customer) throw new Error("Customer not found or access denied");
    if (customer.deletedAt) throw new Error("Cannot add catalog entry to a deleted customer");

    const inserted = await tx.insert(customerGlassCatalog).values({
      customerId: parsed.data.customerId,
      productCode: parsed.data.productCode,
      glassType: parsed.data.glassType,
      thicknessMm: parsed.data.thicknessMm ? String(parsed.data.thicknessMm) : null,
      defaultWidthMm: parsed.data.defaultWidthMm ? String(parsed.data.defaultWidthMm) : null,
      defaultHeightMm: parsed.data.defaultHeightMm ? String(parsed.data.defaultHeightMm) : null,
      defaultPieces: parsed.data.defaultPieces ? String(parsed.data.defaultPieces) : null,
      isActive: parsed.data.isActive,
      notes: parsed.data.notes ?? null,
      createdBy: session.user.id,
    }).returning({ id: customerGlassCatalog.id });

    const created = inserted[0];
    if (!created) throw new Error("Glass catalog entry creation failed");

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customer_glass_catalog",
      recordId: created.id,
      operation: "create",
      afterValue: { productCode: parsed.data.productCode, glassType: parsed.data.glassType },
    });

    revalidatePath(`/customers/${parsed.data.customerId}`);
    return created;
  });
}

export async function updateGlassCatalogAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");

  const parsed = updateGlassCatalogSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid glass catalog update payload");

  return await withTenantSession(session, async (tx: any) => {
    const entry = await tx.query.customerGlassCatalog.findFirst({ where: eq(customerGlassCatalog.id, parsed.data.id) });
    if (!entry) throw new Error("Glass catalog entry not found");

    const customer = await tx.query.customers.findFirst({
      where: and(eq(customers.id, entry.customerId), eq(customers.tenantId, session.user.tenantId)),
      columns: { id: true },
    });
    if (!customer) throw new Error("Customer not found or access denied");
    if (entry.deletedAt) throw new Error("Cannot update a deleted catalog entry");

    const updatedRows = await tx.update(customerGlassCatalog)
      .set({
        productCode: parsed.data.productCode,
        glassType: parsed.data.glassType,
        thicknessMm: parsed.data.thicknessMm ? String(parsed.data.thicknessMm) : null,
        defaultWidthMm: parsed.data.defaultWidthMm ? String(parsed.data.defaultWidthMm) : null,
        defaultHeightMm: parsed.data.defaultHeightMm ? String(parsed.data.defaultHeightMm) : null,
        defaultPieces: parsed.data.defaultPieces ? String(parsed.data.defaultPieces) : null,
        isActive: parsed.data.isActive,
        notes: parsed.data.notes ?? null,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(eq(customerGlassCatalog.id, parsed.data.id))
      .returning({ id: customerGlassCatalog.id, productCode: customerGlassCatalog.productCode });

    const updated = updatedRows[0];
    if (!updated) throw new Error("Glass catalog update failed");

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customer_glass_catalog",
      recordId: updated.id,
      operation: "update",
      afterValue: { productCode: updated.productCode },
    });

    revalidatePath(`/customers/${entry.customerId}`);
    return updated;
  });
}

export async function deleteGlassCatalogAction(id: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");
  if (typeof id !== "string" || id.length !== 26) throw new Error("Invalid catalog entry ID");

  return await withTenantSession(session, async (tx: any) => {
    const entry = await tx.query.customerGlassCatalog.findFirst({ where: eq(customerGlassCatalog.id, id) });
    if (!entry) throw new Error("Glass catalog entry not found");
    if (entry.deletedAt) throw new Error("Entry is already deleted");

    const customer = await tx.query.customers.findFirst({
      where: and(eq(customers.id, entry.customerId), eq(customers.tenantId, session.user.tenantId)),
      columns: { id: true },
    });
    if (!customer) throw new Error("Customer not found or access denied");

    const now = new Date();
    await tx.update(customerGlassCatalog)
      .set({ deletedAt: now, deletedBy: session.user.id, updatedAt: now })
      .where(eq(customerGlassCatalog.id, id));

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customer_glass_catalog",
      recordId: id,
      operation: "soft_delete",
      afterValue: { productCode: entry.productCode },
    });

    revalidatePath(`/customers/${entry.customerId}`);
    return { success: true };
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   INSTRUCTION CRUD (Task 2.5)
   ══════════════════════════════════════════════════════════════════════════════ */

export async function createCustomerInstructionAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");

  const parsed = createCustomerInstructionSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid instruction payload");

  return await withTenantSession(session, async (tx: any) => {
    const customer = await tx.query.customers.findFirst({
      where: and(eq(customers.id, parsed.data.customerId), eq(customers.tenantId, session.user.tenantId)),
      columns: { id: true, deletedAt: true },
    });
    if (!customer) throw new Error("Customer not found or access denied");
    if (customer.deletedAt) throw new Error("Cannot add instruction to a deleted customer");

    const inserted = await tx.insert(customerInstructions).values({
      customerId: parsed.data.customerId,
      title: parsed.data.title,
      instruction: parsed.data.instruction,
      isStanding: parsed.data.isStanding,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
      createdBy: session.user.id,
    }).returning({ id: customerInstructions.id });

    const created = inserted[0];
    if (!created) throw new Error("Instruction creation failed");

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customer_instructions",
      recordId: created.id,
      operation: "create",
      afterValue: { title: parsed.data.title },
    });

    revalidatePath(`/customers/${parsed.data.customerId}`);
    return created;
  });
}

export async function updateCustomerInstructionAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");

  const parsed = updateCustomerInstructionSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid instruction update payload");

  return await withTenantSession(session, async (tx: any) => {
    const instr = await tx.query.customerInstructions.findFirst({ where: eq(customerInstructions.id, parsed.data.id) });
    if (!instr) throw new Error("Instruction not found");
    if (instr.deletedAt) throw new Error("Cannot update a deleted instruction");

    const customer = await tx.query.customers.findFirst({
      where: and(eq(customers.id, instr.customerId), eq(customers.tenantId, session.user.tenantId)),
      columns: { id: true },
    });
    if (!customer) throw new Error("Customer not found or access denied");

    const updatedRows = await tx.update(customerInstructions)
      .set({
        title: parsed.data.title,
        instruction: parsed.data.instruction,
        isStanding: parsed.data.isStanding,
        sortOrder: parsed.data.sortOrder,
        isActive: parsed.data.isActive,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(eq(customerInstructions.id, parsed.data.id))
      .returning({ id: customerInstructions.id, title: customerInstructions.title });

    const updated = updatedRows[0];
    if (!updated) throw new Error("Instruction update failed");

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customer_instructions",
      recordId: updated.id,
      operation: "update",
      afterValue: { title: updated.title },
    });

    revalidatePath(`/customers/${instr.customerId}`);
    return updated;
  });
}

export async function deleteCustomerInstructionAction(id: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");
  if (typeof id !== "string" || id.length !== 26) throw new Error("Invalid instruction ID");

  return await withTenantSession(session, async (tx: any) => {
    const instr = await tx.query.customerInstructions.findFirst({ where: eq(customerInstructions.id, id) });
    if (!instr) throw new Error("Instruction not found");
    if (instr.deletedAt) throw new Error("Instruction is already deleted");

    const customer = await tx.query.customers.findFirst({
      where: and(eq(customers.id, instr.customerId), eq(customers.tenantId, session.user.tenantId)),
      columns: { id: true },
    });
    if (!customer) throw new Error("Customer not found or access denied");

    const now = new Date();
    // Cascade soft-delete to conditions
    await tx.update(customerInstructionConditions)
      .set({ deletedAt: now, deletedBy: session.user.id })
      .where(eq(customerInstructionConditions.instructionId, id));

    await tx.update(customerInstructions)
      .set({ deletedAt: now, deletedBy: session.user.id, updatedAt: now })
      .where(eq(customerInstructions.id, id));

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customer_instructions",
      recordId: id,
      operation: "soft_delete",
      afterValue: { title: instr.title },
    });

    revalidatePath(`/customers/${instr.customerId}`);
    return { success: true };
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   INSTRUCTION CONDITION CRUD (Task 2.5)
   ══════════════════════════════════════════════════════════════════════════════ */

export async function createInstructionConditionAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");

  const parsed = createInstructionConditionSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid condition payload");

  return await withTenantSession(session, async (tx: any) => {
    const instr = await tx.query.customerInstructions.findFirst({ where: eq(customerInstructions.id, parsed.data.instructionId) });
    if (!instr) throw new Error("Instruction not found");
    if (instr.deletedAt) throw new Error("Cannot add condition to a deleted instruction");

    const inserted = await tx.insert(customerInstructionConditions).values({
      instructionId: parsed.data.instructionId,
      field: parsed.data.field,
      operator: parsed.data.operator,
      value: parsed.data.value,
      valueType: parsed.data.valueType,
      logicalGroup: parsed.data.logicalGroup,
      sortOrder: parsed.data.sortOrder,
      createdBy: session.user.id,
    }).returning({ id: customerInstructionConditions.id });

    const created = inserted[0];
    if (!created) throw new Error("Condition creation failed");

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customer_instruction_conditions",
      recordId: created.id,
      operation: "create",
      afterValue: { field: parsed.data.field, operator: parsed.data.operator },
    });

    revalidatePath("/customers");
    return created;
  });
}

export async function updateInstructionConditionAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");

  const parsed = updateInstructionConditionSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid condition update payload");

  return await withTenantSession(session, async (tx: any) => {
    const cond = await tx.query.customerInstructionConditions.findFirst({ where: eq(customerInstructionConditions.id, parsed.data.id) });
    if (!cond) throw new Error("Condition not found");
    if (cond.deletedAt) throw new Error("Cannot update a deleted condition");

    const updatedRows = await tx.update(customerInstructionConditions)
      .set({
        field: parsed.data.field,
        operator: parsed.data.operator,
        value: parsed.data.value,
        valueType: parsed.data.valueType,
        logicalGroup: parsed.data.logicalGroup,
        sortOrder: parsed.data.sortOrder,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(eq(customerInstructionConditions.id, parsed.data.id))
      .returning({ id: customerInstructionConditions.id });

    const updated = updatedRows[0];
    if (!updated) throw new Error("Condition update failed");

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customer_instruction_conditions",
      recordId: updated.id,
      operation: "update",
      afterValue: { field: parsed.data.field },
    });

    revalidatePath("/customers");
    return updated;
  });
}

export async function deleteInstructionConditionAction(id: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");
  if (typeof id !== "string" || id.length !== 26) throw new Error("Invalid condition ID");

  return await withTenantSession(session, async (tx: any) => {
    const cond = await tx.query.customerInstructionConditions.findFirst({ where: eq(customerInstructionConditions.id, id) });
    if (!cond) throw new Error("Condition not found");
    if (cond.deletedAt) throw new Error("Condition is already deleted");

    const now = new Date();
    await tx.update(customerInstructionConditions)
      .set({ deletedAt: now, deletedBy: session.user.id, updatedAt: now })
      .where(eq(customerInstructionConditions.id, id));

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customer_instruction_conditions",
      recordId: id,
      operation: "soft_delete",
      afterValue: { field: cond.field },
    });

    revalidatePath("/customers");
    return { success: true };
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   OPERATIONAL BLOCK ACTIONS (Task 2.6)
   ══════════════════════════════════════════════════════════════════════════════ */

export async function blockCustomerAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");

  const parsed = blockCustomerSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid block payload");

  return await withTenantSession(session, async (tx: any) => {
    const customer = await tx.query.customers.findFirst({
      where: and(eq(customers.id, parsed.data.customerId), eq(customers.tenantId, session.user.tenantId)),
      columns: { id: true, customerCode: true, name: true, deletedAt: true, operationalBlock: true, version: true },
    });
    if (!customer) throw new Error("Customer not found or access denied");
    if (customer.deletedAt) throw new Error("Cannot block a deleted customer");

    // Invariant: cannot block if already blocked
    if (customer.operationalBlock && !(customer.operationalBlock as any).blockReleasedAt) {
      throw new Error("Customer is already blocked. Release existing block first.");
    }

    const now = new Date();
    const blockData = {
      blockedAt: now.toISOString(),
      blockedBy: session.user.id,
      blockReason: parsed.data.blockReason,
      blockCategory: parsed.data.blockCategory,
      blockReleasedAt: null,
      blockReleasedBy: null,
    };

    await tx.update(customers)
      .set({
        operationalBlock: blockData,
        updatedAt: now,
        updatedBy: session.user.id,
        version: sql`version + 1`,
      })
      .where(and(eq(customers.id, parsed.data.customerId), eq(customers.version, customer.version)));

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customers",
      recordId: parsed.data.customerId,
      operation: "block",
      afterValue: { blockReason: parsed.data.blockReason, blockCategory: parsed.data.blockCategory },
    });

    revalidatePath(`/customers/${parsed.data.customerId}`);
    return { success: true };
  });
}

export async function releaseCustomerBlockAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("customers:write");

  const parsed = releaseCustomerBlockSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid release payload");

  return await withTenantSession(session, async (tx: any) => {
    const customer = await tx.query.customers.findFirst({
      where: and(eq(customers.id, parsed.data.customerId), eq(customers.tenantId, session.user.tenantId)),
      columns: { id: true, customerCode: true, name: true, deletedAt: true, operationalBlock: true, version: true },
    });
    if (!customer) throw new Error("Customer not found or access denied");
    if (customer.deletedAt) throw new Error("Cannot modify a deleted customer");

    // Invariant: cannot release if not blocked
    if (!customer.operationalBlock || (customer.operationalBlock as any).blockReleasedAt) {
      throw new Error("Customer is not currently blocked. Nothing to release.");
    }

    const existingBlock = customer.operationalBlock as any;
    const now = new Date();
    const updatedBlock = {
      ...existingBlock,
      blockReleasedAt: now.toISOString(),
      blockReleasedBy: session.user.id,
    };

    await tx.update(customers)
      .set({
        operationalBlock: updatedBlock,
        updatedAt: now,
        updatedBy: session.user.id,
        version: sql`version + 1`,
      })
      .where(and(eq(customers.id, parsed.data.customerId), eq(customers.version, customer.version)));

    await auditLog(tx, {
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customers",
      recordId: parsed.data.customerId,
      operation: "release_block",
      afterValue: { blockedDuration: `${existingBlock.blockedAt} → ${now.toISOString()}` },
    });

    revalidatePath(`/customers/${parsed.data.customerId}`);
    return { success: true };
  });
}

