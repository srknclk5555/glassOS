"use server";

import { revalidatePath } from "next/cache";
import { goodsReceipts, goodsReceiptItems, goodsReceiptAttachments, goodsReceiptPlates, auditLogs, inventoryItems, inventoryLots, materialsMaster } from "@repo/db";
import { eq, and, asc, desc, like, or, sql } from "drizzle-orm";
import { createGoodsReceiptSchema, updateGoodsReceiptSchema } from "@repo/types";
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

// ─── Filters Interface ───────────────────────────────────────────────────────

export interface GoodsReceiptListFilters {
  search?: string;
  status?: string;
  warehouseId?: string;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

// ─── List ────────────────────────────────────────────────────────────────────

export async function getGoodsReceiptsAction(filters?: GoodsReceiptListFilters) {
  const tActionStart = perfStart("[getGoodsReceiptsAction]");
  perfLog("[getGoodsReceiptsAction]", "Started", Date.now());
  const session = await requireSession();
  await ensurePermission("goods-receipt:read");

  const res = await withTenantSession(session, async (tx: any) => {
    const conditions: any[] = [
      eq(goodsReceipts.tenantId, session.user.tenantId),
      sql`${goodsReceipts.deletedAt} IS NULL`,
    ];

    if (filters?.status) {
      conditions.push(eq(goodsReceipts.status, filters.status));
    }

    if (filters?.warehouseId) {
      conditions.push(eq(goodsReceipts.warehouseId, filters.warehouseId));
    }

    if (filters?.supplierId) {
      conditions.push(eq(goodsReceipts.supplierId, filters.supplierId));
    }

    if (filters?.dateFrom) {
      conditions.push(sql`${goodsReceipts.receiptDate} >= ${filters.dateFrom}`);
    }

    if (filters?.dateTo) {
      conditions.push(sql`${goodsReceipts.receiptDate} <= ${filters.dateTo}`);
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(goodsReceipts.receiptNumber, searchPattern),
          like(goodsReceipts.vehiclePlate, searchPattern),
          like(goodsReceipts.despatchNumber, searchPattern),
          like(goodsReceipts.invoiceNumber, searchPattern),
          like(goodsReceipts.driverName, searchPattern),
        )
      );
    }

    const where = and(...conditions);
    const orderByColumn = filters?.sortBy ?? "createdAt";
    const orderByDir = filters?.sortOrder === "asc" ? asc : desc;
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const tFirstSql = perfStart("[getGoodsReceiptsAction] SQL");
    perfLog("[getGoodsReceiptsAction]", "Executing select query", Date.now());
    const items = await tx
      .select()
      .from(goodsReceipts)
      .where(where)
      .orderBy(orderByDir((goodsReceipts as any)[orderByColumn] ?? goodsReceipts.createdAt))
      .limit(pageSize)
      .offset(offset);
    perfEnd("[getGoodsReceiptsAction] SQL", tFirstSql);

    const tLastSql = perfStart("[getGoodsReceiptsAction] Count");
    perfLog("[getGoodsReceiptsAction]", "Executing count query", Date.now());
    const totalResult = await tx
      .select({ count: sql<number>`count(*)` })
      .from(goodsReceipts)
      .where(where);
    perfEnd("[getGoodsReceiptsAction] Count", tLastSql);

    const total = Number(totalResult[0]?.count ?? 0);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  });

  perfEnd("[getGoodsReceiptsAction]", tActionStart);
  return res;
}

// ─── Get By ID ───────────────────────────────────────────────────────────────

export async function getGoodsReceiptByIdAction(id: string) {
  const tActionStart = perfStart("[getGoodsReceiptByIdAction]");
  perfLog("[getGoodsReceiptByIdAction]", `Fetching goods receipt ${id}`, Date.now());
  const session = await requireSession();
  await ensurePermission("goods-receipt:read");

  const res = await withTenantSession(session, async (tx: any) => {
    const tQuery = perfStart("[getGoodsReceiptByIdAction] SQL");
    const header = await tx
      .select()
      .from(goodsReceipts)
      .where(
        and(
          eq(goodsReceipts.id, id),
          eq(goodsReceipts.tenantId, session.user.tenantId),
          sql`${goodsReceipts.deletedAt} IS NULL`,
        )
      )
      .limit(1);
    perfEnd("[getGoodsReceiptByIdAction] SQL", tQuery);

    if (!header[0]) return null;

    const items = await tx
      .select()
      .from(goodsReceiptItems)
      .where(eq(goodsReceiptItems.goodsReceiptId, id))
      .orderBy(asc(goodsReceiptItems.lineNo));

    const itemIds = items.map((i: any) => i.id);

    const plates = itemIds.length > 0
      ? await tx
          .select()
          .from(goodsReceiptPlates)
          .where(sql`${goodsReceiptPlates.goodsReceiptItemId} IN (${itemIds.join(",")})`)
      : [];

    const attachments = await tx
      .select()
      .from(goodsReceiptAttachments)
      .where(eq(goodsReceiptAttachments.goodsReceiptId, id));

    return {
      ...header[0],
      items: items.map((item: any) => ({
        ...item,
        plates: plates.filter((p: any) => p.goodsReceiptItemId === item.id),
      })),
      attachments,
    };
  });

  perfEnd("[getGoodsReceiptByIdAction]", tActionStart);
  return res;
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createGoodsReceiptAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("goods-receipt:write");

  const parsed = createGoodsReceiptSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map(e => e.message).join(", "));
  }

  return await withTenantSession(session, async (tx: any) => {
    const id = generateULID();
    const now = new Date();

    // Generate receipt number: GR-{YYYY}-{FACTORY_SHORT}-{SEQ}
    const factoryShort = session.user.factoryId?.slice(0, 4).toUpperCase() ?? "XXXX";
    const receiptNumber = `GR-${now.getFullYear()}-${factoryShort}-${generateULID().slice(0, 6)}`;

    const inserted = await tx
      .insert(goodsReceipts)
      .values({
        id,
        tenantId: session.user.tenantId,
        factoryId: session.user.factoryId ?? parsed.data.warehouseId,
        receiptNumber,
        receiptDate: parsed.data.receiptDate,
        receiptTime: parsed.data.receiptTime,
        warehouseId: parsed.data.warehouseId,
        receivedById: parsed.data.receivedById ?? session.user.id,
        supplierId: parsed.data.supplierId ?? null,
        purchaseOrderId: parsed.data.purchaseOrderId ?? null,
        vehiclePlate: parsed.data.vehiclePlate ?? null,
        trailerPlate: parsed.data.trailerPlate ?? null,
        driverName: parsed.data.driverName ?? null,
        driverPhone: parsed.data.driverPhone ?? null,
        carrierCompany: parsed.data.carrierCompany ?? null,
        despatchNumber: parsed.data.despatchNumber ?? null,
        despatchDate: parsed.data.despatchDate ?? null,
        invoiceNumber: parsed.data.invoiceNumber ?? null,
        orderReference: parsed.data.orderReference ?? null,
        notes: parsed.data.notes ?? null,
        status: "draft",
        createdAt: now,
        updatedAt: now,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning();

    // Insert items
    for (let i = 0; i < parsed.data.items.length; i++) {
      const item = parsed.data.items[i]!;
      const itemId = generateULID();
      const lineNo = i + 1;
      const internalLotNumber = `LOT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${generateULID().slice(0, 8)}`;

      await tx.insert(goodsReceiptItems).values({
        id: itemId,
        goodsReceiptId: id,
        lineNo: String(lineNo),
        materialId: item.materialId,
        formatId: item.formatId ?? null,
        widthMm: item.widthMm ?? null,
        heightMm: item.heightMm ?? null,
        plateCount: item.plateCount ?? null,
        totalAreaM2: item.totalAreaM2 ?? null,
        quantity: String(item.quantity),
        unit: item.unit,
        lotNumber: item.lotNumber ?? null,
        internalLotNumber,
        unitCost: item.unitCost ?? null,
        currency: item.currency ?? null,
        targetWarehouseId: item.targetWarehouseId ?? null,
        qualityStatus: item.qualityStatus ?? "accepted",
        qualityNotes: item.qualityNotes ?? null,
        damagedCount: item.damagedCount ?? null,
        missingCount: item.missingCount ?? null,
        isPlateTracked: item.isPlateTracked ?? false,
      });
    }

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "goods_receipts",
      recordId: id,
      operation: "INSERT",
      afterValue: { receiptNumber, status: "draft" },
    });

    revalidatePath("/goods-receipt");
    return inserted[0];
  });
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateGoodsReceiptAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("goods-receipt:write");

  const parsed = updateGoodsReceiptSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map(e => e.message).join(", "));
  }

  return await withTenantSession(session, async (tx: any) => {
    const existing = await tx
      .select({ id: goodsReceipts.id, tenantId: goodsReceipts.tenantId, status: goodsReceipts.status })
      .from(goodsReceipts)
      .where(
        and(
          eq(goodsReceipts.id, parsed.data.id),
          eq(goodsReceipts.tenantId, session.user.tenantId),
          sql`${goodsReceipts.deletedAt} IS NULL`,
        )
      )
      .limit(1);

    if (!existing[0]) {
      throw new Error("Goods receipt not found");
    }

    if (existing[0].status !== "draft") {
      throw new Error("Only draft goods receipts can be edited");
    }

    const updated = await tx
      .update(goodsReceipts)
      .set({
        receiptDate: parsed.data.receiptDate,
        receiptTime: parsed.data.receiptTime,
        warehouseId: parsed.data.warehouseId,
        receivedById: parsed.data.receivedById,
        supplierId: parsed.data.supplierId ?? null,
        purchaseOrderId: parsed.data.purchaseOrderId ?? null,
        vehiclePlate: parsed.data.vehiclePlate ?? null,
        trailerPlate: parsed.data.trailerPlate ?? null,
        driverName: parsed.data.driverName ?? null,
        driverPhone: parsed.data.driverPhone ?? null,
        carrierCompany: parsed.data.carrierCompany ?? null,
        despatchNumber: parsed.data.despatchNumber ?? null,
        despatchDate: parsed.data.despatchDate ?? null,
        invoiceNumber: parsed.data.invoiceNumber ?? null,
        orderReference: parsed.data.orderReference ?? null,
        notes: parsed.data.notes ?? null,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(goodsReceipts.id, parsed.data.id),
          eq(goodsReceipts.tenantId, session.user.tenantId),
        )
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "goods_receipts",
      recordId: parsed.data.id,
      operation: "UPDATE",
      afterValue: { receiptNumber: updated[0]?.receiptNumber },
    });

    revalidatePath("/goods-receipt");
    return updated[0];
  });
}

// ─── Soft Delete ─────────────────────────────────────────────────────────────

export async function deleteGoodsReceiptAction(id: string) {
  const session = await requireSession();
  await ensurePermission("goods-receipt:write");

  return await withTenantSession(session, async (tx: any) => {
    const existing = await tx
      .select({ id: goodsReceipts.id, status: goodsReceipts.status })
      .from(goodsReceipts)
      .where(
        and(
          eq(goodsReceipts.id, id),
          eq(goodsReceipts.tenantId, session.user.tenantId),
        )
      )
      .limit(1);

    if (!existing[0]) {
      throw new Error("Goods receipt not found");
    }

    if (existing[0].status === "completed") {
      throw new Error("Completed goods receipts cannot be deleted");
    }

    const now = new Date();
    await tx
      .update(goodsReceipts)
      .set({
        deletedAt: now,
        deletedBy: session.user.id,
        updatedAt: now,
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(goodsReceipts.id, id),
          eq(goodsReceipts.tenantId, session.user.tenantId),
        )
      );

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "goods_receipts",
      recordId: id,
      operation: "DELETE",
      afterValue: { deleted: true },
    });

    revalidatePath("/goods-receipt");
    return { success: true };
  });
}

// ─── Restore (soft-delete undo) ──────────────────────────────────────────────

export async function restoreGoodsReceiptAction(id: string) {
  const session = await requireSession();
  await ensurePermission("goods-receipt:write");

  return await withTenantSession(session, async (tx: any) => {
    await tx
      .update(goodsReceipts)
      .set({
        deletedAt: null,
        deletedBy: null,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(goodsReceipts.id, id),
          eq(goodsReceipts.tenantId, session.user.tenantId),
        )
      );

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "goods_receipts",
      recordId: id,
      operation: "RESTORE",
      afterValue: { restored: true },
    });

    revalidatePath("/goods-receipt");
    return { success: true };
  });
}

// ─── Complete (draft → completed) ────────────────────────────────────────────
// Completes the goods receipt AND creates inventory items/lots.
// This is the critical bridge between purchasing and stock management.

export async function completeGoodsReceiptAction(id: string) {
  const session = await requireSession();
  await ensurePermission("goods-receipt:write");

  return await withTenantSession(session, async (tx: any) => {
    // 1. Fetch goods receipt header
    const rows = await tx
      .select({
        id: goodsReceipts.id,
        status: goodsReceipts.status,
        warehouseId: goodsReceipts.warehouseId,
        factoryId: goodsReceipts.factoryId,
        receiptDate: goodsReceipts.receiptDate,
      })
      .from(goodsReceipts)
      .where(
        and(
          eq(goodsReceipts.id, id),
          eq(goodsReceipts.tenantId, session.user.tenantId),
          sql`${goodsReceipts.deletedAt} IS NULL`,
        )
      )
      .limit(1);

    if (!rows[0]) {
      throw new Error("Goods receipt not found");
    }

    if (rows[0].status !== "draft") {
      throw new Error("Only draft goods receipts can be completed");
    }

    const receipt = rows[0];

    // 2. Fetch all items for this goods receipt
    const receiptItems = await tx
      .select()
      .from(goodsReceiptItems)
      .where(eq(goodsReceiptItems.goodsReceiptId, id));

    // 3. For each item, create/update inventory
    const now = new Date();
    let lotsCreated = 0;

    for (const item of receiptItems) {
      // Skip rejected items — they don't enter inventory
      if (item.qualityStatus === "rejected") continue;

      // Calculate effective quantity (received - damaged - missing)
      const effectiveQty =
        Number(item.quantity ?? 0) -
        Number(item.damagedCount ?? 0) -
        Number(item.missingCount ?? 0);

      if (effectiveQty <= 0) continue;

      // 3a. Find existing inventory item by materialId
      let invItem = await tx
        .select({ id: inventoryItems.id })
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.materialId, item.materialId),
            eq(inventoryItems.tenantId, session.user.tenantId),
            sql`${inventoryItems.deletedAt} IS NULL`,
          )
        )
        .limit(1);

      // 3b. Create inventory item if not exists
      if (!invItem[0]) {
        const mat = await tx
          .select({
            materialCode: materialsMaster.materialCode,
            name: materialsMaster.name,
            materialType: materialsMaster.materialType,
            baseUnit: materialsMaster.baseUnit,
          })
          .from(materialsMaster)
          .where(eq(materialsMaster.id, item.materialId))
          .limit(1);

        const invId = generateULID();
        const invCode = `STK-${mat[0]?.materialCode ?? generateULID().slice(0, 8)}`;

        await tx.insert(inventoryItems).values({
          id: invId,
          tenantId: session.user.tenantId,
          factoryId: receipt.factoryId,
          inventoryCode: invCode,
          name: mat[0]?.name ?? "Bilinmeyen Malzeme",
          inventoryType: mat[0]?.materialType ?? "raw_material",
          unit: mat[0]?.baseUnit ?? item.unit ?? "piece",
          materialId: item.materialId,
          isActive: true,
          notes: `Mal girişi #${receipt.id.slice(0, 8)} ile oluşturuldu`,
          createdAt: now,
          updatedAt: now,
          createdBy: session.user.id,
        });

        invItem = [{ id: invId }];
      }

      // 3c. Create inventory lot
      const lotStatus =
        item.qualityStatus === "conditional" ? "quarantine" : "active";

      await tx.insert(inventoryLots).values({
        id: generateULID(),
        inventoryItemId: invItem[0].id,
        lotNumber: item.internalLotNumber,
        supplierLot: item.lotNumber ?? null,
        quantity: String(effectiveQty),
        remainingQuantity: String(effectiveQty),
        unitCost: item.unitCost ?? "0",
        currency: item.currency ?? "TRY",
        receivedAt: receipt.receiptDate
          ? new Date(receipt.receiptDate)
          : now,
        status: lotStatus,
        createdAt: now,
        updatedAt: now,
      });

      lotsCreated++;
    }

    // 4. Transition status to completed
    const updated = await tx
      .update(goodsReceipts)
      .set({
        status: "completed",
        updatedAt: now,
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(goodsReceipts.id, id),
          eq(goodsReceipts.tenantId, session.user.tenantId),
        )
      )
      .returning();

    // 5. Audit log
    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "goods_receipts",
      recordId: id,
      operation: "COMPLETE",
      afterValue: {
        status: "completed",
        inventoryLotsCreated: lotsCreated,
      },
    });

    revalidatePath("/goods-receipt");
    revalidatePath("/inventory");
    return updated[0];
  });
}

// ─── Cancel (draft/completed → cancelled) ────────────────────────────────────

export async function cancelGoodsReceiptAction(id: string) {
  const session = await requireSession();
  await ensurePermission("goods-receipt:write");

  return await withTenantSession(session, async (tx: any) => {
    const existing = await tx
      .select({ id: goodsReceipts.id, status: goodsReceipts.status })
      .from(goodsReceipts)
      .where(
        and(
          eq(goodsReceipts.id, id),
          eq(goodsReceipts.tenantId, session.user.tenantId),
          sql`${goodsReceipts.deletedAt} IS NULL`,
        )
      )
      .limit(1);

    if (!existing[0]) {
      throw new Error("Goods receipt not found");
    }

    if (existing[0].status === "cancelled") {
      throw new Error("Goods receipt is already cancelled");
    }

    const now = new Date();
    const updated = await tx
      .update(goodsReceipts)
      .set({
        status: "cancelled",
        updatedAt: now,
        updatedBy: session.user.id,
      })
      .where(
        and(
          eq(goodsReceipts.id, id),
          eq(goodsReceipts.tenantId, session.user.tenantId),
        )
      )
      .returning();

    await tx.insert(auditLogs).values({
      id: generateULID(),
      tenantId: session.user.tenantId,
      changedBy: session.user.id,
      tableName: "goods_receipts",
      recordId: id,
      operation: "CANCEL",
      afterValue: { status: "cancelled" },
    });

    revalidatePath("/goods-receipt");
    return updated[0];
  });
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function getGoodsReceiptStatsAction() {
  const session = await requireSession();
  await ensurePermission("goods-receipt:read");

  return await withTenantSession(session, async (tx: any) => {
    const baseConditions = and(
      eq(goodsReceipts.tenantId, session.user.tenantId),
      sql`${goodsReceipts.deletedAt} IS NULL`,
    );

    const totalResult = await tx
      .select({ count: sql<number>`count(*)` })
      .from(goodsReceipts)
      .where(baseConditions);

    const draftResult = await tx
      .select({ count: sql<number>`count(*)` })
      .from(goodsReceipts)
      .where(and(baseConditions, eq(goodsReceipts.status, "draft")));

    const completedResult = await tx
      .select({ count: sql<number>`count(*)` })
      .from(goodsReceipts)
      .where(and(baseConditions, eq(goodsReceipts.status, "completed")));

    const todayDate = new Date().toISOString().slice(0, 10);
    const todayResult = await tx
      .select({ count: sql<number>`count(*)` })
      .from(goodsReceipts)
      .where(and(baseConditions, eq(goodsReceipts.receiptDate, todayDate)));

    return {
      total: Number(totalResult[0]?.count ?? 0),
      draft: Number(draftResult[0]?.count ?? 0),
      completed: Number(completedResult[0]?.count ?? 0),
      today: Number(todayResult[0]?.count ?? 0),
    };
  });
}
