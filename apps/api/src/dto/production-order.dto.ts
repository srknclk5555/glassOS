import { z } from "zod";
import { ulid } from "./common.dto.js";

// ─── Item Schema (embedded in create) ────────────────────────────────────────

export const createProductionOrderItemSchema = z.object({
  id: ulid,
  recipeId: z.string().min(1, "Recipe is required"),
  recipeCode: z.string().optional(),
  recipeName: z.string().optional(),
  netWidthMm: z.number().positive("Net width must be positive"),
  netHeightMm: z.number().positive("Net height must be positive"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  engineSnapshot: z.any().optional(),
  sequence: z.number().int().min(1),
});

// ─── Create Production Order ─────────────────────────────────────────────────

export const createProductionOrderSchema = z.object({
  id: ulid,
  orderNo: z.string().min(1, "Order number is required").max(50),
  customerId: z.string().optional(),
  customerName: z.string().max(255).optional(),
  productionDate: z.string().optional(), // ISO date string
  dueDate: z.string().optional(), // ISO date string
  notes: z.string().max(1000).optional(),
  items: z.array(createProductionOrderItemSchema).min(1, "At least one item is required"),
});

export type CreateProductionOrderInput = z.infer<typeof createProductionOrderSchema>;
export type CreateProductionOrderItemInput = z.infer<typeof createProductionOrderItemSchema>;

// ─── List / Query ────────────────────────────────────────────────────────────

export const productionOrderListQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.string().optional().transform((v) => {
    const n = v ? parseInt(v, 10) : 1;
    return isNaN(n) || n < 1 ? 1 : n;
  }),
  limit: z.string().optional().transform((v) => {
    const n = v ? parseInt(v, 10) : 20;
    return isNaN(n) || n < 1 ? 20 : Math.min(n, 100);
  }),
});

export type ProductionOrderListQuery = z.infer<typeof productionOrderListQuerySchema>;

// ─── Status Update ───────────────────────────────────────────────────────────

export const updateProductionOrderStatusSchema = z.object({
  status: z.enum(["draft", "ready", "released", "cancelled"]),
});

export type UpdateProductionOrderStatusInput = z.infer<typeof updateProductionOrderStatusSchema>;
