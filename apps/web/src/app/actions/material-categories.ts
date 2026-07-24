"use server";

import { revalidatePath } from "next/cache";
import { materialCategories, auditLogs } from "@repo/db";
import { createMaterialCategorySchema, updateMaterialCategorySchema } from "@repo/types";
import { eq, and, like, or, asc, desc, sql } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { withTenantSession } from "@/lib/dbSession";
import { ensurePermission } from "@/lib/authorization";
import { perfLog, perfStart, perfEnd } from "@/lib/perf";

export interface MaterialCategoryListFilters {
  search?: string;
  materialType?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function getMaterialCategoriesAction(filters?: MaterialCategoryListFilters) {
  const tActionStart = perfStart("[getMaterialCategoriesAction]");
  perfLog("[getMaterialCategoriesAction]", "Started", Date.now());
  const session = await requireSession();

  const res = await withTenantSession(session, async (tx: any) => {
    const conditions: any[] = [
      eq(materialCategories.tenantId, session.user.tenantId),
    ];

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(materialCategories.name, searchPattern),
        )
      );
    }

    // Filter by material type: if set, show groups where materialType matches OR is null (generic)
    if (filters?.materialType) {
      conditions.push(
        or(
          eq(materialCategories.materialType, filters.materialType),
          sql`${materialCategories.materialType} IS NULL`,
        )
      );
    }

    const where = and(...conditions);
    const orderByColumn = filters?.sortBy ?? "name";
    const orderByDir = filters?.sortOrder === "asc" ? asc : desc;
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 50;
    const offset = (page - 1) * pageSize;

    perfLog("[getMaterialCategoriesAction]", "Executing select query", Date.now());
    const items = await tx
      .select()
      .from(materialCategories)
      .where(where)
      .orderBy(orderByDir((materialCategories as any)[orderByColumn] ?? materialCategories.name))
      .limit(pageSize)
      .offset(offset);

    const totalResult = await tx
      .select({ count: sql<number>`count(*)` })
      .from(materialCategories)
      .where(where);

    const total = Number(totalResult[0]?.count ?? 0);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  });

  perfEnd("[getMaterialCategoriesAction]", tActionStart);
  return res;
}

// ─── Helper: ULID generator ──────────────────────────────────────────────────

function generateULID(): string {
  const chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const timestamp = Date.now().toString(36).toUpperCase().padStart(10, "0");
  let random = "";
  for (let i = 0; i < 16; i++) {
    random += chars[Math.floor(Math.random() * 32)];
  }
  return (timestamp + random).slice(0, 26);
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createMaterialCategoryAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("materials:write");

  const parsed = createMaterialCategorySchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  }

  return await withTenantSession(session, async (tx: any) => {
    const id = generateULID();

    const inserted = await tx
      .insert(materialCategories)
      .values({
        id,
        tenantId: session.user.tenantId,
        name: parsed.data.name,
        materialType: parsed.data.materialType ?? null,
        isActive: parsed.data.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "material_categories",
      recordId: id,
      operation: "INSERT",
      afterValue: { name: parsed.data.name },
    });

    revalidatePath("/materials");
    return inserted[0];
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateMaterialCategoryAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("materials:write");

  const parsed = updateMaterialCategorySchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  }

  return await withTenantSession(session, async (tx: any) => {
    const existing = await tx
      .select({ id: materialCategories.id, tenantId: materialCategories.tenantId })
      .from(materialCategories)
      .where(
        and(
          eq(materialCategories.id, parsed.data.id),
          eq(materialCategories.tenantId, session.user.tenantId),
        ),
      )
      .limit(1);

    if (!existing[0]) {
      throw new Error("Material group not found");
    }

    const updated = await tx
      .update(materialCategories)
      .set({
        name: parsed.data.name,
        materialType: parsed.data.materialType ?? null,
        isActive: parsed.data.isActive,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(materialCategories.id, parsed.data.id),
          eq(materialCategories.tenantId, session.user.tenantId),
        ),
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "material_categories",
      recordId: parsed.data.id,
      operation: "UPDATE",
      afterValue: { name: parsed.data.name },
    });

    revalidatePath("/materials");
    return updated[0];
  });
}

// ─── Toggle active state ─────────────────────────────────────────────────────

export async function toggleMaterialCategoryAction(id: string, isActive: boolean) {
  const session = await requireSession();
  await ensurePermission("materials:write");

  return await withTenantSession(session, async (tx: any) => {
    const updated = await tx
      .update(materialCategories)
      .set({
        isActive,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(materialCategories.id, id),
          eq(materialCategories.tenantId, session.user.tenantId),
        ),
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "material_categories",
      recordId: id,
      operation: isActive ? "ACTIVATE" : "DEACTIVATE",
      afterValue: { isActive },
    });

    revalidatePath("/materials");
    return updated[0];
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteMaterialCategoryAction(id: string) {
  const session = await requireSession();
  await ensurePermission("materials:write");

  return await withTenantSession(session, async (tx: any) => {
    const existing = await tx
      .select({ id: materialCategories.id, tenantId: materialCategories.tenantId })
      .from(materialCategories)
      .where(
        and(
          eq(materialCategories.id, id),
          eq(materialCategories.tenantId, session.user.tenantId),
        ),
      )
      .limit(1);

    if (!existing[0]) {
      throw new Error("Material group not found");
    }

    await tx.delete(materialCategories).where(eq(materialCategories.id, id));

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "material_categories",
      recordId: id,
      operation: "DELETE",
      afterValue: { deleted: true },
    });

    revalidatePath("/materials");
    return { success: true };
  });
}
