import { db } from "@repo/db";
import { sql } from "drizzle-orm";

export async function withTenantSession(session: any, cb: (tx: any) => Promise<any>) {
  // Run a transaction and set session vars with set_config for the duration of the transaction
  return await (db as any).transaction(async (tx: any) => {
    // Use parameterized sql via drizzle sql tag to avoid string interpolation
    await (tx as any).execute(sql`SELECT set_config('app.current_tenant_id', ${session.user.tenantId}, true);`);
    await (tx as any).execute(sql`SELECT set_config('app.current_user_role', ${session.user.role}, true);`);
    return await cb(tx);
  });
}
