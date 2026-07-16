import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { success, created, noContent, sendError } from "../lib/response.js";
import { NotFoundError } from "../lib/errors.js";
import { getCurrentUser } from "../lib/auth.js";
import {
  startInspectionSchema,
  completeInspectionSchema,
  rejectInspectionSchema,
  approveInspectionSchema,
} from "../dto/quality.dto.js";
import type { QualityControlService } from "@repo/db";

export function createQualityRouter(services: { quality: QualityControlService }) {
  const router = new Hono();

  /* POST /inspections — start inspection */
  router.post("/inspections", zValidator("json", startInspectionSchema), async (c) => {
    try {
      const data = c.req.valid("json");
      const inspection = await services.quality.startInspection(data);
      return created(c, inspection);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /inspections/:id/complete — complete inspection */
  router.post("/inspections/:id/complete", zValidator("json", completeInspectionSchema), async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const result = await services.quality.completeInspection(id, data.result, data.completedBy);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /inspections/:id/reject — reject inspection */
  router.post("/inspections/:id/reject", zValidator("json", rejectInspectionSchema), async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const result = await services.quality.rejectInspection(id, data.reason);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /inspections/:id/approve — approve inspection */
  router.post("/inspections/:id/approve", zValidator("json", approveInspectionSchema), async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const result = await services.quality.approveInspection(id, data.approvedBy);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /inspections/:id/measurements — record measurements */
  router.post("/inspections/:id/measurements", zValidator("json", z.object({ measurements: z.any() })), async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const result = await services.quality.recordMeasurements(id, data.measurements);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /inspections/:id/visual — record visual inspection */
  router.post("/inspections/:id/visual", zValidator("json", z.object({ visualResult: z.any() })), async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const result = await services.quality.recordVisualInspection(id, data.visualResult);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /inspections/:id/notes — record notes */
  router.post("/inspections/:id/notes", zValidator("json", z.object({ notes: z.string() })), async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const result = await services.quality.recordNotes(id, data.notes);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /inspections — get inspection history */
  router.get("/inspections", async (c) => {
    try {
      const productionOrderId = c.req.query("productionOrderId");
      const history = await services.quality.getHistory(productionOrderId ?? undefined);
      return success(c, history);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /statistics — get quality statistics */
  router.get("/statistics", async (c) => {
    try {
      const stats = await services.quality.getStatistics();
      return success(c, stats);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /can-proceed/:productionId — check if can proceed to ready */
  router.get("/can-proceed/:productionId", async (c) => {
    try {
      const productionId = c.req.param("productionId");
      const result = await services.quality.canProceedToReady(productionId);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  return router;
}
