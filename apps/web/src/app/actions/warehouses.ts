"use server";

import { revalidatePath } from "next/cache";
import { db, warehouses, auditLogs } from "@repo/db";
import { eq, and, asc, desc, like, or, sql } from "drizzle-orm";
import {
  createWarehouseSchema,
  updateWarehouseSchema,
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

export interface WarehouseListFilters {
  search?: string;
  warehouseType?: string;
  factoryId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function getWarehousesAction(filters?: WarehouseListFilters) {
  const tActionStart = perfStart("[getWarehousesAction]");
  perfLog("[getWarehousesAction]", "Started", Date.now());
  const session = await requireSession();
  await ensurePermission("warehouses:read");

  const res = await withTenantSession(session, async (tx: any) => {
    const conditions: any[] = [
      eq(warehouses.tenantId, session.user.tenantId),
      sql`${warehouses.deletedAt} IS NULL`,
    ];

    if (filters?.warehouseType) {
      conditions.push(eq(warehouses.warehouseType, filters.warehouseType));
    }

    if (filters?.factoryId) {
      conditions.push(eq(warehouses.factoryId, filters.factoryId));
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(warehouses.warehouseCode, searchPattern),
          like(warehouses.name, searchPattern),
          like(warehouses.description, searchPattern),
        )
      );
    }

    const where = and(...conditions);
    const orderByColumn = filters?.sortBy ?? "createdAt";
    const orderByDir = filters?.sortOrder === "asc" ? asc : desc;
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const tFirstSql = perfStart("[getWarehousesAction] SQL");
    perfLog("[getWarehousesAction]", "Executing select query", Date.now());
    const items = await tx
      .select()
      .from(warehouses)
      .where(where)
      .orderBy(orderByDir((warehouses as any)[orderByColumn] ?? warehouses.createdAt))
      .limit(pageSize)
      .offset(offset);
    perfEnd("[getWarehousesAction] SQL", tFirstSql);

    const tLastSql = perfStart("[getWarehousesAction] Count");
    perfLog("[getWarehousesAction]", "Executing count query", Date.now());
    const totalResult = await tx
      .select({ count: sql<number>`count(*)` })
      .from(warehouses)
      .where(where);
    perfEnd("[getWarehousesAction] Count", tLastSql);

    const total = Number(totalResult[0]?.count ?? 0);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  });

  perfEnd("[getWarehousesAction]", tActionStart);
  return res;
}

export async function getWarehouseByIdAction(id: string) {
  const tActionStart = perfStart("[getWarehouseByIdAction]");
  perfLog("[getWarehouseByIdAction]", `Fetching warehouse ${id}`, Date.now());
  const session = await requireSession();
  await ensurePermission("warehouses:read");

  const res = await withTenantSession(session, async (tx: any) => {
    const tQuery = perfStart("[getWarehouseByIdAction] SQL");
    const item = await tx
      .select()
      .from(warehouses)
      .where(
        and(
          eq(warehouses.id, id),
          eq(warehouses.tenantId, session.user.tenantId),
          sql`${warehouses.deletedAt} IS NULL`,
        )
      )
      .limit(1);
    perfEnd("[getWarehouseByIdAction] SQL", tQuery);

    return item[0] ?? null;
  });

  perfEnd("[getWarehouseByIdAction]", tActionStart);
  return res;
}

export async function createWarehouseAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("warehouses:write");

  const parsed = createWarehouseSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map(e => e.message).join(", "));
  }

  return await withTenantSession(session, async (tx: any) => {
    const id = generateULID();

    const inserted = await tx
      .insert(warehouses)
      .values({
        id,
        tenantId: session.user.tenantId,
        factoryId: parsed.data.factoryId ?? null,
        warehouseCode: parsed.data.warehouseCode,
        name: parsed.data.name,
        warehouseType: parsed.data.warehouseType,
        description: parsed.data.description ?? null,
        managerId: parsed.data.managerId ?? null,
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
      tableName: "warehouses",
      recordId: id,
      operation: "INSERT",
      afterValue: { warehouseCode: parsed.data.warehouseCode, name: parsed.data.name },
    });

    revalidatePath("/warehouses");
    return inserted[0];
  });
}

export async function updateWarehouseAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("warehouses:write");

  const parsed = updateWarehouseSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map(e => e.message).join(", "));
  }

  return await withTenantSession(session, async (tx: any) => {
    const existing = await tx
      .select({ id: warehouses.id, tenantId: warehouses.tenantId })
      .from(warehouses)
      .where(
        and(
          eq(warehouses.id, parsed.data.id),
          eq(warehouses.tenantId, session.user.tenantId),
          sql`${warehouses.deletedAt} IS NULL`,
        )
      )
      .limit(1);

    if (!existing[0]) {
      throw new Error("Warehouse not found");
    }

    const updated = await tx
      .update(warehouses)
      .set({
        warehouseCode: parsed.data.warehouseCode,
        name: parsed.data.name,
        warehouseType: parsed.data.warehouseType,
        factoryId: parsed.data.factoryId ?? null,
        description: parsed.data.description ?? null,
        managerId: parsed.data.managerId ?? null,
        isActive: parsed.data.isActive ?? undefined,
        notes: parsed.data.notes ?? null,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(warehouses.id, parsed.data.id),
          eq(warehouses.tenantId, session.user.tenantId),
        )
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "warehouses",
      recordId: parsed.data.id,
      operation: "UPDATE",
      afterValue: { warehouseCode: parsed.data.warehouseCode, name: parsed.data.name },
    });

    revalidatePath("/warehouses");
    return updated[0];
  });
}

export async function deactivateWarehouseAction(id: string) {
  const session = await requireSession();
  await ensurePermission("warehouses:write");

  return await withTenantSession(session, async (tx: any) => {
    const updated = await tx
      .update(warehouses)
      .set({
        isActive: false,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(warehouses.id, id),
          eq(warehouses.tenantId, session.user.tenantId),
        )
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "warehouses",
      recordId: id,
      operation: "UPDATE",
      afterValue: { isActive: false },
    });

    revalidatePath("/warehouses");
    return updated[0];
  });
}

export async function activateWarehouseAction(id: string) {
  const session = await requireSession();
  await ensurePermission("warehouses:write");

  return await withTenantSession(session, async (tx: any) => {
    const updated = await tx
      .update(warehouses)
      .set({
        isActive: true,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(warehouses.id, id),
          eq(warehouses.tenantId, session.user.tenantId),
        )
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "warehouses",
      recordId: id,
      operation: "UPDATE",
      afterValue: { isActive: true },
    });

    revalidatePath("/warehouses");
    return updated[0];
  });
}

export async function getWarehouseStatsAction() {
  const session = await requireSession();
  await ensurePermission("warehouses:read");

  const res = await withTenantSession(session, async (tx: any) => {
    const total = await tx
      .select({ count: sql<number>`count(*)` })
      .from(warehouses)
      .where(
        and(
          eq(warehouses.tenantId, session.user.tenantId),
          sql`${warehouses.deletedAt} IS NULL`,
        )
      );

    const active = await tx
      .select({ count: sql<number>`count(*)` })
      .from(warehouses)
      .where(
        and(
          eq(warehouses.tenantId, session.user.tenantId),
          eq(warehouses.isActive, true),
          sql`${warehouses.deletedAt} IS NULL`,
        )
      );

    const inactive = await tx
      .select({ count: sql<number>`count(*)` })
      .from(warehouses)
      .where(
        and(
          eq(warehouses.tenantId, session.user.tenantId),
          eq(warehouses.isActive, false),
          sql`${warehouses.deletedAt} IS NULL`,
        )
      );

    return {
      total: Number(total[0]?.count ?? 0),
      active: Number(active[0]?.count ?? 0),
      inactive: Number(inactive[0]?.count ?? 0),
    };
  });

  return res;
}
