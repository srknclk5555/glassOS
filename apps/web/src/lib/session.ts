import { cache } from "react";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "./auth";
import { withTenantSession } from "./dbSession";

export const getSession = cache(async () => {
  const session = await getServerSession(authOptions);
  return session as Session | null;
});

export type AuthenticatedSession = Session & {
  user: {
    id: string;
    role: string;
    tenantId: string;
    factoryId?: string;
    selectedFactoryId?: string;
    tenantName?: string;
    factoryName?: string;
    selectedFactoryName?: string;
  };
};

export const requireSession = cache(async () => {
  const tStart = Date.now();
  console.log(`[PERF_LOG] [${tStart}] [3. NextAuth Session] - Starting`);
  const session = (await getServerSession(authOptions)) as Session | null;
  console.log(`[PERF_LOG] [${Date.now()}] [3. NextAuth Session] - Completed (Duration: ${Date.now() - tStart}ms)`);

  if (!session || !session.user || typeof (session.user as any).id !== "string") {
    throw new Error("Unauthorized");
  }

  // Note: We do NOT set DB session vars here because we need the DB transaction-bound client.
  // Server actions should use withTenantSession(session, cb) to ensure RLS session vars are set.

  return session as AuthenticatedSession;
});
