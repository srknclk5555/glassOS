import { z } from "zod";
import { ulid } from "./common.dto.js";

export const createDispatchSchema = z.object({
  id: ulid,
  productionOrderId: ulid,
  orderLineId: ulid,
  customerId: ulid,
  orderId: ulid,
});

export const createDeliverySchema = z.object({
  id: ulid,
  productionOrderIds: z.array(ulid).min(1),
  orderLineIds: z.array(ulid).min(1),
  customerId: ulid,
  orderId: ulid,
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  dispatcherId: z.string().optional(),
  loadingDate: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  estimatedArrival: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  notes: z.string().optional(),
});

export const assignVehicleSchema = z.object({
  vehicleId: z.string(),
  driverId: z.string().optional(),
  dispatcherId: z.string().optional(),
});

export const assignDriverSchema = z.object({
  driverId: z.string(),
});

export const assignDispatcherSchema = z.object({
  dispatcherId: z.string(),
});

export const loadVehicleSchema = z.object({
  loadedBy: z.string().optional(),
});

export const completeDeliverySchema = z.object({
  deliveredBy: z.string().optional(),
});

export const partialDeliverySchema = z.object({
  deliveredOrderLineIds: z.array(z.string()),
  deliveredBy: z.string().optional(),
});

export const cancelDispatchSchema = z.object({
  reason: z.string().optional(),
});

export const addToBasketSchema = z.object({
  productionOrderId: z.string(),
});

export type CreateDispatchInput = z.infer<typeof createDispatchSchema>;
export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;
