import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { success, created, sendError } from "../lib/response.js";
import { NotFoundError } from "../lib/errors.js";
import { getCurrentUser, requireRole } from "../lib/auth.js";
import { Roles } from "../lib/config.js";
import {
  createReworkSchema,
  createBreakageReworkSchema,
  mergeReworkSchema,
} from "../dto/rework.dto.js";
import type { ReworkService } from "@repo/db";

export function createReworkRouter(services: { rework: ReworkService }) {
  const router = new Hono();

  /* POST / — create rework order (Operator+) */
  router.post("/", requireRole(Roles.Operator), zValidator("json", createReworkSchema), async (c) => {
    try {
      const user = getCurrentUser(c);
      const data = c.req.valid("json");
      const rework = await services.rework.createReworkOrder({
        ...data,
        tenantId: user.tenantId,
        factoryId: user.factoryId,
      });
      return created(c, rework);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /breakage — create breakage rework (Operator+) */
  router.post("/breakage", requireRole(Roles.Operator), zValidator("json", createBreakageReworkSchema), async (c) => {
    try {
      const user = getCurrentUser(c);
      const data = c.req.valid("json");
      const rework = await services.rework.createBreakageRework({
        ...data,
        tenantId: user.tenantId,
        factoryId: user.factoryId,
      });
      return created(c, rework);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET / — find open reworks */
  router.get("/", async (c) => {
    try {
      const reworks = await services.rework.findOpenReworks();
      return success(c, reworks);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /:id — find rework by id */
  router.get("/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const rework = await services.rework.findById(id);
      if (!rework) throw new NotFoundError("Rework", id);
      return success(c, rework);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /by-parent/:parentId — find by parent order */
  router.get("/by-parent/:parentId", async (c) => {
    try {
      const parentId = c.req.param("parentId");
      const reworks = await services.rework.findByParentOrder(parentId);
      return success(c, reworks);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /:id/merge-prep — get merge preparation */
  router.get("/:id/merge-prep", async (c) => {
    try {
      const id = c.req.param("id");
      const prep = await services.rework.getMergePreparation(id);
      return success(c, prep);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /:id/merge — merge rework */
  router.post("/:id/merge", zValidator("json", mergeReworkSchema), async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const result = await services.rework.mergeRework(id, data);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  return router;
}
