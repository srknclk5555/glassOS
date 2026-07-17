"use server";

import { revalidatePath } from "next/cache";
import { db, eq, and, sql, desc, asc, isNull } from "@repo/db";
import {
  productionOrders,
  productionQueueItems,
  productionQueues,
  productionOperations,
  productionEvents,
  stations,
  machines,
  orders,
  orderLines,
  customers,
} from "@repo/db";
import { requireSession } from "@/lib/session";
import { withTenantSession } from "@/lib/dbSession";
import { perfLog, perfStart, perfEnd } from "@/lib/perf";

/* ─── Types ──────────────────────────────────────────────────── */

export interface QueueJobItem {
  id: string;
  glassBarcode: string;
  orderNumber: string;
  customerName: string;
  operation: string;
  stationName: string;
  pieces: number;
  widthMm: number;
  heightMm: number;
  areaM2: number;
  priority: number;
  estimatedTime?: string;
  createdAt: string;
  status: string;
  isRework: boolean;
  queueItemId: string;
}

export interface StationFilter {
  id: string;
  name: string;
  stationType: string;
}

export interface MachineFilter {
  id: string;
  name: string;
  machineType: string;
}

export interface OperationFilter {
  operationCode: string;
  operationName: string;
}

export interface ActiveWorkItem {
  id: string;
  glassBarcode: string;
  orderNumber: string;
  customerName: string;
  operation: string;
  stationName: string;
  machineName?: string;
  pieces: number;
  piecesCompleted: number;
  piecesRemaining: number;
  startedAt: string;
  elapsedMinutes: number;
  progress: number;
  status: string;
}

export interface QueueSummary {
  waitingJobs: number;
  runningJobs: number;
  completedToday: number;
  avgQueueTimeMinutes: number;
}

export interface QueueDetail {
  id: string;
  glassBarcode: string;
  orderNumber: string;
  customerName: string;
  operation: string;
  stationName: string;
  widthMm: number;
  heightMm: number;
  pieces: number;
  areaM2: number;
  priority: number;
  status: string;
  isRework: boolean;
  recipeName?: string;
  notes?: string;
  createdAt: string;
  timeline: {
    eventType: string;
    timestamp: string;
    fromOperation?: string;
    toOperation?: string;
  }[];
}

export interface QueueData {
  jobs: QueueJobItem[];
  stations: StationFilter[];
  machines: MachineFilter[];
  operations: OperationFilter[];
  activeWork: ActiveWorkItem | null;
  summary: QueueSummary;
}

/* ─── Server Actions ─────────────────────────────────────────── */

export async function getQueueData(): Promise<QueueData> {
  const tActionStart = perfStart("[getQueueData]");
  perfLog("[getQueueData]", "Started", Date.now());
  const session = await requireSession();
  const tenantId = session.user.tenantId;
  const userId = session.user.id;

  const res = await withTenantSession(session, async (tx: any) => {
    /* ── 1. Stations ── */
    const tStation = perfStart("[getQueueData] 1. Stations");
    const stationRows = await tx
      .select({
        id: stations.id,
        name: stations.name,
        stationType: stations.stationType,
      })
      .from(stations)
      .where(
        and(eq(stations.tenantId, tenantId), eq(stations.isActive, true))
      )
      .orderBy(asc(stations.sortOrder));
    perfEnd("[getQueueData] 1. Stations", tStation);

    /* ── 2. Machines ── */
    const tMachine = perfStart("[getQueueData] 2. Machines");
    const machineRows = await tx
      .select({
        id: machines.id,
        name: machines.name,
        machineType: machines.machineType,
      })
      .from(machines)
      .where(
        and(eq(machines.tenantId, tenantId), eq(machines.isActive, true))
      )
      .orderBy(asc(machines.name));
    perfEnd("[getQueueData] 2. Machines", tMachine);

    /* ── 3. Operations ── */
    const tOperation = perfStart("[getQueueData] 3. Operations");
    const operationRows = await tx
      .select({
        operationCode: productionOperations.operationCode,
        operationName: productionOperations.operationName,
      })
      .from(productionOperations)
      .where(
        and(
          eq(productionOperations.tenantId, tenantId),
          eq(productionOperations.isActive, true)
        )
      )
      .orderBy(asc(productionOperations.sortOrder));
    perfEnd("[getQueueData] 3. Operations", tOperation);

    /* ── 4. Queue jobs (waiting + assigned) ── */
    const tQueue = perfStart("[getQueueData] 4. Queue JOIN");
    const queueJoin = await tx
      .select({
        queueItemId: productionQueueItems.id,
        queueItemStatus: productionQueueItems.status,
        priority: productionQueueItems.priority,
        enteredAt: productionQueueItems.enteredAt,
        productionOrderId: productionOrders.id,
        glassBarcode: productionOrders.glassBarcode,
        prodStatus: productionOrders.currentStatus,
        isRework: productionOrders.isRework,
        prodWidth: productionOrders.widthMm,
        prodHeight: productionOrders.heightMm,
        orderLineId: productionOrders.orderLineId,
        queueOpCode: productionQueues.operationCode,
        stationId: productionQueues.stationId,
      })
      .from(productionQueueItems)
      .innerJoin(
        productionQueues,
        eq(productionQueueItems.queueId, productionQueues.id)
      )
      .innerJoin(
        productionOrders,
        eq(productionQueueItems.productionOrderId, productionOrders.id)
      )
      .where(
        and(
          eq(productionQueues.tenantId, tenantId),
          sql`${productionQueueItems.status} IN ('waiting', 'in_progress')`
        )
      )
      .orderBy(asc(productionQueueItems.priority));
    perfEnd("[getQueueData] 4. Queue JOIN", tQueue);

    /* Enrich with order + customer info */
    const tEnrich = perfStart("[getQueueData] 4b. Enrich queries");
    const orderLineIds = [
      ...new Set(queueJoin.map((j: any) => j.orderLineId)),
    ];
    const orderLineRows: { id: string; quantity: string; completedQuantity: number; orderId: string }[] = orderLineIds.length
      ? await tx
          .select({
            id: orderLines.id,
            quantity: orderLines.quantity,
            completedQuantity: orderLines.completedQuantity,
            orderId: orderLines.orderId,
          })
          .from(orderLines)
          .where(sql`${orderLines.id} = ANY(${orderLineIds})`)
      : [];

    const orderIds = [...new Set(orderLineRows.map((r: any) => r.orderId))];
    const orderRows: { id: string; orderNumber: string; customerId: string }[] = orderIds.length
      ? await tx
          .select({
            id: orders.id,
            orderNumber: orders.orderNumber,
            customerId: orders.customerId,
          })
          .from(orders)
          .where(sql`${orders.id} = ANY(${orderIds})`)
      : [];

    const customerIds = [
      ...new Set(orderRows.map((r: any) => r.customerId)),
    ];
    const customerRows: { id: string; name: string }[] = customerIds.length
      ? await tx
          .select({ id: customers.id, name: customers.name })
          .from(customers)
          .where(sql`${customers.id} = ANY(${customerIds})`)
      : [];
    perfEnd("[getQueueData] 4b. Enrich queries", tEnrich);

    const orderLineMap: Map<string, { id: string; quantity: string; completedQuantity: number; orderId: string }> = new Map(
      orderLineRows.map((r: any) => [r.id, r])
    );
    const orderMap: Map<string, { id: string; orderNumber: string; customerId: string }> = new Map(orderRows.map((r: any) => [r.id, r]));
    const customerMap: Map<string, string> = new Map(
      customerRows.map((r: any) => [r.id, r.name])
    );
    const stationMap: Map<string, string> = new Map(
      stationRows.map((r: any) => [r.id, r.name])
    );

    const jobs: QueueJobItem[] = queueJoin.map((j: any) => {
      const ol = orderLineMap.get(j.orderLineId);
      const ord = ol ? orderMap.get(ol.orderId) : undefined;
      const areaM2 =
        Number(j.prodWidth) * Number(j.prodHeight) / 1_000_000;
      return {
        id: j.productionOrderId,
        glassBarcode: j.glassBarcode,
        orderNumber: ord?.orderNumber ?? "",
        customerName: ord ? customerMap.get(ord.customerId) ?? "" : "",
        operation: j.queueOpCode,
        stationName: stationMap.get(j.stationId) ?? "",
        pieces: ol ? Number(ol.quantity) - Number(ol.completedQuantity) : 0,
        widthMm: Number(j.prodWidth),
        heightMm: Number(j.prodHeight),
        areaM2: Math.round(areaM2 * 100) / 100,
        priority: j.priority,
        createdAt:
          j.enteredAt?.toISOString() ?? new Date().toISOString(),
        status: j.queueItemStatus,
        isRework: j.isRework,
        queueItemId: j.queueItemId,
      };
    });

    /* ── 5. Active work for current user ── */
    const tActive = perfStart("[getQueueData] 5. Active work");
    const activeProdOrders = await tx
      .select({
        id: productionOrders.id,
        glassBarcode: productionOrders.glassBarcode,
        currentOperation: productionOrders.currentOperation,
        currentStationId: productionOrders.currentStationId,
        currentStatus: productionOrders.currentStatus,
        orderLineId: productionOrders.orderLineId,
        createdAt: productionOrders.createdAt,
        widthMm: productionOrders.widthMm,
        heightMm: productionOrders.heightMm,
      })
      .from(productionOrders)
      .where(
        and(
          eq(productionOrders.tenantId, tenantId),
          eq(productionOrders.currentStatus, "in_progress"),
          eq(productionOrders.updatedBy, userId)
        )
      )
      .limit(1);

    let activeWork: ActiveWorkItem | null = null;
    if (activeProdOrders.length > 0) {
      const a = activeProdOrders[0];
      const ol = orderLineMap.get(a.orderLineId);
      const ord = ol ? orderMap.get(ol.orderId) : undefined;
      const quantity = ol ? Number(ol.quantity) : 0;
      const completed = ol ? Number(ol.completedQuantity) : 0;

      const tEvent = perfStart("[getQueueData] 5b. Event query");
      const startEvent = await tx
        .select({ timestamp: productionEvents.createdAt })
        .from(productionEvents)
        .where(
          and(
            eq(productionEvents.productionOrderId, a.id),
            eq(productionEvents.eventType, "started")
          )
        )
        .orderBy(asc(productionEvents.createdAt))
        .limit(1);
      perfEnd("[getQueueData] 5b. Event query", tEvent);

      const startedAt = startEvent[0]?.timestamp ?? a.createdAt;
      const elapsedMs = Date.now() - new Date(startedAt).getTime();
      const elapsedMinutes = Math.floor(elapsedMs / 60_000);

      activeWork = {
        id: a.id,
        glassBarcode: a.glassBarcode,
        orderNumber: ord?.orderNumber ?? "",
        customerName: ord ? customerMap.get(ord.customerId) ?? "" : "",
        operation: a.currentOperation ?? "",
        stationName: stationMap.get(a.currentStationId ?? "") ?? "",
        pieces: quantity,
        piecesCompleted: completed,
        piecesRemaining: Math.max(0, quantity - completed),
        startedAt: startedAt.toISOString(),
        elapsedMinutes,
        progress: quantity > 0 ? Math.round((completed / quantity) * 100) : 0,
        status: a.currentStatus,
      };
    }
    perfEnd("[getQueueData] 5. Active work", tActive);

    /* ── 6. Summary ── */
    const tSummary = perfStart("[getQueueData] 6. Summary queries");
    const waitingJobs = jobs.filter(
      (j) => j.status === "waiting"
    ).length;

    const runningQuery = await tx
      .select({ count: sql<number>`COUNT(*)` })
      .from(productionOrders)
      .where(
        and(
          eq(productionOrders.tenantId, tenantId),
          eq(productionOrders.currentStatus, "in_progress")
        )
      );
    const runningJobs = Number(runningQuery[0]?.count ?? 0);

    const today = sql`date_trunc('day', now())`;
    const completedTodayQuery = await tx
      .select({ count: sql<number>`COUNT(*)` })
      .from(productionOrders)
      .where(
        and(
          eq(productionOrders.tenantId, tenantId),
          eq(productionOrders.currentStatus, "completed"),
          sql`${productionOrders.completedAt} >= ${today}`
        )
      );
    const completedToday = Number(completedTodayQuery[0]?.count ?? 0);

    /* For avg queue time, calculate from event logs */
    const avgTimeQuery = await tx
      .select({
        avg: sql<string | null>`AVG(EXTRACT(EPOCH FROM (${productionEvents.createdAt} - ${productionQueueItems.enteredAt})) * 1000)`,
      })
      .from(productionEvents)
      .innerJoin(
        productionQueueItems,
        eq(productionEvents.productionOrderId, productionQueueItems.productionOrderId)
      )
      .where(
        and(
          eq(productionEvents.eventType, "started"),
          sql`${productionQueueItems.enteredAt} IS NOT NULL`
        )
      );
    const avgMs = Number(avgTimeQuery[0]?.avg ?? 0);
    const avgQueueTimeMinutes = Math.round(avgMs / 60_000);
    perfEnd("[getQueueData] 6. Summary queries", tSummary);

    return {
      jobs,
      stations: stationRows,
      machines: machineRows,
      operations: operationRows,
      activeWork,
      summary: {
        waitingJobs,
        runningJobs,
        completedToday,
        avgQueueTimeMinutes,
      },
    };
  });

  perfEnd("[getQueueData]", tActionStart);
  return res;
}

export async function takeJobAction(productionOrderId: string) {
  const tActionStart = perfStart("[takeJobAction]");
  perfLog("[takeJobAction]", `Taking job ${productionOrderId}`, Date.now());
  const session = await requireSession();
  const res = await withTenantSession(session, async (tx: any) => {
    const tQuery = perfStart("[takeJobAction] SELECT");
    const prod = await tx
      .select()
      .from(productionOrders)
      .where(eq(productionOrders.id, productionOrderId))
      .limit(1)
      .then((r: any[]) => r[0]);
    perfEnd("[takeJobAction] SELECT", tQuery);
    if (!prod) throw new Error("Production order not found");

    const tUpdate = perfStart("[takeJobAction] UPDATE+INSERT");
    await tx
      .update(productionOrders)
      .set({
        currentStatus: "in_progress",
        updatedBy: session.user.id,
        updatedAt: sql`now()`,
      })
      .where(eq(productionOrders.id, productionOrderId));

    await tx.insert(productionEvents).values({
      id: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productionOrderId,
      eventType: "started",
      fromOperation: prod.currentOperation,
      toOperation: prod.currentOperation,
      stationId: prod.currentStationId,
    });
    perfEnd("[takeJobAction] UPDATE+INSERT", tUpdate);

    revalidatePath("/queue");
    return { ok: true };
  });

  perfEnd("[takeJobAction]", tActionStart);
  return res;
}

export async function pauseJobAction(productionOrderId: string) {
  const tActionStart = perfStart("[pauseJobAction]");
  perfLog("[pauseJobAction]", `Pausing job ${productionOrderId}`, Date.now());
  const session = await requireSession();
  const res = await withTenantSession(session, async (tx: any) => {
    const tQuery = perfStart("[pauseJobAction] UPDATE+INSERT");
    await tx
      .update(productionOrders)
      .set({
        currentStatus: "paused",
        updatedBy: session.user.id,
        updatedAt: sql`now()`,
      })
      .where(eq(productionOrders.id, productionOrderId));

    await tx.insert(productionEvents).values({
      id: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productionOrderId,
      eventType: "paused",
      stationId: null,
    });
    perfEnd("[pauseJobAction] UPDATE+INSERT", tQuery);

    revalidatePath("/queue");
    return { ok: true };
  });

  perfEnd("[pauseJobAction]", tActionStart);
  return res;
}

export async function completeJobAction(productionOrderId: string) {
  const tActionStart = perfStart("[completeJobAction]");
  perfLog("[completeJobAction]", `Completing job ${productionOrderId}`, Date.now());
  const session = await requireSession();
  const res = await withTenantSession(session, async (tx: any) => {
    const tQuery = perfStart("[completeJobAction] UPDATE+INSERT");
    await tx
      .update(productionOrders)
      .set({
        currentStatus: "completed",
        completedAt: sql`now()`,
        updatedBy: session.user.id,
        updatedAt: sql`now()`,
      })
      .where(eq(productionOrders.id, productionOrderId));

    await tx.insert(productionEvents).values({
      id: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productionOrderId,
      eventType: "completed",
      stationId: null,
    });

    /* Remove from queue items */
    await tx
      .update(productionQueueItems)
      .set({ status: "done" })
      .where(
        and(
          eq(productionQueueItems.productionOrderId, productionOrderId),
          sql`${productionQueueItems.status} != 'done'`
        )
      );
    perfEnd("[completeJobAction] UPDATE+INSERT", tQuery);

    revalidatePath("/queue");
    return { ok: true };
  });

  perfEnd("[completeJobAction]", tActionStart);
  return res;
}

export async function getJobDetailAction(
  productionOrderId: string
): Promise<QueueDetail | null> {
  const tActionStart = perfStart("[getJobDetailAction]");
  perfLog("[getJobDetailAction]", `Fetching detail for ${productionOrderId}`, Date.now());
  const session = await requireSession();
  const res = await withTenantSession(session, async (tx: any) => {
    const tQuery = perfStart("[getJobDetailAction] 1. Prod Order");
    const prod = await tx
      .select({
        id: productionOrders.id,
        glassBarcode: productionOrders.glassBarcode,
        currentOperation: productionOrders.currentOperation,
        currentStationId: productionOrders.currentStationId,
        currentStatus: productionOrders.currentStatus,
        isRework: productionOrders.isRework,
        orderLineId: productionOrders.orderLineId,
        widthMm: productionOrders.widthMm,
        heightMm: productionOrders.heightMm,
        notes: productionOrders.notes,
        createdAt: productionOrders.createdAt,
      })
      .from(productionOrders)
      .where(eq(productionOrders.id, productionOrderId))
      .limit(1)
      .then((r: any[]) => r[0]);
    perfEnd("[getJobDetailAction] 1. Prod Order", tQuery);

    if (!prod) return null;

    const tOrder = perfStart("[getJobDetailAction] 2. Order+Customer");
    const ol = await tx
      .select({
        quantity: orderLines.quantity,
        orderId: orderLines.orderId,
      })
      .from(orderLines)
      .where(eq(orderLines.id, prod.orderLineId))
      .limit(1)
      .then((r: any[]) => r[0]);

    const ord = ol
      ? await tx
          .select({ orderNumber: orders.orderNumber, customerId: orders.customerId })
          .from(orders)
          .where(eq(orders.id, ol.orderId))
          .limit(1)
          .then((r: any[]) => r[0])
      : null;

    const cust = ord
      ? await tx
          .select({ name: customers.name })
          .from(customers)
          .where(eq(customers.id, ord.customerId))
          .limit(1)
          .then((r: any[]) => r[0])
      : null;

    const stationName = prod.currentStationId
      ? await tx
          .select({ name: stations.name })
          .from(stations)
          .where(eq(stations.id, prod.currentStationId))
          .limit(1)
          .then((r: any[]) => r[0]?.name ?? "")
      : "";
    perfEnd("[getJobDetailAction] 2. Order+Customer", tOrder);

    const tTimeline = perfStart("[getJobDetailAction] 3. Timeline");
    const timeline = await tx
      .select({
        eventType: productionEvents.eventType,
        timestamp: productionEvents.createdAt,
        fromOperation: productionEvents.fromOperation,
        toOperation: productionEvents.toOperation,
      })
      .from(productionEvents)
      .where(eq(productionEvents.productionOrderId, productionOrderId))
      .orderBy(asc(productionEvents.createdAt));
    perfEnd("[getJobDetailAction] 3. Timeline", tTimeline);

    const areaM2 =
      Number(prod.widthMm) * Number(prod.heightMm) / 1_000_000;

    return {
      id: prod.id,
      glassBarcode: prod.glassBarcode,
      orderNumber: ord?.orderNumber ?? "",
      customerName: cust?.name ?? "",
      operation: prod.currentOperation ?? "",
      stationName,
      widthMm: Number(prod.widthMm),
      heightMm: Number(prod.heightMm),
      pieces: ol ? Number(ol.quantity) : 0,
      areaM2: Math.round(areaM2 * 100) / 100,
      priority: prod.isRework ? 1 : 100,
      status: prod.currentStatus,
      isRework: prod.isRework,
      notes: prod.notes ?? undefined,
      createdAt: prod.createdAt.toISOString(),
      timeline: timeline.map((t: any) => ({
        eventType: t.eventType,
        timestamp: t.timestamp.toISOString(),
        fromOperation: t.fromOperation ?? undefined,
        toOperation: t.toOperation ?? undefined,
      })),
    };
  });

  perfEnd("[getJobDetailAction]", tActionStart);
  return res;
}
