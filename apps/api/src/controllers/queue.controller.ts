import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { success, created, noContent, sendError } from "../lib/response.js";
import { NotFoundError } from "../lib/errors.js";
import { getCurrentUser, requireRole } from "../lib/auth.js";
import { Roles } from "../lib/config.js";
import {
  createWorkQueueSchema,
  selectMaterialSchema,
} from "../dto/queue.dto.js";
import type { ProductionQueueService } from "@repo/db";

export function createQueueRouter(services: { queue: ProductionQueueService }) {
  const router = new Hono();

  /* POST / — create work queue (Operator+) */
  router.post("/", requireRole(Roles.Operator), zValidator("json", createWorkQueueSchema), async (c) => {
    try {
      const user = getCurrentUser(c);
      const data = c.req.valid("json");
      const queue = await services.queue.createWorkQueue({
        ...data,
        tenantId: user.tenantId,
        factoryId: user.factoryId,
      });
      return created(c, queue);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /:id/start — start queue */
  router.post("/:id/start", async (c) => {
    try {
      const id = c.req.param("id");
      await services.queue.startQueue(id);
      return noContent(c);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /:id/complete — complete queue */
  router.post("/:id/complete", async (c) => {
    try {
      const id = c.req.param("id");
      await services.queue.completeQueue(id);
      return noContent(c);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /:id/basket — add order line to basket */
  router.post("/:id/basket", zValidator("json", z.object({ productionOrderId: z.string() })), async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const result = await services.queue.addOrderLineToBasket(id, data.productionOrderId);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* DELETE /:id/basket/:productionId — remove order line from basket */
  router.delete("/:id/basket/:productionId", async (c) => {
    try {
      const id = c.req.param("id");
      const productionId = c.req.param("productionId");
      await services.queue.removeOrderLineFromBasket(id, productionId);
      return noContent(c);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /:id/statistics — get queue statistics */
  router.get("/:id/statistics", async (c) => {
    try {
      const id = c.req.param("id");
      const stats = await services.queue.getQueueStatistics(id);
      return success(c, stats);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET / — find active queues */
  router.get("/", async (c) => {
    try {
      const queues = await services.queue.findActiveQueues();
      return success(c, queues);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /approved-orders — load approved orders */
  router.get("/approved-orders", async (c) => {
    try {
      const orders = await services.queue.loadApprovedOrders();
      return success(c, orders);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /approved-lines — load approved order lines */
  router.get("/approved-lines", async (c) => {
    try {
      const lines = await services.queue.loadApprovedOrderLines();
      return success(c, lines);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /select-material — select material */
  router.post("/select-material", zValidator("json", selectMaterialSchema), async (c) => {
    try {
      const data = c.req.valid("json");
      const result = await services.queue.selectMaterial(data.materialId);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  return router;
}
