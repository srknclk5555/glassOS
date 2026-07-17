"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db, tenants, factories, settings, users, roles, auditLogs, customers, customerContacts, deliveryPoints } from "@repo/db";
import { eq, and } from "drizzle-orm";
import {
  createTenantSchema,
  createFactorySchema,
  createUserSchema,
  updateFactorySchema,
  updateFactorySettingsSchema,
  createCustomerSchema,
  updateCustomerSchema,
  createCustomerContactSchema,
  updateCustomerContactSchema,
  createDeliveryPointSchema,
  updateDeliveryPointSchema,
} from "@repo/types";
import { requireSession } from "@/lib/session";
import { withTenantSession } from "@/lib/dbSession";

export async function createTenantAction(input: unknown) {
  const session = await requireSession();
  if (session.user.role !== "super_admin") {
    throw new Error("Forbidden");
  }

  const parsed = createTenantSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid tenant payload");
  }

  return await withTenantSession(session, async (tx: any) => {
    const inserted = await tx.insert(tenants).values({
      name: parsed.data.name,
      subscriptionPlan: parsed.data.subscriptionPlan,
    }).returning({ id: tenants.id });

    const createdTenant = inserted[0];
    if (!createdTenant) {
      throw new Error("Tenant creation failed");
    }

    await tx.insert(auditLogs).values({
      tenantId: createdTenant.id,
      changedBy: session.user.id,
      tableName: "tenants",
      recordId: createdTenant.id,
      operation: "create",
      afterValue: { name: parsed.data.name },
    });

    revalidatePath("/tenants");
    return createdTenant;
  });
}

export async function createFactoryAction(input: unknown) {
  const session = await requireSession();
  if (session.user.role !== "super_admin" && session.user.role !== "tenant_admin") {
    throw new Error("Forbidden");
  }

  const parsed = createFactorySchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid factory payload");
  }

  const tenantId = session.user.role === "super_admin" ? parsed.data.tenantId : session.user.tenantId;
  if (session.user.role !== "super_admin" && parsed.data.tenantId !== session.user.tenantId) {
    throw new Error("Cannot create factory outside your tenant");
  }

  return await withTenantSession(session, async (tx: any) => {
    const inserted = await tx.insert(factories).values({
      tenantId,
      name: parsed.data.name,
      address: parsed.data.address ?? null,
    }).returning({ id: factories.id });

    const createdFactory = inserted[0];
    if (!createdFactory) {
      throw new Error("Factory creation failed");
    }

    await tx.insert(auditLogs).values({
      tenantId,
      changedBy: session.user.id,
      tableName: "factories",
      recordId: createdFactory.id,
      operation: "create",
      afterValue: { name: parsed.data.name },
    });

    revalidatePath("/factories");
    return createdFactory;
  });
}

export async function updateFactoryAction(input: unknown) {
  const session = await requireSession();
  if (session.user.role !== "super_admin" && session.user.role !== "tenant_admin") {
    throw new Error("Forbidden");
  }

  const parsed = updateFactorySchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid update payload");
  }

  return await withTenantSession(session, async (tx: any) => {
    const condition =
      session.user.role === "super_admin"
        ? eq(factories.id, parsed.data.id)
        : and(eq(factories.id, parsed.data.id), eq(factories.tenantId, session.user.tenantId));

    const updatedRows = await tx.update(factories)
      .set({
        name: parsed.data.name,
        address: parsed.data.address ?? null,
        isActive: parsed.data.active ?? true,
        updatedAt: new Date(),
      })
      .where(condition)
      .returning({ id: factories.id, name: factories.name, address: factories.address, isActive: factories.isActive });

    const updatedFactory = updatedRows[0];
    if (!updatedFactory) {
      throw new Error("Factory update failed");
    }

    await tx.insert(auditLogs).values({
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "factories",
      recordId: updatedFactory.id,
      operation: "update",
      afterValue: { name: updatedFactory.name, address: updatedFactory.address, active: updatedFactory.isActive },
    });

    revalidatePath("/factories");
    return updatedFactory;
  });
}

export async function disableFactoryAction(factoryId: unknown) {
  const session = await requireSession();
  if (session.user.role !== "super_admin" && session.user.role !== "tenant_admin") {
    throw new Error("Forbidden");
  }

  if (typeof factoryId !== "string") {
    throw new Error("Invalid factory ID");
  }

  return await withTenantSession(session, async (tx: any) => {
    const condition =
      session.user.role === "super_admin"
        ? eq(factories.id, factoryId)
        : and(eq(factories.id, factoryId), eq(factories.tenantId, session.user.tenantId));

    const updatedRows = await tx.update(factories)
      .set({ active: false, updatedAt: new Date() })
      .where(condition)
      .returning({ id: factories.id, name: factories.name });

    const updatedFactory = updatedRows[0];
    if (!updatedFactory) {
      throw new Error("Factory disable failed");
    }

    await tx.insert(auditLogs).values({
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "factories",
      recordId: updatedFactory.id,
      operation: "disable",
      afterValue: { name: updatedFactory.name },
    });

    revalidatePath("/factories");
    return updatedFactory;
  });
}

export async function updateFactorySettingsAction(input: unknown) {
  const session = await requireSession();
  if (session.user.role !== "super_admin" && session.user.role !== "tenant_admin") {
    throw new Error("Forbidden");
  }

  const parsed = updateFactorySettingsSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid settings payload");
  }

  return await withTenantSession(session, async (tx: any) => {
    const factory = await tx.query.factories.findFirst({
      where:
        session.user.role === "super_admin"
          ? eq(factories.id, parsed.data.factoryId)
          : and(eq(factories.id, parsed.data.factoryId), eq(factories.tenantId, session.user.tenantId)),
    });

    if (!factory) {
      throw new Error("Factory not found or access denied");
    }

    const existingSettings = await tx.query.settings.findFirst({
      where: eq(settings.factoryId, parsed.data.factoryId),
    });

    let settingsRecord;
    const settingsPayload: any = {
      tolerances: parsed.data.tolerances,
      trimMm: parsed.data.trimMm.toString(),
      qrType: parsed.data.qrType,
      notificationSettings: parsed.data.notificationSettings,
      costSettings: parsed.data.costSettings,
      shiftSettings: parsed.data.shiftSettings,
      logoUrl: parsed.data.logoUrl ?? null,
      updatedAt: new Date(),
    };

    if (parsed.data.factoryConfiguration) {
      settingsPayload.factoryConfiguration = parsed.data.factoryConfiguration;
    }

    if (existingSettings) {
      const updatedRows = await tx.update(settings)
        .set(settingsPayload)
        .where(eq(settings.id, existingSettings.id))
        .returning({ id: settings.id, factoryId: settings.factoryId });

      settingsRecord = updatedRows[0];
    } else {
      const inserted = await tx.insert(settings).values({
        factoryId: parsed.data.factoryId,
        ...settingsPayload,
      }).returning({ id: settings.id, factoryId: settings.factoryId });

      settingsRecord = inserted[0];
    }

    if (!settingsRecord) {
      throw new Error("Factory settings update failed");
    }

    await tx.insert(auditLogs).values({
      tenantId: factory.tenantId,
      factoryId: parsed.data.factoryId,
      changedBy: session.user.id,
      tableName: "factory_settings",
      recordId: parsed.data.factoryId,
      operation: "update",
      afterValue: {
        tolerances: parsed.data.tolerances,
        trimMm: parsed.data.trimMm,
        qrType: parsed.data.qrType,
        shiftSettings: parsed.data.shiftSettings,
        costSettings: parsed.data.costSettings,
        notificationSettings: parsed.data.notificationSettings,
        logoUrl: parsed.data.logoUrl,
      },
    });

    revalidatePath("/factories");
    return settingsRecord;
  });
}

export async function createCustomerAction(input: unknown) {
  const session = await requireSession();
  if (session.user.role !== "super_admin" && session.user.role !== "tenant_admin") {
    throw new Error("Forbidden");
  }

  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid customer payload");
  }

  return await withTenantSession(session, async (tx: any) => {
    const inserted = await tx.insert(customers).values({
      tenantId: session.user.tenantId,
      customerCode: parsed.data.erpCode,
      name: parsed.data.title,
      shortName: parsed.data.shortTitle,
      taxNumber: parsed.data.taxNumber ?? null,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      notes: parsed.data.notes ?? null,
    }).returning({ id: customers.id });

    const createdCustomer = inserted[0];
    if (!createdCustomer) {
      throw new Error("Customer creation failed");
    }

    await tx.insert(auditLogs).values({
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customers",
      recordId: createdCustomer.id,
      operation: "create",
      afterValue: {
        customerCode: parsed.data.erpCode,
        name: parsed.data.title,
      },
    });

    revalidatePath("/customers");
    return createdCustomer;
  });
}

export async function updateCustomerAction(input: unknown) {
  const session = await requireSession();
  if (session.user.role !== "super_admin" && session.user.role !== "tenant_admin") {
    throw new Error("Forbidden");
  }

  const parsed = updateCustomerSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid customer update payload");
  }

  return await withTenantSession(session, async (tx: any) => {
    const condition =
      session.user.role === "super_admin"
        ? eq(customers.id, parsed.data.id)
        : and(eq(customers.id, parsed.data.id), eq(customers.tenantId, session.user.tenantId));

    const updatedRows = await tx.update(customers)
      .set({
        customerCode: parsed.data.erpCode,
        name: parsed.data.title,
        shortName: parsed.data.shortTitle,
        taxNumber: parsed.data.taxNumber ?? null,
        address: parsed.data.address ?? null,
        city: parsed.data.city ?? null,
        notes: parsed.data.notes ?? null,
        isActive: parsed.data.active ?? true,
        updatedAt: new Date(),
      })
      .where(condition)
      .returning({ id: customers.id, customerCode: customers.customerCode, name: customers.name, shortName: customers.shortName, isActive: customers.isActive });

    const updatedCustomer = updatedRows[0];
    if (!updatedCustomer) {
      throw new Error("Customer update failed");
    }

    await tx.insert(auditLogs).values({
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customers",
      recordId: updatedCustomer.id,
      operation: "update",
      afterValue: {
        customerCode: updatedCustomer.customerCode,
        name: updatedCustomer.name,
        shortName: updatedCustomer.shortName,
        isActive: updatedCustomer.isActive,
      },
    });

    revalidatePath("/customers");
    return updatedCustomer;
  });
}

export async function disableCustomerAction(customerId: unknown) {
  const session = await requireSession();
  if (session.user.role !== "super_admin" && session.user.role !== "tenant_admin") {
    throw new Error("Forbidden");
  }

  if (typeof customerId !== "string") {
    throw new Error("Invalid customer ID");
  }

  return await withTenantSession(session, async (tx: any) => {
    const condition =
      session.user.role === "super_admin"
        ? eq(customers.id, customerId)
        : and(eq(customers.id, customerId), eq(customers.tenantId, session.user.tenantId));

    const updatedRows = await tx.update(customers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(condition)
      .returning({ id: customers.id, customerCode: customers.customerCode, name: customers.name });

    const updatedCustomer = updatedRows[0];
    if (!updatedCustomer) {
      throw new Error("Customer disable failed");
    }

    await tx.insert(auditLogs).values({
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customers",
      recordId: updatedCustomer.id,
      operation: "disable",
      afterValue: {
        customerCode: updatedCustomer.customerCode,
        name: updatedCustomer.name,
      },
    });

    revalidatePath("/customers");
    return updatedCustomer;
  });
}

export async function createCustomerContactAction(input: unknown) {
  const session = await requireSession();
  if (session.user.role !== "super_admin" && session.user.role !== "tenant_admin") {
    throw new Error("Forbidden");
  }

  const parsed = createCustomerContactSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid customer contact payload");
  }

  return await withTenantSession(session, async (tx: any) => {
    const customer = await tx.query.customers.findFirst({
      where: and(eq(customers.id, parsed.data.customerId), eq(customers.tenantId, session.user.tenantId)),
    });
    if (!customer) {
      throw new Error("Customer not found or access denied");
    }

    const inserted = await tx.insert(customerContacts).values({
      customerId: parsed.data.customerId,
      name: parsed.data.name,
      role: parsed.data.role,
      phone: parsed.data.phone ?? null,
      whatsapp: parsed.data.whatsapp ?? null,
      email: parsed.data.email ?? null,
      isActive: parsed.data.active ?? true,
    }).returning({ id: customerContacts.id });

    const createdContact = inserted[0];
    if (!createdContact) {
      throw new Error("Customer contact creation failed");
    }

    await tx.insert(auditLogs).values({
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customer_contacts",
      recordId: createdContact.id,
      operation: "create",
      afterValue: {
        name: parsed.data.name,
        role: parsed.data.role,
      },
    });

    revalidatePath(`/customers/${parsed.data.customerId}`);
    return createdContact;
  });
}

export async function updateCustomerContactAction(input: unknown) {
  const session = await requireSession();
  if (session.user.role !== "super_admin" && session.user.role !== "tenant_admin") {
    throw new Error("Forbidden");
  }

  const parsed = updateCustomerContactSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid customer contact update payload");
  }

  return await withTenantSession(session, async (tx: any) => {
    const contact = await tx.query.customerContacts.findFirst({
      where: eq(customerContacts.id, parsed.data.id),
    });
    if (!contact) {
      throw new Error("Contact not found");
    }

    const customer = await tx.query.customers.findFirst({
      where: and(eq(customers.id, contact.customerId), eq(customers.tenantId, session.user.tenantId)),
    });
    if (!customer) {
      throw new Error("Customer not found or access denied");
    }

    const updatedRows = await tx.update(customerContacts)
      .set({
        name: parsed.data.name,
        role: parsed.data.role,
        phone: parsed.data.phone ?? null,
        whatsapp: parsed.data.whatsapp ?? null,
        email: parsed.data.email ?? null,
        isActive: parsed.data.active ?? true,
        updatedAt: new Date(),
      })
      .where(eq(customerContacts.id, parsed.data.id))
      .returning({ id: customerContacts.id, name: customerContacts.name, role: customerContacts.role });

    const updatedContact = updatedRows[0];
    if (!updatedContact) {
      throw new Error("Customer contact update failed");
    }

    await tx.insert(auditLogs).values({
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "customer_contacts",
      recordId: updatedContact.id,
      operation: "update",
      afterValue: {
        name: updatedContact.name,
        role: updatedContact.role,
      },
    });

    revalidatePath(`/customers/${parsed.data.customerId}`);
    return updatedContact;
  });
}

export async function createDeliveryPointAction(input: unknown) {
  const session = await requireSession();
  if (session.user.role !== "super_admin" && session.user.role !== "tenant_admin") {
    throw new Error("Forbidden");
  }

  const parsed = createDeliveryPointSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid delivery point payload");
  }

  return await withTenantSession(session, async (tx: any) => {
    const customer = await tx.query.customers.findFirst({
      where: and(eq(customers.id, parsed.data.customerId), eq(customers.tenantId, session.user.tenantId)),
    });
    if (!customer) {
      throw new Error("Customer not found or access denied");
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
      isDefault: parsed.data.isDefault ?? false,
      active: parsed.data.active ?? true,
    }).returning({ id: deliveryPoints.id });

    const createdPoint = inserted[0];
    if (!createdPoint) {
      throw new Error("Delivery point creation failed");
    }

    await tx.insert(auditLogs).values({
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "delivery_points",
      recordId: createdPoint.id,
      operation: "create",
      afterValue: {
        name: parsed.data.name,
      },
    });

    revalidatePath(`/customers/${parsed.data.customerId}`);
    return createdPoint;
  });
}

export async function updateDeliveryPointAction(input: unknown) {
  const session = await requireSession();
  if (session.user.role !== "super_admin" && session.user.role !== "tenant_admin") {
    throw new Error("Forbidden");
  }

  const parsed = updateDeliveryPointSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid delivery point update payload");
  }

  return await withTenantSession(session, async (tx: any) => {
    const point = await tx.query.deliveryPoints.findFirst({
      where: eq(deliveryPoints.id, parsed.data.id),
    });
    if (!point) {
      throw new Error("Delivery point not found");
    }

    const customer = await tx.query.customers.findFirst({
      where: and(eq(customers.id, point.customerId), eq(customers.tenantId, session.user.tenantId)),
    });
    if (!customer) {
      throw new Error("Customer not found or access denied");
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
        isDefault: parsed.data.isDefault ?? false,
        active: parsed.data.active ?? true,
        updatedAt: new Date(),
      })
      .where(eq(deliveryPoints.id, parsed.data.id))
      .returning({ id: deliveryPoints.id, name: deliveryPoints.name });

    const updatedPoint = updatedRows[0];
    if (!updatedPoint) {
      throw new Error("Delivery point update failed");
    }

    await tx.insert(auditLogs).values({
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "delivery_points",
      recordId: updatedPoint.id,
      operation: "update",
      afterValue: {
        name: updatedPoint.name,
      },
    });

    revalidatePath(`/customers/${parsed.data.customerId}`);
    return updatedPoint;
  });
}

export async function createUserAction(input: unknown) {
  const session = await requireSession();
  if (session.user.role !== "super_admin" && session.user.role !== "tenant_admin") {
    throw new Error("Forbidden");
  }

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid user payload");
  }

  return await withTenantSession(session, async (tx: any) => {
    const roleRecord = await tx.query.roles.findFirst({ where: eq(roles.id, parsed.data.roleId) });
    if (!roleRecord) {
      throw new Error("Role not found");
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const inserted = await tx.insert(users).values({
      tenantId: parsed.data.tenantId,
      factoryId: parsed.data.factoryId ?? null,
      roleId: parsed.data.roleId,
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    }).returning({ id: users.id });

    const createdUser = inserted[0];
    if (!createdUser) {
      throw new Error("User creation failed");
    }

    await tx.insert(auditLogs).values({
      tenantId: parsed.data.tenantId,
      changedBy: session.user.id,
      tableName: "users",
      recordId: createdUser.id,
      operation: "create",
      afterValue: { email: parsed.data.email, role: roleRecord.name },
    });

    revalidatePath("/users");
    return createdUser;
  });
}
