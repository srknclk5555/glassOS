import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { success, created, noContent, sendError } from "../lib/response.js";
import { NotFoundError } from "../lib/errors.js";
import { getCurrentUser, requireRole } from "../lib/auth.js";
import { Roles } from "../lib/config.js";
import {
  createDispatchSchema,
  createDeliverySchema,
  assignVehicleSchema,
  assignDriverSchema,
  assignDispatcherSchema,
  loadVehicleSchema,
  completeDeliverySchema,
  partialDeliverySchema,
  cancelDispatchSchema,
} from "../dto/dispatch.dto.js";
import type { DispatchService } from "@repo/db";

const readyPoolFilterSchema = z.object({
  customerId: z.string().optional(),
  orderId: z.string().optional(),
  orderLineId: z.string().optional(),
  productType: z.string().optional(),
});

export function createDispatchRouter(services: { dispatch: DispatchService }) {
  const router = new Hono();

  /* GET /ready-productions — list ready productions */
  router.get("/ready-productions", zValidator("query", readyPoolFilterSchema), async (c) => {
    try {
      const filters = c.req.valid("query");
      const productions = await services.dispatch.getReadyProductions(filters);
      return success(c, productions);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /ready-order-lines — list ready order lines */
  router.get("/ready-order-lines", zValidator("query", readyPoolFilterSchema), async (c) => {
    try {
      const filters = c.req.valid("query");
      const lines = await services.dispatch.getReadyOrderLines(filters);
      return success(c, lines);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /basket — get basket */
  router.get("/basket", async (c) => {
    try {
      const contents = await services.dispatch.getBasket();
      return success(c, contents);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /basket/statistics — get basket statistics */
  router.get("/basket/statistics", async (c) => {
    try {
      const stats = await services.dispatch.getBasketStatistics();
      return success(c, stats);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /basket — add to basket */
  router.post("/basket", zValidator("json", z.object({ productionOrderId: z.string() })), async (c) => {
    try {
      const data = c.req.valid("json");
      const result = await services.dispatch.addToBasket(data.productionOrderId);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* DELETE /basket/:productionId — remove from basket */
  router.delete("/basket/:productionId", async (c) => {
    try {
      const productionId = c.req.param("productionId");
      await services.dispatch.removeFromBasket(productionId);
      return noContent(c);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST / — create dispatch (Production Manager+) */
  router.post("/", requireRole(Roles.ProductionManager), zValidator("json", createDispatchSchema), async (c) => {
    try {
      const data = c.req.valid("json");
      const dispatch = await services.dispatch.createDispatch(data);
      return created(c, dispatch);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /deliveries — create delivery (Production Manager+) */
  router.post("/deliveries", requireRole(Roles.ProductionManager), zValidator("json", createDeliverySchema), async (c) => {
    try {
      const data = c.req.valid("json");
      const delivery = await services.dispatch.createDelivery(data);
      return created(c, delivery);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /deliveries/:id/assign-vehicle — assign vehicle */
  router.post("/deliveries/:id/assign-vehicle", zValidator("json", assignVehicleSchema), async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const result = await services.dispatch.assignVehicle(id, data.vehicleId, data.driverId, data.dispatcherId);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /deliveries/:id/assign-driver — assign driver */
  router.post("/deliveries/:id/assign-driver", zValidator("json", assignDriverSchema), async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const result = await services.dispatch.assignDriver(id, data.driverId);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /deliveries/:id/assign-dispatcher — assign dispatcher */
  router.post("/deliveries/:id/assign-dispatcher", zValidator("json", assignDispatcherSchema), async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const result = await services.dispatch.assignDispatcher(id, data.dispatcherId);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /deliveries/:id/load — load vehicle */
  router.post("/deliveries/:id/load", zValidator("json", loadVehicleSchema), async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const result = await services.dispatch.loadVehicle(id, data.loadedBy);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /deliveries/:id/unload — unload vehicle */
  router.post("/deliveries/:id/unload", async (c) => {
    try {
      const id = c.req.param("id");
      await services.dispatch.unloadVehicle(id);
      return noContent(c);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /deliveries/:id/ship — start shipment */
  router.post("/deliveries/:id/ship", async (c) => {
    try {
      const id = c.req.param("id");
      await services.dispatch.startShipment(id);
      return noContent(c);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /deliveries/:id/deliver — complete delivery */
  router.post("/deliveries/:id/deliver", zValidator("json", completeDeliverySchema), async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const result = await services.dispatch.completeDelivery(id, data.deliveredBy);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /deliveries/:id/partial-deliver — partial delivery */
  router.post("/deliveries/:id/partial-deliver", zValidator("json", partialDeliverySchema), async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const result = await services.dispatch.completePartialDelivery(id, data.deliveredOrderLineIds, data.deliveredBy);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /deliveries/:id/cancel — cancel dispatch */
  router.post("/deliveries/:id/cancel", zValidator("json", cancelDispatchSchema), async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const result = await services.dispatch.cancelDispatch(id, data.reason);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /deliveries — get delivery history */
  router.get("/deliveries", async (c) => {
    try {
      const productionOrderId = c.req.query("productionOrderId");
      const history = await services.dispatch.getDeliveryHistory(productionOrderId ?? undefined);
      return success(c, history);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /deliveries/stats — get delivery statistics */
  router.get("/deliveries/stats", async (c) => {
    try {
      const stats = await services.dispatch.getDeliveryStatistics();
      return success(c, stats);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /deliveries/counters/:orderLineId — get order line delivery counters */
  router.get("/deliveries/counters/:orderLineId", async (c) => {
    try {
      const orderLineId = c.req.param("orderLineId");
      const counters = await services.dispatch.getOrderLineDeliveryCounters(orderLineId);
      return success(c, counters);
    } catch (err) {
      return sendError(c, err);
    }
  });

  return router;
}
