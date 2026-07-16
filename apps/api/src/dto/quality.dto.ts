import { z } from "zod";
import { ulid } from "./common.dto.js";

export const inspectionTypeEnum = z.enum(["visual", "dimension", "edge", "temper", "insulating_glass", "final"]);
export const inspectionResultEnum = z.enum(["pass", "fail", "conditional_pass", "rework_required", "scrap"]);

export const startInspectionSchema = z.object({
  id: ulid,
  productionOrderId: ulid,
  stationId: z.string(),
  inspectionType: inspectionTypeEnum,
  inspectorId: z.string(),
  machineId: z.string().optional(),
  shift: z.string().optional(),
  notes: z.string().optional(),
});

export const completeInspectionSchema = z.object({
  result: inspectionResultEnum,
  completedBy: z.string().optional(),
});

export const rejectInspectionSchema = z.object({
  reason: z.string().min(1),
});

export const approveInspectionSchema = z.object({
  approvedBy: z.string(),
});

export const recordNotesSchema = z.object({
  notes: z.string(),
});

export type StartInspectionInput = z.infer<typeof startInspectionSchema>;
