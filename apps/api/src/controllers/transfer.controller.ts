import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { success, created, noContent, sendError } from "../lib/response.js";
import { NotFoundError } from "../lib/errors.js";
import { getCurrentUser } from "../lib/auth.js";
import {
  initiateTransferSchema,
  returnTransferSchema,
  assignReadyStationSchema,
} from "../dto/transfer.dto.js";
import type { ProductionTransferService } from "@repo/db";

export function createTransferRouter(services: { transfer: ProductionTransferService }) {
  const router = new Hono();

  /* POST / — initiate transfer */
  router.post("/", zValidator("json", initiateTransferSchema), async (c) => {
    try {
      const data = c.req.valid("json");
      const transfer = await services.transfer.initiateTransfer(data);
      return created(c, transfer);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /:id/complete — complete transfer */
  router.post("/:id/complete", async (c) => {
    try {
      const id = c.req.param("id");
      await services.transfer.completeTransfer(id);
      return noContent(c);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /:id/cancel — cancel transfer */
  router.post("/:id/cancel", async (c) => {
    try {
      const id = c.req.param("id");
      const result = await services.transfer.cancelTransfer(id);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /:id/reject — reject transfer */
  router.post("/:id/reject", async (c) => {
    try {
      const id = c.req.param("id");
      const result = await services.transfer.rejectTransfer(id);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /return — return to previous station */
  router.post("/return", zValidator("json", returnTransferSchema), async (c) => {
    try {
      const data = c.req.valid("json");
      const result = await services.transfer.returnToPreviousStation(data);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /manual — manual transfer */
  router.post("/manual", zValidator("json", initiateTransferSchema), async (c) => {
    try {
      const data = c.req.valid("json");
      const result = await services.transfer.manualTransfer(data);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /assign-ready — assign ready station */
  router.post("/assign-ready", zValidator("json", assignReadyStationSchema), async (c) => {
    try {
      const data = c.req.valid("json");
      const result = await services.transfer.assignReadyStation(data);
      return success(c, result);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET / — list transfers */
  router.get("/", async (c) => {
    try {
      const transfers = await services.transfer.getAllTransfers();
      return success(c, transfers);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /stats — get transfer statistics */
  router.get("/stats", async (c) => {
    try {
      const stats = await services.transfer.getTransferStats();
      return success(c, stats);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /:id — find by id */
  router.get("/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const transfer = await services.transfer.findTransferById(id);
      if (!transfer) throw new NotFoundError("Transfer", id);
      return success(c, transfer);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /by-production/:productionId — get transfer history */
  router.get("/by-production/:productionId", async (c) => {
    try {
      const productionId = c.req.param("productionId");
      const history = await services.transfer.getTransferHistory(productionId);
      return success(c, history);
    } catch (err) {
      return sendError(c, err);
    }
  });

  return router;
}
