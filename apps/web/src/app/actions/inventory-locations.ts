"use server";

import { inventoryLocations } from "@repo/db";
import { eq, and, like, or, asc, desc, sql } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { withTenantSession } from "@/lib/dbSession";
import { perfLog, perfStart, perfEnd } from "@/lib/perf";

export interface InventoryLocationListFilters {
  search?: string;
  factoryId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function getInventoryLocationsAction(filters?: InventoryLocationListFilters) {
  const tActionStart = perfStart("[getInventoryLocationsAction]");
  perfLog("[getInventoryLocationsAction]", "Started", Date.now());
  const session = await requireSession();

  const res = await withTenantSession(session, async (tx: any) => {
    const conditions: any[] = [
      eq(inventoryLocations.tenantId, session.user.tenantId),
    ];

    if (filters?.factoryId) {
      conditions.push(eq(inventoryLocations.factoryId, filters.factoryId));
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(inventoryLocations.locationCode, searchPattern),
          like(inventoryLocations.name, searchPattern),
        )
      );
    }

    const where = and(...conditions);
    const orderByColumn = filters?.sortBy ?? "locationCode";
    const orderByDir = filters?.sortOrder === "asc" ? asc : desc;
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 50;
    const offset = (page - 1) * pageSize;

    perfLog("[getInventoryLocationsAction]", "Executing select query", Date.now());
    const items = await tx
      .select()
      .from(inventoryLocations)
      .where(where)
      .orderBy(orderByDir((inventoryLocations as any)[orderByColumn] ?? inventoryLocations.locationCode))
      .limit(pageSize)
      .offset(offset);

    const totalResult = await tx
      .select({ count: sql<number>`count(*)` })
      .from(inventoryLocations)
      .where(where);

    const total = Number(totalResult[0]?.count ?? 0);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  });

  perfEnd("[getInventoryLocationsAction]", tActionStart);
  return res;
}
