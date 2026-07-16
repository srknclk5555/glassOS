import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { success, created, noContent, sendError } from "../lib/response.js";
import { NotFoundError } from "../lib/errors.js";
import { getCurrentUser, requireRole } from "../lib/auth.js";
import { Roles } from "../lib/config.js";
import { createOrderSchema, updateOrderSchema } from "../dto/order.dto.js";
import type { OrderService } from "@repo/db";

export function createOrderRouter(services: { order: OrderService }) {
  const router = new Hono();

  /* GET /orders — list approved orders */
  router.get("/", async (c) => {
    try {
      const orders = await services.order.findApproved();
      return success(c, orders);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /orders/:id — find by id */
  router.get("/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const order = await services.order.findById(id);
      if (!order) throw new NotFoundError(`Order ${id} not found`);
      return success(c, order);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /orders — create order */
  router.post("/", zValidator("json", createOrderSchema), async (c) => {
    try {
      const user = getCurrentUser(c);
      const data = c.req.valid("json");
      const order = await services.order.create({
        ...data,
        tenantId: user.tenantId,
        factoryId: user.factoryId,
      });
      return created(c, order);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* PATCH /orders/:id — update order */
  router.patch("/:id", zValidator("json", updateOrderSchema), async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const order = await services.order.update(id, data);
      if (!order) throw new NotFoundError(`Order ${id} not found`);
      return success(c, order);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /orders/:id/approve — approve order (Production Manager+) */
  router.post("/:id/approve", requireRole(Roles.ProductionManager), async (c) => {
    try {
      const user = getCurrentUser(c);
      const id = c.req.param("id")!;
      const order = await services.order.approveOrder(id, { userId: user.sub });
      return success(c, order);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /orders/:id/cancel — cancel order (Production Manager+) */
  router.post("/:id/cancel", requireRole(Roles.ProductionManager), async (c) => {
    try {
      const user = getCurrentUser(c);
      const id = c.req.param("id")!;
      const order = await services.order.cancelOrder(id, { userId: user.sub });
      return success(c, order);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /orders/:id/lines — load order lines */
  router.get("/:id/lines", async (c) => {
    try {
      const id = c.req.param("id");
      const lines = await services.order.loadOrderLines(id);
      return success(c, lines);
    } catch (err) {
      return sendError(c, err);
    }
  });

  return router;
}
