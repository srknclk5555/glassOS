"use server";

import { db, eq, and, sql, desc, gte } from "@repo/db";
import {
  productionOrders,
  productionQueueItems,
  orderLines,
  orders,
  customers,
  stations,
  machines,
} from "@repo/db";
import { requireSession } from "@/lib/session";
import { withTenantSession } from "@/lib/dbSession";
import {
  ACTIVE_STATUSES,
  STAGE_LABEL_MAP,
  formatRow,
  resolveCompletedSince,
} from "./production-shared";
import type {
  CompletedFilter,
  ProductionWorkspaceData,
  StageCount,
} from "./production-shared";

/* ─── Server Action ──────────────────────────────────────────── */

export async function getProductionWorkspaceData(
  completedFilter: CompletedFilter = "today",
): Promise<ProductionWorkspaceData> {
  const session = await requireSession();
  const tenantId = session.user.tenantId;

  return withTenantSession(session, async (tx: any) => {
    /* ═══════════════════════════════════════════════════════════
       1. Stage Counts — count active orders grouped by operation
       ═══════════════════════════════════════════════════════════ */
    const stageRows = await tx
      .select({
        currentOperation: productionOrders.currentOperation,
        count: sql<number>`count(*)::int`,
      })
      .from(productionOrders)
      .where(
        and(
          eq(productionOrders.tenantId, tenantId),
          // Only count orders that are actually active
          sql`${productionOrders.currentStatus} IN (${sql.join(ACTIVE_STATUSES.map(s => sql`${s}`), sql`, `)})`,
          // Exclude deleted
          sql`${productionOrders.deletedAt} IS NULL`,
        ),
      )
      .groupBy(productionOrders.currentOperation);

    const stageCounts: StageCount[] = stageRows
      .filter((r: any) => r.currentOperation) // skip null
      .map((r: any) => ({
        operation: r.currentOperation,
        labelKey: STAGE_LABEL_MAP[r.currentOperation] ?? `stage.${r.currentOperation}`,
        count: r.count,
      }));

    /* ═══════════════════════════════════════════════════════════
       2. Status Counts (for legacy summary fields)
       ═══════════════════════════════════════════════════════════ */
    const statusRows = await tx
      .select({
        status: productionOrders.currentStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(productionOrders)
      .where(
        and(
          eq(productionOrders.tenantId, tenantId),
          sql`${productionOrders.deletedAt} IS NULL`,
        ),
      )
      .groupBy(productionOrders.currentStatus);

    const statusCountMap = new Map<string, number>();
    for (const row of statusRows) {
      statusCountMap.set(row.status, row.count);
    }

    /* ═══════════════════════════════════════════════════════════
       3. Completed Today
       ═══════════════════════════════════════════════════════════ */
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const completedTodayResult = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(productionOrders)
      .where(
        and(
          eq(productionOrders.tenantId, tenantId),
          eq(productionOrders.currentStatus, "completed"),
          gte(productionOrders.completedAt, todayStart),
          sql`${productionOrders.deletedAt} IS NULL`,
        ),
      );
    const completedToday = completedTodayResult[0]?.count ?? 0;

    /* ═══════════════════════════════════════════════════════════
       4. Active Jobs (pending + in_progress) — full detail
       ═══════════════════════════════════════════════════════════ */
    const activeRows = await tx
      .select({
        /* ── Production order fields ── */
        id: productionOrders.id,
        glassBarcode: productionOrders.glassBarcode,
        productType: productionOrders.productType,
        currentOperation: productionOrders.currentOperation,
        currentStatus: productionOrders.currentStatus,
        isRework: productionOrders.isRework,
        revisionNumber: productionOrders.revisionNumber,
        widthMm: productionOrders.widthMm,
        heightMm: productionOrders.heightMm,
        notes: productionOrders.notes,
        createdAt: productionOrders.createdAt,
        updatedAt: productionOrders.updatedAt,
        completedAt: productionOrders.completedAt,
        /* ── Order + customer fields ── */
        orderNumber: orders.orderNumber,
        customerName: customers.name,
        dueDate: orders.dueDate,
        /* ── Glass temper extras ── */
        machineName: sql<string>`(
          SELECT m.name FROM ${machines} m
          WHERE m.station_id = ${stations.id}
            AND m.is_active = true
          LIMIT 1
        )`,
        priority: sql<number>`(
          SELECT MIN(pqi.priority) FROM ${productionQueueItems} pqi
          WHERE pqi.production_order_id = ${productionOrders.id}
        )`,
        remainingPieces: sql<number | null>`
          ${orderLines.quantity} - COALESCE(${orderLines.completedQuantity}, 0)
        `,
        totalPieces: orderLines.quantity,
        completedPieces: orderLines.completedQuantity,
      })
      .from(productionOrders)
      .leftJoin(orderLines, eq(productionOrders.orderLineId, orderLines.id))
      .leftJoin(orders, eq(orderLines.orderId, orders.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(stations, eq(productionOrders.currentStationId, stations.id))
      .where(
        and(
          eq(productionOrders.tenantId, tenantId),
          sql`${productionOrders.currentStatus} IN (${sql.join(ACTIVE_STATUSES.map(s => sql`${s}`), sql`, `)})`,
          sql`${productionOrders.deletedAt} IS NULL`,
        ),
      )
      .orderBy(desc(productionOrders.updatedAt));

    /* ═══════════════════════════════════════════════════════════
       5. Recent Completed (filtered by completedFilter)
       ═══════════════════════════════════════════════════════════ */
    const { since } = resolveCompletedSince(completedFilter);

    const recentRows = await tx
      .select({
        id: productionOrders.id,
        glassBarcode: productionOrders.glassBarcode,
        productType: productionOrders.productType,
        currentOperation: productionOrders.currentOperation,
        currentStatus: productionOrders.currentStatus,
        isRework: productionOrders.isRework,
        revisionNumber: productionOrders.revisionNumber,
        widthMm: productionOrders.widthMm,
        heightMm: productionOrders.heightMm,
        notes: productionOrders.notes,
        createdAt: productionOrders.createdAt,
        updatedAt: productionOrders.updatedAt,
        completedAt: productionOrders.completedAt,
        orderNumber: orders.orderNumber,
        customerName: customers.name,
        dueDate: orders.dueDate,
        machineName: sql<string>`(
          SELECT m.name FROM ${machines} m
          WHERE m.station_id = ${stations.id}
            AND m.is_active = true
          LIMIT 1
        )`,
        priority: sql<number>`(
          SELECT MIN(pqi.priority) FROM ${productionQueueItems} pqi
          WHERE pqi.production_order_id = ${productionOrders.id}
        )`,
        remainingPieces: sql<number | null>`
          ${orderLines.quantity} - COALESCE(${orderLines.completedQuantity}, 0)
        `,
        totalPieces: orderLines.quantity,
        completedPieces: orderLines.completedQuantity,
      })
      .from(productionOrders)
      .leftJoin(orderLines, eq(productionOrders.orderLineId, orderLines.id))
      .leftJoin(orders, eq(orderLines.orderId, orders.id))
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(stations, eq(productionOrders.currentStationId, stations.id))
      .where(
        and(
          eq(productionOrders.tenantId, tenantId),
          eq(productionOrders.currentStatus, "completed"),
          gte(productionOrders.completedAt, since),
          sql`${productionOrders.deletedAt} IS NULL`,
        ),
      )
      .orderBy(desc(productionOrders.completedAt))
      .limit(50);

    return {
      summary: {
        /* Legacy */
        activeJobs: statusCountMap.get("in_progress") ?? 0,
        completedToday,
        pendingJobs: statusCountMap.get("pending") ?? 0,
        brokenJobs: statusCountMap.get("broken") ?? 0,
        reworkJobs: statusCountMap.get("rework") ?? 0,
        /* Glass-industry stage counts */
        stageCounts,
      },
      activeJobs: activeRows.map(formatRow),
      recentCompleted: recentRows.map(formatRow),
    };
  });
}
