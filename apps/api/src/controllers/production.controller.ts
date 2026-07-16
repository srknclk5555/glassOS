import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { success, created, noContent, sendError } from "../lib/response.js";
import { NotFoundError } from "../lib/errors.js";
import { getCurrentUser, requireRole } from "../lib/auth.js";
import { Roles } from "../lib/config.js";
import {
  createProductionSchema,
  assignToStationSchema,
  transferProductionSchema,
  updateStatusSchema,
} from "../dto/production.dto.js";
import type { ProductionService } from "@repo/db";

export function createProductionRouter(services: { production: ProductionService }) {
  const router = new Hono();

  /* GET / — find pending cutting, optional orderLineId query param */
  router.get("/", async (c) => {
    try {
      const orderLineId = c.req.query("orderLineId");
      const productions = await services.production.findPendingCutting(orderLineId ?? undefined);
      return success(c, productions);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /:id — find by id */
  router.get("/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const production = await services.production.findById(id);
      if (!production) throw new NotFoundError("ProductionOrder", id);
      return success(c, production);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /by-order-line/:orderLineId — find by order line */
  router.get("/by-order-line/:orderLineId", async (c) => {
    try {
      const orderLineId = c.req.param("orderLineId");
      const productions = await services.production.findByOrderLine(orderLineId);
      return success(c, productions);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST / — create production order */
  router.post("/", zValidator("json", createProductionSchema), async (c) => {
    try {
      const user = getCurrentUser(c);
      const data = c.req.valid("json");
      const production = await services.production.createProductionOrder({
        ...data,
        tenantId: user.tenantId,
        factoryId: user.factoryId,
      });
      return created(c, production);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /:id/assign-station — assign to station (Operator+) */
  router.post("/:id/assign-station", requireRole(Roles.Operator), zValidator("json", assignToStationSchema), async (c) => {
    try {
      const user = getCurrentUser(c);
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const result = await services.production.assignToStation(id, data.stationId, { userId: user.sub });
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /:id/transfer — transfer production (Operator+) */
  router.post("/:id/transfer", requireRole(Roles.Operator), zValidator("json", transferProductionSchema), async (c) => {
    try {
      const user = getCurrentUser(c);
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const result = await services.production.transferProduction(id, data.targetStationId, data.targetOperation, { userId: user.sub });
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* PATCH /:id/status — update status (Operator+) */
  router.patch("/:id/status", requireRole(Roles.Operator), zValidator("json", updateStatusSchema), async (c) => {
    try {
      const user = getCurrentUser(c);
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const result = await services.production.updateStatus(id, data.status, { userId: user.sub });
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /:id/validate — validate production */
  router.get("/:id/validate", async (c) => {
    try {
      const id = c.req.param("id");
      const result = await services.production.validateProduction(id);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  return router;
}
