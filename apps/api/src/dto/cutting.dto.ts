import { z } from "zod";
import { ulid } from "./common.dto.js";

export const createCuttingSessionSchema = z.object({
  id: ulid,
  queueId: ulid,
  stationId: z.string(),
  materialType: z.string(),
  machineId: z.string().optional(),
  operatorId: z.string().optional(),
  shift: z.string().optional(),
});

export const cancelSessionSchema = z.object({
  reason: z.string().optional(),
});

export const registerBreakageSchema = z.object({
  breakageId: ulid,
  productionOrderId: ulid,
  orderLineId: ulid,
  orderId: ulid,
  customerId: ulid,
  brokenQuantity: z.number().positive(),
  reason: z.string(),
  stationId: z.string(),
  machineId: z.string().optional(),
  operatorId: z.string().optional(),
  shift: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateCuttingSessionInput = z.infer<typeof createCuttingSessionSchema>;
export type RegisterBreakageInput = z.infer<typeof registerBreakageSchema>;
