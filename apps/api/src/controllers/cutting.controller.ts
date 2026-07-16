import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { success, created, noContent, sendError } from "../lib/response.js";
import { NotFoundError } from "../lib/errors.js";
import { getCurrentUser, requireRole } from "../lib/auth.js";
import { Roles } from "../lib/config.js";
import {
  createCuttingSessionSchema,
  registerBreakageSchema,
} from "../dto/cutting.dto.js";
import type { CuttingExecutionService } from "@repo/db";

export function createCuttingRouter(services: { cutting: CuttingExecutionService }) {
  const router = new Hono();

  /* POST /sessions — create cutting session (Operator+) */
  router.post("/sessions", requireRole(Roles.Operator), zValidator("json", createCuttingSessionSchema), async (c) => {
    try {
      const user = getCurrentUser(c);
      const data = c.req.valid("json");
      const session = await services.cutting.createSession({
        ...data,
        tenantId: user.tenantId,
        factoryId: user.factoryId,
      });
      return created(c, session);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /sessions/:id/start — start session */
  router.post("/sessions/:id/start", async (c) => {
    try {
      const id = c.req.param("id");
      await services.cutting.startSession(id);
      return noContent(c);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /sessions/:id/complete — complete session */
  router.post("/sessions/:id/complete", async (c) => {
    try {
      const id = c.req.param("id");
      await services.cutting.completeSession(id);
      return noContent(c);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /sessions/:id/pause — pause session */
  router.post("/sessions/:id/pause", async (c) => {
    try {
      const id = c.req.param("id");
      await services.cutting.pauseSession(id);
      return noContent(c);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /sessions/:id/resume — resume session */
  router.post("/sessions/:id/resume", async (c) => {
    try {
      const id = c.req.param("id");
      await services.cutting.resumeSession(id);
      return noContent(c);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /sessions/:id/cancel — cancel session */
  router.post("/sessions/:id/cancel", async (c) => {
    try {
      const id = c.req.param("id");
      await services.cutting.cancelSession(id);
      return noContent(c);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /sessions/:id/work-queue — load work queue */
  router.get("/sessions/:id/work-queue", async (c) => {
    try {
      const id = c.req.param("id");
      const queue = await services.cutting.loadWorkQueue(id);
      return success(c, queue);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /sessions/:id/basket — add item to basket */
  router.post("/sessions/:id/basket", zValidator("json", z.object({ productionOrderId: z.string() })), async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const result = await services.cutting.addItemToBasket(id, data.productionOrderId);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* DELETE /sessions/:id/basket/:productionId — remove item from basket */
  router.delete("/sessions/:id/basket/:productionId", async (c) => {
    try {
      const id = c.req.param("id");
      const productionId = c.req.param("productionId");
      await services.cutting.removeItemFromBasket(id, productionId);
      return noContent(c);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /sessions/:id/statistics — get session statistics */
  router.get("/sessions/:id/statistics", async (c) => {
    try {
      const id = c.req.param("id");
      const stats = await services.cutting.getSessionStatistics(id);
      return success(c, stats);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /breakage — register breakage (Operator+) */
  router.post("/breakage", requireRole(Roles.Operator), zValidator("json", registerBreakageSchema), async (c) => {
    try {
      const user = getCurrentUser(c);
      const data = c.req.valid("json");
      const result = await services.cutting.registerBreakage({
        ...data,
        tenantId: user.tenantId,
        factoryId: user.factoryId,
      });
      return created(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  return router;
}
