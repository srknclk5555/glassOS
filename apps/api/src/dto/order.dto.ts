import { z } from "zod";
import { ulid, isoDate } from "./common.dto.js";

export const createOrderSchema = z.object({
  id: ulid,
  customerId: ulid,
  orderNumber: z.string().min(1).max(50),
  orderDate: z.string().transform((v) => new Date(v)),
  dueDate: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  notes: z.string().max(1000).optional(),
});

export const updateOrderSchema = z.object({
  dueDate: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  notes: z.string().max(1000).optional(),
});

export const approveOrderSchema = z.object({});

export const cancelOrderSchema = z.object({});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
