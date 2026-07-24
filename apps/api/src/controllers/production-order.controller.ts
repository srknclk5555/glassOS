import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { success, created, sendError } from "../lib/response.js";
import { NotFoundError, ConflictError } from "../lib/errors.js";
import { getCurrentUser } from "../lib/auth.js";
import { paginated } from "../dto/common.dto.js";
import {
  createProductionOrderSchema,
  productionOrderListQuerySchema,
  updateProductionOrderStatusSchema,
} from "../dto/production-order.dto.js";
import { db, manufacturingOrders, manufacturingOrderItems, eq, desc, asc, like, sql, and, inArray, isNull } from "@repo/db";
import { ulidPattern } from "../dto/common.dto.js";

export function createProductionOrderRouter() {
  const router = new Hono();

  /* LIST */
  router.get("/", async (c) => {
    try {
      const query = productionOrderListQuerySchema.parse(c.req.query());
      const user = getCurrentUser(c);

      const conditions: any[] = [
        eq(manufacturingOrders.tenantId, user.tenantId),
        isNull(manufacturingOrders.deletedAt),
      ];

      if (query.search) {
        conditions.push(
          sql`(${manufacturingOrders.orderNo} ILIKE ${"%" + query.search + "%"} OR ${manufacturingOrders.customerName} ILIKE ${"%" + query.search + "%"})`
        );
      }

      if (query.status) {
        conditions.push(eq(manufacturingOrders.status, query.status));
      }

      const orderBy = query.sortBy === "createdAt"
        ? (query.sortOrder === "desc" ? desc(manufacturingOrders.createdAt) : asc(manufacturingOrders.createdAt))
        : query.sortBy === "dueDate"
          ? (query.sortOrder === "desc" ? desc(manufacturingOrders.dueDate) : asc(manufacturingOrders.dueDate))
          : desc(manufacturingOrders.createdAt);

      const offset = (query.page - 1) * query.limit;

      const [rows, countResult] = await Promise.all([
        db.select()
          .from(manufacturingOrders)
          .where(and(...conditions))
          .orderBy(orderBy)
          .limit(query.limit)
          .offset(offset),
        db.select({ count: sql<number>`count(*)` })
          .from(manufacturingOrders)
          .where(and(...conditions)),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      // Enrich rows with m² aggregates from engine snapshots
      const orderIds = rows.map(r => r.id);
      const aggregatesMap = new Map<string, { totalNetArea: number; totalProductionArea: number; totalGlassConsumption: number }>();

      if (orderIds.length > 0) {
        const itemAggs = await db.select({
          orderId: manufacturingOrderItems.orderId,
          totalNetArea: sql<number>`COALESCE(SUM((${manufacturingOrderItems.engineSnapshot}->'totals'->>'netAreaM2')::numeric), 0)`,
          totalProductionArea: sql<number>`COALESCE(SUM((${manufacturingOrderItems.engineSnapshot}->'totals'->>'productionAreaM2')::numeric), 0)`,
          totalGlassConsumption: sql<number>`COALESCE(SUM((${manufacturingOrderItems.engineSnapshot}->'totals'->>'totalGlassConsumptionM2')::numeric), 0)`,
        })
          .from(manufacturingOrderItems)
          .where(inArray(manufacturingOrderItems.orderId, orderIds))
          .groupBy(manufacturingOrderItems.orderId);

        for (const agg of itemAggs) {
          aggregatesMap.set(agg.orderId, {
            totalNetArea: Number(agg.totalNetArea),
            totalProductionArea: Number(agg.totalProductionArea),
            totalGlassConsumption: Number(agg.totalGlassConsumption),
          });
        }
      }

      const enrichedRows = rows.map(row => {
        const agg = aggregatesMap.get(row.id);
        return {
          ...row,
          totalNetArea: agg?.totalNetArea ?? 0,
          totalProductionArea: agg?.totalProductionArea ?? 0,
          totalGlassConsumption: agg?.totalGlassConsumption ?? 0,
        };
      });

      return success(c, paginated(enrichedRows, total, query.page, query.limit));
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET DETAIL (with items) */
  router.get("/:id", async (c) => {
    try {
      const id = c.req.param("id");

      if (!ulidPattern.test(id)) {
        throw new NotFoundError("ProductionOrder", id);
      }

      const order = await db.query.manufacturingOrders.findFirst({
        where: and(
          eq(manufacturingOrders.id, id),
          isNull(manufacturingOrders.deletedAt),
        ),
      });

      if (!order) {
        throw new NotFoundError("ProductionOrder", id);
      }

      const items = await db.select()
        .from(manufacturingOrderItems)
        .where(eq(manufacturingOrderItems.orderId, id))
        .orderBy(asc(manufacturingOrderItems.sequence));

      return success(c, { ...order, items });
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* CREATE */
  router.post("/", zValidator("json", createProductionOrderSchema), async (c) => {
    try {
      const user = getCurrentUser(c);
      const data = c.req.valid("json");

      // Check unique orderNo per tenant
      const existing = await db.select({ id: manufacturingOrders.id })
        .from(manufacturingOrders)
        .where(
          and(
            eq(manufacturingOrders.tenantId, user.tenantId),
            eq(manufacturingOrders.orderNo, data.orderNo),
            isNull(manufacturingOrders.deletedAt),
          )
        )
        .limit(1);

      if (existing.length > 0) {
        throw new ConflictError(`Order number "${data.orderNo}" already exists`);
      }

      const now = new Date();

      // Insert order
      await db.insert(manufacturingOrders).values({
        id: data.id,
        tenantId: user.tenantId,
        factoryId: user.factoryId,
        orderNo: data.orderNo,
        customerId: data.customerId || null,
        customerName: data.customerName || null,
        productionDate: data.productionDate ? new Date(data.productionDate) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: "draft",
        notes: data.notes || null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdBy: user.sub,
        updatedBy: user.sub,
      });

      // Insert items
      if (data.items.length > 0) {
        await db.insert(manufacturingOrderItems).values(
          data.items.map((item) => ({
            id: item.id,
            orderId: data.id,
            recipeId: item.recipeId,
            recipeCode: item.recipeCode || null,
            recipeName: item.recipeName || null,
            netWidthMm: String(item.netWidthMm),
            netHeightMm: String(item.netHeightMm),
            quantity: item.quantity,
            engineSnapshot: item.engineSnapshot ? JSON.stringify(item.engineSnapshot) : null,
            sequence: item.sequence,
            createdAt: now,
            updatedAt: now,
          }))
        );
      }

      // Return created order
      const order = await db.query.manufacturingOrders.findFirst({
        where: eq(manufacturingOrders.id, data.id),
      });

      const items = await db.select()
        .from(manufacturingOrderItems)
        .where(eq(manufacturingOrderItems.orderId, data.id))
        .orderBy(asc(manufacturingOrderItems.sequence));

      return created(c, { ...order, items });
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        return sendError(c, new ConflictError(err.message));
      }
      return sendError(c, err);
    }
  });

  /* UPDATE STATUS */
  router.patch("/:id/status", zValidator("json", updateProductionOrderStatusSchema), async (c) => {
    try {
      const id = c.req.param("id");
      if (!ulidPattern.test(id)) throw new NotFoundError("ProductionOrder", id);

      const user = getCurrentUser(c);
      const { status: newStatus } = c.req.valid("json");

      const order = await db.query.manufacturingOrders.findFirst({
  where: and(
    eq(manufacturingOrders.id, id),
    isNull(manufacturingOrders.deletedAt),
  ),
});
      if (!order) throw new NotFoundError("ProductionOrder", id);

      // Validate workflow transitions
      const validTransitions: Record<string, string[]> = {
        draft: ["ready", "released", "cancelled"],
        ready: ["released", "cancelled"],
        released: ["cancelled"],
        cancelled: [],
      };

      const allowed = validTransitions[order.status] ?? [];
      if (!allowed.includes(newStatus)) {
        throw new ConflictError(`Cannot transition from "${order.status}" to "${newStatus}"`);
      }

      const now = new Date();
      await db.update(manufacturingOrders)
        .set({ status: newStatus, updatedAt: now, updatedBy: user.sub })
        .where(eq(manufacturingOrders.id, id));

      const updated = await db.query.manufacturingOrders.findFirst({
        where: eq(manufacturingOrders.id, id),
      });

      return success(c, updated);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* SOFT DELETE */
  router.delete("/:id", async (c) => {
    try {
      const id = c.req.param("id");
      if (!ulidPattern.test(id)) throw new NotFoundError("ProductionOrder", id);

      const user = getCurrentUser(c);

const order = await db.query.manufacturingOrders.findFirst({
  where: and(
    eq(manufacturingOrders.id, id),
    isNull(manufacturingOrders.deletedAt),
  ),
});
      if (!order) throw new NotFoundError("ProductionOrder", id);

      if (order.status === "released") {
        throw new ConflictError("Cannot delete a released production order");
      }

      const now = new Date();
      await db.update(manufacturingOrders)
        .set({ deletedAt: now, deletedBy: user.sub, updatedAt: now, updatedBy: user.sub })
        .where(eq(manufacturingOrders.id, id));

      return success(c, { deleted: true });
    } catch (err) {
      return sendError(c, err);
    }
  });

  return router;
}
