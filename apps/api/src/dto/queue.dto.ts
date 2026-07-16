import { z } from "zod";
import { ulid } from "./common.dto.js";

export const createWorkQueueSchema = z.object({
  id: ulid,
  stationId: z.string().min(1),
  operationCode: z.string().min(1),
  isActive: z.boolean().optional(),
});

export const selectMaterialSchema = z.object({
  materialId: z.string(),
});

export const addBasketItemSchema = z.object({
  productionOrderId: z.string(),
});

export const removeBasketItemSchema = z.object({
  productionOrderId: z.string(),
});

export type CreateWorkQueueInput = z.infer<typeof createWorkQueueSchema>;
