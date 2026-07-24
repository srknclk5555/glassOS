"use server";

import { revalidatePath } from "next/cache";
import { SignJWT } from "jose";
import { requireSession } from "@/lib/session";
import { withTenantSession } from "@/lib/dbSession";
import type { AuthenticatedSession } from "@/lib/session";
import { db, manufacturingOrders, manufacturingOrderItems, eq, sql, and, inArray } from "@repo/db";

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

async function getApiToken(): Promise<string> {
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET ?? process.env.NEXTAUTH_SECRET ?? "",
  );

  const session = await requireSession();
  const user = session.user as AuthenticatedSession["user"];

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
  await requireSession();
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
  await requireSession();
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

async function apiPatch<T>(path: string, data: unknown): Promise<T> {
  await requireSession();
  const token = await getApiToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
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

async function apiDelete<T>(path: string): Promise<T> {
  await requireSession();
  const token = await getApiToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
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

/* ── Action Functions ────────────────────────────────────────────────── */

export interface ProductionOrderListFilters {
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export async function listProductionOrdersAction(filters?: ProductionOrderListFilters) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.sortBy) params.set("sortBy", filters.sortBy);
  if (filters?.sortOrder) params.set("sortOrder", filters.sortOrder);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));

  const qs = params.toString();
  return apiGet<any>(`/production-orders${qs ? `?${qs}` : ""}`);
}

export async function getProductionOrderAction(id: string) {
  return apiGet<any>(`/production-orders/${id}`);
}

export async function createProductionOrderAction(input: unknown) {
  const result = await apiPost<any>("/production-orders", input);
  revalidatePath("/production/orders");
  return result;
}

export async function updateProductionOrderStatusAction(id: string, status: string) {
  const result = await apiPatch<any>(`/production-orders/${id}/status`, { status });
  revalidatePath("/production/orders");
  revalidatePath(`/production/orders/${id}`);
  return result;
}

export async function deleteProductionOrderAction(id: string) {
  const result = await apiDelete<any>(`/production-orders/${id}`);
  revalidatePath("/production/orders");
  return result;
}

/* ── KPI Aggregate Data ─────────────────────────────────────────────── */

export interface ProductionOrderKpiData {
  total: number;
  draft: number;
  ready: number;
  released: number;
  cancelled: number;
  totalAreaM2: number;
  draftAreaM2: number;
  readyAreaM2: number;
  releasedAreaM2: number;
  cancelledAreaM2: number;
  todayAreaM2: number;
}

export async function getProductionOrderKpiAction(): Promise<ProductionOrderKpiData> {
  const session = await requireSession();
  const user = session.user as AuthenticatedSession["user"];

  return withTenantSession(session, async (tx: any) => {
    const statuses = ["draft", "ready", "released", "cancelled"] as const;

    // Get counts + m² area per status in a single aggregated query
    const aggResults = await tx.select({
      status: manufacturingOrders.status,
      orderCount: sql<number>`count(DISTINCT ${manufacturingOrders.id})::int`,
      totalArea: sql<number>`COALESCE(SUM((${manufacturingOrderItems.engineSnapshot}->'totals'->>'productionAreaM2')::numeric), 0)`,
    })
      .from(manufacturingOrders)
      .leftJoin(
        manufacturingOrderItems,
        eq(manufacturingOrderItems.orderId, manufacturingOrders.id),
      )
      .where(and(
        eq(manufacturingOrders.tenantId, user.tenantId),
        sql`${manufacturingOrders.deletedAt} IS NULL`,
      ))
      .groupBy(manufacturingOrders.status);

    // Build KPI data
    const defaultKpi = { orderCount: 0, totalArea: 0 };
    const draft = aggResults.find(r => r.status === "draft") ?? defaultKpi;
    const ready = aggResults.find(r => r.status === "ready") ?? defaultKpi;
    const released = aggResults.find(r => r.status === "released") ?? defaultKpi;
    const cancelled = aggResults.find(r => r.status === "cancelled") ?? defaultKpi;

    // Today's area: filter by productionDate = today
    const todayStart = new Date().toISOString().split("T")[0] + "T00:00:00.000Z";
    const todayEnd = new Date().toISOString().split("T")[0] + "T23:59:59.999Z";

    const todayResult = await tx.select({
      totalArea: sql<number>`COALESCE(SUM((${manufacturingOrderItems.engineSnapshot}->'totals'->>'productionAreaM2')::numeric), 0)`,
    })
      .from(manufacturingOrders)
      .leftJoin(
        manufacturingOrderItems,
        eq(manufacturingOrderItems.orderId, manufacturingOrders.id),
      )
      .where(and(
        eq(manufacturingOrders.tenantId, user.tenantId),
        sql`${manufacturingOrders.deletedAt} IS NULL`,
        sql`${manufacturingOrders.productionDate} >= ${todayStart}::timestamptz`,
        sql`${manufacturingOrders.productionDate} <= ${todayEnd}::timestamptz`,
      ));

    const todayAreaM2 = Number(todayResult[0]?.totalArea ?? 0);

    return {
      total: draft.orderCount + ready.orderCount + released.orderCount + cancelled.orderCount,
      draft: draft.orderCount,
      ready: ready.orderCount,
      released: released.orderCount,
      cancelled: cancelled.orderCount,
      totalAreaM2: Number(draft.totalArea) + Number(ready.totalArea) + Number(released.totalArea) + Number(cancelled.totalArea),
      draftAreaM2: Number(draft.totalArea),
      readyAreaM2: Number(ready.totalArea),
      releasedAreaM2: Number(released.totalArea),
      cancelledAreaM2: Number(cancelled.totalArea),
      todayAreaM2: Number(todayAreaM2),
    };
  });
}
