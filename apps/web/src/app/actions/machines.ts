"use server";

import { revalidatePath } from "next/cache";
import { db, machines, auditLogs } from "@repo/db";
import { eq, and, asc, desc, like, or, sql } from "drizzle-orm";
import {
  createMachineSchema,
  updateMachineSchema,
  type CreateMachineInput,
  type UpdateMachineInput,
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

export interface MachineListFilters {
  search?: string;
  status?: string;
  machineType?: string;
  factoryId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function getMachinesAction(filters?: MachineListFilters) {
  const tActionStart = Date.now();
  console.log(`[PERF_LOG] [${tActionStart}] [getMachinesAction] - Started`);
  const session = await requireSession();
  await ensurePermission("machines:read");

  const res = await withTenantSession(session, async (tx: any) => {
    const conditions: any[] = [
      eq(machines.tenantId, session.user.tenantId),
      sql`${machines.deletedAt} IS NULL`,
    ];

    if (filters?.status) {
      conditions.push(eq(machines.status, filters.status));
    }

    if (filters?.machineType) {
      conditions.push(eq(machines.machineType, filters.machineType));
    }

    if (filters?.factoryId) {
      conditions.push(eq(machines.factoryId, filters.factoryId));
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(machines.machineCode, searchPattern),
          like(machines.name, searchPattern),
          like(machines.brand, searchPattern),
          like(machines.model, searchPattern),
          like(machines.serialNumber, searchPattern),
        )
      );
    }

    const where = and(...conditions);
    const orderByColumn = filters?.sortBy ?? "createdAt";
    const orderByDir = filters?.sortOrder === "asc" ? asc : desc;
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const tFirstSql = Date.now();
    console.log(`[PERF_LOG] [${tFirstSql}] [7. İlk SQL] - Executing select query`);
    const items = await tx
      .select()
      .from(machines)
      .where(where)
      .orderBy(orderByDir((machines as any)[orderByColumn] ?? machines.createdAt))
      .limit(pageSize)
      .offset(offset);
    console.log(`[PERF_LOG] [${Date.now()}] [7. İlk SQL] - Completed (Duration: ${Date.now() - tFirstSql}ms)`);

    const tLastSql = Date.now();
    console.log(`[PERF_LOG] [${tLastSql}] [8. Son SQL] - Executing count query`);
    const totalResult = await tx
      .select({ count: sql<number>`count(*)` })
      .from(machines)
      .where(where);
    console.log(`[PERF_LOG] [${Date.now()}] [8. Son SQL] - Completed (Duration: ${Date.now() - tLastSql}ms)`);

    const total = Number(totalResult[0]?.count ?? 0);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  });

  console.log(`[PERF_LOG] [${Date.now()}] [getMachinesAction] - Completed (Duration: ${Date.now() - tActionStart}ms)`);
  return res;
}

export async function getMachineByIdAction(id: string) {
  const session = await requireSession();
  await ensurePermission("machines:read");

  return await withTenantSession(session, async (tx: any) => {
    const item = await tx
      .select()
      .from(machines)
      .where(
        and(
          eq(machines.id, id),
          eq(machines.tenantId, session.user.tenantId),
          sql`${machines.deletedAt} IS NULL`,
        )
      )
      .limit(1);

    return item[0] ?? null;
  });
}

// Helper to convert empty strings to null and numeric strings to numbers
function transformNumericFields(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const record = input as Record<string, unknown>;
  const numericFields = [
    "hourlyCapacity", "dailyCapacity",
    "maxGlassWidthMm", "maxGlassHeightMm",
    "maxThicknessMm", "minThicknessMm",
    "manufactureYear",
  ];
  for (const key of numericFields) {
    if (key in record) {
      const val = record[key];
      if (val === "" || val === null || val === undefined) {
        record[key] = null;
      } else if (typeof val === "string" && val.trim() !== "") {
        const num = Number(val);
        record[key] = isNaN(num) ? val : num;
      }
    }
  }
  // Convert empty string dates to null
  const dateFields = ["purchasedAt", "commissionedAt", "warrantyStartsAt", "warrantyEndsAt"];
  for (const key of dateFields) {
    if (key in record && record[key] === "") {
      record[key] = null;
    }
  }
  return record;
}

export async function createMachineAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("machines:write");

  // Transform string values to numbers for numeric fields
  const transformed = transformNumericFields(input);

  const parsed = createMachineSchema.safeParse(transformed);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map(e => e.message).join(", "));
  }

  return await withTenantSession(session, async (tx: any) => {
    const id = generateULID();

    const inserted = await tx
      .insert(machines)
      .values({
        id,
        tenantId: session.user.tenantId,
        factoryId: parsed.data.factoryId ?? null,
        stationId: parsed.data.stationId ?? null,
        machineCode: parsed.data.machineCode,
        name: parsed.data.name,
        machineType: parsed.data.machineType,
        brand: parsed.data.brand ?? null,
        model: parsed.data.model ?? null,
        serialNumber: parsed.data.serialNumber ?? null,
        manufactureYear: parsed.data.manufactureYear ?? null,
        purchasedAt: parsed.data.purchasedAt ?? null,
        commissionedAt: parsed.data.commissionedAt ?? null,
        warrantyStartsAt: parsed.data.warrantyStartsAt ?? null,
        warrantyEndsAt: parsed.data.warrantyEndsAt ?? null,
        status: parsed.data.status ?? "active",
        hourlyCapacity: parsed.data.hourlyCapacity ?? null,
        dailyCapacity: parsed.data.dailyCapacity ?? null,
        maxGlassWidthMm: parsed.data.maxGlassWidthMm ?? null,
        maxGlassHeightMm: parsed.data.maxGlassHeightMm ?? null,
        maxThicknessMm: parsed.data.maxThicknessMm ?? null,
        minThicknessMm: parsed.data.minThicknessMm ?? null,
        isActive: true,
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
      tableName: "machines",
      recordId: id,
      operation: "INSERT",
      afterValue: { machineCode: parsed.data.machineCode, name: parsed.data.name },
    });

    revalidatePath("/machines");
    return inserted[0];
  });
}

export async function updateMachineAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("machines:write");

  const transformed = transformNumericFields(input);
  const parsed = updateMachineSchema.safeParse(transformed);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map(e => e.message).join(", "));
  }

  return await withTenantSession(session, async (tx: any) => {
    const existing = await tx
      .select({ id: machines.id, tenantId: machines.tenantId })
      .from(machines)
      .where(
        and(
          eq(machines.id, parsed.data.id),
          eq(machines.tenantId, session.user.tenantId),
          sql`${machines.deletedAt} IS NULL`,
        )
      )
      .limit(1);

    if (!existing[0]) {
      throw new Error("Machine not found");
    }

    const updated = await tx
      .update(machines)
      .set({
        machineCode: parsed.data.machineCode,
        name: parsed.data.name,
        machineType: parsed.data.machineType,
        factoryId: parsed.data.factoryId ?? null,
        stationId: parsed.data.stationId ?? null,
        brand: parsed.data.brand ?? null,
        model: parsed.data.model ?? null,
        serialNumber: parsed.data.serialNumber ?? null,
        manufactureYear: parsed.data.manufactureYear ?? null,
        purchasedAt: parsed.data.purchasedAt ?? null,
        commissionedAt: parsed.data.commissionedAt ?? null,
        warrantyStartsAt: parsed.data.warrantyStartsAt ?? null,
        warrantyEndsAt: parsed.data.warrantyEndsAt ?? null,
        status: parsed.data.status ?? undefined,
        hourlyCapacity: parsed.data.hourlyCapacity ?? null,
        dailyCapacity: parsed.data.dailyCapacity ?? null,
        maxGlassWidthMm: parsed.data.maxGlassWidthMm ?? null,
        maxGlassHeightMm: parsed.data.maxGlassHeightMm ?? null,
        maxThicknessMm: parsed.data.maxThicknessMm ?? null,
        minThicknessMm: parsed.data.minThicknessMm ?? null,
        notes: parsed.data.notes ?? null,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(machines.id, parsed.data.id),
          eq(machines.tenantId, session.user.tenantId),
        )
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "machines",
      recordId: parsed.data.id,
      operation: "UPDATE",
      afterValue: { machineCode: parsed.data.machineCode, name: parsed.data.name },
    });

    revalidatePath("/machines");
    return updated[0];
  });
}

export async function deactivateMachineAction(id: string) {
  const session = await requireSession();
  await ensurePermission("machines:write");

  return await withTenantSession(session, async (tx: any) => {
    const updated = await tx
      .update(machines)
      .set({
        isActive: false,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(machines.id, id),
          eq(machines.tenantId, session.user.tenantId),
        )
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "machines",
      recordId: id,
      operation: "UPDATE",
      afterValue: { isActive: false },
    });

    revalidatePath("/machines");
    return updated[0];
  });
}

export async function activateMachineAction(id: string) {
  const session = await requireSession();
  await ensurePermission("machines:write");

  return await withTenantSession(session, async (tx: any) => {
    const updated = await tx
      .update(machines)
      .set({
        isActive: true,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(machines.id, id),
          eq(machines.tenantId, session.user.tenantId),
        )
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "machines",
      recordId: id,
      operation: "UPDATE",
      afterValue: { isActive: true },
    });

    revalidatePath("/machines");
    return updated[0];
  });
}

export async function getMachineStatsAction() {
  const session = await requireSession();
  await ensurePermission("machines:read");

  return await withTenantSession(session, async (tx: any) => {
    const allMachines = await tx
      .select({
        status: machines.status,
        isActive: machines.isActive,
        count: sql<number>`count(*)`,
      })
      .from(machines)
      .where(
        and(
          eq(machines.tenantId, session.user.tenantId),
          sql`${machines.deletedAt} IS NULL`,
        )
      )
      .groupBy(machines.status, machines.isActive);

    let total = 0;
    let active = 0;
    let inMaintenance = 0;
    let idle = 0;

    for (const row of allMachines) {
      const c = Number(row.count);
      total += c;
      if (row.status === "maintenance") inMaintenance += c;
      else if (row.status === "idle") idle += c;
      else if (row.isActive) active += c;
    }

    return { total, active, inMaintenance, idle };
  });
}
