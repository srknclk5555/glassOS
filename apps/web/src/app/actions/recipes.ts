"use server";

import { revalidatePath } from "next/cache";
import { SignJWT } from "jose";
import { requireSession } from "@/lib/session";
import type { AuthenticatedSession } from "@/lib/session";

// ─── API Client ──────────────────────────────────────────────────────────────
// Recipe Server Actions call the Recipe API (not the database directly).
// This keeps the recipe module's clean architecture: Server Action → API → Service → Repository.
//
// The API requires JWT authentication. We generate a short-lived API JWT from
// the current NextAuth session to forward the user's identity to the API.
// JWT_SECRET must match the API's server-side secret (JWT_SECRET env var).
// JWT_ISSUER and JWT_AUDIENCE must also match the API's configuration.

const API_URL = process.env.API_URL ?? "http://localhost:3001/api/v1";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

/** Generate a short-lived JWT for the Recipe API using the current session. */
async function getApiToken(): Promise<string> {
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET ?? process.env.NEXTAUTH_SECRET ?? "",
  );

  const session = await requireSession();
  const user = session.user as AuthenticatedSession["user"];

  // Map normalized role names (from NextAuth) → API display names
  const roleMap: Record<string, string> = {
    administrator: "Administrator",
    factory_manager: "Factory Manager",
    production_manager: "Production Manager",
    operator: "Operator",
    viewer: "Viewer",
    tenant_admin: "Administrator",
  };
  const apiRole = roleMap[user.role] ?? user.role;

  return await new SignJWT({
    sub: user.id,
    tenantId: user.tenantId,
    role: apiRole,
    name: user.name,
    email: user.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(process.env.JWT_ISSUER ?? "glassos")
    .setAudience(process.env.JWT_AUDIENCE ?? "glassos-api")
    .setExpirationTime("5m")
    .sign(secret);
}

async function apiGet<T>(path: string): Promise<T> {
  await requireSession(); // auth guard
  const token = await getApiToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorResponse;
    throw new Error(body.error?.message ?? `API request failed: ${res.status}`);
  }

  const body = (await res.json()) as ApiResponse<T>;
  return body.data;
}

async function apiPost<T>(path: string, data?: unknown): Promise<T> {
  await requireSession(); // auth guard
  const token = await getApiToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorResponse;
    throw new Error(body.error?.message ?? `API request failed: ${res.status}`);
  }

  const body = (await res.json()) as ApiResponse<T>;
  return body.data;
}

async function apiPut<T>(path: string, data: unknown): Promise<T> {
  await requireSession(); // auth guard
  const token = await getApiToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorResponse;
    throw new Error(body.error?.message ?? `API request failed: ${res.status}`);
  }

  const body = (await res.json()) as ApiResponse<T>;
  return body.data;
}

// ─── Paginated Types ─────────────────────────────────────────────────────────

export interface PaginatedResponse<T = unknown> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Recipe List Filters ─────────────────────────────────────────────────────

export interface RecipeListFilters {
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  activeOnly?: boolean;
  productType?: string;
  page?: number;
  limit?: number;
}

// ─── READ ACTIONS ────────────────────────────────────────────────────────────

/**
 * List recipes with filtering and pagination.
 * GET /api/recipes?search=&sortBy=&sortOrder=&activeOnly=&productType=&page=&limit=
 */
export async function listRecipes(filters?: RecipeListFilters) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.sortBy) params.set("sortBy", filters.sortBy);
  if (filters?.sortOrder) params.set("sortOrder", filters.sortOrder);
  if (filters?.activeOnly !== undefined) params.set("activeOnly", String(filters.activeOnly));
  if (filters?.productType) params.set("productType", filters.productType);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));

  const qs = params.toString();
  return apiGet<PaginatedResponse<any>>(`/recipes${qs ? `?${qs}` : ""}`);
}

/**
 * Search recipes by name/code (for selectors).
 * GET /api/recipes/search?q=&activeOnly=&limit=
 */
export async function searchRecipes(query: string, options?: { activeOnly?: boolean; limit?: number }) {
  const params = new URLSearchParams({ q: query });
  if (options?.activeOnly !== undefined) params.set("activeOnly", String(options.activeOnly));
  if (options?.limit) params.set("limit", String(options.limit));

  return apiGet<any[]>(`/recipes/search?${params.toString()}`);
}

/**
 * Get a single recipe by ID.
 * GET /api/recipes/:id
 */
export async function getRecipe(id: string) {
  return apiGet<any>(`/recipes/${id}`);
}

/**
 * Get recipe detail with all children (items, operations, rules).
 * GET /api/recipes/:id/detail
 */
export async function getRecipeDetail(id: string) {
  return apiGet<any>(`/recipes/${id}/detail`);
}

/**
 * List version snapshots for a recipe.
 * GET /api/recipes/:id/versions
 */
export async function listRecipeVersions(recipeId: string) {
  return apiGet<any[]>(`/recipes/${recipeId}/versions`);
}

/**
 * Get a specific version snapshot.
 * GET /api/recipes/:id/versions/:version
 */
export async function getRecipeVersion(recipeId: string, versionNumber: number) {
  return apiGet<any>(`/recipes/${recipeId}/versions/${versionNumber}`);
}

// ─── WRITE ACTIONS ───────────────────────────────────────────────────────────

/**
 * Create a new recipe.
 * POST /api/recipes
 * Invalidate: /recipes
 */
export async function createRecipe(input: {
  id: string;
  recipeCode: string;
  name: string;
  productType?: string;
  notes?: string;
}) {
  const result = await apiPost<any>("/recipes", input);
  revalidatePath("/recipes");
  return result;
}

/**
 * Update a recipe's root fields.
 * PUT /api/recipes/:id
 * Invalidate: /recipes, /recipes/:id
 */
export async function updateRecipe(
  id: string,
  changes: {
    name?: string;
    recipeCode?: string;
    productType?: string;
    notes?: string;
  },
) {
  const result = await apiPut<any>(`/recipes/${id}`, changes);
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
  return result;
}

/**
 * Clone a recipe with a new code.
 * POST /api/recipes/:id/clone
 * Invalidate: /recipes
 */
export async function cloneRecipe(
  id: string,
  input: {
    newId: string;
    newRecipeCode: string;
    newName?: string;
  },
) {
  const result = await apiPost<any>(`/recipes/${id}/clone`, input);
  revalidatePath("/recipes");
  return result;
}

/**
 * Create a new version for a recipe.
 * POST /api/recipes/:id/version
 * Invalidate: /recipes, /recipes/:id, /recipes/:id/versions
 */
export async function createRecipeVersion(
  id: string,
  input?: {
    notes?: string;
    isActive?: boolean;
  },
) {
  const result = await apiPost<any>(`/recipes/${id}/version`, input ?? {});
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
  revalidatePath(`/recipes/${id}/versions`);
  return result;
}

/**
 * Archive (soft-deactivate) a recipe.
 * POST /api/recipes/:id/archive
 * Invalidate: /recipes, /recipes/:id
 */
export async function archiveRecipe(id: string) {
  const result = await apiPost<any>(`/recipes/${id}/archive`);
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
  return result;
}

/**
 * Restore an archived recipe.
 * POST /api/recipes/:id/restore
 * Invalidate: /recipes, /recipes/:id
 */
export async function restoreRecipe(id: string) {
  const result = await apiPost<any>(`/recipes/${id}/restore`);
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
  return result;
}

/**
 * Save complete recipe (create or update) with all sub-entities.
 * POST /api/recipes (create) or PUT /api/recipes/:id (update)
 * Also saves BOM items, operations, rules, outputs, and fires.
 */
export async function saveRecipe(
  id: string | null,
  input: {
    recipeCode: string;
    name: string;
    productType?: string;
    notes?: string;
    isActive?: boolean;
    recipeItems?: Array<{
      materialId: string;
      consumptionBasis: string;
      quantityPerUnit: number;
      unit: string;
      sequence: number;
      wastePercentage: number | null;
    }>;
    recipeOperations?: Array<{
      operationCode: string;
      sequence: number;
      isMandatory: boolean;
      notes: string;
    }>;
    recipeRules?: Array<{
      ruleType: string;
      ruleValue: string;
    }>;
    recipeOutputs?: Array<{
      productId?: string;
      productName: string;
      quantityPerUnit: number;
      unit: string;
      sequence: number;
      notes: string;
    }>;
    recipeFires?: Array<{
      fireType: string;
      calculationMethod: string;
      rate: number;
      unit: string;
      stockCardId: string | null;
      notes: string;
    }>;
  },
) {
  let result: any;

  if (id) {
    // Update: save root fields + all sub-entities
    result = await apiPut<any>(`/recipes/${id}`, input);
  } else {
    // Create: save with generated ID
    result = await apiPost<any>("/recipes", input);
  }

  revalidatePath("/recipes");
  if (id) revalidatePath(`/recipes/${id}`);
  return result;
}
