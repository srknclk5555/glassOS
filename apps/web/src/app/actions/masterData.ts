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
    const data = parsed.data as any;
    let categoryId = data.categoryId;
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
      materialCode: data.materialCode,
      name: data.name,
      description: data.description ?? null,
      thicknessMm: data.thicknessMm ?? null,
      color: data.color ?? null,
      manufacturer: data.manufacturer ?? null,
      standardSheetWidthMm: data.standardSheetWidthMm ?? null,
      standardSheetHeightMm: data.standardSheetHeightMm ?? null,
      stockTracked: data.stockTracked ?? true,
      temperable: data.temperable ?? false,
      laminateCompatible: data.laminateCompatible ?? false,
      densityKgPerM3: data.densityKgPerM3 ?? null,
      defaultUnit: data.defaultUnit ?? "m2",
      notes: data.notes ?? null,
      isActive: data.active ?? true,
    }).returning({ id: materials.id });

    const created = inserted[0];
    await tx.insert(auditLogs).values({
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "materials",
      recordId: created.id,
      operation: "create",
      afterValue: { materialCode: data.materialCode, name: data.name },
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
    const data = parsed.data as any;
    const condition = session.user.role === "super_admin"
      ? eq(materials.id, data.id)
      : and(eq(materials.id, data.id), eq(materials.tenantId, session.user.tenantId));

    const updated = await tx.update(materials).set({
      categoryId: data.categoryId,
      materialCode: data.materialCode,
      name: data.name,
      description: data.description ?? null,
      thicknessMm: data.thicknessMm ?? null,
      color: data.color ?? null,
      manufacturer: data.manufacturer ?? null,
      standardSheetWidthMm: data.standardSheetWidthMm ?? null,
      standardSheetHeightMm: data.standardSheetHeightMm ?? null,
      stockTracked: data.stockTracked ?? true,
      temperable: data.temperable ?? false,
      laminateCompatible: data.laminateCompatible ?? false,
      densityKgPerM3: data.densityKgPerM3 ?? null,
      defaultUnit: data.defaultUnit ?? "m2",
      notes: data.notes ?? null,
      isActive: data.active ?? true,
      updatedAt: new Date(),
    }).where(condition).returning({ id: materials.id });

    const row = updated[0];
    if (!row) throw new Error("Material update failed");
    await tx.insert(auditLogs).values({
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "materials",
      recordId: row.id,
      operation: "update",
      afterValue: { materialCode: data.materialCode, name: data.name },
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

    const updated = await tx.update(materials).set({ isActive: false, updatedAt: new Date() }).where(condition).returning({ id: materials.id });
    const row = updated[0];
    if (!row) throw new Error("Delete failed");
    await tx.insert(auditLogs).values({
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "materials",
      recordId: row.id,
      operation: "delete",
      afterValue: { id: row.id },
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
      isActive: parsed.data.active ?? true,
    }).returning({ id: products.id });

    const created = inserted[0];
    await tx.insert(auditLogs).values({
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "products",
      recordId: created.id,
      operation: "create",
      afterValue: { productCode: parsed.data.productCode, name: parsed.data.name },
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
      isActive: parsed.data.active ?? true,
      updatedAt: new Date(),
    }).where(condition).returning({ id: products.id });

    const row = updated[0];
    if (!row) throw new Error("Product update failed");
    await tx.insert(auditLogs).values({
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "products",
      recordId: row.id,
      operation: "update",
      afterValue: { productCode: parsed.data.productCode, name: parsed.data.name },
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

    const updated = await tx.update(products).set({ isActive: false, updatedAt: new Date() }).where(condition).returning({ id: products.id });
    const row = updated[0];
    if (!row) throw new Error("Delete failed");
    await tx.insert(auditLogs).values({
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "products",
      recordId: row.id,
      operation: "delete",
      afterValue: { id: row.id },
    });
    revalidatePath("/products");
    return row;
  });
}
