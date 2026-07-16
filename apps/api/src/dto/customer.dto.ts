import { z } from "zod";
import { ulid } from "./common.dto.js";

// ─── Request DTOs ────────────────────────────────────────────────────────────

export const createCustomerSchema = z.object({
  id: ulid,
  customerCode: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  shortName: z.string().max(100).optional(),
  taxNumber: z.string().max(50).optional(),
  taxOffice: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(200).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  shortName: z.string().max(100).optional(),
  taxNumber: z.string().max(50).optional(),
  taxOffice: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(200).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

export const deactivateCustomerSchema = z.object({});

// ─── Response DTOs ───────────────────────────────────────────────────────────

export const customerResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  factoryId: z.string().nullable().optional(),
  customerCode: z.string(),
  name: z.string(),
  shortName: z.string().nullable().optional(),
  taxNumber: z.string().nullable().optional(),
  taxOffice: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  isActive: z.boolean(),
  notes: z.string().nullable().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
