import { z } from "zod";
import { ulid } from "./common.dto.js";

// ─── Open Production Record ──────────────────────────────────────────────────

export const openProductionRecordSchema = z.object({
  id: ulid,
  productionOrderId: ulid,
  recipeId: ulid.optional(),
  recipeVersion: z.number().int().positive("Recipe version must be a positive integer"),
});

export type OpenProductionRecordInput = z.infer<typeof openProductionRecordSchema>;

// ─── Finalize Production Record ──────────────────────────────────────────────

export const finalizeProductionRecordSchema = z.object({
  quantityCompleted: z.number().int().min(1, "quantityCompleted must be at least 1"),
  quantityBroken: z.number().int().min(0).optional().default(0),
  totalSheetsUsed: z.number().int().min(0).optional(),
  totalGlassAreaM2: z.string().optional(),
  totalWasteM2: z.string().optional(),
  yieldPercentage: z.string().optional(),
  totalCost: z.string().optional(),
});

export type FinalizeProductionRecordInput = z.infer<typeof finalizeProductionRecordSchema>;

// ─── Archive Production Record ───────────────────────────────────────────────
// No body required — only the ID is in the URL path.

export const archiveProductionRecordSchema = z.object({});

export type ArchiveProductionRecordInput = z.infer<typeof archiveProductionRecordSchema>;

// ─── List Query Parameters ───────────────────────────────────────────────────

export const productionRecordListQuerySchema = z.object({
  status: z.string().optional(),
  productType: z.string().optional(),
  productionOrderId: z.string().optional(),
  recipeId: z.string().optional(),
  completedBy: z.string().optional(),
  search: z.string().optional(),
  startDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  endDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : 1;
      return isNaN(n) || n < 1 ? 1 : n;
    }),
  limit: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : 20;
      return isNaN(n) || n < 1 ? 20 : Math.min(n, 100);
    }),
});

export type ProductionRecordListQuery = z.infer<typeof productionRecordListQuerySchema>;
