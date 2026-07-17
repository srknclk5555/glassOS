"use server";

import { revalidatePath } from "next/cache";
import { db, personnel, personnelTitles, auditLogs, personnelMachineAssignments } from "@repo/db";
import { eq, and, asc, desc, like, or, sql, isNull, ne } from "drizzle-orm";
import {
  createPersonnelSchema,
  updatePersonnelSchema,
  createMachineAssignmentSchema,
  type CreatePersonnelInput,
  type UpdatePersonnelInput,
} from "@repo/types";
import { requireSession } from "@/lib/session";
import { withTenantSession } from "@/lib/dbSession";
import { ensurePermission } from "@/lib/authorization";

// Simple ULID generator for char(26) ULID primary keys
function generateULID(): string {
  const chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const timestamp = Date.now().toString(36).toUpperCase().padStart(10, "0");
  let random = "";
  for (let i = 0; i < 16; i++) {
    random += chars[Math.floor(Math.random() * 32)];
  }
  return (timestamp + random).slice(0, 26);
}

/**
 * Convert empty strings to null for optional fields that Zod expects as
 * string().length(26).nullable().optional() or similar.
 */
function preparePersonnelInput(input: Record<string, unknown>): Record<string, unknown> {
  const EMPTY_TO_NULL: string[] = ["titleId", "phone", "email", "hiredAt", "notes"];
  const out: Record<string, unknown> = { ...input };
  for (const key of EMPTY_TO_NULL) {
    if (out[key] === "" || out[key] === undefined) {
      out[key] = null;
    }
  }
  return out;
}

export interface PersonnelListFilters {
  search?: string;
  status?: string;
  role?: string;
  titleId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function getPersonnelAction(filters?: PersonnelListFilters) {
  const session = await requireSession();
  await ensurePermission("personnel:read");

  return await withTenantSession(session, async (tx: any) => {
    const conditions: any[] = [
      eq(personnel.tenantId, session.user.tenantId),
      isNull(personnel.deletedAt),
    ];

    if (filters?.status === "active") {
      conditions.push(eq(personnel.isActive, true));
    } else if (filters?.status === "inactive") {
      conditions.push(eq(personnel.isActive, false));
    }

    if (filters?.role) {
      conditions.push(eq(personnel.role, filters.role));
    }

    if (filters?.titleId) {
      conditions.push(eq(personnel.titleId, filters.titleId));
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(personnel.personnelCode, searchPattern),
          like(personnel.firstName, searchPattern),
          like(personnel.lastName, searchPattern),
          like(personnel.phone, searchPattern),
          like(personnel.email, searchPattern),
        )
      );
    }

    const where = and(...conditions);
    const orderByColumn = filters?.sortBy ?? "createdAt";
    const orderByDir = filters?.sortOrder === "asc" ? asc : desc;
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const items = await tx
      .select()
      .from(personnel)
      .where(where)
      .orderBy(orderByDir((personnel as any)[orderByColumn] ?? personnel.createdAt))
      .limit(pageSize)
      .offset(offset);

    const totalResult = await tx
      .select({ count: sql<number>`count(*)` })
      .from(personnel)
      .where(where);

    const total = Number(totalResult[0]?.count ?? 0);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  });
}

export async function getPersonnelByIdAction(id: string) {
  const session = await requireSession();
  await ensurePermission("personnel:read");

  return await withTenantSession(session, async (tx: any) => {
    const item = await tx
      .select({
        id: personnel.id,
        tenantId: personnel.tenantId,
        factoryId: personnel.factoryId,
        userId: personnel.userId,
        personnelCode: personnel.personnelCode,
        firstName: personnel.firstName,
        lastName: personnel.lastName,
        titleId: personnel.titleId,
        titleName: personnelTitles.titleName,
        role: personnel.role,
        phone: personnel.phone,
        email: personnel.email,
        isActive: personnel.isActive,
        hiredAt: personnel.hiredAt,
        notes: personnel.notes,
        createdAt: personnel.createdAt,
        updatedAt: personnel.updatedAt,
        deletedAt: personnel.deletedAt,
      })
      .from(personnel)
      .leftJoin(personnelTitles, eq(personnel.titleId, personnelTitles.id))
      .where(
        and(
          eq(personnel.id, id),
          eq(personnel.tenantId, session.user.tenantId),
          isNull(personnel.deletedAt),
        )
      )
      .limit(1);

    return item[0] ?? null;
  });
}

export async function createPersonnelAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("personnel:write");

  const prepared = preparePersonnelInput(input as Record<string, unknown>);
  const parsed = createPersonnelSchema.safeParse(prepared);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map(e => e.message).join(", "));
  }

  return await withTenantSession(session, async (tx: any) => {
    const id = generateULID();

    const inserted = await tx
      .insert(personnel)
      .values({
        id,
        tenantId: session.user.tenantId,
        factoryId: session.user.selectedFactoryId ?? session.user.factoryId,
        personnelCode: parsed.data.personnelCode,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        titleId: parsed.data.titleId ?? null,
        role: parsed.data.role ?? "operator",
        phone: parsed.data.phone ?? null,
        email: parsed.data.email ?? null,
        isActive: parsed.data.isActive ?? true,
        hiredAt: parsed.data.hiredAt ?? null,
        notes: parsed.data.notes ?? null,
        updatedAt: new Date(),
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "personnel",
      recordId: id,
      operation: "INSERT",
      afterValue: { personnelCode: parsed.data.personnelCode, firstName: parsed.data.firstName, lastName: parsed.data.lastName },
    });

    revalidatePath("/personnel");
    return inserted[0];
  });
}

export async function updatePersonnelAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("personnel:write");

  const prepared = preparePersonnelInput(input as Record<string, unknown>);
  const parsed = updatePersonnelSchema.safeParse(prepared);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map(e => e.message).join(", "));
  }

  return await withTenantSession(session, async (tx: any) => {
    const existing = await tx
      .select({ id: personnel.id, tenantId: personnel.tenantId })
      .from(personnel)
      .where(
        and(
          eq(personnel.id, parsed.data.id),
          eq(personnel.tenantId, session.user.tenantId),
          isNull(personnel.deletedAt),
        )
      )
      .limit(1);

    if (!existing[0]) {
      throw new Error("Personnel not found");
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.personnelCode !== undefined) updateData.personnelCode = parsed.data.personnelCode;
    if (parsed.data.firstName !== undefined) updateData.firstName = parsed.data.firstName;
    if (parsed.data.lastName !== undefined) updateData.lastName = parsed.data.lastName;
    if (parsed.data.titleId !== undefined) updateData.titleId = parsed.data.titleId ?? null;
    if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
    if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone ?? null;
    if (parsed.data.email !== undefined) updateData.email = parsed.data.email ?? null;
    if (parsed.data.hiredAt !== undefined) updateData.hiredAt = parsed.data.hiredAt ?? null;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes ?? null;
    updateData.updatedAt = new Date();
    updateData.updatedBy = session.user.id;

    const updated = await tx
      .update(personnel)
      .set(updateData)
      .where(
        and(
          eq(personnel.id, parsed.data.id),
          eq(personnel.tenantId, session.user.tenantId),
        )
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "personnel",
      recordId: parsed.data.id,
      operation: "UPDATE",
      afterValue: { personnelCode: parsed.data.personnelCode, firstName: parsed.data.firstName, lastName: parsed.data.lastName },
    });

    revalidatePath("/personnel");
    return updated[0];
  });
}

export async function deactivatePersonnelAction(id: string) {
  const session = await requireSession();
  await ensurePermission("personnel:write");

  return await withTenantSession(session, async (tx: any) => {
    const updated = await tx
      .update(personnel)
      .set({
        isActive: false,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(personnel.id, id),
          eq(personnel.tenantId, session.user.tenantId),
        )
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "personnel",
      recordId: id,
      operation: "UPDATE",
      afterValue: { isActive: false },
    });

    revalidatePath("/personnel");
    return updated[0];
  });
}

export async function activatePersonnelAction(id: string) {
  const session = await requireSession();
  await ensurePermission("personnel:write");

  return await withTenantSession(session, async (tx: any) => {
    const updated = await tx
      .update(personnel)
      .set({
        isActive: true,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(personnel.id, id),
          eq(personnel.tenantId, session.user.tenantId),
        )
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "personnel",
      recordId: id,
      operation: "UPDATE",
      afterValue: { isActive: true },
    });

    revalidatePath("/personnel");
    return updated[0];
  });
}

export async function getPersonnelStatsAction() {
  const session = await requireSession();
  await ensurePermission("personnel:read");

  return await withTenantSession(session, async (tx: any) => {
    const allPersonnel = await tx
      .select({
        isActive: personnel.isActive,
        count: sql<number>`count(*)`,
      })
      .from(personnel)
      .where(
        and(
          eq(personnel.tenantId, session.user.tenantId),
          isNull(personnel.deletedAt),
        )
      )
      .groupBy(personnel.isActive);

    let total = 0;
    let active = 0;
    let inactive = 0;

    for (const row of allPersonnel) {
      total += Number(row.count);
      if (row.isActive) {
        active += Number(row.count);
      } else {
        inactive += Number(row.count);
      }
    }

    // Count on-shift (personnel with an active shift assigned today)
    // For now just return active count as onShift since we can't easily join shifts
    const onShift = active;
    const onLeave = 0;

    return { total, active, inactive, onShift, onLeave };
  });
}

export async function getPersonnelTitlesAction() {
  const session = await requireSession();
  await ensurePermission("personnel:read");

  return await withTenantSession(session, async (tx: any) => {
    const titles = await tx
      .select()
      .from(personnelTitles)
      .where(
        and(
          eq(personnelTitles.tenantId, session.user.tenantId),
          eq(personnelTitles.isActive, true),
        )
      )
      .orderBy(asc(personnelTitles.titleName));

    return titles;
  });
}

// ─── Machine Assignments ──────────────────────────────────────────────────────

export async function assignMachineAction(personnelId: string, machineId: string, assignmentType: string = "primary") {
  const session = await requireSession();
  await ensurePermission("personnel:write");

  return await withTenantSession(session, async (tx: any) => {
    // Verify personnel exists and belongs to tenant
    const existingPersonnel = await tx
      .select({ id: personnel.id })
      .from(personnel)
      .where(
        and(
          eq(personnel.id, personnelId),
          eq(personnel.tenantId, session.user.tenantId),
          isNull(personnel.deletedAt),
        )
      )
      .limit(1);

    if (!existingPersonnel[0]) {
      throw new Error("Personnel not found");
    }

    const id = generateULID();
    const inserted = await tx
      .insert(personnelMachineAssignments)
      .values({
        id,
        personnelId,
        machineId,
        assignmentType,
        assignedAt: new Date(),
      })
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "personnel_machine_assignments",
      recordId: id,
      operation: "INSERT",
      afterValue: { personnelId, machineId, assignmentType },
    });

    revalidatePath("/personnel");
    revalidatePath("/machines");
    return inserted[0];
  });
}

export async function removeMachineAssignmentAction(assignmentId: string) {
  const session = await requireSession();
  await ensurePermission("personnel:write");

  return await withTenantSession(session, async (tx: any) => {
    const existing = await tx
      .select({ id: personnelMachineAssignments.id })
      .from(personnelMachineAssignments)
      .where(
        and(
          eq(personnelMachineAssignments.id, assignmentId),
        )
      )
      .limit(1);

    if (!existing[0]) {
      throw new Error("Assignment not found");
    }

    await tx
      .delete(personnelMachineAssignments)
      .where(eq(personnelMachineAssignments.id, assignmentId));

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "personnel_machine_assignments",
      recordId: assignmentId,
      operation: "DELETE",
      afterValue: { removed: true },
    });

    revalidatePath("/personnel");
    revalidatePath("/machines");
    return { success: true };
  });
}

export async function getPersonnelMachineAssignmentsAction(personnelId: string) {
  const session = await requireSession();
  await ensurePermission("personnel:read");

  return await withTenantSession(session, async (tx: any) => {
    const assignments = await tx
      .select()
      .from(personnelMachineAssignments)
      .where(
        and(
          eq(personnelMachineAssignments.personnelId, personnelId),
          isNull(personnelMachineAssignments.releasedAt),
        )
      )
      .orderBy(asc(personnelMachineAssignments.assignedAt));

    return assignments;
  });
}

export async function getMachinesForPersonnelAction(personnelId: string) {
  const session = await requireSession();
  await ensurePermission("personnel:read");

  return await withTenantSession(session, async (tx: any) => {
    // This joins machine assignments with machine details
    const { machines } = require("@repo/db");
    const result = await tx
      .select({
        assignment: personnelMachineAssignments,
        machine: machines,
      })
      .from(personnelMachineAssignments)
      .innerJoin(
        machines,
        eq(personnelMachineAssignments.machineId, machines.id)
      )
      .where(
        and(
          eq(personnelMachineAssignments.personnelId, personnelId),
          isNull(personnelMachineAssignments.releasedAt),
          isNull(machines.deletedAt),
        )
      )
      .orderBy(asc(personnelMachineAssignments.assignedAt));

    return result;
  });
}

// ─── Machine Operators (bidirectional) ────────────────────────────────────────

export async function getMachineOperatorsAction(machineId: string) {
  const session = await requireSession();
  await ensurePermission("machines:read");

  return await withTenantSession(session, async (tx: any) => {
    const result = await tx
      .select({
        assignment: personnelMachineAssignments,
        personnel: personnel,
      })
      .from(personnelMachineAssignments)
      .innerJoin(
        personnel,
        eq(personnelMachineAssignments.personnelId, personnel.id)
      )
      .where(
        and(
          eq(personnelMachineAssignments.machineId, machineId),
          isNull(personnelMachineAssignments.releasedAt),
          isNull(personnel.deletedAt),
        )
      )
      .orderBy(asc(personnelMachineAssignments.assignedAt));

    return result;
  });
}

// ─── Personnel Title CRUD ─────────────────────────────────────────────────────

export async function getAllPersonnelTitlesAction() {
  const session = await requireSession();
  await ensurePermission("personnel:read");

  return await withTenantSession(session, async (tx: any) => {
    const titles = await tx
      .select()
      .from(personnelTitles)
      .where(eq(personnelTitles.tenantId, session.user.tenantId))
      .orderBy(asc(personnelTitles.titleName));

    return titles;
  });
}

export async function createPersonnelTitleAction(titleName: string) {
  const session = await requireSession();
  await ensurePermission("personnel:write");

  return await withTenantSession(session, async (tx: any) => {
    const id = generateULID();
    const now = new Date();
    const inserted = await tx
      .insert(personnelTitles)
      .values({
        id,
        tenantId: session.user.tenantId,
        titleName: titleName.trim(),
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "personnel_titles",
      recordId: id,
      operation: "INSERT",
      afterValue: { titleName: titleName.trim(), isActive: true },
    });

    revalidatePath("/personnel");
    return inserted[0];
  });
}

export async function updatePersonnelTitleAction(id: string, data: { titleName?: string; isActive?: boolean }) {
  const session = await requireSession();
  await ensurePermission("personnel:write");

  return await withTenantSession(session, async (tx: any) => {
    const now = new Date();
    const updateData: Record<string, unknown> = { updatedAt: now, updatedBy: session.user.id };
    if (data.titleName !== undefined) updateData.titleName = data.titleName.trim();
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await tx
      .update(personnelTitles)
      .set(updateData)
      .where(
        and(
          eq(personnelTitles.id, id),
          eq(personnelTitles.tenantId, session.user.tenantId),
        )
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "personnel_titles",
      recordId: id,
      operation: "UPDATE",
      afterValue: data,
    });

    revalidatePath("/personnel");
    return updated[0];
  });
}

export async function deactivatePersonnelTitleAction(id: string) {
  return updatePersonnelTitleAction(id, { isActive: false });
}

export async function activatePersonnelTitleAction(id: string) {
  return updatePersonnelTitleAction(id, { isActive: true });
}
