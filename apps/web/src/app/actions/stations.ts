"use server";

import { revalidatePath } from "next/cache";
import { db, stations, stationMachineAssignments, stationPersonnelAssignments, machines, personnel, auditLogs } from "@repo/db";
import { eq, and, asc, desc, like, or, sql } from "drizzle-orm";
import {
  createStationSchema,
  updateStationSchema,
  assignMachineToStationSchema,
  assignPersonnelToStationSchema,
  type CreateStationInput,
  type UpdateStationInput,
  type AssignMachineToStationInput,
  type AssignPersonnelToStationInput,
} from "@repo/types";
import { requireSession } from "@/lib/session";
import { withTenantSession } from "@/lib/dbSession";
import { ensurePermission } from "@/lib/authorization";
import { perfLog, perfStart, perfEnd } from "@/lib/perf";

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

export interface StationListFilters {
  search?: string;
  stationType?: string;
  isActive?: string;
  factoryId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function getStationsAction(filters?: StationListFilters) {
  const tActionStart = perfStart("[getStationsAction]");
  perfLog("[getStationsAction]", "Started", Date.now());
  const session = await requireSession();
  await ensurePermission("stations:read");

  const res = await withTenantSession(session, async (tx: any) => {
    const conditions: any[] = [
      eq(stations.tenantId, session.user.tenantId),
      sql`${stations.deletedAt} IS NULL`,
    ];

    if (filters?.isActive !== undefined && filters?.isActive !== "") {
      conditions.push(eq(stations.isActive, filters.isActive === "true"));
    }

    if (filters?.stationType) {
      conditions.push(eq(stations.stationType, filters.stationType));
    }

    if (filters?.factoryId) {
      conditions.push(eq(stations.factoryId, filters.factoryId));
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(stations.stationCode, searchPattern),
          like(stations.name, searchPattern),
          like(stations.description, searchPattern),
        )
      );
    }

    const where = and(...conditions);
    const orderByColumn = filters?.sortBy ?? "createdAt";
    const orderByDir = filters?.sortOrder === "asc" ? asc : desc;
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const tSelect = perfStart("[getStationsAction] SELECT");
    perfLog("[getStationsAction]", "Executing select query", Date.now());
    const items = await tx
      .select()
      .from(stations)
      .where(where)
      .orderBy(orderByDir((stations as any)[orderByColumn] ?? stations.createdAt))
      .limit(pageSize)
      .offset(offset);
    perfEnd("[getStationsAction] SELECT", tSelect);

    const tCount = perfStart("[getStationsAction] COUNT");
    const totalResult = await tx
      .select({ count: sql<number>`count(*)` })
      .from(stations)
      .where(where);
    perfEnd("[getStationsAction] COUNT", tCount);

    const total = Number(totalResult[0]?.count ?? 0);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  });

  perfEnd("[getStationsAction]", tActionStart);
  return res;
}

export async function getStationByIdAction(id: string) {
  const tActionStart = perfStart("[getStationByIdAction]");
  perfLog("[getStationByIdAction]", `Fetching station ${id}`, Date.now());
  const session = await requireSession();
  await ensurePermission("stations:read");

  const res = await withTenantSession(session, async (tx: any) => {
    const tQuery = perfStart("[getStationByIdAction] SQL");
    const item = await tx
      .select()
      .from(stations)
      .where(
        and(
          eq(stations.id, id),
          eq(stations.tenantId, session.user.tenantId),
          sql`${stations.deletedAt} IS NULL`,
        )
      )
      .limit(1);
    perfEnd("[getStationByIdAction] SQL", tQuery);

    return item[0] ?? null;
  });

  perfEnd("[getStationByIdAction]", tActionStart);
  return res;
}

export async function getStationStatsAction() {
  const tActionStart = perfStart("[getStationStatsAction]");
  perfLog("[getStationStatsAction]", "Started", Date.now());
  const session = await requireSession();
  await ensurePermission("stations:read");

  const res = await withTenantSession(session, async (tx: any) => {
    const tQuery = perfStart("[getStationStatsAction] SQL");
    const allStations = await tx
      .select({
        isActive: stations.isActive,
        count: sql<number>`count(*)`,
      })
      .from(stations)
      .where(
        and(
          eq(stations.tenantId, session.user.tenantId),
          sql`${stations.deletedAt} IS NULL`,
        )
      )
      .groupBy(stations.isActive);
    perfEnd("[getStationStatsAction] SQL", tQuery);

    let total = 0;
    let active = 0;
    let inactive = 0;

    for (const row of allStations) {
      const c = Number(row.count);
      total += c;
      if (row.isActive) active += c;
      else inactive += c;
    }

    return { total, active, inactive };
  });

  perfEnd("[getStationStatsAction]", tActionStart);
  return res;
}

export async function createStationAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("stations:write");

  const parsed = createStationSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map(e => e.message).join(", "));
  }

  return await withTenantSession(session, async (tx: any) => {
    const id = generateULID();

    const inserted = await tx
      .insert(stations)
      .values({
        id,
        tenantId: session.user.tenantId,
        factoryId: parsed.data.factoryId ?? null,
        stationCode: parsed.data.stationCode,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        stationType: parsed.data.stationType,
        sortOrder: parsed.data.sortOrder ?? 0,
        maxConcurrentJobs: parsed.data.maxConcurrentJobs ?? 1,
        maxMachines: parsed.data.maxMachines ?? null,
        maxOperators: parsed.data.maxOperators ?? null,
        isActive: parsed.data.isActive ?? true,
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
      tableName: "stations",
      recordId: id,
      operation: "INSERT",
      afterValue: { stationCode: parsed.data.stationCode, name: parsed.data.name },
    });

    revalidatePath("/stations");
    return inserted[0];
  });
}

export async function updateStationAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("stations:write");

  const parsed = updateStationSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map(e => e.message).join(", "));
  }

  return await withTenantSession(session, async (tx: any) => {
    const existing = await tx
      .select({ id: stations.id, tenantId: stations.tenantId })
      .from(stations)
      .where(
        and(
          eq(stations.id, parsed.data.id),
          eq(stations.tenantId, session.user.tenantId),
          sql`${stations.deletedAt} IS NULL`,
        )
      )
      .limit(1);

    if (!existing[0]) {
      throw new Error("Station not found");
    }

    const updated = await tx
      .update(stations)
      .set({
        stationCode: parsed.data.stationCode,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        stationType: parsed.data.stationType,
        factoryId: parsed.data.factoryId ?? null,
        sortOrder: parsed.data.sortOrder ?? undefined,
        maxConcurrentJobs: parsed.data.maxConcurrentJobs ?? undefined,
        maxMachines: parsed.data.maxMachines ?? null,
        maxOperators: parsed.data.maxOperators ?? null,
        notes: parsed.data.notes ?? null,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(stations.id, parsed.data.id),
          eq(stations.tenantId, session.user.tenantId),
        )
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "stations",
      recordId: parsed.data.id,
      operation: "UPDATE",
      afterValue: { stationCode: parsed.data.stationCode, name: parsed.data.name },
    });

    revalidatePath("/stations");
    return updated[0];
  });
}

export async function deactivateStationAction(id: string) {
  const session = await requireSession();
  await ensurePermission("stations:write");

  return await withTenantSession(session, async (tx: any) => {
    const updated = await tx
      .update(stations)
      .set({
        isActive: false,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(stations.id, id),
          eq(stations.tenantId, session.user.tenantId),
        )
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "stations",
      recordId: id,
      operation: "UPDATE",
      afterValue: { isActive: false },
    });

    revalidatePath("/stations");
    return updated[0];
  });
}

export async function activateStationAction(id: string) {
  const session = await requireSession();
  await ensurePermission("stations:write");

  return await withTenantSession(session, async (tx: any) => {
    const updated = await tx
      .update(stations)
      .set({
        isActive: true,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(stations.id, id),
          eq(stations.tenantId, session.user.tenantId),
        )
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "stations",
      recordId: id,
      operation: "UPDATE",
      afterValue: { isActive: true },
    });

    revalidatePath("/stations");
    return updated[0];
  });
}

// ── Machine Assignments ──────────────────────────────────────────

export async function getStationMachinesAction(stationId: string) {
  const tActionStart = perfStart("[getStationMachinesAction]");
  perfLog("[getStationMachinesAction]", `Fetching machines for station ${stationId}`, Date.now());
  const session = await requireSession();
  await ensurePermission("stations:read");

  const res = await withTenantSession(session, async (tx: any) => {
    const tQuery = perfStart("[getStationMachinesAction] SQL");
    const assignments = await tx
      .select({
        id: stationMachineAssignments.id,
        stationId: stationMachineAssignments.stationId,
        machineId: stationMachineAssignments.machineId,
        isPrimary: stationMachineAssignments.isPrimary,
        assignedAt: stationMachineAssignments.assignedAt,
        machineCode: machines.machineCode,
        machineName: machines.name,
        machineType: machines.machineType,
        machineStatus: machines.status,
        machineIsActive: machines.isActive,
      })
      .from(stationMachineAssignments)
      .innerJoin(
        machines,
        eq(stationMachineAssignments.machineId, machines.id),
      )
      .where(
        and(
          eq(stationMachineAssignments.stationId, stationId),
          sql`${machines.deletedAt} IS NULL`,
        )
      )
      .orderBy(desc(stationMachineAssignments.assignedAt));
    perfEnd("[getStationMachinesAction] SQL", tQuery);

    return assignments;
  });

  perfEnd("[getStationMachinesAction]", tActionStart);
  return res;
}

export async function assignMachineToStationAction(input: AssignMachineToStationInput) {
  const session = await requireSession();
  await ensurePermission("stations:write");

  const parsed = assignMachineToStationSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map(e => e.message).join(", "));
  }

  return await withTenantSession(session, async (tx: any) => {
    // Check if machine is already assigned to this station
    const existing = await tx
      .select({ id: stationMachineAssignments.id })
      .from(stationMachineAssignments)
      .where(
        and(
          eq(stationMachineAssignments.stationId, parsed.data.stationId),
          eq(stationMachineAssignments.machineId, parsed.data.machineId),
        )
      )
      .limit(1);

    if (existing[0]) {
      throw new Error("Machine is already assigned to this station");
    }

    const id = generateULID();
    const inserted = await tx
      .insert(stationMachineAssignments)
      .values({
        id,
        stationId: parsed.data.stationId,
        machineId: parsed.data.machineId,
        isPrimary: parsed.data.isPrimary,
        assignedAt: new Date(),
      })
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "station_machine_assignments",
      recordId: id,
      operation: "INSERT",
      afterValue: { stationId: parsed.data.stationId, machineId: parsed.data.machineId },
    });

    revalidatePath("/stations");
    revalidatePath("/machines");
    return inserted[0];
  });
}

export async function removeMachineFromStationAction(assignmentId: string) {
  const session = await requireSession();
  await ensurePermission("stations:write");

  return await withTenantSession(session, async (tx: any) => {
    const deleted = await tx
      .delete(stationMachineAssignments)
      .where(eq(stationMachineAssignments.id, assignmentId))
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "station_machine_assignments",
      recordId: assignmentId,
      operation: "DELETE",
      afterValue: { deleted: true },
    });

    revalidatePath("/stations");
    revalidatePath("/machines");
    return deleted[0];
  });
}

export async function getAvailableMachinesForStationAction(stationId: string) {
  const tActionStart = perfStart("[getAvailableMachinesForStationAction]");
  perfLog("[getAvailableMachinesForStationAction]", `Fetching available machines for station ${stationId}`, Date.now());
  const session = await requireSession();
  await ensurePermission("stations:read");

  const res = await withTenantSession(session, async (tx: any) => {
    // Get machines that are NOT assigned to this station
    const tQuery = perfStart("[getAvailableMachinesForStationAction] SQL");
    const assignedSubquery = tx
      .select({ machineId: stationMachineAssignments.machineId })
      .from(stationMachineAssignments)
      .where(eq(stationMachineAssignments.stationId, stationId));

    const availableMachines = await tx
      .select()
      .from(machines)
      .where(
        and(
          eq(machines.tenantId, session.user.tenantId),
          sql`${machines.deletedAt} IS NULL`,
          sql`${machines.id} NOT IN (${assignedSubquery})`,
        )
      );
    perfEnd("[getAvailableMachinesForStationAction] SQL", tQuery);

    return availableMachines;
  });

  perfEnd("[getAvailableMachinesForStationAction]", tActionStart);
  return res;
}

// ── Personnel Assignments ────────────────────────────────────────

export async function getStationPersonnelAction(stationId: string) {
  const tActionStart = perfStart("[getStationPersonnelAction]");
  perfLog("[getStationPersonnelAction]", `Fetching personnel for station ${stationId}`, Date.now());
  const session = await requireSession();
  await ensurePermission("stations:read");

  const res = await withTenantSession(session, async (tx: any) => {
    const tQuery = perfStart("[getStationPersonnelAction] SQL");
    const assignments = await tx
      .select({
        id: stationPersonnelAssignments.id,
        stationId: stationPersonnelAssignments.stationId,
        personnelId: stationPersonnelAssignments.personnelId,
        isHeadOperator: stationPersonnelAssignments.isHeadOperator,
        assignedAt: stationPersonnelAssignments.assignedAt,
        personnelCode: personnel.personnelCode,
        firstName: personnel.firstName,
        lastName: personnel.lastName,
        role: personnel.role,
        isActive: personnel.isActive,
      })
      .from(stationPersonnelAssignments)
      .innerJoin(
        personnel,
        eq(stationPersonnelAssignments.personnelId, personnel.id),
      )
      .where(
        and(
          eq(stationPersonnelAssignments.stationId, stationId),
          sql`${personnel.deletedAt} IS NULL`,
        )
      )
      .orderBy(desc(stationPersonnelAssignments.assignedAt));
    perfEnd("[getStationPersonnelAction] SQL", tQuery);

    return assignments;
  });

  perfEnd("[getStationPersonnelAction]", tActionStart);
  return res;
}

export async function assignPersonnelToStationAction(input: AssignPersonnelToStationInput) {
  const session = await requireSession();
  await ensurePermission("stations:write");

  const parsed = assignPersonnelToStationSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map(e => e.message).join(", "));
  }

  return await withTenantSession(session, async (tx: any) => {
    // Check if personnel is already assigned to this station
    const existing = await tx
      .select({ id: stationPersonnelAssignments.id })
      .from(stationPersonnelAssignments)
      .where(
        and(
          eq(stationPersonnelAssignments.stationId, parsed.data.stationId),
          eq(stationPersonnelAssignments.personnelId, parsed.data.personnelId),
        )
      )
      .limit(1);

    if (existing[0]) {
      throw new Error("Personnel is already assigned to this station");
    }

    const id = generateULID();
    const inserted = await tx
      .insert(stationPersonnelAssignments)
      .values({
        id,
        stationId: parsed.data.stationId,
        personnelId: parsed.data.personnelId,
        isHeadOperator: parsed.data.isHeadOperator,
        assignedAt: new Date(),
      })
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "station_personnel_assignments",
      recordId: id,
      operation: "INSERT",
      afterValue: { stationId: parsed.data.stationId, personnelId: parsed.data.personnelId },
    });

    revalidatePath("/stations");
    revalidatePath("/personnel");
    return inserted[0];
  });
}

export async function removePersonnelFromStationAction(assignmentId: string) {
  const session = await requireSession();
  await ensurePermission("stations:write");

  return await withTenantSession(session, async (tx: any) => {
    const deleted = await tx
      .delete(stationPersonnelAssignments)
      .where(eq(stationPersonnelAssignments.id, assignmentId))
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "station_personnel_assignments",
      recordId: assignmentId,
      operation: "DELETE",
      afterValue: { deleted: true },
    });

    revalidatePath("/stations");
    revalidatePath("/personnel");
    return deleted[0];
  });
}

export async function getAvailablePersonnelForStationAction(stationId: string) {
  const tActionStart = perfStart("[getAvailablePersonnelForStationAction]");
  perfLog("[getAvailablePersonnelForStationAction]", `Fetching available personnel for station ${stationId}`, Date.now());
  const session = await requireSession();
  await ensurePermission("stations:read");

  const res = await withTenantSession(session, async (tx: any) => {
    // Get personnel that are NOT assigned to this station
    const tQuery = perfStart("[getAvailablePersonnelForStationAction] SQL");
    const assignedSubquery = tx
      .select({ personnelId: stationPersonnelAssignments.personnelId })
      .from(stationPersonnelAssignments)
      .where(eq(stationPersonnelAssignments.stationId, stationId));

    const availablePersonnel = await tx
      .select()
      .from(personnel)
      .where(
        and(
          eq(personnel.tenantId, session.user.tenantId),
          sql`${personnel.deletedAt} IS NULL`,
          sql`${personnel.id} NOT IN (${assignedSubquery})`,
        )
      );
    perfEnd("[getAvailablePersonnelForStationAction] SQL", tQuery);

    return availablePersonnel;
  });

  perfEnd("[getAvailablePersonnelForStationAction]", tActionStart);
  return res;
}

// ── Bidirectional Queries ────────────────────────────────────────

export async function getStationByMachineIdAction(machineId: string) {
  const tActionStart = perfStart("[getStationByMachineIdAction]");
  perfLog("[getStationByMachineIdAction]", `Fetching station for machine ${machineId}`, Date.now());
  const session = await requireSession();
  await ensurePermission("stations:read");

  const res = await withTenantSession(session, async (tx: any) => {
    const tQuery = perfStart("[getStationByMachineIdAction] SQL");
    const assignment = await tx
      .select({
        stationId: stationMachineAssignments.stationId,
        stationCode: stations.stationCode,
        stationName: stations.name,
        stationType: stations.stationType,
        isPrimary: stationMachineAssignments.isPrimary,
      })
      .from(stationMachineAssignments)
      .innerJoin(
        stations,
        eq(stationMachineAssignments.stationId, stations.id),
      )
      .where(
        and(
          eq(stationMachineAssignments.machineId, machineId),
          sql`${stations.deletedAt} IS NULL`,
        )
      )
      .limit(1);
    perfEnd("[getStationByMachineIdAction] SQL", tQuery);

    return assignment[0] ?? null;
  });

  perfEnd("[getStationByMachineIdAction]", tActionStart);
  return res;
}

export async function getStationsByPersonnelIdAction(personnelId: string) {
  const tActionStart = perfStart("[getStationsByPersonnelIdAction]");
  perfLog("[getStationsByPersonnelIdAction]", `Fetching stations for personnel ${personnelId}`, Date.now());
  const session = await requireSession();
  await ensurePermission("stations:read");

  const res = await withTenantSession(session, async (tx: any) => {
    const tQuery = perfStart("[getStationsByPersonnelIdAction] SQL");
    const assignments = await tx
      .select({
        stationId: stationPersonnelAssignments.stationId,
        stationCode: stations.stationCode,
        stationName: stations.name,
        stationType: stations.stationType,
        isHeadOperator: stationPersonnelAssignments.isHeadOperator,
        assignedAt: stationPersonnelAssignments.assignedAt,
      })
      .from(stationPersonnelAssignments)
      .innerJoin(
        stations,
        eq(stationPersonnelAssignments.stationId, stations.id),
      )
      .where(
        and(
          eq(stationPersonnelAssignments.personnelId, personnelId),
          sql`${stations.deletedAt} IS NULL`,
        )
      )
      .orderBy(desc(stationPersonnelAssignments.assignedAt));
    perfEnd("[getStationsByPersonnelIdAction] SQL", tQuery);

    return assignments;
  });

  perfEnd("[getStationsByPersonnelIdAction]", tActionStart);
  return res;
}
