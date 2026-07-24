"use server";

import { revalidatePath } from "next/cache";
import { db, materialsMaster, auditLogs } from "@repo/db";
import { eq, and, asc, desc, like, or, sql, inArray } from "drizzle-orm";
import { createMaterialSchema, updateMaterialSchema } from "@repo/types";
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

export interface MaterialListFilters {
  search?: string;
  materialType?: string;
  materialGroupId?: string;
  factoryId?: string;
  warehouseId?: string;
  status?: string;
  stockTracking?: boolean;
  purchasable?: boolean;
  manufacturable?: boolean;
  sellable?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function getMaterialsAction(filters?: MaterialListFilters) {
  const tActionStart = perfStart("[getMaterialsAction]");
  perfLog("[getMaterialsAction]", "Started", Date.now());
  const session = await requireSession();
  await ensurePermission("materials:read");

  const res = await withTenantSession(session, async (tx: any) => {
    const conditions: any[] = [
      eq(materialsMaster.tenantId, session.user.tenantId),
      sql`${materialsMaster.deletedAt} IS NULL`,
    ];

    if (filters?.materialType) {
      const types = filters.materialType.split(",").filter(Boolean);
      if (types.length === 1) {
        conditions.push(eq(materialsMaster.materialType, types[0]!));
      } else if (types.length > 1) {
        conditions.push(inArray(materialsMaster.materialType, types));
      }
    }

    if (filters?.materialGroupId) {
      conditions.push(eq(materialsMaster.materialGroupId, filters.materialGroupId));
    }

    if (filters?.factoryId) {
      conditions.push(eq(materialsMaster.factoryId, filters.factoryId));
    }

    if (filters?.warehouseId) {
      conditions.push(eq(materialsMaster.defaultWarehouseId, filters.warehouseId));
    }

    if (filters?.status) {
      conditions.push(eq(materialsMaster.status, filters.status));
    }

    if (filters?.stockTracking !== undefined) {
      conditions.push(eq(materialsMaster.stockTracking, filters.stockTracking));
    }

    if (filters?.purchasable !== undefined) {
      conditions.push(eq(materialsMaster.purchasable, filters.purchasable));
    }

    if (filters?.manufacturable !== undefined) {
      conditions.push(eq(materialsMaster.manufacturable, filters.manufacturable));
    }

    if (filters?.sellable !== undefined) {
      conditions.push(eq(materialsMaster.sellable, filters.sellable));
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(materialsMaster.materialCode, searchPattern),
          like(materialsMaster.name, searchPattern),
          like(materialsMaster.barcode, searchPattern),
          like(materialsMaster.qrCode, searchPattern),
          like(materialsMaster.customCode1, searchPattern),
          like(materialsMaster.customCode2, searchPattern),
          like(materialsMaster.customCode3, searchPattern),
          like(materialsMaster.customCode4, searchPattern),
          like(materialsMaster.customCode5, searchPattern),
        )
      );
    }

    const where = and(...conditions);
    const orderByColumn = filters?.sortBy ?? "createdAt";
    const orderByDir = filters?.sortOrder === "asc" ? asc : desc;
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const tFirstSql = perfStart("[getMaterialsAction] SQL");
    perfLog("[getMaterialsAction]", "Executing select query", Date.now());
    const items = await tx
      .select()
      .from(materialsMaster)
      .where(where)
      .orderBy(orderByDir((materialsMaster as any)[orderByColumn] ?? materialsMaster.createdAt))
      .limit(pageSize)
      .offset(offset);
    perfEnd("[getMaterialsAction] SQL", tFirstSql);

    const tLastSql = perfStart("[getMaterialsAction] Count");
    perfLog("[getMaterialsAction]", "Executing count query", Date.now());
    const totalResult = await tx
      .select({ count: sql<number>`count(*)` })
      .from(materialsMaster)
      .where(where);
    perfEnd("[getMaterialsAction] Count", tLastSql);

    const total = Number(totalResult[0]?.count ?? 0);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  });

  perfEnd("[getMaterialsAction]", tActionStart);
  return res;
}

export async function getMaterialByIdAction(id: string) {
  const tActionStart = perfStart("[getMaterialByIdAction]");
  perfLog("[getMaterialByIdAction]", `Fetching material ${id}`, Date.now());
  const session = await requireSession();
  await ensurePermission("materials:read");

  const res = await withTenantSession(session, async (tx: any) => {
    const tQuery = perfStart("[getMaterialByIdAction] SQL");
    const item = await tx
      .select()
      .from(materialsMaster)
      .where(
        and(
          eq(materialsMaster.id, id),
          eq(materialsMaster.tenantId, session.user.tenantId),
          sql`${materialsMaster.deletedAt} IS NULL`,
        )
      )
      .limit(1);
    perfEnd("[getMaterialByIdAction] SQL", tQuery);

    return item[0] ?? null;
  });

  perfEnd("[getMaterialByIdAction]", tActionStart);
  return res;
}

export async function createMaterialAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("materials:write");

  const parsed = createMaterialSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map(e => e.message).join(", "));
  }

  return await withTenantSession(session, async (tx: any) => {
    const id = generateULID();

    const inserted = await tx
      .insert(materialsMaster)
      .values({
        id,
        tenantId: session.user.tenantId,
        factoryId: parsed.data.factoryId ?? null,
        materialCode: parsed.data.materialCode,
        name: parsed.data.name,
        shortName: parsed.data.shortName ?? null,
        description: parsed.data.description ?? null,
        materialType: parsed.data.materialType,
        materialGroupId: parsed.data.materialGroupId ?? null,
        brand: parsed.data.brand ?? null,
        model: parsed.data.model ?? null,
        thicknessMm: parsed.data.thicknessMm ?? null,
        color: parsed.data.color ?? null,
        originType: parsed.data.originType ?? null,
        originCountry: parsed.data.originCountry ?? null,
        defaultWarehouseId: parsed.data.defaultWarehouseId ?? null,
        defaultLocationId: parsed.data.defaultLocationId ?? null,
        defaultSupplierId: parsed.data.defaultSupplierId ?? null,
        baseUnit: parsed.data.baseUnit ?? "piece",
        stockTracking: parsed.data.stockTracking ?? true,
        inventoryItem: parsed.data.inventoryItem ?? true,
        purchasable: parsed.data.purchasable ?? false,
        sellable: parsed.data.sellable ?? false,
        manufacturable: parsed.data.manufacturable ?? false,
        qualityInspectionRequired: parsed.data.qualityInspectionRequired ?? false,
        batchTracking: parsed.data.batchTracking ?? false,
        serialTracking: parsed.data.serialTracking ?? false,
        expirationTracking: parsed.data.expirationTracking ?? false,
        minStock: parsed.data.minStock ?? null,
        maxStock: parsed.data.maxStock ?? null,
        criticalStock: parsed.data.criticalStock ?? null,
        safetyStock: parsed.data.safetyStock ?? null,
        reorderPoint: parsed.data.reorderPoint ?? null,
        reorderQuantity: parsed.data.reorderQuantity ?? null,
        standardCost: parsed.data.standardCost ?? null,
        averageCost: parsed.data.averageCost ?? null,
        lastPurchasePrice: parsed.data.lastPurchasePrice ?? null,
        currency: parsed.data.currency ?? null,
        barcode: parsed.data.barcode ?? null,
        qrCode: parsed.data.qrCode ?? null,
        rfidCode: parsed.data.rfidCode ?? null,
        imageUrl: parsed.data.imageUrl ?? null,
        technicalDrawingUrl: parsed.data.technicalDrawingUrl ?? null,
        documentUrl: parsed.data.documentUrl ?? null,
        customCode1: parsed.data.customCode1 ?? null,
        customCode2: parsed.data.customCode2 ?? null,
        customCode3: parsed.data.customCode3 ?? null,
        customCode4: parsed.data.customCode4 ?? null,
        customCode5: parsed.data.customCode5 ?? null,
        status: parsed.data.status ?? "active",
        isActive: parsed.data.isActive ?? true,
        notes: parsed.data.notes ?? null,
        updatedAt: new Date(),
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "materials_master",
      recordId: id,
      operation: "INSERT",
      afterValue: { materialCode: parsed.data.materialCode, name: parsed.data.name },
    });

    revalidatePath("/materials");
    return inserted[0];
  });
}

export async function updateMaterialAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("materials:write");

  const parsed = updateMaterialSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map(e => e.message).join(", "));
  }

  return await withTenantSession(session, async (tx: any) => {
    const existing = await tx
      .select({ id: materialsMaster.id, tenantId: materialsMaster.tenantId })
      .from(materialsMaster)
      .where(
        and(
          eq(materialsMaster.id, parsed.data.id),
          eq(materialsMaster.tenantId, session.user.tenantId),
          sql`${materialsMaster.deletedAt} IS NULL`,
        )
      )
      .limit(1);

    if (!existing[0]) {
      throw new Error("Material not found");
    }

    const updated = await tx
      .update(materialsMaster)
      .set({
        materialCode: parsed.data.materialCode,
        name: parsed.data.name,
        shortName: parsed.data.shortName ?? null,
        description: parsed.data.description ?? null,
        materialType: parsed.data.materialType,
        materialGroupId: parsed.data.materialGroupId ?? null,
        brand: parsed.data.brand ?? null,
        model: parsed.data.model ?? null,
        thicknessMm: parsed.data.thicknessMm ?? null,
        color: parsed.data.color ?? null,
        originType: parsed.data.originType ?? null,
        originCountry: parsed.data.originCountry ?? null,
        factoryId: parsed.data.factoryId ?? null,
        defaultWarehouseId: parsed.data.defaultWarehouseId ?? null,
        defaultLocationId: parsed.data.defaultLocationId ?? null,
        defaultSupplierId: parsed.data.defaultSupplierId ?? null,
        baseUnit: parsed.data.baseUnit ?? "piece",
        stockTracking: parsed.data.stockTracking ?? undefined,
        inventoryItem: parsed.data.inventoryItem ?? undefined,
        purchasable: parsed.data.purchasable ?? undefined,
        sellable: parsed.data.sellable ?? undefined,
        manufacturable: parsed.data.manufacturable ?? undefined,
        qualityInspectionRequired: parsed.data.qualityInspectionRequired ?? undefined,
        batchTracking: parsed.data.batchTracking ?? undefined,
        serialTracking: parsed.data.serialTracking ?? undefined,
        expirationTracking: parsed.data.expirationTracking ?? undefined,
        minStock: parsed.data.minStock ?? null,
        maxStock: parsed.data.maxStock ?? null,
        criticalStock: parsed.data.criticalStock ?? null,
        safetyStock: parsed.data.safetyStock ?? null,
        reorderPoint: parsed.data.reorderPoint ?? null,
        reorderQuantity: parsed.data.reorderQuantity ?? null,
        standardCost: parsed.data.standardCost ?? null,
        averageCost: parsed.data.averageCost ?? null,
        lastPurchasePrice: parsed.data.lastPurchasePrice ?? null,
        currency: parsed.data.currency ?? null,
        barcode: parsed.data.barcode ?? null,
        qrCode: parsed.data.qrCode ?? null,
        rfidCode: parsed.data.rfidCode ?? null,
        imageUrl: parsed.data.imageUrl ?? null,
        technicalDrawingUrl: parsed.data.technicalDrawingUrl ?? null,
        documentUrl: parsed.data.documentUrl ?? null,
        customCode1: parsed.data.customCode1 ?? null,
        customCode2: parsed.data.customCode2 ?? null,
        customCode3: parsed.data.customCode3 ?? null,
        customCode4: parsed.data.customCode4 ?? null,
        customCode5: parsed.data.customCode5 ?? null,
        status: parsed.data.status ?? undefined,
        isActive: parsed.data.isActive ?? undefined,
        notes: parsed.data.notes ?? null,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(materialsMaster.id, parsed.data.id),
          eq(materialsMaster.tenantId, session.user.tenantId),
        )
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "materials_master",
      recordId: parsed.data.id,
      operation: "UPDATE",
      afterValue: { materialCode: parsed.data.materialCode, name: parsed.data.name },
    });

    revalidatePath("/materials");
    return updated[0];
  });
}

export async function deactivateMaterialAction(id: string) {
  const session = await requireSession();
  await ensurePermission("materials:write");

  return await withTenantSession(session, async (tx: any) => {
    const updated = await tx
      .update(materialsMaster)
      .set({
        isActive: false,
        status: "passive",
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(materialsMaster.id, id),
          eq(materialsMaster.tenantId, session.user.tenantId),
        )
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "materials_master",
      recordId: id,
      operation: "UPDATE",
      afterValue: { isActive: false, status: "passive" },
    });

    revalidatePath("/materials");
    return updated[0];
  });
}

export async function activateMaterialAction(id: string) {
  const session = await requireSession();
  await ensurePermission("materials:write");

  return await withTenantSession(session, async (tx: any) => {
    const updated = await tx
      .update(materialsMaster)
      .set({
        isActive: true,
        status: "active",
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(materialsMaster.id, id),
          eq(materialsMaster.tenantId, session.user.tenantId),
        )
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "materials_master",
      recordId: id,
      operation: "UPDATE",
      afterValue: { isActive: true, status: "active" },
    });

    revalidatePath("/materials");
    return updated[0];
  });
}

export async function blockMaterialAction(id: string) {
  const session = await requireSession();
  await ensurePermission("materials:write");

  return await withTenantSession(session, async (tx: any) => {
    const updated = await tx
      .update(materialsMaster)
      .set({
        isActive: false,
        status: "blocked",
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(materialsMaster.id, id),
          eq(materialsMaster.tenantId, session.user.tenantId),
        )
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "materials_master",
      recordId: id,
      operation: "UPDATE",
      afterValue: { isActive: false, status: "blocked" },
    });

    revalidatePath("/materials");
    return updated[0];
  });
}

export async function getMaterialStatsAction() {
  const session = await requireSession();
  await ensurePermission("materials:read");

  const res = await withTenantSession(session, async (tx: any) => {
    const total = await tx
      .select({ count: sql<number>`count(*)` })
      .from(materialsMaster)
      .where(
        and(
          eq(materialsMaster.tenantId, session.user.tenantId),
          sql`${materialsMaster.deletedAt} IS NULL`,
        )
      );

    const active = await tx
      .select({ count: sql<number>`count(*)` })
      .from(materialsMaster)
      .where(
        and(
          eq(materialsMaster.tenantId, session.user.tenantId),
          eq(materialsMaster.isActive, true),
          sql`${materialsMaster.deletedAt} IS NULL`,
        )
      );

    const blocked = await tx
      .select({ count: sql<number>`count(*)` })
      .from(materialsMaster)
      .where(
        and(
          eq(materialsMaster.tenantId, session.user.tenantId),
          eq(materialsMaster.status, "blocked"),
          sql`${materialsMaster.deletedAt} IS NULL`,
        )
      );

    return {
      total: Number(total[0]?.count ?? 0),
      active: Number(active[0]?.count ?? 0),
      blocked: Number(blocked[0]?.count ?? 0),
      inactive: Number(total[0]?.count ?? 0) - Number(active[0]?.count ?? 0),
    };
  });

  return res;
}
