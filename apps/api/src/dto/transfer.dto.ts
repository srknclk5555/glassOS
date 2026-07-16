import { z } from "zod";
import { ulid } from "./common.dto.js";

const transferTypeEnum = z.enum(["automatic", "manual", "rework_merge", "correction", "return_to_previous", "emergency"]);

export const initiateTransferSchema = z.object({
  id: ulid,
  productionOrderId: ulid,
  toStationId: z.string(),
  transferType: transferTypeEnum,
  operatorId: z.string().optional(),
  machineId: z.string().optional(),
  shift: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const cancelTransferSchema = z.object({
  reason: z.string().optional(),
});

export const rejectTransferSchema = z.object({
  reason: z.string().optional(),
});

export const returnTransferSchema = z.object({
  id: ulid,
  productionOrderId: ulid,
  targetStationId: z.string(),
  operatorId: z.string().optional(),
  machineId: z.string().optional(),
  shift: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const assignReadyStationSchema = z.object({
  id: ulid,
  productionOrderId: ulid,
  stationId: z.string(),
  operatorId: z.string().optional(),
  machineId: z.string().optional(),
  shift: z.string().optional(),
  notes: z.string().optional(),
});

export type InitiateTransferInput = z.infer<typeof initiateTransferSchema>;
export type ReturnTransferInput = z.infer<typeof returnTransferSchema>;
export type AssignReadyStationInput = z.infer<typeof assignReadyStationSchema>;
