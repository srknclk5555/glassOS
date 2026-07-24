"use server";

import { revalidatePath } from "next/cache";
import {
  db,
  inventoryItems,
  inventoryLots,
  inventoryLocations,
  materialsMaster,
} from "@repo/db";
import { eq, and, like, or, asc, desc, sql, inArray } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { withTenantSession } from "@/lib/dbSession";
import { ensurePermission } from "@/lib/authorization";
import { perfLog, perfStart, perfEnd } from "@/lib/perf";
import type { InventoryType } from "@repo/types";

/* ── Types ─────────────────────────────────────────────────────── */

export interface InventoryItemRow {
  id: string;
  inventoryCode: string;
  name: string;
  inventoryType: string;
  unit: string;
  materialId: string | null;
  productId: string | null;
  locationId: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  totalQuantity: number;
  totalValue: number;
  activeLotCount: number;
  totalLotCount: number;
  materialName: string | null;
  materialCode: string | null;
}

export interface InventoryListFilters {
  search?: string;
  inventoryType?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface InventoryStats {
  totalItems: number;
  totalValue: number;
  activeLotCount: number;
}

/* ─── List ──────────────────────────────────────────────────────── */

export async function getInventoryItemsAction(filters?: InventoryListFilters) {
  const tStart = perfStart("[getInventoryItemsAction]");
  perfLog("[getInventoryItemsAction]", "Started", Date.now());
  const session = await requireSession();

  const res = await withTenantSession(session, async (tx: any) => {
    const conditions: any[] = [
      eq(inventoryItems.tenantId, session.user.tenantId),
      sql`${inventoryItems.deletedAt} IS NULL`,
    ];

    if (filters?.inventoryType) {
      const types = filters.inventoryType.split(",").filter(Boolean);
      if (types.length === 1) {
        conditions.push(eq(inventoryItems.inventoryType, types[0]!));
      } else if (types.length > 1) {
        conditions.push(inArray(inventoryItems.inventoryType, types));
      }
    }

    if (filters?.search) {
      const s = `%${filters.search}%`;
      conditions.push(
        or(
          like(inventoryItems.inventoryCode, s),
          like(inventoryItems.name, s),
        )
      );
    }

    const where = and(...conditions);
    const orderByCol = filters?.sortBy ?? "createdAt";
    const orderByDir = filters?.sortOrder === "asc" ? asc : desc;
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const items = await tx
      .select({
        id: inventoryItems.id,
        inventoryCode: inventoryItems.inventoryCode,
        name: inventoryItems.name,
        inventoryType: inventoryItems.inventoryType,
        unit: inventoryItems.unit,
        materialId: inventoryItems.materialId,
        productId: inventoryItems.productId,
        locationId: inventoryItems.locationId,
        isActive: inventoryItems.isActive,
        notes: inventoryItems.notes,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
        totalQuantity:
          sql<number>`COALESCE(SUM(COALESCE(${inventoryLots.remainingQuantity}::numeric, 0)), 0)`,
        totalValue:
          sql<number>`COALESCE(SUM(COALESCE(${inventoryLots.remainingQuantity}::numeric, 0) * COALESCE(${inventoryLots.unitCost}::numeric, 0)), 0)`,
        activeLotCount:
          sql<number>`COUNT(*) FILTER (WHERE ${inventoryLots.status} = 'active')`,
        totalLotCount: sql<number>`COUNT(${inventoryLots.id})`,
        materialName: materialsMaster.name,
        materialCode: materialsMaster.materialCode,
      })
      .from(inventoryItems)
      .leftJoin(
        inventoryLots,
        eq(inventoryLots.inventoryItemId, inventoryItems.id),
      )
      .leftJoin(
        materialsMaster,
        eq(materialsMaster.id, inventoryItems.materialId),
      )
      .where(where)
      .groupBy(
        inventoryItems.id,
        inventoryItems.inventoryCode,
        inventoryItems.name,
        inventoryItems.inventoryType,
        inventoryItems.unit,
        inventoryItems.materialId,
        inventoryItems.productId,
        inventoryItems.locationId,
        inventoryItems.isActive,
        inventoryItems.notes,
        inventoryItems.createdAt,
        inventoryItems.updatedAt,
        materialsMaster.name,
        materialsMaster.materialCode,
      )
      .orderBy(
        orderByDir(
          (inventoryItems as any)[orderByCol] ?? inventoryItems.createdAt,
        ),
      )
      .limit(pageSize)
      .offset(offset);

    const totalResult = await tx
      .select({ count: sql<number>`count(*)` })
      .from(inventoryItems)
      .where(where);
    const total = Number(totalResult[0]?.count ?? 0);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  });

  perfEnd("[getInventoryItemsAction]", tStart);
  return res;
}

/* ─── Stats ─────────────────────────────────────────────────────── */

export async function getInventoryStatsAction(): Promise<InventoryStats> {
  perfLog("[getInventoryStatsAction]", "Started", Date.now());
  const session = await requireSession();

  return await withTenantSession(session, async (tx: any) => {
    const itemsCond = and(
      eq(inventoryItems.tenantId, session.user.tenantId),
      sql`${inventoryItems.deletedAt} IS NULL`,
    );

    const totalResult = await tx
      .select({ count: sql<number>`count(*)` })
      .from(inventoryItems)
      .where(itemsCond);
    const totalItems = Number(totalResult[0]?.count ?? 0);

    const lotsResult = await tx
      .select({
        totalValue: sql<number>`COALESCE(SUM(COALESCE(${inventoryLots.remainingQuantity}::numeric, 0) * COALESCE(${inventoryLots.unitCost}::numeric, 0)), 0)`,
        activeLotCount: sql<number>`COUNT(*) FILTER (WHERE ${inventoryLots.status} = 'active')`,
      })
      .from(inventoryLots)
      .innerJoin(
        inventoryItems,
        eq(inventoryLots.inventoryItemId, inventoryItems.id),
      )
      .where(
        and(
          eq(inventoryItems.tenantId, session.user.tenantId),
          sql`${inventoryItems.deletedAt} IS NULL`,
        ),
      );

    return {
      totalItems,
      totalValue: Number(lotsResult[0]?.totalValue ?? 0),
      activeLotCount: Number(lotsResult[0]?.activeLotCount ?? 0),
    };
  });
}

/* ─── Get By Id ─────────────────────────────────────────────────── */

export async function getInventoryItemByIdAction(id: string) {
  perfLog("[getInventoryItemByIdAction]", `Fetching ${id}`, Date.now());
  const session = await requireSession();

  return await withTenantSession(session, async (tx: any) => {
    const item = await tx
      .select({
        id: inventoryItems.id,
        inventoryCode: inventoryItems.inventoryCode,
        name: inventoryItems.name,
        inventoryType: inventoryItems.inventoryType,
        unit: inventoryItems.unit,
        materialId: inventoryItems.materialId,
        productId: inventoryItems.productId,
        locationId: inventoryItems.locationId,
        isActive: inventoryItems.isActive,
        notes: inventoryItems.notes,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
        materialName: materialsMaster.name,
        materialCode: materialsMaster.materialCode,
        locationName: inventoryLocations.name,
        locationCode: inventoryLocations.locationCode,
      })
      .from(inventoryItems)
      .leftJoin(
        materialsMaster,
        eq(materialsMaster.id, inventoryItems.materialId),
      )
      .leftJoin(
        inventoryLocations,
        eq(inventoryLocations.id, inventoryItems.locationId),
      )
      .where(
        and(
          eq(inventoryItems.id, id),
          eq(inventoryItems.tenantId, session.user.tenantId),
          sql`${inventoryItems.deletedAt} IS NULL`,
        ),
      )
      .limit(1);

    return item[0] ?? null;
  });
}

/* ─── Lots for an Item ──────────────────────────────────────────── */

export async function getInventoryItemLotsAction(inventoryItemId: string) {
  perfLog("[getInventoryItemLotsAction]", `Fetching lots for ${inventoryItemId}`, Date.now());
  const session = await requireSession();

  return await withTenantSession(session, async (tx: any) => {
    const lots = await tx
      .select()
      .from(inventoryLots)
      .where(
        and(
          eq(inventoryLots.inventoryItemId, inventoryItemId),
          eq(inventoryLots.status, "active"),
        ),
      )
      .orderBy(desc(inventoryLots.receivedAt));

    return lots;
  });
}
