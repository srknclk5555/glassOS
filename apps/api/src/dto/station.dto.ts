import { z } from "zod";
import { ulid } from "./common.dto.js";

export const startOperationSchema = z.object({
  id: ulid,
  productionOrderId: ulid,
  stationId: z.string(),
  operatorId: z.string().optional(),
  machineId: z.string().optional(),
  shift: z.string().optional(),
  lowEType: z.enum(["temperable", "non_temperable"]).optional(),
  isTemperedIG: z.boolean().optional(),
  glassType: z.enum(["normal", "tempered", "low_e"]).optional(),
});

export const completeOperationSchema = z.object({
  productionOrderId: ulid,
  stationId: z.string(),
  operatorId: z.string().optional(),
  machineId: z.string().optional(),
});

export const cancelOperationSchema = z.object({
  productionOrderId: z.string(),
  stationId: z.string(),
  reason: z.string().optional(),
});

export const rejectOperationSchema = z.object({
  productionOrderId: z.string(),
  stationId: z.string(),
  reason: z.string().min(1),
  operatorId: z.string().optional(),
});

export const validateLowESchema = z.object({
  productionOrderId: z.string(),
  lowEType: z.enum(["temperable", "non_temperable"]),
  targetStationId: z.string(),
});

export const furnaceCapacitySchema = z.object({
  areaM2: z.number().positive(),
  isTemperedIG: z.boolean(),
});

export const waitingPoolSchema = z.object({
  productionOrderId: ulid,
  stationId: z.string(),
  priority: z.number().optional(),
  notes: z.string().optional(),
});

export type StartOperationInput = z.infer<typeof startOperationSchema>;
export type CompleteOperationInput = z.infer<typeof completeOperationSchema>;
export type RejectOperationInput = z.infer<typeof rejectOperationSchema>;
