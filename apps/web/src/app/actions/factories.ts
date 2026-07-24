"use server";

import { factories } from "@repo/db";
import { eq, and, like, or, asc, desc, sql } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { withTenantSession } from "@/lib/dbSession";
import { ensurePermission } from "@/lib/authorization";
import { perfLog, perfStart, perfEnd } from "@/lib/perf";

export interface FactoryListFilters {
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function getFactoriesAction(filters?: FactoryListFilters) {
  const tActionStart = perfStart("[getFactoriesAction]");
  perfLog("[getFactoriesAction]", "Started", Date.now());
  const session = await requireSession();
  await ensurePermission("factories:read");

  const res = await withTenantSession(session, async (tx: any) => {
    const conditions: any[] = [
      eq(factories.tenantId, session.user.tenantId),
      sql`${factories.deletedAt} IS NULL`,
    ];

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(factories.name, searchPattern),
        )
      );
    }

    const where = and(...conditions);
    const orderByColumn = filters?.sortBy ?? "name";
    const orderByDir = filters?.sortOrder === "asc" ? asc : desc;
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 50;
    const offset = (page - 1) * pageSize;

    perfLog("[getFactoriesAction]", "Executing select query", Date.now());
    const items = await tx
      .select()
      .from(factories)
      .where(where)
      .orderBy(orderByDir((factories as any)[orderByColumn] ?? factories.name))
      .limit(pageSize)
      .offset(offset);

    const totalResult = await tx
      .select({ count: sql<number>`count(*)` })
      .from(factories)
      .where(where);

    const total = Number(totalResult[0]?.count ?? 0);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  });

  perfEnd("[getFactoriesAction]", tActionStart);
  return res;
}
