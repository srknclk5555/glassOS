"use server";

import { revalidatePath } from "next/cache";
import { customCodeDefinitions, auditLogs } from "@repo/db";
import { createCustomCodeDefinitionSchema, updateCustomCodeDefinitionSchema } from "@repo/types";
import { eq, and, asc, sql } from "drizzle-orm";
import { requireSession } from "@/lib/session";
import { withTenantSession } from "@/lib/dbSession";
import { ensurePermission } from "@/lib/authorization";
import { perfLog, perfStart, perfEnd } from "@/lib/perf";

// ─── Helper: ULID generator ──────────────────────────────────────────────────

function generateULID(): string {
  const chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const timestamp = Date.now().toString(36).toUpperCase().padStart(10, "0");
  let random = "";
  for (let i = 0; i < 16; i++) {
    random += chars[Math.floor(Math.random() * 32)];
  }
  return (timestamp + random).slice(0, 26);
}

// ─── List ────────────────────────────────────────────────────────────────────

export interface CustomCodeDefinitionListFilters {
  fieldNumber?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function getCustomCodeDefinitionsAction(filters?: CustomCodeDefinitionListFilters) {
  const tActionStart = perfStart("[getCustomCodeDefinitionsAction]");
  perfLog("[getCustomCodeDefinitionsAction]", "Started", Date.now());
  const session = await requireSession();

  const res = await withTenantSession(session, async (tx: any) => {
    const conditions: any[] = [
      eq(customCodeDefinitions.tenantId, session.user.tenantId),
    ];

    if (filters?.fieldNumber) {
      conditions.push(eq(customCodeDefinitions.fieldNumber, filters.fieldNumber));
    }

    const where = and(...conditions);
    const orderByColumn = filters?.sortBy ?? "sortOrder";
    const orderByDir = filters?.sortOrder === "asc" ? asc : asc;
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 100;
    const offset = (page - 1) * pageSize;

    perfLog("[getCustomCodeDefinitionsAction]", "Executing select query", Date.now());
    const items = await tx
      .select()
      .from(customCodeDefinitions)
      .where(where)
      .orderBy(
        orderByDir((customCodeDefinitions as any)[orderByColumn] ?? customCodeDefinitions.sortOrder),
        asc(customCodeDefinitions.value),
      )
      .limit(pageSize)
      .offset(offset);

    const totalResult = await tx
      .select({ count: sql<number>`count(*)` })
      .from(customCodeDefinitions)
      .where(where);

    const total = Number(totalResult[0]?.count ?? 0);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  });

  perfEnd("[getCustomCodeDefinitionsAction]", tActionStart);
  return res;
}

// ─── Get all active values for a specific field (for Combobox) ──────────────

export async function getCustomCodeValuesAction(fieldNumber: number) {
  const session = await requireSession();
  await ensurePermission("materials:read");

  return await withTenantSession(session, async (tx: any) => {
    const items = await tx
      .select()
      .from(customCodeDefinitions)
      .where(
        and(
          eq(customCodeDefinitions.tenantId, session.user.tenantId),
          eq(customCodeDefinitions.fieldNumber, fieldNumber),
          eq(customCodeDefinitions.isActive, true),
        ),
      )
      .orderBy(asc(customCodeDefinitions.sortOrder), asc(customCodeDefinitions.value));

    return items;
  });
}

// ─── Get a single definition by ID ──────────────────────────────────────────

export async function getCustomCodeDefinitionAction(id: string) {
  const session = await requireSession();
  await ensurePermission("materials:read");

  return await withTenantSession(session, async (tx: any) => {
    const item = await tx
      .select()
      .from(customCodeDefinitions)
      .where(
        and(
          eq(customCodeDefinitions.id, id),
          eq(customCodeDefinitions.tenantId, session.user.tenantId),
        ),
      )
      .limit(1);

    return item[0] ?? null;
  });
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createCustomCodeDefinitionAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("materials:write");

  const parsed = createCustomCodeDefinitionSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  }

  return await withTenantSession(session, async (tx: any) => {
    const id = generateULID();

    const inserted = await tx
      .insert(customCodeDefinitions)
      .values({
        id,
        tenantId: session.user.tenantId,
        fieldNumber: parsed.data.fieldNumber,
        value: parsed.data.value,
        label: parsed.data.label,
        sortOrder: parsed.data.sortOrder ?? 0,
        isActive: parsed.data.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "custom_code_definitions",
      recordId: id,
      operation: "INSERT",
      afterValue: { fieldNumber: parsed.data.fieldNumber, value: parsed.data.value },
    });

    revalidatePath("/settings/custom-code-definitions");
    return inserted[0];
  });
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateCustomCodeDefinitionAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("materials:write");

  const parsed = updateCustomCodeDefinitionSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  }

  return await withTenantSession(session, async (tx: any) => {
    const existing = await tx
      .select({ id: customCodeDefinitions.id, tenantId: customCodeDefinitions.tenantId })
      .from(customCodeDefinitions)
      .where(
        and(
          eq(customCodeDefinitions.id, parsed.data.id),
          eq(customCodeDefinitions.tenantId, session.user.tenantId),
        ),
      )
      .limit(1);

    if (!existing[0]) {
      throw new Error("Custom code definition not found");
    }

    const updated = await tx
      .update(customCodeDefinitions)
      .set({
        fieldNumber: parsed.data.fieldNumber,
        value: parsed.data.value,
        label: parsed.data.label,
        sortOrder: parsed.data.sortOrder ?? 0,
        isActive: parsed.data.isActive ?? true,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(customCodeDefinitions.id, parsed.data.id),
          eq(customCodeDefinitions.tenantId, session.user.tenantId),
        ),
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "custom_code_definitions",
      recordId: parsed.data.id,
      operation: "UPDATE",
      afterValue: { value: parsed.data.value, label: parsed.data.label },
    });

    revalidatePath("/settings/custom-code-definitions");
    return updated[0];
  });
}

// ─── Toggle active state ─────────────────────────────────────────────────────

export async function toggleCustomCodeDefinitionAction(id: string, isActive: boolean) {
  const session = await requireSession();
  await ensurePermission("materials:write");

  return await withTenantSession(session, async (tx: any) => {
    const updated = await tx
      .update(customCodeDefinitions)
      .set({
        isActive,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(customCodeDefinitions.id, id),
          eq(customCodeDefinitions.tenantId, session.user.tenantId),
        ),
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "custom_code_definitions",
      recordId: id,
      operation: isActive ? "ACTIVATE" : "DEACTIVATE",
      afterValue: { isActive },
    });

    revalidatePath("/settings/custom-code-definitions");
    return updated[0];
  });
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteCustomCodeDefinitionAction(id: string) {
  const session = await requireSession();
  await ensurePermission("materials:write");

  return await withTenantSession(session, async (tx: any) => {
    const existing = await tx
      .select({ id: customCodeDefinitions.id, tenantId: customCodeDefinitions.tenantId })
      .from(customCodeDefinitions)
      .where(
        and(
          eq(customCodeDefinitions.id, id),
          eq(customCodeDefinitions.tenantId, session.user.tenantId),
        ),
      )
      .limit(1);

    if (!existing[0]) {
      throw new Error("Custom code definition not found");
    }

    await tx.delete(customCodeDefinitions).where(eq(customCodeDefinitions.id, id));

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "custom_code_definitions",
      recordId: id,
      operation: "DELETE",
      afterValue: { deleted: true },
    });

    revalidatePath("/settings/custom-code-definitions");
    return { success: true };
  });
}
