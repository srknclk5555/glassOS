import { z } from "zod";
import { ulid } from "./common.dto.js";

export const createReworkSchema = z.object({
  id: ulid,
  parentProductionOrderId: ulid,
  breakageEventId: z.string().optional(),
  reworkReason: z.string().optional(),
  internalCustomer: z.string().optional(),
});

export const createBreakageReworkSchema = z.object({
  id: ulid,
  orderLineId: ulid,
  parentProductionOrderId: ulid,
  parentOrderId: ulid,
  originalCustomerId: ulid,
  breakageEventId: z.string(),
  brokenQuantity: z.number().positive(),
  reason: z.string(),
  stationId: z.string(),
  machineId: z.string().optional(),
  operatorId: z.string().optional(),
  shift: z.string().optional(),
});

export const mergeReworkSchema = z.object({
  completedQuantity: z.number().optional(),
});

export type CreateReworkInput = z.infer<typeof createReworkSchema>;
export type CreateBreakageReworkInput = z.infer<typeof createBreakageReworkSchema>;
