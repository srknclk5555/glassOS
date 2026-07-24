import { z } from "zod";
import { ulid } from "./common.dto.js";

// ─── Request DTOs ────────────────────────────────────────────────────────────

export const createRecipeSchema = z.object({
  id: ulid,
  recipeCode: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  productType: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

export const updateRecipeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  recipeCode: z.string().min(1).max(50).optional(),
  productType: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

export const cloneRecipeSchema = z.object({
  newId: ulid,
  newRecipeCode: z.string().min(1).max(50),
  newName: z.string().max(200).optional(),
});

export const createVersionSchema = z.object({
  notes: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
});

// ─── Query DTOs ──────────────────────────────────────────────────────────────

export const recipeListQuerySchema = z.object({
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  activeOnly: z
    .string()
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  productType: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : 1;
      return isNaN(n) || n < 1 ? 1 : n;
    }),
  limit: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : 20;
      return isNaN(n) || n < 1 ? 20 : Math.min(n, 100);
    }),
});

export const recipeSearchQuerySchema = z.object({
  q: z.string().min(1, "Search query is required"),
  activeOnly: z
    .string()
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  limit: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : 20;
      return isNaN(n) || n < 1 ? 20 : Math.min(n, 100);
    }),
});

// ─── Type Exports ────────────────────────────────────────────────────────────

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
export type CloneRecipeInput = z.infer<typeof cloneRecipeSchema>;
export type CreateVersionInput = z.infer<typeof createVersionSchema>;
export type RecipeListQuery = z.infer<typeof recipeListQuerySchema>;
export type RecipeSearchQuery = z.infer<typeof recipeSearchQuerySchema>;
