"use server";

import { eq, asc, and } from "drizzle-orm";
import { materialColors } from "@repo/db";
import { requireSession } from "@/lib/session";
import { withTenantSession } from "@/lib/dbSession";
import { ensurePermission } from "@/lib/authorization";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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

/* ─── Zod Schemas ─────────────────────────────────────────────── */

const createColorSchema = z.object({
  name: z.string().min(1, "Color name is required").max(100),
});

/* ─── Actions ─────────────────────────────────────────────────── */

export async function getMaterialColorsAction() {
  const session = await requireSession();
  await ensurePermission("materials:read");

  return await withTenantSession(session, async (tx: any) => {
    const items = await tx
      .select()
      .from(materialColors)
      .where(
        and(
          eq(materialColors.tenantId, session.user.tenantId),
          eq(materialColors.isActive, true),
        )
      )
      .orderBy(asc(materialColors.sortOrder), asc(materialColors.name));

    return items;
  });
}

export async function createMaterialColorAction(input: unknown) {
  const session = await requireSession();
  await ensurePermission("materials:write");

  const parsed = createColorSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors.map((e) => e.message).join(", "));
  }

  return await withTenantSession(session, async (tx: any) => {
    const id = generateULID();
    const now = new Date();

    // Check for duplicate
    const existing = await tx
      .select({ id: materialColors.id })
      .from(materialColors)
      .where(
        and(
          eq(materialColors.tenantId, session.user.tenantId),
          eq(materialColors.name, parsed.data.name),
        )
      )
      .limit(1);

    if (existing[0]) {
      throw new Error(`"${parsed.data.name}" rengi zaten tanımlı`);
    }

    const inserted = await tx
      .insert(materialColors)
      .values({
        id,
        tenantId: session.user.tenantId,
        name: parsed.data.name,
        sortOrder: 0,
        isActive: true,
        updatedAt: now,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning();

    revalidatePath("/materials");
    return inserted[0];
  });
}
