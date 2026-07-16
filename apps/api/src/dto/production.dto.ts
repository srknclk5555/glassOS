import { z } from "zod";
import { ulid } from "./common.dto.js";

export const createProductionSchema = z.object({
  id: ulid,
  orderLineId: ulid,
  glassBarcode: z.string().min(1).max(50),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  productType: z.string().optional(),
  currentOperation: z.string().optional(),
  currentStationId: z.string().optional(),
  currentStatus: z.string().optional(),
  isRework: z.boolean().optional(),
  revisionNumber: z.number().optional(),
});

export const assignToStationSchema = z.object({
  stationId: z.string(),
});

export const transferProductionSchema = z.object({
  targetStationId: z.string(),
  targetOperation: z.string(),
});

export const updateStatusSchema = z.object({
  status: z.string(),
});

export type CreateProductionInput = z.infer<typeof createProductionSchema>;
export type AssignToStationInput = z.infer<typeof assignToStationSchema>;
export type TransferProductionInput = z.infer<typeof transferProductionSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
