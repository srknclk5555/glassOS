import { db } from "@repo/db";
import { sql } from "drizzle-orm";
import { DEBUG_PERF, perfLog, perfStart, perfEnd } from "@/lib/perf";

export async function withTenantSession(session: any, cb: (tx: any) => Promise<any>) {
  const tStart = perfStart("[withTenantSession]");
  perfLog("[withTenantSession]", "BEGIN transaction", Date.now());
  let dbOverhead = 0;
  return await (db as any).transaction(async (tx: any) => {
    const tConfigStart = Date.now();
    perfLog("[6. set_config()]", "Setting tenant/role", Date.now());
    await (tx as any).execute(sql`SELECT set_config('app.current_tenant_id', ${session.user.tenantId}, true);`);
    await (tx as any).execute(sql`SELECT set_config('app.current_user_role', ${session.user.role}, true);`);
    perfEnd("[6. set_config()]", tConfigStart);
    dbOverhead += Date.now() - tConfigStart;

    const tCb = perfStart("[withTenantSession] callback");
    const result = await cb(tx);
    perfEnd("[withTenantSession] callback", tCb);

    return result;
  }).then((result: any) => {
    perfLog("[withTenantSession]", "COMMIT transaction", Date.now());
    perfEnd("[withTenantSession]", tStart);
    return result;
  });
}
