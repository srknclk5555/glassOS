import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { success, created, sendError } from "../lib/response.js";
import { NotFoundError, ConflictError } from "../lib/errors.js";
import { getCurrentUser, requireRole } from "../lib/auth.js";
import { Roles } from "../lib/config.js";
import { paginated } from "../dto/common.dto.js";
import {
  openProductionRecordSchema,
  finalizeProductionRecordSchema,
  productionRecordListQuerySchema,
} from "../dto/production-record.dto.js";
import type { ProductionRecordService } from "@repo/db";

export function createProductionRecordRouter(services: { productionRecord: ProductionRecordService }) {
  const router = new Hono();

  /* GET /production-records — list with filtering and pagination */
  router.get("/", async (c) => {
    try {
      const query = productionRecordListQuerySchema.parse(c.req.query());
      const result = await services.productionRecord.list({
        status: query.status,
        productType: query.productType,
        productionOrderId: query.productionOrderId,
        recipeId: query.recipeId,
        completedBy: query.completedBy,
        search: query.search,
        startDate: query.startDate,
        endDate: query.endDate,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        page: query.page,
        pageSize: query.limit,
      });
      return success(c, paginated(result.items, result.total, query.page, query.limit));
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /production-records/:id — find by id */
  router.get("/:id", async (c) => {
    try {
      const id = c.req.param("id");
      if (!id) throw new NotFoundError("ProductionRecord", "(missing id)");
      const record = await services.productionRecord.getById(id);
      if (!record) throw new NotFoundError("ProductionRecord", id);
      return success(c, record);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /production-records/by-production-order/:productionOrderId — find by production order */
  router.get("/by-production-order/:productionOrderId", async (c) => {
    try {
      const productionOrderId = c.req.param("productionOrderId");
      const record = await services.productionRecord.getByProductionOrderId(productionOrderId);
      if (!record) throw new NotFoundError("ProductionRecord for production order", productionOrderId);
      return success(c, record);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /production-records/open — open a new production record (Operator+) */
  router.post("/open", requireRole(Roles.Operator), zValidator("json", openProductionRecordSchema), async (c) => {
    try {
      const user = getCurrentUser(c);
      const data = c.req.valid("json");
      const record = await services.productionRecord.openProductionRecord(
        {
          id: data.id,
          productionOrderId: data.productionOrderId,
          recipeId: data.recipeId,
          recipeVersion: data.recipeVersion,
        },
        { userId: user.sub },
      );
      return created(c, record);
    } catch (err) {
      // Map service validation errors to HTTP errors
      if (err instanceof Error && err.message.includes("already exists")) {
        return sendError(c, new ConflictError(err.message));
      }
      return sendError(c, err);
    }
  });

  /* POST /production-records/:id/finalize — finalize a production record (Operator+) */
  router.post("/:id/finalize", requireRole(Roles.Operator), zValidator("json", finalizeProductionRecordSchema), async (c) => {
    try {
      const user = getCurrentUser(c);
      const id = c.req.param("id");
      if (!id) throw new NotFoundError("ProductionRecord", "(missing id)");
      const data = c.req.valid("json");

      // Verify the record exists before finalizing
      const existing = await services.productionRecord.getById(id);
      if (!existing) throw new NotFoundError("ProductionRecord", id);

      const record = await services.productionRecord.finalizeProductionRecord(
        id,
        {
          quantityCompleted: data.quantityCompleted,
          quantityBroken: data.quantityBroken,
          totalSheetsUsed: data.totalSheetsUsed,
          totalGlassAreaM2: data.totalGlassAreaM2,
          totalWasteM2: data.totalWasteM2,
          yieldPercentage: data.yieldPercentage,
          totalCost: data.totalCost,
        },
        { userId: user.sub },
      );
      return success(c, record);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* POST /production-records/:id/archive — archive a production record (ProductionManager+) */
  router.post("/:id/archive", requireRole(Roles.ProductionManager), async (c) => {
    try {
      const user = getCurrentUser(c);
      const id = c.req.param("id");
      if (!id) throw new NotFoundError("ProductionRecord", "(missing id)");

      // Verify the record exists before archiving
      const existing = await services.productionRecord.getById(id);
      if (!existing) throw new NotFoundError("ProductionRecord", id);

      const record = await services.productionRecord.archiveProductionRecord(id, {
        userId: user.sub,
      });
      return success(c, record);
    } catch (err) {
      return sendError(c, err);
    }
  });

  return router;
}
