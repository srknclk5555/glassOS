import { requireSession } from "@/lib/session";
import { withTenantSession } from "@/lib/dbSession";
import {
  customers,
  customerContacts,
  deliveryPoints,
  customerGlassCatalog,
  customerInstructions,
  customerInstructionConditions,
} from "@repo/db";
import { eq, and, asc, desc, sql, isNull } from "drizzle-orm";

/**
 * Full customer data returned by getFullCustomerById.
 */
export type FullCustomer = {
  // Customer identity fields
  id: string;
  tenantId: string;
  factoryId: string | null;
  customerCode: string;
  name: string;
  shortName: string | null;
  taxNumber: string | null;
  taxOffice: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
  erpStatus: string | null;
  isActive: boolean;
  notes: string | null;
  qualityProfile: unknown;
  productionPreferences: unknown;
  labelSpec: unknown;
  packagingProfile: unknown;
  communicationProfile: unknown;
  operationalBlock: unknown;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  // Related entities
  contacts: Array<Record<string, unknown>>;
  deliveryPoints: Array<Record<string, unknown>>;
  glassCatalog: Array<Record<string, unknown>>;
  instructions: Array<Record<string, unknown> & { conditions: Array<Record<string, unknown>> }>;
};

/**
 * Check if a database table exists in the public schema.
 * Uses a lightweight EXISTS query to avoid aborting the transaction.
 */
async function tableExists(tx: any, tableName: string): Promise<boolean> {
  try {
    const result = await tx.execute(
      sql`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ${tableName}) AS "exists"`,
    );
    return result[0]?.exists === true;
  } catch {
    return false;
  }
}

/**
 * Fetch a customer by ID with all related entities.
 * Uses explicit queries — gracefully handles missing tables/columns
 * by checking table existence before querying.
 */
export async function getFullCustomerById(id: string): Promise<FullCustomer | null> {
  const session = await requireSession();
  if (typeof id !== "string" || id.length !== 26) return null;

  return withTenantSession(session, async (tx: any) => {
    const condition =
      session.user.role === "super_admin"
        ? eq(customers.id, id)
        : and(eq(customers.id, id), eq(customers.tenantId, session.user.tenantId));

    // 1. Fetch the customer
    const rows = await tx.select().from(customers).where(condition).limit(1);
    if (rows.length === 0) return null;
    const customer = rows[0];

    // 2. Fetch contacts
    const contacts = await tx
      .select()
      .from(customerContacts)
      .where(and(eq(customerContacts.customerId, id), isNull(customerContacts.deletedAt)))
      .orderBy(desc(customerContacts.isPrimary), asc(customerContacts.name));

    // 3. Fetch delivery points (table may not exist yet)
    const dpExists = await tableExists(tx, "delivery_points");
    const points = dpExists
      ? await tx
          .select()
          .from(deliveryPoints)
          .where(eq(deliveryPoints.customerId, id))
          .orderBy(desc(deliveryPoints.isDefault), asc(deliveryPoints.name))
      : [];

    // 4. Fetch glass catalog (table may not exist yet)
    const gcExists = await tableExists(tx, "customer_glass_catalog");
    const catalog = gcExists
      ? await tx
          .select()
          .from(customerGlassCatalog)
          .where(eq(customerGlassCatalog.customerId, id))
          .orderBy(asc(customerGlassCatalog.productCode))
      : [];

    // 5. Fetch instructions with conditions (tables may not exist yet)
    const instExists = await tableExists(tx, "customer_instructions");
    const instructions = instExists
      ? await tx
          .select()
          .from(customerInstructions)
          .where(eq(customerInstructions.customerId, id))
          .orderBy(asc(customerInstructions.sortOrder))
      : [];

    // 6. Fetch conditions for the instructions
    const condExists = await tableExists(tx, "customer_instruction_conditions");
    const instructionIds = instructions.map((i: any) => i.id);
    let allConditions: Array<Record<string, unknown>> = [];
    if (instructionIds.length > 0 && condExists) {
      const condPromises = instructionIds.map((iid: string) =>
        tx
          .select()
          .from(customerInstructionConditions)
          .where(eq(customerInstructionConditions.instructionId, iid))
          .orderBy(asc(customerInstructionConditions.logicalGroup), asc(customerInstructionConditions.sortOrder)),
      );
      const condResults = await Promise.all(condPromises);
      allConditions = condResults.flat();
    }

    // Group conditions by instructionId
    const condByInstruction: Record<string, Array<Record<string, unknown>>> = {};
    for (const cond of allConditions) {
      const iid = (cond as any).instructionId as string;
      if (!condByInstruction[iid]) condByInstruction[iid] = [];
      condByInstruction[iid].push(cond);
    }

    const instructionsWithConditions = instructions.map((i: any) => ({
      ...i,
      conditions: condByInstruction[i.id] ?? [],
    }));

    return {
      ...customer,
      contacts,
      deliveryPoints: points,
      glassCatalog: catalog,
      instructions: instructionsWithConditions,
    } as FullCustomer;
  });
}
