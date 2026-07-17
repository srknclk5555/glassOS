import { db } from "@repo/db";
import { sql } from "drizzle-orm";

export async function withTenantSession(session: any, cb: (tx: any) => Promise<any>) {
  const tStart = Date.now();
  console.log(`[PERF_LOG] [${tStart}] [6. set_config()] - Starting tx and setting tenant/role`);
  return await (db as any).transaction(async (tx: any) => {
    const tConfigStart = Date.now();
    await (tx as any).execute(sql`SELECT set_config('app.current_tenant_id', ${session.user.tenantId}, true);`);
    await (tx as any).execute(sql`SELECT set_config('app.current_user_role', ${session.user.role}, true);`);
    console.log(`[PERF_LOG] [${Date.now()}] [6. set_config()] - Completed (Duration: ${Date.now() - tConfigStart}ms)`);
    return await cb(tx);
  });
}
