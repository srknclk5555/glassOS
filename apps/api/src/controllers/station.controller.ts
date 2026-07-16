import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { success, created, noContent, sendError } from "../lib/response.js";
import { NotFoundError } from "../lib/errors.js";
import { getCurrentUser } from "../lib/auth.js";
import {
  startOperationSchema,
  completeOperationSchema,
  cancelOperationSchema,
  rejectOperationSchema,
  validateLowESchema,
  furnaceCapacitySchema,
  waitingPoolSchema,
} from "../dto/station.dto.js";
import type { StationOperationService } from "@repo/db";

export function createStationRouter(services: { station: StationOperationService }) {
  const router = new Hono();

  /* POST /operations — start operation */
  router.post("/operations", zValidator("json", startOperationSchema), async (c) => {
    try {
      const data = c.req.valid("json");
      const operation = await services.station.startOperation(data);
      return created(c, operation);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /operations/complete — complete operation */
  router.post("/operations/complete", zValidator("json", completeOperationSchema), async (c) => {
    try {
      const data = c.req.valid("json");
      const result = await services.station.completeOperation(data);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /operations/cancel — cancel operation */
  router.post("/operations/cancel", zValidator("json", cancelOperationSchema), async (c) => {
    try {
      const data = c.req.valid("json");
      const result = await services.station.cancelOperation(data.productionOrderId, data.stationId, data.reason);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /operations/reject — reject operation */
  router.post("/operations/reject", zValidator("json", rejectOperationSchema), async (c) => {
    try {
      const data = c.req.valid("json");
      const result = await services.station.rejectOperation(data);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /operations/validate — validate operation */
  router.post("/operations/validate", zValidator("json", z.object({ productionOrderId: z.string(), targetStationId: z.string() })), async (c) => {
    try {
      const data = c.req.valid("json");
      const result = await services.station.validateOperation(data.productionOrderId, data.targetStationId);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /operations/validate-low-e — validate low E */
  router.post("/operations/validate-low-e", zValidator("json", validateLowESchema), async (c) => {
    try {
      const data = c.req.valid("json");
      const result = await services.station.validateLowE(data.productionOrderId ?? "unknown", data.lowEType, data.targetStationId);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /operations/furnace-capacity — calculate furnace capacity */
  router.post("/operations/furnace-capacity", zValidator("json", furnaceCapacitySchema), async (c) => {
    try {
      const data = c.req.valid("json");
      const result = await services.station.calculateFurnaceCapacity(data.areaM2, data.isTemperedIG);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /waiting-pool — add to waiting pool */
  router.post("/waiting-pool", zValidator("json", waitingPoolSchema), async (c) => {
    try {
      const data = c.req.valid("json");
      const result = await services.station.addToWaitingPool(data.productionOrderId, data.stationId, data.priority, data.notes);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* DELETE /waiting-pool/:productionId — remove from waiting pool */
  router.delete("/waiting-pool/:productionId", async (c) => {
    try {
      const productionId = c.req.param("productionId");
      const stationId = c.req.query("stationId") ?? "";
      await services.station.removeFromWaitingPool(productionId, stationId);
      return noContent(c);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /waiting-pool/:stationId — get waiting pool */
  router.get("/waiting-pool/:stationId", async (c) => {
    try {
      const stationId = c.req.param("stationId");
      const pool = await services.station.getWaitingPool(stationId);
      return success(c, pool);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /waiting-pool/statistics — get waiting pool statistics */
  router.get("/waiting-pool/statistics", async (c) => {
    try {
      const stats = await services.station.getWaitingPoolStatistics();
      return success(c, stats);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /waiting-pool/load/:stationId — load waiting production */
  router.post("/waiting-pool/load/:stationId", async (c) => {
    try {
      const stationId = c.req.param("stationId");
      const result = await services.station.loadWaitingProduction(stationId);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /history — get operation history */
  router.get("/history", async (c) => {
    try {
      const productionOrderId = c.req.query("productionOrderId");
      const history = await services.station.getOperationHistory(productionOrderId ?? undefined);
      return success(c, history);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /history/:stationId — get station operation history */
  router.get("/history/:stationId", async (c) => {
    try {
      const stationId = c.req.param("stationId");
      const history = await services.station.getStationOperationHistory(stationId);
      return success(c, history);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /statistics — get all station statistics */
  router.get("/statistics", async (c) => {
    try {
      const stats = await services.station.getAllStationStatistics();
      return success(c, stats);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /statistics/:stationId — get station statistics */
  router.get("/statistics/:stationId", async (c) => {
    try {
      const stationId = c.req.param("stationId");
      const stats = await services.station.getStationStatistics(stationId);
      return success(c, stats);
    } catch (err) {
      return sendError(c, err);
    }
  });

  return router;
}
