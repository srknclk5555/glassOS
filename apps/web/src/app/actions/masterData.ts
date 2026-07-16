"use server";

import { revalidatePath } from "next/cache";
import { db, materials, materialUnitProfiles, materialPackagings, productCategories, products, materialCategories, auditLogs } from "@repo/db";
import { eq, and } from "drizzle-orm";
import {
  createMaterialSchema,
  updateMaterialSchema,
  createProductSchema,
  updateProductSchema,
} from "@repo/types";
import { requireSession } from "@/lib/session";
import { withTenantSession } from "@/lib/dbSession";

export async function createMaterialAction(input: unknown) {
  const session = await requireSession();
  if (session.user.role === "customer") throw new Error("Forbidden");

  const parsed = createMaterialSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid payload");

  return await withTenantSession(session, async (tx: any) => {
    let categoryId = parsed.data.categoryId;
    if (!categoryId) {
      const existingCat = await tx.query.materialCategories.findFirst({ where: eq(materialCategories.tenantId, session.user.tenantId) });
      if (existingCat) categoryId = existingCat.id;
      else {
        const createdCat = await tx.insert(materialCategories).values({ tenantId: session.user.tenantId, name: "Uncategorized" }).returning({ id: materialCategories.id });
        categoryId = createdCat[0].id;
      }
    }

    const inserted = await tx.insert(materials).values({
      tenantId: session.user.tenantId,
      categoryId,
      materialCode: parsed.data.materialCode,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      thicknessMm: parsed.data.thicknessMm ?? null,
      color: parsed.data.color ?? null,
      manufacturer: parsed.data.manufacturer ?? null,
      standardSheetWidthMm: parsed.data.standardSheetWidthMm ?? null,
      standardSheetHeightMm: parsed.data.standardSheetHeightMm ?? null,
      stockTracked: parsed.data.stockTracked ?? true,
      temperable: parsed.data.temperable ?? false,
      laminateCompatible: parsed.data.laminateCompatible ?? false,
      densityKgPerM3: parsed.data.densityKgPerM3 ?? null,
      defaultUnit: parsed.data.defaultUnit ?? "m2",
      notes: parsed.data.notes ?? null,
      active: parsed.data.active ?? true,
    }).returning({ id: materials.id });

    const created = inserted[0];
    await tx.insert(auditLogs).values({
      tenantId: session.user.tenantId,
      actorId: session.user.id,
      entityType: "material",
      entityId: created.id,
      action: "create",
      details: { materialCode: parsed.data.materialCode, name: parsed.data.name },
    });
    revalidatePath("/materials");
    return created;
  });
}

export async function updateMaterialAction(input: unknown) {
  const session = await requireSession();
  if (session.user.role === "customer") throw new Error("Forbidden");

  const parsed = updateMaterialSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid payload");

  return await withTenantSession(session, async (tx: any) => {
    const condition = session.user.role === "super_admin"
      ? eq(materials.id, parsed.data.id)
      : and(eq(materials.id, parsed.data.id), eq(materials.tenantId, session.user.tenantId));

    const updated = await tx.update(materials).set({
      categoryId: parsed.data.categoryId,
      materialCode: parsed.data.materialCode,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      thicknessMm: parsed.data.thicknessMm ?? null,
      color: parsed.data.color ?? null,
      manufacturer: parsed.data.manufacturer ?? null,
      standardSheetWidthMm: parsed.data.standardSheetWidthMm ?? null,
      standardSheetHeightMm: parsed.data.standardSheetHeightMm ?? null,
      stockTracked: parsed.data.stockTracked ?? true,
      temperable: parsed.data.temperable ?? false,
      laminateCompatible: parsed.data.laminateCompatible ?? false,
      densityKgPerM3: parsed.data.densityKgPerM3 ?? null,
      defaultUnit: parsed.data.defaultUnit ?? "m2",
      notes: parsed.data.notes ?? null,
      active: parsed.data.active ?? true,
      updatedAt: new Date(),
    }).where(condition).returning({ id: materials.id });

    const row = updated[0];
    if (!row) throw new Error("Material update failed");
    await tx.insert(auditLogs).values({
      tenantId: session.user.tenantId,
      actorId: session.user.id,
      entityType: "material",
      entityId: row.id,
      action: "update",
      details: { materialCode: parsed.data.materialCode, name: parsed.data.name },
    });
    revalidatePath("/materials");
    return row;
  });
}

export async function softDeleteMaterialAction(id: unknown) {
  const session = await requireSession();
  if (session.user.role === "customer") throw new Error("Forbidden");
  if (typeof id !== "string") throw new Error("Invalid id");

  return await withTenantSession(session, async (tx: any) => {
    const condition = session.user.role === "super_admin"
      ? eq(materials.id, id)
      : and(eq(materials.id, id), eq(materials.tenantId, session.user.tenantId));

    const updated = await tx.update(materials).set({ active: false, updatedAt: new Date() }).where(condition).returning({ id: materials.id });
    const row = updated[0];
    if (!row) throw new Error("Delete failed");
    await tx.insert(auditLogs).values({
      tenantId: session.user.tenantId,
      actorId: session.user.id,
      entityType: "material",
      entityId: row.id,
      action: "delete",
      details: { id: row.id },
    });
    revalidatePath("/materials");
    return row;
  });
}

// Products
export async function createProductAction(input: unknown) {
  const session = await requireSession();
  if (session.user.role === "customer") throw new Error("Forbidden");

  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid payload");

  return await withTenantSession(session, async (tx: any) => {
    let categoryId = parsed.data.categoryId;
    if (!categoryId) {
      const existingCat = await tx.query.productCategories.findFirst({ where: eq(productCategories.tenantId, session.user.tenantId) });
      if (existingCat) categoryId = existingCat.id;
      else {
        const createdCat = await tx.insert(productCategories).values({ tenantId: session.user.tenantId, name: "Uncategorized" }).returning({ id: productCategories.id });
        categoryId = createdCat[0].id;
      }
    }

    const inserted = await tx.insert(products).values({
      tenantId: session.user.tenantId,
      categoryId,
      productCode: parsed.data.productCode,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      thicknessMm: parsed.data.thicknessMm ?? null,
      color: parsed.data.color ?? null,
      isTemper: parsed.data.isTemper ?? false,
      isInsulated: parsed.data.isInsulated ?? false,
      isLaminated: parsed.data.isLaminated ?? false,
      active: parsed.data.active ?? true,
    }).returning({ id: products.id });

    const created = inserted[0];
    await tx.insert(auditLogs).values({
      tenantId: session.user.tenantId,
      actorId: session.user.id,
      entityType: "product",
      entityId: created.id,
      action: "create",
      details: { productCode: parsed.data.productCode, name: parsed.data.name },
    });
    revalidatePath("/products");
    return created;
  });
}

export async function updateProductAction(input: unknown) {
  const session = await requireSession();
  if (session.user.role === "customer") throw new Error("Forbidden");

  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid payload");

  return await withTenantSession(session, async (tx: any) => {
    const condition = session.user.role === "super_admin"
      ? eq(products.id, parsed.data.id)
      : and(eq(products.id, parsed.data.id), eq(products.tenantId, session.user.tenantId));

    const updated = await tx.update(products).set({
      categoryId: parsed.data.categoryId,
      productCode: parsed.data.productCode,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      thicknessMm: parsed.data.thicknessMm ?? null,
      color: parsed.data.color ?? null,
      isTemper: parsed.data.isTemper ?? false,
      isInsulated: parsed.data.isInsulated ?? false,
      isLaminated: parsed.data.isLaminated ?? false,
      active: parsed.data.active ?? true,
      updatedAt: new Date(),
    }).where(condition).returning({ id: products.id });

    const row = updated[0];
    if (!row) throw new Error("Product update failed");
    await tx.insert(auditLogs).values({
      tenantId: session.user.tenantId,
      actorId: session.user.id,
      entityType: "product",
      entityId: row.id,
      action: "update",
      details: { productCode: parsed.data.productCode, name: parsed.data.name },
    });
    revalidatePath("/products");
    return row;
  });
}

export async function softDeleteProductAction(id: unknown) {
  const session = await requireSession();
  if (session.user.role === "customer") throw new Error("Forbidden");
  if (typeof id !== "string") throw new Error("Invalid id");

  return await withTenantSession(session, async (tx: any) => {
    const condition = session.user.role === "super_admin"
      ? eq(products.id, id)
      : and(eq(products.id, id), eq(products.tenantId, session.user.tenantId));

    const updated = await tx.update(products).set({ active: false, updatedAt: new Date() }).where(condition).returning({ id: products.id });
    const row = updated[0];
    if (!row) throw new Error("Delete failed");
    await tx.insert(auditLogs).values({
      tenantId: session.user.tenantId,
      actorId: session.user.id,
      entityType: "product",
      entityId: row.id,
      action: "delete",
      details: { id: row.id },
    });
    revalidatePath("/products");
    return row;
  });
}
